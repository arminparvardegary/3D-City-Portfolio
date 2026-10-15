import * as THREE from 'three';
import { contactShadow } from './nyc/drive/carfamily.js';
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
// Space: handbrake (rear wheels lock). Command: front brake (front wheels lock, the tyres smoke).
const KEYS={KeyW:'gas',ArrowUp:'gas',KeyS:'brake',ArrowDown:'brake',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'hand',MetaLeft:'front',MetaRight:'front'};
// Static solids the car cannot pass ([x,z,halfW,halfD] boxes, [x,z,r] circles); the world adds them.
const BOXES=[];
const CIRCLES=[];
let BOUNDS={x0:-4.95,x1:4.95,z0:-4.95,z1:4.95};
let dynamicObstacles=()=>[],dynamicBoxes=()=>[];
// The tyres sit 2.5 cm into the road (a loaded tyre flattens), so the car never floats.
const SEAT=.028;
// A soft contact shadow under the car, riding with it.
function addContact(parts){const m=new THREE.Mesh(new THREE.PlaneGeometry(parts.width*1.25,parts.length*1.1).rotateX(-Math.PI/2),
  new THREE.MeshBasicMaterial({map:contactShadow(),transparent:true,depthWrite:false,color:'#000000',polygonOffset:true,polygonOffsetFactor:-2}));
  m.position.y=SEAT+.035;m.renderOrder=1;parts.rig.add(m);}
// Road height under a point (null where there is no road), for bridges and ramps.
let surface=null;
let AMBULANCE=-1;   // the siren flashes only on the built-in ambulance (set when the controls are made)

