import * as THREE from 'three';
import { createKit } from '../../diorama/kit.js';
import { FACADE } from './facades.js';
import { G, BRIDGE, DECK_HALF, DECK_STEP, bridgeHeight } from './layout.js';

// The bridge (world units), on the last street: from the FDR Drive crossing it
// rises in one gentle arch over the river and comes down at the Brooklyn
// riverside road. Only sea under it. Two gothic stone towers stand in the water;
// the whole road passes through each tower's pointed arch. Main cables come down
// to stone pylons at both ends and sag between the towers, with suspenders and a
// few diagonal stays, all landing on steel stiffening girders. Steel railings on
// both sides are solid: you cannot drive off the bridge or onto it from the side.
const { landM, landB, z: Z } = BRIDGE,
  MID = (landM + landB) / 2;
export const TOWERS = [MID - 7, MID + 7];
const W = DECK_HALF * 2,
  SHORE = [54, 82];

export function buildBridge({ prep } = {}) {
  const K = createKit({ flat: false }),
    { box, cyl, add, mat } = K,
    root = new THREE.Group(),
    occluders = [],
    solids = [],
    circles = [];
  const stoneM = mat('#c4ad87', { map: FACADE.ashlar(), roughness: 0.9 });
  stoneM.userData.uvSize = 4;
  const asphalt = mat('#46484e', { map: FACADE.asphalt(), roughness: 0.9 });
  asphalt.userData.uvSize = 10;
  const steel = mat('#5c6168', { metalness: 0.6, roughness: 0.45 }),
    cable = mat('#4c4f55', { metalness: 0.5, roughness: 0.5 }),
    yellow = mat('#e3bd3a');
  const y = x => G + bridgeHeight(x);
  // Deck: short tilted slabs following the arch, a double yellow line, steel
  // railings and girders on both edges. Each railing piece is solid up to rail
  // height above the deck at that point.
  // Colliders match what you see: the railing's inner face is 5.04 from the
  // centre line (top bar and posts), so its solid starts exactly there.
  const STEP = DECK_STEP,
    RAIL_IN = W / 2 - 0.16,
    RAIL_OUT = W / 2 - 0.04;
  for (let x = landM; x < landB - 1e-6; x += STEP) {
    const x1 = Math.min(x + STEP, landB),
      y0 = y(x),
      y1 = y(x1),
      len = Math.hypot(x1 - x, y1 - y0),
      ang = Math.atan2(y1 - y0, x1 - x),
      mx = (x + x1) / 2,
      my = (y0 + y1) / 2;
    // The slab's top face lies exactly on the chord from (x, y0) to (x1, y1): its centre sits half a slab below it, square to the slope.
    const r = [0, 0, ang];
    add(
      new THREE.BoxGeometry(len + 0.05, 0.5, W),
      asphalt,
      [mx + 0.25 * Math.sin(ang), my - 0.25 * Math.cos(ang), Z],
      r,
    );
    if (Math.round(x / STEP) % 2 === 0)
      for (const o of [-0.14, 0.14])
        add(new THREE.BoxGeometry(len, 0.02, 0.12), yellow, [mx, my + 0.01, Z + o], r);
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(len, 0.12, 0.12), steel, [mx, my + 1.1, Z + s * (W / 2 - 0.1)], r);
      add(new THREE.BoxGeometry(len, 0.6, 0.16), steel, [mx, my - 0.1, Z + s * (W / 2 + 0.05)], r);
      if (Math.round(x / STEP) % 2 === 0) box(0.1, 1.1, 0.1, mx, my, Z + s * (W / 2 - 0.1), steel);
      solids.push([
        mx,
        Z + (s * (RAIL_IN + RAIL_OUT)) / 2,
        (x1 - x) / 2,
        (RAIL_OUT - RAIL_IN) / 2,
        bridgeHeight(mx) + 1,
      ]);
    }
  }
  // On each shore the low end of the arch rests on stone, its top following the deck.
  const fill = (xa, xb) => {
    for (let x = xa; x < xb - 1e-6; x += 1) {
      const x1 = Math.min(x + 1, xb),
        ha = y(x) - 0.5 - G,
        hb = y(x1) - 0.5 - G;
      if (Math.max(ha, hb) <= 0.02) continue;
      const s = new THREE.Shape();
      s.moveTo(x, 0);
      s.lineTo(x1, 0);
      s.lineTo(x1, Math.max(hb, 0));
      s.lineTo(x, Math.max(ha, 0));
      s.closePath();
      add(new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false }).translate(0, 0, -W / 2), stoneM, [
        0,
        G,
        Z,
      ]);
    }
  };
  fill(landM, SHORE[0]);
  fill(SHORE[1], landB);
  // Towers in the water: gothic stone with one pointed arch over the whole road.
  const TH = G + BRIDGE.deck + 16;
  for (const tx of TOWERS) {
    const deck = y(tx);
    const face = new THREE.Shape([
      new THREE.Vector2(-8.5, 0),
      new THREE.Vector2(8.5, 0),
      new THREE.Vector2(8, TH + 1),
      new THREE.Vector2(-8, TH + 1),
    ]);
    const h = new THREE.Path(),
      y0 = deck - 0.6 + 1,
      a = DECK_HALF + 0.5;
    h.moveTo(-a, y0);
    h.lineTo(a, y0);
    h.lineTo(a, deck + 1 + 8);
    h.quadraticCurveTo(a, deck + 1 + 12, 0, deck + 1 + 14);
    h.quadraticCurveTo(-a, deck + 1 + 12, -a, deck + 1 + 8);
    h.closePath();
    face.holes.push(h);
    add(
      new THREE.ExtrudeGeometry(face, { depth: 4.6, bevelEnabled: false, curveSegments: 12 })
        .translate(0, 0, -2.3)
        .rotateY(-Math.PI / 2),
      stoneM,
      [tx, -1, Z],
    );
    box(5.2, 1, 17.6, tx, TH - 0.2, Z, stoneM);
    box(4.8, 0.4, 17, tx, deck + 15.5, Z, stoneM);
    box(6, 2.4, 18, tx, -1.6, Z, stoneM);
    occluders.push(
      new THREE.Box3(new THREE.Vector3(tx - 2.3, -1, Z - 8.5), new THREE.Vector3(tx + 2.3, TH + 1, Z + 8.5)),
    );
  }
  // Main cables: from stone pylons at both ends, over the tower tops, sagging between.
  const A = [landM + 1.5, landB - 1.5],
    top = TH + 0.4,
    aY = A.map(x => y(x) + 1.6),
    low = y(MID) + 3.2;
  // Pylons stand outside the railing, never on the road.
  for (const ax of A)
    for (const s of [-1, 1]) {
      box(1.2, 2.2, 1.4, ax, y(ax) - 0.6, Z + s * (W / 2 + 0.95), stoneM);
      solids.push([ax, Z + s * (W / 2 + 0.95), 0.6, 0.7]);
    } // they reach the road at both ends: solid
  const cableY = x => {
    if (x < TOWERS[0]) {
      const t = (x - A[0]) / (TOWERS[0] - A[0]);
      return aY[0] + (top - aY[0]) * (t * t * 0.4 + t * 0.6);
    }
    if (x > TOWERS[1]) {
      const t = (A[1] - x) / (A[1] - TOWERS[1]);
      return aY[1] + (top - aY[1]) * (t * t * 0.4 + t * 0.6);
    }
    const t = (x - MID) / (TOWERS[1] - MID);
    return low + (top - low) * t * t;
  };
  for (const s of [-1, 1])
    for (const o of [-0.3, 0.3]) {
      const cz = Z + s * (W / 2 + 0.6) + o,
        pts = [];
      for (let x = A[0]; x <= A[1] + 1e-6; x += 0.5) pts.push(new THREE.Vector3(x, cableY(x), cz));
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.18, 6), cable);
    }
  // Stiffening girders in the cable planes, braced to the deck.
  for (const s of [-1, 1]) {
    const cz = Z + s * (W / 2 + 0.6);
    for (let x = A[0]; x < A[1] - 1e-6; x += 1.2) {
      if (Math.abs(x + 0.6 - TOWERS[0]) < 2.4 || Math.abs(x + 0.6 - TOWERS[1]) < 2.4) continue;
      const x1 = Math.min(x + 1.2, A[1]),
        y0 = y(x) + 0.15,
        y1 = y(x1) + 0.15,
        len = Math.hypot(x1 - x, y1 - y0),
        ang = Math.atan2(y1 - y0, x1 - x);
      add(new THREE.BoxGeometry(len + 0.04, 0.6, 0.3), steel, [(x + x1) / 2, (y0 + y1) / 2, cz], [0, 0, ang]);
      if (Math.round(x / 1.2) % 2 === 0) box(0.16, 0.16, 0.7, x, y(x) - 0.12, Z + s * (W / 2 + 0.28), steel);
    }
  }
  // Suspenders from the cables to the girders.
  for (const s of [-1, 1]) {
    const cz = Z + s * (W / 2 + 0.6);
    for (let x = A[0] + 1.2; x < A[1]; x += 1.2) {
      if (Math.abs(x - TOWERS[0]) < 2.6 || Math.abs(x - TOWERS[1]) < 2.6) continue;
      const yb = y(x) + 0.45,
        h = cableY(x) - yb;
      if (h > 0.4) box(0.05, h, 0.05, x, yb, cz, cable);
    }
  }
  // A few diagonal stays from each tower top down to the deck, both ways.
  for (const tx of TOWERS)
    for (const d of [-1, 1])
      for (let k = 1; k <= 3; k++) {
        const x1 = tx + d * k * 2.6;
        if (x1 < A[0] || x1 > A[1]) continue;
        for (const s of [-1, 1]) {
          const cz = Z + s * (W / 2 + 0.6);
          add(
            new THREE.TubeGeometry(
              new THREE.LineCurve3(
                new THREE.Vector3(tx, top - 1.6, cz),
                new THREE.Vector3(x1, y(x1) + 0.45, cz),
              ),
              1,
              0.04,
              4,
            ),
            cable,
          );
        }
      }
  // Lamps along the bridge, glowing warm at night.
  const lampHead = mat('#fff3d6', { emissive: '#ffb052', emissiveIntensity: 4 });
  for (const x of [landM + 5, MID, landB - 5])
    for (const s of [-1, 1]) {
      const z = Z + s * (W / 2 - 0.3),
        yb = y(x) + 1;
      cyl(0.08, 0.1, 3.4, 8, x, yb, z, steel);
      circles.push([x, z, 0.1]);
      add(new THREE.SphereGeometry(0.28, 12, 8), lampHead, [x, yb + 3.5, z]);
    }
  K.finish(root);
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = o.receiveShadow = true;
      [].concat(o.material).forEach(m => prep?.(m));
    }
  });
  return { root, occluders, solids, circles };
}
