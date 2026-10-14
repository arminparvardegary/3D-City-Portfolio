import * as THREE from 'three';
import { buildDistrict } from './district.js';
import { createPeople } from './people.js';
import { buildCity } from './drive/build.js';
import { buildBridge } from './drive/bridge.js';
import { createTraffic } from './drive/traffic.js';
import { G,CURB,HALF,LANE,ST,AV,MAN,BKN,NS,BRIDGE,blocks,bridgeHeight,onBridgeBand,onLand } from './drive/layout.js';
import { VEHICLES, buildVehicle } from '../vehicles.js';

// New York as the world you drive (world units, about 1.5 m each). The plan is
// in drive/layout.js: Manhattan, the East River, a strip of Brooklyn, water all
// round. Armin's Experience Row and its parking lot face Skills Street across
// street z = 78. Returns what main.js needs: the scene group, solids, the road
// height (surface), the start, places for the Experience list, the parking lot,
// tall buildings for the camera, and a per frame update.
export function buildNYCWorld({prep,materials,player}){
  const group=new THREE.Group();group.name='new-york';
  const bl=blocks(),find=(i,j)=>bl.find(b=>b.i===i&&b.j===j);
  // Armin's blocks: Experience Row (0, 4); Skills Street shops in front of (0, 5) and (1, 5).
  const exp=find(0,4),sk1=find(0,5),sk2=find(1,5),top=G+CURB;
  const city=buildCity({reserved:new Set(['0,4','0,5','1,5']),fills:[
    {x0:sk1.x0+2.6,x1:sk1.x1-2.6,z0:sk1.z0+12.5,z1:sk1.z1-2.6,zone:'low'},{x0:sk2.x0+2.6,x1:sk2.x1-2.6,z0:sk2.z0+12.5,z1:sk2.z1-2.6,zone:'low'}]});
  group.add(city.root);
  const district=buildDistrict({top,row:{x0:exp.x0,x1:exp.x1,z0:exp.z0,z1:exp.z1},shops:[
    {x0:sk1.x0,x1:sk1.x1,z0:sk1.z0,z1:sk1.z1,front:sk1.z0,yaw:Math.PI,count:6,slab:true},
    {x0:sk2.x0,x1:sk2.x1,z0:sk2.z0,z1:sk2.z1,front:sk2.z0,yaw:Math.PI,count:6,slab:true},
  ]});
  group.add(district.root);
  const bridge=buildBridge({prep});group.add(bridge.root);
  for(const o of [city.root,district.root])o.traverse(m=>{if(m.isMesh)[].concat(m.material).forEach(x=>prep?.(x));});
  // Taxis: instances of the realistic taxi.
  const holder=new THREE.Group(),taxiParts=buildVehicle(VEHICLES.findIndex(v=>v.name==='Sport Taxi'),holder,materials,prep);
  taxiParts.rig.position.set(0,0,0);taxiParts.rig.rotation.set(0,0,0);
  const traffic=createTraffic({template:holder,count:9,phase:city.phase,player});group.add(traffic.root);
  // People on every sidewalk loop, including Armin's blocks.
  const people=createPeople({loops:[...city.loops,...district.solids.map(([cx,cz,hw,hd])=>({x0:cx-hw+1,x1:cx+hw-1,z0:cz-hd+1,z1:cz+hd-1,y:top}))],perLoop:3});
  group.add(people.root);
  const solids=[...city.solids,...district.solids];
  const occluders=[...city.occluders,...district.occluders,...bridge.occluders];
  const places={};for(const b of district.row)places[b.id]={x:b.x,z:b.z,y:b.top*.45};
  // Where the car can drive and how high: the streets on land (not under the
  // low parts of the bridge ramps, which stand on a solid viaduct), and the bridge.
  const viaduct=(x,z)=>onBridgeBand(x,z)&&((x>BRIDGE.landM+.5&&x<41)||(x>95&&x<BRIDGE.landB-.5));
  function surface(x,z,y=0){
    const ground=onLand(x,z)&&!viaduct(x,z)?0:null,deck=onBridgeBand(x,z)?bridgeHeight(x):null;
    if(ground===null)return deck;if(deck===null)return ground;
    return Math.abs(deck-y)<Math.abs(ground-y)?deck:ground;
  }
  return {
    group,solids,places,labels:[],row:district.row,lot:district.lot,occluders,surface,
    obstacles:()=>traffic.obstacles(),circles:bridge.circles,
    bounds:{x0:MAN.x0-1,x1:BKN.x1+1,z0:NS.z0-1,z1:NS.z1+1},
    // Start on Skills Street, Experience Row on the right, the shops on the left.
    start:{x:-58,z:ST[5]-LANE,h:-Math.PI/2},
    vehicle:'Sport',carColor:'#b5121b',zoom:.62,fixedZoom:true,
    placeAt(x,z){for(const b of district.row)if(Math.abs(x-b.x)<b.w/2&&z>district.lot.z0-16&&z<district.lot.z0)return b.id;return null;},
    update(t,dt){city.update(dt);traffic.update(dt);people.update(dt);return 2;},
  };
}
