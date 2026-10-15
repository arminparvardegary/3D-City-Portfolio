import { css } from 'goober';
import { gsap } from 'gsap';
import { blocks, network, AV, ST, BAV, HALF, MAN, BKN, NS, WHARF, BRIDGE, DECK_HALF } from '../nyc/drive/layout.js';
import { BRAND, url } from '../stores/brand.ts';
import { track } from '../analytics.js';

// The portfolio map: a button at the top right opens a drawn map of the whole
// city (Manhattan, the river, Brooklyn, every street, the bridge, the park and
// the landmarks), with Armin's places as pins with their logos and the car as a
// live arrow. Click a place to go there (the car moves to its parking bay).
const HAND='"Amatic SC","Marker Felt",cursive',FONT='-apple-system,"SF Pro Text",Inter,system-ui,sans-serif',WARM='#ff9a4a',INK='#f4f0ff',DIM='#b9b0ef';
const btnCls=css`
  position:absolute;right:68px;top:16px;z-index:8;width:44px;height:44px;border-radius:22px;display:grid;place-items:center;cursor:pointer;
  background:rgba(22,16,56,.82);color:${INK};backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 12px 40px #0006,inset 0 0 0 1px #ffffff14;
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
  &:active{transform:scale(.92);}
  &:focus-visible{outline:3px solid #ff9a4a88;outline-offset:2px;}
  svg{width:20px;height:20px;}
`;
const panelCls=css`
  position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:rgba(8,6,24,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  &[hidden]{display:none;}
  .sheet{outline:none;position:relative;width:min(92vw,980px);max-height:92vh;padding:20px 20px 16px;border-radius:28px;background:rgba(22,16,56,.92);box-shadow:0 30px 80px #000a,inset 0 0 0 1px #ffffff14;color:${INK};font-family:${FONT};}
  .head{display:flex;justify-content:space-between;align-items:center;margin:0 6px 10px;}
  h2{margin:0;font:700 40px/1 ${HAND};}
  .close{font:700 26px ${HAND};color:${INK};padding:6px 10px;border-radius:12px;}
  .close:focus-visible{outline:3px solid #ff9a4a88;}
  canvas{display:block;margin:0 auto;max-width:100%;max-height:calc(92vh - 150px);width:auto;height:auto;cursor:default;}
  .hint{margin:10px 6px 0;font-size:14px;color:${DIM};}
  @media(max-width:520px){.sheet{padding:14px;}h2{font-size:32px;}}
`;

