import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, branch, tint, mergeStatic } from './geometry.js';

const sgn=Math.sign;
// Lower body: superellipse cross sections (flat sides, soft shoulders) lofted
// from tail to nose. Each section is [z, halfWidth, bottomY, topY].
export function bodyLoft(sections,n=3.4,tumble=.9,segments=28){
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
export function glassLoft(sections,n=2.6,segments=22){
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

// ---- Tesla Model Y (2025), modelled in real metres and scaled into the tile. ----
// Length 4.80, width 1.92 (without mirrors), height 1.62, wheelbase 2.89.
const WHEEL_R=.349,WHEEL_Y=.349,WHEEL_ZF=1.43,WHEEL_ZR=-1.444,TRACK=.8,BODY_W=.989;
export const MODEL_Y_SCALE=.8316; // tile units per metre: 4.80 m becomes 3.99 units

// Fitted to the supplied studio render: from the render's own camera (solved
// from the wheel rims) this body covers the render's silhouette at 96.8% IoU.
export const BODY_SECTIONS=[[-2.4,0.701,0.398,1.09],[-2.178,0.836,0.313,1.096],[-1.953,0.952,0.222,1.097],[-1.804,0.989,0.15,1.086],[-0.996,0.989,0.13,1.062],[0.127,0.986,0.13,1.042],[0.846,0.989,0.13,1.026],[1.387,0.955,0.15,0.93],[1.95,0.958,0.18,0.663],[2.138,0.886,0.254,0.6],[2.36,0.76,0.349,0.536],[2.4,0.62,0.442,0.471]];
export const GLASS_SECTIONS=[[0.92,0.798,0.984,0.985],[0.65,0.779,0.966,1.12],[0.334,0.745,0.882,1.341],[0.023,0.732,0.943,1.457],[-0.306,0.719,0.954,1.481],[-0.684,0.704,0.945,1.474],[-1.293,0.768,0.982,1.414],[-1.752,0.741,0.973,1.318],[-2.027,0.745,1.029,1.186],[-2.176,0.666,1.046,1.055]];

// Features traced on the render: each pixel was cast from the render's camera onto
// the fitted body, giving these surface positions in metres. The near (left)
// side is traced; the right side mirrors it, as on the real car.
const TRACE={
  // front: [x, y]
  bar:[[0,.597],[.18,.598],[.31,.602]],
  lamp:[[.31,.602],[.434,.625],[.54,.648],[.62,.665],[.675,.682],[.70,.704]],
  fog:[[.508,.537],[.826,.576],[.839,.527],[.618,.513]],
  intake:[[-.62,.415],[-.46,.43],[0,.445],[.46,.43],[.62,.415],[.66,.396],[.5,.385],[0,.38],[-.5,.385],[-.66,.396]],
  lip:[[-.72,.372],[.72,.372],[.70,.352],[-.70,.352]],
  // side: [z, y]
  seamFront:[[.877,.929],[.967,.835],[1.009,.645],[1.031,.304]],
  seamMiddle:[[-.30,.93],[-.174,.813],[-.148,.577],[-.111,.356]],
  seamRear:[[-1.22,.99],[-1.16,.86],[-1.06,.76],[-1.0,.62]],
  handleFront:[[.05,.865],[-.139,.891]],
  handleRear:[[-.993,.909],[-1.204,.937]],
  repeater:[[1.135,.77],[1.01,.773],[1.099,.715]],
  // rear: [x, y]
  tailBar:[[-.74,.95],[-.5,.955],[-.25,.958],[0,.96],[.25,.958],[.5,.955],[.74,.95]],
  tailLamp:[[.5,.985],[.8,.975],[.8,.915],[.5,.925]],
  diffuser:[[-.72,.47],[.72,.47],[.66,.40],[-.66,.40]],
};

// Ray casting onto the bare body (in metres) places every detail flush on it.
function surface(geometry){
  const probe=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));probe.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),o=new THREE.Vector3(),d=new THREE.Vector3();
  const cast=(off)=>{ray.set(o,d);const h=ray.intersectObject(probe)[0];return h?h.point.clone().addScaledVector(d,-off):null;};
  return {
    front:(x,y,off=.004)=>{o.set(x,y,6);d.set(0,0,-1);return cast(off);},
    rear:(x,y,off=.004)=>{o.set(x,y,-6);d.set(0,0,1);return cast(off);},
    side:(z,y,off=.004,sx=1)=>{o.set(sx*3,y,z);d.set(-sx,0,0);return cast(off);},
  };
}
// A thin painted shape that follows the body: sampled on a grid, kept inside the outline.
function decal(parent,sample,poly,material,step=.012){
  const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const nx=Math.max(1,Math.ceil((x1-x0)/step)),ny=Math.max(1,Math.ceil((y1-y0)/step));
  const inside=(x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
  const grid=[];for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)grid.push(sample(x0+(x1-x0)*i/nx,y0+(y1-y0)*j/ny));
  const pos=[],idx=[],at=new Map();
  const vid=k=>{if(!at.has(k)){at.set(k,pos.length/3);pos.push(grid[k].x,grid[k].y,grid[k].z);}return at.get(k);};
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const a=j*(nx+1)+i,b=a+1,c=a+nx+1,dd=c+1;
    if(!grid[a]||!grid[b]||!grid[c]||!grid[dd])continue;
    if(!inside(x0+(x1-x0)*(i+.5)/nx,y0+(y1-y0)*(j+.5)/ny))continue;
    idx.push(vid(a),vid(b),vid(dd),vid(a),vid(dd),vid(c));
  }
  if(!idx.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  const o=mesh(parent,tint(g),material);o.castShadow=false;return o;
}
function line(parent,points,radius,material){
  const pts=points.filter(Boolean);if(pts.length<2)return null;
  const o=mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.max(8,pts.length*6),radius,6,false),material);o.castShadow=false;return o;
}

