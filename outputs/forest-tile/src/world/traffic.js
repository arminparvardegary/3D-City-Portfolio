import * as THREE from 'three';
import { VEHICLES, buildVehicle, disposeVehicle } from '../vehicles.js';
import { STEP, damp, lerp, fixedClock } from '../motion.js';

// A few cars moving slowly round the loop road, in both directions (right-hand
// traffic: clockwise on the inner lane, anticlockwise on the outer). Each
// follows a smooth rounded path, keeps a safe gap to the car ahead and to the
// visitor's car (Intelligent Driver Model), and the old van leaves a light
// trail of exhaust smoke. The simulation runs on the shared fixed 1/120 s step
// and each car is drawn interpolated between its last two states.
const ACCEL=1.6,COMFORT=2.6,HARD=8,MIN_GAP=1.4,HEADWAY=1.2;

// A closed rounded rectangle path, sampled every 0.25 units.
function loopPath({x0,x1,z0,z1},r,clockwise){
  const pts=[],arc=(cx,cz,a0,a1)=>{for(let i=1;i<=10;i++){const a=a0+(a1-a0)*i/10;pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}};
  // Corners in screen terms: top-left (x0,z0) ... drawn clockwise when seen from above (+y).
  pts.push([x0+r,z0]);pts.push([x1-r,z0]);arc(x1-r,z0+r,-Math.PI/2,0);pts.push([x1,z1-r]);arc(x1-r,z1-r,0,Math.PI/2);
  pts.push([x0+r,z1]);arc(x0+r,z1-r,Math.PI/2,Math.PI);pts.push([x0,z0+r]);arc(x0+r,z0+r,Math.PI,Math.PI*1.5);
  if(!clockwise)pts.reverse();
  const P=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(d/.25));
    for(let k=0;k<n;k++)P.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
  const cum=[0];for(let i=1;i<=P.length;i++){const a=P[i-1],b=P[i%P.length];cum.push(cum[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
  const L=cum.at(-1);
  return {L,at(s,out){s=((s%L)+L)%L;let lo=0,hi=P.length;while(hi-lo>1){const m=(lo+hi)>>1;if(cum[m]<=s)lo=m;else hi=m;}
    const a=P[lo],b=P[(lo+1)%P.length],t=(s-cum[lo])/(cum[lo+1]-cum[lo]||1);out.x=a[0]+(b[0]-a[0])*t;out.z=a[1]+(b[1]-a[1])*t;out.h=Math.atan2(b[0]-a[0],b[1]-a[1]);return out;}};
}

export function createTraffic({parent,m,prep,loop,player,y=.135}){
  const lane=1.1,inner={x0:loop.x0+lane,x1:loop.x1-lane,z0:loop.z0+lane,z1:loop.z1-lane},outer={x0:loop.x0-lane,x1:loop.x1+lane,z0:loop.z0-lane,z1:loop.z1+lane};
  const lanes=[{path:loopPath(inner,2.2,true)},{path:loopPath(outer,4.4,false)}];
  const own=()=>{const t=m.tailLight.clone(),h=m.headlight.clone();prep?.(t);prep?.(h);return {...m,tailLight:t,headlight:h};};
  const fleet=[['Taxi','Sedan','Hatchback'],['Minivan','SUV','Coupe']];
  const cars=[],pose={x:0,z:0,h:0};
  lanes.forEach((L,li)=>fleet[li].forEach((name,i)=>{
    const mats=own(),parts=buildVehicle(VEHICLES.findIndex(v=>v.name===name),parent,mats,prep);
    if(name==='Minivan'){parts.paint.color.set('#8fae7c');}            // the old green van
    const s0=L.path.L*(i/fleet[li].length)+li*7;
    cars.push({lane:L,parts,mats,s:s0,prevS:s0,prevPitch:0,v:0,len:parts.length,cruise:2.3+i*.25,pitch:0,tail:.45,smoky:name==='Minivan'});
  }));
  // Exhaust smoke: a small pool of soft puffs that rise, grow and fade.
  const puffMat=new THREE.MeshStandardMaterial({color:'#e9ecef',roughness:1,transparent:true,opacity:.55,depthWrite:false});
  const puffs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.16,1),puffMat,26);puffs.frustumCulled=false;puffs.castShadow=false;parent.add(puffs);
  const smoke=Array.from({length:26},()=>({age:9,x:0,y:0,z:0}));let next=0,emit=0;
  const o=new THREE.Object3D(),tmp=new THREE.Vector3();
  const ahead=c=>{let gap=Infinity,v=0;for(const o2 of cars)if(o2!==c&&o2.lane===c.lane){let d=o2.s-c.s;if(d<0)d+=c.lane.path.L;const g=d-o2.len/2-c.len/2;if(g<gap){gap=g;v=o2.v;}}return {gap,v};};
  const idm=(c,gap,vl)=>{const free=1-(c.v/c.cruise)**4;if(!isFinite(gap))return ACCEL*free;const want=MIN_GAP+Math.max(0,c.v*HEADWAY+c.v*(c.v-vl)/(2*Math.sqrt(ACCEL*COMFORT)));return ACCEL*(free-(want/Math.max(gap,.01))**2);};
  const clock=fixedClock(STEP);
  function step(dt){
    const p=player();
    for(const c of cars){c.prevS=c.s;c.prevPitch=c.pitch;}
    for(const c of cars){
      const lead=ahead(c);let a=idm(c,lead.gap,lead.v);
      // The visitor's car: anywhere just ahead and close to our line.
      c.lane.path.at(c.s,pose);const fx=Math.sin(pose.h),fz=Math.cos(pose.h),dx=p.x-pose.x,dz=p.z-pose.z,along=dx*fx+dz*fz,across=Math.abs(dx*fz-dz*fx);
      if(along>0&&along<14&&across<1.9)a=Math.min(a,idm(c,along-c.len/2-p.len/2,0));
      a=THREE.MathUtils.clamp(a,-HARD,ACCEL);c.v=Math.max(0,c.v+a*dt);c.s+=c.v*dt;c.a=a;
      for(const w of c.parts.wheels)w.rotation.x+=c.v*dt/c.parts.wheelR;
      c.pitch=damp(c.pitch,-THREE.MathUtils.clamp(a*.01,-.03,.03),7,dt);
      c.tail=damp(c.tail,a<-.8||c.v<.05?1.6:.45,10,dt);
    }
  }
  const api={
    update(dt){
      clock.advance(dt,step);const t=clock.alpha;
      for(const c of cars){c.lane.path.at(lerp(c.prevS,c.s,t),pose);c.parts.rig.position.set(pose.x,y,pose.z);c.parts.rig.rotation.y=pose.h;c.parts.car.rotation.x=lerp(c.prevPitch,c.pitch,t);c.mats.tailLight.emissiveIntensity=c.tail;c.mats.headlight.emissiveIntensity=.8;
        if(c.smoky){emit+=dt;if(emit>.22){emit=0;tmp.set(-.35,.35,-c.len/2-.05);c.parts.rig.localToWorld(tmp);const s=smoke[next];next=(next+1)%smoke.length;s.age=0;s.x=tmp.x;s.y=tmp.y;s.z=tmp.z;}}}
      smoke.forEach((s,i)=>{s.age+=dt;const k=s.age/2.6,alive=k<1;o.position.set(s.x+s.age*.12,s.y+s.age*.35,s.z);o.scale.setScalar(alive?(.4+k*1.6)*(1-k*k):1e-4);o.updateMatrix();puffs.setMatrixAt(i,o.matrix);});
      puffs.instanceMatrix.needsUpdate=true;
      return true;
    },
    obstacles(){const out=[];for(const c of cars){c.lane.path.at(c.s,pose);const r=c.parts.width/2+.05,k=Math.max(0,c.len/2-r),fx=Math.sin(pose.h),fz=Math.cos(pose.h);for(const t of [-k,0,k])out.push([pose.x+fx*t,pose.z+fz*t,r]);}return out;},
    get cars(){return cars;},
    resync(){clock.reset();},
    dispose(){for(const c of cars)disposeVehicle(c.parts,c.mats);puffs.geometry.dispose();puffMat.dispose();},
    materials:[puffMat],
  };
  api.update(0);   // cars on their lanes from the very first frame
  return api;
}
