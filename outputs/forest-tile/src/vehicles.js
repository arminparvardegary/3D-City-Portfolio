import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, tint, mergeStatic } from './geometry.js';

// A small kit of clean toy vehicles in the style of the tile: soft rounded
// bodies, a tinted glass cabin under a painted roof, dark bumpers and wheel
// arches, simple lamps and wheels. Units are tile units; the nose points to +z.

function paint(color,prep){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.05,vertexColors:true});
  prep?.(mat);return mat;
}

// Glass cabin from a side profile [[z, y], ...] (front base, front top, rear top,
// rear base), with a painted roof, A and C pillars and optional B pillars.
function cabin(car,m,body,{pts,width,pillars=[],roof=true}){
  const s=new THREE.Shape(),bevel=.04;
  s.moveTo(...pts[0]);for(const p of pts.slice(1))s.lineTo(...p);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:width-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3});
  mesh(car,tint(g.rotateY(-Math.PI/2).translate(width/2-bevel,0,0)),m.carGlass);
  if(!roof)return;
  const [fb,ft,rt,rb]=pts,top=Math.max(ft[1],rt[1])+bevel;
  box(car,[width+.05,.07,Math.abs(ft[0]-rt[0])+.1],[0,top,(ft[0]+rt[0])/2],body,.035);
  const post=(a,b)=>{const dz=b[0]-a[0],dy=b[1]-a[1];for(const sx of [-1,1])box(car,[.07,Math.hypot(dz,dy)+.04,.09],[sx*(width/2+.012),(a[1]+b[1])/2,(a[0]+b[0])/2],body,.03,[Math.atan2(dz,dy),0,0]);};
  post(fb,ft);post(rb,rt);
  for(const z of pillars){const y0=Math.min(fb[1],rb[1]);for(const sx of [-1,1])box(car,[.07,top-y0,.1],[sx*(width/2+.012),(top+y0)/2,z],body,.03);}
}

// The lower body: one rounded block, with dark bumpers, lamps and mirrors.
function lowerBody(car,m,body,{L,W,y0,H,lamps=true,mirrorZ=null,radius=.18,bumpers=true}){
  box(car,[W,H,L],[0,y0+H/2,0],body,radius);
  if(bumpers)for(const sz of [-1,1])box(car,[W+.03,.16,.18],[0,y0+.08,sz*(L/2-.05)],m.carTrim,.07);
  if(lamps)for(const sx of [-1,1]){
    box(car,[.3,.09,.04],[sx*(W/2-.26),y0+H-.14,L/2+.004],m.headlight,.035);
    box(car,[.3,.08,.04],[sx*(W/2-.26),y0+H-.13,-L/2-.004],m.tailLight,.035);
  }
  if(mirrorZ!==null)for(const sx of [-1,1])box(car,[.14,.08,.11],[sx*(W/2+.03),y0+H+.08,mirrorZ],body,.035);
}

