// The plan of the New York you drive (world units, about 1.5 m each; the car is
// about 3.7 long). Manhattan is an island; the East River separates it from a
// strip of Brooklyn; water all around. Every road connects at both ends, so
// traffic never has to appear or vanish.
//
//   x: west -120 ... Manhattan ... 54 | East River 54..82 | Brooklyn 82..132
//   z: north -120 ... south 120
//
// A city made in the builder replaces this plan with its own grid (PLAN, from
// src/plan/plan.js): one island, its avenues, streets and road segments, no
// river, Brooklyn or bridge. Everything else reads the same constants below, so
// both cities are built by the same code.
import { activePlan, planRects, xsOf, zsOf } from '../../plan/plan.js';
export const PLAN = activePlan(); // null: Armin's New York
const PX = PLAN && xsOf(PLAN),
  PZ = PLAN && zsOf(PLAN);

export const G = 0.12; // street level (top of the land)
export const CURB = 0.25; // sidewalks stand this high above the street
// Road cross section (each side of the centre line, about 1.5 m per unit):
// double yellow centre line, a travel lane (5.8 m wide, its centre halfway
// between the yellow and the white line), a solid white edge line at 3.85, a
// parking lane (centre 4.75), the curb at 6. An 18 m carriageway between curbs.
export const HALF = 6; // centre line to curb
export const EDGE = 3.85; // white edge line between travel and parking lanes
export const LANE = EDGE / 2; // travel lane centre: arrows, traffic and the car sit mid lane
export const PARK = 4.75; // parking lane centre
export const WALK = 2.6;
export const CORNER_R = 12; // centre line radius where two roads meet at the city's edge           // sidewalk width inside each block

// The land: 8 units of promenade outside the outer roads, water beyond.
export const MAN = PLAN ? { x0: PX[0] - 8, x1: PX.at(-1) + 8 } : { x0: -120, x1: 54 },
  RIVER = PLAN ? null : { x0: 54, x1: 82 },
  BKN = PLAN ? null : { x0: 82, x1: 132 },
  NS = PLAN ? { z0: PZ[0] - 8, z1: PZ.at(-1) + 8 } : { z0: -120, z1: 120 };
// Avenues (run north to south) and streets (run east to west).
export const AV = PLAN ? PX : [-112, -72, -32, 8, 46]; // 46: FDR Drive along the river
export const BAV = PLAN ? [] : [90, 116]; // Brooklyn: riverside road and an avenue
export const ST = PLAN ? PZ : [-112, -74, -36, 2, 40, 78, 112];
export const ROW_AV = PLAN ? null : -72; // this avenue stops at street 78: south of it is Armin's experience row
// The bridge is on the last street (z = 112): from the FDR Drive crossing straight
// over the river to the Brooklyn riverside road. Only sea under it, no road. The
// deck is one gentle arch, highest over the middle of the river. (A builder city
// has no bridge: its band lies far away and its height is always 0.)
export const BRIDGE = PLAN
  ? { z: 1e6, x0: 0, x1: 0, landM: 0, landB: 0, deck: 0 }
  : { z: ST.at(-1), x0: AV.at(-1), x1: BAV[0], landM: 50, landB: 86, deck: 3.6 };

// Blocks between the roads, with their place in the grid.
export function blocks() {
  if (PLAN) return planBlocks().blocks;
  const out = [];
  for (let i = 0; i < AV.length - 1; i++)
    for (let j = 0; j < ST.length - 1; j++)
      out.push({
        x0: AV[i] + HALF,
        x1: AV[i + 1] - HALF,
        z0: ST[j] + HALF,
        z1: ST[j + 1] - HALF,
        i,
        j,
        borough: 'man',
      });
  for (let j = 0; j < ST.length - 1; j++)
    out.push({
      x0: BAV[0] + HALF,
      x1: BAV[1] - HALF,
      z0: ST[j] + HALF,
      z1: ST[j + 1] - HALF,
      i: 9,
      j,
      borough: 'bkn',
    });
  // Armin's experience row: blocks (0, 5) and (1, 5) are one long block (the
  // avenue between them stops at the street), so his companies stand together.
  const a = out.findIndex(b => b.i === 0 && b.j === 5),
    b = out.findIndex(b => b.i === 1 && b.j === 5);
  out[a] = { ...out[a], x1: out[b].x1, wide: true };
  out.splice(b, 1);
  return out;
}

