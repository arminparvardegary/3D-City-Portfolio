import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, branch, tint, mergeStatic } from './geometry.js';

// Smooth longitudinal sections give the Model S its low, rounded fastback
// silhouette. The cabin, hood and trunk form one continuous visual profile.
function bodyLoft(sections,segments=24){
  const p=[],uv=[],index=[];
  for(let i=0;i<sections.length;i++){
    const [z,w,low,high]=sections[i];
    for(let j=0;j<=segments;j++){
      const a=j/segments*Math.PI*2;
      p.push(Math.sin(a)*w,(low+high)/2+Math.cos(a)*(high-low)/2,z);uv.push(j/segments,i/(sections.length-1));
    }
  }
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<segments;j++){
    const a=i*(segments+1)+j,b=a+segments+1;index.push(a,b,a+1,b,b+1,a+1);
  }
  for(const end of [0,sections.length-1]){
    const [z,,lo,hi]=sections[end],c=p.length/3;p.push(0,(lo+hi)/2,z);uv.push(.5,.5);
    for(let j=0;j<segments;j++){const a=end*(segments+1)+j;if(end===0)index.push(c,a+1,a);else index.push(c,a,a+1);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return tint(g);
}

function cabinLoft(){
  const sections=[[-1.32,.67,.78,.805],[-1.06,.665,.79,1.0],[-.73,.64,.8,1.24],[-.38,.63,.81,1.365],[.03,.63,.82,1.39],[.34,.625,.83,1.32],[.66,.65,.83,1.12],[.98,.69,.81,.84]];
  const points=[],uv=[],indices=[],seg=20;
  for(let i=0;i<sections.length;i++){
    const[z,w,bottom,top]=sections[i];
    for(let j=0;j<=seg;j++){
      const a=-Math.PI/2+j/seg*Math.PI;
      points.push(Math.sin(a)*w,bottom+Math.cos(a)*(top-bottom),z);uv.push(j/seg,i/7);
    }
  }
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<seg;j++){
    const a=i*(seg+1)+j,b=a+seg+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function curve(parent,points,radius,material){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(parent,new THREE.TubeGeometry(path,16,radius,6,false),material);
}

function label(text,w,h,color='#343d41'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
  ctx.fillStyle='#e7eae6';ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='500 58px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return {geometry:new THREE.PlaneGeometry(w,h),material:new THREE.MeshStandardMaterial({map,roughness:.6})};
}

function teslaBadge(){
  const c=document.createElement('canvas');c.width=128;c.height=160;const x=c.getContext('2d');
  x.fillStyle='#69777f';
  x.beginPath();x.moveTo(17,30);x.quadraticCurveTo(64,8,111,30);x.lineTo(104,40);x.quadraticCurveTo(64,23,24,40);x.closePath();x.fill();
  x.beginPath();x.moveTo(33,43);x.quadraticCurveTo(64,30,95,43);x.lineTo(78,53);x.lineTo(64,136);x.lineTo(50,53);x.closePath();x.fill();
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map,transparent:true,roughness:.45,depthWrite:false,side:THREE.DoubleSide});
}

