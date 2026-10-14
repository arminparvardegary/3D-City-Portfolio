import * as THREE from 'three';
import { ART } from './config.js';
import { VEHICLES, MAX_STEER, buildVehicle, disposeVehicle } from './vehicles.js';

// You drive it. W / Up = gas, S / Down = brake then reverse, A D / Left Right =
// steer, Space = handbrake, R = back to the parking space. Simple bicycle
// model: the nose follows the front wheels, which really steer. Wheels roll
// with ground speed, the body pitches and rolls, and the lights follow what
// you do. select(i) swaps the vehicle in place.
const KEYS={KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'hand'};
const MAX_SPEED=3.2,MAX_REVERSE=1.4;
// Things the car can bump into: [x, z, halfW, halfD] boxes and [x, z, r] circles.
const BOXES=[[-1.5,-.7,1.5,1.6],[-1.4,-2.71,1.2,.26]];
const CIRCLES=[[-3.78,-2.75,.4],[3.63,-3.45,.4],[-.45,2.62,.14]];
const BOUND=4.95;
const AMBULANCE=VEHICLES.findIndex(q=>q.name==='Ambulance');

export function createCarControls(parent,m,{prep,index=0}={}){
  const home={x:ART.car.position[0],z:ART.car.position[2],h:ART.car.rotation};
  let x=home.x,z=home.z,h=home.h,v=0,steer=0,a=0,lat=0,pitch=0,head=.55,tail=.45;
  let parts=buildVehicle(index,parent,m,prep),current=index;
  // The footprint as a row of circles along the car.
  let probes=[],r=1;
  const footprint=()=>{r=parts.width/2+.05;const k=Math.max(0,parts.length/2-r*.9),n=Math.max(1,Math.ceil(k/r));probes=[];for(let i=-n;i<=n;i++)probes.push(k*i/n);};
  footprint();
  function blocked(px,pz,ph){
    const fx=Math.sin(ph),fz=Math.cos(ph);
    for(const o of probes){
      const cx=px+fx*o,cz=pz+fz*o;
      if(Math.abs(cx)>BOUND-r||Math.abs(cz)>BOUND-r)return true;
      for(const [bx,bz,hw,hd] of BOXES){const dx=cx-Math.max(bx-hw,Math.min(cx,bx+hw)),dz=cz-Math.max(bz-hd,Math.min(cz,bz+hd));if(dx*dx+dz*dz<r*r)return true;}
      for(const [qx,qz,qr] of CIRCLES)if((cx-qx)**2+(cz-qz)**2<(r+qr)**2)return true;
    }
    return false;
  }
  const down=new Set();
  m.headlight.emissive.set('#fff6e0');m.tailLight.emissive.set('#ff2a22');
  const typing=t=>t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  addEventListener('keydown',e=>{
    if(typing(e.target)||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.code==='KeyR'){api.reset();return;}
    const k=KEYS[e.code];if(!k)return;down.add(k);e.preventDefault();
  });
  addEventListener('keyup',e=>{const k=KEYS[e.code];if(k)down.delete(k);});
  addEventListener('blur',()=>down.clear());
  const place=()=>{parts.rig.position.x=x;parts.rig.position.z=z;parts.rig.rotation.y=h;};
  const api={
    press(k,on){on?down.add(k):down.delete(k);},
    reset(){x=home.x;z=home.z;h=home.h;v=0;steer=0;snapshot();place();},
    get speed(){return v;},
    get index(){return current;},
    get paint(){return parts.paint;},
    get color(){return parts.color;},
    pose(){return {x,z,h,steer,v};},
    count:VEHICLES.length,
    select(i){
      if(i===current)return;
      disposeVehicle(parts,m);parts=buildVehicle(i,parent,m,prep);current=i;footprint();
      v=0;if(blocked(x,z,h)){x=home.x;z=home.z;h=home.h;}snapshot();rollAngle=prevRoll=0;place();
    },
  };
  // Fixed timestep: the simulation always advances in 1/120 s steps, whatever the
  // display rate, so speed, steering and braking feel the same at 60 or 144 Hz.
  // The drawn car is interpolated between the last two steps, so it never stutters.
  const STEP=1/120;
  let last=null,acc=0,roll=0,prev={x,z,h,steer,roll:0},rollAngle=0,prevRoll=0;
  const snapshot=()=>{prev.x=x;prev.z=z;prev.h=h;prev.steer=steer;prevRoll=rollAngle;};
  function step(dt){
    const gas=down.has('gas'),brake=down.has('brake'),hand=down.has('hand');
    let acc=0;
    if(gas)acc=v<0?5:2.6;
    else if(brake)acc=v>.05?-5.2:-2.2;
    else acc=-Math.sign(v)*Math.min(Math.abs(v)/dt,.9);
    if(hand)acc=-Math.sign(v)*Math.min(Math.abs(v)/dt,7);
    const prevV=v;v=THREE.MathUtils.clamp(v+acc*dt,-MAX_REVERSE,MAX_SPEED);
    if(!gas&&!brake&&!hand&&Math.abs(v)<.03)v=0;
    a=(v-prevV)/dt;
    // Steering follows the keys quickly (about 70 ms), with less lock at speed.
    const target=((down.has('left')?1:0)-(down.has('right')?1:0))*THREE.MathUtils.lerp(MAX_STEER,.28,Math.min(1,Math.abs(v)/MAX_SPEED));
    steer+=(target-steer)*(1-Math.exp(-dt*14));
    const rate=v/parts.wheelbase*Math.tan(steer);
    const nh=h+rate*dt,nx=x+Math.sin(nh)*v*dt,nz=z+Math.cos(nh)*v*dt;
    if(!blocked(nx,nz,nh)){h=nh;x=nx;z=nz;lat=rate*v;}else{v=0;a=0;lat=0;}
    rollAngle+=v*dt/parts.wheelR;
    // Body pitch and roll settle like a soft suspension, independent of frame rate.
    const k=1-Math.exp(-dt*9);
    pitch+=(-THREE.MathUtils.clamp(a*.012,-.035,.035)-pitch)*k;
    roll+=(-THREE.MathUtils.clamp(lat*.006,-.04,.04)-roll)*k;
    const moving=Math.abs(v)>.02,braking=brake&&v>.05||hand&&moving||(gas&&v<-.02);
    tail+=((braking?1.9:(v<-.02?1.1:.45))-tail)*(1-Math.exp(-dt*14));
    head+=((moving?1.35:.55)-head)*(1-Math.exp(-dt*6));
  }
  // time in ms (rAF clock). Returns true while anything is moving, so the caller
  // keeps rendering and refreshes the moving shadow.
  api.update=function(time){
    const frame=last===null?0:THREE.MathUtils.clamp((time-last)/1000,0,.1);last=time;
    acc+=frame;let n=0;
    while(acc>=STEP&&n<16){snapshot();step(STEP);acc-=STEP;n++;}
    if(n===16)acc=0;                                     // after a long stall, do not spiral
    const t=acc/STEP,lerpAngle=(p,q)=>p+Math.atan2(Math.sin(q-p),Math.cos(q-p))*t;
    parts.rig.position.x=prev.x+(x-prev.x)*t;parts.rig.position.z=prev.z+(z-prev.z)*t;parts.rig.rotation.y=lerpAngle(prev.h,h);
    const s=prev.steer+(steer-prev.steer)*t,r=prevRoll+(rollAngle-prevRoll)*t;
    for(const w of parts.wheels){w.rotation.x=r;if(w.userData.front)w.userData.steer.rotation.y=s;}
    parts.car.rotation.x=pitch;parts.car.rotation.z=roll;
    m.tailLight.emissiveIntensity=tail;m.headlight.emissiveIntensity=head;
    // The ambulance light bar pulses.
    const flashing=current===AMBULANCE;
    if(flashing)m.siren.emissiveIntensity=.4+1.2*Math.max(0,Math.sin(time*.012));
    return Math.abs(v)>.02||Math.abs(steer)>.001||Math.abs(pitch)>1e-4||Math.abs(roll)>1e-4||Math.abs(x-prev.x)+Math.abs(z-prev.z)>1e-6||flashing;
  };
  return api;
}