export function createMap({world,car,goTo}){
  const btn=document.createElement('button');btn.className=btnCls;btn.setAttribute('aria-label','Open the map');
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>';
  const panel=document.createElement('div');panel.className=panelCls;panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Portfolio map');
  panel.innerHTML='<div class="sheet" tabindex="-1"><div class="head"><h2>Armin\'s New York</h2><button class="close">Close ×</button></div><canvas></canvas><p class="hint">Click a place to drive there. Park in its bay and press Enter. Hold M to peek at the map.</p></div>';
  document.querySelector('.scene').append(btn,panel);
  const cv=panel.querySelector('canvas'),g=cv.getContext('2d');

  // World bounds and the transform from world (x, z) to the canvas.
  const X0=MAN.x0-WHARF-14,X1=BKN.x1+WHARF+14,Z0=NS.z0-WHARF-26,Z1=NS.z1+WHARF+40,DPR=Math.min(2,devicePixelRatio||1);
  const CW=1400,CH=Math.round(CW*(Z1-Z0)/(X1-X0));cv.width=CW*DPR;cv.height=CH*DPR;
  const k=CW/(X1-X0),px=x=>(x-X0)*k,pz=z=>(z-Z0)*k;
  const logos={};for(const [id,b] of Object.entries(BRAND))if(b.logo){const im=new Image();im.src=url(b.logo);im.onload=()=>open&&draw();logos[id]=im;}

  const places=world.parking.map(b=>({id:b.id,name:b.name||'Boutique',x:b.store.x,z:b.store.z,bay:b,lux:b.id.startsWith('lux')}));
  const LANDMARK={'1,3':'Empire State','2,2':'Chrysler','3,5':'World Trade','3,1':'The Dome'};
  let open=false,hover=null,raf=0;

  function draw(){
    g.setTransform(DPR,0,0,DPR,0,0);g.clearRect(0,0,CW,CH);
    // Sea: a soft gradient and a few gentle wave lines.
    const sea=g.createRadialGradient(CW*.5,CH*.45,CW*.1,CW*.5,CH*.5,CW*.8);sea.addColorStop(0,'#1d1650');sea.addColorStop(1,'#0f0b2c');
    g.fillStyle=sea;g.beginPath();g.roundRect(0,0,CW,CH,28);g.fill();
    g.strokeStyle='rgba(140,130,255,.10)';g.lineWidth=3;
    for(let i=0;i<14;i++){const y=40+i*CH/14;g.beginPath();for(let x=0;x<=CW;x+=20)g[x?'lineTo':'moveTo'](x,y+Math.sin(x/70+i)*6);g.stroke();}
    // Land: rounded islands, a thin warm boardwalk round each, a soft shadow.
    const R=(x0,z0,x1,z1,r)=>{g.beginPath();g.roundRect(px(x0),pz(z0),(x1-x0)*k,(z1-z0)*k,r*k);};
    for(const L of [MAN,BKN]){g.save();g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=30;g.shadowOffsetY=10;
      g.fillStyle='#b98b5e';R(L.x0-WHARF,NS.z0-WHARF,L.x1+WHARF,NS.z1+WHARF,16);g.fill();g.restore();
      g.fillStyle='#4e4796';R(L.x0-.6,NS.z0-.6,L.x1+.6,NS.z1+.6,13);g.fill();}
    // Street centre lines, dashed.
    const {edges}=network();g.setLineDash([10,12]);g.lineCap='round';g.strokeStyle='rgba(220,214,255,.28)';g.lineWidth=2;
    for(const e of edges){if(e.kind==='bridge'||e.a.x>e.b.x||(e.a.x===e.b.x&&e.a.z>e.b.z))continue;g.beginPath();g.moveTo(px(e.a.x),pz(e.a.z));g.lineTo(px(e.b.x),pz(e.b.z));g.stroke();}
    g.setLineDash([]);
    // Blocks: rounded, with a soft shadow. Central Park is one green park.
    const all=blocks(),isPark=b=>b.borough==='man'&&b.i<=1&&b.j<=1;
    for(const b of all){if(isPark(b))continue;g.save();g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=10;g.shadowOffsetY=4;
      g.fillStyle=b.wide||b.i===1&&b.j===4?'#3b2f86':'#2e2670';R(b.x0,b.z0,b.x1,b.z1,4);g.fill();g.restore();}
    const pk=all.filter(isPark),px0=Math.min(...pk.map(b=>b.x0)),px1=Math.max(...pk.map(b=>b.x1)),pz0=Math.min(...pk.map(b=>b.z0)),pz1=Math.max(...pk.map(b=>b.z1));
    g.save();g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=12;g.shadowOffsetY=4;g.fillStyle='#2f6b4f';R(px0,pz0,px1,pz1,8);g.fill();g.restore();
    let rs=7;const rnd=()=>((rs=(rs*16807)%2147483647)/2147483647);
    for(let i=0;i<70;i++){const x=px0+3+rnd()*(px1-px0-6),z=pz0+3+rnd()*(pz1-pz0-6);g.fillStyle=i%3?'#3f8a62':'#4e9e72';g.beginPath();g.arc(px(x),pz(z),(1.6+rnd()*1.4)*k,0,7);g.fill();}
    g.fillStyle='#3b6fa8';g.beginPath();g.ellipse(px((px0+px1)/2-14),pz((pz0+pz1)/2+14),9*k,6*k,0,0,7);g.fill();
    g.fillStyle='#d8f5e3';g.font=`700 52px ${HAND}`;g.textAlign='center';g.textBaseline='middle';g.fillText('Central Park',px((px0+px1)/2),pz(pz0)+50);
    // Landmarks: a small glowing marker and the name.
    for(const b of all){const lm=LANDMARK[b.i+','+b.j];if(!lm)continue;const x=px((b.x0+b.x1)/2),y=pz((b.z0+b.z1)/2);
      g.fillStyle='#cfc6ff';g.shadowColor='#8a7cff';g.shadowBlur=14;g.beginPath();g.moveTo(x,y-22);g.lineTo(x+9,y+4);g.lineTo(x-9,y+4);g.closePath();g.fill();g.shadowBlur=0;
      g.fillStyle='#d8d2ff';g.font=`700 34px ${HAND}`;g.fillText(lm,x,y+28);}
    // The bridge: the deck over the river and its two towers in the water.
    const bz=pz(BRIDGE.z),bx0=px(BRIDGE.landM),bx1=px(BRIDGE.landB);
    g.strokeStyle='#d9c39b';g.lineWidth=DECK_HALF*2*k+6;g.lineCap='round';g.beginPath();g.moveTo(bx0,bz);g.lineTo(bx1,bz);g.stroke();
    g.strokeStyle='#3a3c45';g.lineWidth=DECK_HALF*2*k-4;g.stroke();
    for(const tx of [(BRIDGE.landM+BRIDGE.landB)/2-7,(BRIDGE.landM+BRIDGE.landB)/2+7]){g.fillStyle='#d9c39b';g.beginPath();g.roundRect(px(tx)-8,bz-DECK_HALF*k-10,16,DECK_HALF*2*k+20,4);g.fill();}
    g.fillStyle='#e8d6b4';g.font=`700 36px ${HAND}`;g.fillText('Bridge',(bx0+bx1)/2,bz-DECK_HALF*k-34);
    // Names of the big areas, Liberty Island.
    g.fillStyle='rgba(216,210,255,.85)';g.font=`700 56px ${HAND}`;g.fillText('MANHATTAN',px(-33),pz(NS.z0)-34);
    g.save();g.translate(px((BKN.x0+BKN.x1)/2),pz(-30));g.rotate(-Math.PI/2);g.fillText('BROOKLYN',0,0);g.restore();
    g.fillStyle='#8a7cff';g.font=`700 40px ${HAND}`;g.save();g.translate(px(68),pz(-40));g.rotate(-Math.PI/2);g.fillText('East River',0,0);g.restore();
    g.fillStyle='#3f8a62';g.beginPath();g.arc(px(68),pz(150),11*k,0,7);g.fill();g.fillStyle='#7fe0c0';g.beginPath();g.arc(px(68),pz(150),2.2*k,0,7);g.fill();
    g.fillStyle='#b3a8f0';g.font=`700 36px ${HAND}`;g.fillText('Liberty Island',px(68),pz(150)-11*k-24);
    // Armin's places: a glowing pin with the logo, the name, and the P bay.
    for(const P of places){const x=px(P.x),y=pz(P.z),r=P.id==='keel'?40:30,hot=hover===P;
      if(P.lux){   // Brooklyn boutiques: a gold diamond, no branding
        g.fillStyle=WARM;g.beginPath();g.roundRect(px(P.bay.x)-15,pz(P.bay.z)-15,30,30,8);g.fill();g.fillStyle='#1a1035';g.font=`900 24px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('P',px(P.bay.x),pz(P.bay.z)+1);
        g.save();g.translate(x,y);g.rotate(Math.PI/4);g.shadowColor='#e8c98a';g.shadowBlur=hot?26:12;g.fillStyle='#e8c98a';g.fillRect(-14,-14,28,28);g.restore();
        if(hot){g.fillStyle=INK;g.font=`700 40px ${HAND}`;g.fillText('Boutique',x,y-40);}continue;}
      g.fillStyle='#ffd08a';g.font=`900 24px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
      g.fillStyle=WARM;g.beginPath();g.roundRect(px(P.bay.x)-15,pz(P.bay.z)-15,30,30,8);g.fill();g.fillStyle='#1a1035';g.fillText('P',px(P.bay.x),pz(P.bay.z)+1);
      g.shadowColor=WARM;g.shadowBlur=hot?30:16;g.fillStyle='#ffffff';g.beginPath();g.arc(x,y,r+(hot?4:0),0,7);g.fill();g.shadowBlur=0;
      g.strokeStyle=WARM;g.lineWidth=4;g.stroke();
      const im=logos[P.id];
      if(im?.complete&&im.naturalWidth){g.save();g.beginPath();g.arc(x,y,r-3,0,7);g.clip();const s=Math.min((2*r-6)/im.naturalWidth,(2*r-6)/im.naturalHeight)*(P.id==='keel'||P.id==='hindra'?1.15:1);
        g.drawImage(im,x-im.naturalWidth*s/2,y-im.naturalHeight*s/2,im.naturalWidth*s,im.naturalHeight*s);g.restore();}
      else if(P.id==='rush'){g.fillStyle='#141416';g.beginPath();g.arc(x,y,r-3,0,7);g.fill();g.fillStyle=BRAND.rush.color;g.font=`italic 900 15px ${FONT}`;g.fillText('RUSH',x,y+1);}
      if(P.id==='keel'||hot){g.fillStyle=INK;g.font=`700 ${P.id==='keel'?50:40}px ${HAND}`;g.fillText(P.name,x,y-r-28);}}
    // The row's label.
    const row=places.filter(p=>['rush','hindra','aaq','bigup'].includes(p.id));if(row.length){g.fillStyle=WARM;g.font=`700 46px ${HAND}`;g.fillText('MY WORK EXPERIENCE',px((row[0].x+row.at(-1).x)/2),pz(row[0].z)+70);}
    // The car: a live arrow.
    const c=car.shown;if(c){g.save();g.translate(px(c.x),pz(c.z));g.rotate(Math.PI-c.h);g.shadowColor='#ff5a4a';g.shadowBlur=18;
      g.fillStyle='#ff5a4a';g.beginPath();g.moveTo(0,-24);g.lineTo(16,18);g.lineTo(0,9);g.lineTo(-16,18);g.closePath();g.fill();g.restore();
      g.fillStyle=INK;g.font=`700 36px ${HAND}`;g.fillText('You',px(c.x),pz(c.z)+40);}
  }
  const loop=()=>{if(!open)return;draw();raf=requestAnimationFrame(loop);};

  const at=e=>{const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*CW,y=(e.clientY-r.top)/r.height*CH;
    return places.find(P=>Math.hypot(px(P.x)-x,pz(P.z)-y)<46)||null;};
  cv.addEventListener('pointermove',e=>{hover=at(e);cv.style.cursor=hover?'pointer':'default';});
  cv.addEventListener('click',e=>{const P=at(e);if(!P)return;track('map_go',{place:P.id});close();goTo(P.bay);});

  function show(){open=true;panel.hidden=false;draw();loop();track('map_open');panel.querySelector('.sheet').focus({preventScroll:true});
    gsap.fromTo(panel.querySelector('.sheet'),{y:20,opacity:0,scale:.98},{y:0,opacity:1,scale:1,duration:.45,ease:'power2.out'});}
  function close(){open=false;cancelAnimationFrame(raf);panel.hidden=true;btn.focus();}
  btn.onclick=()=>open?close():show();
  panel.querySelector('.close').onclick=close;
  panel.addEventListener('click',e=>{if(e.target===panel)close();});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&open)close();});
  // Hold M to look at the map; let go and it hides again.
  let held=false;
  addEventListener('keydown',e=>{if(e.code!=='KeyM'||e.repeat||e.metaKey||e.ctrlKey||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(!open){held=true;show();}});
  addEventListener('keyup',e=>{if(e.code==='KeyM'&&held){held=false;close();}});
  addEventListener('blur',()=>{if(held){held=false;close();}});
  return {show,close,get isOpen(){return open;}};
}
