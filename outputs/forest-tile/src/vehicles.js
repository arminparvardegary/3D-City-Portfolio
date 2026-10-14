import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, tint, mergeStatic } from './geometry.js';

// A small kit of clean toy vehicles in the style of the tile: soft rounded
// bodies with real wheel wells, a tinted glass cabin under a painted roof, dark
// bumpers, simple lamps and wheels. Units are tile units; the nose points to +z.

// Largest steering angle the controls use (rad). Every wheel well is sized so a
// tyre at a little more than this angle, either way, stays clear of the body.
export const MAX_STEER=.62;
const STEER_CHECK=.66,WELL_GAP=.06,CORE_GAP=.035;

function paint(color,prep){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.05,vertexColors:true});
  prep?.(mat);return mat;
}
// Surfaces that are not closed solids (liners, inner walls, signs) are tagged so
// the clearance check ignores them.
const open=o=>{o.userData.open=true;o.castShadow=false;return o;};

// How far in from the wheel centre plane a tyre reaches when steered to the limit.
const tyreReach=(w,steer)=>steer?w.tw/2*Math.cos(STEER_CHECK)+w.r*Math.sin(STEER_CHECK):w.tw/2;

// A body block cut from a side profile with arch openings over the wheels, then
// extruded across the car with soft bevelled edges. Inside each arch: a dark
// liner and an inner wall, placed inboard of where the steered tyre can reach.
function wellBody(car,m,body,{L,W,y0,H,zc=0,corner=.12},w){
  const b=.045,R=w.r+WELL_GAP,top=y0+H;
  const zf=zc+L/2-b,zr=zc-L/2+b,yb=y0+b,yt=top-b,rc=Math.min(corner,(yt-yb)/2.2);
  const axles=w.axles.filter(a=>a.z-R>zc-L/2&&a.z+R<zc+L/2).sort((a,c)=>c.z-a.z);
  for(const a of axles)if(w.r+R>top-.04)console.warn('wheel well breaks through the top of the body',a.z);
  const s=new THREE.Shape();
  s.moveTo(zf-rc,yb);
  for(const a of axles){
    const Rs=R+b,dy=yb-w.r,dz=Math.sqrt(Math.max(0,Rs*Rs-dy*dy)),a0=Math.atan2(dy,dz);
    s.lineTo(a.z+dz,yb);s.absarc(a.z,w.r,Rs,a0,Math.PI-a0,false);
  }
  s.lineTo(zr+rc,yb);s.quadraticCurveTo(zr,yb,zr,yb+rc);
  s.lineTo(zr,yt-rc);s.quadraticCurveTo(zr,yt,zr+rc,yt);
  s.lineTo(zf-rc,yt);s.quadraticCurveTo(zf,yt,zf,yt-rc);
  s.lineTo(zf,yb+rc);s.quadraticCurveTo(zf,yb,zf-rc,yb);
  const g=new THREE.ExtrudeGeometry(s,{depth:W-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:24});
  mesh(car,tint(g.rotateY(-Math.PI/2).translate(W/2-b,0,0)),body);
  for(const a of axles){
    const inner=w.track-tyreReach(w,a.steer)-CORE_GAP,width=W/2-.012-inner;
    if(inner<.05)console.warn('wheel well too wide for the body',a.z);
    for(const sx of [-1,1]){
      const liner=new THREE.CylinderGeometry(R-.004,R-.004,width,32,1,true,0,Math.PI).rotateZ(Math.PI/2);
      open(mesh(car,tint(liner),m.wheelWell,[sx*(inner+width/2),w.r,a.z]));
      open(mesh(car,tint(new THREE.CircleGeometry(R,32,0,Math.PI)),m.carTrim,[sx*inner,w.r,a.z],[0,sx*Math.PI/2,0]));
    }
  }
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

// The lower body with wheel wells, dark bumpers, lamps and mirrors.
function lowerBody(car,m,body,{L,W,y0,H,lamps=true,mirrorZ=null,bumpers=true},w){
  wellBody(car,m,body,{L,W,y0,H},w);
  const top=y0+H;
  if(bumpers)for(const sz of [-1,1])box(car,[W+.03,.16,.18],[0,y0+.09,sz*(L/2-.05)],m.carTrim,.07);
  if(lamps)for(const sx of [-1,1]){
    box(car,[.3,.09,.04],[sx*(W/2-.26),top-.17,L/2+.006],m.headlight,.035);
    box(car,[.3,.08,.04],[sx*(W/2-.26),top-.16,-L/2-.006],m.tailLight,.035);
  }
  // Mirrors sit on the body shoulder, slightly embedded so they never float.
  if(mirrorZ!==null)for(const sx of [-1,1])box(car,[.14,.08,.11],[sx*(W/2+.02),top+.02,mirrorZ],body,.035);
}

// Wheels: tyre, light rim, hub and spokes, on a steering pivot at the wheel centre.
function wheels(rig,m,w){
  const spins=[],{r,tw,track}=w;
  for(const {z,steer} of w.axles)for(const sx of [-1,1]){
    const pivot=new THREE.Group();pivot.position.set(sx*track,r,z);rig.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);spin.userData.steer=pivot;spin.userData.front=!!steer;
    const tyre=mesh(spin,new THREE.CylinderGeometry(r,r,tw,28),m.rubber,[0,0,0],[0,0,Math.PI/2]);tyre.userData.tyre=true;
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

// Truck cab: a tall block with a well over the front wheels, big windscreen, mirrors.
function truckCab(car,m,body,{z0,z1,W,y0},w){
  wellBody(car,m,body,{L:z1-z0,W,y0,H:.75,zc:(z0+z1)/2,corner:.14},w);
  cabin(car,m,body,{pts:[[z1-.02,y0+.75],[z1-.14,y0+1.42],[z0+.08,y0+1.42],[z0+.06,y0+.75]],width:W-.12});
  box(car,[W+.03,.18,.16],[0,y0+.1,z1+.02],m.carTrim,.07);
  for(const sx of [-1,1]){
    box(car,[.3,.12,.04],[sx*(W/2-.25),y0+.4,z1+.006],m.headlight,.04);
    box(car,[.07,.3,.05],[sx*(W/2+.03),y0+1.0,z1-.2],m.carTrim,.025);
  }
}

// name, paint, wheels {r tyre radius, tw tyre width, track, axles [{z, steer}]}, body.
const v=(name,color,wheels,make)=>({name,color,wheels:{tw:.24,...wheels},make});

export const VEHICLES=[
  v('Hatchback','#e8574a',{r:.3,track:.68,axles:[{z:1.05,steer:1},{z:-1.05}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:3.4,W:1.56,y0:.24,H:.52,mirrorZ:.62},w);
    cabin(c,m,p,{pts:[[.72,.76],[.22,1.24],[-1.22,1.26],[-1.6,.84]],width:1.38,pillars:[-.35]});
    return {L:3.4,W:1.56};
  }),
  v('Sedan','#3c6fd1',{r:.3,track:.7,axles:[{z:1.25,steer:1},{z:-1.25}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:3.9,W:1.6,y0:.24,H:.5,mirrorZ:.7},w);
    cabin(c,m,p,{pts:[[.78,.74],[.22,1.18],[-.78,1.18],[-1.3,.74]],width:1.4,pillars:[-.25]});
    return {L:3.9,W:1.6};
  }),
  v('Coupe','#f07a2a',{r:.31,track:.71,axles:[{z:1.25,steer:1},{z:-1.2}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:3.9,W:1.62,y0:.22,H:.52,mirrorZ:.5},w);
    cabin(c,m,p,{pts:[[.55,.74],[-.05,1.12],[-.62,1.12],[-1.4,.78]],width:1.36});
    box(c,[1.3,.05,.22],[0,.76,-1.82],p,.025);
    return {L:3.9,W:1.62};
  }),
  v('Sports','#d8302f',{r:.31,track:.76,axles:[{z:1.32,steer:1},{z:-1.3}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:4.1,W:1.74,y0:.2,H:.52,mirrorZ:.4},w);
    cabin(c,m,p,{pts:[[.45,.72],[-.15,1.07],[-.62,1.07],[-1.45,.76]],width:1.3});
    for(const sx of [-1,1])box(c,[.04,.18,.07],[sx*.55,.84,-1.82],m.carTrim,.015);
    box(c,[1.62,.04,.3],[0,.94,-1.84],m.carTrim,.018);
    box(c,[1.5,.04,.26],[0,.2,2.0],m.carTrim,.018);
    return {L:4.1,W:1.74};
  }),
  v('SUV','#3b7d6b',{r:.38,track:.76,axles:[{z:1.35,steer:1},{z:-1.35}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:4.1,W:1.74,y0:.32,H:.66,mirrorZ:.75},w);
    cabin(c,m,p,{pts:[[.88,.98],[.46,1.52],[-1.7,1.52],[-1.88,1.0]],width:1.56,pillars:[-.25,-1.15]});
    for(const sx of [-1,1])box(c,[.05,.05,1.9],[sx*.62,1.615,-.6],m.carTrim,.02);
    return {L:4.1,W:1.74};
  }),
  v('Wagon','#9aa7b4',{r:.3,track:.7,axles:[{z:1.3,steer:1},{z:-1.3}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:4.1,W:1.6,y0:.24,H:.5,mirrorZ:.72},w);
    cabin(c,m,p,{pts:[[.82,.74],[.3,1.2],[-1.78,1.22],[-1.92,.8]],width:1.42,pillars:[-.3,-1.2]});
    return {L:4.1,W:1.6};
  }),
  v('Roadster','#2aa7b8',{r:.3,track:.7,axles:[{z:1.2,steer:1},{z:-1.15}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:3.7,W:1.6,y0:.22,H:.52,mirrorZ:.45},w);
    // Open top: a raked windscreen, two seats and roll hoops, all seated on the body.
    box(c,[1.36,.36,.03],[0,.9,.5],m.carGlass,.012,[-.5,0,0]);
    for(const sx of [-1,1]){box(c,[.48,.12,.48],[sx*.34,.78,-.25],m.carTrim,.05);box(c,[.46,.42,.1],[sx*.34,.96,-.5],m.carTrim,.05,[-.15,0,0]);box(c,[.36,.08,.08],[sx*.34,1.16,-.62],p,.035);}
    return {L:3.7,W:1.6};
  }),
  v('Minivan','#8a7fd6',{r:.32,track:.76,axles:[{z:1.42,steer:1},{z:-1.38}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:4.3,W:1.74,y0:.28,H:.6,mirrorZ:.95},w);
    cabin(c,m,p,{pts:[[1.2,.88],[.6,1.6],[-1.95,1.6],[-2.08,.92]],width:1.6,pillars:[.05,-1.1]});
    for(const sx of [-1,1])box(c,[.03,.03,1.1],[sx*.88,.8,-.55],m.carTrim,.01);
    return {L:4.3,W:1.74};
  }),
  v('Taxi','#f5c400',{r:.3,track:.7,axles:[{z:1.25,steer:1},{z:-1.25}]},(c,m,p,w)=>{
    lowerBody(c,m,p,{L:3.9,W:1.6,y0:.24,H:.5,mirrorZ:.7},w);
    cabin(c,m,p,{pts:[[.78,.74],[.22,1.18],[-.78,1.18],[-1.3,.74]],width:1.4,pillars:[-.25]});
    // Dark band between the wheel wells, proud of the door skin.
    box(c,[1.63,.08,1.4],[0,.56,0],m.carTrim,.01);
    const t=sign('TAXI','#fff6c8','#2a2a2a');box(c,[.5,.16,.2],[0,1.32,-.25],t,.04);
    return {L:3.9,W:1.6};
  }),
  v('City','#8fd0c3',{r:.28,track:.66,axles:[{z:.92,steer:1},{z:-.95}]},(c,m,p,w,prep)=>{
    lowerBody(c,m,p,{L:3.0,W:1.5,y0:.24,H:.5,mirrorZ:.48},w);
    const roofWhite=paint('#f6f5ef',prep);
    cabin(c,m,roofWhite,{pts:[[.6,.74],[.2,1.24],[-.98,1.26],[-1.36,.8]],width:1.34,pillars:[-.42]});
    return {L:3.0,W:1.5};
  }),
  v('Ambulance','#f4f5f2',{r:.34,track:.8,axles:[{z:1.55,steer:1},{z:-1.5}]},(c,m,p,w,prep)=>{
    const red=paint('#e2372f',prep);
    // Cab and a tall patient box with a red band, red crosses and a light bar.
    lowerBody(c,m,p,{L:4.7,W:1.82,y0:.3,H:.52,lamps:false},w);
    box(c,[1.86,1.3,2.9],[0,1.47,-.87],p,.12);
    cabin(c,m,p,{pts:[[1.55,.82],[1.05,1.5],[.6,1.52],[.6,.82]],width:1.62});
    for(const sx of [-1,1]){
      box(c,[.02,.16,2.9],[sx*.935,1.12,-.87],red,.01);
      // The cross: two bars, the vertical one a hair prouder so their faces never coincide.
      box(c,[.024,.42,.13],[sx*.936,1.62,-.95],red,.01);box(c,[.02,.13,.42],[sx*.935,1.62,-.95],red,.01);
      box(c,[.3,.1,.04],[sx*.66,.68,2.356],m.headlight,.035);
      box(c,[.24,.1,.04],[sx*.7,.68,-2.356],m.tailLight,.035);
      box(c,[.07,.28,.05],[sx*.95,1.15,.9],m.carTrim,.025);
    }
    box(c,[.42,.42,.02],[0,1.62,-2.335],red,.01);
    // Red and blue halves of the light bar meet without overlapping.
    box(c,[.34,.1,.24],[-.19,2.17,.42],red,.04);box(c,[.34,.1,.24],[.19,2.17,.42],m.siren,.04);
    const word=sign('AMBULANCE','#f4f5f2','#e2372f',512,96);
    open(mesh(c,new THREE.PlaneGeometry(1.1,.2),word,[0,1.84,.592]));
    return {L:4.7,W:1.86};
  }),
  v('Box truck','#2f6fd6',{r:.4,tw:.3,track:.8,axles:[{z:1.75,steer:1},{z:-1.2},{z:-1.95}]},(c,m,p,w,prep)=>{
    const white=paint('#f3f2ee',prep);
    box(c,[.72,.2,4.7],[0,.52,-.1],m.carTrim,.04);                              // chassis rails, inside the wheels
    truckCab(c,m,p,{z0:1.15,z1:2.45,W:1.86,y0:.42},w);
    box(c,[1.9,.1,3.45],[0,.92,-.6],p,.03);                                     // painted sill above the rear wheels
    box(c,[1.96,1.36,3.45],[0,1.65,-.6],white,.08);                             // cargo box
    for(const sx of [-1,1])box(c,[.26,.08,.04],[sx*.72,1.12,-2.336],m.tailLight,.03);
    return {L:4.9,W:1.96};
  }),
  v('Dump truck','#f08a24',{r:.4,tw:.3,track:.8,axles:[{z:1.75,steer:1},{z:-1.15},{z:-1.9}]},(c,m,p,w,prep)=>{
    const bed=paint('#f2b62c',prep);
    box(c,[.72,.2,4.7],[0,.52,-.1],m.carTrim,.04);
    truckCab(c,m,p,{z0:1.15,z1:2.45,W:1.86,y0:.42},w);
    // Open tipper above the rear wheels: floor, side walls, and end walls between them.
    const z0=-2.4,z1=.95,zc=(z0+z1)/2,Lb=z1-z0;
    box(c,[1.9,.12,Lb],[0,.92,zc],bed,.03);
    for(const sx of [-1,1])box(c,[.08,.78,Lb],[sx*.91,1.33,zc],bed,.03);
    box(c,[1.74,.95,.08],[0,1.42,z1-.04],bed,.03);box(c,[1.74,.7,.08],[0,1.29,z0+.04],bed,.03);
    box(c,[1.68,.06,Lb-.2],[0,.99,zc],m.carTrim,.02);
    for(const sx of [-1,1])box(c,[.26,.08,.04],[sx*.72,.82,-2.43],m.tailLight,.03);
    return {L:4.9,W:1.96};
  }),
];

