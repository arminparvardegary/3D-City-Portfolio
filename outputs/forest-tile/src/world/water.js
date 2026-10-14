import * as THREE from 'three';
import { seededRandom } from '../config.js';
import { THEME } from './theme.js';
import { box, mesh, tint, mergeStatic } from '../geometry.js';
import { RIVER } from './terrain.js';
import { waterNormal } from './textures.js';

// Water that moves: the sea around the island (gentle swells computed on the
// GPU, shallow turquoise near the shore, deep blue offshore, a line of foam
// along the beach), the river with its current, the waterfall, and ships and
// boats that cruise and bob on the swell.
export const waterTime={value:0};

function seaMaterial(island,prep){
  // Ripples: a scrolling normal map over the swell, so the sea catches the sky and the sun.
  const ripples=waterNormal().clone();ripples.needsUpdate=true;ripples.repeat.set(70,56);
  const W=THEME.water,m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.07,metalness:0,normalMap:ripples,normalScale:new THREE.Vector2(.35,.35),envMapIntensity:1.1});m.userData.ripples=ripples;
  m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{uTime:waterTime,uIsland:{value:new THREE.Vector4(island.x0,island.z0,island.x1,island.z1)},
      uDeep:{value:new THREE.Color(W.deep)},uShallow:{value:new THREE.Color(W.shallow)},uFoam:{value:new THREE.Color(W.foam)}});
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform float uTime;uniform vec4 uIsland;varying float vShore;varying vec2 vXZ;
      float wave(vec2 p){return sin(p.x*.18+uTime*.9)*.09+sin(p.y*.23-uTime*.7)*.07+sin((p.x+p.y)*.41+uTime*1.6)*.03;}
      float shoreDist(vec2 p){vec2 d=max(vec2(uIsland.x,uIsland.y)-p,p-vec2(uIsland.z,uIsland.w));return length(max(d,0.))+min(max(d.x,d.y),0.);}`)
    .replace('#include <beginnormal_vertex>',`vec2 pw=position.xz;float e=.6;
      vec3 objectNormal=normalize(vec3(-(wave(pw+vec2(e,0.))-wave(pw-vec2(e,0.)))/(2.*e),1.,-(wave(pw+vec2(0.,e))-wave(pw-vec2(0.,e)))/(2.*e)));
      #ifdef USE_TANGENT
      vec3 objectTangent=vec3(tangent.xyz);
      #endif`)
    .replace('#include <begin_vertex>',`vec3 transformed=vec3(position);float calm=smoothstep(.0,6.,shoreDist(position.xz));
      transformed.y+=wave(position.xz)*(.35+.65*calm);vShore=shoreDist(position.xz);vXZ=position.xz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform float uTime;uniform vec3 uDeep,uShallow,uFoam;varying float vShore;varying vec2 vXZ;`)
    .replace('#include <color_fragment>',`#include <color_fragment>
      float depth=smoothstep(0.,26.,vShore);vec3 water=mix(uShallow,uDeep,depth);
      float foam=(1.-smoothstep(.0,1.3,vShore))*(.65+.35*sin(vXZ.x*1.3+vXZ.y*.9+uTime*2.2));
      diffuseColor.rgb=mix(water,uFoam,clamp(foam,0.,1.));`);
  };
  m.customProgramCacheKey=()=>'sea-v1';prep?.(m);return m;
}

