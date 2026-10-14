import * as THREE from 'three';
import { TILE } from './units.js';
import { tileCell, tileCenter } from './grid.js';
import { box, mesh, tint, mergeStatic } from '../geometry.js';
import { tree } from './vegetation.js';
import { THEME } from './theme.js';

// A small town park on one tile: a round fountain on a circular gravel path,
// four paths out to the tile edges (the north one meets the road's sidewalk),
// faceted round trees and pines in each quarter, benches facing the fountain,
// lamp posts and a trimmed hedge framing the edges.
const PATH_TOP=.136,SPOKE_TOP=.133;   // the ring sits a hair above the spokes, so their tops never coincide

function parkMaterials(prep){
  const P=THEME.park;
  const make=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9,vertexColors:true,...extra});prep?.(m);return m;};
  return {
    gravel:make(P.gravel),stone:make(P.stone,{roughness:.8}),water:make(P.water,{roughness:.1,metalness:.1}),
    wood:make(P.wood,{roughness:.75}),iron:make(P.iron,{roughness:.6}),lamp:make(P.lamp,{emissive:P.lampGlow,emissiveIntensity:.7}),
  };
}

function ring(r0,r1,height){
  const s=new THREE.Shape();s.absarc(0,0,r1,0,Math.PI*2,false);
  const hole=new THREE.Path();hole.absarc(0,0,r0,0,Math.PI*2,true);s.holes.push(hole);
  return tint(new THREE.ExtrudeGeometry(s,{depth:height,bevelEnabled:false,curveSegments:48}).rotateX(-Math.PI/2));
}

function bench(parent,M,x,z,yaw){
  const g=new THREE.Group();g.position.set(x,TILE.slab,z);g.rotation.y=yaw;parent.add(g);
  box(g,[.9,.05,.3],[0,.3,0],M.wood,.02);                  // seat
  box(g,[.9,.22,.05],[0,.47,-.14],M.wood,.02,[-.12,0,0]);  // backrest
  for(const sx of [-1,1])box(g,[.05,.3,.28],[sx*.38,.15,-.02],M.iron,.015);
}

function lampPost(parent,M,x,z){
  mesh(parent,new THREE.CylinderGeometry(.03,.04,1.35,8),M.iron,[x,TILE.slab+.675,z]);
  mesh(parent,new THREE.SphereGeometry(.1,14,10),M.lamp,[x,TILE.slab+1.42,z]);
  mesh(parent,new THREE.CylinderGeometry(.11,.07,.05,10),M.iron,[x,TILE.slab+1.52,z]);
}

export function buildPark({number,m,prep}){
  const M=parkMaterials(prep),group=new THREE.Group();group.name=`park-${number}`;
  const {col,row}=tileCell(number),[cx,,cz]=tileCenter(col,row);group.position.set(cx,0,cz);
  const s=TILE.size,circles=[],boxes=[];
  const solidCircle=(x,z,r)=>circles.push([cx+x,cz+z,r]),solidBox=(x,z,hw,hd)=>boxes.push([cx+x,cz+z,hw,hd]);

  box(group,[s,TILE.slab,s],[0,TILE.slab/2,0],m.ground,.006);
  // Gravel: a ring round the fountain and four paths out to the edges.
  mesh(group,ring(2.35,2.95,PATH_TOP-TILE.slab),M.gravel,[0,TILE.slab,0]);
  const spokeLen=s/2-2.7;
  for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
    const mid=2.7+spokeLen/2;
    box(group,dx?[spokeLen,SPOKE_TOP-TILE.slab,.6]:[.6,SPOKE_TOP-TILE.slab,spokeLen],[dx*mid,(TILE.slab+SPOKE_TOP)/2,dz*mid],M.gravel,.004);
  }
  // Fountain: stone basin with water, a column and an upper bowl.
  mesh(group,new THREE.CylinderGeometry(1.05,1.12,.3,40),M.stone,[0,TILE.slab+.15,0]);
  mesh(group,new THREE.CylinderGeometry(.93,.93,.02,40),M.water,[0,TILE.slab+.27,0]);
  mesh(group,new THREE.CylinderGeometry(.11,.14,.55,16),M.stone,[0,TILE.slab+.55,0]);
  mesh(group,new THREE.CylinderGeometry(.38,.22,.1,24),M.stone,[0,TILE.slab+.86,0]);
  mesh(group,new THREE.CylinderGeometry(.32,.32,.015,24),M.water,[0,TILE.slab+.91,0]);
  solidCircle(0,0,1.15);
  // Trees: a round tree either side of each quarter and a pine in its corner.
  let seed=40;
  for(const [sx,sz] of [[1,1],[-1,1],[1,-1],[-1,-1]]){
    for(const [x,z,h,kind] of [[3.7,1.5,2.3,'round'],[1.5,3.7,2.1,'round'],[3.85,3.85,2.7,'pine']]){
      tree(group,m,{x:sx*x,z:sz*z,height:h+((seed%3)-1)*.15,seed:seed++,kind});
      solidCircle(sx*x,sz*z,kind==='pine'?.22:.18);
    }
    // A bench on the diagonal facing the fountain, and a lamp beside it.
    bench(group,M,sx*2.47,sz*2.47,Math.atan2(-sx,-sz));solidCircle(sx*2.47,sz*2.47,.48);
    lampPost(group,M,sx*1.55,sz*1.55);solidCircle(sx*1.55,sz*1.55,.1);
  }
  // A low trimmed hedge round the edges, open where each path leaves the tile.
  const H=.42,T=.38,e=s/2-.32;
  for(const sz of [-1,1])for(const [a,b] of [[-4.78,-.75],[.75,4.78]]){
    box(group,[b-a,H,T],[(a+b)/2,TILE.slab+H/2,sz*e],m.leaves,.12);solidBox((a+b)/2,sz*e,(b-a)/2,T/2);
  }
  for(const sx of [-1,1])for(const [a,b] of [[-4.4,-.75],[.75,4.4]]){
    box(group,[T,H,b-a],[sx*e,TILE.slab+H/2,(a+b)/2],m.leaves,.12);solidBox(sx*e,(a+b)/2,T/2,(b-a)/2);
  }
  mergeStatic(group);
  return {group,circles,boxes,materials:Object.values(M)};
}
