import * as THREE from 'three';
import { seededRandom } from '../config.js';
import { TILE } from './units.js';
import { THEME } from './theme.js';

// Life in the district: people walking the boardwalk, park, campus and
// sidewalks; people sitting on benches; cyclists on the boardwalk; dogs walking
// with their owners and cats resting; birds circling over the sea and hills.
// Everything is drawn with a few instanced meshes and posed each frame, so a
// hundred figures cost only a handful of draw calls.
const G=TILE.slab;

// A path: closed polyline, sampled by distance.
function path(points,closed=true){
  const pts=points.map(p=>new THREE.Vector2(p[0],p[1]));if(closed)pts.push(pts[0].clone());
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+pts[i].distanceTo(pts[i-1]));
  const L=cum.at(-1);
  return {L,closed,at(s,out){s=closed?((s%L)+L)%L:Math.max(0,Math.min(L,s));let i=1;while(i<cum.length-1&&cum[i]<s)i++;
    const t=(s-cum[i-1])/(cum[i]-cum[i-1]||1),a=pts[i-1],b=pts[i];out.x=a.x+(b.x-a.x)*t;out.z=a.y+(b.y-a.y)*t;out.h=Math.atan2(b.x-a.x,b.y-a.y);return out;}};
}
const ellipse=(cx,cz,rx,rz,n=48)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return [cx+Math.cos(a)*rx,cz+Math.sin(a)*rz];});

