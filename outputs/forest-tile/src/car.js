import * as THREE from 'three';
import { ART } from './config.js';
import { VEHICLES, MAX_STEER, buildVehicle, disposeVehicle } from './vehicles.js';

// You drive it. W / Up = gas, S / Down = brake then reverse, A D / Left Right =
// steer, Space = handbrake, R = back to the parking space. Simple bicycle
// model: the nose follows the front wheels, which really steer. Wheels roll
// with ground speed, the body pitches and rolls, and the lights follow what
// you do. select(i) swaps the vehicle in place.
const KEYS={KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'hand'};
// Driving feel. Units are tile units per second (1 unit = 10 design pixels).
const MAX_SPEED=12.8,MAX_REVERSE=3.6;         // four times the original top speed
const ENGINE=11.2,BRAKE=16,COAST=1.6,DRAG=.03; // accelerations (units/s²)
const GRIP=26;                                 // lateral acceleration the tyres hold before sliding
const TURN=1.55;                               // turns tighter than the wheel angle alone (the wheels stay clear of the arches)
const STEER_IN=6,STEER_OUT=9;                  // how fast the wheel turns in and returns (1/s)
// Things the car can bump into: [x, z, halfW, halfD] boxes and [x, z, r] circles.
const BOXES=[[-1.5,-.7,1.5,1.6],[-1.4,-2.71,1.2,.26]];
const CIRCLES=[[-3.78,-2.75,.4],[3.63,-3.45,.4],[-.45,2.62,.14]];
let BOUNDS={x0:-4.95,x1:4.95,z0:-4.95,z1:4.95};
let dynamicObstacles=()=>[];
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
  const place=()=>{parts.rig.position.x=x;parts.rig.position.z=z;parts.rig.rotation.y=h;};
  const api={
    press(k,on){on?down.add(k):down.delete(k);},
    reset(){x=home.x;z=home.z;h=home.h;v=0;vy=0;yaw=0;steer=0;snapshot();place();},
    get speed(){return v;},
    get index(){return current;},
    get paint(){return parts.paint;},
    get color(){return parts.color;},
    pose(){return {x,z,h,steer,v};},
    setObstacles(fn){dynamicObstacles=fn;},
    addStatic(circles){CIRCLES.push(...circles);},
    get length(){return parts.length;},
    setBounds(b){BOUNDS={x0:b.x0+.05,x1:b.x1-.05,z0:b.z0+.05,z1:b.z1-.05};},
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
  // One physics step. Arcade but honest: the engine pulls hard at low speed and
  // fades toward top speed; brakes bite strongly but ramp in over ~60 ms so
  // they never jolt. Steering eases in and centres quickly, with less lock at
  // speed. Turning follows the front wheels, but no faster than the tyres'
  // grip allows, so the car can never pivot on the spot or flick. The
  // handbrake (Space) locks the rear: grip drops, the tail steps out and the
  // car slides until you let go.
  let vy=0,brakeRamp=0,yaw=0;
  function step(dt){
    const gas=down.has('gas'),brake=down.has('brake'),hand=down.has('hand');
    // Longitudinal: engine, brakes (S brakes first, then reverses), drag.
    brakeRamp+=((brake&&v>.15||gas&&v<-.15?1:0)-brakeRamp)*(1-Math.exp(-dt*16));
    // Under power the engine eases straight onto top speed (strong pull at low speed);
    // off the pedals the car rolls down with rolling resistance and air drag.
    let acc=0;
    if(gas&&v>=-.15)acc=ENGINE*(1-Math.max(v,0)/MAX_SPEED);
    else if(brake&&v<=.15)acc=-ENGINE*.7*(1-Math.max(-v,0)/MAX_REVERSE);
    else acc=-Math.sign(v)*(COAST+DRAG*v*v);
    acc-=Math.sign(v)*BRAKE*brakeRamp;
    if(hand)acc-=Math.sign(v)*8;
    const prevV=v;v+=acc*dt;
    if(prevV!==0&&Math.sign(v)!==Math.sign(prevV)&&!(gas&&prevV<0)&&!(brake&&prevV>0))v=0;   // brakes stop, they do not reverse
    v=THREE.MathUtils.clamp(v,-MAX_REVERSE,MAX_SPEED);
    a=(v-prevV)/dt;
    // Steering: lock shrinks with speed; the wheel turns in smoothly and returns faster.
    const speed=Math.abs(v),lock=THREE.MathUtils.lerp(MAX_STEER,.26,Math.min(1,(speed/MAX_SPEED)**.7));
    const want=((down.has('left')?1:0)-(down.has('right')?1:0))*lock;
    steer+=(want-steer)*(1-Math.exp(-dt*(Math.abs(want)>Math.abs(steer)?STEER_IN:STEER_OUT)));
    // Yaw: what the wheels ask for, capped by grip, reached over a short response time.
    const grip=hand?GRIP*.35:GRIP;
    let yawWant=v/parts.wheelbase*Math.tan(steer)*TURN;
    const cap=grip/Math.max(speed,.6);yawWant=THREE.MathUtils.clamp(yawWant,-cap,cap);
    if(hand&&speed>1.2)yawWant*=1.6;                       // the tail swings round when the rear locks
    yaw+=(yawWant-yaw)*(1-Math.exp(-dt*(hand?5:12)));
    // Sideways slip: decays fast with grip, lingers while the handbrake is on.
    vy+=-yaw*v*dt*(hand?.55:.08);vy*=Math.exp(-dt*(hand?1.6:14));
    const nh=h+yaw*dt,fx=Math.sin(nh),fz=Math.cos(nh);
    const nx=x+(fx*v+fz*vy)*dt,nz=z+(fz*v-fx*vy)*dt;
    if(!blocked(nx,nz,nh)){h=nh;x=nx;z=nz;lat=yaw*v;}
    else{v*=-.15;vy=0;yaw=0;a=0;lat=0;}                    // a soft bump, not a dead stop
    rollAngle+=v*dt/parts.wheelR;
    // Body: pitches with acceleration and braking, rolls with cornering, like a soft suspension.
    const k=1-Math.exp(-dt*7);
    pitch+=(-THREE.MathUtils.clamp(a*.006,-.04,.04)-pitch)*k;
    roll+=(-THREE.MathUtils.clamp(lat*.0045,-.05,.05)-roll)*k;
    const moving=speed>.03,braking=brakeRamp>.2||hand&&moving;
    tail+=((braking?1.9:(v<-.03?1.1:.45))-tail)*(1-Math.exp(-dt*14));
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
    return Math.abs(v)>.02||Math.abs(vy)>.01||Math.abs(steer)>.001||Math.abs(pitch)>1e-4||Math.abs(roll)>1e-4||Math.abs(x-prev.x)+Math.abs(z-prev.z)>1e-6||flashing;
  };
  return api;
}
