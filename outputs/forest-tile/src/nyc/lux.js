import * as THREE from 'three';
import { createKit } from '../diorama/kit.js';

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

export function buildLux({x,z,top,w=9,d=15,h=5,facing=-1,style=0}){
  const S=LUX[style%LUX.length],K=createKit({flat:false}),{box,cyl,add,mat}=K,root=new THREE.Group(),f=facing;
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
  box(.1,.5,4.4,ex+f*.05,top+h-.45,z,goldGlow);   // a plain gold band over the doors
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
  return {root,solid:[x,z,hw+.3,hd+.3]};
}
