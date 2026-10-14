import * as THREE from 'three';
import { ART, TILE_SPEC, seededRandom } from './config.js';
import { box, mesh, branch, tint, mergeStatic } from './geometry.js';
import { buildHome, buildTurkishFlag } from './home.js';
import { buildTeslaModelS } from './tesla.js';

function referenceTree(parent,m,rand,x,z,height=2.25){
  const g=new THREE.Group();g.position.set(x,ART.tile.top,z);parent.add(g);
  branch(g,[0,0,0],[.015,height*.64,0],.043,.028,m.bark,1,7);
  const crown=new THREE.Group();crown.position.y=height*.7;g.add(crown);
  const geometry=new THREE.IcosahedronGeometry(1,1);
  const position=geometry.attributes.position,colors=[];
  for(let i=0;i<position.count;i+=3){
    const shade=.9+rand()*.15;
    for(let j=0;j<3;j++)colors.push(shade,shade,shade*.97);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  mesh(crown,geometry,m.leaves,[0,0,0],[0,.4,0],[height*.22,height*.34,height*.21]);
  crown.userData.phase=rand()*6.28;
  return crown;
}

export function buildTile(m){
  const group=new THREE.Group();group.name='my-house-01';group.userData.spec=TILE_SPEC;
  const staticGroup=new THREE.Group();group.add(staticGroup);const rand=seededRandom(ART.seed);
  // Precisely 10 × 10 world units = 100 × 100 design pixels. Slim slab and
  // completely flat lawn, as in the supplied isometric neighborhood image.
  box(staticGroup,[10,.12,10],[0,.06,0],m.ground,.006);
  // Parking strip reaches the south boundary for a future street connection.
  box(staticGroup,[2.8,.025,6.55],[2.2,.1325,1.725],m.parking,.004);
  // White edges frame one parking bay; the access end stays open.
  for(const x of [.92,3.48])box(staticGroup,[.045,.006,4.4],[x,.148,.95],m.trim,.001);
  box(staticGroup,[2.6,.006,.045],[2.2,.148,-1.25],m.trim,.001);
  box(staticGroup,[.76,.09,.12],[2.2,.19,-1.03],m.path,.008);
  // Simple entrance stepping slabs across the lawn.
  for(let i=0;i<5;i++)box(staticGroup,[.89,.025,.43],[-2.03,.1325,1.56+i*.68],m.path,.008);
  buildHome(staticGroup,m);buildTeslaModelS(staticGroup,m);
  // A restrained planting strip at the back of the house.
  box(staticGroup,[2.35,.075,.46],[-1.4,.1575,-2.71],m.path,.005);
  for(let i=0;i<4;i++)box(staticGroup,[.48,.3,.35],[-2.25+i*.56,.32,-2.71],m.leaves,.075);
  mergeStatic(staticGroup);
  const canopies=[referenceTree(group,m,rand,-3.78,-2.75,2.3),referenceTree(group,m,rand,3.63,-3.45,2.15)];
  const flag=buildTurkishFlag(group,m);
  return {group,canopies,animate:flag.animate,extraMaterials:[flag.material]};
}