// Finer sections (smooth interpolation of the fitted ones) so wheel arches can be cut.
function resample(sections,n){
  const out=[],z0=sections[0][0],z1=sections.at(-1)[0];
  const col=(i,j)=>sections[Math.max(0,Math.min(sections.length-1,i))][j];
  for(let k=0;k<n;k++){
    const z=z0+(z1-z0)*k/(n-1);let i=0;while(i<sections.length-2&&sections[i+1][0]<z)i++;
    const t=(z-col(i,0))/(col(i+1,0)-col(i,0)),row=[z];
    for(let j=1;j<4;j++){const p0=col(i-1,j),p1=col(i,j),p2=col(i+1,j),p3=col(i+2,j);
      row.push(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t));}
    out.push(row);
  }
  return out;
}
// The body with real wheel openings: around each wheel the side is pushed in
// behind the tyre and shaded dark, like the fender liner on the render.
function carvedBody(){
  const g=bodyLoft(resample(BODY_SECTIONS,170),3.4,.92,128);
  const p=g.attributes.position,c=g.attributes.color,OPEN=WHEEL_R+.075;
  const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(Math.abs(x)<.55)continue;
    for(const wz of [WHEEL_ZF,WHEEL_ZR]){
      const r=Math.hypot(z-wz,y-WHEEL_Y);
      const k=1-smooth(OPEN-.012,OPEN+.012,r);   // 1 inside the opening, 0 outside
      if(k>0){const inner=Math.sign(x)*Math.min(Math.abs(x),.62);p.setX(i,x+(inner-x)*k);const v=1-.82*k;c.setXYZ(i,v,v,v*1.02);}
    }
  }
  g.computeVertexNormals();return g;
}
// Ten swept blades of the turbine wheel, drawn once and reused.
let bladeGeo=null;
function turbineBlade(){
  if(bladeGeo)return bladeGeo;
  const sh=new THREE.Shape(),pt=(r,a)=>[Math.cos(a)*r,Math.sin(a)*r];
  sh.moveTo(...pt(.06,-.06));sh.lineTo(...pt(.225,.08));sh.lineTo(...pt(.225,.36));sh.lineTo(...pt(.06,.1));sh.closePath();
  bladeGeo=tint(new THREE.ExtrudeGeometry(sh,{depth:.016,bevelEnabled:false}).rotateY(Math.PI/2));
  return bladeGeo;
}

