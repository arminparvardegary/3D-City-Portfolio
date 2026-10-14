import * as THREE from 'three';
import { NYC } from './city.js';

// The Brooklyn Bridge you can drive (world units). The deck runs along the
// river and slopes down at both ends into curved loop ramps that land on the
// riverside avenue, so the bridge is a circuit: up the loop at one end, across,
// down the loop at the other. surface(x, z, y) tells the car the road height
// there (or null where there is no road: the river, the air beside the deck).
const X=52.5,HALF=3.3,FLAT=30,END=44,TOP=5.2,LOW=2.6;
const LOOP={cx:48.45,r:4.05,half:3};   // as wide as the deck, so both lanes flow into it

// Road height along the deck by distance from the middle.
const deckY=az=>az<=FLAT?TOP:TOP-(az-FLAT)/(END-FLAT)*(TOP-LOW);

export function bridgeSurface(x,z){
  const az=Math.abs(z);
  if(az<=END&&Math.abs(x-X)<=HALF)return deckY(az);
  if(az>END){const dz=az-END,dx=x-LOOP.cx,d=Math.hypot(dx,dz);
    if(Math.abs(d-LOOP.r)<=LOOP.half){const t=Math.atan2(dz,dx)/Math.PI;return LOW*(1-t);}}   // t: 0 at the deck, 1 at the avenue
  return null;
}

export function buildBridge(K){
  const {box,cyl,add}=K,occluders=[];
  const deckMat=NYC.bridge,rail=NYC.cable,road=NYC.asphalt;
  // Deck: flat middle and two slopes, each a slab with a road surface and rails.
  const slab=(z0,z1,y0,y1)=>{const len=Math.abs(z1-z0),mz=(z0+z1)/2,my=(y0+y1)/2,ang=Math.atan2(y1-y0,z1-z0);
    for(const [w,h,m,dy] of [[HALF*2+.6,.5,deckMat,-.5],[HALF*2,.04,road,0]])add(new THREE.BoxGeometry(w,h,len+.05).rotateX(-ang),m,[X,my+dy+h/2,mz]);
    for(const s of [-1,1])add(new THREE.BoxGeometry(.18,.7,len).rotateX(-ang),rail,[X+s*(HALF+.15),my+.35,mz]);};
  slab(-FLAT,FLAT,TOP,TOP);slab(FLAT,END,TOP,LOW);slab(-FLAT,-END,TOP,LOW);
  for(let z=-FLAT+2;z<FLAT;z+=4)box(.2,.03,1.6,X,TOP+.03,z,NYC.line);
  // Loops: a ring of short sloping segments with rails on both edges.
  for(const sgn of [1,-1]){const n=32;for(let i=0;i<n;i++){
    const a0=i/n*Math.PI,a1=(i+1)/n*Math.PI,am=(a0+a1)/2,y0=LOW*(1-a0/Math.PI),y1=LOW*(1-a1/Math.PI),ym=(y0+y1)/2;
    const px=LOOP.cx+Math.cos(am)*LOOP.r,pz=sgn*(END+Math.sin(am)*LOOP.r),seg=LOOP.r*Math.PI/n+.2,tilt=Math.atan2(y1-y0,seg);
    const yaw=sgn>0?-am:Math.PI+am;   // local +z follows the loop away from the deck
    const g=(w,h,l)=>new THREE.BoxGeometry(w,h,l).rotateX(-tilt).rotateY(yaw);
    add(g(LOOP.half*2+.5,.45,seg),deckMat,[px,ym-.48,pz]);add(g(LOOP.half*2,.04,seg),road,[px,ym+.02,pz]);
    for(const r of [LOOP.r-LOOP.half-.12,LOOP.r+LOOP.half+.12])add(g(.16,.6,LOOP.r*Math.PI/n*r/LOOP.r+.1),rail,[LOOP.cx+Math.cos(am)*r,ym+.3,sgn*(END+Math.sin(am)*r)]);
    if(i%5===2&&ym>.6)cyl(.28,.28,ym+.4,8,px,-1.3,pz,deckMat);}}
  // Piers under the deck, down into the water.
  for(let z=-END+4;z<=END-4;z+=8){const y=deckY(Math.abs(z));for(const s of [-1,1])cyl(.4,.45,y+.9,8,X+s*2.4,-1.4,z,deckMat);}
  // Gothic towers with two pointed arches, the deck passing through.
  const TZ=24,TH=19;
  {const face=new THREE.Shape([new THREE.Vector2(-5,0),new THREE.Vector2(5,0),new THREE.Vector2(4.6,TH),new THREE.Vector2(-4.6,TH)]);
    for(const cx of [-2.4,2.4]){const h=new THREE.Path();h.moveTo(cx-1.4,TOP+.6);h.lineTo(cx+1.4,TOP+.6);h.lineTo(cx+1.4,TOP+7);h.lineTo(cx,TOP+9.2);h.lineTo(cx-1.4,TOP+7);h.closePath();face.holes.push(h);}
    for(const tz of [-TZ,TZ]){add(new THREE.ExtrudeGeometry(face,{depth:2.6,bevelEnabled:false}).translate(0,0,-1.3),deckMat,[X,-1.4,tz]);box(10.4,.6,3,X,TH-.6,tz,deckMat);
      occluders.push(new THREE.Box3(new THREE.Vector3(X-5,0,tz-1.3),new THREE.Vector3(X+5,TH,tz+1.3)));}}
  // Main cables: from the tower tops sagging to the middle, and down to the deck ends; suspenders.
  const cableY=z=>{const az=Math.abs(z),top=TH-.4;if(az<=TZ){const k=az/TZ;return TOP+3+(top-TOP-3)*k*k;}const k=(END-az)/(END-TZ);return deckY(az)+.8+(top-deckY(az)-.8)*k*k;};
  for(const s of [-1,1]){const cx=X+s*(HALF+.15),pts=[];for(let z=-END;z<=END;z+=1)pts.push(new THREE.Vector3(cx,cableY(z),z));
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),160,.16,5),rail);
    for(let z=-END+1.5;z<END;z+=1.5){const y0=deckY(Math.abs(z)),h=cableY(z)-y0;if(h>.5)box(.06,h,.06,cx,y0,z,rail);}
    for(const tz of [-TZ,TZ])for(const d of [-1,1])for(let k=1;k<=5;k++){const z1=tz+d*k*3.2;if(Math.abs(z1)>END)continue;
      add(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(cx,TH-1,tz),new THREE.Vector3(cx,deckY(Math.abs(z1))+.3,z1)),1,.06,4),rail);}}
  return {occluders};
}
