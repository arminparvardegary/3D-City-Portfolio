import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The cars of New York: "Free Low Poly Vehicles Pack" by Rgsdev (CC0, public
// domain, credit not required). 21 FBX models in centimetres, nose toward +z,
// four separate wheels each. Loaded once at start; each model is turned into
// real materials (clearcoat paint, reflective glass, glowing head and tail
// lights) and measured (length, width, wheel radius, axles) for the driving.
// Each car drives and sounds like what it is. Driving is relative to Armin's tuned
// feel (the Sports car is 1): speed = top speed, power = engine pull, brake,
// grip, steer = how quickly the wheel turns, swing = handbrake tail swing, mass
// (kg, for the body's weight on its springs). Sound: the engine voice and the horn.
const D=(speed,power,brake,grip,steer,mass,engine,horn,swing=1)=>({speed,power,brake,grip,steer,mass,engine,horn,swing});
export const MODELS=[
  {id:'sports',name:'Sports',drive:D(1,1,1,1,1,1350,'flat6','sport')},
  {id:'roadster',name:'Roadster',drive:D(.95,.92,1,1.06,1.08,1150,'flat6','sport',1.05)},
  {id:'muscle',name:'Muscle',drive:D(.96,1.08,.88,.86,.92,1650,'v8','muscle',1.2)},
  {id:'muscle-2',name:'Muscle 2',drive:D(.94,1.04,.88,.86,.92,1700,'v8','muscle',1.2)},
  {id:'sedan',name:'Sedan',drive:D(.8,.74,.92,.92,.95,1450,'i4','car')},
  {id:'hatchback',name:'Hatchback',drive:D(.74,.78,.95,.95,1.12,1150,'i4','car',1.1)},
  {id:'limousine',name:'Limousine',drive:D(.74,.6,.72,.85,.62,2600,'v12','limo',.7)},
  {id:'suv',name:'SUV',drive:D(.76,.72,.82,.86,.85,2100,'v6','car',.85)},
  {id:'pickup',name:'Pickup',drive:D(.74,.74,.82,.84,.85,2200,'v8','muscle',.9)},
  {id:'van',name:'Van',drive:D(.66,.6,.76,.82,.8,2300,'i4','van',.75)},
  {id:'taxi',name:'Taxi',drive:D(.8,.76,.92,.92,.98,1500,'i4','taxi')},
  {id:'police-sedan',name:'Police Sedan',drive:D(.92,.95,1,.96,1,1650,'v8','police')},
  {id:'police-sports',name:'Police Sports',drive:D(1.02,1.02,1.02,1,1,1450,'flat6','police')},
  {id:'police-suv',name:'Police SUV',drive:D(.86,.86,.9,.9,.9,2200,'v8','police',.85)},
  {id:'police-muscle',name:'Police Muscle',drive:D(.97,1.06,.92,.88,.94,1700,'v8','police',1.15)},
  {id:'ambulance',name:'Ambulance',drive:D(.72,.64,.74,.82,.75,3200,'diesel','ambulance',.7)},
  {id:'firetruck',name:'Firetruck',drive:D(.6,.5,.6,.78,.6,11000,'diesel','fire',.55)},
  {id:'bus',name:'Bus',drive:D(.52,.44,.56,.78,.52,12000,'diesel','bus',.5)},
  {id:'truck',name:'Truck',drive:D(.6,.5,.6,.78,.6,8000,'diesel','truck',.55)},
  {id:'truck-with-trailer',name:'Truck with trailer',drive:D(.5,.4,.5,.74,.5,16000,'diesel','truck',.45)},
  {id:'monster-truck',name:'Monster Truck',drive:D(.74,.95,.72,.7,.8,4500,'v8','muscle',1.3)},
].map(M=>({...M,speed:M.drive.speed*9}));   // traffic cruising speed follows the car
const SCALE=1/150;   // centimetres to world units (one unit is about 1.5 m)
const cache=new Map();

// Material by its name in the FBX.
function convert(m,paintName){
  const n=(m.name||'').toLowerCase(),c=m.color?.clone()??new THREE.Color('#888');
  // The paint: the body colour that covers the most of the car (decided per model).
  if(n===paintName)return {kind:'paint',mat:new THREE.MeshPhysicalMaterial({color:c,metalness:.45,roughness:.3,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.2})};
  // Other body colours (stripes, trim) stay as they are; "body light blue" is paint, not a lamp.
  if(n.startsWith('body'))return {kind:'solid',mat:new THREE.MeshStandardMaterial({color:c,roughness:.4,metalness:.25})};
  if(n.includes('window'))return {kind:'glass',mat:new THREE.MeshPhysicalMaterial({color:'#0b1118',metalness:.25,roughness:.04,clearcoat:1,envMapIntensity:1.8})};
  if(n.includes('headlight'))return {kind:'lamp',mat:new THREE.MeshStandardMaterial({color:'#f6f8ff',emissive:'#fff1d0',emissiveIntensity:2.6})};
  if(n.includes('rear light')||n.includes('rearlight')||n.includes('brake'))return {kind:'lamp',mat:new THREE.MeshStandardMaterial({color:'#5a0006',emissive:'#ff2418',emissiveIntensity:1.8})};
  if(n.includes('light')||n.includes('siren'))return {kind:'lamp',mat:new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:2})};
  if(n.includes('tire')||n.includes('tyre'))return {kind:'solid',mat:new THREE.MeshStandardMaterial({color:'#121316',roughness:.85})};
  if(n.includes('wheel')||n.includes('rim')||n.includes('chrome'))return {kind:'solid',mat:new THREE.MeshStandardMaterial({color:c.getHex()?c:'#c4c8ce',metalness:.9,roughness:.25,envMapIntensity:1.5})};
  return {kind:'solid',mat:new THREE.MeshStandardMaterial({color:c,roughness:.45,metalness:.2})};
}

