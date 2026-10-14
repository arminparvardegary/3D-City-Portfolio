import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, branch, tint, mergeStatic } from './geometry.js';

const sgn=Math.sign;
// Lower body: superellipse cross sections (flat sides, soft shoulders) lofted
// from tail to nose. Each section is [z, halfWidth, bottomY, topY].
function bodyLoft(sections,n=3.4,tumble=.9,segments=28){
  const p=[],uv=[],index=[],e=2/n;
  sections.forEach(([z,w,lo,hi],i)=>{
    for(let j=0;j<=segments;j++){
      const a=j/segments*Math.PI*2,s=Math.sin(a),c=Math.cos(a);
      const half=c>0?w*tumble:w; // shoulders pull in toward the roof line
      p.push(sgn(s)*Math.abs(s)**e*half,(lo+hi)/2+sgn(c)*Math.abs(c)**e*(hi-lo)/2,z);uv.push(j/segments,i/(sections.length-1));
    }
  });
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;index.push(a,b,a+1,b,b+1,a+1);}
  for(const end of [0,sections.length-1]){
    const [z,,lo,hi]=sections[end],c=p.length/3;p.push(0,(lo+hi)/2,z);uv.push(.5,.5);
    for(let j=0;j<segments;j++){const a=end*(segments+1)+j;if(end===0)index.push(c,a,a+1);else index.push(c,a+1,a);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return tint(g);
}

// Glass greenhouse: only the upper half of each section, so it sits on the
// body like the continuous glass roof of a Model 3 / S. [z, halfWidth, baseY, roofY]
function glassLoft(sections,n=2.6,segments=22){
  const p=[],uv=[],index=[],e=2/n;
  sections.forEach(([z,w,base,top],i)=>{
    for(let j=0;j<=segments;j++){
      const a=-Math.PI/2+j/segments*Math.PI,s=Math.sin(a),c=Math.cos(a);
      p.push(sgn(s)*Math.abs(s)**e*w,base+Math.abs(c)**e*(top-base),z);uv.push(j/segments,i/(sections.length-1));
    }
  });
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;index.push(a,b,a+1,b,b+1,a+1);}
  for(const end of [0,sections.length-1]){
    const [z,,base,top]=sections[end],c=p.length/3;p.push(0,(base+top)/2,z);uv.push(.5,.5);
    for(let j=0;j<segments;j++){const a=end*(segments+1)+j;if(end===0)index.push(c,a,a+1);else index.push(c,a+1,a);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return tint(g);
}

function curve(parent,points,radius,material){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(parent,new THREE.TubeGeometry(path,16,radius,6,false),material);
}

function label(text,w,h,color='#343d41',bg='#e7eae6'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='500 58px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return {geometry:new THREE.PlaneGeometry(w,h),material:new THREE.MeshStandardMaterial({map,roughness:.6})};
}

// The Tesla "T": a curved cap over a long stem, drawn once as a texture.
function teslaBadge(){
  const c=document.createElement('canvas');c.width=128;c.height=160;const x=c.getContext('2d');
  x.fillStyle='#8a969c';
  x.beginPath();x.moveTo(17,30);x.quadraticCurveTo(64,8,111,30);x.lineTo(104,40);x.quadraticCurveTo(64,23,24,40);x.closePath();x.fill();
  x.beginPath();x.moveTo(33,43);x.quadraticCurveTo(64,30,95,43);x.lineTo(78,53);x.lineTo(64,136);x.lineTo(50,53);x.closePath();x.fill();
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map,transparent:true,roughness:.35,metalness:.4,depthWrite:false,side:THREE.DoubleSide});
}

const WHEEL_R=.3,WHEEL_Y=.3,WHEEL_Z=1.2,BODY_W=.79;

