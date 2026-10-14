import * as THREE from 'three';
import { seededRandom } from '../config.js';

// Surface detail drawn once into small canvases (no downloads): grass with
// blades and patches, fine asphalt grain, timber planks, rock grain, and a
// ripple normal map for water. Each is tileable and multiplied with the
// material colour, so the design system's colours still set the overall tone.
const cache=new Map();
function canvasTexture(key,size,draw,{srgb=true,repeat=1}={}){
  if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');draw(x,size,seededRandom(key.length*97+size));
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.setScalar(repeat);t.anisotropy=8;
  if(srgb)t.colorSpace=THREE.SRGBColorSpace;cache.set(key,t);return t;
}
// Soft value noise for patches.
function blotches(x,s,rand,n,rMin,rMax,colors,alpha){
  for(let i=0;i<n;i++){const r=rMin+rand()*(rMax-rMin),px=rand()*s,py=rand()*s,col=colors[Math.floor(rand()*colors.length)];
    for(const [ox,oy] of [[0,0],[s,0],[-s,0],[0,s],[0,-s]]){const g=x.createRadialGradient(px+ox,py+oy,0,px+ox,py+oy,r);g.addColorStop(0,`rgba(${col},${alpha})`);g.addColorStop(1,`rgba(${col},0)`);x.fillStyle=g;x.fillRect(px+ox-r,py+oy-r,2*r,2*r);}}
}

export const grassMap=()=>canvasTexture('grass',512,(x,s,rand)=>{
  x.fillStyle='#ffffff';x.fillRect(0,0,s,s);
  blotches(x,s,rand,40,40,120,['200,215,170','245,245,225','170,195,145'],.35);
  for(let i=0;i<9000;i++){const v=200+Math.floor(rand()*55),px=rand()*s,py=rand()*s;x.strokeStyle=`rgba(${v-40},${v},${v-70},.35)`;x.lineWidth=1;x.beginPath();x.moveTo(px,py);x.lineTo(px+(rand()-.5)*3,py-2-rand()*4);x.stroke();}
},{repeat:1});
export const asphaltMap=()=>canvasTexture('asphalt',256,(x,s,rand)=>{
  x.fillStyle='#ffffff';x.fillRect(0,0,s,s);
  for(let i=0;i<14000;i++){const v=170+Math.floor(rand()*85);x.fillStyle=`rgba(${v},${v},${v},.5)`;x.fillRect(rand()*s,rand()*s,1+rand(),1+rand());}
  blotches(x,s,rand,10,20,60,['150,150,155','235,235,240'],.25);
});
export const woodMap=()=>canvasTexture('wood',256,(x,s,rand)=>{
  const planks=8,h=s/planks;
  for(let i=0;i<planks;i++){const v=205+Math.floor(rand()*45);x.fillStyle=`rgb(${v},${v-8},${v-18})`;x.fillRect(0,i*h,s,h);
    for(let k=0;k<26;k++){x.strokeStyle=`rgba(120,80,50,${.08+rand()*.1})`;x.beginPath();const y=i*h+rand()*h;x.moveTo(0,y);x.bezierCurveTo(s*.3,y+(rand()-.5)*4,s*.6,y+(rand()-.5)*4,s,y);x.stroke();}
    x.fillStyle='rgba(70,45,30,.45)';x.fillRect(0,i*h,s,1.5);x.fillRect(Math.floor(rand()*s),i*h,1.5,h);}
});
export const rockMap=()=>canvasTexture('rock',512,(x,s,rand)=>{
  x.fillStyle='#ffffff';x.fillRect(0,0,s,s);
  blotches(x,s,rand,70,10,70,['170,165,160','230,228,222','140,135,130'],.4);
  for(let i=0;i<5000;i++){const v=150+Math.floor(rand()*100);x.fillStyle=`rgba(${v},${v-4},${v-8},.4)`;x.fillRect(rand()*s,rand()*s,1.5,1.5);}
});
export const pavingMap=()=>canvasTexture('paving',256,(x,s,rand)=>{
  const n=8,c=s/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=225+Math.floor(rand()*25);x.fillStyle=`rgb(${v},${v-3},${v-8})`;x.fillRect(i*c,j*c,c,c);}
  x.strokeStyle='rgba(120,110,100,.35)';x.lineWidth=1.5;for(let i=0;i<=n;i++){x.beginPath();x.moveTo(i*c,0);x.lineTo(i*c,s);x.stroke();x.beginPath();x.moveTo(0,i*c);x.lineTo(s,i*c);x.stroke();}
});
// Ripples for water: a tileable normal map from overlapping sine waves.
export const waterNormal=()=>canvasTexture('waterNormal',256,(x,s)=>{
  const img=x.createImageData(s,s),h=(u,v)=>Math.sin(u*6.283*3+Math.sin(v*6.283*2)*1.2)*.5+Math.sin(v*6.283*5+u*6.283*2)*.3+Math.sin((u+v)*6.283*7)*.2;
  for(let j=0;j<s;j++)for(let i=0;i<s;i++){const u=i/s,v=j/s,e=1/s,dx=(h(u+e,v)-h(u-e,v))*6,dy=(h(u,v+e)-h(u,v-e))*6,len=Math.hypot(dx,dy,1),k=(j*s+i)*4;
    img.data[k]=(-dx/len*.5+.5)*255;img.data[k+1]=(-dy/len*.5+.5)*255;img.data[k+2]=(1/len*.5+.5)*255;img.data[k+3]=255;}
  x.putImageData(img,0,0);
},{srgb:false});

// World-space UVs: a texture that tiles every `size` units on whatever box it is
// applied to, so large and small surfaces share the same grain scale.
export function worldUV(geometry,size){
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));
    const [u,v]=ay>=ax&&ay>=Math.abs(n.getZ(i))?[p.getX(i),p.getZ(i)]:ax>=Math.abs(n.getZ(i))?[p.getZ(i),p.getY(i)]:[p.getX(i),p.getY(i)];
    uv[2*i]=u/size;uv[2*i+1]=v/size;}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}