// Flowing water: stripes drift along the flow so the river and waterfall move.
function flowMaterial(color,dir,speed,prep){
  const rip=waterNormal().clone();rip.needsUpdate=true;rip.repeat.set(2,24);
  const m=new THREE.MeshStandardMaterial({color,roughness:.08,metalness:0,normalMap:rip,normalScale:new THREE.Vector2(.25,.25)});m.userData.ripples=rip;
  m.onBeforeCompile=shader=>{
    shader.uniforms.uTime=waterTime;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uTime;varying vec3 vW;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        float f=dot(vW,vec3(${dir.join(',')}));float s=sin(f*2.6-uTime*${speed.toFixed(2)})*sin(f*1.1+vW.x*3.1+vW.z*2.3-uTime*${(speed*.6).toFixed(2)});
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),smoothstep(.55,.95,s)*.45);`);
  };
  m.customProgramCacheKey=()=>`flow-${dir}-${speed}`;prep?.(m);return m;
}

export function buildWater({bounds,prep}){
  const group=new THREE.Group();group.name='water';const W=THEME.water;
  const island={x0:bounds.x0-1.5,z0:bounds.z0-1.5,x1:bounds.x1+1.5,z1:bounds.z1+1.5};
  const cx=(bounds.x0+bounds.x1)/2,cz=(bounds.z0+bounds.z1)/2;
  // Sea: one large plane; dense enough near the island for smooth swells.
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(520,420,170,140).rotateX(-Math.PI/2).translate(cx,-.08,cz),seaMaterial(island,prep));
  sea.receiveShadow=false;group.add(sea);   // shadows on open water cost a full screen of shadow lookups for no visible gain
  // River surface from the pool to the sea, and the pool under the waterfall.
  const R=RIVER,len=bounds.z1+1.5-R.zStart;
  const river=flowMaterial(W.river,[0,0,1],2.2,prep);
  // The water sits just above the island's sand body and below the lawn, so it reads as a sunken channel.
  mesh(group,new THREE.PlaneGeometry(R.x1-R.x0-.1,len).rotateX(-Math.PI/2),river,[(R.x0+R.x1)/2,.095,R.zStart+len/2]).castShadow=false;
  mesh(group,new THREE.CircleGeometry(3.2,40).rotateX(-Math.PI/2),river,[10,.1,-20.6]).castShadow=false;
  // Waterfall: a curtain falling from the cliff into the pool, with foam at its foot.
  const fall=flowMaterial(W.fall,[0,1,0],-6,prep);
  mesh(group,new THREE.PlaneGeometry(2.2,6.8,1,8),fall,[10,3.4,-23.3],[-.12,0,0]).castShadow=false;
  const foam=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.6});prep?.(foam);
  const puffs=new THREE.Group();group.add(puffs);const rand=seededRandom(9);
  for(let i=0;i<9;i++)mesh(puffs,new THREE.IcosahedronGeometry(.35+rand()*.25,0),foam,[9+rand()*2,.18,-22.6+rand()*.9]);
  const drift=[sea.material.userData.ripples,river.userData.ripples];
  return {group,update(t){waterTime.value=t;drift[0].offset.set(t*.006,t*.004);drift[1].offset.set(0,-t*.05);},materials:[sea.material,river,fall,foam]};
}

// --- Ships and boats --------------------------------------------------------
function shipMaterials(prep){
  const make=(c,x={})=>{const m=new THREE.MeshStandardMaterial({color:c,roughness:.6,vertexColors:true,...x});prep?.(m);return m;};
  return {hull:make('#2f3650'),hullRed:make('#d9534f'),white:make('#ffffff'),deck:make('#c99a6b'),glass:make('#3f8fa8',{roughness:.3}),
    stripe:make('#3b82e0'),funnel:make('#ff8a5c'),containers:['#ff6b5e','#5ab4f0','#ffc93a','#5fcf87','#a77be0'].map(c=>make(c)),sail:make('#fffdf6'),mast:make('#7a5238')};
}
function hullShape(L,W){const s=new THREE.Shape();s.moveTo(-L/2,-W/2);s.lineTo(L/2-W*.9,-W/2);s.quadraticCurveTo(L/2+W*.15,0,L/2-W*.9,W/2);s.lineTo(-L/2,W/2);s.closePath();return s;}
function hull(parent,M,L,W,H,top,bottom){
  const g=new THREE.ExtrudeGeometry(hullShape(L,W),{depth:H,bevelEnabled:false}).rotateX(Math.PI/2).translate(0,H,0);
  mesh(parent,tint(g),top);const k=new THREE.ExtrudeGeometry(hullShape(L*.97,W*.94),{depth:.4,bevelEnabled:false}).rotateX(Math.PI/2).translate(0,.25,0);mesh(parent,tint(k),bottom);
}
function cargoShip(M){
  const g=new THREE.Group();hull(g,M,22,4.4,1.5,M.hull,M.hullRed);
  const rand=seededRandom(4);
  for(let x=-7;x<6;x+=1.6)for(let row=-1;row<=1;row++)for(let lvl=0;lvl<1+Math.floor(rand()*3);lvl++)
    box(g,[1.45,.62,1.1],[x,1.82+lvl*.64,row*1.18],M.containers[Math.floor(rand()*5)],.03);
  box(g,[2.6,2.6,3.6],[-9.2,2.8,0],M.white,.08);box(g,[2.65,.5,3.65],[-9.2,3.6,0],M.glass,.05);box(g,[.8,1.4,.8],[-9.6,4.6,0],M.funnel,.05);
  return g;
}
function ferry(M){
  const g=new THREE.Group();hull(g,M,15,4,1.3,M.white,M.stripe);
  for(let i=0;i<3;i++){box(g,[11-i*2.6,.85,3.6-i*.4],[-1-i*.6,1.75+i*.88,0],M.white,.1);box(g,[10.6-i*2.6,.32,3.66-i*.4],[-1-i*.6,1.85+i*.88,0],M.glass,.05);}
  box(g,[1,1.4,1],[-3.4,4.4,0],M.funnel,.08);box(g,[13.5,.12,4.05],[0,1.3,0],M.stripe,.02);
  return g;
}
function sailboat(M){
  const g=new THREE.Group();hull(g,M,3.6,1.3,.5,M.white,M.stripe);
  mesh(g,new THREE.CylinderGeometry(.04,.05,4,6),M.mast,[.2,2.5,0]);
  const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(0,3.4);s.lineTo(1.6,0);s.closePath();
  mesh(g,tint(new THREE.ShapeGeometry(s)),M.sail,[.25,.8,0],[0,Math.PI/2,0]).material.side=THREE.DoubleSide;
  return g;
}
function launch(M){const g=new THREE.Group();hull(g,M,2.6,1,.42,M.white,M.stripe);box(g,[.8,.35,.7],[-.3,.62,0],M.glass,.05);return g;}

// Ships cruise on rounded routes that stay well offshore (a plain ellipse would
// cut across the island's corners); boats sit at the docks. All bob on the swell.
function seaRoute(b,d,R){
  const x0=b.x0-d,x1=b.x1+d,z0=b.z0-d,z1=b.z1+d,pts=[];
  const arc=(cx,cz,a0)=>{for(let i=0;i<=12;i++){const a=a0+i/12*Math.PI/2;pts.push([cx+Math.cos(a)*R,cz+Math.sin(a)*R]);}};
  arc(x1-R,z0+R,-Math.PI/2);arc(x1-R,z1-R,0);arc(x0+R,z1-R,Math.PI/2);arc(x0+R,z0+R,Math.PI);
  const cum=[0];for(let i=1;i<=pts.length;i++){const p=pts[i-1],q=pts[i%pts.length];cum.push(cum[i-1]+Math.hypot(q[0]-p[0],q[1]-p[1]));}
  const L=cum.at(-1);
  return {L,at(s,out){s=((s%L)+L)%L;let i=1;while(i<cum.length-1&&cum[i]<s)i++;const p=pts[i-1],q=pts[i%pts.length],t=(s-cum[i-1])/(cum[i]-cum[i-1]||1);
    out.x=p[0]+(q[0]-p[0])*t;out.z=p[1]+(q[1]-p[1])*t;out.h=Math.atan2(q[0]-p[0],q[1]-p[1]);return out;}};
}
export function buildShips({bounds,prep,moorings=[]}){
  const M=shipMaterials(prep),group=new THREE.Group();group.name='ships';
  // [ship, offshore distance, corner radius, speed (units/s, sign = direction), start fraction]
  // Routes stay clear of the docks, which reach about 9 units out from the south shore.
  const movers=[[cargoShip(M),34,28,2.2,0],[ferry(M),24,20,-2.8,.4],[sailboat(M),14,12,1.4,.15],[sailboat(M),17,14,-1.2,.62],[sailboat(M),13.5,11,1.5,.83]]
    .map(([s,d,R,v,f])=>{const route=seaRoute(bounds,d,R);return {s,route,v,pos:f*route.L,p:f*6.28};});
  for(const m of movers){mergeStatic(m.s);group.add(m.s);}
  const docked=moorings.map(([x,z,yaw],i)=>{const b=i%2?launch(M):sailboat(M);mergeStatic(b);b.position.set(x,-.05,z);b.rotation.y=yaw;group.add(b);return b;});
  const pose={x:0,z:0,h:0};let last=null;
  const api={group,update(t){
    const dt=last===null?0:Math.min(.1,Math.max(0,t-last));last=t;
    for(const m of movers){m.pos+=m.v*dt;m.route.at(m.pos,pose);
      // Hulls are modelled bow along +x; turn each to face its direction of travel.
      const h=pose.h+(m.v<0?Math.PI:0)-Math.PI/2;
      m.s.position.set(pose.x,-.25+Math.sin(t*1.1+m.p)*.08,pose.z);m.s.rotation.set(Math.sin(t*.9+m.p)*.025,h,Math.cos(t*.8+m.p)*.03,'YXZ');}
    docked.forEach((b,i)=>{b.position.y=-.06+Math.sin(t*1.3+i)*.04;b.rotation.z=Math.sin(t*1.1+i*2)*.04;});
  },materials:[...Object.values(M).filter(m=>m.isMaterial),...M.containers]};
  api.update(0);   // on their routes from the very first frame
  return api;
}
