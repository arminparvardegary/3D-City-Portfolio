import * as THREE from 'three';
import { createKit } from '../diorama/kit.js';
import { BRAND, imgTex, contain, url } from '../stores/brand.ts';

// Brooklyn's luxury boutiques: one tall floor, big footprint, standing on the
// ground. Glass on every side with slim gold mullions and a glowing gold line at
// the roof, a warm marble interior with pedestals and pendant lights you see
// through the glass, a black entrance canopy with a gold band (no branding), uplights on
// the facade and a roof terrace. The front faces `facing` (+1 / -1 along x).
// No names, no logos: each is told apart only by its gold and its glass tint.
export const LUX=[
  {gold:'#d4af6a',tint:'#1d2433'},{gold:'#e2b98a',tint:'#2a2230'},{gold:'#e8cf8f',tint:'#1b2a2e'},
  {gold:'#c9a45c',tint:'#20202a'},{gold:'#f0c560',tint:'#2a2418'},{gold:'#d9a7a0',tint:'#2b1e28'},
];

const marble=(()=>{let tex=null;return()=>{if(tex)return tex;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  g.fillStyle='#efe9df';g.fillRect(0,0,256,256);let r=3;const rnd=()=>((r=(r*16807)%2147483647)/2147483647);
  for(let i=0;i<14;i++){g.strokeStyle=`rgba(150,140,128,${.15+rnd()*.2})`;g.lineWidth=1+rnd()*2;g.beginPath();let x=rnd()*256,y=0;g.moveTo(x,y);while(y<256){x+=(rnd()-.5)*30;y+=12+rnd()*16;g.lineTo(x,y);}g.stroke();}
  g.strokeStyle='rgba(120,110,100,.35)';for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}
  tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;};})();

