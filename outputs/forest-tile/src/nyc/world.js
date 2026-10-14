import * as THREE from 'three';
import { buildCity, LAYOUT, NYC } from './city.js';
import { buildDistrict } from './district.js';
import { buildBridge, bridgeSurface } from './bridge.js';
import { createPeople } from './people.js';
import { createKit } from '../diorama/kit.js';

// New York as the world you drive: the low poly city at three times the diorama
// size, with Armin's Experience Row and Skills Street built in at full scale.
// Returns what main.js needs: the scene group, solids for the car, the start,
// places for the Experience list, the parking lot and a per frame update.
export const SCALE=3;
export function buildNYCWorld({prep}){
  const group=new THREE.Group();group.name='new-york';
  const city=buildCity({drive:true});city.root.scale.setScalar(SCALE);city.root.position.y=.12;group.add(city.root);
  const {S,COLS,ROWS,RIVER,WALK}=LAYOUT,k=SCALE,top=.12+WALK*k;
  // Blocks with a raised sidewalk are solid; the river is too.
  const solids=[];
  for(const [c,[x0,x1]] of Object.entries(COLS))for(const [r,[z0,z1]] of Object.entries(ROWS)){
    if((c==='A'&&r==='R2')||(c==='C'&&r==='R2'))continue;
    solids.push([(x0+x1)/2*k,(z0+z1)/2*k,(x1-x0)/2*k,(z1-z0)/2*k]);
  }
  // The river is not a box: the road surface below says where the car can go (only the bridge).
  const cityBlocks=solids.slice();
  const rect=(c,r)=>({x0:COLS[c][0]*k,x1:COLS[c][1]*k,z0:ROWS[r][0]*k,z1:ROWS[r][1]*k});
  const A0=rect('A','R0'),C2=rect('C','R2');
  const district=buildDistrict({top,row:rect('A','R2'),shops:[
    {x0:A0.x0,x1:A0.x1,z0:A0.z1-8,z1:A0.z1,front:A0.z1,yaw:0,count:6,slab:false},   // along the front of a city block (its sidewalk exists)
    {x0:C2.x0,x1:C2.x1,z0:C2.z0,z1:C2.z1,front:C2.x1,yaw:Math.PI/2,count:6,slab:true},
  ]});
  group.add(district.root);solids.push(...district.solids);
  // The drivable bridge, at full size, standing on the river.
  const BK=createKit(),bridge=buildBridge(BK),bridgeRoot=BK.finish(new THREE.Group());bridgeRoot.position.y=.12;group.add(bridgeRoot);
  // People walking round every block with a sidewalk, a little in from the curb.
  const people=createPeople({loops:[...cityBlocks,...district.solids].map(([cx,cz,hw,hd])=>({x0:cx-hw+.45,x1:cx+hw-.45,z0:cz-hd+.45,z1:cz+hd-.45,y:top})),perLoop:4});
  group.add(people.root);
  // Tall things the camera should look around (world boxes).
  const occluders=[...city.occluders.map(([x,z,w,d,y,h])=>new THREE.Box3(new THREE.Vector3((x-w/2)*k,y*k+.12,(z-d/2)*k),new THREE.Vector3((x+w/2)*k,(y+h)*k+.12,(z+d/2)*k))),...district.occluders,...bridge.occluders];
  for(const o of [city.root,district.root,bridgeRoot,people.root])o.traverse(m=>{if(m.isMesh)[].concat(m.material).forEach(x=>prep?.(x));});
  // Taxis, in world units, for the car to bump into.
  const taxiCircles=[];
  const obstacles=()=>{const c=city.obstacles();taxiCircles.length=c.length;for(let i=0;i<c.length;i++){const q=taxiCircles[i]??=[0,0,0];q[0]=c[i][0]*k;q[1]=c[i][1]*k;q[2]=c[i][2]*k;}return taxiCircles;};
  const places={};for(const b of district.row)places[b.id]={x:b.x,z:b.z,y:b.top*.45};
  return {
    group,solids,places,labels:[],row:district.row,lot:district.lot,obstacles,occluders,
    // Road height under the car: the ground, or the bridge over the river (null: no road).
    // The bridge comes first: its loop ramps reach over the edge of the avenue where they land.
    surface(x,z){const b=bridgeSurface(x,z);return b!==null?b:x<=RIVER[0]*k?0:null;},
    // The bridge towers' middle piers: drive through the arches either side.
    circles:[[52.5,-24,1.15],[52.5,24,1.15]],
    bounds:{x0:-S*k+.6,x1:S*k-.6,z0:-S*k+.6,z1:S*k-.6},
    // Start on the avenue at the Experience Parking entrance, facing in (nothing tall stands between it and the camera).
    start:{x:COLS.A[1]*k+4.2,z:district.lot.bayZ[0]+4,h:-Math.PI/2},
    carColor:'#ff6b5e',zoom:.62,fixedZoom:true,
    placeAt(x,z){for(const b of district.row)if(Math.abs(x-b.x)<b.w/2&&z>district.lot.z0-16&&z<district.lot.z0)return b.id;return null;},
    update(t,dt){city.update(dt);people.update(dt);return 2;},   // taxis and clouds move: redraw and refresh shadows
  };
}
export { NYC };
