import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// People walking the sidewalks (world units: 1 unit is about 1.5 m, so a person
// of 1.75 m is about 1.17 tall). Each person has a torso, hips, a head with hair,
// and legs and arms that swing from the hips and shoulders as they walk, with
// the body bobbing on each step. Skin tones, hair, tops and trousers vary, and
// so does height. Every part is one instanced mesh for everyone (seven draw
// calls in all); colours are per person.
const SKIN=['#f1d3bd','#e6b896','#cf9a72','#a8704b','#7c4f33','#563726'];
const HAIR=['#1e1612','#3a2a1e','#5c4130','#8a6a46','#c9a46a','#9a9a9a','#2b2b2b'];
const TOPS=['#2f3a4f','#7a2430','#e8e6e0','#3d6b55','#c9a86a','#1f1f22','#5b7fa8','#b85c38','#8b8f96','#d8b4c0','#284f8f','#6a4c8c'];
const BOTTOMS=['#23272f','#3a4458','#5a4b3a','#1b1b1d','#6b7280','#2d3a55','#7a6a58'];
const U=1/1.5;   // metres to world units

export function createPeople({loops,perLoop=3,seed=7}){
  const root=new THREE.Group();
  let r=seed;const rand=()=>((r=(r*16807)%2147483647)/2147483647),pick=a=>a[Math.floor(rand()*a.length)];
  // Parts, in metres, each with its pivot at the origin (legs hang from the hip, arms from the shoulder).
  const cap=(rad,len,segs=7)=>new THREE.CapsuleGeometry(rad,len,2,segs);
  const vc=(g,c)=>{g=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');const col=new THREE.Color(c),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=col.r;a[i+1]=col.g;a[i+2]=col.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;};
  const geo={
    torso:mergeGeometries([vc(cap(.17,.34).scale(1.15,1,.72).translate(0,1.24,0),'#ffffff'),vc(new THREE.CylinderGeometry(.06,.07,.08,10).translate(0,1.55,0),'#ffffff')]),
    hips:vc(cap(.15,.12).scale(1.12,1,.75).translate(0,.95,0),'#ffffff'),
    leg:mergeGeometries([vc(cap(.075,.74).translate(0,-.43,0),'#ffffff'),vc(new THREE.BoxGeometry(.11,.08,.27).translate(0,-.88,.05),'#1a1a1c')]),
    arm:mergeGeometries([vc(cap(.055,.5).translate(0,-.3,0),'#ffffff'),vc(new THREE.SphereGeometry(.055,6,4).translate(0,-.62,0),'#e3b896')]),
    head:vc(new THREE.SphereGeometry(.105,10,8).scale(.92,1.08,1).translate(0,1.69,0),'#ffffff'),
    hair:vc(new THREE.SphereGeometry(.112,10,6,0,Math.PI*2,0,Math.PI*.55).scale(.95,1.08,1.05).translate(0,1.7,-.01),'#ffffff'),
  };
  for(const k in geo)geo[k].scale(U,U,U);
  // Walkers: closed rectangles, inset from each block's edge.
  const people=[];
  for(const L of loops){
    const pts=[[L.x0,L.z0],[L.x1,L.z0],[L.x1,L.z1],[L.x0,L.z1]],len=2*((L.x1-L.x0)+(L.z1-L.z0));
    for(let k=0;k<perLoop;k++){const speed=(1.1+rand()*.5)*U;
      people.push({L,pts,len,s:rand()*len,v:speed*(rand()<.5?1:-1),phase:rand()*6,scale:.92+rand()*.16,
        skin:pick(SKIN),hair:pick(HAIR),top:pick(TOPS),bottom:pick(BOTTOMS)});}
  }
  const N=people.length,mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.75});
  const make=(g,count)=>{const m=new THREE.InstancedMesh(g,mat,count);m.castShadow=m.receiveShadow=true;m.frustumCulled=false;root.add(m);return m;};
  const M={torso:make(geo.torso,N),hips:make(geo.hips,N),head:make(geo.head,N),hair:make(geo.hair,N),leg:make(geo.leg,N*2),arm:make(geo.arm,N*2)};
  const c=new THREE.Color();
  people.forEach((p,i)=>{M.torso.setColorAt(i,c.set(p.top));M.hips.setColorAt(i,c.set(p.bottom));M.head.setColorAt(i,c.set(p.skin));M.hair.setColorAt(i,c.set(p.hair));
    for(const k of [0,1]){M.leg.setColorAt(i*2+k,c.set(p.bottom));M.arm.setColorAt(i*2+k,c.set(p.top));}});
  const base=new THREE.Matrix4(),part=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),pos=new THREE.Vector3(),sc=new THREE.Vector3(),one=new THREE.Vector3(1,1,1);
  const HIP=.95*U,SHOULDER=1.47*U;
  let time=0;
  function update(dt){
    time+=dt;
    people.forEach((p,i)=>{
      p.s+=p.v*dt;let s=((p.s%p.len)+p.len)%p.len,x=0,z=0,h=0;
      for(let k=0;k<4;k++){const [ax,az]=p.pts[k],[bx,bz]=p.pts[(k+1)%4],seg=Math.abs(bx-ax)+Math.abs(bz-az);
        if(s<=seg){const t=s/seg;x=ax+(bx-ax)*t;z=az+(bz-az)*t;h=Math.atan2((bx-ax)*Math.sign(p.v),(bz-az)*Math.sign(p.v));break;}s-=seg;}
      // Gait: a stride per step, legs and arms opposite, a small bob and sway.
      const ph=time*Math.abs(p.v)/U*3.4+p.phase,swing=Math.sin(ph),bob=Math.abs(Math.cos(ph))*.025*U;
      base.compose(pos.set(x,p.L.y+bob,z),q.setFromEuler(e.set(0,h,Math.sin(ph)*.025)),sc.set(p.scale,p.scale,p.scale));
      M.torso.setMatrixAt(i,base);M.hips.setMatrixAt(i,base);M.head.setMatrixAt(i,base);M.hair.setMatrixAt(i,base);
      for(const k of [0,1]){const sd=k?1:-1;
        part.compose(pos.set(sd*.1*U,HIP,0),q.setFromEuler(e.set(swing*sd*.42,0,0)),one);M.leg.setMatrixAt(i*2+k,part.premultiply(base));
        part.compose(pos.set(sd*.22*U,SHOULDER,0),q.setFromEuler(e.set(-swing*sd*.38,0,sd*.06)),one);M.arm.setMatrixAt(i*2+k,part.premultiply(base));}
    });
    for(const m of Object.values(M))m.instanceMatrix.needsUpdate=true;
  }
  update(0);
  return {root,update,count:N};
}
