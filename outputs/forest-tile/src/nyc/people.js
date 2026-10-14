import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// People walking the sidewalks (world units): each walks round the edge of a
// block, a little in from the curb, at their own pace, bobbing with each step.
// Two instanced meshes for everyone: the clothes (coloured per person) and the
// rest (skin, trousers, hair). No allocations per frame.
const SHIRTS=['#ff6b5e','#5ab4f0','#3fb8a8','#f2b705','#a77be0','#ff8a4c','#f6f4f0','#2f3440','#e86fa0','#7fc6b0'];

export function createPeople({loops,perLoop=4,seed=7}){
  const root=new THREE.Group();
  let r=seed;const rand=()=>((r=(r*16807)%2147483647)/2147483647);
  const col=(g,c)=>{g=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');const cc=new THREE.Color(c),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=cc.r;a[i+1]=cc.g;a[i+2]=cc.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;};
  // About 1.7 tall next to a car about 3 long. Built facing +z.
  const clothes=mergeGeometries([new THREE.CylinderGeometry(.2,.24,.62,6).translate(0,1.05,0)].map(g=>col(g,'#ffffff')));
  const people=[];
  const rest=mergeGeometries([
    col(new THREE.BoxGeometry(.13,.7,.15).translate(-.09,.35,0),'#3b3f4c'),col(new THREE.BoxGeometry(.13,.7,.15).translate(.09,.35,0),'#3b3f4c'),
    col(new THREE.IcosahedronGeometry(.17,0).translate(0,1.53,0),'#e2b48f'),col(new THREE.BoxGeometry(.3,.1,.3).translate(0,1.67,-.02),'#3a2a22'),
  ]);
  // Paths: closed rectangles, inset from each block's edge.
  for(const L of loops){
    const pts=[[L.x0,L.z0],[L.x1,L.z0],[L.x1,L.z1],[L.x0,L.z1]],len=2*((L.x1-L.x0)+(L.z1-L.z0));
    for(let k=0;k<perLoop;k++)people.push({L,pts,len,s:rand()*len,v:(.9+rand()*.6)*(rand()<.5?1:-1),phase:rand()*6,shirt:SHIRTS[Math.floor(rand()*SHIRTS.length)]});
  }
  const body=new THREE.InstancedMesh(clothes,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.8}),people.length);
  const legs=new THREE.InstancedMesh(rest,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.8}),people.length);
  people.forEach((p,i)=>body.setColorAt(i,new THREE.Color(p.shirt)));
  for(const m of [body,legs]){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;root.add(m);}
  const o=new THREE.Object3D();
  // Where along the loop: position and heading.
  function at(p){
    let s=((p.s%p.len)+p.len)%p.len;
    for(let i=0;i<4;i++){const [ax,az]=p.pts[i],[bx,bz]=p.pts[(i+1)%4],seg=Math.abs(bx-ax)+Math.abs(bz-az);
      if(s<=seg){const t=s/seg;o.position.set(ax+(bx-ax)*t,p.L.y,az+(bz-az)*t);const dx=(bx-ax)*Math.sign(p.v),dz=(bz-az)*Math.sign(p.v);o.rotation.set(0,Math.atan2(dx,dz),0);return;}s-=seg;}
  }
  let time=0;
  function update(dt){
    time+=dt;
    people.forEach((p,i)=>{p.s+=p.v*dt;at(p);
      const step=time*Math.abs(p.v)*4.2+p.phase;o.position.y+=Math.abs(Math.sin(step))*.06;o.rotation.z=Math.sin(step)*.04;
      o.updateMatrix();body.setMatrixAt(i,o.matrix);legs.setMatrixAt(i,o.matrix);});
    body.instanceMatrix.needsUpdate=legs.instanceMatrix.needsUpdate=true;
  }
  update(0);
  return {root,update,count:people.length};
}
