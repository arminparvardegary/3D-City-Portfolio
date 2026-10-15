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
  .sheet{position:relative;width:min(92vw,980px);max-height:92vh;padding:20px 20px 16px;border-radius:28px;background:rgba(22,16,56,.92);box-shadow:0 30px 80px #000a,inset 0 0 0 1px #ffffff14;color:${INK};font-family:${FONT};}
  .head{display:flex;justify-content:space-between;align-items:center;margin:0 6px 10px;}
  h2{margin:0;font:700 40px/1 ${HAND};}
  .close{font:700 26px ${HAND};color:${INK};padding:6px 10px;border-radius:12px;}
  .close:focus-visible{outline:3px solid #ff9a4a88;}
  canvas{display:block;width:100%;height:auto;max-height:calc(92vh - 120px);object-fit:contain;border-radius:18px;cursor:default;}
  .hint{margin:10px 6px 0;font-size:14px;color:${DIM};}
  @media(max-width:520px){.sheet{padding:14px;}h2{font-size:32px;}}
`;

export function createMap({world,car,goTo}){
  const btn=document.createElement('button');btn.className=btnCls;btn.setAttribute('aria-label','Open the map');
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>';
  const panel=document.createElement('div');panel.className=panelCls;panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Portfolio map');
  panel.innerHTML='<div class="sheet"><div class="head"><h2>Armin\'s New York</h2><button class="close">Close ×</button></div><canvas></canvas><p class="hint">Click a place to drive there. Park in its bay and press Enter.</p></div>';
  document.querySelector('.scene').append(btn,panel);
  const cv=panel.querySelector('canvas'),g=cv.getContext('2d');

  // World bounds and the transform from world (x, z) to the canvas.
  const X0=MAN.x0-WHARF-8,X1=BKN.x1+WHARF+8,Z0=NS.z0-WHARF-8,Z1=NS.z1+WHARF+40,DPR=Math.min(2,devicePixelRatio||1);
  const CW=1400,CH=Math.round(CW*(Z1-Z0)/(X1-X0));cv.width=CW*DPR;cv.height=CH*DPR;
  const k=CW/(X1-X0),px=x=>(x-X0)*k,pz=z=>(z-Z0)*k;
  const logos={};for(const [id,b] of Object.entries(BRAND))if(b.logo){const im=new Image();im.src=url(b.logo);im.onload=()=>open&&draw();logos[id]=im;}

  const places=world.parking.map(b=>({id:b.id,name:b.name,x:b.store.x,z:b.store.z,bay:b}));
  const LANDMARK={'1,3':'Empire State','2,2':'Chrysler','3,5':'World Trade','3,1':'The Dome'};
  let open=false,hover=null,raf=0;

  function draw(){
    g.setTransform(DPR,0,0,DPR,0,0);
    g.fillStyle='#120d33';g.fillRect(0,0,CW,CH);
    // Land with its boardwalk.
    for(const L of [MAN,BKN]){g.fillStyle='#5a3f2e';g.fillRect(px(L.x0-WHARF),pz(NS.z0-WHARF),(L.x1-L.x0+2*WHARF)*k,(NS.z1-NS.z0+2*WHARF)*k);
      g.fillStyle='#5e56aa';g.fillRect(px(L.x0),pz(NS.z0),(L.x1-L.x0)*k,(NS.z1-NS.z0)*k);}
    // Blocks (park blocks green), landmarks as gold tiles.
    for(const b of blocks()){const park=b.borough==='man'&&b.i<=1&&b.j<=1;g.fillStyle=park?'#2f6b4f':'#352b78';
      g.beginPath();g.roundRect(px(b.x0),pz(b.z0),(b.x1-b.x0)*k,(b.z1-b.z0)*k,6);g.fill();
      const lm=LANDMARK[b.i+','+b.j];if(lm){g.fillStyle='#b3a8f0';g.font=`700 40px ${HAND}`;g.textAlign='center';g.textBaseline='middle';g.fillText(lm,px((b.x0+b.x1)/2),pz((b.z0+b.z1)/2));}}
    g.fillStyle='#a8e6bd';g.font=`700 52px ${HAND}`;g.textAlign='center';g.fillText('Central Park',px(-72),pz(-74));
    // Streets: the road network, lane lines faint.
    const {edges}=network();g.lineCap='round';
    for(const e of edges){if(e.kind==='bridge')continue;g.strokeStyle='#5e56aa';g.lineWidth=HALF*1.6*k;g.beginPath();g.moveTo(px(e.a.x),pz(e.a.z));g.lineTo(px(e.b.x),pz(e.b.z));g.stroke();}
    // The bridge over the river.
    g.strokeStyle='#c4ad87';g.lineWidth=DECK_HALF*2*k;g.beginPath();g.moveTo(px(BRIDGE.x0),pz(BRIDGE.z));g.lineTo(px(BRIDGE.x1),pz(BRIDGE.z));g.stroke();
    g.strokeStyle='#46484e';g.lineWidth=DECK_HALF*1.5*k;g.stroke();
    // Names of the big areas.
    g.fillStyle='#b3a8f0';g.font=`700 56px ${HAND}`;g.fillText('MANHATTAN',px(-33),pz(NS.z0+14));
    g.save();g.translate(px((BKN.x0+BKN.x1)/2),pz(-30));g.rotate(-Math.PI/2);g.fillText('BROOKLYN',0,0);g.restore();
    g.fillStyle='#8a7cff';g.font=`700 44px ${HAND}`;g.save();g.translate(px(68),pz(-40));g.rotate(-Math.PI/2);g.fillText('East River',0,0);g.restore();
    g.fillText('Liberty Island',px(68),pz(138));g.fillStyle='#2f6b4f';g.beginPath();g.arc(px(68),pz(150)-0,9*k,0,7);g.fill();
    g.fillStyle='#e0cba6';g.font=`700 40px ${HAND}`;g.fillText('Bridge',px((BRIDGE.landM+BRIDGE.landB)/2),pz(BRIDGE.z)-DECK_HALF*k-14);
    // Armin's places: a glowing pin with the logo, the name, and the P bay.
    for(const P of places){const x=px(P.x),y=pz(P.z),r=P.id==='keel'?40:30,hot=hover===P;
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
    const row=places.filter(p=>p.id!=='keel');if(row.length){g.fillStyle=WARM;g.font=`700 46px ${HAND}`;g.fillText('MY WORK EXPERIENCE',px((row[0].x+row.at(-1).x)/2),pz(row[0].z)+70);}
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

  function show(){open=true;panel.hidden=false;draw();loop();track('map_open');panel.querySelector('.close').focus();
    gsap.fromTo(panel.querySelector('.sheet'),{y:20,opacity:0,scale:.98},{y:0,opacity:1,scale:1,duration:.45,ease:'power2.out'});}
  function close(){open=false;cancelAnimationFrame(raf);panel.hidden=true;btn.focus();}
  btn.onclick=()=>open?close():show();
  panel.querySelector('.close').onclick=close;
  panel.addEventListener('click',e=>{if(e.target===panel)close();});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&open)close();});
  return {show,close,get isOpen(){return open;}};
}