// Tesla Model Y (2025): a tall, smooth crossover with a low blunt nose, one
// thin LED bar across the full width of the front, a glass roof that slopes
// into a short hatch, a red light bar across the tail, and turbine wheels.
export function buildTeslaModelY(parent,m){
  const rig=new THREE.Group();rig.name='tesla-model-y';rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;rig.scale.setScalar(ART.car.scale);parent.add(rig);
  // `car` is the sprung body (pitches and bobs while driving); wheels hang off
  // the rig so they stay planted and only spin.
  const car=new THREE.Group();rig.add(car);

  mesh(car,bodyLoft([
    [-1.99,.54,.42,.80],[-1.92,.72,.32,.94],[-1.7,.785,.23,.96],[-1.3,.79,.21,.93],[-.6,.79,.21,.90],[.4,.79,.21,.88],[.95,.79,.21,.87],
    [1.35,.78,.23,.80],[1.72,.75,.26,.68],[1.93,.66,.30,.58],[1.99,.52,.35,.52],
  ]),m.carBody);
  const cabin=mesh(car,glassLoft([
    [1.12,.71,.87,.89],[.85,.70,.88,1.08],[.5,.69,.88,1.25],[.1,.68,.88,1.34],[-.4,.68,.9,1.345],[-.9,.69,.92,1.3],[-1.35,.71,.94,1.17],[-1.7,.7,.95,1.02],[-1.88,.65,.96,.97],
  ]),m.carGlass);cabin.material.side=THREE.DoubleSide;
  // Dark under tray, front splitter and rear diffuser.
  box(car,[1.38,.07,3.6],[0,.22,0],m.truckDark,.03);
  box(car,[1.05,.045,.09],[0,.31,1.93],m.truckDark,.02);
  box(car,[1.1,.05,.1],[0,.33,-1.93],m.truckDark,.02);

  // The signature: one slim light bar across the whole nose, swept back at the ends.
  curve(car,[[-.66,.61,1.76],[-.5,.595,1.89],[-.2,.586,1.95],[.2,.586,1.95],[.5,.595,1.89],[.66,.61,1.76]],.014,m.headlight);
  // Dark lower fascia with a wide air intake and small corner vents.
  box(car,[.86,.05,.03],[0,.42,1.985],m.truckDark,.015);
  for(const side of [-1,1])box(car,[.2,.035,.03],[side*.5,.455,1.93],m.truckDark,.012,[0,side*.45,0]);
  // Tail: a full width red light bar and the lamps that wrap the corners.
  curve(car,[[-.7,.87,-1.8],[-.5,.865,-1.925],[0,.862,-1.945],[.5,.865,-1.925],[.7,.87,-1.8]],.014,m.tailLight);

  for(const side of [-1,1]){
    box(car,[.3,.05,.06],[side*.5,.77,-1.905],m.tailLight,.016,[0,-side*.5,0]);
    // Frameless handles, panel seams, sill.
    for(const z of [.42,-.5])box(car,[.016,.022,.14],[side*.79,.77,z],m.carBody,.007);
    for(const z of [-.17,-1.04])curve(car,[[side*.785,.8,z],[side*.795,.56,z],[side*.775,.3,z]],.0035,m.truckDark);
    box(car,[.06,.045,1.7],[side*.785,.28,0],m.truckDark,.015);
    // Squarish body colored mirror on a short black arm, by the A pillar.
    box(car,[.1,.03,.05],[side*.77,.865,.9],m.truckDark,.01);
    box(car,[.13,.075,.1],[side*.86,.895,.9],m.carBody,.03,[0,side*.12,0]);
  }
  mesh(car,new THREE.PlaneGeometry(.095,.12),teslaBadge(),[0,.62,1.97],[-1.4,0,0]).castShadow=false;
  const plate=label('MODEL Y',.34,.075);mesh(car,plate.geometry,plate.material,[0,.52,1.995]);
  const rear=label('T E S L A',.46,.07,'#8a969c','#c9cfcd');mesh(car,rear.geometry,rear.material,[0,.56,-1.985],[0,Math.PI,0]);
  mesh(car,new THREE.PlaneGeometry(.09,.11),teslaBadge(),[0,.76,-1.94],[0,Math.PI,0]).castShadow=false;

  mergeStatic(car);

  // Dark wheel arches stay with the rig, so they do not spin.
  for(const side of [-1,1])for(const z of [-WHEEL_Z,WHEEL_Z])
    mesh(rig,new THREE.CylinderGeometry(WHEEL_R+.075,WHEEL_R+.075,.03,30),m.truckDark,[side*(BODY_W-.012),WHEEL_Y,z],[0,0,Math.PI/2]);
  // Turbine aero wheels: a swirl of slanted blades on a low profile tire.
  const wheels=[];
  for(const side of [-1,1])for(const z of [-WHEEL_Z,WHEEL_Z]){
    const w=new THREE.Group();w.position.set(side*.685,WHEEL_Y,z);rig.add(w);
    const spin=new THREE.Group();w.add(spin);spin.userData.steer=w;spin.userData.front=z>0;
    mesh(spin,new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,.21,34),m.rubber,[0,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(.225,.225,.02,30),m.rim,[side*.108,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.TorusGeometry(.225,.012,6,30),m.truckDark,[side*.116,0,0],[0,Math.PI/2,0]);
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9;
      box(spin,[.012,.12,.045],[side*.12,Math.sin(a)*.135,Math.cos(a)*.135],m.truckDark,.004,[a+.7,0,0]);
    }
    mesh(spin,new THREE.CylinderGeometry(.04,.04,.02,14),m.truckDark,[side*.124,0,0],[0,0,Math.PI/2]);
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
const WHEELBASE=2.4,MAX_SPEED=3.2,MAX_REVERSE=1.4;
// Things the car can bump into: [x, z, halfW, halfD] boxes and [x, z, r] circles.
const BOXES=[[-1.5,-.7,1.5,1.6],[-1.4,-2.71,1.2,.26]];
const CIRCLES=[[-3.78,-2.75,.4],[3.63,-3.45,.4],[-.45,2.62,.14]];
const BOUND=4.95;
function blocked(x,z,h){
  const fx=Math.sin(h),fz=Math.cos(h);
  for(const o of [-1.15,0,1.15]){
    const cx=x+fx*o,cz=z+fz*o,r=.8;
    if(Math.abs(cx)>BOUND-r||Math.abs(cz)>BOUND-r)return true;
    for(const [bx,bz,hw,hd] of BOXES){
      const dx=cx-Math.max(bx-hw,Math.min(cx,bx+hw)),dz=cz-Math.max(bz-hd,Math.min(cz,bz+hd));
      if(dx*dx+dz*dz<r*r)return true;
    }
    for(const [qx,qz,qr] of CIRCLES)if((cx-qx)**2+(cz-qz)**2<(r+qr)**2)return true;
  }
  return false;
}

export function createTeslaControls({rig,car,wheels},m,{radius=.29}={}){
  const home={x:rig.position.x,z:rig.position.z,h:ART.car.rotation};
  let x=home.x,z=home.z,h=home.h,v=0,steer=0,a=0,lat=0;
  const down=new Set();
  m.headlight.emissive.set('#ffffff');m.tailLight.emissive.set('#ff2a22');
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
