import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldUV } from '../world/textures.js';

// A tiny low poly modelling kit: place geometries in world space, they are
// bucketed per material and merged into one mesh each at finish(). Materials are
// flat shaded; a material with a facade texture gets world space UVs, so
// windows keep one size on every building.
export function createKit(){
  const mats=new Map(),buckets=new Map();
  const mat=(color,extra={})=>{const key=color+JSON.stringify(extra,(k,v)=>v?.isTexture?v.uuid:v);
    if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0,flatShading:true,...extra}));return mats.get(key);};
  const resolve=m=>m?.isMaterial?m:mat(...[].concat(m));
  const put=(g,m)=>{g=g.index?g.toNonIndexed():g;
    if(m.map){worldUV(g,m.userData.uvSize??1);}else g.deleteAttribute('uv');
    if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g);};
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1);
  const add=(g,m,[x,y,z]=[0,0,0],[rx=0,ry=0,rz=0]=[],s=one)=>{q.setFromEuler(e.set(rx,ry,rz));put(g.applyMatrix4(m4.compose(v.set(x,y,z),q,s)),resolve(m));};
  const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d).translate(0,h/2,0);
  // A box or cylinder by its bottom centre.
  const box=(w,h,d,x,y,z,m,r)=>add(B(w,h,d),m,[x,y,z],r);
  const cyl=(rt,rb,h,seg,x,y,z,m,r)=>add(new THREE.CylinderGeometry(rt,rb,h,seg).translate(0,h/2,0),m,[x,y,z],r);
  // A group of parts with its own position and heading (cars, figures, statues).
  function part(x,y,z,yaw,build,scale=1){
    const pm=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(scale,scale,scale));
    build((g,m,p=[0,0,0],r=[])=>{q.setFromEuler(e.set(r[0]??0,r[1]??0,r[2]??0));g.applyMatrix4(m4.compose(v.set(...p),q,one));g.applyMatrix4(pm);put(g,resolve(m));});
  }
  function finish(root){
    for(const [m,geos] of buckets){const mesh=new THREE.Mesh(mergeGeometries(geos,false),m);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);for(const g of geos)g.dispose();}
    buckets.clear();return root;
  }
  return {mat,add,box,cyl,part,B,finish};
}

// Facade textures: white with a window grid, tinted by the material colour.
// One texture tile is `size` world units (one window bay and one floor).
export function facade(kind){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  if(kind==='glass'){
    g.fillStyle='#c9d6e6';g.fillRect(0,0,64,64);const sheen=g.createLinearGradient(0,0,64,64);sheen.addColorStop(0,'rgba(255,255,255,.35)');sheen.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sheen;g.fillRect(0,0,64,64);
    g.fillStyle='#ffffff';g.fillRect(0,0,64,4);g.fillRect(0,0,3,64);
  }else{
    g.fillStyle='#ffffff';g.fillRect(0,0,64,64);g.fillStyle='rgba(58,62,82,.9)';
    if(kind==='brick'){g.fillRect(8,14,20,36);g.fillRect(36,14,20,36);}
    else if(kind==='deco'){g.fillRect(22,4,20,56);}                       // tall vertical strips (Empire, Chrysler)
    else g.fillRect(16,14,32,36);
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.magFilter=THREE.NearestFilter;return t;
}
