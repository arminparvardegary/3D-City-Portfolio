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

const WHEEL_R=.29,WHEEL_Y=.29,WHEEL_Z=1.2,BODY_W=.77;

export function buildTeslaModelS(parent,m){
  const rig=new THREE.Group();rig.name='tesla-model-s';rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;rig.scale.setScalar(ART.car.scale);parent.add(rig);
  // `car` is the sprung body (pitches and bobs while driving); wheels hang off
  // the rig so they stay planted and only spin.
  const car=new THREE.Group();rig.add(car);

  // Painted lower body: low hood, high tail, a clean beltline, no grille.
  mesh(car,bodyLoft([
    [-1.96,.50,.40,.64],[-1.88,.68,.30,.82],[-1.66,.755,.22,.88],[-1.2,.77,.19,.87],[-.5,.77,.19,.82],[.4,.77,.19,.80],[.95,.77,.19,.80],
    [1.3,.765,.20,.745],[1.66,.73,.24,.64],[1.88,.62,.30,.56],[1.96,.48,.36,.50],
  ]),m.carBody);
  // Glass roof and windows in one smooth fastback greenhouse.
  const cabin=mesh(car,glassLoft([
    [1.02,.66,.80,.835],[.78,.655,.80,1.0],[.45,.64,.80,1.17],[.05,.63,.80,1.245],[-.4,.63,.80,1.245],[-.85,.64,.82,1.17],[-1.2,.66,.85,1.03],[-1.52,.68,.88,.915],[-1.68,.66,.89,.89],
  ]),m.carGlass);cabin.material.side=THREE.DoubleSide;
  // Dark under tray, front splitter and rear diffuser.
  box(car,[1.34,.07,3.5],[0,.2,0],m.truckDark,.03);
  box(car,[1.0,.045,.09],[0,.29,1.9],m.truckDark,.02);
  box(car,[1.1,.05,.1],[0,.31,-1.9],m.truckDark,.02);

  for(const side of [-1,1]){
    // Slim swept headlights with a bright daytime light strip, set into the nose.
    box(car,[.3,.045,.1],[side*.43,.655,1.83],m.truckDark,.018,[-.1,side*.42,side*.05]);
    box(car,[.26,.016,.108],[side*.435,.675,1.838],m.headlight,.006,[-.1,side*.42,side*.05]);
    // Tail lamps wrap around the rear corners.
    box(car,[.36,.05,.07],[side*.5,.8,-1.915],m.tailLight,.02,[0,-side*.5,0]);
    // Frameless door handles, quiet panel seams, and a body colored sill.
    for(const z of [.3,-.62])box(car,[.016,.022,.14],[side*.775,.745,z],m.carBody,.007);
    for(const z of [.92,-.17,-1.04])curve(car,[[side*.78,.82,z],[side*.79,.55,z],[side*.77,.3,z]],.0035,m.truckDark);
    box(car,[.06,.045,2.05],[side*.78,.27,-.05],m.truckDark,.015);
    // Mirror on a short stalk.
    box(car,[.1,.03,.05],[side*.76,.835,.86],m.truckDark,.01);
    mesh(car,new THREE.SphereGeometry(1,16,10),m.carBody,[side*.83,.86,.84],[0,0,0],[.08,.055,.085]);
  }
  // Lower air intake slot and the T badge on the nose.
  box(car,[.8,.05,.03],[0,.43,1.955],m.truckDark,.015);
  mesh(car,new THREE.PlaneGeometry(.095,.12),teslaBadge(),[0,.69,1.73],[-1.28,0,0]);
  const plate=label('MODEL S',.34,.075);mesh(car,plate.geometry,plate.material,[0,.5,1.965]);
  const rear=label('T E S L A',.46,.07,'#8a969c','#c9cfcd');mesh(car,rear.geometry,rear.material,[0,.82,-1.935],[0,Math.PI,0.0]);
  const tbadge=mesh(car,new THREE.PlaneGeometry(.09,.11),teslaBadge(),[0,.775,-1.945],[0,Math.PI,0]);tbadge.castShadow=false;
  // Thin red light bar joining the tail lamps.
  box(car,[.62,.016,.03],[0,.835,-1.925],m.tailLight,.006);

  mergeStatic(car);

  // Dark wheel arches stay with the rig, so they do not spin.
  for(const side of [-1,1])for(const z of [-WHEEL_Z,WHEEL_Z])
    mesh(rig,new THREE.CylinderGeometry(WHEEL_R+.07,WHEEL_R+.07,.03,28),m.truckDark,[side*(BODY_W-.012),WHEEL_Y,z],[0,0,Math.PI/2]);
  // Aero wheels: a smooth turbine disc with dark slots, on a low profile tire.
  const wheels=[];
  for(const side of [-1,1])for(const z of [-WHEEL_Z,WHEEL_Z]){
    const w=new THREE.Group();w.position.set(side*.675,WHEEL_Y,z);rig.add(w);
    const spin=new THREE.Group();w.add(spin);
    mesh(spin,new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,.2,32),m.rubber,[0,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(.215,.215,.02,28),m.rim,[side*.103,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.TorusGeometry(.215,.012,6,28),m.truckDark,[side*.11,0,0],[0,Math.PI/2,0]);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      box(spin,[.012,.07,.03],[side*.115,Math.sin(a)*.13,Math.cos(a)*.13],m.truckDark,.004,[a,0,0]);
    }
    mesh(spin,new THREE.CylinderGeometry(.04,.04,.02,14),m.truckDark,[side*.118,0,0],[0,0,Math.PI/2]);
    wheels.push(spin);
  }
  return {rig,car,wheels};
}

