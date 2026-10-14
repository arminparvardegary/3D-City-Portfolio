// The plan of the New York you drive (world units, about 1.5 m each; the car is
// about 3.7 long). Manhattan is an island; the East River separates it from a
// strip of Brooklyn; water all around. Every road connects at both ends, so
// traffic never has to appear or vanish.
//
//   x: west -120 ... Manhattan ... 54 | East River 54..82 | Brooklyn 82..132
//   z: north -120 ... south 120
export const G=.12;              // street level (top of the land)
export const CURB=.25;           // sidewalks stand this high above the street
// Road cross section (each side of the centre line, about 1.5 m per unit):
// double yellow centre line, a travel lane (5.8 m wide, its centre halfway
// between the yellow and the white line), a solid white edge line at 3.85, a
// parking lane (centre 4.75), the curb at 6. An 18 m carriageway between curbs.
export const HALF=6;             // centre line to curb
export const EDGE=3.85;          // white edge line between travel and parking lanes
export const LANE=EDGE/2;        // travel lane centre: arrows, traffic and the car sit mid lane
export const PARK=4.75;          // parking lane centre
export const WALK=2.6;
export const CORNER_R=12;        // centre line radius where two roads meet at the city's edge           // sidewalk width inside each block

export const MAN={x0:-120,x1:54},RIVER={x0:54,x1:82},BKN={x0:82,x1:132},NS={z0:-120,z1:120};
// Avenues (run north to south) and streets (run east to west).
export const AV=[-112,-72,-32,8,46];          // 46: FDR Drive along the river
export const BAV=[90,116];                    // Brooklyn: riverside road and an avenue
export const ST=[-112,-74,-36,2,40,78,112];
// The Brooklyn Bridge runs along street z = 2: up from the avenue at x = 8, over
// FDR Drive and the river, over the Brooklyn riverside road, down to x = 116.
export const BRIDGE={z:2,x0:AV[3],x1:BAV[1],landM:14,landB:110,deck:6.6,river:[56,80]};

// Blocks between the roads, with their place in the grid.
export function blocks(){
  const out=[];
  for(let i=0;i<AV.length-1;i++)for(let j=0;j<ST.length-1;j++)
    out.push({x0:AV[i]+HALF,x1:AV[i+1]-HALF,z0:ST[j]+HALF,z1:ST[j+1]-HALF,i,j,borough:'man'});
  for(let j=0;j<ST.length-1;j++)out.push({x0:BAV[0]+HALF,x1:BAV[1]-HALF,z0:ST[j]+HALF,z1:ST[j+1]-HALF,i:9,j,borough:'bkn'});
  return out;
}

// The road network: nodes at crossings, edges along roads. The bridge is one
// edge from (8, 2) to (116, 2); the ground street under its ramps is not a road.
export function network(){
  const nodes=new Map(),key=(x,z)=>x+','+z,node=(x,z)=>{const k=key(x,z);if(!nodes.has(k))nodes.set(k,{x,z,k,out:[]});return nodes.get(k);};
  const edges=[];
  const link=(a,b,kind='road')=>{const e1={a,b,kind},e2={a:b,b:a,kind};a.out.push(e1);b.out.push(e2);edges.push(e1,e2);};
  // Manhattan avenues and streets.
  for(const x of AV)for(let j=0;j<ST.length-1;j++)link(node(x,ST[j]),node(x,ST[j+1]));
  for(const z of ST)for(let i=0;i<AV.length-1;i++){if(z===BRIDGE.z&&AV[i]>=BRIDGE.x0)continue;link(node(AV[i],z),node(AV[i+1],z));}
  // Brooklyn.
  for(const x of BAV)for(let j=0;j<ST.length-1;j++)link(node(x,ST[j]),node(x,ST[j+1]));
  for(const z of ST){if(z===BRIDGE.z)continue;link(node(BAV[0],z),node(BAV[1],z));}
  // The bridge.
  link(node(BRIDGE.x0,BRIDGE.z),node(BRIDGE.x1,BRIDGE.z),'bridge');
  for(const n of nodes.values()){n.degree=n.out.length;
    // A corner: two roads meeting at a right angle (the city's edge). s points into the curve.
    if(n.degree===2){const [a,b]=n.out.map(e=>[Math.sign(e.b.x-n.x),Math.sign(e.b.z-n.z)]);if(a[0]*b[0]+a[1]*b[1]===0){n.corner=true;n.s=[a[0]+b[0],a[1]+b[1]];}}}
  return {nodes:[...nodes.values()],edges};
}

// Height of the bridge road above the street along x (0 off the bridge): a
// smooth climb from the Manhattan landing, flat over the river, a smooth descent
// to the Brooklyn landing.
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
export function bridgeHeight(x){
  const {landM,landB,deck,river}=BRIDGE;
  if(x<=landM||x>=landB)return 0;
  if(x<river[0])return deck*smooth((x-landM)/(river[0]-landM));
  if(x>river[1])return deck*smooth((landB-x)/(landB-river[1]));
  return deck;
}
export const DECK_HALF=5.2;      // the bridge deck is narrower than a street: two lanes, no parking
export const onBridgeBand=(x,z)=>Math.abs(z-BRIDGE.z)<=DECK_HALF&&x>BRIDGE.landM-1&&x<BRIDGE.landB+1;
export const onLand=(x,z)=>z>=NS.z0&&z<=NS.z1&&((x>=MAN.x0&&x<=MAN.x1)||(x>=BKN.x0&&x<=BKN.x1));