// Load and prepare every model (call once, before the world is built).
export async function loadModels(prep){
  const loader=new FBXLoader(),base=import.meta.env.BASE_URL;
  await Promise.all(MODELS.map(async M=>{
    const root=await loader.loadAsync(`${base}cars/${M.id}.fbx`);
    root.scale.setScalar(SCALE);root.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
    const wheels=[],body=[];let paintColor=null;
    // Surface area of each body material, to find the main paint.
    const area=new Map(),A=new THREE.Vector3(),B=new THREE.Vector3(),Cv=new THREE.Vector3(),tri=new THREE.Triangle();
    root.traverse(o=>{if(!o.isMesh||/wheel/i.test(o.name))return;const g=o.geometry,pos=g.attributes.position,idx=g.index,ms=[].concat(o.material);
      const groups=g.groups.length?g.groups:[{start:0,count:idx?idx.count:pos.count,materialIndex:0}];
      for(const gr of groups){const n=(ms[gr.materialIndex]?.name||'').toLowerCase();if(!n.startsWith('body'))continue;let a=0;
        for(let i=gr.start;i<gr.start+gr.count-2;i+=3){const v=k=>idx?idx.getX(k):k;A.fromBufferAttribute(pos,v(i));B.fromBufferAttribute(pos,v(i+1));Cv.fromBufferAttribute(pos,v(i+2));a+=tri.set(A,B,Cv).getArea();}
        area.set(n,(area.get(n)??0)+a);}});
    // Black is trim (bumpers, sills) on these models, except the limousine, which is black.
    const ranked=[...area].sort((a,b)=>b[1]-a[1]).map(e=>e[0]),paintName=M.id==='limousine'?ranked[0]:ranked.find(n=>!n.includes('black'))??ranked[0];
    root.traverse(o=>{if(!o.isMesh)return;
      const mats=[].concat(o.material).map(m=>{const r=convert(m,paintName);prep?.(r.mat);if(r.kind==='paint'&&!paintColor)paintColor='#'+r.mat.color.getHexString();return r;});
      o.material=Array.isArray(o.material)?mats.map(r=>r.mat):mats[0].mat;o.userData.kinds=mats.map(r=>r.kind);
      o.castShadow=true;o.receiveShadow=true;
      (/wheel_(front|rear)_(left|right)/i.test(o.name)?wheels:body).push(o);});
    // Wheels: centre, radius, front or rear.
    const W=wheels.map(o=>{const b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3());return {o,c,r:b.getSize(new THREE.Vector3()).y/2,front:/front/i.test(o.name)};});
    const lift=-box.min.y,fz=W.filter(w=>w.front).map(w=>w.c.z),rz=W.filter(w=>!w.front).map(w=>w.c.z);
    const front=fz.length?Math.max(...fz):size.z*.3,rear=rz.length?rz.reduce((a,b)=>a+b,0)/rz.length:-size.z*.3;
    cache.set(M.id,{M,root,lift,L:size.z,Wd:size.x,H:size.y,wheels:W,wheelR:W[0]?.r??.3,track:W[0]?Math.abs(W[0].c.x):size.x*.4,front,rear,paintColor:paintColor??'#b5121b'});
  }));
}
export const modelInfo=id=>cache.get(id);