// A slow, believable drive cycle: sit parked, pull out of the bay, stop,
// reverse back in and park again. Wheels roll exactly with the ground speed,
// the body pitches on throttle and brake, and the lights follow what the car
// is doing (brake lights on stopping, bright daytime lights while moving).
const CYCLE=[ // [duration s, from, to] along the driveway, 0 = parked, 1 = pulled out
  [2.5,0,0],[4.6,0,1],[2.2,1,1],[4.6,1,0],[2.1,0,0],
];
const TOTAL=CYCLE.reduce((a,c)=>a+c[0],0);
const ease=x=>x*x*x*(x*(x*6-15)+10);
function progress(t){
  t%=TOTAL;
  for(const [d,a,b] of CYCLE){if(t<d)return a+(b-a)*ease(t/d);t-=d;}
  return 0;
}

export function createTeslaDrive({rig,car,wheels},m,{travel=1.95,radius=.29}={}){
  const home=rig.position.z;
  m.headlight.emissive.set('#fff2ce');m.tailLight.emissive.set('#ff2a22');
  let last=null,distance=0;
  // time is in ms. Returns true while the car is moving, so the caller knows
  // the cast shadow has to be refreshed every frame.
  return function update(time){
    const t=time/1000,dt=.04;
    const p=progress(t),v=(progress(t+dt)-progress(t-dt))/(2*dt)*travel,a=(progress(t+dt)-2*p+progress(t-dt))/(dt*dt)*travel;
    const z=home+p*travel;
    distance=p*travel;
    rig.position.z=z;
    for(const w of wheels)w.rotation.x=distance/radius;
    const moving=Math.abs(v)>.01;
    car.rotation.x=-THREE.MathUtils.clamp(a*.035,-.03,.03);
    car.position.y=moving?Math.sin(t*38)*.0012*Math.min(1,Math.abs(v)*3):0;
    // Decelerating against the direction of travel, or parked in gear: brake lights.
    const braking=(v>.01&&a<-.02)||(v<-.01&&a>.02)||!moving;
    m.tailLight.emissiveIntensity=braking?(moving?1.9:.9):.45;
    m.headlight.emissiveIntensity=moving?1.35:.55;
    const was=last;last=moving;
    return moving||was;
  };
}
