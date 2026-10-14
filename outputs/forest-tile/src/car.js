import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, tint, mergeStatic } from './geometry.js';

// A clean sports coupe in the style of the tile: a low sculpted body with a long
// hood and a ducktail, a fastback glass cabin set back, wide wheels with red
// calipers, slim LED lamps, black splitter, skirts and diffuser.
// Units are tile units (1 = 10 design pixels). Nose points to +z.
const L=3.9,W=1.72,WHEEL_R=.34,WHEEL_Z=1.22,TRACK=.75;

// A side profile ([z, y] path) extruded across the car with soft bevelled edges.
function profile(draw,width,bevel){
  const s=new THREE.Shape();draw(s);
  const g=new THREE.ExtrudeGeometry(s,{depth:width-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel*.9,bevelSegments:6,curveSegments:16});
  return tint(g.rotateY(-Math.PI/2).translate(width/2-bevel,0,0));
}
const bodyShape=s=>{
  s.moveTo(1.86,.27);                                   // under the nose
  s.quadraticCurveTo(1.98,.29,1.97,.44);                // rounded nose
  s.quadraticCurveTo(1.95,.55,1.72,.58);                // nose top
  s.lineTo(.62,.71);                                    // long hood to the cowl
  s.lineTo(-1.5,.77);                                   // belt line
  s.quadraticCurveTo(-1.86,.79,-1.9,.8);                // ducktail lip
  s.lineTo(-1.95,.62);                                  // tail
  s.quadraticCurveTo(-1.97,.34,-1.82,.28);              // rear bumper
  s.closePath();
};
const cabinShape=s=>{
  s.moveTo(.62,.66);
  s.quadraticCurveTo(.2,.98,-.12,1.07);                 // raked windscreen into the roof
  s.quadraticCurveTo(-.4,1.11,-.68,1.04);               // roof
  s.quadraticCurveTo(-1.2,.9,-1.62,.72);                // fastback
  s.closePath();
};

// Ray casting onto the bare body places every detail exactly on its surface.
function surface(geometry){
  const probe=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));probe.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),o=new THREE.Vector3(),d=new THREE.Vector3();
  const cast=off=>{ray.set(o,d);const h=ray.intersectObject(probe)[0];return h?h.point.addScaledVector(d,-off).toArray():[0,-9,0];};
  return {
    front:(x,y,off=0)=>{o.set(x,y,6);d.set(0,0,-1);return cast(off);},
    rear:(x,y,off=0)=>{o.set(x,y,-6);d.set(0,0,1);return cast(off);},
    side:(z,y,off=0,sx=1)=>{o.set(sx*3,y,z);d.set(-sx,0,0);return cast(off);},
    top:(x,z,off=0)=>{o.set(x,6,z);d.set(0,-1,0);return cast(off);},
  };
}

export function buildCar(parent,m){
  const rig=new THREE.Group();rig.name='car';rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;rig.scale.setScalar(ART.car.scale);parent.add(rig);
  // `car` is the sprung body (it pitches and rolls while driving); the wheels
  // hang off the rig so they stay planted and only spin and steer.
  const car=new THREE.Group();rig.add(car);

  const bodyGeo=profile(bodyShape,W,.12);
  mesh(car,bodyGeo,m.carBody);
  mesh(car,profile(cabinShape,1.34,.1),m.carGlass);
  const S=surface(bodyGeo.clone());
  const nose=S.front(0,.4)[2],tail=S.rear(0,.5)[2];
  // Black splitter, side skirts, diffuser and a low wide intake.
  box(car,[W-.12,.05,.3],[0,.25,nose-.12],m.carTrim,.025);
  box(car,[.92,.08,.06],S.front(0,.38,-.02),m.carTrim,.03);
  for(const sx of [-1,1])box(car,[.06,.09,2.0],[S.side(0,.33,-.025,sx)[0],.3,0],m.carTrim,.035);
  box(car,[W-.2,.11,.24],[0,.3,tail+.1],m.carTrim,.045);
  for(const sx of [-1,1]){
    // Slim LED headlights swept into the corners of the nose.
    const hl=S.front(sx*.55,.53,-.012);box(car,[.42,.05,.06],hl,m.headlight,.02,[0,sx*.4,0]);
    // Side air intake ahead of the rear wheel.
    box(car,[.05,.11,.32],S.side(-.6,.5,-.015,sx),m.carTrim,.03);
    // Small mirrors at the base of the windscreen.
    box(car,[.15,.065,.11],[sx*.74,S.top(sx*.74,.5)[1]+.05,.5],m.carBody,.03);
    // Wheel arches: a dark half disc on the body side above each wheel.
    for(const z of [-WHEEL_Z,WHEEL_Z]){
      const arch=mesh(car,tint(new THREE.CircleGeometry(WHEEL_R+.06,28,0,Math.PI)),m.carTrim,[S.side(z,.5,-.004,sx)[0],WHEEL_R,z],[0,sx*Math.PI/2,0]);
      arch.castShadow=false;
    }
  }
  // Full width red light bar under the ducktail.
  box(car,[W-.36,.04,.05],S.rear(0,.68,-.012),m.tailLight,.018);
  mergeStatic(car);

  // Wide wheels: low profile tyres, silver five spoke rims, red brake calipers.
  const wheels=[];
  for(const sx of [-1,1])for(const z of [-WHEEL_Z,WHEEL_Z]){
    const w=new THREE.Group();w.position.set(sx*TRACK,WHEEL_R,z);rig.add(w);
    // The caliper does not spin with the wheel.
    box(w,[.03,.14,.1],[sx*.1,.06,z>0?-.1:.1],m.caliper,.02);
    const spin=new THREE.Group();w.add(spin);spin.userData.steer=w;spin.userData.front=z>0;
    mesh(spin,new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,.3,32),m.rubber,[0,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(.245,.245,.02,28),m.carTrim,[sx*.142,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.TorusGeometry(.24,.016,6,28),m.rim,[sx*.152,0,0],[0,Math.PI/2,0]);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(spin,[.02,.2,.05],[sx*.155,Math.sin(a)*.12,Math.cos(a)*.12],m.rim,.01,[Math.PI/2-a,0,0]);}
    mesh(spin,new THREE.CylinderGeometry(.05,.05,.03,16),m.rim,[sx*.16,0,0],[0,0,Math.PI/2]);
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
  for(const o of [-1.1,0,1.1]){
    const cx=x+fx*o,cz=z+fz*o,r=.88;
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
