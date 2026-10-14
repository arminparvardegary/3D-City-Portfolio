import * as THREE from 'three';

// Realistic surfaces drawn once into canvases: one tile is one window bay wide
// and one floor tall (2 world units), so windows keep a true size on every
// building. Each texture is white based and tinted by its material colour.
const cache=new Map();
let seed=11;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
function tex(key,size,draw,{repeat=1,srgb=true}={}){
  if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');draw(g,size);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.repeat.setScalar(repeat);if(srgb)t.colorSpace=THREE.SRGBColorSpace;
  cache.set(key,t);return t;
}
const noise=(g,s,n,alpha,lo=200,hi=255)=>{for(let i=0;i<n;i++){const v=lo+Math.floor(rand()*(hi-lo));g.fillStyle=`rgba(${v},${v},${v},${alpha})`;g.fillRect(rand()*s,rand()*s,1+rand()*2,1+rand()*2);}};
// A window: frame, glass with a sky reflection gradient, a sill.
function window_(g,x,y,w,h,{frame='#f1efe9',dark=.18}={}){
  g.fillStyle=frame;g.fillRect(x-3,y-3,w+6,h+6);
  const gr=g.createLinearGradient(x,y,x+w*.4,y+h);gr.addColorStop(0,`rgba(${150-dark*200},${175-dark*200},${200-dark*190},1)`);gr.addColorStop(.55,`rgba(${60},${72},${88},1)`);gr.addColorStop(1,`rgba(${38},${44},${54},1)`);
  g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x+w*.08,y+h*.06,w*.18,h*.8);
  g.fillStyle=frame;g.fillRect(x+w/2-1.5,y,3,h);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x-4,y+h+3,w+8,4);
}