export function buildTeslaModelS(parent,m){
  const rig=new THREE.Group();rig.name='tesla-model-s';rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;rig.scale.setScalar(ART.car.scale);parent.add(rig);
  // `car` is the sprung body (pitches and bobs while driving); wheels hang off
  // the rig so they stay planted and only spin.
  const car=new THREE.Group();rig.add(car);
  mesh(car,bodyLoft([
    [-1.96,.42,.46,.6],[-1.85,.66,.37,.73],[-1.53,.78,.34,.8],[-1.1,.81,.33,.84],[-.5,.82,.32,.86],[.25,.82,.32,.87],[.9,.81,.34,.85],[1.4,.77,.38,.79],[1.76,.67,.43,.7],[1.96,.42,.47,.6],
  ]),m.carBody);
  box(car,[1.38,.09,2.75],[0,.335,0],m.truckDark,.03);
  const glass=mesh(car,cabinLoft(),m.carGlass);glass.material.side=THREE.DoubleSide;
  // Thin body-colored roof rails and swept pillars keep the panoramic glass
  // roof legible, with no pickup bed or upright truck cab.
  for(const side of [-1,1]){
    curve(car,[[side*.69,.815,.96],[side*.62,1.08,.63],[side*.5,1.28,.29],[side*.47,1.34,-.15],[side*.5,1.24,-.65],[side*.65,.91,-1.17]],.025,m.carBody);
    curve(car,[[side*.695,.817,.95],[side*.66,.83,.3],[side*.66,.82,-.65],[side*.68,.79,-1.28]],.012,m.rim);
    branch(car,[side*.66,.82,-.15],[side*.49,1.325,-.15],.024,.021,m.truckDark,1,6);
    // Flush door handles and very quiet panel seams.
    for(const z of [.4,-.66])box(car,[.018,.025,.16],[side*.799,.79,z],m.rim,.007);
    for(const z of [-.2,-1.12,.85])curve(car,[[side*.804,.74,z],[side*.815,.58,z],[side*.75,.4,z]],.004,m.truckDark);
    box(car,[.09,.055,1.95],[side*.775,.39,-.08],m.carBody,.018);
    mesh(car,new THREE.SphereGeometry(1,16,10),m.carBody,[side*.842,.94,.62],[0,0,0],[.13,.06,.095]);
    branch(car,[side*.68,.9,.58],[side*.82,.93,.62],.022,.018,m.truckDark,1,6);
  }
  // Slim swept headlights, a grille-free nose and a small Tesla T.
  for(const side of [-1,1]){
    const lamp=box(car,[.32,.052,.105],[side*.53,.687,1.765],m.truckDark,.018,[0,side*.42,side*.05]);
    box(car,[.255,.019,.112],[side*.535,.705,1.774],m.headlight,.007,[0,side*.42,side*.05]);
    box(car,[.29,.035,.065],[side*.535,.664,-1.826],m.tailLight,.011,[0,-side*.38,0]);
  }
  box(car,[.96,.065,.03],[0,.44,1.845],m.truckDark,.02);
  const badge=teslaBadge();mesh(car,new THREE.PlaneGeometry(.1,.125),badge,[0,.72,1.63],[-.96,0,0]);
  const plate=label('MODEL S',.35,.076);mesh(car,plate.geometry,plate.material,[0,.54,1.96]);
  const rear=label('T E S L A',.45,.068,'#69767c');mesh(car,rear.geometry,rear.material,[0,.665,-1.925],[0,Math.PI,0]);
  mergeStatic(car);
  // Five-spoke alloy wheels. Each wheel is its own group so it can spin.
  const wheels=[];
  for(const side of [-1,1])for(const z of [-1.18,1.2]){
    const w=new THREE.Group();w.position.set(side*.77,.32,z);rig.add(w);
    const spin=new THREE.Group();w.add(spin);
    mesh(spin,new THREE.CylinderGeometry(.315,.315,.19,28),m.rubber,[0,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.CylinderGeometry(.225,.225,.018,24),m.truckDark,[side*.102,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.TorusGeometry(.22,.014,6,24),m.rim,[side*.115,0,0],[0,Math.PI/2,0]);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      branch(spin,[side*.117,Math.sin(a)*.045,Math.cos(a)*.045],[side*.117,Math.sin(a+.2)*.204,Math.cos(a+.2)*.204],.034,.025,m.rim,1,5);
    }
    mesh(spin,new THREE.CylinderGeometry(.06,.06,.022,14),m.rim,[side*.13,0,0],[0,0,Math.PI/2]);
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

export function createTeslaDrive({rig,car,wheels},m,{travel=1.95,radius=.315}={}){
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
