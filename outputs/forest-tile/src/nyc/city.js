import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createKit, facade } from '../diorama/kit.js';
import { damp } from '../motion.js';

// New York as one low poly diorama: a square block with layered sides, a
// street grid with sidewalks and trees, a riverside avenue, the East River and
// the Brooklyn Bridge along the front right edge, and the landmarks: the Empire
// State Building, the Chrysler Building, One World Trade Center, a glass tower,
// a copper domed tower and the Statue of Liberty on her star fort. Brick and
// stone towers with water tanks fill the blocks. Yellow taxis drive the streets
// and the bridge; low poly clouds and the sun float above.
export const NYC = {
  asphalt: '#5b5566',
  line: '#ece7ee',
  walk: '#c2b9c3',
  grass: '#8fc25a',
  grassLight: '#a6d36a',
  stone: '#fbeff0',
  water: '#6cc3d5',
  waterDeep: '#57b1c6',
  limestone: '#e9dcc6',
  sand: '#d9c29c',
  brick: '#c98a6c',
  brickDark: '#a96d5c',
  grey: '#bfc4cc',
  glass: '#7fb2dc',
  glassDark: '#5f8fc0',
  roof: '#a3acb7',
  steel: '#dfe5ec',
  copper: '#7fc6b0',
  gold: '#ffc94d',
  flame: '#ff8f3a',
  wood: '#9b6b4f',
  trunk: '#7a5a44',
  taxi: '#f4c430',
  dark: '#2f3440',
  white: '#f6f4f0',
  bridge: '#cdb894',
  cable: '#6b6470',
  cloud: '#ffffff',
  sun: '#ffd166',
};
const S = 20,
  DEPTH = 4,
  WALK = 0.22;
const COLS = { A: [-19, -7.4], B: [-4.6, 4.6], C: [7.4, 12.6] },
  ROWS = { R0: [-19, -7.4], R1: [-4.6, 4.6], R2: [7.4, 19] };
const AVENUE = [12.6, 15],
  RIVER = [15, S],
  BRIDGE_X = 17.5,
  DECK_Y = 1.7;