// The road network: nodes at crossings, edges along roads. The bridge is one
// edge from the FDR Drive crossing to the Brooklyn riverside road.
export function network() {
  if (PLAN) return planNetwork();
  const nodes = new Map(),
    key = (x, z) => x + ',' + z,
    node = (x, z) => {
      const k = key(x, z);
      if (!nodes.has(k)) nodes.set(k, { x, z, k, out: [] });
      return nodes.get(k);
    };
  const edges = [];
  const link = (a, b, kind = 'road') => {
    const e1 = { a, b, kind },
      e2 = { a: b, b: a, kind };
    a.out.push(e1);
    b.out.push(e2);
    edges.push(e1, e2);
  };
  // Manhattan avenues and streets.
  for (const x of AV)
    for (let j = 0; j < ST.length - 1; j++) {
      if (x === ROW_AV && j === ST.length - 2) continue;
      link(node(x, ST[j]), node(x, ST[j + 1]));
    }
  for (const z of ST)
    for (let i = 0; i < AV.length - 1; i++) {
      if (z === BRIDGE.z && AV[i] >= BRIDGE.x0) continue;
      link(node(AV[i], z), node(AV[i + 1], z));
    }
  // Brooklyn.
  for (const x of BAV) for (let j = 0; j < ST.length - 1; j++) link(node(x, ST[j]), node(x, ST[j + 1]));
  for (const z of ST) link(node(BAV[0], z), node(BAV[1], z));
  // The bridge.
  link(node(BRIDGE.x0, BRIDGE.z), node(BRIDGE.x1, BRIDGE.z), 'bridge');
  for (const n of nodes.values()) {
    n.degree = n.out.length;
    // A corner: two roads meeting at a right angle (the city's edge). s points into the curve.
    if (n.degree === 2) {
      const [a, b] = n.out.map(e => [Math.sign(e.b.x - n.x), Math.sign(e.b.z - n.z)]);
      if (a[0] * b[0] + a[1] * b[1] === 0) {
        n.corner = true;
        n.s = [a[0] + b[0], a[1] + b[1]];
      }
    }
  }
  return { nodes: [...nodes.values()], edges };
}

// Height of the bridge road above the street along x (0 off the bridge): one
// smooth arch from landing to landing.
export function bridgeHeight(x) {
  const { landM, landB, deck } = BRIDGE;
  if (x <= landM || x >= landB) return 0;
  return deck * Math.sin((Math.PI * (x - landM)) / (landB - landM));
}
// The deck is drawn as straight slabs DECK_STEP long between points on that
// arch; this is its height exactly as drawn, so wheels sit on the visible road.
export const DECK_STEP = 1.2;
export function bridgeDeck(x) {
  const { landM, landB } = BRIDGE;
  if (x <= landM || x >= landB) return 0;
  const x0 = landM + Math.floor((x - landM) / DECK_STEP) * DECK_STEP,
    x1 = Math.min(x0 + DECK_STEP, landB),
    h0 = bridgeHeight(x0),
    h1 = bridgeHeight(x1);
  return h0 + ((h1 - h0) * (x - x0)) / (x1 - x0);
}
export const DECK_HALF = 5.2; // the bridge deck is narrower than a street: two lanes, no parking
export const onBridgeBand = (x, z) =>
  Math.abs(z - BRIDGE.z) <= DECK_HALF && x > BRIDGE.landM - 1 && x < BRIDGE.landB + 1;
// A wooden boardwalk, WHARF wide, runs round every shore; it is ground too.
export const WHARF = 4;
export const onLand = (x, z) =>
  z >= NS.z0 - WHARF &&
  z <= NS.z1 + WHARF &&
  ((x >= MAN.x0 - WHARF && x <= MAN.x1 + WHARF) || (!!BKN && x >= BKN.x0 - WHARF && x <= BKN.x1 + WHARF));

