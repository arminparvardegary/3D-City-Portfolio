import * as THREE from 'three';
import { ART, TILE_SPEC, seededRandom } from './config.js';
import { box, mesh, branch, tint, mergeStatic } from './geometry.js';
import { buildHome, buildTurkishFlag } from './home.js';
import { createCarControls } from './car.js';
import { softenShadows } from './shadows.js';
import { tree } from './world/vegetation.js';

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
  // The end line runs between the side lines, so no two line tops overlap in one plane.
  box(staticGroup,[2.515,.006,.045],[2.2,.148,-1.25],m.trim,.001);
  box(staticGroup,[.76,.09,.12],[2.2,.19,-1.03],m.path,.008);
  // Simple entrance stepping slabs across the lawn.
  for(let i=0;i<5;i++)box(staticGroup,[.89,.025,.43],[-2.03,.1325,1.56+i*.68],m.path,.008);
  buildHome(staticGroup,m);
  // A restrained planting strip at the back of the house.
  box(staticGroup,[2.35,.075,.46],[-1.4,.1575,-2.71],m.path,.005);
  for(let i=0;i<4;i++)box(staticGroup,[.48,.3,.35],[-2.25+i*.56,.32,-2.71],m.leaves,.075);
  mergeStatic(staticGroup);
  const canopies=[tree(group,m,{x:-3.78,z:-2.75,height:2.3,seed:3}),tree(group,m,{x:3.63,z:-3.45,height:2.15,seed:7})];
  // The lawn stays clean and flat, as in the city reference. The meadow scatter
  // (world/vegetation.js) is available for tiles that want grass and flowers.
  const field={group:null,layers:[],materials:[],grassMaterial:null};
  const flag=buildTurkishFlag(group,m);
  // The car is built outside the merged static group so it can drive.
  const car=createCarControls(group,m,{prep:softenShadows});
  return {group,canopies,animate:flag.animate,car,meadow:field,extraMaterials:[flag.material,...field.materials]};
}
