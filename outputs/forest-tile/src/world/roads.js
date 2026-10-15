import * as THREE from 'three';
import { TILE } from './units.js';
import { tileCell, tileCenter } from './grid.js';
import { box, mesh, mergeStatic } from '../geometry.js';
import { THEME } from './theme.js';

// An east-west road across a row of tiles: two lanes, dashed centre line,
// sidewalks, and at the junction tile a crossing for the house driveway with
// zebra crossings, stop lines and traffic lights. Right-hand traffic: the
// eastbound lane is the southern one.
export const ROAD = Object.freeze({
  half: 2.2,
  lane: 1.1,
  walk: 0.9,
  asphaltTop: 0.135,
  walkTop: 0.17,
  markTop: 0.139,
  arm: { x0: 0.8, x1: 3.6 },
}); // the driveway mouth, matching the house tile's parking strip

// Traffic light cycle in seconds (the timer is never shown).
export const CYCLE = Object.freeze({ green: 25, yellow: 3, red: 25 });
const PERIOD = CYCLE.green + CYCLE.yellow + CYCLE.red;
// The road lights, and the driveway light which is green only while the road is red.
export function signalState(t) {
  const c = ((t % PERIOD) + PERIOD) % PERIOD;
  const road = c < CYCLE.green ? 'green' : c < CYCLE.green + CYCLE.yellow ? 'yellow' : 'red';
  const r = c - CYCLE.green - CYCLE.yellow;
  const side = road !== 'red' ? 'red' : r < CYCLE.red - CYCLE.yellow ? 'green' : 'yellow';
  return { road, side };
}

function materials(prep) {
  const R = THEME.road;
  const make = (color, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, vertexColors: true, ...extra });
    prep?.(m);
    return m;
  };
  const lamp = color => {
    const m = make('#2a2a2a', { roughness: 0.4, emissive: color, emissiveIntensity: 0 });
    m.userData.on = new THREE.Color(color);
    return m;
  };
  return {
    asphalt: make(R.asphalt),
    mark: make(R.mark),
    walk: make(R.walk),
    curb: make(R.curb),
    driveway: make(R.driveway),
    pole: make(R.pole, { roughness: 0.6 }),
    housing: make(R.housing, { roughness: 0.6 }),
    road: { red: lamp(R.red), yellow: lamp(R.yellow), green: lamp(R.green) },
    side: { red: lamp(R.red), yellow: lamp(R.yellow), green: lamp(R.green) },
  };
}

// A traffic light: pole, housing with visor and three lamps facing `yaw`
// (0 = facing +z). Lamps share materials per group so one change lights them all.
function trafficLight(parent, M, lamps, [x, z], yaw) {
  const g = new THREE.Group();
  g.position.set(x, ROAD.walkTop, z);
  g.rotation.y = yaw;
  parent.add(g);
  mesh(g, new THREE.CylinderGeometry(0.045, 0.055, 2.25, 10), M.pole, [0, 1.125, 0]);
  box(g, [0.34, 0.92, 0.22], [0, 2.36, 0], M.housing, 0.05);
  ['red', 'yellow', 'green'].forEach((k, i) => {
    const y = 2.64 - i * 0.28;
    mesh(g, new THREE.SphereGeometry(0.105, 18, 12), lamps[k], [0, y, 0.11], [0, 0, 0], [1, 1, 0.5]);
    box(g, [0.25, 0.035, 0.1], [0, y + 0.13, 0.16], M.housing, 0.012); // visor
  });
  return g;
}

