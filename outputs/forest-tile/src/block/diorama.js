import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// One block, low poly: a corner restaurant with a rooftop terrace on a street
// corner, vintage cars and a few figures in coats and hats on the road. The
// base is a thick slab whose sides show a dark asphalt layer over pale stone
// with a wavy line between them. Everything is flat shaded, in a soft pastel
// palette; static parts are merged per material.
export const PALETTE = {
  asphalt: '#5b5566',
  line: '#ece7ee',
  walk: '#b7aeb9',
  curb: '#d2cad3',
  stone: '#fbeff0',
  olive: '#a9a37c',
  green: '#55705d',
  trim: '#f3f1ec',
  roof: '#a9bdc8',
  parapet: '#eaf2f4',
  awning: '#f5f3ef',
  awningStripe: '#7d92a5',
  glow: '#ff9a3c',
  glass: '#2f3b46',
  door: '#f07a2a',
  sign: '#5b3b50',
  wood: '#6b4a3a',
  table: '#58392e',
  umbrella: '#eef0ee',
  metal: '#c9cdd2',
  pole: '#b2563e',
  hydrant: '#d93d3d',
  lantern: '#f2c94c',
  leaf: '#9cc35a',
  leafLight: '#b6d66c',
  trunk: '#7a5a44',
  hedge: '#6fa64a',
  planter: '#8b8590',
  scooter: '#e04848',
  carGreen: '#5d8b64',
  carGrey: '#8e98aa',
  tyre: '#2b2a31',
  whitewall: '#f1eee8',
  spare: '#f2c14e',
  coat: '#3b3442',
  hat: '#2a2531',
  skin: '#e7b99a',
  flower: ['#ff6f61', '#ffd166', '#f7a1c4'],
};