// A drivable copy for the player (and the garage): rig > body + wheel pivots,
// the format car.js expects. Paint is its own material, so it can be recoloured.
export function buildModelVehicle(id,parent){
  const C=cache.get(id),rig=new THREE.Group();rig.name='vehicle';parent.add(rig);
  const body=new THREE.Group();rig.add(body);
  const copy=C.root.clone(true);copy.position.y=C.lift;
  let paint=null;
  copy.traverse(o=>{if(!o.isMesh)return;const k=o.userData.kinds||[];const mats=[].concat(o.material).map((m,i)=>{if(k[i]==='paint'){if(!paint)paint=m.clone();return paint;}return m;});o.material=Array.isArray(o.material)?mats:mats[0];});
  const spins=[];
  for(const w of C.wheels){
    const mesh=copy.getObjectByName(w.o.name);if(!mesh)continue;
    const pivot=new THREE.Group();pivot.position.set(w.c.x,w.c.y+C.lift,w.c.z);rig.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);spin.userData.steer=pivot;spin.userData.front=w.front;spin.userData.r=Math.max(.05,w.r);
    // Keep the wheel exactly where it was, now turning about its own centre.
    copy.updateMatrixWorld(true);const m=mesh.matrixWorld.clone();mesh.removeFromParent();
    const inv=new THREE.Matrix4().makeTranslation(-w.c.x,-(w.c.y+C.lift),-w.c.z);mesh.matrix.copy(inv.multiply(m));mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);spin.add(mesh);
    spins.push(spin);}
  body.add(copy);
  paint=paint??new THREE.MeshPhysicalMaterial({color:C.paintColor});
  return {rig,car:body,wheels:spins,paint,color:C.paintColor,name:C.M.name,wheelR:C.wheelR,wheelbase:C.front-C.rear,rearZ:C.rear,track:C.track,length:C.L,width:C.Wd};
}

// Traffic: every model merged into three batches (body, glass, lights), each
// coloured by its materials, plus a fourth for the wheels, which are drawn on
// their own so they can roll and steer. All the traffic is four draw calls.
const WHEEL=/wheel_(front|rear)_(left|right)/i;
// One mesh as a vertex coloured geometry per material bucket, moved by matrix.
function bakeMesh(o,matrix,out,only){const g0=o.geometry,mats=[].concat(o.material),k=o.userData.kinds||[];
  const groups=g0.groups.length?g0.groups:[{start:0,count:g0.index?g0.index.count:g0.attributes.position.count,materialIndex:0}];
  const g=g0.index?g0.toNonIndexed():g0;
  for(const gr of groups){const kind=k[gr.materialIndex]??'solid',bucket=only??(kind==='paint'?'solid':kind),mat=mats[gr.materialIndex]??mats[0],st=gr.start,ct=gr.count;
    const pos=g.attributes.position.array.slice(st*3,(st+ct)*3),nor=g.attributes.normal?.array.slice(st*3,(st+ct)*3);
    const sub=new THREE.BufferGeometry();sub.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));if(nor)sub.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));else sub.computeVertexNormals();
    const col=new Float32Array(ct*3),c=mat.color||new THREE.Color('#fff');for(let i=0;i<ct;i++)col.set([c.r,c.g,c.b],i*3);sub.setAttribute('color',new THREE.BufferAttribute(col,3));
    sub.applyMatrix4(matrix);(out[bucket]??=[]).push(sub);}
  if(g!==g0)g.dispose();}