export function buildTeslaModelY(parent,m){
  const rig=new THREE.Group();rig.name='tesla-model-y';rig.position.set(...ART.car.position);rig.rotation.y=ART.car.rotation;rig.scale.setScalar(ART.car.scale);parent.add(rig);
  // `car` is the sprung body (pitches and bobs while driving); wheels hang off
  // the rig so they stay planted and only spin.
  const car=new THREE.Group();rig.add(car);
  const bodyGeo=carvedBody();
  mesh(car,bodyGeo,m.carBody);
  const S=surface(bodyLoft(resample(BODY_SECTIONS,90),3.4,.92,40));
  const cabin=mesh(car,glassLoft(GLASS_SECTIONS),m.carGlass);cabin.castShadow=true;
  // Tinted glass roof: dark from above, so the cabin shows only through the windows.
  mesh(car,glassLoft(GLASS_SECTIONS.filter(([z])=>z<.6&&z>-1.9).map(([z,w,base,top])=>{
    // width of the glass (a superellipse, n = 2.6) at the panel's lower edge, so it stays inside
    const y=top-.13,e=2/2.6,c=Math.max(0,(y-base)/(top-base))**(1/e),half=w*Math.sqrt(1-c*c)**e;
    return [z,half*.96,y,top-.006];
  })),m.roofGlass);
  box(car,[1.4,.06,3.4],[0,.17,0],m.truckDark,.03);

  // Front: the full width light bar, its brighter lamp ends, fog vents, intake, lip, T.
  const mir=a=>a.map(([x,y])=>[-x,y]);
  line(car,[...mir(TRACE.bar).reverse(),...TRACE.bar.slice(1)].map(([x,y])=>S.front(x,y,.006)),.008,m.headlight);
  for(const f of [TRACE.lamp,mir(TRACE.lamp)])line(car,f.map(([x,y])=>S.front(x,y,.007)),.014,m.headlight);
  for(const f of [TRACE.fog,mir(TRACE.fog)])decal(car,(x,y)=>S.front(x,y,.004),f,m.cabinDark,.005);
  decal(car,(x,y)=>S.front(x,y,.004),TRACE.intake,m.cabinDark,.007);
  decal(car,(x,y)=>S.front(x,y,.004),TRACE.lip,m.truckDark,.02);
  const emblem=S.front(0,.52,.006);if(emblem)mesh(car,new THREE.PlaneGeometry(.075,.09),teslaBadge(),emblem.toArray(),[-.25,0,0]).castShadow=false;

  // Sides: door seams, flush handles, the camera repeater, mirrors.
  for(const sx of [1,-1]){
    for(const seam of [TRACE.seamFront,TRACE.seamMiddle,TRACE.seamRear])line(car,seam.map(([z,y])=>S.side(z,y,.002,sx)),.0028,m.cabinDark);
    for(const h of [TRACE.handleFront,TRACE.handleRear])line(car,h.map(([z,y])=>S.side(z,y,.004,sx)),.009,m.cabinDark);
    decal(car,(z,y)=>S.side(z,y,.004,sx),TRACE.repeater,m.cabinDark,.008);
    // Mirror: body coloured shell on a short black arm.
    box(car,[.12,.05,.08],[sx*.84,.94,.62],m.cabinDark,.02);
    mesh(car,new THREE.SphereGeometry(1,20,14),m.carBody,[sx*.93,.975,.63],[0,sx*.18,0],[.1,.055,.072]);
  }

  // Rear: full width red light bar, corner lamps, dark diffuser, T badge.
  line(car,TRACE.tailBar.map(([x,y])=>S.rear(x,y,.006)),.011,m.tailLight);
  for(const f of [TRACE.tailLamp,mir(TRACE.tailLamp)])decal(car,(x,y)=>S.rear(x,y,.005),f,m.tailLight,.012);
  decal(car,(x,y)=>S.rear(x,y,.004),TRACE.diffuser,m.truckDark,.02);
  const rearT=S.rear(0,.83,.006);if(rearT)mesh(car,new THREE.PlaneGeometry(.075,.09),teslaBadge(),rearT.toArray(),[0,Math.PI,0]).castShadow=false;

  // Cabin seen through the glass: pale seats, dark dash and floor.
  box(car,[1.66,.05,3.3],[0,.46,-.25],m.cabinDark,.02);
  box(car,[1.55,.2,.42],[0,.86,.78],m.cabinDark,.05);
  for(const sx of [-1,1]){
    box(car,[.5,.12,.5],[sx*.38,.55,.12],m.seat,.05);
    box(car,[.48,.56,.13],[sx*.38,.86,-.15],m.seat,.05,[-.16,0,0]);
    box(car,[.24,.15,.09],[sx*.38,1.2,-.2],m.seat,.04,[-.16,0,0]);
  }
  box(car,[1.36,.12,.5],[0,.57,-.86],m.seat,.05);
  box(car,[1.36,.5,.13],[0,.86,-1.12],m.seat,.05,[-.2,0,0]);

  mergeStatic(car);

  const wheels=[];
  for(const side of [-1,1])for(const z of [WHEEL_ZR,WHEEL_ZF]){
    const w=new THREE.Group();w.position.set(side*TRACK,WHEEL_Y,z);rig.add(w);
    const spin=new THREE.Group();w.add(spin);spin.userData.steer=w;spin.userData.front=z>0;
    mesh(spin,new THREE.CylinderGeometry(WHEEL_R,WHEEL_R,.255,40),m.rubber,[0,0,0],[0,0,Math.PI/2]);
    // Turbine wheel as on the render: ten swept light blades on a dark face.
    mesh(spin,new THREE.CylinderGeometry(.235,.235,.02,36),m.cabinDark,[side*.122,0,0],[0,0,Math.PI/2]);
    mesh(spin,new THREE.TorusGeometry(.236,.011,6,40),m.rim,[side*.126,0,0],[0,Math.PI/2,0]);
    for(let i=0;i<10;i++){
      const b=mesh(spin,turbineBlade(),m.rim,[side*.122+(side>0?0:-.016),0,0],[i*Math.PI/5,0,0]);b.castShadow=false;
    }
    mesh(spin,new THREE.CylinderGeometry(.055,.055,.024,18),m.cabinDark,[side*.134,0,0],[0,0,Math.PI/2]);
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
    const cx=x+fx*o,cz=z+fz*o,r=.83;
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