export function createCarControls(parent,m,{prep,index=0,home:start=null}={}){
  AMBULANCE=VEHICLES.findIndex(q=>q.name==='Ambulance'&&!q.model);
  const home=start??{x:ART.car.position[0],z:ART.car.position[2],h:ART.car.rotation};
  // This car's own feel: Armin's tuned feel scaled by the vehicle's profile
  // (speed, power, brakes, grip, steering, weight on its springs).
  const C={...FEEL.car},S={...FEEL.suspension};
  const tune=i=>{const d=VEHICLES[i]?.drive;Object.assign(C,FEEL.car);Object.assign(S,FEEL.suspension);if(!d)return;
    C.maxSpeed*=d.speed;C.maxReverse*=Math.min(1,d.speed+.1);C.engine*=d.power;C.brake*=d.brake;C.grip*=d.grip;C.steerIn*=d.steer;C.steerOut*=d.steer;C.handSwing*=d.swing;
    C.coast*=Math.min(1.3,Math.max(.7,1350/d.mass*1.0+.3));
    const heavy=Math.min(1,Math.max(0,(d.mass-1350)/12000));S.stiffness*=1-heavy*.45;S.damping*=1-heavy*.25;S.pitch*=1+heavy*.6;S.roll*=1+heavy*.5;};
  tune(index);
  let lastTy=null,stepEase=0,cy=0,x=home.x,z=home.z,h=home.h,v=0,vy=0,yaw=0,steer=0,a=0,lat=0,brakeRamp=0,head=.55,tail=.45,slide=0,rollAngle=0;
  // Sprung body: angles (rad) and heave (units), each with its own velocity.
  let pitch=0,pitchV=0,roll=0,rollV=0,heave=0,heaveV=0;
  let parts=buildVehicle(index,parent,m,prep);addContact(parts);let current=index,bodyY=parts.car.position.y,rigY=parts.rig.position.y-SEAT;parts.rig.rotation.order='YXZ';
  const skid=createSkid(parent),smoke=createSkid(parent,{color:'#e4e1f0',size:2.1,rate:36,opacity:.42,life:2.2,rise:.9}),frontW=[{x:0,z:0},{x:0,z:0}];
  // The collision shape is the body itself: a box as wide as the body sides
  // (mirrors left out) from the real front to the real back, turning with the
  // car. probes are points along its centre line for the road checks.
  let probes=[],r=1,hl=2,hw=.8,oz=0;
  const footprint=()=>{const b=parts.body??{hw:parts.width/2*.88,z0:-parts.length/2,z1:parts.length/2};
    hw=b.hw;hl=(b.z1-b.z0)/2;oz=(b.z1+b.z0)/2;r=hw;const n=Math.max(1,Math.ceil(hl/.45));probes=[];for(let i=-n;i<=n;i++)probes.push(oz+hl*i/n);};
  footprint();
  // A pose is impossible where there is no road under the car (water, off the
  // edge) or the road steps more than a curb from where the car is. On a slope,
  // points further along a long vehicle may sit higher or lower (up to 1 in 4).
  function impossible(px,pz,ph){
    const fx=Math.sin(ph),fz=Math.cos(ph),sx=fz,sz=-fx;
    for(const o of probes){const cx=px+fx*o,cz=pz+fz*o;
      if(surface){const sy=surface(cx,cz,cy+Math.abs(o)*.25);if(sy===null||Math.abs(sy-cy)>.9+Math.abs(o)*.25)return true;}
      if(cx<BOUNDS.x0+r||cx>BOUNDS.x1-r||cz<BOUNDS.z0+r||cz>BOUNDS.z1-r)return true;}
    // All four corners need ground (or deck) under them too.
    if(surface)for(const a of [-1,1])for(const c of [-1,1]){const ox=px+fx*(oz+a*(hl-.02))+sx*c*(hw-.02),oz2=pz+fz*(oz+a*(hl-.02))+sz*c*(hw-.02);if(surface(ox,oz2,cy)===null)return true;}
    return false;
  }
  // How deep the body box sits inside things at a pose (0 when clear): exact
  // overlaps (separating axes) with boxes and other cars, closest point for posts.
  const sep=(dx,dz,ax,az,ra,rb)=>ra+rb-Math.abs(dx*ax+dz*az);
  // Only what is near the car is checked: gathered once per physics step (a car
  // moves at most a few centimetres a step), so the many checks of a step stay cheap.
  let nearBoxes=[],nearCircles=[],nearCars=[],nearDyn=[];
  function gather(){const R=hl+hw+4,cx=x,cz=z;
    nearBoxes=BOXES.filter(b=>Math.abs(b[0]-cx)<R+b[2]&&Math.abs(b[1]-cz)<R+b[3]);
    nearCircles=CIRCLES.filter(q=>Math.abs(q[0]-cx)<R+q[2]&&Math.abs(q[1]-cz)<R+q[2]);
    nearCars=dynamicBoxes().filter(q=>Math.abs(q[0]-cx)<R+q[3]+q[4]&&Math.abs(q[1]-cz)<R+q[3]+q[4]).map(q=>q.slice());
    nearDyn=nearCars.length?[]:dynamicObstacles().filter(q=>Math.abs(q[0]-cx)<R+q[2]&&Math.abs(q[1]-cz)<R+q[2]).map(q=>q.slice());}
  function depth(px,pz,ph,why=null){
    const fx=Math.sin(ph),fz=Math.cos(ph),sx=fz,sz=-fx,cx=px+fx*oz,cz=pz+fz*oz;let d=0;
    // A box with a height (5th value) only counts on its level (a bridge passes over it).
    for(const [bx,bz,bhw,bhd,bt] of nearBoxes){if(bt!==undefined&&cy>bt+.5)continue;
      const dx=bx-cx,dz=bz-cz;if(Math.abs(dx)>bhw+hl+hw||Math.abs(dz)>bhd+hl+hw)continue;
      const o1=sep(dx,dz,1,0,hl*Math.abs(fx)+hw*Math.abs(sx),bhw),o2=sep(dx,dz,0,1,hl*Math.abs(fz)+hw*Math.abs(sz),bhd),
        o3=sep(dx,dz,fx,fz,hl,bhw*Math.abs(fx)+bhd*Math.abs(fz)),o4=sep(dx,dz,sx,sz,hw,bhw*Math.abs(sx)+bhd*Math.abs(sz));
      const m=Math.min(o1,o2,o3,o4);if(m>0){d+=m;why?.push(['box',bx,bz,bhw,bhd,bt,m]);}}
    const circle=(qx,qz,qr)=>{const dx=qx-cx,dz=qz-cz,lf=dx*fx+dz*fz,ls=dx*sx+dz*sz;if(Math.abs(lf)>hl+qr||Math.abs(ls)>hw+qr)return 0;
      const ef=Math.max(Math.abs(lf)-hl,0),es=Math.max(Math.abs(ls)-hw,0);
      if(ef===0&&es===0)return qr+Math.min(hl-Math.abs(lf),hw-Math.abs(ls));const dist=Math.hypot(ef,es);return dist<qr?qr-dist:0;};
    for(const [qx,qz,qr] of nearCircles){const m=circle(qx,qz,qr);if(m>0){d+=m;why?.push(['post',qx,qz,qr,m]);}}
    // Other cars: their bodies as boxes (with their height, so the bridge and the street below never meet).
    if(nearCars.length)for(const [qx,qz,qh,qhl,qhw,qy] of nearCars){if(Math.abs(qy-cy)>=2)continue;const dx=qx-cx,dz=qz-cz;if(dx*dx+dz*dz>(hl+hw+qhl+qhw)**2)continue;
      const gx=Math.sin(qh),gz=Math.cos(qh),tx=gz,tz=-gx,rb=(ax,az)=>qhl*Math.abs(gx*ax+gz*az)+qhw*Math.abs(tx*ax+tz*az),ra=(ax,az)=>hl*Math.abs(fx*ax+fz*az)+hw*Math.abs(sx*ax+sz*az);
      const m=Math.min(sep(dx,dz,fx,fz,ra(fx,fz),rb(fx,fz)),sep(dx,dz,sx,sz,ra(sx,sz),rb(sx,sz)),sep(dx,dz,gx,gz,ra(gx,gz),rb(gx,gz)),sep(dx,dz,tx,tz,ra(tx,tz),rb(tx,tz)));if(m>0)d+=m;}
    else for(const [qx,qz,qr,qy] of nearDyn){if(qy!==undefined&&Math.abs(qy-cy)>=2)continue;d+=circle(qx,qz,qr);}
    return d;
  }
  // The road a round tyre rests on: wherever the road height changes under the
  // tyre (a curb edge), the edge is found exactly (bisection) and the tyre sits
  // on it, lowered by the tyre's curve there; so a wheel at a curb edge rests
  // on the edge, never in it.
  function tyreGround(wx,wz,r0,y){const fx=Math.sin(h),fz=Math.cos(h),g=k=>surface(wx+fx*k*r0,wz+fz*k*r0,y),lift=(gk,k)=>gk+Math.sqrt(Math.max(0,1-k*k))*r0-r0;
    const K=[-1,-.75,-.5,-.25,0,.25,.5,.75,1],G=K.map(g);let best=null;
    for(let i=0;i<K.length;i++){if(G[i]===null)continue;const e=lift(G[i],K[i]);if(best===null||e>best)best=e;
      if(i&&G[i-1]!==null&&Math.abs(G[i]-G[i-1])>1e-4){let a=K[i-1],b=K[i];const ga=G[i-1];for(let n=0;n<10;n++){const m=(a+b)/2;if(Math.abs((g(m)??ga)-ga)<1e-4)a=m;else b=m;}
        const hi=Math.max(G[i],G[i-1]),edge=G[i]>G[i-1]?b:a,e2=lift(hi,edge);if(e2>best)best=e2;}}
    return best;}
  // Where the car stands: the road under its wheels sets its height, pitch and bank.
  function stand(){
      // Follow the road height; tilt with the slope between the front and back of the car.
      // The car stands on its axles: the road height under the front and rear
      // wheels sets the pitch and the height at the car's origin, so on a ramp or
      // a crest both axles touch the road and neither sinks in.
      // All four wheels: pitch from front against rear, bank from left against
      // right, so a wheel over a curb lifts its side instead of sinking in.
      const fx2=Math.sin(h),fz2=Math.cos(h),sx2=fz2,sz2=-fx2,fa=(parts.rearZ??-parts.length*.3)+(parts.wheelbase??parts.length*.6),ra=parts.rearMost??parts.rearZ??-parts.length*.3,   // stands on its outermost axles
        tr=parts.track??parts.width*.4;
      const at=(o,sd)=>surface(x+fx2*o+sx2*sd*tr,z+fz2*o+sz2*sd*tr,cy),FL=at(fa,1),FR=at(fa,-1),RL=at(ra,1),RR=at(ra,-1);
      if(FL!==null&&FR!==null&&RL!==null&&RR!==null){const fy=(FL+FR)/2,by=(RL+RR)/2;slope=Math.atan2(fy-by,fa-ra);bank=Math.atan2((FL+RL)/2-(FR+RR)/2,2*tr);return by+(fy-by)*(0-ra)/(fa-ra);}
      bank=0;return surface(x,z,cy)??cy;
  }
  // A move is refused if any point along it goes deeper into something than the
  // car already is (sliding along or turning while touching is fine). Checking
  // the path in steps of 3 cm, not just the end, means nothing thin (a railing
  // is 12 cm) can be jumped through between two physics steps.
  function blocked(px,pz,ph){
    if(impossible(px,pz,ph))return true;
    const d0=depth(x,z,h)+1e-4,dh=Math.atan2(Math.sin(ph-h),Math.cos(ph-h)),n=Math.max(1,Math.ceil((Math.hypot(px-x,pz-z)+Math.abs(dh)*(hl+hw))/.03));
    for(let k=1;k<=n;k++){const f=k/n;if(depth(x+(px-x)*f,z+(pz-z)*f,h+dh*f)>d0)return true;}
    return false;
  }
  const down=new Set();let locked=false;
  m.headlight.emissive.set('#fff6e0');m.tailLight.emissive.set('#ff2a22');
  const typing=t=>t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  addEventListener('keydown',e=>{
    if(locked||typing(e.target)||e.ctrlKey||e.altKey)return;
    // With Command held only driving keys count (Command plus a letter stays the browser's).
    if(e.metaKey&&!/^(Meta|Arrow|Space)/.test(e.code))return;
    if(e.code==='KeyR'){api.reset();return;}
    const k=KEYS[e.code];if(!k)return;down.add(k);e.preventDefault();
  });
  // macOS sends no keyup for keys let go while Command is down: releasing Command clears them.
  addEventListener('keyup',e=>{const k=KEYS[e.code];if(k)down.delete(k);if(k==='front')down.clear();});
  addEventListener('blur',()=>down.clear());

  // Fixed timestep: the simulation always advances in 1/120 s steps, whatever the
  // display rate. The drawn car sits between the last two steps (interpolated).
  const clock=fixedClock(STEP);
  const wv=new THREE.Vector3();
  const prev={x,z,h,steer,roll:0,pitch:0,bodyRoll:0,heave:0,y:0,slope:0,bank:0};let slope=0,bank=0;
  const snapshot=()=>{prev.x=x;prev.z=z;prev.h=h;prev.steer=steer;prev.roll=rollAngle;prev.pitch=pitch;prev.bodyRoll=roll;prev.heave=heave;prev.y=cy;prev.slope=slope;prev.bank=bank;};
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
    press(k,on){if(locked)return;on?down.add(k):down.delete(k);},
    // While locked (the experience story), keys do not drive the car.
    lock(on){locked=on;down.clear();},
    reset(){x=home.x;z=home.z;h=home.h;v=0;vy=0;yaw=0;steer=0;pitch=pitchV=roll=rollV=heave=heaveV=0;snapshot();place();},
    resync,
    // Put the car somewhere, at rest (for tests and future spawn points).
    teleport(nx,nz,nh=h,ny=0){x=nx;z=nz;h=nh;v=vy=yaw=0;cy=surface?.(x,z,ny)??0;if(surface)cy=stand();lastTy=null;stepEase=0;snapshot();place();},
    get speed(){return v;},
    // For the sound: pedal (1 gas, -1 brake, 0 none) and how hard the tyres slide.
    get throttle(){return down.has('gas')?1:down.has('brake')?-1:0;},
    get slide(){return slide;},
    get index(){return current;},
    get paint(){return parts.paint;},
    get rig(){return parts.rig;},
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
    setVehicleBoxes(fn){dynamicBoxes=fn;},
    // dev: why a pose is refused (collision debugging)
    probe(px=x,pz=z,ph=h){gather();const why=[];return {impossible:impossible(px,pz,ph),depth:depth(px,pz,ph,why),why,here:depth(x,z,h),cy,hl,hw,oz};},
    // fn(x, z) -> road height there, or null where the car cannot be.
    setSurface(fn){surface=fn;cy=fn(x,z,0)??0;snapshot();},
    addStatic(circles,boxes=[]){CIRCLES.push(...circles);BOXES.push(...boxes);},
    get length(){return parts.length;},
    setBounds(b){BOUNDS={x0:b.x0+.05,x1:b.x1-.05,z0:b.z0+.05,z1:b.z1-.05};},
    count:VEHICLES.length,
    get spec(){return C;},
    get vehicle(){return VEHICLES[current];},
    select(i){
      if(i===current)return;
      tune(i);
      disposeVehicle(parts,m);parts=buildVehicle(i,parent,m,prep);addContact(parts);current=i;bodyY=parts.car.position.y;rigY=parts.rig.position.y-SEAT;parts.rig.rotation.order='YXZ';footprint();if(surface){cy=stand();lastTy=null;stepEase=0;}
      v=0;gather();if(blocked(x,z,h)){x=home.x;z=home.z;h=home.h;}rollAngle=0;snapshot();place();
    },
  };

  // One simulation step. Arcade but honest: the engine pulls hard at low speed and
  // fades toward top speed; brakes ramp in over ~60 ms so they never jolt.
  // Steering eases in and centres quickly, with less lock at speed. Turning
  // follows the front wheels, no faster than the tyres' grip allows. The
  // handbrake (Space) locks the rear: grip drops, the tail steps out and the car
  // slides until you let go.
  function step(dt){
    const x0=x,z0=z;gather();   // to roll the wheels by the distance really travelled
    const gas=down.has('gas'),brake=down.has('brake'),hand=down.has('hand'),front=down.has('front');
    const held=(hand||front)&&Math.abs(v)<.6;   // a locked axle holds the car: the engine cannot push it
    brakeRamp=damp(brakeRamp,brake&&v>.15||gas&&v<-.15?1:0,16,dt);
    let acc;
    if(held){v=0;acc=0;}
    else if(gas&&v>=-.15&&!hand)acc=C.engine*(1-Math.max(v,0)/C.maxSpeed);
    else if(brake&&v<=.15)acc=-C.engine*.7*(1-Math.max(-v,0)/C.maxReverse);
    else acc=-Math.sign(v)*(C.coast+C.drag*v*v);
    acc-=Math.sign(v)*C.brake*brakeRamp;
    if(hand&&!held)acc-=Math.sign(v)*6.5;
    if(front&&!held)acc-=Math.sign(v)*C.brake*.75;   // front brake: a hard stop with the tyres locked
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
    if(front&&speed>1.5)yawWant*=.3;                        // locked fronts barely steer
    yaw=damp(yaw,yawWant,hand?5:9,dt);   // turns build up smoothly
    // Sideways slip: decays fast with grip, lingers while the handbrake is on.
    vy+=-yaw*v*dt*(hand?.55:.08);vy=damp(vy,0,hand?1.6:14,dt);
    const nh=h+yaw*dt,fx=Math.sin(nh),fz=Math.cos(nh);
    const nx=x+(fx*v+fz*vy)*dt,nz=z+(fz*v-fx*vy)*dt;
    // Collisions: the car never stops dead and never gets stuck. Try the full move;
    // if something is in the way, slide along it (keep the part of the move that is
    // free); if it cannot slide, it can still turn on the spot. A hard knock bounces
    // it back a little; gentle contact just takes the speed off.
    let moved=false;
    if(!blocked(nx,nz,nh)){h=nh;x=nx;z=nz;moved=true;lat=yaw*v;}
    // Only the turn would touch (steering into a post you are passing): roll on
    // straight, no crash. A hit is only a hit when the car itself is stopped.
    else if(!blocked(nx,nz,h)){x=nx;z=nz;moved=true;lat=yaw*v;}
    else{
      const mx=nx-x,mz=nz-z,hard=Math.abs(v)>2.2;
      if(hard)hit(Math.abs(v)/C.maxSpeed*1.4);
      const slides=Math.abs(mx)>Math.abs(mz)?[[mx,0],[0,mz]]:[[0,mz],[mx,0]];
      let progress=0;
      for(const [tx,tz] of slides)if(Math.abs(tx)+Math.abs(tz)>1e-6&&!blocked(x+tx*.9,z+tz*.9,nh)){x+=tx*.9;z+=tz*.9;h=nh;moved=true;progress=Math.hypot(tx,tz)*.9;break;}
      if(!moved&&!blocked(x,z,nh)){h=nh;moved=true;}
      // Hardly getting anywhere (head on into a wall or a car): slide along the
      // obstacle's surface, the way you steer (or the way the car leans), turning to follow it.
      if(progress<.3*Math.hypot(mx,mz)){moved=false;
        const e=.06,dn=(ox,oz)=>depth(nx+ox,nz+oz,nh),gx=dn(e,0)-dn(-e,0),gz=dn(0,e)-dn(0,-e),gl=Math.hypot(gx,gz);
        const steerSign=(down.has('left')?1:0)-(down.has('right')?1:0),fx0=Math.sin(h),fz0=Math.cos(h);
        if(gl>1e-6){let tx=-gz/gl,tz=gx/gl;const along=tx*fx0+tz*fz0,leftX=fz0,leftZ=-fx0;
          let sgn=Math.abs(along)>.2?Math.sign(along):steerSign?Math.sign(steerSign*(tx*leftX+tz*leftZ)):0;
          if(sgn){tx*=sgn;tz*=sgn;const step=Math.max(.025,Math.abs(v)*dt*.7);
            if(!blocked(x+tx*step,z+tz*step,h)){x+=tx*step;z+=tz*step;moved=true;v=Math.max(Math.abs(v),1.2)*Math.sign(v||1);
              const want=Math.atan2(tx,tz),dh=Math.atan2(Math.sin(want-h),Math.cos(want-h));if(!blocked(x,z,h+dh*.06))h+=dh*.06;}}}
      }
      // Steering while pressed against something turns the car firmly on the spot,
      // so it quickly faces along the obstacle and drives away.
      {const steerSign=(down.has('left')?1:0)-(down.has('right')?1:0);
        if(steerSign){const turn=steerSign*1.6*dt*(v<-.1||down.has('brake')?-1:1);if(!blocked(x,z,h+turn)){h+=turn;moved=true;}}}
      if(moved)v*=hard?.6:.985;else{v=hard?v*-.2:0;yaw*=.5;}
      vy=0;a=0;lat=0;
    }
    // Something overlapping the car (a taxi nudging in): ease it clear, a little each step.
    const d0=depth(x,z,h);
    if(d0>1e-4){let best=null,bd=d0;for(let k=0;k<8;k++){const ang=k*Math.PI/4,px=x+Math.sin(ang)*.05,pz=z+Math.cos(ang)*.05;if(impossible(px,pz,h))continue;const dd=depth(px,pz,h);if(dd<bd){bd=dd;best=[px,pz];}}
      if(best){x=best[0];z=best[1];}}
    if(moved&&surface){
      const ty=stand();
      // Ramps are followed exactly (no lag, so wheels never sink going up or
      // float coming down). Up a curb the wheels climb at once (never inside
      // it); down a curb the body drops onto the road in about a tenth of a
      // second, as a real car's wheels leave the edge.
      const ds=Math.hypot(x-x0,z-z0),jump=lastTy===null?0:ty-lastTy;
      if(Math.abs(jump)>1.2)stepEase=0;else if(jump<-(.08+ds*.45))stepEase-=jump;
      stepEase=damp(stepEase,0,26,dt);cy=ty+stepEase;lastTy=ty;}
    // Wheels roll by the distance the car really moved along its heading (backwards
    // in reverse, not at all against a wall); each wheel turns it by its own radius.
    rollAngle+=(x-x0)*Math.sin(h)+(z-z0)*Math.cos(h);

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
    // Tyre smoke: locked fronts while moving smoke at the front; Command and gas
    // standing still is a burnout, the rear wheels spin and smoke.
    const fzw=rz+parts.wheelbase;frontW[0].x=x+sn*fzw+cs*tr;frontW[0].z=z+cs*fzw-sn*tr;frontW[1].x=x+sn*fzw-cs*tr;frontW[1].z=z+cs*fzw+sn*tr;
    const lockup=front&&speed>1.2?.6+speed/C.maxSpeed:0,burnout=front&&gas&&speed<1.2?1.6:0;
    smoke.step(dt,burnout?rear:frontW,Math.max(lockup,burnout),fx*v,fz*v);

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
    parts.rig.position.y=rigY+lerp(prev.y,cy,t);parts.rig.rotation.x=-lerp(prev.slope,slope,t);parts.rig.rotation.z=lerp(prev.bank,bank,t);shown.y=parts.rig.position.y;
    const s=lerp(prev.steer,steer,t),wr=lerp(prev.roll,rollAngle,t);
    for(const w of parts.wheels){w.rotation.x=wr/(w.userData.r??parts.wheelR);if(w.userData.front)w.userData.steer.rotation.y=s;}
    // Suspension: the body is rigid, but each wheel travels up or down to meet
    // the road right under it (a wheel on a curb, the middle axle of a long
    // vehicle over the bridge's crest), within its travel.
    if(surface){parts.rig.updateMatrixWorld();const base=parts.rig.position.y-lerp(prev.y,cy,t);
      for(const w of parts.wheels){const pv=w.userData.steer,r0=w.userData.r??parts.wheelR;pv.userData.baseY??=pv.position.y;
        wv.set(pv.position.x,pv.userData.baseY,pv.position.z).applyMatrix4(parts.rig.matrixWorld);const g=tyreGround(wv.x,wv.z,r0,cy);
        pv.position.y=pv.userData.baseY+(g===null?0:THREE.MathUtils.clamp(base+g+pv.userData.baseY-wv.y,-r0*1.4,r0));}}
    parts.car.rotation.x=lerp(prev.pitch,pitch,t);parts.car.rotation.z=lerp(prev.bodyRoll,roll,t);parts.car.position.y=bodyY+lerp(prev.heave,heave,t);
    m.tailLight.emissiveIntensity=tail;m.headlight.emissiveIntensity=head;
    // The ambulance light bar pulses.
    const flashing=current===AMBULANCE;
    if(flashing)m.siren.emissiveIntensity=.4+1.2*Math.max(0,Math.sin(time*.012));
    const fx=skid.update(frame)|smoke.update(frame);
    const springs=Math.abs(pitchV)+Math.abs(rollV)+Math.abs(heaveV)>1e-4||Math.abs(pitch)+Math.abs(roll)+Math.abs(heave)>1e-4;
    return Math.abs(v)>.02||Math.abs(vy)>.01||Math.abs(steer)>.001||springs||Math.abs(x-prev.x)+Math.abs(z-prev.z)>1e-6||flashing||fx;
  };
  return api;
}