// Animated film style facades: the wall's own colour with soft painted texture, a
// cream framed window (arched or square) with shutters a shade darker, dark
// teal glass with a highlight, and a sill. Brick walls show their courses.
// One tile is one window bay and one floor. Colours are baked in (the material
// stays white), so frames stay cream on any wall.
export function storyFacade(wall,kind='arch'){
  return tex('story'+wall+kind,256,(g,s)=>{
    const c=new THREE.Color(wall),hex=(k)=>'#'+c.clone().multiplyScalar(k).getHexString();
    g.fillStyle=wall;g.fillRect(0,0,s,s);
    if(kind==='brick'){const bh=s/22,bw=s/7;for(let r=0;r<22;r++)for(let k=-1;k<8;k++){const v=.9+rand()*.18;g.fillStyle=hex(v);g.fillRect(k*bw+(r%2)*bw/2+1.5,r*bh+1.5,bw-3,bh-3);}}
    else{for(let i=0;i<2200;i++){g.fillStyle=`rgba(255,255,255,${rand()*.06})`;g.fillRect(rand()*s,rand()*s,2,2);}g.fillStyle='rgba(0,0,0,.05)';g.fillRect(0,s*.94,s,s*.06);}
    const x=s*.3,w=s*.4,y=s*.2,h=s*.58,arch=kind==='arch';
    // Shutters.
    g.fillStyle=hex(.72);g.fillRect(x-s*.13,y+4,s*.11,h-4);g.fillRect(x+w+s*.02,y+4,s*.11,h-4);
    g.fillStyle=hex(.6);for(let k=0;k<7;k++){g.fillRect(x-s*.12,y+10+k*h/7.4,s*.09,3);g.fillRect(x+w+s*.03,y+10+k*h/7.4,s*.09,3);}
    // Frame, glass, highlight, cross bars, sill.
    const path=(px,py,pw,ph)=>{g.beginPath();if(arch){g.moveTo(px,py+ph);g.lineTo(px,py+pw/2);g.arc(px+pw/2,py+pw/2,pw/2,Math.PI,0);g.lineTo(px+pw,py+ph);g.closePath();}else g.rect(px,py,pw,ph);};
    g.fillStyle='#fbf3e4';path(x-7,y-7,w+14,h+14);g.fill();
    const gl=g.createLinearGradient(x,y,x+w,y+h);gl.addColorStop(0,'#5d9fb0');gl.addColorStop(.6,'#2d5f73');gl.addColorStop(1,'#234a5c');g.fillStyle=gl;path(x,y,w,h);g.fill();
    g.save();path(x,y,w,h);g.clip();g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.moveTo(x,y+h*.55);g.lineTo(x+w*.55,y);g.lineTo(x+w*.75,y);g.lineTo(x,y+h*.8);g.fill();g.restore();
    g.fillStyle='#fbf3e4';g.fillRect(x+w/2-2,y+(arch?w/2:0),4,h-(arch?w/2:0));g.fillRect(x,y+h*.55,w,4);
    g.fillStyle='#efe2cb';g.fillRect(x-12,y+h+6,w+24,9);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x-12,y+h+15,w+24,4);
  });
}
// Pastel towers for the skyline: soft wall colour with simple light window bands.
export function towerFacade(wall){
  return tex('tower'+wall,128,(g,s)=>{const c=new THREE.Color(wall);g.fillStyle=wall;g.fillRect(0,0,s,s);
    g.fillStyle='#'+c.clone().lerp(new THREE.Color('#3e6f8a'),.55).getHexString();g.fillRect(s*.18,s*.2,s*.64,s*.55);
    g.fillStyle='rgba(255,255,255,.25)';g.fillRect(s*.18,s*.2,s*.2,s*.55);g.fillStyle='#'+c.clone().multiplyScalar(1.06).getHexString();g.fillRect(0,s*.85,s,s*.15);});
}
export const FACADE={
  // Glass curtain wall: panes with mullions and a soft vertical sky reflection.
  glass:()=>tex('glass',256,(g,s)=>{
    const gr=g.createLinearGradient(0,0,0,s);gr.addColorStop(0,'#dce9f4');gr.addColorStop(.5,'#9fb6cc');gr.addColorStop(1,'#7f98b1');g.fillStyle=gr;g.fillRect(0,0,s,s);
    g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(0,s*.7);g.lineTo(s,s*.2);g.lineTo(s,s*.35);g.lineTo(0,s*.85);g.fill();
    g.fillStyle='#e9eef3';g.fillRect(0,0,s,5);g.fillRect(0,0,4,s);g.fillRect(s/2-2,0,3,s);
    g.fillStyle='rgba(20,30,45,.35)';g.fillRect(0,s*.86,s,s*.14);
  }),
  // Office: light concrete with a band of windows.
  office:()=>tex('office',256,(g,s)=>{
    g.fillStyle='#ffffff';g.fillRect(0,0,s,s);noise(g,s,900,.25,190,240);
    window_(g,s*.12,s*.22,s*.76,s*.56,{frame:'#d9dde2',dark:.1});
  }),
  // Brick walk-up: running bond brick with a white framed sash window.
  brick:()=>tex('brick',256,(g,s)=>{
    g.fillStyle='#ffffff';g.fillRect(0,0,s,s);const bh=s/24,bw=s/8;
    for(let r=0;r<24;r++)for(let k=-1;k<9;k++){const v=200+Math.floor(rand()*55);g.fillStyle=`rgb(${v},${v-12},${v-18})`;g.fillRect(k*bw+(r%2)*bw/2+1,r*bh+1,bw-2,bh-2);}
    window_(g,s*.3,s*.2,s*.4,s*.56,{frame:'#f6f3ec'});g.fillStyle='#e9e2d6';g.fillRect(s*.26,s*.14,s*.48,s*.05);
  }),
  // Limestone tower: tall windows between stone piers.
  limestone:()=>tex('limestone',256,(g,s)=>{
    g.fillStyle='#ffffff';g.fillRect(0,0,s,s);noise(g,s,1400,.18,215,250);
    window_(g,s*.28,s*.12,s*.44,s*.72,{frame:'#e7e1d4',dark:.2});g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,0,s*.06,s);g.fillRect(s*.94,0,s*.06,s);
  }),
  // Brownstone: stone with a tall window under a lintel.
  brownstone:()=>tex('brownstone',256,(g,s)=>{
    g.fillStyle='#ffffff';g.fillRect(0,0,s,s);noise(g,s,1600,.22,190,240);
    g.fillStyle='#efe6da';g.fillRect(s*.28,s*.1,s*.44,s*.06);window_(g,s*.32,s*.2,s*.36,s*.6,{frame:'#f3ede4'});
  }),
  // Cut stone (ashlar): courses of blocks, no windows; for bridges and walls.
  ashlar:()=>tex('ashlar',256,(g,s)=>{g.fillStyle='#ffffff';g.fillRect(0,0,s,s);const rows=8,h=s/rows;
    for(let r=0;r<rows;r++){const n=r%2?3:4;for(let k=-1;k<=n;k++){const w=s/n,x=k*w+(r%2)*w/2,v=210+Math.floor(rand()*40);g.fillStyle=`rgb(${v},${v-6},${v-14})`;g.fillRect(x+2,r*h+2,w-4,h-4);}}
    noise(g,s,2400,.2,170,240);}),
  // Street surfaces.
  asphalt:()=>tex('asphalt2',512,(g,s)=>{g.fillStyle='#ffffff';g.fillRect(0,0,s,s);noise(g,s,26000,.5,150,255);
    for(let i=0;i<14;i++){const x=rand()*s,y=rand()*s,r=20+rand()*60,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(120,120,125,.18)');gr.addColorStop(1,'rgba(120,120,125,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);}}),
  paving:()=>tex('paving2',256,(g,s)=>{g.fillStyle='#ffffff';g.fillRect(0,0,s,s);noise(g,s,4000,.2,200,250);
    g.strokeStyle='rgba(110,105,100,.45)';g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*s/4,0);g.lineTo(i*s/4,s);g.stroke();g.beginPath();g.moveTo(0,i*s/4);g.lineTo(s,i*s/4);g.stroke();}}),
  grass:()=>tex('grass2',256,(g,s)=>{g.fillStyle='#ffffff';g.fillRect(0,0,s,s);for(let i=0;i<5000;i++){const v=170+Math.floor(rand()*85);g.strokeStyle=`rgba(${v-40},${v},${v-60},.4)`;g.beginPath();const x=rand()*s,y=rand()*s;g.moveTo(x,y);g.lineTo(x+(rand()-.5)*3,y-3-rand()*3);g.stroke();}}),
};
