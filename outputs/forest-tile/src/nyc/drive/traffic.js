import * as THREE from 'three';
import { G,HALF,LANE,network,bridgeHeight } from './layout.js';

// Taxis that live on the road network: each drives its lane on the right, picks
// a way at every crossing (never a U turn unless the road ends), turns on a
// smooth curve, waits at red lights and keeps its distance from the car ahead,
// including yours. They never appear or vanish. Drawn as instances of the
// realistic car: one draw call per material for all of them.
const STOP=HALF+4.4,CRUISE=6.2,ACCEL=3.2,BRAKE=7;

export function createTraffic({template,count=8,phase,player,seed=3}){
  const {nodes,edges}=network();
  let r=seed;const rand=()=>((r=(r*16807)%2147483647)/2147483647);
  const root=new THREE.Group();
  // Instanced meshes from the template car (its parts, already merged per material).
  const parts=[];template.updateMatrixWorld(true);
  template.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);parts.push(new THREE.InstancedMesh(g,o.material,count));});
  for(const p of parts){p.castShadow=p.receiveShadow=true;p.frustumCulled=false;root.add(p);}
  const h=e=>e.kind==='bridge'?bridgeHeight:()=>0;
  // A lane: from just after the start crossing to just before the end one.
  function lane(e){const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,rx=-fz,rz=fx;
    const s0=e.a.degree>2?STOP:HALF+1,s1=len-(e.b.degree>2?STOP:HALF+1);
    return {e,fx,fz,len:s1-s0,x0:e.a.x+fx*s0+rx*LANE,z0:e.a.z+fz*s0+rz*LANE,axis:Math.abs(fx)>.5?'x':'z',light:e.b.degree>2};}
  // The turn through a crossing: a quadratic curve from the end of one lane to the start of the next.
  function turn(L1,L2){const p0=[L1.x0+L1.fx*L1.len,L1.z0+L1.fz*L1.len],p2=[L2.x0,L2.z0],n=L1.e.b;
    const straight=Math.abs(L1.fx*L2.fx+L1.fz*L2.fz)>.9,c=straight?[(p0[0]+p2[0])/2,(p0[1]+p2[1])/2]:[n.x-L1.fz*LANE-L2.fz*LANE,n.z+L1.fx*LANE+L2.fx*LANE];
    const pts=[];for(let i=0;i<=12;i++){const t=i/12,a=(1-t)*(1-t),b=2*(1-t)*t,d=t*t;pts.push([a*p0[0]+b*c[0]+d*p2[0],a*p0[1]+b*c[1]+d*p2[1]]);}
    let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return {pts,len};}
  const next=e=>{const opts=e.b.out.filter(o=>o.b!==e.a);return opts.length?opts[Math.floor(rand()*opts.length)]:e.b.out[0];};
  // Start every taxi somewhere along a lane (spread out, never two on one).
  const roads=edges.filter(e=>e.kind==='road'),taxis=[];
  for(let i=0;i<count;i++){const e=roads[Math.floor(rand()*roads.length)];if(taxis.some(t=>t.L.e===e)){i--;continue;}
    const L=lane(e);taxis.push({L,s:L.len*(.2+rand()*.5),v:CRUISE*.6,turn:null,ts:0,nextE:null,x:0,y:0,z:0,h:0,wheel:0});}
  const o=new THREE.Object3D();
  function place(t){
    if(t.turn){const pts=t.turn.pts,k=Math.min(pts.length-1.001,t.ts/t.turn.len*(pts.length-1)),i=Math.floor(k),f=k-i,a=pts[i],b=pts[i+1];
      t.x=a[0]+(b[0]-a[0])*f;t.z=a[1]+(b[1]-a[1])*f;t.h=Math.atan2(b[0]-a[0],b[1]-a[1]);t.y=G;}
    else{const L=t.L;t.x=L.x0+L.fx*t.s;t.z=L.z0+L.fz*t.s;t.h=Math.atan2(L.fx,L.fz);t.y=G+h(L.e)(t.x);}
  }
  taxis.forEach(place);
  // Distance to the nearest thing ahead in this taxi's path (other taxis, your car).
  function gapAhead(t){
    const fx=Math.sin(t.h),fz=Math.cos(t.h);let gap=Infinity;
    const check=(x,z,y)=>{const dx=x-t.x,dz=z-t.z,along=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);if(along>0&&along<16&&side<1.9&&Math.abs(y-t.y)<2)gap=Math.min(gap,along-4.2);};
    for(const o of taxis)if(o!==t)check(o.x,o.z,o.y);
    const p=player();if(p)check(p.x,p.z,p.y??G);return gap;
  }
  function update(dt){
    const ph=phase();
    for(const t of taxis){
      let want=CRUISE;
      // Red or yellow ahead: stop at the line.
      if(!t.turn&&t.L.light&&ph[t.L.axis]!=='g'){const left=t.L.len-t.s;if(left>-.2&&left<14)want=Math.min(want,Math.max(0,(left-.6)*.9));}
      const gap=gapAhead(t);if(gap<14)want=Math.min(want,Math.max(0,gap*.8));
      t.v+=THREE.MathUtils.clamp(want-t.v,-BRAKE*dt,ACCEL*dt);t.v=Math.max(0,t.v);
      const step=t.v*dt;t.wheel+=step/.33;
      if(t.turn){t.ts+=step;if(t.ts>=t.turn.len){t.L=lane(t.nextE);t.s=t.ts-t.turn.len;t.turn=null;}}
      else{t.s+=step;if(t.s>=t.L.len){t.nextE=next(t.L.e);const L2=lane(t.nextE);t.turn=turn(t.L,L2);t.ts=t.s-t.L.len;}}
      place(t);
    }
    taxis.forEach((t,i)=>{o.position.set(t.x,t.y,t.z);o.rotation.set(0,t.h,0);o.updateMatrix();for(const p of parts)p.setMatrixAt(i,o.matrix);});
    for(const p of parts)p.instanceMatrix.needsUpdate=true;
  }
  update(0);
  // Circles your car bumps into (world units, one per taxi).
  const circles=taxis.map(()=>[0,0,1,0]);
  return {root,update,taxis,obstacles(){taxis.forEach((t,i)=>{const c=circles[i];c[0]=t.x;c[1]=t.z;c[3]=t.y-G;});return circles;}};
}
