import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mesh, mergeStatic } from './geometry.js';

// A realistic sports saloon, built from smooth lofted surfaces rather than boxes:
// a body whose cross sections are rounded rectangles that change along the car
// (wide at the hips, tapering to a rounded nose and tail, rising over the wheels
// to form the arches), and a glass cabin that leans in toward the roof
// (tumblehome). Painted roof and pillars, chrome belt line, LED lamps, a full
// width rear light bar, grille and intakes, mirrors, door seams, exhausts and
// plates. Units are tile units (about 1.5 m each); the nose points to +z.

// Smooth interpolation through a table [[z, value], ...].
export const curve=table=>z=>{if(z<=table[0][0])return table[0][1];for(let i=1;i<table.length;i++){const [z1,v1]=table[i];if(z<=z1){const [z0,v0]=table[i-1],t=(z-z0)/(z1-z0),s=t*t*(3-2*t);return v0+(v1-v0)*s;}}return table.at(-1)[1];};
// Superellipse: a rounded rectangle point at angle a (n: squareness).
export const se=(a,n)=>{const c=Math.cos(a),s=Math.sin(a);return [Math.sign(c)*Math.abs(c)**(2/n),Math.sign(s)*Math.abs(s)**(2/n)];};

// Loft: rings of points (same count, counter clockwise seen from the front) at
// increasing z, joined into one smooth surface; ends closed with a fan.
export function loft(rings,{caps=true,closed=true}={}){
  const M=rings[0].pts.length,pos=[],idx=[];
  for(const r of rings)for(const [x,y] of r.pts)pos.push(x,y,r.z);
  for(let k=0;k<rings.length-1;k++)for(let j=0;j<(closed?M:M-1);j++){const a=k*M+j,b=k*M+(j+1)%M,c=(k+1)*M+j,d=(k+1)*M+(j+1)%M;idx.push(a,b,c,b,d,c);}
  if(caps)for(const [k,flip] of [[0,true],[rings.length-1,false]]){
    const r=rings[k],cx=r.pts.reduce((s,p)=>s+p[0],0)/M,cy=r.pts.reduce((s,p)=>s+p[1],0)/M,ci=pos.length/3;pos.push(cx,cy,r.z);
    for(let j=0;j<M;j++){const a=k*M+j,b=k*M+(j+1)%M;flip?idx.push(ci,b,a):idx.push(ci,a,b);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

export function physicalPaint(color,prep){
  const m=new THREE.MeshPhysicalMaterial({color,metalness:.55,roughness:.32,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.4});
  prep?.(m);return m;
}

export function buildRealCar(car,m,paint,w,{L=3.7,W=1.62,taxi=false}={},prep){
  const P=prep??(x=>x),mat=(o)=>{const x=new THREE.MeshStandardMaterial(o);P(x);return x;};
  const glass=new THREE.MeshPhysicalMaterial({color:'#0c1218',metalness:.2,roughness:.04,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:1.8});P(glass);
  const chrome=mat({color:'#e8ebef',metalness:1,roughness:.12,envMapIntensity:1.6}),black=mat({color:'#121417',roughness:.55,metalness:.1}),gloss=mat({color:'#0b0c0e',roughness:.2,metalness:.3});
  const led=mat({color:'#f4f8ff',emissive:'#eaf2ff',emissiveIntensity:1.6,roughness:.2}),lens=new THREE.MeshPhysicalMaterial({color:'#20242a',metalness:.4,roughness:.05,clearcoat:1});P(lens);
  const red=m.tailLight;
  const zr=-L/2,zf=L/2,az=w.axles.map(a=>a.z),R=w.r+.07;
  // Profiles along the car (rear to front).
  const shoulder=curve([[zr,.66],[zr+.18,.82],[zr+.6,.88],[.25,.88],[.62,.86],[zf-.45,.76],[zf-.08,.66],[zf,.56]]);
  const half=curve([[zr,.6],[zr+.25,.76],[zr+.8,.81],[0,W/2],[zf-.7,.79],[zf-.2,.72],[zf,.56]]);
  const floor=z=>{let y=.2;for(const a of az){const d=Math.abs(z-a);if(d<R)y=Math.max(y,w.r+Math.sqrt(R*R-d*d)-.02);}return y;};
  // Lower body.
  const rings=[],N=48,M=28;
  for(let i=0;i<=N;i++){
    const z=zr+(zf-zr)*i/N,yb=floor(z),yt=shoulder(z),hw=half(z),yc=(yb+yt)/2,hh=(yt-yb)/2,pts=[];
    for(let j=0;j<M;j++){const [sx,sy]=se(j/M*Math.PI*2,4.2);pts.push([sx*hw,yc+sy*hh]);}
    rings.push({z,pts});
  }
  mesh(car,loft(rings),paint);
  // Cabin: base on the shoulder, roof over the middle, steep windshield, fastback rear.
  const cz0=-1.12,cz1=.66,roof=curve([[cz0,.86],[-.72,1.18],[-.35,1.3],[.08,1.32],[.36,1.18],[cz1,.86]]);
  const cab=[],roofRings=[],K=26,Q=28;
  for(let i=0;i<=K;i++){
    const z=cz0+(cz1-cz0)*i/K,base=shoulder(z)-.05,top=Math.max(base+.02,roof(z)),wb=half(z)-.11,wt=wb-.2,yc=(base+top)/2,hh=(top-base)/2,pts=[],rp=[];
    for(let j=0;j<Q;j++){const [sx,sy]=se(j/Q*Math.PI*2,3.6),y=yc+sy*hh,v=Math.max(0,(y-base)/(top-base)),x=sx*(wb+(wt-wb)*v);pts.push([x,y]);
      rp.push([x*1.012,y+.006]);}
    cab.push({z,pts});roofRings.push({z,pts:rp});
  }
  mesh(car,loft(cab),glass);
  // Painted roof: the top of the cabin, slightly proud, where the cabin is tall.
  {const keep=j=>{const a=j/Q*Math.PI*2;return a>Math.PI*.18&&a<Math.PI*.82;};
    const top=roofRings.slice(5,K-6).map(r=>({z:r.z,pts:r.pts.filter((_,j)=>keep(j))}));
    mesh(car,loft(top,{caps:false,closed:false}),paint);
  }
  // Chrome belt line along the base of the side windows.
  for(const s of [-1,1]){const pts=[];for(let z=cz0+.1;z<=cz1-.05;z+=.1)pts.push(new THREE.Vector3(s*(half(z)-.1),shoulder(z)-.03,z));
    mesh(car,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.014,5),chrome);}
  // Front: LED headlights in dark lenses, grille, lower intakes, splitter.
  for(const s of [-1,1]){
    mesh(car,new RoundedBoxGeometry(.42,.11,.2,2,.04),lens,[s*.5,.72,zf-.2],[-.25,s*.32,0]);
    mesh(car,new THREE.BoxGeometry(.36,.025,.05),led,[s*.5,.735,zf-.12],[-.25,s*.32,0]);
    mesh(car,new RoundedBoxGeometry(.32,.13,.1,2,.04),black,[s*.5,.38,zf-.05]);
  }
  mesh(car,new RoundedBoxGeometry(.62,.16,.12,2,.05),gloss,[0,.52,zf-.02]);
  for(let k=-2;k<=2;k++)mesh(car,new THREE.BoxGeometry(.56,.012,.02),chrome,[0,.47+k*.025,zf+.03]);
  mesh(car,new THREE.BoxGeometry(1.2,.04,.16),black,[0,.24,zf-.02]);
  // Rear: full width light bar, lamp clusters, diffuser, twin exhausts.
  mesh(car,new THREE.BoxGeometry(1.0,.045,.04),red,[0,.8,zr+.13]);
  for(const s of [-1,1])mesh(car,new RoundedBoxGeometry(.3,.1,.12,2,.04),red,[s*.5,.78,zr+.12]);
  mesh(car,new THREE.BoxGeometry(1.1,.14,.14),black,[0,.3,zr+.06]);
  for(const s of [-1,1]){const e=new THREE.CylinderGeometry(.055,.055,.18,14).rotateX(Math.PI/2);mesh(car,e,chrome,[s*.38,.28,zr+.02]);}
  // Plates.
  const plate=(text)=>{const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');g.fillStyle='#f4f4f0';g.fillRect(0,0,256,64);g.strokeStyle='#222';g.lineWidth=4;g.strokeRect(3,3,250,58);
    g.fillStyle='#1a1d24';g.font='700 40px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,35);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return mat({map:t,roughness:.5});};
  const pm=plate(taxi?'NYC 1':'ARMIN');mesh(car,new THREE.PlaneGeometry(.42,.1),pm,[0,.42,zf+.062]);mesh(car,new THREE.PlaneGeometry(.42,.1),pm,[0,.52,zr+.03],[0,Math.PI,0]);
  // Sides: mirrors on stalks, door seams, handles, black sills.
  for(const s of [-1,1]){
    const x=s*(half(.5)-.06);mesh(car,new THREE.BoxGeometry(.05,.04,.12),black,[x+s*.07,.92,.48]);
    mesh(car,new RoundedBoxGeometry(.2,.11,.13,2,.045),paint,[x+s*.17,.95,.46]);mesh(car,new THREE.BoxGeometry(.012,.08,.1),gloss,[x+s*.27,.95,.47]);
    for(const z of [.52,-.3,-1.0]){const hw=half(z);mesh(car,new THREE.BoxGeometry(.008,shoulder(z)-floor(z)-.08,.012),gloss,[s*(hw+.002),(shoulder(z)+floor(z))/2,z]);}
    for(const z of [.25,-.55])mesh(car,new RoundedBoxGeometry(.03,.035,.16,2,.012),chrome,[s*(half(z)+.008),.78,z]);
    mesh(car,new THREE.BoxGeometry(.04,.08,az[0]-az[1]-.95),black,[s*(half(0)-.02),.25,(az[0]+az[1])/2]);
  }
  if(taxi){
    const c=document.createElement('canvas');c.width=256;c.height=96;const g=c.getContext('2d');g.fillStyle='#fff8d6';g.fillRect(0,0,256,96);g.fillStyle='#1d1d1f';g.font='800 56px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('TAXI',128,52);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const sm=mat({map:t,emissive:'#fff2b0',emissiveIntensity:.25,emissiveMap:t});
    mesh(car,new RoundedBoxGeometry(.56,.17,.24,2,.05),sm,[0,1.4,-.12]);
    // Checker stripe along each side.
    const cream=mat({color:'#f6f4ee'});for(const s of [-1,1])for(let k=0;k<14;k++){const z=-1.0+k*.1;mesh(car,new THREE.BoxGeometry(.006,.05,.1),k%2?black:cream,[s*(half(z)+.004),.64,z]);}
  }
  return {L,W};
}

// Realistic wheels: a rounded tyre, a ten spoke alloy, a brake disc and a red
// calliper that steers but does not spin.
export function realWheels(rig,m,w){
  const spins=[],{r,tw,track}=w;
  const tyreProfile=[];for(let i=0;i<=8;i++){const a=-Math.PI/2+i/8*Math.PI;tyreProfile.push(new THREE.Vector2(r-.06+Math.cos(a)*.06,Math.sin(a)*tw/2*.98));}
  const tyreGeo=new THREE.LatheGeometry([new THREE.Vector2(r*.66,-tw/2),...tyreProfile,new THREE.Vector2(r*.66,tw/2)],24).rotateZ(Math.PI/2);
  const alloy=new THREE.MeshStandardMaterial({color:'#c4c8ce',metalness:.9,roughness:.25,envMapIntensity:1.5}),disc=new THREE.MeshStandardMaterial({color:'#7d8188',metalness:.8,roughness:.4});
  const caliper=new THREE.MeshStandardMaterial({color:'#d01e24',roughness:.35,metalness:.2}),rubber=m.rubber;
  for(const {z,steer} of w.axles)for(const sx of [-1,1]){
    const pivot=new THREE.Group();pivot.position.set(sx*track,r,z);rig.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);spin.userData.steer=pivot;spin.userData.front=!!steer;
    mesh(spin,tyreGeo,rubber).userData.tyre=true;
    const face=sx*(tw/2-.03);
    mesh(spin,new THREE.CylinderGeometry(r*.66,r*.66,tw*.8,28,1,true),alloy,[0,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(r*.66,r*.62,.03,28),alloy,[face,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(r*.13,r*.13,.05,16),alloy,[face+sx*.015,0,0],[0,0,Math.PI/2]);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;mesh(spin,new THREE.BoxGeometry(.03,r*.5,.045),alloy,[face+sx*.012,Math.sin(a)*r*.36,Math.cos(a)*r*.36],[Math.PI/2-a,0,0]);}
    mesh(spin,new THREE.CylinderGeometry(r*.5,r*.5,.02,24),disc,[sx*(tw/2-.12),0,0],[0,0,Math.PI/2]);
    mesh(pivot,new RoundedBoxGeometry(.06,.16,.22,2,.025),caliper,[sx*(tw/2-.1),r*.3,-r*.18]);
    mergeStatic(spin);spins.push(spin);
  }
  return spins;
}
