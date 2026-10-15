import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The cars of New York: "Free Low Poly Vehicles Pack" by Rgsdev (CC0, public
// domain, credit not required). 21 FBX models in centimetres, nose toward +z,
// four separate wheels each. Loaded once at start; each model is turned into
// real materials (clearcoat paint, reflective glass, glowing head and tail
// lights) and measured (length, width, wheel radius, axles) for the driving.
export const MODELS=[
  {id:'sports',name:'Sports',speed:9},{id:'roadster',name:'Roadster',speed:8.6},{id:'muscle',name:'Muscle',speed:8.4},{id:'muscle-2',name:'Muscle 2',speed:8.2},
  {id:'sedan',name:'Sedan',speed:7},{id:'hatchback',name:'Hatchback',speed:6.6},{id:'limousine',name:'Limousine',speed:6},{id:'suv',name:'SUV',speed:6.8},
  {id:'pickup',name:'Pickup',speed:6.4},{id:'van',name:'Van',speed:5.8},{id:'taxi',name:'Taxi',speed:7},{id:'police-sedan',name:'Police Sedan',speed:7.6},
  {id:'police-sports',name:'Police Sports',speed:8.6},{id:'police-suv',name:'Police SUV',speed:7.2},{id:'police-muscle',name:'Police Muscle',speed:8.2},
  {id:'ambulance',name:'Ambulance',speed:6.4},{id:'firetruck',name:'Firetruck',speed:5.4},{id:'bus',name:'Bus',speed:4.8},{id:'truck',name:'Truck',speed:5},
  {id:'truck-with-trailer',name:'Truck with trailer',speed:4.6},{id:'monster-truck',name:'Monster Truck',speed:6.2},
];
const SCALE=1/150;   // centimetres to world units (one unit is about 1.5 m)
const cache=new Map();

// Material by its name in the FBX.
function convert(m){
  const n=(m.name||'').toLowerCase(),c=m.color?.clone()??new THREE.Color('#888');
  if(n.includes('window'))return {kind:'glass',mat:new THREE.MeshPhysicalMaterial({color:'#0b1118',metalness:.25,roughness:.04,clearcoat:1,envMapIntensity:1.8})};
  if(n.includes('headlight'))return {kind:'lamp',mat:new THREE.MeshStandardMaterial({color:'#f6f8ff',emissive:'#fff1d0',emissiveIntensity:2.6})};
  if(n.includes('rear light')||n.includes('rearlight')||n.includes('brake'))return {kind:'lamp',mat:new THREE.MeshStandardMaterial({color:'#5a0006',emissive:'#ff2418',emissiveIntensity:1.8})};
  if(n.includes('light')||n.includes('siren'))return {kind:'lamp',mat:new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:2})};
  if(n.includes('tire')||n.includes('tyre'))return {kind:'solid',mat:new THREE.MeshStandardMaterial({color:'#121316',roughness:.85})};
  if(n.includes('wheel')||n.includes('rim')||n.includes('chrome'))return {kind:'solid',mat:new THREE.MeshStandardMaterial({color:c.getHex()?c:'#c4c8ce',metalness:.9,roughness:.25,envMapIntensity:1.5})};
  const hsl={};c.getHSL(hsl);
  if(n.startsWith('body')&&hsl.s>.15&&hsl.l>.04&&hsl.l<.95)return {kind:'paint',mat:new THREE.MeshPhysicalMaterial({color:c,metalness:.45,roughness:.3,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.2})};
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
    root.traverse(o=>{if(!o.isMesh)return;
      const mats=[].concat(o.material).map(m=>{const r=convert(m);prep?.(r.mat);if(r.kind==='paint'&&!paintColor)paintColor='#'+r.mat.color.getHexString();return r;});
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
    const spin=new THREE.Group();pivot.add(spin);spin.userData.steer=pivot;spin.userData.front=w.front;
    // Keep the wheel exactly where it was, now turning about its own centre.
    copy.updateMatrixWorld(true);const m=mesh.matrixWorld.clone();mesh.removeFromParent();
    const inv=new THREE.Matrix4().makeTranslation(-w.c.x,-(w.c.y+C.lift),-w.c.z);mesh.matrix.copy(inv.multiply(m));mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);spin.add(mesh);
    spins.push(spin);}
  body.add(copy);
  paint=paint??new THREE.MeshPhysicalMaterial({color:C.paintColor});
  return {rig,car:body,wheels:spins,paint,color:C.paintColor,name:C.M.name,wheelR:C.wheelR,wheelbase:C.front-C.rear,rearZ:C.rear,track:C.track,length:C.L,width:C.Wd};
}

// Traffic: every model merged into three batches (body, glass, lights), each
// coloured by its materials, so all the traffic is three draw calls.
export function createModelFleet({cars,prep}){
  const geos={};
  const bake=(id)=>{if(geos[id])return geos[id];const C=cache.get(id),out={solid:[],glass:[],lamp:[]};C.root.updateMatrixWorld(true);
    C.root.traverse(o=>{if(!o.isMesh)return;const g0=o.geometry,mats=[].concat(o.material),k=o.userData.kinds||[];
      const groups=g0.groups.length?g0.groups:[{start:0,count:g0.index?g0.index.count:g0.attributes.position.count,materialIndex:0}];
      for(const gr of groups){const kind=k[gr.materialIndex]??'solid',bucket=kind==='paint'?'solid':kind,mat=mats[gr.materialIndex]??mats[0];
        let g=g0.index?g0.toNonIndexed():g0.clone();const st=g0.index?gr.start:gr.start,ct=gr.count;
        const pos=g.attributes.position.array.slice(st*3,(st+ct)*3),nor=g.attributes.normal?.array.slice(st*3,(st+ct)*3);
        const sub=new THREE.BufferGeometry();sub.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));if(nor)sub.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));else sub.computeVertexNormals();
        const col=new Float32Array(ct*3),c=mat.color||new THREE.Color('#fff');for(let i=0;i<ct;i++)col.set([c.r,c.g,c.b],i*3);sub.setAttribute('color',new THREE.BufferAttribute(col,3));
        sub.applyMatrix4(new THREE.Matrix4().makeTranslation(0,C.lift,0).multiply(o.matrixWorld));out[bucket].push(sub);g.dispose();}});
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
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0);
  return {root,set(i,x,y,z,h){m4.compose(v.set(x,y,z),q.setFromAxisAngle(up,h),one);for(const b in batches){const id=ids[b][i];if(id!==null)batches[b].setMatrixAt(id,m4);}}};
}
// Size and speed of a model, for the traffic.
export const modelType=id=>{const C=cache.get(id);return {L:C.L,W:C.Wd,speed:C.M.speed,colors:[C.paintColor]};};