export function buildDiorama() {
  const root = new THREE.Group();
  const mats = new Map();
  const mat = (color, extra = {}) => {
    const key = color + JSON.stringify(extra);
    if (!mats.has(key))
      mats.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, flatShading: true, ...extra }),
      );
    return mats.get(key);
  };
  const buckets = new Map();
  // Add a geometry (already in world space) to its material's bucket.
  const put = (g, m) => {
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(g);
  };
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    one = new THREE.Vector3(1, 1, 1);
  // Place a geometry: position, rotation (x, y, z) and scale, then bucket it.
  const add = (g, m, [x, y, z], [rx = 0, ry = 0, rz = 0] = [], s = one) => {
    q.setFromEuler(e.set(rx, ry, rz));
    put(g.applyMatrix4(m4.compose(new THREE.Vector3(x, y, z), q, s)), mat(...[].concat(m)));
  };
  // A box by its bottom centre.
  const box = (w, h, d, x, y, z, m, r) =>
    add(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), m, [x, y, z], r);
  const cyl = (rt, rb, h, seg, x, y, z, m, r) =>
    add(new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0), m, [x, y, z], r);
  // A group of parts with its own transform (cars, figures, chairs).
  function part(x, y, z, yaw, build) {
    const local = [];
    build((g, m, p, r) => local.push([g, m, p, r]));
    const pm = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
      one,
    );
    for (const [g, m, p, r = []] of local) {
      q.setFromEuler(e.set(...[r[0] ?? 0, r[1] ?? 0, r[2] ?? 0]));
      g.applyMatrix4(m4.compose(new THREE.Vector3(...p), q, one));
      g.applyMatrix4(pm);
      put(g, mat(...[].concat(m)));
    }
  }
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);

  // --- Base: a thick slab, dark asphalt layer over pale stone, wavy between --------
  const S = 10,
    DEPTH = 6;
  function sideTexture(seed) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = PALETTE.stone;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = PALETTE.asphalt;
    g.beginPath();
    g.moveTo(0, 0);
    for (let x = 0; x <= 512; x += 8) {
      const t = x / 512;
      g.lineTo(
        x,
        62 + Math.sin(t * Math.PI * 2 * 1.1 + seed) * 16 + Math.sin(t * Math.PI * 2 * 2.7 + seed * 2) * 7,
      );
    }
    g.lineTo(512, 0);
    g.closePath();
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  const side = s => new THREE.MeshStandardMaterial({ map: sideTexture(s), roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2 * S, DEPTH, 2 * S), [
    side(1),
    side(2.3),
    mat(PALETTE.asphalt),
    mat(PALETTE.stone),
    side(4.1),
    side(5.7),
  ]);
  base.position.y = -DEPTH / 2;
  base.castShadow = base.receiveShadow = true;
  root.add(base);

  // --- Street: the road along the front, dashes, curb and sidewalk -------------------
  const ROAD_Z = 1.5,
    WALK = 0.25;
  for (let x = -S + 0.6; x < S - 1; x += 2.6) box(1.4, 0.02, 0.18, x + 0.7, 0, 6, PALETTE.line);
  box(2 * S, WALK, S + ROAD_Z, 0, 0, (-S + ROAD_Z) / 2, PALETTE.walk);
  box(2 * S, WALK + 0.02, 0.22, 0, 0, ROAD_Z - 0.11, PALETTE.curb);
  cyl(0.45, 0.45, 0.03, 10, 7, WALK, 0.5, PALETTE.tyre); // manhole

  // --- The restaurant -------------------------------------------------------------
  const X0 = -7.5,
    X1 = 4.5,
    Z0 = -9,
    Z1 = -1.5,
    G1 = 3.2,
    G2 = 2.8,
    Y1 = WALK + G1,
    Y2 = Y1 + G2;
  const TX = -1.5; // olive | green split, upper floor
  // Ground floor: olive to the door, green after it.
  box(TX - X0, G1, Z1 - Z0, (X0 + TX) / 2, WALK, (Z0 + Z1) / 2, PALETTE.olive);
  box(X1 - TX, G1, Z1 - Z0, (TX + X1) / 2, WALK, (Z0 + Z1) / 2, PALETTE.green);
  box(X1 - X0 + 0.2, 0.22, Z1 - Z0 + 0.2, (X0 + X1) / 2, Y1 - 0.05, (Z0 + Z1) / 2, PALETTE.trim); // floor band
  // Glowing shop windows with white frames: front (z) and side (x).
  const shopFront = (x0, x1) => {
    box(x1 - x0, 1.7, 0.08, (x0 + x1) / 2, WALK + 0.5, Z1 + 0.02, [
      PALETTE.glow,
      { emissive: PALETTE.glow, emissiveIntensity: 0.9 },
    ]);
    box(x1 - x0 + 0.16, 0.12, 0.14, (x0 + x1) / 2, WALK + 0.42, Z1 + 0.05, PALETTE.trim);
    for (let k = 0; k <= 3; k++)
      box(0.08, 1.7, 0.12, x0 + (k * (x1 - x0)) / 3, WALK + 0.5, Z1 + 0.06, PALETTE.trim);
  };
  const shopSide = (z0, z1) => {
    box(0.08, 1.7, z1 - z0, X1 + 0.02, WALK + 0.5, (z0 + z1) / 2, [
      PALETTE.glow,
      { emissive: PALETTE.glow, emissiveIntensity: 0.9 },
    ]);
    box(0.14, 0.12, z1 - z0 + 0.16, X1 + 0.05, WALK + 0.42, (z0 + z1) / 2, PALETTE.trim);
    for (let k = 0; k <= 3; k++)
      box(0.12, 1.7, 0.08, X1 + 0.06, WALK + 0.5, z0 + (k * (z1 - z0)) / 3, PALETTE.trim);
  };
  shopFront(-7, -3.1);
  shopFront(0.2, 4);
  shopSide(-8.4, -5.3);
  shopSide(-4.9, -2);
  // The door: orange frame, glowing glass.
  box(1.3, 2.3, 0.1, -1.7, WALK, Z1 + 0.03, PALETTE.door);
  box(0.9, 1.9, 0.12, -1.7, WALK + 0.1, Z1 + 0.05, [
    PALETTE.glow,
    { emissive: PALETTE.glow, emissiveIntensity: 1.1 },
  ]);
  // The sign above the door.
  {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = PALETTE.sign;
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#e9d9c9';
    g.lineWidth = 10;
    g.strokeRect(14, 14, 484, 228);
    g.fillStyle = '#f3e6d6';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 72px Georgia, "Times New Roman", serif';
    g.fillText("PAPA'S", 256, 92);
    g.font = '700 54px Georgia, "Times New Roman", serif';
    g.fillText('RESTAURANT', 256, 170);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 0.1), [
      mat(PALETTE.sign),
      mat(PALETTE.sign),
      mat(PALETTE.sign),
      mat(PALETTE.sign),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }),
      mat(PALETTE.sign),
    ]);
    sign.position.set(-1.7, WALK + 2.85, Z1 + 0.14);
    sign.castShadow = true;
    root.add(sign);
  }
  // Striped awnings: slats sloping out from the wall, with a scalloped valance.
  function awning(x0, x1, alongX) {
    const len = x1 - x0,
      n = Math.max(4, Math.round(len / 0.42)),
      w = len / n,
      depth = 1.25,
      drop = 0.55,
      slope = Math.atan2(drop, depth);
    for (let i = 0; i < n; i++) {
      const c = i % 2 ? PALETTE.awningStripe : PALETTE.awning,
        t = x0 + (i + 0.5) * w,
        hyp = Math.hypot(depth, drop);
      if (alongX) {
        add(
          new THREE.BoxGeometry(w, 0.06, hyp),
          c,
          [t, WALK + 2.55 - drop / 2 + 0.35, Z1 + depth / 2],
          [slope, 0, 0],
        );
        box(w, 0.32, 0.05, t, WALK + 2.05 + 0.35 - drop, Z1 + depth, c);
      } else {
        add(
          new THREE.BoxGeometry(hyp, 0.06, w),
          c,
          [X1 + depth / 2, WALK + 2.55 - drop / 2 + 0.35, t],
          [0, 0, -slope],
        );
        box(0.05, 0.32, w, X1 + depth, WALK + 2.05 + 0.35 - drop, t, c);
      }
    }
  }
  awning(-7.2, -2.8, true);
  awning(-0.2, 4.3, true);
  awning(-8.7, -1.8, false);
  // Upper floor: the olive room (front, two windows with flower boxes) and the green room behind the terrace.
  box(TX - X0, G2, Z1 - Z0, (X0 + TX) / 2, Y1, (Z0 + Z1) / 2, PALETTE.olive);
  box(X1 - TX, G2, -5.5 - Z0, (TX + X1) / 2, Y1, (Z0 - 5.5) / 2, PALETTE.green);
  const upperWindow = (x, z, w, h, faceX = false) => {
    if (faceX) {
      box(0.1, h, w, x, Y1 + 0.7, z, PALETTE.glass);
      box(0.16, h + 0.2, w + 0.2, x - 0.02, Y1 + 0.6, z, PALETTE.trim);
      box(0.1, h, w, x + 0.06, Y1 + 0.7, z, PALETTE.glass);
    } else {
      box(w + 0.24, h + 0.24, 0.1, x, Y1 + 0.58, z - 0.01, PALETTE.trim);
      box(w, h, 0.12, x, Y1 + 0.7, z, [PALETTE.glass, { roughness: 0.25, metalness: 0.2 }]);
      box(0.06, h, 0.14, x, Y1 + 0.7, z, PALETTE.trim);
    }
  };
  for (const x of [-5.9, -3.2]) {
    upperWindow(x, Z1 + 0.02, 1.9, 1.35);
    box(2, 0.3, 0.36, x, Y1 + 0.45, Z1 + 0.2, PALETTE.wood); // flower box
    for (let k = 0; k < 5; k++) {
      add(new THREE.IcosahedronGeometry(0.17, 0), PALETTE.hedge, [x - 0.8 + k * 0.4, Y1 + 0.86, Z1 + 0.22]);
      add(new THREE.IcosahedronGeometry(0.07, 0), PALETTE.flower[k % 3], [
        x - 0.7 + k * 0.4,
        Y1 + 1,
        Z1 + 0.33,
      ]);
    }
  }
  for (const x of [-0.3, 2]) upperWindow(x, -5.5 + 0.02, 1.8, 1.6);
  box(0.9, 2, 0.1, 3.75, Y1, -5.5 + 0.03, PALETTE.glass);
  box(1.1, 2.15, 0.06, 3.75, Y1, -5.5 + 0.01, PALETTE.trim);
  upperWindow(X1 + 0.02, -7.2, 1.6, 1.4, true);
  // Terrace: floor, solid white balustrade with a rail, two umbrellas over tables.
  box(X1 - TX, 0.06, -1.5 + 5.5, (TX + X1) / 2, Y1, -3.5, PALETTE.curb);
  box(X1 - TX, 0.85, 0.16, (TX + X1) / 2, Y1, Z1 - 0.08, PALETTE.trim);
  box(0.16, 0.85, 4, X1 - 0.08, Y1, -3.5, PALETTE.trim);
  box(X1 - TX + 0.1, 0.08, 0.26, (TX + X1) / 2, Y1 + 0.85, Z1 - 0.08, PALETTE.trim);
  box(0.26, 0.08, 4.1, X1 - 0.08, Y1 + 0.85, -3.5, PALETTE.trim);
  // Roof: two slabs with parapets, two AC units, a vent pipe.
  const roof = (x0, x1, z0, z1) => {
    box(x1 - x0, 0.3, z1 - z0, (x0 + x1) / 2, Y2, (z0 + z1) / 2, PALETTE.roof);
    box(x1 - x0, 0.38, 0.22, (x0 + x1) / 2, Y2, z1 - 0.11, PALETTE.parapet);
    box(x1 - x0, 0.38, 0.22, (x0 + x1) / 2, Y2, z0 + 0.11, PALETTE.parapet);
    box(0.22, 0.38, z1 - z0, x0 + 0.11, Y2, (z0 + z1) / 2, PALETTE.parapet);
    box(0.22, 0.38, z1 - z0, x1 - 0.11, Y2, (z0 + z1) / 2, PALETTE.parapet);
  };
  roof(X0 - 0.3, TX + 0.1, Z0 - 0.3, Z1 + 0.3);
  roof(TX - 0.1, X1 + 0.3, Z0 - 0.3, -5.5 + 0.3);
  for (const [x, z] of [
    [-5.6, -4.6],
    [-3.4, -3.2],
  ]) {
    box(1.05, 0.6, 0.8, x, Y2 + 0.3, z, PALETTE.trim);
    box(0.5, 0.3, 0.05, x, Y2 + 0.45, z + 0.41, PALETTE.glass);
  }
  cyl(0.12, 0.12, 0.9, 8, 1.8, Y2 + 0.3, -8.4, PALETTE.metal);
  cyl(0.18, 0.18, 0.12, 8, 1.8, Y2 + 1.2, -8.4, PALETTE.metal);

  // --- Furniture ------------------------------------------------------------------
  function chair(at, y, yaw) {
    part(at[0], y, at[1], yaw, P => {
      P(B(0.42, 0.06, 0.42), PALETTE.wood, [0, 0.42, 0]);
      P(B(0.42, 0.5, 0.06), PALETTE.wood, [0, 0.48, -0.18]);
      for (const [a, b] of [
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ])
        P(B(0.05, 0.42, 0.05), PALETTE.wood, [a, 0, b]);
    });
  }
  function table(x, y, z, { umbrella = false } = {}) {
    cyl(0.5, 0.5, 0.06, 10, x, y + 0.72, z, PALETTE.table);
    cyl(0.05, 0.05, 0.72, 6, x, y, z, PALETTE.table);
    cyl(0.25, 0.25, 0.04, 8, x, y, z, PALETTE.table);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + 0.4;
      chair([x + Math.sin(a) * 0.85, z + Math.cos(a) * 0.85], y, a + Math.PI);
    }
    if (umbrella) {
      cyl(0.04, 0.04, 2.4, 6, x, y, z, PALETTE.metal);
      add(new THREE.ConeGeometry(1.35, 0.55, 8), PALETTE.umbrella, [x, y + 2.55, z]);
    }
  }
  table(-5.3, WALK, -0.1);
  table(0.9, WALK, 0.15);
  table(3.2, WALK, -0.25);
  table(0.6, Y1, -3.4, { umbrella: true });
  table(3, Y1, -2.6, { umbrella: true });
  // Potted plants by the door.
  for (const [x, z] of [
    [-2.7, -1.05],
    [-0.7, -1.05],
    [-0.2, -0.5],
  ]) {
    cyl(0.22, 0.17, 0.36, 8, x, WALK, z, PALETTE.planter);
    add(new THREE.IcosahedronGeometry(0.32, 0), PALETTE.leafLight, [x, WALK + 0.62, z]);
    add(new THREE.IcosahedronGeometry(0.08, 0), PALETTE.flower[1], [x + 0.1, WALK + 0.85, z + 0.1]);
  }

  // --- Street props -------------------------------------------------------------
  // Utility pole with a cross arm and insulators.
  cyl(0.15, 0.2, 9, 6, -9.1, WALK, -0.6, PALETTE.pole);
  box(2.4, 0.18, 0.18, -9.1, WALK + 8.1, -0.6, PALETTE.pole, [0, 0.3, 0]);
  for (const k of [-0.9, -0.3, 0.3, 0.9])
    cyl(0.06, 0.06, 0.25, 6, -9.1 + k * Math.cos(0.3), WALK + 8.28, -0.6 - k * Math.sin(0.3), PALETTE.trim);
  // Fire hydrant.
  cyl(0.2, 0.24, 0.65, 8, -8.3, WALK, 0.6, PALETTE.hydrant);
  add(new THREE.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), PALETTE.hydrant, [
    -8.3,
    WALK + 0.65,
    0.6,
  ]);
  box(0.62, 0.12, 0.12, -8.3, WALK + 0.38, 0.6, PALETTE.hydrant);
  // A yellow hexagonal lantern on three legs.
  cyl(0.42, 0.42, 1.05, 6, -7.9, WALK + 1.25, -0.9, [
    PALETTE.lantern,
    { emissive: PALETTE.lantern, emissiveIntensity: 0.25 },
  ]);
  add(new THREE.ConeGeometry(0.48, 0.4, 6), PALETTE.lantern, [-7.9, WALK + 2.5, -0.9]);
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094;
    add(
      new THREE.CylinderGeometry(0.04, 0.04, 1.4, 5).translate(0, 0.7, 0),
      PALETTE.pole,
      [-7.9 + Math.sin(a) * 0.35, WALK, -0.9 + Math.cos(a) * 0.35],
      [Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25],
    );
  }
  // Faceted tree in a square planter, and a hedge.
  box(1.3, 0.3, 1.3, 7.6, WALK, -3.6, PALETTE.planter);
  cyl(0.13, 0.18, 2.2, 6, 7.6, WALK, -3.6, PALETTE.trunk);
  for (const [y, r, c] of [
    [2.6, 1.25, PALETTE.leaf],
    [3.7, 1.15, PALETTE.leafLight],
    [4.7, 0.95, PALETTE.leaf],
    [5.5, 0.65, PALETTE.leafLight],
  ])
    add(new THREE.IcosahedronGeometry(r, 0), c, [7.6, WALK + y, -3.6], [y, y * 2, 0]);
  box(1.1, 1, 5.6, 9.1, WALK, -6.6, PALETTE.hedge);
  // Red scooter, rubbish bags.
  part(5.6, WALK, 0.1, Math.PI / 2, P => {
    for (const z of [-0.45, 0.45])
      P(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10).rotateZ(Math.PI / 2), PALETTE.tyre, [0, 0.2, z]);
    P(B(0.34, 0.3, 1), PALETTE.scooter, [0, 0.25, 0]);
    P(B(0.3, 0.3, 0.4), PALETTE.scooter, [0, 0.4, -0.3]);
    P(B(0.06, 0.7, 0.06), PALETTE.metal, [0, 0.45, 0.42]);
    P(B(0.5, 0.05, 0.05), PALETTE.metal, [0, 1.12, 0.42]);
  });
  for (const [x, z, r] of [
    [5.2, -2.3, 0.32],
    [5.5, -1.9, 0.26],
    [4.95, -1.85, 0.24],
  ])
    add(new THREE.IcosahedronGeometry(r, 0), PALETTE.tyre, [x, WALK + r * 0.8, z]);

  // --- Vintage cars ----------------------------------------------------------------
  function vintageCar(x, z, yaw, color) {
    part(x, 0, z, yaw, P => {
      for (const [wx, wz] of [
        [-0.72, 1.15],
        [0.72, 1.15],
        [-0.72, -1.15],
        [0.72, -1.15],
      ]) {
        P(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 12).rotateZ(Math.PI / 2), PALETTE.tyre, [
          wx,
          0.42,
          wz,
        ]);
        P(new THREE.CylinderGeometry(0.26, 0.26, 0.26, 10).rotateZ(Math.PI / 2), PALETTE.whitewall, [
          wx,
          0.42,
          wz,
        ]);
      }
      P(B(1.2, 0.5, 3.4), color, [0, 0.45, -0.1]); // body
      P(B(0.9, 0.42, 1.3), color, [0, 0.95, 1]); // long hood
      P(B(1.24, 0.9, 1.6), color, [0, 0.95, -0.55]);
      P(B(1.1, 0.12, 1.45), color, [0, 1.85, -0.55]); // cabin and roof
      P(B(1.27, 0.45, 1.2), [PALETTE.glass, { roughness: 0.3 }], [0, 1.25, -0.5]); // windows
      for (const s of [-1, 1]) {
        P(B(0.32, 0.3, 1.1), color, [s * 0.72, 0.55, 1.05]);
        P(B(0.32, 0.3, 1), color, [s * 0.72, 0.55, -1.2]);
        P(B(0.2, 0.06, 1.3), PALETTE.tyre, [s * 0.74, 0.35, -0.05]);
      } // fenders, running boards
      P(B(0.84, 0.5, 0.08), PALETTE.metal, [0, 0.6, 1.67]);
      for (const s of [-1, 1])
        P(new THREE.SphereGeometry(0.13, 8, 6), PALETTE.lantern, [s * 0.42, 1.1, 1.62]); // grille, lamps
      P(new THREE.CylinderGeometry(0.38, 0.38, 0.2, 12).rotateX(Math.PI / 2), PALETTE.tyre, [0, 0.85, -1.95]);
      P(
        new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10).rotateX(Math.PI / 2),
        PALETTE.spare,
        [0, 0.85, -1.95],
      ); // spare wheel
    });
  }
  vintageCar(-6.2, 3.7, -1.95, PALETTE.carGreen);
  vintageCar(0.8, 8.1, 1.5, PALETTE.carGrey);
  vintageCar(4.9, 6.3, 1.68, PALETTE.carGrey);

  // --- Figures in long coats and hats ---------------------------------------------
  function figure(x, z, yaw) {
    part(x, 0, z, yaw, P => {
      for (const s of [-1, 1]) P(B(0.13, 0.5, 0.15), PALETTE.coat, [s * 0.09, 0, 0]);
      P(new THREE.CylinderGeometry(0.19, 0.27, 0.85, 6).translate(0, 0.42, 0), PALETTE.coat, [0, 0.45, 0]);
      P(new THREE.IcosahedronGeometry(0.16, 0), PALETTE.skin, [0, 1.47, 0]);
      P(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 8), PALETTE.hat, [0, 1.57, 0]);
      P(new THREE.CylinderGeometry(0.14, 0.17, 0.18, 8).translate(0, 0.09, 0), PALETTE.hat, [0, 1.58, 0]);
      P(B(0.1, 0.1, 0.62), PALETTE.coat, [0.15, 1.05, 0.25]);
      P(B(0.06, 0.09, 0.5), PALETTE.tyre, [0.15, 1.08, 0.62]); // arm forward, holding something
    });
  }
  figure(-7.6, 6.6, Math.PI * 0.95);
  figure(-5.7, 6.9, Math.PI * 0.9);
  figure(-4, 5.7, Math.PI * 0.92);
  figure(-2.4, 7.4, Math.PI * 0.85);

  // --- Merge per material ----------------------------------------------------------
  for (const [m, geos] of buckets) {
    const merged = new THREE.Mesh(mergeGeometries(geos, false), m);
    merged.castShadow = merged.receiveShadow = true;
    root.add(merged);
    for (const g of geos) g.dispose();
  }
  return root;
}