export function createLife({bounds,benches,prep}){
  const rand=seededRandom(2024),P=THEME.people,group=new THREE.Group();group.name='life';
  const mat=(extra={})=>{const m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.7,...extra});prep?.(m);return m;};
  const clothes=mat(),skin=mat(),dark=mat({color:'#3a3f4f'}),fur=mat(),bikeMat=mat({color:'#3f4a5a',metalness:.3}),birdMat=mat({color:'#fbfbfb',side:THREE.DoubleSide});
  // Walkers and sitters share the same body parts.
  const PATHS={
    boardwalk:path([[bounds.x0+8,51.2],[bounds.x1-7,51.2]],false),
    park:path(ellipse(-16,10,13.55,8.55)),
    walk:path([[-36,10],[7,10],[8.6,10.6],[11.4,10.6],[13,10],[24,10]],false),
    campus:path([[20,8],[40,8],[40,22],[20,22]]),
    sidewalk:path([[-37,27.4],[47,27.4]],false),
    pond:path(ellipse(-27,0,6.6,4.6,36)),
  };
  const walkers=[],plan=[['boardwalk',16],['park',10],['walk',5],['campus',7],['sidewalk',5],['pond',4]];
  for(const [p,n] of plan)for(let i=0;i<n;i++)walkers.push({path:PATHS[p],s:rand()*PATHS[p].L,dir:PATHS[p].closed?(rand()<.5?1:-1):(rand()<.5?1:-1),
    speed:.65+rand()*.35,side:(rand()-.5)*1.1,phase:rand()*6.28,h:.95+rand()*.12,skin:P.skin[Math.floor(rand()*P.skin.length)],cloth:P.clothes[Math.floor(rand()*P.clothes.length)],
    pants:P.clothes[Math.floor(rand()*P.clothes.length)],dog:rand()<.18});
  const seats=[];for(const [x,z,yaw] of benches)if(rand()<.55){const n=rand()<.35?2:1;for(let k=0;k<n;k++)seats.push({x:x+Math.cos(yaw)*(n===2?(k?.22:-.22):0),z:z-Math.sin(yaw)*(n===2?(k?.22:-.22):0),yaw,
    skin:P.skin[Math.floor(rand()*P.skin.length)],cloth:P.clothes[Math.floor(rand()*P.clothes.length)],pants:P.clothes[Math.floor(rand()*P.clothes.length)]});}
  const riders=Array.from({length:5},(_,i)=>({path:PATHS.boardwalk,s:rand()*PATHS.boardwalk.L,dir:i%2?1:-1,speed:2.2+rand()*.6,side:i%2?.9:-.9,
    skin:P.skin[Math.floor(rand()*P.skin.length)],cloth:P.clothes[Math.floor(rand()*P.clothes.length)]}));
  const cats=[[bounds.x0+20,52.6],[-12,22.5],[33,23.5],[60,50.2]];
  const people=walkers.length+seats.length+riders.length,dogs=walkers.filter(w=>w.dog).length;

  const torso=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.14,.46,8).translate(0,.23,0),clothes,people);
  const head=new THREE.InstancedMesh(new THREE.SphereGeometry(.105,10,8),skin,people);
  const leg=new THREE.InstancedMesh(new THREE.BoxGeometry(.075,.42,.08).translate(0,-.21,0),clothes,people*2);
  const bike=new THREE.InstancedMesh(new THREE.TorusGeometry(.2,.025,5,14),bikeMat,riders.length*2);
  const frame=new THREE.InstancedMesh(new THREE.BoxGeometry(.04,.04,.62),bikeMat,riders.length);
  const dogBody=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,.15,.38),fur,dogs+cats.length);
  const dogHead=new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.13,.14),fur,dogs+cats.length);
  const birdGeo=new THREE.BufferGeometry();birdGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.12, -.35,0,-.05, 0,0,-.08, 0,0,.12, 0,0,-.08, .35,0,-.05],3));birdGeo.computeVertexNormals();
  const birds=new THREE.InstancedMesh(birdGeo,birdMat,14);
  for(const im of [torso,head,leg,bike,frame,dogBody,dogHead,birds]){im.castShadow=im!==birds;im.receiveShadow=false;im.frustumCulled=false;group.add(im);}
  const c=new THREE.Color(),o=new THREE.Object3D(),q=new THREE.Vector3(),pose={x:0,z:0,h:0};
  // Colours are fixed per figure: set once.
  let k=0;
  for(const p of [...walkers,...seats,...riders]){torso.setColorAt(k,c.set(p.cloth));head.setColorAt(k,c.set(p.skin));leg.setColorAt(2*k,c.set(p.pants??'#3a3f4f'));leg.setColorAt(2*k+1,c.set(p.pants??'#3a3f4f'));k++;}
  const furs=['#c98b4f','#f2ede4','#5b4636','#2f2f36','#e0b878','#9a9aa3'];for(let i=0;i<dogs+cats.length;i++){dogBody.setColorAt(i,c.set(furs[i%furs.length]));dogHead.setColorAt(i,c.set(furs[i%furs.length]));}
  const setM=(im,i,x,y,z,ry=0,rx=0,sx=1,sy=1,sz=1)=>{o.position.set(x,y,z);o.rotation.set(rx,ry,0,'YXZ');o.scale.set(sx,sy,sz);o.updateMatrix();im.setMatrixAt(i,o.matrix);};
  const figure=(i,x,z,yaw,{walk=0,sit=false,h=1})=>{
    const hip=G+(sit?.38:.44*h);
    setM(torso,i,x,hip,z,yaw,0,1,h,1);setM(head,i,x,hip+.46*h+.1,z,yaw);
    if(sit){for(const s of [-1,1])setM(leg,2*i+(s>0),x+Math.cos(yaw)*s*.07+Math.sin(yaw)*.02,hip,z-Math.sin(yaw)*s*.07+Math.cos(yaw)*.02,yaw,-1.45);}
    else for(const s of [-1,1])setM(leg,2*i+(s>0),x+Math.cos(yaw)*s*.07,hip,z-Math.sin(yaw)*s*.07,yaw,Math.sin(walk)*.5*s,1,h,1);
  };
  const flock=Array.from({length:14},(_,i)=>({cx:i<8?bounds.x0+30:bounds.x1-20,cz:i<8?bounds.z0+18:bounds.z1+14,r:5+(i%4)*1.6,y:7+(i%5)*.8,w:(i%2?1:-1)*(.35+(i%3)*.08),p:i*.8}));

  return {group,update(t,dt){
    let i=0,d=0;
    for(const w of walkers){
      w.s+=w.dir*w.speed*dt;if(!w.path.closed&&(w.s<0||w.s>w.path.L)){w.dir*=-1;w.s=Math.max(0,Math.min(w.path.L,w.s));}
      w.path.at(w.s,pose);const yaw=pose.h+(w.dir<0?Math.PI:0),nx=Math.cos(pose.h),nz=-Math.sin(pose.h);
      const x=pose.x+nx*w.side,z=pose.z+nz*w.side,walk=w.s*6+w.phase;
      figure(i++,x,z,yaw,{walk,h:w.h});
      if(w.dog){const dx=x+Math.cos(yaw)*.45-Math.sin(yaw)*.2,dz=z-Math.sin(yaw)*.45-Math.cos(yaw)*.2,bob=Math.abs(Math.sin(walk*1.6))*.03;
        setM(dogBody,d,dx,G+.2+bob,dz,yaw);setM(dogHead,d,dx+Math.sin(yaw)*.24,G+.3+bob,dz+Math.cos(yaw)*.24,yaw);d++;}
    }
    for(const s of seats)figure(i++,s.x,s.z,s.yaw,{sit:true});
    for(let r=0;r<riders.length;r++){const b=riders[r];b.s+=b.dir*b.speed*dt;if(b.s<0||b.s>b.path.L){b.dir*=-1;b.s=Math.max(0,Math.min(b.path.L,b.s));}
      b.path.at(b.s,pose);const yaw=pose.h+(b.dir<0?Math.PI:0),x=pose.x+Math.cos(pose.h)*b.side,z=pose.z-Math.sin(pose.h)*b.side,fx=Math.sin(yaw),fz=Math.cos(yaw);
      for(const s of [-1,1])setM(bike,2*r+(s>0),x+fx*s*.3,G+.2,z+fz*s*.3,yaw+Math.PI/2,0,1,1,1);
      setM(frame,r,x,G+.38,z,yaw);figure(i,x,z,yaw,{walk:b.s*4,h:.95});setM(torso,i,x,G+.62,z,yaw,.35);setM(head,i,x+fx*.12,G+1.12,z+fz*.12,yaw);i++;}
    for(const [x,z] of cats){const tail=Math.sin(t*2+x)*.2;setM(dogBody,d,x,G+.09,z,tail,0,.7,.6,.7);setM(dogHead,d,x,G+.18,z+.18,tail,0,.8,.8,.8);d++;}
    flock.forEach((b,j)=>{const a=t*b.w+b.p;q.set(b.cx+Math.cos(a)*b.r,b.y+Math.sin(t*.7+j)*.4,b.cz+Math.sin(a)*b.r);
      o.position.copy(q);o.rotation.set(0,-a+(b.w>0?0:Math.PI),Math.sin(t*9+j)*.6,'YXZ');o.scale.set(1,1,1);o.updateMatrix();birds.setMatrixAt(j,o.matrix);});
    for(const im of [torso,head,leg,bike,frame,dogBody,dogHead,birds])im.instanceMatrix.needsUpdate=true;
    torso.instanceColor.needsUpdate=head.instanceColor.needsUpdate=leg.instanceColor.needsUpdate=false;
  },materials:[clothes,skin,dark,fur,bikeMat,birdMat],count:{people,dogs,cats:cats.length,birds:14}};
}
