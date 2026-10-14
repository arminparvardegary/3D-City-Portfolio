// World units and the tile grid. These are design units, not pixels on screen:
// the WebGL render resolution is set by the quality system and never changes them.
//
//   1 world unit  = 10 design pixels
//   1 tile        = 10 x 10 world units = 100 x 100 design pixels
//
// Every tile is built around its own centre at (0, 0, 0) with its lawn top at
// TILE.top; neighbours sit at exact multiples of TILE.size on x and z, so edges
// meet with no gaps or overlaps. +x is east, +z is south, +y is up.

export const TILE=Object.freeze({size:10,designPx:100,unitsPerPx:.1,top:.12,slab:.12});

export const px=n=>n*TILE.unitsPerPx;              // design pixels -> world units
export const half=TILE.size/2;

// World position of a tile placed at grid cell (col, row).
export const tileOrigin=(col,row)=>[col*TILE.size,0,row*TILE.size];

// Edges shared with neighbours. A connector names what crosses the edge so two
// tiles only snap together when both sides agree (lawn to lawn, path to path).
export const EDGES=Object.freeze({north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]});
export const OPPOSITE=Object.freeze({north:'south',south:'north',east:'west',west:'east'});

export function canConnect(a,edge,b){
  const ca=a.connectors[edge],cb=b.connectors[OPPOSITE[edge]];
  const type=c=>typeof c==='string'?c:c?.type;
  return type(ca)===type(cb)&&(ca?.offset??0)===(cb?.offset??0);
}