// Wheels: a dark half disc arch on the body side, then tyre, light rim and hub.
function wheels(rig,car,m,{r,track,axles,bodyW,tw=.24}){
  const spins=[];
  for(const {z,steer} of axles)for(const sx of [-1,1]){
    const arch=mesh(car,tint(new THREE.CircleGeometry(r+.06,24,0,Math.PI)),m.carTrim,[sx*(bodyW/2+.004),r,z],[0,sx*Math.PI/2,0]);arch.castShadow=false;
    const w=new THREE.Group();w.position.set(sx*track,r,z);rig.add(w);
    const spin=new THREE.Group();w.add(spin);spin.userData.steer=w;spin.userData.front=!!steer;
    mesh(spin,new THREE.CylinderGeometry(r,r,tw,28),m.rubber,[0,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(r*.58,r*.58,.02,24),m.rim,[sx*(tw/2+.004),0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(r*.17,r*.17,.024,14),m.carTrim,[sx*(tw/2+.012),0,0],[0,0,Math.PI/2]);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(spin,[.012,r*.18,r*.1],[sx*(tw/2+.012),Math.sin(a)*r*.36,Math.cos(a)*r*.36],m.carTrim,.005,[Math.PI/2-a,0,0]);}
    spins.push(spin);
  }
  return spins;
}

// A text sign (taxi light, ambulance lettering) drawn once on a canvas.
function sign(text,bg,fg,w=256,h=96){
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle=fg;x.font=`700 ${Math.round(h*.55)}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,h/2+2);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map,roughness:.6});
}

// Truck cab: a tall rounded block with a big windscreen, side windows and a roof.
function truckCab(car,m,body,{z0,z1,W,y0}){
  const L=z1-z0,zc=(z0+z1)/2;
  box(car,[W,.75,L],[0,y0+.375,zc],body,.14);
  cabin(car,m,body,{pts:[[z1-.02,y0+.75],[z1-.14,y0+1.42],[z0+.08,y0+1.42],[z0+.06,y0+.75]],width:W-.12});
  box(car,[W+.03,.18,.16],[0,y0+.09,z1+.02],m.carTrim,.07);
  for(const sx of [-1,1]){
    box(car,[.3,.12,.04],[sx*(W/2-.25),y0+.38,z1+.004],m.headlight,.04);
    box(car,[.07,.3,.05],[sx*(W/2+.07),y0+1.0,z1-.2],m.carTrim,.025);  // truck mirrors
  }
}

const car=(name,color,make)=>({name,color,make});

export const VEHICLES=[
  car('Hatchback','#e8574a',(c,m,p)=>{
    lowerBody(c,m,p,{L:3.4,W:1.56,y0:.24,H:.52,mirrorZ:.62});
    cabin(c,m,p,{pts:[[.72,.76],[.22,1.24],[-1.22,1.26],[-1.6,.84]],width:1.38,pillars:[-.35]});
    return {L:3.4,W:1.56,r:.3,track:.68,axles:[{z:1.05,steer:1},{z:-1.05}]};
  }),
  car('Sedan','#3c6fd1',(c,m,p)=>{
    lowerBody(c,m,p,{L:3.9,W:1.6,y0:.24,H:.5,mirrorZ:.7});
    cabin(c,m,p,{pts:[[.78,.74],[.22,1.18],[-.78,1.18],[-1.3,.74]],width:1.4,pillars:[-.25]});
    return {L:3.9,W:1.6,r:.3,track:.7,axles:[{z:1.25,steer:1},{z:-1.25}]};
  }),
  car('Coupe','#f07a2a',(c,m,p)=>{
    lowerBody(c,m,p,{L:3.9,W:1.62,y0:.22,H:.46,mirrorZ:.5});
    cabin(c,m,p,{pts:[[.55,.68],[-.05,1.06],[-.62,1.06],[-1.4,.72]],width:1.36});
    box(c,[1.3,.05,.22],[0,.72,-1.82],p,.025);
    return {L:3.9,W:1.62,r:.31,track:.71,axles:[{z:1.25,steer:1},{z:-1.2}]};
  }),
  car('Sports','#d8302f',(c,m,p)=>{
    lowerBody(c,m,p,{L:4.1,W:1.74,y0:.2,H:.4,mirrorZ:.4,radius:.16});
    cabin(c,m,p,{pts:[[.45,.6],[-.15,.95],[-.62,.95],[-1.45,.64]],width:1.3});
    for(const sx of [-1,1])box(c,[.04,.18,.07],[sx*.55,.72,-1.82],m.carTrim,.015);
    box(c,[1.62,.04,.3],[0,.82,-1.84],m.carTrim,.018);
    box(c,[1.5,.04,.26],[0,.2,2.0],m.carTrim,.018);
    return {L:4.1,W:1.74,r:.33,track:.76,axles:[{z:1.32,steer:1},{z:-1.3}]};
  }),
  car('SUV','#3b7d6b',(c,m,p)=>{
    lowerBody(c,m,p,{L:4.1,W:1.74,y0:.32,H:.66,mirrorZ:.75});
    cabin(c,m,p,{pts:[[.88,.98],[.46,1.52],[-1.7,1.52],[-1.88,1.0]],width:1.56,pillars:[-.25,-1.15]});
    for(const sx of [-1,1])box(c,[.05,.05,1.9],[sx*.62,1.62,-.6],m.carTrim,.02);
    return {L:4.1,W:1.74,r:.38,track:.76,axles:[{z:1.35,steer:1},{z:-1.35}]};
  }),
  car('Wagon','#9aa7b4',(c,m,p)=>{
    lowerBody(c,m,p,{L:4.1,W:1.6,y0:.24,H:.5,mirrorZ:.72});
    cabin(c,m,p,{pts:[[.82,.74],[.3,1.2],[-1.78,1.22],[-1.92,.8]],width:1.42,pillars:[-.3,-1.2]});
    return {L:4.1,W:1.6,r:.3,track:.7,axles:[{z:1.3,steer:1},{z:-1.3}]};
  }),
  car('Roadster','#2aa7b8',(c,m,p)=>{
    lowerBody(c,m,p,{L:3.7,W:1.6,y0:.22,H:.48,mirrorZ:.45});
    // Open top: a raked windscreen, two seats and roll hoops.
    const ws=box(c,[1.36,.36,.03],[0,.86,.5],m.carGlass,.012,[-.5,0,0]);
    for(const sx of [-1,1]){box(c,[.48,.12,.48],[sx*.34,.74,-.25],m.carTrim,.05);box(c,[.46,.42,.1],[sx*.34,.92,-.5],m.carTrim,.05,[-.15,0,0]);box(c,[.36,.08,.08],[sx*.34,1.12,-.62],p,.035);}
    return {L:3.7,W:1.6,r:.3,track:.7,axles:[{z:1.2,steer:1},{z:-1.15}]};
  }),
  car('Minivan','#8a7fd6',(c,m,p)=>{
    lowerBody(c,m,p,{L:4.3,W:1.74,y0:.28,H:.6,mirrorZ:.95});
    cabin(c,m,p,{pts:[[1.2,.88],[.6,1.6],[-1.95,1.6],[-2.08,.92]],width:1.6,pillars:[.05,-1.1]});
    for(const sx of [-1,1])box(c,[.03,.03,1.1],[sx*.88,.8,-.55],m.carTrim,.01);
    return {L:4.3,W:1.74,r:.32,track:.76,axles:[{z:1.42,steer:1},{z:-1.38}]};
  }),
  car('Taxi','#f5c400',(c,m,p)=>{
    lowerBody(c,m,p,{L:3.9,W:1.6,y0:.24,H:.5,mirrorZ:.7});
    cabin(c,m,p,{pts:[[.78,.74],[.22,1.18],[-.78,1.18],[-1.3,.74]],width:1.4,pillars:[-.25]});
    for(const sx of [-1,1])box(c,[.02,.08,3.0],[sx*.805,.55,0],m.carTrim,.01);
    const t=sign('TAXI','#fff6c8','#2a2a2a');box(c,[.5,.16,.2],[0,1.32,-.25],t,.04);
    return {L:3.9,W:1.6,r:.3,track:.7,axles:[{z:1.25,steer:1},{z:-1.25}]};
  }),
  car('City','#8fd0c3',(c,m,p,prep)=>{
    lowerBody(c,m,p,{L:3.0,W:1.5,y0:.24,H:.5,mirrorZ:.48,radius:.2});
    const roofWhite=paint('#f6f5ef',prep);
    cabin(c,m,roofWhite,{pts:[[.6,.74],[.2,1.24],[-.98,1.26],[-1.36,.8]],width:1.34,pillars:[-.42]});
    return {L:3.0,W:1.5,r:.28,track:.66,axles:[{z:.92,steer:1},{z:-.95}]};
  }),
  car('Ambulance','#f4f5f2',(c,m,p,prep)=>{
    const red=paint('#e2372f',prep);
    // Cab and a tall patient box with a red band, red crosses, a light bar.
    lowerBody(c,m,p,{L:4.7,W:1.82,y0:.3,H:.52,lamps:false,mirrorZ:null});
    box(c,[1.86,1.3,2.9],[0,1.47,-.87],p,.12);
    cabin(c,m,p,{pts:[[1.55,.82],[1.05,1.5],[.6,1.52],[.6,.82]],width:1.62});
    for(const sx of [-1,1]){
      box(c,[.02,.16,2.9],[sx*.935,1.12,-.87],red,.01);
      box(c,[.02,.42,.13],[sx*.935,1.62,-.95],red,.01);box(c,[.02,.13,.42],[sx*.935,1.62,-.95],red,.01);
      box(c,[.3,.1,.04],[sx*.66,.68,2.354],m.headlight,.035);
      box(c,[.24,.1,.04],[sx*.7,.68,-2.354],m.tailLight,.035);
      box(c,[.07,.28,.05],[sx*.98,1.15,.9],m.carTrim,.025);
    }
    box(c,[.42,.42,.02],[0,1.62,-2.33],red,.01);
    box(c,[.36,.1,.24],[-.22,2.18,.42],red,.04);box(c,[.36,.1,.24],[.22,2.18,.42],m.siren,.04);
    const word=sign('AMBULANCE','#f4f5f2','#e2372f',512,96);
    mesh(c,new THREE.PlaneGeometry(1.1,.2),word,[0,1.84,.592]);
    return {L:4.7,W:1.86,r:.34,track:.8,axles:[{z:1.55,steer:1},{z:-1.5}]};
  }),
  car('Box truck','#2f6fd6',(c,m,p,prep)=>{
    const white=paint('#f3f2ee',prep);
    box(c,[1.3,.22,4.7],[0,.5,-.1],m.carTrim,.04);                            // chassis
    truckCab(c,m,p,{z0:1.15,z1:2.45,W:1.86,y0:.42});
    box(c,[1.96,1.62,3.45],[0,1.47,-.6],white,.08);                           // cargo box
    box(c,[1.96,.12,3.45],[0,.7,-.6],p,.03);
    for(const sx of [-1,1])box(c,[.26,.08,.04],[sx*.72,.86,-2.33],m.tailLight,.03);
    return {L:4.9,W:1.96,r:.4,track:.8,tw:.3,bodyW:1.3,axles:[{z:1.75,steer:1},{z:-1.2},{z:-1.95}]};
  }),
  car('Dump truck','#f08a24',(c,m,p,prep)=>{
    const bed=paint('#f2b62c',prep);
    box(c,[1.3,.22,4.7],[0,.5,-.1],m.carTrim,.04);
    truckCab(c,m,p,{z0:1.15,z1:2.45,W:1.86,y0:.42});
    // Open tipper: floor and four walls, the front wall taller as a cab guard.
    const z0=-2.4,z1=.95,zc=(z0+z1)/2,Lb=z1-z0;
    box(c,[1.9,.12,Lb],[0,.72,zc],bed,.03);
    for(const sx of [-1,1])box(c,[.08,.78,Lb],[sx*.91,1.13,zc],bed,.03);
    box(c,[1.9,.95,.08],[0,1.22,z1-.04],bed,.03);box(c,[1.9,.7,.08],[0,1.09,z0+.04],bed,.03);
    box(c,[1.74,.06,Lb-.2],[0,.79,zc],m.carTrim,.02);
    for(const sx of [-1,1])box(c,[.26,.08,.04],[sx*.72,.62,-2.43],m.tailLight,.03);
    return {L:4.9,W:1.96,r:.4,track:.8,tw:.3,bodyW:1.3,axles:[{z:1.75,steer:1},{z:-1.15},{z:-1.9}]};
  }),
];

// Builds vehicle i into a rig: `car` is the sprung body (it pitches and rolls
// while driving), the wheels hang off the rig so they stay planted.
export function buildVehicle(i,parent,m,prep){
  const v=VEHICLES[i],rig=new THREE.Group();rig.name='vehicle';
  rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;parent.add(rig);
  const body=new THREE.Group();rig.add(body);
  const paintMat=paint(v.color,prep);
  const spec=v.make(body,m,paintMat,prep);
  const spins=wheels(rig,body,m,{r:spec.r,track:spec.track,axles:spec.axles,bodyW:spec.bodyW??spec.W,tw:spec.tw});
  mergeStatic(body);
  const zs=spec.axles.map(a=>a.z),front=Math.max(...zs),rear=Math.min(...zs.filter(z=>z<0));
  return {rig,car:body,wheels:spins,paint:paintMat,color:v.color,name:v.name,
    wheelR:spec.r,wheelbase:front-(spec.axles.length>2?(rear+Math.max(...zs.filter(z=>z<0)))/2:rear),length:spec.L,width:spec.W};
}

// Frees a vehicle: its geometry and every material it made (shared ones stay).
export function disposeVehicle(parts,m){
  const shared=new Set(Object.values(m));
  parts.rig.removeFromParent();
  parts.rig.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();if(!shared.has(o.material)){o.material.map?.dispose();o.material.dispose();}});
}
