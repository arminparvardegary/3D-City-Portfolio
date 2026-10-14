import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, tint, mergeStatic } from './geometry.js';

// A clean, low supercar in the style of the tile. The body is one smooth shell:
// a wedge nose, a narrow waist and wide hips that flare over the wheels, with the
// wheel openings cut in. A low cab forward glass canopy, a rear wing, a big front
// intake, side scoops, a finned diffuser and twin exhausts.
// Units are tile units (1 = 10 design pixels). Nose points to +z.
const LEN=4.1,WHEEL_R=.37,WHEEL_Z=1.3,TRACK=.8;

// Smooth curve through [z, value] keys (Catmull-Rom), sampled at any z.
function spline(keys){
  return z=>{
    let i=0;while(i<keys.length-2&&keys[i+1][0]<z)i++;
    const g=k=>keys[Math.max(0,Math.min(keys.length-1,k))];
    const [z1,p1]=g(i),[z2,p2]=g(i+1),p0=g(i-1)[1],p3=g(i+2)[1],t=Math.min(1,Math.max(0,(z-z1)/(z2-z1)));
    return .5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
  };
}
const TOP=spline([[-2.05,.58],[-1.98,.7],[-1.7,.75],[-1.2,.75],[-.6,.71],[0,.66],[.6,.63],[1.1,.61],[1.5,.55],[1.85,.45],[2.05,.34]]);
const BOTTOM=spline([[-2.05,.3],[-1.9,.2],[-1.4,.17],[1.4,.17],[1.9,.2],[2.05,.25]]);
const HALF=spline([[-2.05,.66],[-1.95,.86],[-1.7,.92],[-1.3,.94],[-.8,.9],[-.2,.83],[.4,.84],[1.0,.88],[1.3,.88],[1.7,.84],[1.95,.74],[2.05,.56]]);
// Extra width low on the body around each wheel: the flared arches.
const flare=z=>.05*Math.exp(-(((z-WHEEL_Z)/.5)**2))+.07*Math.exp(-(((z+WHEEL_Z)/.55)**2));

function shell(){
  const NZ=150,NA=72,e=2/3,p=[],col=[],idx=[];
  for(let i=0;i<NZ;i++){
    const z=-LEN/2+LEN*i/(NZ-1),hi=TOP(z),lo=BOTTOM(z),w=HALF(z),f=flare(z);
    for(let j=0;j<=NA;j++){
      const a=j/NA*Math.PI*2,s=Math.sin(a),c=Math.cos(a);
      const low=Math.min(1,Math.max(0,(.35-c)/.9));            // 0 at the top, 1 on the lower flank
      const half=(c>0?w*(1-.2*c*c):w)+f*low;                   // tumblehome shoulders, flared hips
      let x=Math.sign(s)*Math.abs(s)**e*half,y=(lo+hi)/2+Math.sign(c)*Math.abs(c)**e*(hi-lo)/2,shade=1;
      // Wheel openings: push the body in behind the tyre and darken it like a liner.
      for(const wz of [WHEEL_Z,-WHEEL_Z]){
        const r=Math.hypot(z-wz,y-WHEEL_R),k=1-Math.min(1,Math.max(0,(r-(WHEEL_R+.05))/.02));
        if(k>0&&Math.abs(x)>.5){x+=(Math.sign(x)*.52-x)*k;shade=Math.min(shade,1-.85*k);}
      }
      p.push(x,y,z);col.push(shade,shade,shade);
    }
  }
  for(let i=0;i<NZ-1;i++)for(let j=0;j<NA;j++){const a=i*(NA+1)+j,b=a+NA+1;idx.push(a,b,a+1,b,b+1,a+1);}
  for(const end of [0,NZ-1]){
    const c=p.length/3,z=p[end*(NA+1)*3+2];p.push(0,(TOP(z)+BOTTOM(z))/2,z);col.push(1,1,1);
    for(let j=0;j<NA;j++){const a=end*(NA+1)+j;if(end===0)idx.push(c,a,a+1);else idx.push(c,a+1,a);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(p.length/3*2),2));g.setIndex(idx);g.computeVertexNormals();return g;
}
// Low teardrop canopy: [z, halfWidth, base, top], upper half of a superellipse.
const CANOPY=[[.95,.56,.6,.62],[.7,.6,.61,.8],[.35,.6,.62,.97],[0,.58,.64,1.05],[-.35,.56,.66,1.05],[-.7,.52,.68,.97],[-1.0,.46,.7,.86],[-1.22,.36,.72,.76],[-1.3,.24,.73,.735]];
function canopy(){
  const seg=40,e=2/2.5,p=[],idx=[];
  CANOPY.forEach(([z,w,base,top])=>{for(let j=0;j<=seg;j++){const a=-Math.PI/2+j/seg*Math.PI,s=Math.sin(a),c=Math.cos(a);p.push(Math.sign(s)*Math.abs(s)**e*w,base+Math.abs(c)**e*(top-base),z);}});
  for(let i=0;i<CANOPY.length-1;i++)for(let j=0;j<seg;j++){const a=i*(seg+1)+j,b=a+seg+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return tint(g);
}
// Ray casting onto the bare shell places every detail exactly on its surface.
function surface(geometry){
  const probe=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));probe.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),o=new THREE.Vector3(),d=new THREE.Vector3();
  const cast=off=>{ray.set(o,d);const h=ray.intersectObject(probe)[0];return h?h.point.addScaledVector(d,-off):new THREE.Vector3(0,-9,0);};
  return {
    front:(x,y,off=0)=>{o.set(x,y,6);d.set(0,0,-1);return cast(off);},
    rear:(x,y,off=0)=>{o.set(x,y,-6);d.set(0,0,1);return cast(off);},
    side:(z,y,off=0,sx=1)=>{o.set(sx*3,y,z);d.set(-sx,0,0);return cast(off);},
  };
}
function strip(parent,points,radius,material){
  const o=mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius,8,false),material);o.castShadow=false;return o;
}

