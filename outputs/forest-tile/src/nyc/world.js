import * as THREE from 'three';
import { buildCity, LAYOUT, NYC } from './city.js';
import { buildDistrict } from './district.js';

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
  solids.push([(RIVER[0]+RIVER[1])/2*k,0,(RIVER[1]-RIVER[0])/2*k,S*k]);
  const rect=(c,r)=>({x0:COLS[c][0]*k,x1:COLS[c][1]*k,z0:ROWS[r][0]*k,z1:ROWS[r][1]*k});
  const A0=rect('A','R0'),C2=rect('C','R2');
  const district=buildDistrict({top,row:rect('A','R2'),shops:[
    {x0:A0.x0,x1:A0.x1,z0:A0.z1-8,z1:A0.z1,front:A0.z1,yaw:0,count:6,slab:false},   // along the front of a city block (its sidewalk exists)
    {x0:C2.x0,x1:C2.x1,z0:C2.z0,z1:C2.z1,front:C2.x1,yaw:Math.PI/2,count:6,slab:true},
  ]});
  group.add(district.root);solids.push(...district.solids);
  for(const o of [city.root,district.root])o.traverse(m=>{if(m.isMesh)[].concat(m.material).forEach(x=>prep?.(x));});
  // Taxis, in world units, for the car to bump into.
  const taxiCircles=[];
  const obstacles=()=>{const c=city.obstacles();taxiCircles.length=c.length;for(let i=0;i<c.length;i++){const q=taxiCircles[i]??=[0,0,0];q[0]=c[i][0]*k;q[1]=c[i][1]*k;q[2]=c[i][2]*k;}return taxiCircles;};
  const places={};for(const b of district.row)places[b.id]={x:b.x,z:b.z,y:b.top*.45};
  return {
    group,solids,places,labels:[],row:district.row,lot:district.lot,obstacles,
    bounds:{x0:-S*k+.6,x1:RIVER[0]*k-.2,z0:-S*k+.6,z1:S*k-.6},
    // Start on the avenue at the Experience Parking entrance, facing in (nothing tall stands between it and the camera).
    start:{x:COLS.A[1]*k+4.2,z:district.lot.bayZ[0]+4,h:-Math.PI/2},
    carColor:'#ff6b5e',zoom:.62,fixedZoom:true,
    placeAt(x,z){for(const b of district.row)if(Math.abs(x-b.x)<b.w/2&&z>district.lot.z0-16&&z<district.lot.z0)return b.id;return null;},
    update(t,dt){city.update(dt);return 2;},   // taxis and clouds move: redraw and refresh shadows
  };
}
export { NYC };
