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
// The bridge is on the last street (z = 112): from the FDR Drive crossing straight
// over the river to the Brooklyn riverside road. Only sea under it, no road. The
// deck is one gentle arch, highest over the middle of the river.
export const BRIDGE={z:ST.at(-1),x0:AV.at(-1),x1:BAV[0],landM:50,landB:86,deck:3.6};

// Blocks between the roads, with their place in the grid.
export function blocks(){
  const out=[];
  for(let i=0;i<AV.length-1;i++)for(let j=0;j<ST.length-1;j++)
    out.push({x0:AV[i]+HALF,x1:AV[i+1]-HALF,z0:ST[j]+HALF,z1:ST[j+1]-HALF,i,j,borough:'man'});
  for(let j=0;j<ST.length-1;j++)out.push({x0:BAV[0]+HALF,x1:BAV[1]-HALF,z0:ST[j]+HALF,z1:ST[j+1]-HALF,i:9,j,borough:'bkn'});
  return out;
}

// The road network: nodes at crossings, edges along roads. The bridge is one
// edge from the FDR Drive crossing to the Brooklyn riverside road.
export function network(){
  const nodes=new Map(),key=(x,z)=>x+','+z,node=(x,z)=>{const k=key(x,z);if(!nodes.has(k))nodes.set(k,{x,z,k,out:[]});return nodes.get(k);};
  const edges=[];
  const link=(a,b,kind='road')=>{const e1={a,b,kind},e2={a:b,b:a,kind};a.out.push(e1);b.out.push(e2);edges.push(e1,e2);};
  // Manhattan avenues and streets.
  for(const x of AV)for(let j=0;j<ST.length-1;j++)link(node(x,ST[j]),node(x,ST[j+1]));
  for(const z of ST)for(let i=0;i<AV.length-1;i++){if(z===BRIDGE.z&&AV[i]>=BRIDGE.x0)continue;link(node(AV[i],z),node(AV[i+1],z));}
  // Brooklyn.
  for(const x of BAV)for(let j=0;j<ST.length-1;j++)link(node(x,ST[j]),node(x,ST[j+1]));
  for(const z of ST)link(node(BAV[0],z),node(BAV[1],z));
  // The bridge.
  link(node(BRIDGE.x0,BRIDGE.z),node(BRIDGE.x1,BRIDGE.z),'bridge');
  for(const n of nodes.values()){n.degree=n.out.length;
    // A corner: two roads meeting at a right angle (the city's edge). s points into the curve.
    if(n.degree===2){const [a,b]=n.out.map(e=>[Math.sign(e.b.x-n.x),Math.sign(e.b.z-n.z)]);if(a[0]*b[0]+a[1]*b[1]===0){n.corner=true;n.s=[a[0]+b[0],a[1]+b[1]];}}}
  return {nodes:[...nodes.values()],edges};
}

// Height of the bridge road above the street along x (0 off the bridge): one
// smooth arch from landing to landing.
export function bridgeHeight(x){
  const {landM,landB,deck}=BRIDGE;
  if(x<=landM||x>=landB)return 0;
  return deck*Math.sin(Math.PI*(x-landM)/(landB-landM));
}
export const DECK_HALF=5.2;      // the bridge deck is narrower than a street: two lanes, no parking
export const onBridgeBand=(x,z)=>Math.abs(z-BRIDGE.z)<=DECK_HALF&&x>BRIDGE.landM-1&&x<BRIDGE.landB+1;
export const onLand=(x,z)=>z>=NS.z0&&z<=NS.z1&&((x>=MAN.x0&&x<=MAN.x1)||(x>=BKN.x0&&x<=BKN.x1));