// --- A builder city ------------------------------------------------------------------

// Its road network: one edge per road segment the plan keeps.
function planNetwork() {
  const nodes = new Map(),
    edges = [];
  const node = (x, z) => {
    const k = x + ',' + z;
    if (!nodes.has(k)) nodes.set(k, { x, z, k, out: [] });
    return nodes.get(k);
  };
  const link = (a, b) => {
    const e1 = { a, b, kind: 'road' },
      e2 = { a: b, b: a, kind: 'road' };
    a.out.push(e1);
    b.out.push(e2);
    edges.push(e1, e2);
  };
  for (let j = 0; j <= PLAN.rows; j++)
    for (let i = 0; i < PLAN.cols; i++)
      if (PLAN.roads.h[j][i]) link(node(AV[i], ST[j]), node(AV[i + 1], ST[j]));
  for (let i = 0; i <= PLAN.cols; i++)
    for (let j = 0; j < PLAN.rows; j++)
      if (PLAN.roads.v[i][j]) link(node(AV[i], ST[j]), node(AV[i], ST[j + 1]));
  for (const n of nodes.values()) {
    n.degree = n.out.length;
    n.lightsOff = PLAN.lightsOff.includes(AV.indexOf(n.x) + ',' + ST.indexOf(n.z));
    if (n.degree === 2) {
      const [a, b] = n.out.map(e => [Math.sign(e.b.x - n.x), Math.sign(e.b.z - n.z)]);
      if (a[0] * b[0] + a[1] * b[1] === 0) {
        n.corner = true;
        n.s = [a[0] + b[0], a[1] + b[1]];
      }
    }
  }
  return { nodes: [...nodes.values()], edges };
}

// Its blocks (planRects: same kind squares with no road between them are one
// block), with the empty roads between blocks paved (gaps). Each block carries
// its first square from the plan.
export function planBlocks() {
  const { cols, rows, roads, cells } = PLAN;
  const { rects, merged } = planRects(PLAN),
    out = rects.map(([a0, a1, b0, b1]) => ({
      x0: AV[a0] + HALF,
      x1: AV[a1 + 1] - HALF,
      z0: ST[b0] + HALF,
      z1: ST[b1 + 1] - HALF,
      i: a0,
      j: b0,
      i1: a1,
      j1: b1,
      wide: a1 > a0 || b1 > b0,
      borough: 'man',
      cell: cells[b0][a0],
    }));
  // Missing road segments not inside a merged block are paved, up to the next
  // crossing (a crossing is paved only if no road at all reaches it).
  const gaps = [],
    roadAt = (i, j) =>
      (i > 0 && roads.h[j]?.[i - 1]) ||
      (i < cols && roads.h[j]?.[i]) ||
      (j > 0 && roads.v[i]?.[j - 1]) ||
      (j < rows && roads.v[i]?.[j]);
  const inside = (i, j) => (i >= 0 && j >= 0 && i < cols && j < rows ? merged[j][i] : false);
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i < cols; i++)
      if (!roads.h[j][i] && !(inside(i, j - 1) && inside(i, j)))
        gaps.push({ x0: AV[i] + HALF, x1: AV[i + 1] - HALF, z0: ST[j] - HALF, z1: ST[j] + HALF });
  for (let i = 0; i <= cols; i++)
    for (let j = 0; j < rows; j++)
      if (!roads.v[i][j] && !(inside(i - 1, j) && inside(i, j)))
        gaps.push({ x0: AV[i] - HALF, x1: AV[i] + HALF, z0: ST[j] + HALF, z1: ST[j + 1] - HALF });
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++)
      if (!roadAt(i, j))
        gaps.push({ x0: AV[i] - HALF, x1: AV[i] + HALF, z0: ST[j] - HALF, z1: ST[j] + HALF });
  return { blocks: out, gaps };
}
