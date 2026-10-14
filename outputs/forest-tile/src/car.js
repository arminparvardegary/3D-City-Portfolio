import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, tint, mergeStatic } from './geometry.js';

// A clean little car in the style of the tile: one soft painted body, a tinted
// glass cabin under a painted roof, dark bumpers and wheel arches, simple lamps.
// Units are tile units (1 = 10 design pixels). Nose points to +z.
const L=3.6,W=1.6,WHEEL_R=.3,WHEEL_Z=1.15,TRACK=.7;

// Side profile of the cabin, extruded across the car with soft bevelled edges.
function cabinGeometry(width){
  const s=new THREE.Shape();
  s.moveTo(.74,.76);s.lineTo(.2,1.22);s.quadraticCurveTo(.12,1.29,0,1.29);
  s.lineTo(-.72,1.29);s.quadraticCurveTo(-.84,1.29,-.92,1.21);s.lineTo(-1.3,.76);s.closePath();
  const bevel=.05,g=new THREE.ExtrudeGeometry(s,{depth:width-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:4,curveSegments:10});
  return tint(g.rotateY(-Math.PI/2).translate(width/2-bevel,0,0));
}
// A slanted pillar from a to b ([z, y]) on both sides.
function pillar(parent,a,b,m){
  const dz=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dz,dy);
  for(const sx of [-1,1])box(parent,[.07,len,.09],[sx*.715,(a[1]+b[1])/2,(a[0]+b[0])/2],m.carBody,.03,[Math.atan2(dz,dy),0,0]);
}

export function buildCar(parent,m){
  const rig=new THREE.Group();rig.name='car';rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;rig.scale.setScalar(ART.car.scale);parent.add(rig);
  // `car` is the sprung body (it pitches and rolls while driving); the wheels
  // hang off the rig so they stay planted and only spin and steer.
  const car=new THREE.Group();rig.add(car);

  box(car,[W,.58,L],[0,.5,0],m.carBody,.2);                        // body
  mesh(car,cabinGeometry(1.4),m.carGlass);                           // glass cabin
  box(car,[1.46,.07,.94],[0,1.345,-.36],m.carBody,.034);             // painted roof
  box(car,[1.48,.58,.1],[0,1.05,-.36],m.carBody,.03);                // B pillar
  pillar(car,[.74,.78],[.16,1.26],m);                                 // A pillars
  pillar(car,[-1.3,.78],[-.86,1.24],m);                               // C pillars
  // Dark bumpers and sills ground the body; slim lamps and a grille slot.
  for(const sz of [-1,1])box(car,[W+.03,.18,.2],[0,.32,sz*(L/2-.06)],m.carTrim,.08);
  box(car,[W+.02,.1,L-.6],[0,.25,0],m.carTrim,.05);
  box(car,[.62,.07,.03],[0,.5,L/2+.005],m.carTrim,.03);
  for(const sx of [-1,1]){
    box(car,[.34,.1,.04],[sx*.5,.64,L/2+.003],m.headlight,.04);
    box(car,[.36,.09,.04],[sx*.5,.66,-L/2-.003],m.tailLight,.04);
    box(car,[.14,.08,.11],[sx*.83,.86,.52],m.carBody,.035);           // mirrors
    // Wheel arches: a dark half disc on the body side above each wheel.
    for(const sz of [-1,1]){
      const arch=mesh(car,tint(new THREE.CircleGeometry(WHEEL_R+.07,24,0,Math.PI)),m.carTrim,[sx*(W/2+.003),WHEEL_R,sz*WHEEL_Z],[0,sx*Math.PI/2,0]);
      arch.castShadow=false;
    }
  }
  mergeStatic(car);

  // Wheels: tyre, a light rim with a dark hub. Front wheels steer.
  const wheels=[];
  for(const sx of [-1,1])for(const z of [-WHEEL_Z,WHEEL_Z]){
    const w=new THREE.Group();w.position.set(sx*TRACK,WHEEL_R,z);rig.add(w);
    const spin=new THREE.Group();w.add(spin);spin.userData.steer=w;spin.userData.front=z>0;
    mesh(spin,new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,.26,28),m.rubber,[0,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(.17,.17,.02,24),m.rim,[sx*.13,0,0],[0,0,Math.PI/2]);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(spin,[.012,.05,.03],[sx*.142,Math.sin(a)*.1,Math.cos(a)*.1],m.carTrim,.006,[a,0,0]);}
    mesh(spin,new THREE.CylinderGeometry(.045,.045,.024,14),m.carTrim,[sx*.142,0,0],[0,0,Math.PI/2]);
    wheels.push(spin);
  }
  return {rig,car,wheels};
}