// drive: the version you drive through. Two blocks are left free (the Experience
// Row and part of Skills Street are built there at full size), traffic is light
// and nothing stands on the roads.
export const LAYOUT = { S, COLS, ROWS, AVENUE, RIVER, BRIDGE_X, DECK_Y, WALK };
export function buildCity({ drive = false } = {}) {
  const root = new THREE.Group(),
    K = createKit(),
    { box, cyl, add, part, B, mat } = K;
  const skip = k => drive && (k === 'A,R2' || k === 'C,R2');
  const F = { stone: facade('stone'), brick: facade('brick'), deco: facade('deco'), glass: facade('glass') };
  const skin = (color, kind, size = 0.8, extra = {}) => {
    const m = mat(color, { map: F[kind], ...extra });
    m.userData.uvSize = size;
    return m;
  };
  const M = {
    limestone: skin(NYC.limestone, 'deco', 0.7),
    sand: skin(NYC.sand, 'deco', 0.7),
    brick: skin(NYC.brick, 'brick', 1),
    brickDark: skin(NYC.brickDark, 'brick', 1),
    grey: skin(NYC.grey, 'stone', 0.8),
    glass: skin(NYC.glass, 'glass', 0.9, { roughness: 0.35 }),
    glassDark: skin(NYC.glassDark, 'glass', 0.9, { roughness: 0.35 }),
  };

  // --- Base: dark layer over pale stone with a wavy line, like the corner block ----
  function sideTexture(seed) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = NYC.stone;
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = NYC.asphalt;
    g.beginPath();
    g.moveTo(0, 0);
    for (let x = 0; x <= 512; x += 8) {
      const t = x / 512;
      g.lineTo(
        x,
        30 + Math.sin(t * Math.PI * 2 * 1.3 + seed) * 8 + Math.sin(t * Math.PI * 2 * 3.1 + seed * 2) * 4,
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
  // The layered base stops 1 below street level; the streets sit on it as a slab,
  // and the river runs lower along the front right edge.
  const base = new THREE.Mesh(new THREE.BoxGeometry(2 * S, DEPTH - 1, 2 * S), [
    side(1),
    side(2.3),
    mat(NYC.asphalt),
    mat(NYC.stone),
    side(4.1),
    side(5.7),
  ]);
  base.position.y = -1 - (DEPTH - 1) / 2;
  base.castShadow = base.receiveShadow = true;
  root.add(base);
  box(RIVER[0] + S, 1, 2 * S, (RIVER[0] - S) / 2, -1, 0, NYC.asphalt);
  box(RIVER[1] - RIVER[0], 0.55, 2 * S, (RIVER[0] + RIVER[1]) / 2, -1, 0, [NYC.water, { roughness: 0.25 }]);

  // --- Streets: dashes on the avenues and the riverside road, crosswalks -----------
  for (let t = -S + 1; t < S - 1; t += 2)
    for (const c of [-6, 6]) {
      box(0.9, 0.02, 0.12, t + 0.45, 0, c, NYC.line);
      box(0.12, 0.02, 0.9, c, 0, t + 0.45, NYC.line);
    }
  for (let t = -S + 1; t < S - 1; t += 2)
    box(0.12, 0.02, 0.9, (AVENUE[0] + AVENUE[1]) / 2, 0, t + 0.45, NYC.line);
  for (const cx of [-6, 6])
    for (const cz of [-6, 6])
      for (let k = -2; k <= 2; k++) {
        box(0.22, 0.02, 1.4, cx + k * 0.45, 0, cz - 2.1, NYC.white);
        box(1.4, 0.02, 0.22, cx - 2.1, 0, cz + k * 0.45, NYC.white);
      }

  // --- Blocks: raised sidewalks (or lawns) -----------------------------------------
  const block = (c, r, m = NYC.walk) => {
    const [x0, x1] = COLS[c],
      [z0, z1] = ROWS[r];
    box(x1 - x0, WALK, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, m);
    return { x0, x1, z0, z1, x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
  };
  // A plain tower: a textured body and a roof cap; returns the roof height.
  // Tall things, for the camera: [x, z, w, d, base, height] in city units.
  const occluders = [],
    occl = (x, z, w, d, h, y = WALK) => occluders.push([x, z, w, d, y, h]);
  const tower = (x, z, w, d, h, m, { y = WALK, cap = NYC.roof } = {}) => {
    occl(x, z, w, d, h + 0.22, y);
    box(w, h, d, x, y, z, m);
    box(w + 0.16, 0.22, d + 0.16, x, y + h, z, cap);
    return y + h + 0.22;
  };
  const waterTank = (x, y, z) => {
    for (const [a, b] of [
      [-0.3, -0.3],
      [0.3, -0.3],
      [-0.3, 0.3],
      [0.3, 0.3],
    ])
      box(0.08, 0.7, 0.08, x + a, y, z + b, NYC.wood);
    cyl(0.45, 0.45, 0.85, 8, x, y + 0.7, z, NYC.wood);
    add(new THREE.ConeGeometry(0.52, 0.45, 8).translate(0, 0.22, 0), NYC.wood, [x, y + 1.55, z]);
  };
  const roofBits = (x, y, z, w) => {
    box(0.7, 0.4, 0.5, x - w * 0.2, y, z, NYC.white);
    box(0.5, 0.3, 0.5, x + w * 0.2, y, z + 0.3, NYC.white);
  };

  // Empire State Building: stepped setbacks, mast and antenna.
  {
    const b = block('A', 'R1'),
      x = b.x,
      z = b.z;
    let y = WALK;
    occl(x, z, 6, 6, 33);
    for (const [w, h] of [
      [6, 3],
      [5, 6],
      [4, 12],
      [3.2, 3],
      [2.4, 2],
      [1.6, 1.4],
    ]) {
      box(w, h, w, x, y, z, M.limestone);
      box(w + 0.14, 0.18, w + 0.14, x, y + h, z, NYC.limestone);
      y += h + 0.18;
    }
    cyl(0.32, 0.55, 2, 8, x, y, z, NYC.steel);
    cyl(0.07, 0.1, 4, 6, x, y + 2, z, NYC.steel);
    tower(b.x0 + 1.4, z - 2, 2.4, 3.4, 7, M.brick);
    tower(b.x1 - 1.4, z + 1.6, 2.4, 4, 5, M.brickDark);
    waterTank(b.x1 - 1.4, WALK + 5.22, z + 1.6);
  }
  // Chrysler Building: shaft, then the stepped steel crown and the spire.
  {
    const b = block('B', 'R1'),
      x = b.x,
      z = b.z;
    let y = WALK;
    occl(x, z, 5.6, 5.6, 30);
    for (const [w, h] of [
      [5.6, 4],
      [4.4, 5],
      [3.4, 13],
    ]) {
      box(w, h, w, x, y, z, M.sand);
      box(w + 0.14, 0.18, w + 0.14, x, y + h, z, NYC.sand);
      y += h + 0.18;
    }
    const crown = [
      [1.9, 0],
      [1.9, 0.9],
      [1.6, 0.9],
      [1.6, 1.9],
      [1.25, 1.9],
      [1.25, 2.8],
      [0.9, 2.8],
      [0.9, 3.6],
      [0.55, 3.6],
      [0.55, 4.2],
      [0.2, 4.2],
    ].map(([r, h]) => new THREE.Vector2(r, h));
    add(new THREE.LatheGeometry(crown, 4).rotateY(Math.PI / 4), NYC.steel, [x, y, z]);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      for (const [h, r] of [
        [1.2, 1.62],
        [2.2, 1.27],
        [3.1, 0.92],
      ])
        add(new THREE.ConeGeometry(0.22, 0.5, 3).rotateY(a), NYC.dark, [
          x + Math.sin(a) * r,
          y + h,
          z + Math.cos(a) * r,
        ]);
    }
    add(new THREE.ConeGeometry(0.28, 4, 6).translate(0, 2, 0), NYC.steel, [x, y + 4.2, z]);
  }
  // A dark glass tower with low brick neighbours.
  {
    const b = block('B', 'R0'),
      x = b.x + 0.6,
      z = b.z + 0.6;
    tower(x, z, 5, 5, 28, M.glassDark, { cap: NYC.glassDark });
    roofBits(x, WALK + 28.2, z, 5);
    tower(b.x0 + 1.3, b.z0 + 2.4, 2.2, 4.2, 9, M.brick);
    waterTank(b.x0 + 1.3, WALK + 9.22, b.z0 + 2.4);
    tower(b.x1 - 1.2, b.z1 - 1.6, 2, 2.6, 6, M.grey);
  }
  // One World Trade Center: a square base twisting to a turned square top, faceted glass, spire.
  {
    const b = block('C', 'R0'),
      x = b.x,
      z = b.z;
    occl(x, z, 4.6, 4.6, 36);
    tower(x, z, 4.6, 4.6, 2.6, M.glass, { cap: NYC.glass });
    const h = 26,
      g = new THREE.CylinderGeometry(1.35, 2.97, h, 4, 1).translate(0, h / 2, 0),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++)
      if (p.getY(i) < 0.01) {
        const a = Math.atan2(p.getX(i), p.getZ(i)) + Math.PI / 4,
          r = Math.hypot(p.getX(i), p.getZ(i));
        p.setXYZ(i, Math.sin(a) * r, p.getY(i), Math.cos(a) * r);
      }
    add(g, M.glass, [x, WALK + 2.82, z]);
    const top = WALK + 2.82 + h;
    cyl(0.7, 0.7, 0.4, 8, x, top, z, NYC.steel);
    cyl(0.06, 0.1, 7, 6, x, top + 0.4, z, NYC.steel);
  }
  // A copper domed tower.
  {
    const b = block('C', 'R1'),
      x = b.x,
      z = b.z;
    const y = tower(x, z, 4, 4, 14, M.grey);
    cyl(1.45, 1.45, 1.3, 8, x, y, z, NYC.limestone);
    add(new THREE.SphereGeometry(1.45, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), NYC.copper, [x, y + 1.3, z]);
    cyl(0.3, 0.3, 0.6, 6, x, y + 2.7, z, NYC.copper);
    add(new THREE.ConeGeometry(0.3, 0.9, 6).translate(0, 0.45, 0), NYC.copper, [x, y + 3.3, z]);
  }
  // Left edge: brick and stone towers.
  {
    const b = block('A', 'R0');
    let y = tower(b.x - 2.4, b.z - 1, 4, 4, 18, M.brick);
    waterTank(b.x - 2.4, y, b.z - 1);
    tower(b.x + 3, b.z - 2.4, 3.6, 3.2, 12, M.grey);
    if (!drive) {
      y = tower(b.x + 3, b.z + 3, 3.4, 2.8, 8, M.brickDark);
      roofBits(b.x + 3, y, b.z + 3, 3);
    }
  }
  if (!skip('A,R2')) {
    const b = block('A', 'R2');
    let y = tower(b.x - 2.6, b.z - 1.6, 3.6, 3.6, 22, M.limestone, { cap: NYC.limestone });
    cyl(0.5, 0.8, 1.4, 4, b.x - 2.6, y, b.z - 1.6, NYC.limestone, [0, Math.PI / 4, 0]);
    y = tower(b.x + 2.8, b.z - 2.2, 3.6, 4, 10, M.brick);
    waterTank(b.x + 2.8, y, b.z - 2.2);
    tower(b.x + 0.4, b.z + 4.6, 6, 2.4, 5, M.brickDark);
  }
  // Liberty Island: a lawn, the star fort, the pedestal and the statue.
  {
    const b = block('B', 'R2', NYC.grass),
      x = b.x + 0.2,
      z = b.z - 0.4;
    occl(x, z, 2.6, 2.6, 13);
    const star = new THREE.Shape();
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2,
        r = i % 2 ? 2.2 : 3.1;
      star[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r);
    }
    add(
      new THREE.ExtrudeGeometry(star, { depth: 0.7, bevelEnabled: false }).rotateX(-Math.PI / 2),
      NYC.limestone,
      [x, WALK, z],
    );
    let y = WALK + 0.7;
    box(2.6, 0.5, 2.6, x, y, z, NYC.limestone);
    y += 0.5;
    box(2, 3.2, 2, x, y, z, NYC.sand);
    y += 3.2;
    box(2.3, 0.4, 2.3, x, y, z, NYC.limestone);
    y += 0.4;
    part(
      x,
      y,
      z,
      Math.PI * 0.15,
      P => {
        P(
          new THREE.LatheGeometry(
            [
              [0.7, 0],
              [0.62, 1.2],
              [0.5, 2.6],
              [0.42, 3.4],
              [0.3, 3.8],
              [0, 3.9],
            ].map(([r, h]) => new THREE.Vector2(r, h)),
            6,
          ),
          NYC.copper,
        );
        P(new THREE.IcosahedronGeometry(0.32, 0), NYC.copper, [0, 4.15, 0]);
        for (let k = 0; k < 7; k++) {
          const a = (k - 3) * 0.42;
          P(
            new THREE.ConeGeometry(0.06, 0.45, 3).translate(0, 0.22, 0),
            NYC.copper,
            [Math.sin(a) * 0.3, 4.3, Math.cos(a) * 0.3],
            [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9],
          );
        }
        P(
          new THREE.CylinderGeometry(0.11, 0.13, 1.7, 5).translate(0, 0.85, 0),
          NYC.copper,
          [0.38, 3.4, 0],
          [0, 0, -0.18],
        ); // raised arm
        P(new THREE.ConeGeometry(0.16, 0.3, 6).rotateX(Math.PI), NYC.gold, [0.68, 5.25, 0]);
        P(
          new THREE.IcosahedronGeometry(0.16, 0),
          [NYC.flame, { emissive: NYC.flame, emissiveIntensity: 0.9 }],
          [0.68, 5.45, 0],
        );
        P(new THREE.BoxGeometry(0.4, 0.55, 0.12), NYC.copper, [-0.48, 2.9, 0.15], [0, 0, 0.3]); // tablet
      },
      1.25,
    );
  }
  // A small park with a low brick building by the river.
  if (!skip('C,R2')) {
    const b = block('C', 'R2', NYC.grass);
    tower(b.x, b.z1 - 1.8, 4, 2.6, 3.2, M.brick);
  }

  // --- Trees: faceted crowns along the sidewalks and in the parks ------------------
  const tree = (x, z, s = 1, y = WALK) => {
    cyl(0.08 * s, 0.11 * s, 0.8 * s, 5, x, y, z, NYC.trunk);
    add(
      new THREE.IcosahedronGeometry(0.55 * s, 0),
      (x * 7 + z) % 2 > 1 ? NYC.grass : NYC.grassLight,
      [x, y + 1 * s, z],
      [x, z, 0],
    );
  };
  // Trees stand only on sidewalks and lawns, never on a road.
  const onBlock = (x, z) =>
    Object.entries(COLS).some(([c, [x0, x1]]) =>
      Object.entries(ROWS).some(
        ([r, [z0, z1]]) => !skip(c + ',' + r) && x > x0 + 0.3 && x < x1 - 0.3 && z > z0 + 0.3 && z < z1 - 0.3,
      ),
    );
  for (const [x, z, s] of [
    [-4.2, 9, 1],
    [-4.2, 12, 1.1],
    [-4, 16.5, 1],
    [4.1, 8.6, 1],
    [4.2, 17.6, 1.2],
    [-2, 17.8, 0.9],
    [2.5, 18, 1],
    [8.4, 8.6, 1],
    [11.4, 8.6, 1.1],
    [8.4, 11.6, 1.2],
    [11.6, 11.2, 1],
    [9.8, 10, 0.9],
    [-18.3, -4.2, 0.9],
    [-8.2, -4.2, 0.9],
    [-18.3, 7.8, 0.9],
    [-8.2, 7.8, 0.9],
    [-3.8, -7.8, 0.8],
    [3.8, -7.8, 0.8],
    [8.2, -4.2, 0.9],
    [12, -4.2, 0.9],
    [8.2, 4.2, 0.8],
  ])
    if (onBlock(x, z)) tree(x, z, s);
  // A strip of lawn and trees between the riverside road and the water.
  if (!drive) for (let t = -17; t <= 17; t += 4.2) tree(14.6, t + 1, 0.7, 0);

  // --- Brooklyn Bridge: gothic towers, deck, main cables, suspenders, stays ---------
  // (The drivable version, with ramps, is built at full size in bridge.js.)
  if (!drive) {
    const towerZ = [-8, 8],
      TH = 7.4;
    {
      const face = new THREE.Shape([
        new THREE.Vector2(-1.7, 0),
        new THREE.Vector2(1.7, 0),
        new THREE.Vector2(1.6, TH),
        new THREE.Vector2(-1.6, TH),
      ]);
      for (const cx of [-0.8, 0.8]) {
        const hole = new THREE.Path();
        hole.moveTo(cx - 0.42, 0.9);
        hole.lineTo(cx + 0.42, 0.9);
        hole.lineTo(cx + 0.42, 4.4);
        hole.lineTo(cx, 5.2);
        hole.lineTo(cx - 0.42, 4.4);
        hole.closePath();
        face.holes.push(hole);
      }
      for (const tz of towerZ) {
        add(
          new THREE.ExtrudeGeometry(face, { depth: 0.9, bevelEnabled: false }).translate(0, 0, -0.45),
          NYC.bridge,
          [BRIDGE_X, -0.5, tz],
        );
        box(3.6, 0.3, 1.1, BRIDGE_X, TH - 0.5, tz, NYC.bridge);
      }
    }
    box(2.4, 0.3, 2 * S, BRIDGE_X, DECK_Y - 0.3, 0, NYC.bridge);
    box(2.2, 0.02, 2 * S, BRIDGE_X, DECK_Y, 0, NYC.asphalt);
    for (let t = -S + 1; t < S - 1; t += 2) box(0.08, 0.02, 0.7, BRIDGE_X, DECK_Y + 0.01, t + 0.4, NYC.line);
    for (const s of [-1, 1]) {
      box(0.08, 0.4, 2 * S, BRIDGE_X + s * 1.15, DECK_Y, 0, NYC.cable);
    } // side rails
    // Main cables: from the deck at each end up to the tower tops and sagging between.
    const cableY = z => {
      const top = TH - 0.5 + 0.2;
      if (z < towerZ[0]) {
        const k = (z + S) / (towerZ[0] + S);
        return DECK_Y + 0.2 + (top - DECK_Y - 0.2) * k * k;
      }
      if (z > towerZ[1]) {
        const k = (S - z) / (S - towerZ[1]);
        return DECK_Y + 0.2 + (top - DECK_Y - 0.2) * k * k;
      }
      const k = z / towerZ[1];
      return DECK_Y + 1.3 + (top - DECK_Y - 1.3) * k * k;
    };
    for (const s of [-1, 1]) {
      const cx = BRIDGE_X + s * 1.05,
        pts = [];
      for (let z = -S; z <= S; z += 0.5) pts.push(new THREE.Vector3(cx, cableY(z), z));
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.07, 5), NYC.cable);
      for (let z = -S + 0.6; z < S; z += 0.6) {
        const h = cableY(z) - DECK_Y;
        if (h > 0.25) box(0.03, h, 0.03, cx, DECK_Y, z, NYC.cable);
      }
      for (const tz of towerZ)
        for (const d of [-1, 1])
          for (let k = 1; k <= 4; k++) {
            const z1 = tz + d * k * 1.3,
              from = new THREE.Vector3(cx, TH - 0.6, tz),
              to = new THREE.Vector3(cx, DECK_Y + 0.1, z1);
            add(new THREE.TubeGeometry(new THREE.LineCurve3(from, to), 1, 0.025, 4), NYC.cable);
          }
    }
  }
  // --- Four way crossings: a traffic light on each corner, one head per direction --
  // Lights for traffic moving along z and along x switch in turn (green, yellow, red).
  const LIGHT = { z: {}, x: {} };
  for (const a of ['z', 'x'])
    for (const [c, hex] of [
      ['r', '#ff3b30'],
      ['y', '#ffc93a'],
      ['g', '#3fe07a'],
    ])
      LIGHT[a][c] = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.05,
        flatShading: true,
      });
  const housing = mat(NYC.dark),
    pole = mat('#4a4f5c');
  for (const ix of [-6, 6])
    for (const iz of [-6, 6])
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        const px = ix + sx * 1.75,
          pz = iz + sz * 1.75;
        box(0.07, 1.25, 0.07, px, WALK, pz, pole);
        // One head faces traffic coming along z (from the side this corner serves), one along x.
        for (const [a, fx, fz] of [
          ['z', 0, -sz],
          ['x', -sx, 0],
        ]) {
          const hx = px + fx * 0.12,
            hz = pz + fz * 0.12,
            y = WALK + 1.05;
          box(fx ? 0.12 : 0.2, 0.5, fx ? 0.2 : 0.12, hx, y, hz, housing);
          ['r', 'y', 'g'].forEach((c, k) =>
            add(new THREE.SphereGeometry(0.055, 6, 4), LIGHT[a][c], [
              hx + fx * 0.07,
              y + 0.4 - k * 0.15,
              hz + fz * 0.07,
            ]),
          );
        }
      }
  // 20 s cycle: z green 8 s, yellow 2 s; then x green 8 s, yellow 2 s.
  const phase = t => {
    const k = t % 20;
    return { z: k < 8 ? 'g' : k < 10 ? 'y' : 'r', x: k < 10 ? 'r' : k < 18 ? 'g' : 'y' };
  };
  K.finish(root);

  // --- Taxis: one instanced draw call, driving the lanes and fading at the edges ----
  const taxiGeo = (() => {
    const parts = [],
      col = (g, c) => {
        g = g.index ? g.toNonIndexed() : g;
        g.deleteAttribute('uv');
        const cc = new THREE.Color(c),
          a = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < a.length; i += 3) {
          a[i] = cc.r;
          a[i + 1] = cc.g;
          a[i + 2] = cc.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(a, 3));
        parts.push(g);
      };
    col(B(0.62, 0.26, 1.3).translate(0, 0.1, 0), NYC.taxi);
    col(B(0.56, 0.24, 0.7).translate(0, 0.36, -0.06), NYC.taxi);
    col(B(0.58, 0.16, 0.64).translate(0, 0.4, -0.06), NYC.dark);
    col(B(0.22, 0.08, 0.14).translate(0, 0.6, -0.06), NYC.white);
    for (const [x, z] of [
      [-0.3, 0.42],
      [0.3, 0.42],
      [-0.3, -0.42],
      [0.3, -0.42],
    ])
      col(
        new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8).rotateZ(Math.PI / 2).translate(x, 0.12, z),
        NYC.dark,
      );
    return mergeGeometries(parts, false);
  })();
  // Lanes: [axis, fixed coordinate, direction, height, count, speed].
  const lanes = [
    ['z', -6.55, 1, 0, 3, 2.4],
    ['z', -5.45, -1, 0, 3, 2.1],
    ['z', 5.45, 1, 0, 3, 2.3],
    ['z', 6.55, -1, 0, 2, 2.6],
    ['x', -6.55, -1, 0, 3, 2.2],
    ['x', -5.45, 1, 0, 2, 2.5],
    ['x', 5.45, -1, 0, 3, 2.4],
    ['x', 6.55, 1, 0, 3, 2],
    ['z', 13.3, 1, 0, 4, 3],
    ['z', 14.3, -1, 0, 4, 3.2],
    ['z', BRIDGE_X - 0.55, 1, DECK_Y, 3, 2.8],
    ['z', BRIDGE_X + 0.55, -1, DECK_Y, 3, 2.6],
  ];
  // Driving: about one taxi in ten, on four lanes.
  const used = drive
    ? lanes.filter((_, i) => [0, 4, 6, 8].includes(i)).map(l => [...l.slice(0, 4), 1, l[5]])
    : lanes;
  const cars = [];
  used.forEach(([axis, fixed, dir, y, n, v], li) => {
    for (let i = 0; i < n; i++)
      cars.push({ axis, fixed, dir, y, v, s: -S + (2 * S * (i + ((li * 0.37) % 1))) / n });
  });
  const taxis = new THREE.InstancedMesh(taxiGeo, mat('#ffffff', { vertexColors: true }), cars.length);
  taxis.castShadow = taxis.receiveShadow = true;
  taxis.frustumCulled = false;
  root.add(taxis);
  const o = new THREE.Object3D(),
    END = S - 0.5;
  let lightTime = 0;
  function updateTaxis(dt) {
    const ph = phase(lightTime);
    cars.forEach((c, i) => {
      // Stop before the crosswalk unless the light for this direction is green.
      let want = c.v;
      if (c.y === 0 && Math.abs(Math.abs(c.fixed) - 6) < 1.2 && ph[c.axis] !== 'g')
        for (const I of [-6, 6]) {
          const ahead = (I - c.dir * 3 - c.s) * c.dir;
          if (ahead > -0.05 && ahead < 2.2) {
            want = 0;
            break;
          }
        }
      c.cur = damp(c.cur ?? c.v, want, want ? 2 : 4, dt);
      c.s += c.cur * c.dir * dt;
      if (c.s > END) c.s -= 2 * END;
      if (c.s < -END) c.s += 2 * END;
      const edge = Math.min(1, (END - Math.abs(c.s)) / 1.2); // shrink away at the base edge
      if (c.axis === 'z') {
        o.position.set(c.fixed, c.y, c.s);
        o.rotation.y = c.dir > 0 ? 0 : Math.PI;
      } else {
        o.position.set(c.s, c.y, c.fixed);
        o.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      o.scale.setScalar(Math.max(0.001, edge));
      o.updateMatrix();
      taxis.setMatrixAt(i, o.matrix);
    });
    taxis.instanceMatrix.needsUpdate = true;
  }
  updateTaxis(0);

  // --- Sky: low poly clouds and the sun, bobbing gently --------------------------
  const sky = new THREE.Group();
  root.add(sky);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: NYC.cloud,
    flatShading: true,
    roughness: 1,
    emissive: '#ffffff',
    emissiveIntensity: 0.18,
  });
  const floaters = [];
  for (const [x, y, z, s] of [
    [-17, 27, 4, 1.2],
    [-2, 33, 8, 0.8],
    [17, 25, -15, 1],
    [4, 23, 15, 0.7],
  ]) {
    const parts = [
      [0, 0, 0, 1.3],
      [1.2, -0.2, 0.2, 1],
      [-1.2, -0.25, -0.1, 0.95],
      [0.5, 0.55, -0.3, 0.9],
      [-0.6, 0.4, 0.3, 0.8],
    ].map(([px, py, pz, r]) => new THREE.IcosahedronGeometry(r, 1).scale(1, 0.8, 1).translate(px, py, pz));
    const cloud = new THREE.Mesh(
      mergeGeometries(
        parts.map(g => (g.index ? g.toNonIndexed() : g)),
        false,
      ),
      cloudMat,
    );
    cloud.scale.setScalar(s);
    cloud.position.set(x, y, z);
    sky.add(cloud);
    floaters.push({ o: cloud, y, phase: x * 0.3 });
  }
  const sun = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.7, 1),
    new THREE.MeshStandardMaterial({
      color: NYC.sun,
      flatShading: true,
      emissive: '#ffb800',
      emissiveIntensity: 0.55,
    }),
  );
  sun.position.set(9, 31, -5);
  sky.add(sun);
  floaters.push({ o: sun, y: 31, phase: 2 });

  let time = 0;
  // Taxis on the ground as circles the player's car bumps into (city units).
  const circles = cars.filter(c => c.y === 0).map(() => [0, 0, 0.36]); // about a taxi's half width
  function obstacles() {
    let k = 0;
    for (const c of cars)
      if (c.y === 0) {
        const q = circles[k++];
        if (c.axis === 'z') {
          q[0] = c.fixed;
          q[1] = c.s;
        } else {
          q[0] = c.s;
          q[1] = c.fixed;
        }
      }
    return circles;
  }
  return {
    root,
    obstacles,
    occluders,
    update(dt) {
      time += dt;
      lightTime += dt;
      const ph = phase(lightTime);
      for (const a of ['z', 'x'])
        for (const c of ['r', 'y', 'g']) LIGHT[a][c].emissiveIntensity = ph[a] === c ? 1.6 : 0.05;
      updateTaxis(dt);
      for (const f of floaters) f.o.position.y = f.y + Math.sin(time * 0.6 + f.phase) * 0.35;
      sun.rotation.y += dt * 0.15;
      return true;
    },
  };
}