// Builds vehicle i into a rig: `car` is the sprung body (it pitches and rolls
// while driving), the wheels hang off the rig so they stay planted.
export function buildVehicle(i,parent,m,prep,{merge=true}={}){
  const veh=VEHICLES[i],rig=new THREE.Group();rig.name='vehicle';
  rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;parent.add(rig);
  const body=new THREE.Group();rig.add(body);
  const paintMat=paint(veh.color,prep),w=veh.wheels;
  const spec=veh.make(body,m,paintMat,w,prep);
  const spins=wheels(rig,m,w);
  if(merge)mergeStatic(body);
  const zs=w.axles.map(a=>a.z),front=Math.max(...zs),rears=zs.filter(z=>z<0);
  return {rig,car:body,wheels:spins,paint:paintMat,color:veh.color,name:veh.name,
    wheelR:w.r,wheelbase:front-rears.reduce((a,b)=>a+b,0)/rears.length,length:spec.L,width:spec.W};
}

// Frees a vehicle: its geometry and every material it made (shared ones stay).
export function disposeVehicle(parts,m){
  const shared=new Set(Object.values(m));
  parts.rig.removeFromParent();
  parts.rig.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();if(!shared.has(o.material)){o.material.map?.dispose();o.material.dispose();}});
}

// Clearance check: samples each tyre's surface at full lock both ways and at
// rest, and reports any sample inside a closed body part (ray parity test).
export function checkClearance(i,m){
  const holder=new THREE.Group(),parts=buildVehicle(i,holder,m,null,{merge:false});
  parts.rig.position.set(0,0,0);parts.rig.rotation.set(0,0,0);
  const solids=[],test=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  parts.car.traverse(o=>{if(o.isMesh&&!o.userData.open)solids.push(o);});
  holder.updateMatrixWorld(true);
  // A slightly tilted ray, with hits on shared edges counted once, keeps the parity honest.
  const ray=new THREE.Raycaster(),dirs=[[.013,1,.007],[-.011,1,-.009],[.004,1,-.015]].map(d=>new THREE.Vector3(...d).normalize()),p=new THREE.Vector3(),hits=[],{r,tw}=VEHICLES[i].wheels;
  for(const spin of parts.wheels)for(const steer of spin.userData.front?[-MAX_STEER,0,MAX_STEER]:[0]){
    const pivot=spin.userData.steer;pivot.rotation.y=steer;pivot.updateMatrixWorld(true);
    for(let k=0;k<36;k++)for(const xs of [-tw/2,0,tw/2])for(const rr of [r*.999,r*.8]){
      const a=k/36*Math.PI*2;p.set(xs,Math.sin(a)*rr,Math.cos(a)*rr).applyMatrix4(pivot.matrixWorld);
      // The open well surfaces: the inner wall and the arch liner.
      const w=VEHICLES[i].wheels,ax=w.axles.find(q=>q.z===pivot.position.z),wall=w.track-tyreReach(w,ax.steer)-CORE_GAP;
      if(Math.abs(p.x)<wall){hits.push({steer,z:ax.z,part:'inner wall',at:p.toArray().map(v=>+v.toFixed(2))});continue;}
      if(Math.hypot(p.y-w.r,p.z-ax.z)>w.r+WELL_GAP-.004&&p.y>w.r){hits.push({steer,z:ax.z,part:'liner',at:p.toArray().map(v=>+v.toFixed(2))});continue;}
      for(const s of solids){
        // Inside only if three slightly different rays all cross the surface an odd number of times.
        const keep=s.material;s.material=test;
        const inside=dirs.every(dir=>{ray.set(p,dir);const d=ray.intersectObject(s,false).map(h=>h.distance);return d.filter((x,k)=>k===0||x-d[k-1]>1e-5).length%2===1;});
        s.material=keep;
        if(inside){hits.push({steer,z:+pivot.position.z.toFixed(2),part:s.geometry.type,at:p.toArray().map(v=>+v.toFixed(2))});break;}
      }
    }
  }
  disposeVehicle(parts,m);
  return hits;
}