export function buildCar(parent,m){
  const rig=new THREE.Group();rig.name='car';rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;rig.scale.setScalar(ART.car.scale);parent.add(rig);
  // `car` is the sprung body (it pitches and rolls while driving); the wheels
  // hang off the rig so they stay planted and only spin and steer.
  const car=new THREE.Group();rig.add(car);
  const body=shell();
  mesh(car,body,m.carBody);
  mesh(car,canopy(),m.carGlass);
  const S=surface(body.clone()),nose=S.front(0,.3).z,tail=S.rear(0,.45).z;

  // Front: swept LED headlights, a big black intake, a thin splitter.
  for(const sx of [-1,1])strip(car,[[.32,.47],[.5,.5],[.66,.53],[.76,.56]].map(([x,y])=>S.front(sx*x,y,-.006)),.017,m.headlight);
  box(car,[1.1,.11,.16],[0,.29,nose-.05],m.carTrim,.05);
  for(const sx of [-1,1])box(car,[.26,.09,.14],[sx*.66,.3,S.front(sx*.66,.3).z-.05],m.carTrim,.04);
  box(car,[1.6,.03,.3],[0,.18,nose-.16],m.carTrim,.015);

  for(const sx of [-1,1]){
    // Side: black skirt between the wheels and a deep scoop in front of the rear wheel.
    box(car,[.06,.07,1.7],[S.side(0,.2,-.02,sx).x,.2,0],m.carTrim,.03);
    const sc=S.side(-.72,.46,-.02,sx);box(car,[.06,.17,.46],sc.toArray(),m.carTrim,.03,[0,0,0]);
    // Slim mirror on a short arm at the base of the canopy.
    box(car,[.1,.03,.05],[sx*.62,.72,.66],m.carTrim,.015);
    mesh(car,new THREE.SphereGeometry(1,18,12),m.carBody,[sx*.72,.75,.64],[0,0,0],[.1,.045,.075]);
  }

  // Rear: full width light bar, finned diffuser, twin exhausts and a wing on struts.
  strip(car,[-.78,-.5,-.25,0,.25,.5,.78].map(x=>S.rear(x,.62,-.006)),.016,m.tailLight);
  box(car,[1.36,.14,.22],[0,.27,tail+.08],m.carTrim,.05);
  for(const x of [-.36,0,.36])box(car,[.03,.12,.26],[x,.25,tail+.04],m.carTrim,.01);
  for(const sx of [-1,1])mesh(car,new THREE.CylinderGeometry(.055,.055,.12,16),m.rim,[sx*.2,.3,tail-.02],[Math.PI/2,0,0]);
  for(const sx of [-1,1])box(car,[.035,.22,.09],[sx*.48,.85,-1.78],m.carTrim,.015);
  box(car,[1.62,.035,.3],[0,.97,-1.8],m.carTrim,.015,[.06,0,0]);
  for(const sx of [-1,1])box(car,[.025,.12,.32],[sx*.82,.95,-1.8],m.carTrim,.01);
  mergeStatic(car);

  // Big wheels: low profile tyres, five spoke rims, red brake calipers.
  const wheels=[];
  for(const sx of [-1,1])for(const z of [-WHEEL_Z,WHEEL_Z]){
    const w=new THREE.Group();w.position.set(sx*TRACK,WHEEL_R,z);rig.add(w);
    box(w,[.03,.15,.12],[sx*.11,.08,z>0?-.12:.12],m.caliper,.02);   // calipers stay put
    const spin=new THREE.Group();w.add(spin);spin.userData.steer=w;spin.userData.front=z>0;
    mesh(spin,new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,.32,36),m.rubber,[0,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(.28,.28,.02,32),m.carTrim,[sx*.15,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.TorusGeometry(.275,.016,6,32),m.rim,[sx*.16,0,0],[0,Math.PI/2,0]);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(spin,[.022,.23,.055],[sx*.163,Math.sin(a)*.135,Math.cos(a)*.135],m.rim,.011,[Math.PI/2-a,0,0]);}
    mesh(spin,new THREE.CylinderGeometry(.055,.055,.03,16),m.rim,[sx*.168,0,0],[0,0,Math.PI/2]);
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
  for(const o of [-1.15,0,1.15]){
    const cx=x+fx*o,cz=z+fz*o,r=.95;
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
