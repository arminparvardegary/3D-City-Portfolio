import * as THREE from 'three';
import { FEEL, damp } from '../motion.js';
import { THEME } from '../world/theme.js';

// Tyre marks and dust for drifts. Marks are short flat strips laid behind each
// rear wheel; each remembers when it was laid and the shader fades it out, so
// nothing is updated per frame once laid. Dust puffs rise, grow and vanish.
// Both are one instanced draw call from a fixed pool (no allocations).
const MARKS=600,PUFFS=96,SEG=.18,Y=.125;

// Options make a second, smokier instance: colour, puff size, how many and how fast.
export function createSkid(parent,{color=THEME.palette.dust,size=1,rate=22,opacity=.5,life=1.4,rise=.5}={}){
  const clock={value:0};
  // --- Marks ---------------------------------------------------------------
  const markMat=new THREE.MeshBasicMaterial({color:THEME.palette.tyreMark,transparent:true,opacity:.42,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  markMat.onBeforeCompile=s=>{
    s.uniforms.uTime=clock;s.uniforms.uLife={get value(){return FEEL.drift.markLife;}};
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float birth;\nuniform float uTime,uLife;\nvarying float vFade;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nfloat age=(uTime-birth)/uLife;vFade=birth<0.?0.:clamp(1.-age,0.,1.);vFade*=vFade;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vFade;')
      .replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.a*=vFade;if(gl_FragColor.a<.004)discard;');
  };
  const marks=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),markMat,MARKS);
  const birth=new THREE.InstancedBufferAttribute(new Float32Array(MARKS).fill(-1),1);marks.geometry.setAttribute('birth',birth);
  marks.frustumCulled=false;marks.renderOrder=1;parent.add(marks);
  const zero=new THREE.Matrix4().makeScale(0,0,0);for(let i=0;i<MARKS;i++)marks.setMatrixAt(i,zero);
  let nextMark=0,lastLaid=-1e9;const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),sc=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  // One trail per rear wheel: the last point laid, or null when lifted.
  const trails=[{x:0,z:0,on:false},{x:0,z:0,on:false}];
  function lay(tr,x,z){
    if(!tr.on){tr.on=true;tr.x=x;tr.z=z;return;}
    const dx=x-tr.x,dz=z-tr.z,len=Math.hypot(dx,dz);if(len<SEG)return;
    p.set((x+tr.x)/2,Y,(z+tr.z)/2);q.setFromAxisAngle(up,Math.atan2(dx,dz));sc.set(FEEL.drift.markWidth,1,len+.02);
    marks.setMatrixAt(nextMark,m4.compose(p,q,sc));birth.setX(nextMark,clock.value);
    marks.instanceMatrix.addUpdateRange(nextMark*16,16);birth.addUpdateRange(nextMark,1);
    marks.instanceMatrix.needsUpdate=birth.needsUpdate=true;
    nextMark=(nextMark+1)%MARKS;tr.x=x;tr.z=z;lastLaid=clock.value;
  }

  // --- Dust ----------------------------------------------------------------
  const dustMat=new THREE.MeshStandardMaterial({color,roughness:1,transparent:true,opacity,depthWrite:false});
  const dust=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.22*size,1),dustMat,PUFFS);dust.frustumCulled=false;parent.add(dust);
  const puffs=Array.from({length:PUFFS},()=>({age:9,x:0,y:0,z:0,vx:0,vz:0}));let nextPuff=0,emit=0,alive=0;
  for(let i=0;i<PUFFS;i++)dust.setMatrixAt(i,zero);
  const o=new THREE.Object3D();

  return {
    // Called once per simulation step with the rear wheel positions and how hard the car slides (0..1+).
    step(dt,wheels,slide,vx,vz){
      clock.value+=dt;
      const on=slide>FEEL.drift.slip;
      wheels.forEach((w,i)=>{if(on)lay(trails[i],w.x,w.z);else trails[i].on=false;});
      if(on&&FEEL.drift.dust>0){
        emit+=dt*FEEL.drift.dust*Math.min(2,slide)*rate;
        while(emit>=1){emit-=1;const w=wheels[nextPuff&1],s=puffs[nextPuff];nextPuff=(nextPuff+1)%PUFFS;
          s.age=0;s.x=w.x;s.y=.2;s.z=w.z;s.vx=-vx*.15+(Math.random()-.5)*.6;s.vz=-vz*.15+(Math.random()-.5)*.6;}
      }
    },
    // Called once per rendered frame. Returns true while dust is in the air or marks are still fading.
    update(dt){
      alive=0;
      for(let i=0;i<PUFFS;i++){const s=puffs[i];if(s.age>=life)continue;s.age+=dt;const k=Math.min(1,s.age/life);alive++;
        s.x+=s.vx*dt;s.z+=s.vz*dt;s.y+=dt*rise;s.vx=damp(s.vx,0,2,dt);s.vz=damp(s.vz,0,2,dt);
        o.position.set(s.x,s.y,s.z);o.scale.setScalar(k>=1?0:(.5+k*1.8)*(1-k)**1.5);o.updateMatrix();dust.setMatrixAt(i,o.matrix);}
      if(alive||dust.userData.live){dust.instanceMatrix.needsUpdate=true;dust.userData.live=alive>0;}
      return alive>0||clock.value-lastLaid<FEEL.drift.markLife;
    },
    get time(){return clock.value;},
  };
}