export function createModelFleet({cars,prep}){
  const geos={},wheelGeos={};
  // Each wheel of a model, centred on its own axle, so it can turn about it.
  const bakeWheels=id=>{if(wheelGeos[id])return wheelGeos[id];const C=cache.get(id);C.root.updateMatrixWorld(true);
    return wheelGeos[id]=C.wheels.map(w=>{const out={};bakeMesh(w.o,new THREE.Matrix4().makeTranslation(-w.c.x,-w.c.y,-w.c.z).multiply(w.o.matrixWorld),out,'wheel');
      return {geo:mergeGeometries(out.wheel,false),at:new THREE.Vector3(w.c.x,w.c.y+C.lift,w.c.z),front:w.front,r:Math.max(.05,w.r)};});};
  const bake=(id)=>{if(geos[id])return geos[id];const C=cache.get(id),out={solid:[],glass:[],lamp:[]};C.root.updateMatrixWorld(true);
    C.root.traverse(o=>{if(!o.isMesh||WHEEL.test(o.name))return;bakeMesh(o,new THREE.Matrix4().makeTranslation(0,C.lift,0).multiply(o.matrixWorld),out);});
    const merged={};for(const b in out)if(out[b].length)merged[b]=mergeGeometries(out[b],false);return geos[id]=merged;};
  const P=m=>{prep?.(m);return m;};
  const mats={solid:P(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.4,metalness:.3,envMapIntensity:1.1})),
    glass:P(new THREE.MeshPhysicalMaterial({color:'#0b1118',metalness:.25,roughness:.04,clearcoat:1,envMapIntensity:1.8})),
    lamp:new THREE.MeshBasicMaterial({vertexColors:true})};
  const root=new THREE.Group(),batches={},ids={};
  for(const b of ['solid','glass','lamp']){
    const used=cars.filter(c=>bake(c.type)[b]);if(!used.length)continue;
    const types=[...new Set(used.map(c=>c.type))];let verts=0;for(const t of types)verts+=geos[t][b].attributes.position.count;
    const bm=new THREE.BatchedMesh(used.length,verts,0,mats[b]);bm.castShadow=b!=='lamp';bm.receiveShadow=true;
    const gid={};for(const t of types)gid[t]=bm.addGeometry(geos[t][b]);
    ids[b]=cars.map(c=>geos[c.type][b]?bm.addInstance(gid[c.type]):null);batches[b]=bm;root.add(bm);
  }
  // Wheels: one instance per wheel per car.
  const wheelsOf=cars.map(c=>bakeWheels(c.type)),wTypes=[...new Set(cars.map(c=>c.type))];
  let wVerts=0,wCount=0;for(const t of wTypes)for(const w of wheelGeos[t])wVerts+=w.geo.attributes.position.count;for(const ws of wheelsOf)wCount+=ws.length;
  const wb=new THREE.BatchedMesh(Math.max(1,wCount),Math.max(1,wVerts),0,mats.solid);wb.castShadow=wb.receiveShadow=true;root.add(wb);
  const wGid=new Map();for(const t of wTypes)wheelGeos[t].forEach(w=>wGid.set(w,wb.addGeometry(w.geo)));
  const wIds=wheelsOf.map(ws=>ws.map(w=>wb.addInstance(wGid.get(w))));
  // Rolling is measured, not animated: each frame the distance the car really
  // moved along its heading (negative when reversing) turns each wheel by
  // distance / its own radius. The front wheels steer by the curve the car is driving:
  // the steering angle for this wheelbase on that turning radius.
  const WB=cars.map(c=>{const C=cache.get(c.type);return Math.max(1,C.front-C.rear);});
  const roll=new Float64Array(cars.length),steer=new Float32Array(cars.length),last=cars.map(()=>null);
  const m4=new THREE.Matrix4(),w4=new THREE.Matrix4(),s4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0),side=new THREE.Vector3(1,0,0);
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  return {root,set(i,x,y,z,h){m4.compose(v.set(x,y,z),q.setFromAxisAngle(up,h),one);for(const b in batches){const id=ids[b][i];if(id!==null)batches[b].setMatrixAt(id,m4);}
    const L=last[i];
    if(L){const dx=x-L.x,dy=y-L.y,dz=z-L.z,along=dx*Math.sin(h)+dz*Math.cos(h),dist=Math.hypot(dx,dy,dz);
      if(dist<3){   // a jump further than that is a respawn, not driving
        const ds=Math.sign(along)*dist;roll[i]+=ds;   // distance rolled
        if(Math.abs(ds)>1e-4){const want=THREE.MathUtils.clamp(Math.atan(WB[i]*wrap(h-L.h)/ds),-.6,.6);steer[i]+=(want-steer[i])*.25;}}
      L.x=x;L.y=y;L.z=z;L.h=h;}
    else last[i]={x,y,z,h};
    wheelsOf[i].forEach((w,k)=>{w4.copy(m4).multiply(s4.makeTranslation(w.at.x,w.at.y,w.at.z));if(w.front)w4.multiply(s4.makeRotationY(steer[i]));
      w4.multiply(s4.makeRotationAxis(side,(roll[i]/w.r)%(Math.PI*2)));wb.setMatrixAt(wIds[i][k],w4);});}};
}
// Size and speed of a model, for the traffic.
export const modelType=id=>{const C=cache.get(id);return {L:C.L,W:C.Wd,speed:C.M.speed,colors:[C.paintColor]};};
