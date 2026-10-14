import * as THREE from 'three';
import { createKit } from '../../diorama/kit.js';
import { FACADE } from './facades.js';
import { G,HALF,BRIDGE,bridgeHeight } from './layout.js';

// The Brooklyn Bridge (world units), along street z = 2. From the Manhattan
// avenue the road climbs on a stone viaduct with arches, crosses FDR Drive on a
// steel span, passes through the two gothic stone towers over the East River,
// crosses the Brooklyn riverside road and comes down on Brooklyn's viaduct.
// Four main cables hang from stone anchorages over the towers, with vertical
// suspenders and the diagonal stays that give the bridge its web. The road is
// two lanes with a double yellow line; the towers' middle piers stand between
// the lanes.
export const TOWERS=[58,78];
const W=10.4,Z=BRIDGE.z;

export function buildBridge({prep}={}){
  const K=createKit({flat:false}),{box,cyl,add,mat}=K,root=new THREE.Group(),occluders=[];
  const stoneM=mat('#c4ad87',{map:FACADE.ashlar(),roughness:.9});stoneM.userData.uvSize=4;
  const asphalt=mat('#46484e',{map:FACADE.asphalt(),roughness:.9});asphalt.userData.uvSize=10;
  const steel=mat('#5c6168',{metalness:.6,roughness:.45}),cable=mat('#4c4f55',{metalness:.5,roughness:.5}),yellow=mat('#e3bd3a'),white=mat('#ecebe6');
  const y=x=>G+bridgeHeight(x);
  const {landM,landB}=BRIDGE,fdr=[41,51],brr=[85,95];
  // Deck: short tilted slabs following the height, with markings and parapets.
  for(let x=landM-1;x<landB+1;x+=1.5){
    const x1=Math.min(x+1.5,landB+1),y0=y(x),y1=y(x1),len=Math.hypot(x1-x,y1-y0),ang=Math.atan2(y1-y0,x1-x),mx=(x+x1)/2,my=(y0+y1)/2;
    const r=[0,0,ang];add(new THREE.BoxGeometry(len+.05,.6,W),asphalt,[mx,my-.3,Z],r);
    if(Math.floor(x/1.5)%2===0)for(const o of [-.14,.14])add(new THREE.BoxGeometry(len,.02,.12),yellow,[mx,my+.01,Z+o],r);
    for(const s of [-1,1]){
      const over=x>fdr[0]-1&&x<fdr[1]+1||x>brr[0]-1&&x<brr[1]+1||x>52&&x<84;
      if(over){add(new THREE.BoxGeometry(len,.12,.12),steel,[mx,my+1.1,Z+s*(W/2-.1)],r);add(new THREE.BoxGeometry(len,.6,.16),steel,[mx,my-.1,Z+s*(W/2+.05)],r);
        if(Math.floor(x/1.5)%2===0)box(.1,1.1,.1,mx,my,Z+s*(W/2-.1),steel);}
      else add(new THREE.BoxGeometry(len,1,.5),stoneM,[mx,my+.5,Z+s*(W/2-.25)],r);
    }
  }
  // Viaducts: stone arches where the road is high, solid fill where it is low.
  const viaduct=(xa,xb)=>{for(let x=xa;x<xb;x+=6){const x1=Math.min(x+6,xb),H=Math.min(y(x),y(x1))-.6-G;if(H<=.2)continue;
    if(H<3.6){box(x1-x+.02,H,W,(x+x1)/2,G,Z,stoneM);continue;}
    const r=(x1-x-1.2)/2,sy=H-1.4-r,s=new THREE.Shape();s.moveTo(x,H);s.lineTo(x1,H);s.lineTo(x1,0);s.lineTo(x1-.6,0);s.lineTo(x1-.6,sy);s.absarc((x+x1)/2,sy,r,0,Math.PI,false);s.lineTo(x+.6,0);s.lineTo(x,0);s.closePath();
    add(new THREE.ExtrudeGeometry(s,{depth:W,bevelEnabled:false,curveSegments:16}).translate(0,0,-W/2),stoneM,[0,G,Z]);}};
  viaduct(landM+1,fdr[0]-.5);viaduct(fdr[1]+.5,52);viaduct(84,brr[0]-.5);viaduct(brr[1]+.5,landB-1);
  // Steel spans over FDR Drive and the Brooklyn riverside road: girders on stone piers.
  for(const [a,b] of [fdr,brr]){for(const x of [a-.4,b+.4])box(1.2,y(x)-G-.6,W,x,G,Z,stoneM);}
  // Anchorages: big stone blocks where the cables come down.
  const ANCH=[[30,36],[100,106]];
  // Big stone blocks under the road (it runs over them); wider than the road, so the cables come down on their shoulders.
  for(const [a,b] of ANCH){const h=Math.min(y(a),y(b))-G-.6;if(h<=0)continue;box(b-a,h,W+5,(a+b)/2,G,Z,stoneM);
    for(const s of [-1,1])box(b-a,1.4,2.2,(a+b)/2,G+h,Z+s*(W/2+1.4),stoneM);}
  // Towers: gothic stone, two pointed arches the lanes pass through (the openings
  // start under the deck, so the road runs cleanly through them).
  const deck=y(68),TH=deck+23;
  {const face=new THREE.Shape([new THREE.Vector2(-8.5,0),new THREE.Vector2(8.5,0),new THREE.Vector2(8,TH+1),new THREE.Vector2(-8,TH+1)]);
    for(const c of [-2.7,2.7]){const h=new THREE.Path(),y0=deck-.2;h.moveTo(c-2.3,y0);h.lineTo(c+2.3,y0);h.lineTo(c+2.3,deck+10);h.quadraticCurveTo(c+2.3,deck+12.6,c,deck+14);h.quadraticCurveTo(c-2.3,deck+12.6,c-2.3,deck+10);h.closePath();face.holes.push(h);}
    for(const tx of TOWERS){
      add(new THREE.ExtrudeGeometry(face,{depth:4.6,bevelEnabled:false,curveSegments:12}).translate(0,0,-2.3).rotateY(-Math.PI/2),stoneM,[tx,-1,Z]);
      box(5.2,1,17.6,tx,TH-.2,Z,stoneM);box(4.8,.4,17,tx,deck+16.5,Z,stoneM);box(6,2,18,tx,-1.2,Z,stoneM);
      occluders.push(new THREE.Box3(new THREE.Vector3(tx-2.3,-1,Z-8.5),new THREE.Vector3(tx+2.3,TH+1,Z+8.5)));
    }}
  // Cables: two on each side; down to the anchorages, over the towers, sagging between.
  const top=TH+.4,mid=(TOWERS[0]+TOWERS[1])/2,anchorY=[y(33)+1,y(103)+1];
  const cableY=x=>{
    if(x<TOWERS[0]){const t=(x-33)/(TOWERS[0]-33);return anchorY[0]+(top-anchorY[0])*t*t*.35+(top-anchorY[0])*t*.65;}
    if(x>TOWERS[1]){const t=(103-x)/(103-TOWERS[1]);return anchorY[1]+(top-anchorY[1])*t*t*.35+(top-anchorY[1])*t*.65;}
    const t=(x-mid)/(TOWERS[1]-mid);return deck+5.5+(top-deck-5.5)*t*t;};
  for(const s of [-1,1])for(const o of [-.35,.35]){
    const cz=Z+s*(W/2+.6)+o,pts=[];for(let x=33;x<=103;x+=1)pts.push(new THREE.Vector3(x,cableY(x),cz));
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),180,.2,6),cable);
  }
  // Suspenders: thin verticals from the cables to the deck edge.
  for(const s of [-1,1]){const cz=Z+s*(W/2+.6);for(let x=34;x<103;x+=1.6){if(Math.abs(x-TOWERS[0])<3||Math.abs(x-TOWERS[1])<3)continue;const yb=y(x)+.4,h=cableY(x)-yb;if(h>.6)box(.06,h,.06,x,yb,cz,cable);}}
  // Diagonal stays: from each tower top, fanning down to the deck both ways.
  for(const tx of TOWERS)for(const d of [-1,1])for(let k=1;k<=5;k++){const x1=tx+d*k*3.4;for(const s of [-1,1]){const cz=Z+s*(W/2+.6);
    add(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(tx,top-2,cz),new THREE.Vector3(x1,y(x1)+.5,cz)),1,.045,4),cable);}}
  // Lamps along the bridge.
  const lampHead=mat('#fff3d6',{emissive:'#ffe2a8',emissiveIntensity:.5});
  for(let x=landM+6;x<landB-6;x+=12){if(Math.abs(x-TOWERS[0])<4||Math.abs(x-TOWERS[1])<4)continue;for(const s of [-1,1]){const z=Z+s*(W/2-.3),yb=y(x)+1;cyl(.08,.1,4,8,x,yb,z,steel);add(new THREE.SphereGeometry(.3,12,8),lampHead,[x,yb+4.1,z]);}}
  K.finish(root);
  root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;[].concat(o.material).forEach(m=>prep?.(m));}});
  // The towers' middle piers stand between the lanes: the car drives through the arches.
  const circles=TOWERS.map(tx=>[tx,Z,.7]);
  return {root,occluders,circles};
}