export function buildLux({x,z,top,w=9,d=15,h=5,facing=-1,style=0,palette=null,band=true}){
  const S=palette||LUX[style%LUX.length],K=createKit({flat:false}),{box,cyl,add,mat}=K,root=new THREE.Group(),f=facing;
  const gold=mat(S.gold,{metalness:.95,roughness:.25,envMapIntensity:1.6});
  const goldGlow=mat(S.gold,{emissive:S.gold,emissiveIntensity:2.2,roughness:.4});
  const black=mat('#111114',{roughness:.35,metalness:.4});
  const glass=new THREE.MeshPhysicalMaterial({color:S.tint,metalness:.15,roughness:.04,transparent:true,opacity:.38,envMapIntensity:1.8,clearcoat:1,depthWrite:false,side:THREE.DoubleSide});
  const floorM=mat('#ffffff',{map:marble(),roughness:.3,emissive:'#ffdcae',emissiveIntensity:.18});floorM.userData.uvSize=3;
  const warm=mat('#fff1d6',{emissive:'#ffcf8a',emissiveIntensity:2.5});
  const plinth=mat('#d9d2c5',{roughness:.5});
  const hw=w/2,hd=d/2;
  // Floor, roof slab, the gold glow line and edge.
  box(w+.4,.25,d+.4,x,top,z,plinth);box(w-.2,.02,d-.2,x,top+.25,z,floorM);
  box(w+.5,.4,d+.5,x,top+h,z,black);box(w+.56,.08,d+.56,x,top+h+.14,z,goldGlow);
  // Glass on all four sides with gold mullions and gold sills.
  const wall=(cx,cz,len,alongX)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(len,h-.25),glass);m.position.set(cx,top+.25+(h-.25)/2,cz);if(!alongX)m.rotation.y=Math.PI/2;m.renderOrder=2;root.add(m);
    const n=Math.round(len/1.6);for(let i=0;i<=n;i++){const t=-len/2+i*len/n;alongX?box(.08,h-.25,.08,cx+t,top+.25,cz,gold):box(.08,h-.25,.08,cx,top+.25,cz+t,gold);}
    alongX?box(len,.08,.12,cx,top+.25,cz,gold):box(.12,.08,len,cx,top+.25,cz,gold);};
  wall(x,z-hd,w,true);wall(x,z+hd,w,true);wall(x-hw,z,d,false);wall(x+hw,z,d,false);
  // Inside: pedestals with glowing pieces, a long counter, pendant lights, plants.
  for(const [px,pz] of [[-1.8,-4.5],[1.8,-4.5],[-1.8,0],[1.8,0],[-1.8,4.5],[1.8,4.5]]){
    box(.9,1,.9,x+px,top+.25,z+pz,plinth);add(new THREE.SphereGeometry(.28,16,12),warm,[x+px,top+1.55,z+pz]);
    cyl(.02,.02,h-1.9,6,x+px,top+1.9,z+pz,gold);add(new THREE.SphereGeometry(.2,12,8),warm,[x+px,top+1.85,z+pz]);}
  box(1,.95,6,x-f*(hw-1.2),top+.25,z,black);box(1.04,.06,6.04,x-f*(hw-1.2),top+1.2,z,gold);
  for(const pz of [-hd+1,hd-1]){cyl(.35,.28,.6,12,x-f*(hw-.8),top+.25,z+pz,black);add(new THREE.SphereGeometry(.55,12,10),mat('#3f7a4f',{roughness:.9}),[x-f*(hw-.8),top+1.2,z+pz]);}
  // Entrance: a black canopy over the doors with gold light under it, a gold band
  // above, a runner and two gold-lit planters.
  const ex=x+f*(hw+.01);
  box(.9,.18,4.6,x+f*(hw+.45),top+h-1.1,z,black);box(.86,.04,4.4,x+f*(hw+.45),top+h-1.12,z,warm);
  if(band)box(.1,.5,4.4,ex+f*.05,top+h-.45,z,goldGlow);   // a plain gold band over the doors
  box(1.8,.02,2.2,x+f*(hw+.9),top+.25,z,mat('#5a1a22',{roughness:.9}));
  for(const s of [-1,1]){box(.8,.7,.8,x+f*(hw+.7),top+.25,z+s*1.8,black);add(new THREE.SphereGeometry(.45,12,10),mat('#3f7a4f',{roughness:.9}),[x+f*(hw+.7),top+1.35,z+s*1.8]);
    box(.82,.04,.82,x+f*(hw+.7),top+.95,z+s*1.8,goldGlow);}
  // Uplights along the facade.
  for(let t=-hd+1;t<=hd-1;t+=2.2){box(.25,.06,.25,x+f*(hw+.25),top+.25,z+t,warm);}
  // Roof terrace: a glass parapet, potted trees and loungers.
  for(const s of [-1,1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(d,.7),glass);m.position.set(x+s*(hw-.1),top+h+.6,z);m.rotation.y=Math.PI/2;m.renderOrder=2;root.add(m);
    const m2=new THREE.Mesh(new THREE.PlaneGeometry(w,.7),glass);m2.position.set(x,top+h+.6,z+s*(hd-.1));m2.renderOrder=2;root.add(m2);}
  for(const [px,pz] of [[-2.6,-5.5],[2.6,5.5]]){cyl(.4,.3,.6,12,x+px,top+h+.2,z+pz,black);cyl(.07,.08,1.2,6,x+px,top+h+.8,z+pz,mat('#6a4a33'));add(new THREE.SphereGeometry(.8,12,10),mat('#4c8a5a',{roughness:.9}),[x+px,top+h+2.3,z+pz]);}
  for(const pz of [-1.4,1.4])box(1.6,.3,.7,x,top+h+.2,z+pz,mat('#f2ece2',{roughness:.8}));
  K.finish(root);
  root.traverse(o=>{if(o.isMesh&&o.material!==glass){o.castShadow=o.receiveShadow=true;}});
  return {root,solid:[x,z,hw+.3,hd+.3],mat};
}

