import * as THREE from 'three';
import { ART } from './config.js';
import { VEHICLES, MAX_STEER, buildVehicle, disposeVehicle } from './vehicles.js';
import { FEEL, STEP, damp, lerp, lerpAngle, fixedClock } from './motion.js';
import { createSkid } from './fx/skid.js';

// You drive it. W / Up = gas, S / Down = brake then reverse, A D / Left Right =
// steer, Space = handbrake, R = back to the start. Simple bicycle model: the
// nose follows the front wheels, which really steer. The body sits on springs
// (it squats, dives and leans, and bounces on hits), the lights follow what you
// do, and a handbrake drift leaves fading tyre marks and dust. All feel
// constants live in FEEL (motion.js). select(i) swaps the vehicle in place.
const KEYS={KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'hand'};
// Static solids the car cannot pass ([x,z,halfW,halfD] boxes, [x,z,r] circles); the world adds them.
const BOXES=[];
const CIRCLES=[];
let BOUNDS={x0:-4.95,x1:4.95,z0:-4.95,z1:4.95};
let dynamicObstacles=()=>[];
const AMBULANCE=VEHICLES.findIndex(q=>q.name==='Ambulance');

export function createCarControls(parent,m,{prep,index=0,home:start=null}={}){
  const home=start??{x:ART.car.position[0],z:ART.car.position[2],h:ART.car.rotation};
  const C=FEEL.car,S=FEEL.suspension;
  let x=home.x,z=home.z,h=home.h,v=0,vy=0,yaw=0,steer=0,a=0,lat=0,brakeRamp=0,head=.55,tail=.45,slide=0,rollAngle=0;
  // Sprung body: angles (rad) and heave (units), each with its own velocity.
  let pitch=0,pitchV=0,roll=0,rollV=0,heave=0,heaveV=0;
  let parts=buildVehicle(index,parent,m,prep),current=index,bodyY=parts.car.position.y;
  const skid=createSkid(parent);
  // The footprint as a row of circles along the car.
  let probes=[],r=1;
  const footprint=()=>{r=parts.width/2+.05;const k=Math.max(0,parts.length/2-r*.9),n=Math.max(1,Math.ceil(k/r));probes=[];for(let i=-n;i<=n;i++)probes.push(k*i/n);};
  footprint();
  function blocked(px,pz,ph){
    const fx=Math.sin(ph),fz=Math.cos(ph);
    for(const o of probes){
      const cx=px+fx*o,cz=pz+fz*o;
      if(cx<BOUNDS.x0+r||cx>BOUNDS.x1-r||cz<BOUNDS.z0+r||cz>BOUNDS.z1-r)return true;
      for(const [bx,bz,hw,hd] of BOXES){const dx=cx-Math.max(bx-hw,Math.min(cx,bx+hw)),dz=cz-Math.max(bz-hd,Math.min(cz,bz+hd));if(dx*dx+dz*dz<r*r)return true;}
      for(const [qx,qz,qr] of CIRCLES)if((cx-qx)**2+(cz-qz)**2<(r+qr)**2)return true;
      for(const [qx,qz,qr] of dynamicObstacles())if((cx-qx)**2+(cz-qz)**2<(r+qr)**2)return true;
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

  // Fixed timestep: the simulation always advances in 1/120 s steps, whatever the
  // display rate. The drawn car sits between the last two steps (interpolated).
  const clock=fixedClock(STEP);
  const prev={x,z,h,steer,roll:0,pitch:0,bodyRoll:0,heave:0};
  const snapshot=()=>{prev.x=x;prev.z=z;prev.h=h;prev.steer=steer;prev.roll=rollAngle;prev.pitch=pitch;prev.bodyRoll=roll;prev.heave=heave;};
  // Coming back to the tab (or any long stall) never replays the missed time.
  let last=null;
  const resync=()=>{last=null;clock.reset();snapshot();};
  document.addEventListener('visibilitychange',resync);
  const place=()=>{parts.rig.position.x=x;parts.rig.position.z=z;parts.rig.rotation.y=h;};
  place();   // at its start position from the very first frame

  // The shown pose (interpolated), for the camera: one object, reused.
  const shown={x,z,h,vx:0,vz:0,speed:0};
  const rear=[{x:0,z:0},{x:0,z:0}];
  let onHit=null;
  // A knock: the body bounces and the camera may shake (strength 0..1).
  const hit=s=>{s=Math.min(1,Math.max(0,s));if(s<.02)return;heaveV-=S.bump*30*s;pitchV+=(Math.random()-.5)*s*1.2;rollV+=(Math.random()-.5)*s*1.2;onHit?.(s);};

  const api={
    press(k,on){on?down.add(k):down.delete(k);},
    reset(){x=home.x;z=home.z;h=home.h;v=0;vy=0;yaw=0;steer=0;pitch=pitchV=roll=rollV=heave=heaveV=0;snapshot();place();},
    resync,
    // Put the car somewhere, at rest (for tests and future spawn points).
    teleport(nx,nz,nh=h){x=nx;z=nz;h=nh;v=vy=yaw=0;snapshot();place();},
    get speed(){return v;},
    get index(){return current;},
    get paint(){return parts.paint;},
    get color(){return parts.color;},
    // The simulated state (for physics and traffic).
    pose(){return {x,z,h,steer,v,vy,length:parts.length,width:parts.width};},
    // Where the car is drawn this frame (for the camera).
    get shown(){return shown;},
    // Bumping into something heavy takes some speed off (f is the share kept).
    slow(f){v*=f;},
    hit,
    set onHit(fn){onHit=fn;},
    setObstacles(fn){dynamicObstacles=fn;},
    addStatic(circles,boxes=[]){CIRCLES.push(...circles);BOXES.push(...boxes);},
    get length(){return parts.length;},
    setBounds(b){BOUNDS={x0:b.x0+.05,x1:b.x1-.05,z0:b.z0+.05,z1:b.z1-.05};},
    count:VEHICLES.length,
    select(i){
      if(i===current)return;
      disposeVehicle(parts,m);parts=buildVehicle(i,parent,m,prep);current=i;bodyY=parts.car.position.y;footprint();
      v=0;if(blocked(x,z,h)){x=home.x;z=home.z;h=home.h;}rollAngle=0;snapshot();place();
    },
  };

  // One simulation step. Arcade but honest: the engine pulls hard at low speed and
  // fades toward top speed; brakes ramp in over ~60 ms so they never jolt.
  // Steering eases in and centres quickly, with less lock at speed. Turning
  // follows the front wheels, no faster than the tyres' grip allows. The
  // handbrake (Space) locks the rear: grip drops, the tail steps out and the car
  // slides until you let go.
  function step(dt){
    const gas=down.has('gas'),brake=down.has('brake'),hand=down.has('hand');
    brakeRamp=damp(brakeRamp,brake&&v>.15||gas&&v<-.15?1:0,16,dt);
    let acc;
    if(gas&&v>=-.15)acc=C.engine*(1-Math.max(v,0)/C.maxSpeed);
    else if(brake&&v<=.15)acc=-C.engine*.7*(1-Math.max(-v,0)/C.maxReverse);
    else acc=-Math.sign(v)*(C.coast+C.drag*v*v);
    acc-=Math.sign(v)*C.brake*brakeRamp;
    if(hand)acc-=Math.sign(v)*6.5;
    const prevV=v;v+=acc*dt;
    if(prevV!==0&&Math.sign(v)!==Math.sign(prevV)&&!(gas&&prevV<0)&&!(brake&&prevV>0))v=0;   // brakes stop, they do not reverse
    v=THREE.MathUtils.clamp(v,-C.maxReverse,C.maxSpeed);
    a=(v-prevV)/dt;
    // Steering: lock shrinks with speed; the wheel turns in smoothly and returns faster.
    const speed=Math.abs(v),lock=lerp(MAX_STEER,.24,Math.min(1,(speed/C.maxSpeed)**.7));
    const want=((down.has('left')?1:0)-(down.has('right')?1:0))*lock;
    steer=damp(steer,want,Math.abs(want)>Math.abs(steer)?C.steerIn:C.steerOut,dt);
    // Yaw: what the wheels ask for, capped by grip, reached over a short response time.
    const grip=hand?C.grip*C.handGrip:C.grip;
    let yawWant=v/parts.wheelbase*Math.tan(steer);
    const cap=grip/Math.max(speed,.6);yawWant=THREE.MathUtils.clamp(yawWant,-cap,cap);
    if(hand&&speed>1.2)yawWant*=C.handSwing;                // the tail swings round when the rear locks
    yaw=damp(yaw,yawWant,hand?5:12,dt);
    // Sideways slip: decays fast with grip, lingers while the handbrake is on.
    vy+=-yaw*v*dt*(hand?.55:.08);vy=damp(vy,0,hand?1.6:14,dt);
    const nh=h+yaw*dt,fx=Math.sin(nh),fz=Math.cos(nh);
    const nx=x+(fx*v+fz*vy)*dt,nz=z+(fz*v-fx*vy)*dt;
    if(!blocked(nx,nz,nh)){h=nh;x=nx;z=nz;lat=yaw*v;}
    else{hit(Math.abs(v)/C.maxSpeed*1.4);v*=-.15;vy=0;yaw=0;a=0;lat=0;}   // a soft bump, not a dead stop
    rollAngle+=v*dt/parts.wheelR;

    // Suspension: each axis is a spring-damper pulled toward where the load puts it.
    // Gas squats the tail (nose up), braking dives the nose, corners lean out.
    const pitchGoal=THREE.MathUtils.clamp(-a*S.pitch,-S.maxPitch,S.maxPitch),rollGoal=THREE.MathUtils.clamp(-lat*S.roll,-S.maxRoll,S.maxRoll);
    pitchV+=(S.stiffness*(pitchGoal-pitch)-S.damping*pitchV)*dt;pitch+=pitchV*dt;
    rollV+=(S.stiffness*(rollGoal-roll)-S.damping*rollV)*dt;roll+=rollV*dt;
    heaveV+=(S.stiffness*1.4*(0-heave)-S.damping*1.2*heaveV)*dt;heave+=heaveV*dt;

    // Drift: how hard the rear is sliding; marks and dust come from the rear wheels.
    slide=damp(slide,Math.abs(vy)*1.2+(hand&&speed>2?speed/C.maxSpeed:0),20,dt);
    const tr=parts.track,rz=parts.rearZ,cs=Math.cos(h),sn=Math.sin(h);
    rear[0].x=x+sn*rz+cs*tr;rear[0].z=z+cs*rz-sn*tr;rear[1].x=x+sn*rz-cs*tr;rear[1].z=z+cs*rz+sn*tr;
    skid.step(dt,rear,slide,fx*v+fz*vy,fz*v-fx*vy);

    const moving=speed>.03,braking=brakeRamp>.2||hand&&moving;
    tail=damp(tail,braking?1.9:(v<-.03?1.1:.45),14,dt);
    head=damp(head,moving?1.35:.55,6,dt);
  }

  // time in ms (rAF clock). Returns true while anything is moving, so the caller
  // keeps rendering and refreshes the moving shadow.
  api.update=function(time){
    const frame=last===null?0:Math.min((time-last)/1000,.1);last=time;
    clock.advance(frame,dt=>{snapshot();step(dt);});
    const t=clock.alpha;
    shown.x=lerp(prev.x,x,t);shown.z=lerp(prev.z,z,t);shown.h=lerpAngle(prev.h,h,t);
    shown.vx=Math.sin(h)*v+Math.cos(h)*vy;shown.vz=Math.cos(h)*v-Math.sin(h)*vy;shown.speed=Math.abs(v);
    parts.rig.position.x=shown.x;parts.rig.position.z=shown.z;parts.rig.rotation.y=shown.h;
    const s=lerp(prev.steer,steer,t),wr=lerp(prev.roll,rollAngle,t);
    for(const w of parts.wheels){w.rotation.x=wr;if(w.userData.front)w.userData.steer.rotation.y=s;}
    parts.car.rotation.x=lerp(prev.pitch,pitch,t);parts.car.rotation.z=lerp(prev.bodyRoll,roll,t);parts.car.position.y=bodyY+lerp(prev.heave,heave,t);
    m.tailLight.emissiveIntensity=tail;m.headlight.emissiveIntensity=head;
    // The ambulance light bar pulses.
    const flashing=current===AMBULANCE;
    if(flashing)m.siren.emissiveIntensity=.4+1.2*Math.max(0,Math.sin(time*.012));
    const fx=skid.update(frame);
    const springs=Math.abs(pitchV)+Math.abs(rollV)+Math.abs(heaveV)>1e-4||Math.abs(pitch)+Math.abs(roll)+Math.abs(heave)>1e-4;
    return Math.abs(v)>.02||Math.abs(vy)>.01||Math.abs(steer)>.001||springs||Math.abs(x-prev.x)+Math.abs(z-prev.z)>1e-6||flashing||fx;
  };
  return api;
}