// You drive it. W / Up = gas, S / Down = brake then reverse, A D / Left Right =
// steer, Space = handbrake, R = back to the parking space. Simple bicycle
// model: the nose follows the front wheels, which really steer. Wheels roll
// with ground speed, the body pitches and rolls, and the lights follow what
// you do.
const KEYS={KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'hand'};
const WHEELBASE=WHEEL_Z*2,MAX_SPEED=3.2,MAX_REVERSE=1.4;
// Things the car can bump into: [x, z, halfW, halfD] boxes and [x, z, r] circles.
const BOXES=[[-1.5,-.7,1.5,1.6],[-1.4,-2.71,1.2,.26]];
const CIRCLES=[[-3.78,-2.75,.4],[3.63,-3.45,.4],[-.45,2.62,.14]];
const BOUND=4.95;
function blocked(x,z,h){
  const fx=Math.sin(h),fz=Math.cos(h);
  for(const o of [-1.05,0,1.05]){
    const cx=x+fx*o,cz=z+fz*o,r=.82;
    if(Math.abs(cx)>BOUND-r||Math.abs(cz)>BOUND-r)return true;
    for(const [bx,bz,hw,hd] of BOXES){
      const dx=cx-Math.max(bx-hw,Math.min(cx,bx+hw)),dz=cz-Math.max(bz-hd,Math.min(cz,bz+hd));
      if(dx*dx+dz*dz<r*r)return true;
    }
    for(const [qx,qz,qr] of CIRCLES)if((cx-qx)**2+(cz-qz)**2<(r+qr)**2)return true;
  }
  return false;
}

export function createCarControls({rig,car,wheels},m,{radius=WHEEL_R}={}){
  const home={x:rig.position.x,z:rig.position.z,h:ART.car.rotation};
  let x=home.x,z=home.z,h=home.h,v=0,steer=0,a=0,lat=0;
  const down=new Set();
  m.headlight.emissive.set('#fff6e0');m.tailLight.emissive.set('#ff2a22');
  const typing=t=>t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  addEventListener('keydown',e=>{
    if(typing(e.target)||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.code==='KeyR'){x=home.x;z=home.z;h=home.h;v=0;steer=0;return;}
    const k=KEYS[e.code];if(!k)return;down.add(k);e.preventDefault();
  });
  addEventListener('keyup',e=>{const k=KEYS[e.code];if(k)down.delete(k);});
  addEventListener('blur',()=>down.clear());
  const api={
    press(k,on){on?down.add(k):down.delete(k);},
    reset(){x=home.x;z=home.z;h=home.h;v=0;steer=0;},
    get speed(){return v;},
    pose(){return {x,z,h,steer,v};},
  };
  let last=null;
  // time in ms. Returns true while anything is moving so the caller can keep
  // rendering and refresh the moving shadow.
  api.update=function(time){
    const dt=Math.min(.05,last===null?0:(time-last)/1000);last=time;
    const gas=down.has('gas'),brake=down.has('brake'),hand=down.has('hand');
    // Throttle and brake. S brakes while rolling forward, then goes into reverse.
    let acc=0;
    if(gas)acc=v<0?5:2.6;
    else if(brake)acc=v>.05?-5.2:-2.2;
    else acc=dt>0?-Math.sign(v)*Math.min(Math.abs(v)/dt,.9):0;
    if(hand)acc=-Math.sign(v)*Math.min(Math.abs(v)/Math.max(dt,.001),7);
    const prev=v;v=THREE.MathUtils.clamp(v+acc*dt,-MAX_REVERSE,MAX_SPEED);
    if(!gas&&!brake&&!hand&&Math.abs(v)<.03)v=0;
    a=dt?(v-prev)/dt:0;
    // Steering eases toward the key, tighter at low speed.
    const target=((down.has('left')?1:0)-(down.has('right')?1:0))*THREE.MathUtils.lerp(.62,.28,Math.min(1,Math.abs(v)/MAX_SPEED));
    steer+=(target-steer)*Math.min(1,dt*7);
    const rate=v/WHEELBASE*Math.tan(steer);
    const nh=h+rate*dt,nx=x+Math.sin(nh)*v*dt,nz=z+Math.cos(nh)*v*dt;
    if(!blocked(nx,nz,nh)){h=nh;x=nx;z=nz;lat=rate*v;}
    else{v=0;a=0;lat=0;}
    rig.position.x=x;rig.position.z=z;rig.rotation.y=h;
    for(const w of wheels){w.rotation.x+=v*dt/radius;if(w.userData.front)w.userData.steer.rotation.y=steer;}
    const moving=Math.abs(v)>.02;
    car.rotation.x=-THREE.MathUtils.clamp(a*.012,-.035,.035);
    car.rotation.z=-THREE.MathUtils.clamp(lat*.006,-.04,.04);
    car.position.y=moving?Math.sin(time*.04)*.0012*Math.min(1,Math.abs(v)):0;
    const braking=brake&&v>.05||hand&&moving||(down.has('gas')&&v<-.02);
    m.tailLight.emissiveIntensity=braking?1.9:(v<-.02?1.1:.45);
    m.headlight.emissiveIntensity=moving?1.35:.55;
    return moving||Math.abs(steer)>.01;
  };
  return api;
}