// Keel's flagship in Brooklyn: the same glass boutique in Keel's colours (white
// pearl frames, Keel blue glass and glow), a lit "Keel." sign on the roof, the
// Meet Keel. display wall and the character inside, iMessage style bubbles
// floating slowly above, a glowing reflecting pool at the door, blue uplights.
const SANS='-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif';
export function buildKeelBoutique({x,z,top,w=9,d=18,h=5.4,facing=-1}){
  const B=BRAND.keel,f=facing;
  const base=buildLux({x,z,top,w,d,h,facing,band:false,palette:{gold:'#eef2fa',tint:'#16305e'}});
  const root=base.root,hw=w/2,hd=d/2;
  const blue=new THREE.MeshStandardMaterial({color:B.color,emissive:B.color,emissiveIntensity:2.4,roughness:.4});
  const add=(geo,m,px,py,pz,ry=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.rotation.y=ry;root.add(o);return o;};
  const face=f>0?Math.PI/2:-Math.PI/2;
  // A Keel blue glow line round the roof and the base.
  add(new THREE.BoxGeometry(w+.62,.1,d+.62),blue,x,top+h+.16,z);add(new THREE.BoxGeometry(w+.5,.05,d+.5),blue,x,top+.27,z);
  // "Keel." on the roof, lit, facing the river.
  const sign=imgTex('keel-roof',2048,600,[],g=>{g.clearRect(0,0,2048,600);g.font=`700 460px ${SANS}`;g.textBaseline='alphabetic';const t='Keel',tw=g.measureText(t).width,dw=g.measureText('.').width,x0=(2048-tw-dw)/2;
    g.fillStyle='#ffffff';g.fillText(t,x0,500);g.fillStyle=B.color;g.fillText('.',x0+tw,500);});
  const sm=new THREE.MeshStandardMaterial({map:sign,emissiveMap:sign,emissive:'#ffffff',emissiveIntensity:1.1,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  add(new THREE.PlaneGeometry(9,2.64),sm,x+f*(hw-.6),top+h+1.9,z,face);
  // The Meet Keel. display wall inside, on the back wall, facing the doors.
  const banner=imgTex('keel-flagship-banner',1600,900,[B.banner],(g,[pose])=>{const grd=g.createLinearGradient(0,0,0,900);grd.addColorStop(0,'#ffffff');grd.addColorStop(1,'#e6eeff');g.fillStyle=grd;g.fillRect(0,0,1600,900);
    g.fillStyle='#1d1d1f';g.font=`700 190px ${SANS}`;g.textAlign='left';g.fillText('Meet',80,280);g.fillStyle=B.color;g.fillText('Keel.',80,470);
    g.fillStyle='#6e6e73';g.font=`500 56px ${SANS}`;g.fillText('The AI assistant you text like a friend.',84,590);
    g.fillStyle=B.color;g.beginPath();g.roundRect(80,660,600,110,55);g.fill();g.fillStyle='#fff';g.font=`600 50px ${SANS}`;g.fillText('Text Keel on iMessage ›',120,732);
    contain(g,pose,900,20,680,880);});
  add(new THREE.PlaneGeometry(7,3.94),new THREE.MeshStandardMaterial({map:banner,emissiveMap:banner,emissive:'#ffffff',emissiveIntensity:.75,roughness:.4}),x-f*(hw-.12),top+.4+2.2,z,face);
  // The character, life size, inside by the glass.
  const pose=new THREE.TextureLoader().load(url('keel/pose-win.webp'));pose.colorSpace=THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(1.75,3.55),new THREE.MeshStandardMaterial({map:pose,transparent:true,alphaTest:.4,side:THREE.DoubleSide,emissive:'#ffffff',emissiveMap:pose,emissiveIntensity:.25}),x+f*(hw-1.4),top+.25+1.78,z-hd*.45,face);
  // Two reflecting pools either side of the door, glowing blue, white stone rims.
  for(const sgn of [-1,1]){const pz=z+sgn*(2.9+(hd-3.6)/2),len=hd-3.6;
    add(new THREE.BoxGeometry(1.9,.16,len+.3),new THREE.MeshStandardMaterial({color:'#f2f0ec',roughness:.4}),x+f*(hw+1.35),top+.0,pz);
    const pool=new THREE.Mesh(new THREE.BoxGeometry(1.5,.06,len),new THREE.MeshStandardMaterial({color:'#0e2c66',emissive:B.color,emissiveIntensity:.9,roughness:.05,metalness:.3}));
    pool.position.set(x+f*(hw+1.35),top+.1,pz);root.add(pool);}
  // Blue uplights round the whole building.
  const up=new THREE.MeshStandardMaterial({color:'#dfe8ff',emissive:B.color,emissiveIntensity:3});
  for(let t=-hd+1;t<=hd-1;t+=1.8)for(const s of [-1,1])add(new THREE.BoxGeometry(.22,.06,.22),up,x+s*(hw+.3),top+.27,z+t);
  // Chat bubbles floating slowly above the roof, as on keeltwin.com.
  const bubble=(text,me,i)=>{const t=imgTex('keel-bubble-'+i,1024,256,[],g=>{g.clearRect(0,0,1024,256);g.font=`600 84px ${SANS}`;const tw=Math.min(940,g.measureText(text).width+90);
      const bx=me?1024-tw-10:10;g.fillStyle=me?B.color:'#ffffff';g.beginPath();g.roundRect(bx,40,tw,170,85);g.fill();g.fillStyle=me?'#ffffff':'#1d1d1f';g.textBaseline='middle';g.textAlign='left';g.fillText(text,bx+45,128);});
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false,color:'#c9c9d6'}));sp.scale.set(5.2,1.3,1);root.add(sp);return sp;};
  const bubbles=[['Remind me in 3 minutes',true],['Done. Set for 4:32 PM ✓',false],['Plan my day',true]].map(([t,me],i)=>({sp:bubble(t,me,i),y:top+h+4+i*1.6,ph:i*2.1}));
  let clock=0;
  return {root,solid:base.solid,update(dt){clock+=Math.min(dt,.1);
    bubbles.forEach((b,i)=>{b.sp.position.set(x+f*(hw-1.5)+Math.sin(clock*.5+b.ph)*.4,b.y+Math.sin(clock*1.1+b.ph)*.18,z+(i-1)*3.2);b.sp.material.opacity=.85+.15*Math.sin(clock*1.3+b.ph);});
    blue.emissiveIntensity=2.1+Math.sin(clock*1.2)*.4;}};
}