export function buildRoad({ numbers, junction, prep, m }) {
  const M = materials(prep),
    group = new THREE.Group();
  group.name = 'road';
  const s = TILE.size,
    H = ROAD.half,
    W = ROAD.walk;
  const cells = numbers.map(n => ({ n, ...tileCell(n) })),
    row = cells[0].row;
  const xs = cells.map(c => tileCenter(c.col, c.row)[0]),
    x0 = Math.min(...xs) - s / 2,
    x1 = Math.max(...xs) + s / 2;
  const zc = tileCenter(0, row)[2];
  const [jx] = tileCenter(tileCell(junction).col, row),
    armX0 = jx + ROAD.arm.x0,
    armX1 = jx + ROAD.arm.x1;
  const statics = new THREE.Group();
  group.add(statics);
  // Lawn under the whole row, then asphalt, sidewalks and markings on top.
  for (const x of xs) box(statics, [s, TILE.slab, s], [x, TILE.slab / 2, zc], m.ground, 0.006);
  box(
    statics,
    [x1 - x0, ROAD.asphaltTop - TILE.slab, 2 * H],
    [(x0 + x1) / 2, (TILE.slab + ROAD.asphaltTop) / 2, zc],
    M.asphalt,
    0.002,
  );
  const walkH = ROAD.walkTop - TILE.slab,
    walk = (xa, xb, zs) =>
      box(
        statics,
        [xb - xa, walkH, W],
        [(xa + xb) / 2, TILE.slab + walkH / 2, zc + zs * (H + W / 2)],
        M.walk,
        0.01,
      );
  walk(x0, x1, 1);
  walk(x0, armX0, -1);
  walk(armX1, x1, -1);
  // The driveway mouth continues the house's parking strip down to the road.
  box(
    statics,
    [armX1 - armX0, 0.145 - TILE.slab, s / 2 - H],
    [(armX0 + armX1) / 2, (TILE.slab + 0.145) / 2, zc - H - (s / 2 - H) / 2],
    M.driveway,
    0.003,
  );
  const markH = ROAD.markTop - ROAD.asphaltTop,
    mark = (w, d, x, z) => box(statics, [w, markH, d], [x, ROAD.asphaltTop + markH / 2, z], M.mark, 0.002);
  // Crossings sit 2.4 either side of the driveway; the dashed line stops short of them.
  const cw = jx + 2.2,
    cross = [cw - 2.4, cw + 2.4],
    clear = [cross[0] - 1.1, cross[1] + 0.75];
  for (let x = x0 + 0.5; x < x1 - 0.3; x += 1.4)
    if (x + 0.7 < clear[0] || x > clear[1]) mark(0.7, 0.08, x + 0.35, zc);
  for (const cx of cross) for (let z = -H + 0.3; z < H - 0.15; z += 0.5) mark(0.8, 0.26, cx, zc + z + 0.13);
  // Stop lines across each lane, before the crossing drivers meet first.
  const stopE = cross[0] - 0.55,
    stopW = cross[1] + 0.55;
  mark(0.12, H - 0.1, stopE, zc + H / 2);
  mark(0.12, H - 0.1, stopW, zc - H / 2);
  // Lights: one for each direction of the road, one facing the driveway.
  trafficLight(statics, M, M.road, [stopE - 0.15, zc + H + W / 2], -Math.PI / 2);
  trafficLight(statics, M, M.road, [stopW + 0.15, zc - H - W / 2], Math.PI / 2);
  trafficLight(statics, M, M.side, [armX1 + 0.25, zc - H - W / 2], Math.PI);
  mergeStatic(statics);
  const poles = [
    [stopE - 0.15, zc + H + W / 2, 0.12],
    [stopW + 0.15, zc - H - W / 2, 0.12],
    [armX1 + 0.25, zc - H - W / 2, 0.12],
  ];
  // Lanes for traffic: position along the lane is s = dir * x.
  const lanes = [
    { dir: 1, z: zc + ROAD.lane, stop: stopE - 0.12, from: x0 - 1.5, to: x1 + 1.5 },
    { dir: -1, z: zc - ROAD.lane, stop: -(stopW + 0.12), from: -(x1 + 1.5), to: -(x0 - 1.5) },
  ];
  const setLights = t => {
    const st = signalState(t);
    for (const [group, state] of [
      [M.road, st.road],
      [M.side, st.side],
    ])
      for (const k of ['red', 'yellow', 'green']) {
        const m = group[k],
          on = k === state;
        m.emissiveIntensity = on ? 4 : 0;
        m.color.set(on ? m.userData.on : '#2a2a2a');
      }
    return st;
  };
  return {
    group,
    lanes,
    poles,
    setLights,
    bounds: { x0, x1 },
    materials: [
      ...Object.values(M).filter(m => m.isMaterial),
      ...Object.values(M.road),
      ...Object.values(M.side),
    ],
  };
}