// Rankd's boutique: a cinema in Rankd's colours (near black glass, amber glow),
// the RANKD wordmark lit on the roof, the ticket logo glowing by the door, a wall
// of ranked poster tiles (#01 to #12, drawn, not real posters) and a "Which is
// better?" duel screen inside, rank badges floating slowly above.
export function buildRankdBoutique({x,z,top,w=9,d=17,h=5.2,facing=-1}){
  const AMBER='#f5a623',INKD='#0a0a10',f=facing;
  const base=buildLux({x,z,top,w,d,h,facing,band:false,palette:{gold:AMBER,tint:'#14121e'}});
  const root=base.root,hw=w/2,hd=d/2,face=f>0?Math.PI/2:-Math.PI/2;
  const amber=new THREE.MeshStandardMaterial({color:AMBER,emissive:AMBER,emissiveIntensity:2.2,roughness:.4});
  const add=(geo,m,px,py,pz,ry=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.rotation.y=ry;root.add(o);return o;};
  const lit=(tex,k=1)=>new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:'#ffffff',emissiveIntensity:k,roughness:.4,transparent:true});
  add(new THREE.BoxGeometry(w+.62,.1,d+.62),amber,x,top+h+.16,z);
  // RANKD on the roof: white letters, the A in amber.
  const word=imgTex('rankd-roof',2048,560,[],g=>{g.clearRect(0,0,2048,560);g.font=`700 400px ${SANS}`;g.textBaseline='alphabetic';g.textAlign='left';
    const parts=[['R','#ffffff'],['A',AMBER],['NKD','#ffffff']];let total=0;for(const [t] of parts)total+=g.measureText(t).width+28;let cx=(2048-total)/2;
    for(const [t,c] of parts){g.fillStyle=c;g.fillText(t,cx,440);cx+=g.measureText(t).width+28;}});
  add(new THREE.PlaneGeometry(8.6,2.35),Object.assign(lit(word,1.1),{depthWrite:false,side:THREE.DoubleSide}),x+f*(hw-.6),top+h+1.75,z,face);
  // The ticket logo, big and glowing, standing by the door.
  const ticket=new THREE.TextureLoader().load(url('logos/rankd.svg'));ticket.colorSpace=THREE.SRGBColorSpace;
  add(new THREE.BoxGeometry(.2,2.4,2.4),new THREE.MeshStandardMaterial({color:INKD,roughness:.4}),x+f*(hw+1.2),top+1.45,z-hd+2.4);
  add(new THREE.PlaneGeometry(2.3,2.3),lit(ticket,.8),x+f*(hw+1.31),top+1.45,z-hd+2.4,face);
  // Inside: a wall of ranked poster tiles on the back wall.
  const WW=d-3,WH=h-1.4,TH=Math.round(2048*WH/WW);
  const wall=imgTex('rankd-wall',2048,TH,[],g=>{g.fillStyle=INKD;g.fillRect(0,0,2048,TH);const cols=['#2b3a67','#6a2c3f','#2f5a4a','#7a4b1e','#3c2a63','#1f4f6e','#5c2a2a','#2a5d5d'];
    const n=8,gap=26,w2=(2048-gap*(n+1))/n,h2=Math.min(TH-60,w2*1.5),y0=(TH-h2)/2;
    for(let i=0;i<n;i++){const cx=gap+i*(w2+gap),grd=g.createLinearGradient(cx,y0,cx,y0+h2);grd.addColorStop(0,cols[i]);grd.addColorStop(1,'#0a0a10');
      g.fillStyle=grd;g.beginPath();g.roundRect(cx,y0,w2,h2,16);g.fill();g.fillStyle='rgba(255,255,255,.12)';g.fillRect(cx+24,y0+h2*.66,w2-48,12);g.fillRect(cx+24,y0+h2*.66+26,w2-90,9);
      g.fillStyle=i===0?AMBER:'#ffffff';g.beginPath();g.roundRect(cx+14,y0+14,100,62,31);g.fill();g.fillStyle=INKD;g.font=`900 42px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('#'+String(i+1).padStart(2,'0'),cx+64,y0+46);}});
  add(new THREE.PlaneGeometry(WW,WH),lit(wall,.7),x-f*(hw-.12),top+.3+WH/2+.3,z,face);
  // The duel screen: which is better?
  const duel=imgTex('rankd-duel',1600,900,[],g=>{g.fillStyle=INKD;g.fillRect(0,0,1600,900);g.fillStyle='#ffffff';g.font=`700 110px ${SANS}`;g.textAlign='center';g.fillText('Which is better?',800,150);
    for(const [cx,c] of [[420,'#2b3a67'],[1180,'#6a2c3f']]){const grd=g.createLinearGradient(0,240,0,820);grd.addColorStop(0,c);grd.addColorStop(1,'#0a0a10');g.fillStyle=grd;g.beginPath();g.roundRect(cx-230,240,460,580,24);g.fill();}
    g.fillStyle=AMBER;g.beginPath();g.arc(800,530,90,0,7);g.fill();g.fillStyle=INKD;g.font=`900 70px ${SANS}`;g.textBaseline='middle';g.fillText('VS',800,534);});
  add(new THREE.BoxGeometry(.25,2.1,3.6),new THREE.MeshStandardMaterial({color:INKD,roughness:.3}),x,top+.25+1.6,z+hd*.45);
  add(new THREE.PlaneGeometry(3.4,1.9),lit(duel,.8),x+f*.14,top+.25+1.6,z+hd*.45,face);
  // Rank badges floating above the roof.
  const badge=(n,i)=>{const t=imgTex('rankd-badge-'+n,512,256,[],g=>{g.clearRect(0,0,512,256);g.fillStyle=i===0?AMBER:'#ffffff';g.beginPath();g.roundRect(16,40,480,176,88);g.fill();
      g.fillStyle=INKD;g.font=`900 120px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('#'+n,256,132);});
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false,color:'#c9c9d6'}));sp.scale.set(2.4,1.2,1);root.add(sp);return sp;};
  const badges=['01','02','03'].map((n,i)=>({sp:badge(n,i),y:top+h+4.2+i*.9,ph:i*1.7}));
  let clock=0;
  return {root,solid:base.solid,update(dt){clock+=Math.min(dt,.1);
    badges.forEach((b,i)=>{b.sp.position.set(x+f*(hw-1.5)+Math.sin(clock*.45+b.ph)*.5,b.y+Math.sin(clock*1+b.ph)*.2,z+(i-1)*3.4);});
    amber.emissiveIntensity=1.9+Math.sin(clock*1.1)*.4;}};
}
