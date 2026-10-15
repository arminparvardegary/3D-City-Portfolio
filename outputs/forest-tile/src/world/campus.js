import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeStatic } from '../geometry.js';
import { THEME } from './theme.js';
import { TILE } from './units.js';
import { JOBS, SHOPS } from '../data/profile.js';

// The white campus: the whole map as one architectural white model. Raised
// plinths sit between floor level roads; on them, a small kit of white
// buildings (finned towers, banded blocks, warehouses, a factory with a blue
// glass entrance). Five hero buildings carry Armin's sections and four outer
// campuses carry the studios he worked at; each has a floating label with a
// blue signal beam and a slow pulse on its roof. Everything static is merged
// per material (a handful of draw calls); only the beacons animate.
const C = THEME.campus,
  G = TILE.slab,
  PLINTH = 0.35;
const FLOOR = G + PLINTH; // top of a plinth

// Roads (floor level) and the blocks between them. A square map: x and z -45..45.
export const ROADS = { h: [-30, 0, 30], v: [-15, 15], half: 3 };
const MAP = { x0: -45, x1: 45, z0: -45, z1: 45 };
const COLS = [
    [-45, -18],
    [-12, 12],
    [18, 45],
  ],
  ROWS = [
    [-45, -33],
    [-27, -3],
    [3, 27],
    [33, 45],
  ];
// The start: an open plaza where the roads cross at the origin.
export const PLAZA = { x0: -12, x1: 12, z0: -9, z1: 9 };

export function buildCampus({ prep }) {
  const group = new THREE.Group();
  group.name = 'campus';
  const std = (color, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...extra });
    prep?.(m);
    return m;
  };
  const M = {
    white: std(C.white),
    soft: std(C.soft),
    groove: std(C.groove),
    window: std(C.window, { roughness: 0.5 }),
    dark: std(C.dark, { roughness: 0.6 }),
    plinth: std(C.plinth),
    glass: std(C.glass, {
      roughness: 0.15,
      metalness: 0.1,
      emissive: C.blue,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.88,
    }),
    glassLight: std(C.blueLight, { roughness: 0.2, emissive: C.blueLight, emissiveIntensity: 0.15 }),
  };
  const solids = []; // [x, z, halfW, halfD]: where the car (and physics) cannot go
  const B = (w, h, d, x, y, z, m = M.white) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    group.add(o);
    return o;
  };
  const cyl = (r, h, x, y, z, m = M.white, seg = 16, rx = 0) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
    o.position.set(x, y, z);
    o.rotation.x = rx;
    o.castShadow = o.receiveShadow = true;
    group.add(o);
    return o;
  };

  // --- Ground: road strips and raised plinths ---------------------------------
  const roadMat = std(THEME.palette.road, { roughness: 0.95 });
  const strip = (x0, x1, z0, z1) => {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), roadMat);
    o.position.set((x0 + x1) / 2, G + 0.004, (z0 + z1) / 2);
    o.receiveShadow = true;
    group.add(o);
  };
  for (const z of ROADS.h) strip(MAP.x0, MAP.x1, z - ROADS.half, z + ROADS.half);
  for (const x of ROADS.v) strip(x - ROADS.half, x + ROADS.half, MAP.z0, MAP.z1);
  strip(PLAZA.x0, PLAZA.x1, PLAZA.z0, PLAZA.z1);
  function plinth(x0, x1, z0, z1) {
    const w = x1 - x0,
      d = z1 - z0,
      o = new THREE.Mesh(new RoundedBoxGeometry(w, PLINTH * 2, d, 2, 0.3), M.plinth);
    o.position.set((x0 + x1) / 2, G, (z0 + z1) / 2);
    o.castShadow = o.receiveShadow = true;
    group.add(o);
    solids.push([(x0 + x1) / 2, (z0 + z1) / 2, w / 2, d / 2]);
    return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w, d, x0, x1, z0, z1 };
  }
  // Thin rails along a plinth edge, like the model's walkway guards.
  const rail = (x0, z0, x1, z1) =>
    B(
      Math.abs(x1 - x0) || 0.12,
      0.16,
      Math.abs(z1 - z0) || 0.12,
      (x0 + x1) / 2,
      FLOOR + 0.08,
      (z0 + z1) / 2,
      M.soft,
    );

  // --- Building kit ------------------------------------------------------------
  // Finned tower: a white core wrapped in thin vertical fins.
  function finTower(x, z, w, d, h, { base = FLOOR, gap = 0.42 } = {}) {
    B(w - 0.2, h, d - 0.2, x, base + h / 2, z, M.groove);
    for (let i = 0; i <= Math.floor(w / gap); i++) {
      const fx = x - w / 2 + i * (w / Math.floor(w / gap));
      B(0.1, h, 0.18, fx, base + h / 2, z + d / 2 - 0.09);
      B(0.1, h, 0.18, fx, base + h / 2, z - d / 2 + 0.09);
    }
    for (let i = 0; i <= Math.floor(d / gap); i++) {
      const fz = z - d / 2 + i * (d / Math.floor(d / gap));
      B(0.18, h, 0.1, x + w / 2 - 0.09, base + h / 2, fz);
      B(0.18, h, 0.1, x - w / 2 + 0.09, base + h / 2, fz);
    }
    B(w + 0.12, 0.22, d + 0.12, x, base + h + 0.11, z);
    B(w * 0.5, 0.5, d * 0.4, x, base + h + 0.47, z, M.soft);
    return base + h + 0.72;
  }
  // Banded block: white floor slabs with recessed window bands.
  function bandBlock(x, z, w, d, floors, { base = FLOOR, fh = 1.05, roof = true } = {}) {
    for (let f = 0; f < floors; f++) {
      const y = base + f * fh;
      B(w, fh * 0.42, d, x, y + fh * 0.21, z);
      B(w - 0.24, fh * 0.58, d - 0.24, x, y + fh * 0.42 + fh * 0.29, z, M.window);
    }
    const top = base + floors * fh;
    B(w, 0.3, d, x, top + 0.15, z);
    if (roof) {
      B(w - 0.4, 0.25, 0.12, x, top + 0.42, z - d / 2 + 0.26, M.white);
      B(1.1, 0.5, 0.8, x - w * 0.25, top + 0.55, z, M.soft);
      B(0.8, 0.4, 0.8, x + w * 0.2, top + 0.5, z + d * 0.15, M.soft);
    }
    return top + 0.3;
  }
  // Slab block: like a banded block, with mullions on the faces the camera sees.
  function slabBlock(x, z, w, d, floors, opts = {}) {
    const base = opts.base ?? FLOOR,
      fh = opts.fh ?? 1.05;
    for (let f = 0; f < floors; f++) {
      const y = base + f * fh;
      B(w, fh * 0.42, d, x, y + fh * 0.21, z);
      B(w - 0.24, fh * 0.58, d - 0.24, x, y + fh * 0.42 + fh * 0.29, z, M.window);
      // Mullions on the two faces the camera sees.
      for (let k = 1; k < Math.floor(w / 1.2); k++)
        B(0.07, fh * 0.58, 0.08, x - w / 2 + (k * w) / Math.floor(w / 1.2), y + fh * 0.71, z + d / 2 - 0.12);
      for (let k = 1; k < Math.floor(d / 1.2); k++)
        B(0.08, fh * 0.58, 0.07, x + w / 2 - 0.12, y + fh * 0.71, z - d / 2 + (k * d) / Math.floor(d / 1.2));
    }
    const top = base + floors * fh;
    B(w + 0.1, 0.3, d + 0.1, x, top + 0.15, z);
    if (opts.roof !== false) {
      B(1.2, 0.5, 0.9, x - w * 0.25, top + 0.55, z, M.soft);
      B(0.8, 0.4, 0.8, x + w * 0.22, top + 0.5, z + d * 0.15, M.soft);
      B(0.9, 0.12, 0.9, x + w * 0.22, top + 0.76, z + d * 0.15, M.groove);
    }
    return top + 0.3;
  }
  // Warehouse: low walls, a gable roof with ribs, roller doors.
  function warehouse(x, z, w, d, h) {
    B(w, h, d, x, FLOOR + h / 2, z);
    const rise = w * 0.22,
      shape = new THREE.Shape([
        new THREE.Vector2(-w / 2 - 0.25, 0),
        new THREE.Vector2(w / 2 + 0.25, 0),
        new THREE.Vector2(0, rise),
      ]);
    const roof = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: d + 0.5, bevelEnabled: false }),
      M.white,
    );
    roof.position.set(x, FLOOR + h, z - d / 2 - 0.25);
    roof.castShadow = roof.receiveShadow = true;
    group.add(roof);
    const slope = Math.atan2(rise, w / 2 + 0.25),
      half = Math.hypot(w / 2 + 0.25, rise);
    for (let i = 0; i < Math.floor(d / 0.6); i++) {
      const zz = z - d / 2 + 0.3 + i * 0.6;
      for (const s of [-1, 1]) {
        const r = B(half, 0.05, 0.07, x + s * (w / 4 + 0.06), FLOOR + h + rise / 2 + 0.03, zz, M.soft);
        r.rotation.z = -s * slope;
      }
    }
    // Skylight bands and doors on the camera side (+x face).
    for (const s of [-1, 1])
      for (const o of [-0.22, 0.22]) {
        const k = B(
          half * 0.08,
          0.06,
          d * 0.8,
          x + s * (w / 4 + 0.06) + o * Math.cos(slope) * half * 0.9 * s,
          FLOOR + h + rise / 2 + 0.06 - o * Math.sin(slope) * half * 0.9,
          z,
          M.glassLight,
        );
        k.rotation.z = -s * slope;
      }
    for (let i = 0; i < 3; i++) {
      const dz = z - d / 3 + (i * d) / 3;
      B(0.1, h * 0.7, d / 4, x + w / 2 + 0.05, FLOOR + h * 0.35, dz, M.groove);
      for (let r = 1; r < 6; r++)
        B(0.12, 0.03, d / 4, x + w / 2 + 0.06, FLOOR + (r * h * 0.7) / 6, dz, M.soft);
    }
    return FLOOR + h + rise;
  }
  // Factory: a long banded block with a blue glass entrance and a name plate.
  function factory(x, z) {
    const top = slabBlock(x, z, 18, 6, 3);
    // Glass entrance: a triangular prism in front of the +z face, fins on the glass.
    const shape = new THREE.Shape([
      new THREE.Vector2(-3.4, 0),
      new THREE.Vector2(3.4, 0),
      new THREE.Vector2(0.9, 4.6),
      new THREE.Vector2(-0.6, 3.4),
    ]);
    const glass = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: false }),
      M.glass,
    );
    glass.position.set(x + 1, FLOOR, z + 3);
    glass.castShadow = true;
    glass.receiveShadow = true;
    group.add(glass);
    for (let i = 0; i < 9; i++) {
      const fx = x + 1 - 3.2 + i * 0.8,
        hgt = i < 5 ? (3.4 * (i + 0.4)) / 5.4 + 0.2 : 4.6 - (i - 4) * 0.8;
      B(
        0.08,
        Math.max(0.4, Math.min(4.6, hgt)),
        0.08,
        fx,
        FLOOR + Math.max(0.4, Math.min(4.6, hgt)) / 2,
        z + 5.62,
        M.white,
      );
    }
    // Name plate on the plaza side, tilted back like a model label.
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 192;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 1024, 192);
    g.strokeStyle = C.blue;
    g.lineWidth = 10;
    g.strokeRect(14, 14, 996, 164);
    g.fillStyle = C.dark;
    g.font = '600 120px -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.letterSpacing = '28px';
    g.fillText('ARMIN', 512, 100);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.05, 0.12), [
      M.white,
      M.white,
      M.white,
      M.white,
      std('#ffffff', { map, roughness: 0.6 }),
      M.white,
    ]);
    plate.position.set(x + 1, FLOOR + 0.55, z + 7.2);
    plate.rotation.x = -0.55;
    plate.castShadow = plate.receiveShadow = true;
    plate.userData.keep = true;
    group.add(plate);
    B(5.8, 0.12, 0.3, x + 1, FLOOR + 0.06, z + 7.45, M.glass);
    return top;
  }
  // Stepped block: three stacked banded volumes stepping back, with balconies.
  function stepped(x, z, w, d) {
    let t = slabBlock(x, z, w, d, 3, { roof: false });
    t = slabBlock(x - 0.6, z - 0.6, w - 1.6, d - 1.4, 2, { base: t, roof: false });
    return slabBlock(x - 1.1, z - 1.1, w - 3, d - 2.6, 2, { base: t });
  }
  // Gatehouse with an arched pass and a covered bridge to a neighbour.
  function gate(x, z, w, d) {
    B(w, 2.4, d, x, FLOOR + 1.2, z);
    B(w - 1.4, 1.5, d + 0.04, x, FLOOR + 0.75, z, M.groove);
    for (let i = 0; i < 5; i++) B(w + 0.1, 0.06, d + 0.1, x, FLOOR + 1.4 + i * 0.2, z, M.soft);
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(d / 2, d / 2, w, 24, 1, false, 0, Math.PI),
      M.white,
    );
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(x, FLOOR + 2.4, z);
    roof.castShadow = roof.receiveShadow = true;
    group.add(roof);
    return FLOOR + 2.4 + d / 2;
  }
  function bridge(x0, x1, z, y, { w = 2.2 } = {}) {
    const len = x1 - x0;
    B(len, 0.3, w, (x0 + x1) / 2, y, z);
    B(len, 0.08, w - 0.4, (x0 + x1) / 2, y + 1.2, z, M.soft);
    for (let i = 0; i <= Math.floor(len / 0.8); i++)
      B(0.06, 1.1, 0.06, x0 + (i * len) / Math.floor(len / 0.8), y + 0.7, z + w / 2 - 0.1, M.white);
    B(len, 1, 0.04, (x0 + x1) / 2, y + 0.66, z + w / 2 - 0.14, M.glassLight);
    for (const px of [x0 + len * 0.33, x0 + len * 0.66]) {
      B(0.4, y - G, 0.4, px, G + (y - G) / 2, z, M.white);
      solids.push([px, z, 0.2, 0.2]);
    }
  }
  // Low shed and solar rows for the quiet outer blocks.
  function shed(x, z, w, d, h = 1.6) {
    B(w, h, d, x, FLOOR + h / 2, z);
    for (let i = 0; i < Math.floor(w / 1.4); i++)
      B(0.9, 0.08, d - 0.6, x - w / 2 + 0.9 + i * 1.4, FLOOR + h + 0.04, z, M.soft);
    return FLOOR + h;
  }
  function solar(x, z, w, d) {
    for (let r = 0; r < Math.floor(d / 1.6); r++) {
      const p = B(w, 0.06, 1.1, x, FLOOR + 0.5, z - d / 2 + 0.8 + r * 1.6, M.window);
      p.rotation.x = -0.35;
      B(w, 0.4, 0.08, x, FLOOR + 0.2, z - d / 2 + 0.8 + r * 1.6 + 0.3, M.soft);
    }
  }

  // --- Vehicles (static, merged) -------------------------------------------------
  function miniCar(x, z, yaw = 0) {
    const o = new THREE.Group();
    o.position.set(x, FLOOR, z);
    o.rotation.y = yaw;
    group.add(o);
    const add = (w, h, d, px, py, pz, m) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.3), m);
      b.position.set(px, py, pz);
      b.castShadow = b.receiveShadow = true;
      o.add(b);
    };
    add(1.5, 0.5, 3, 0, 0.42, 0, M.white);
    add(1.3, 0.42, 1.5, 0, 0.84, -0.15, M.white);
    add(1.32, 0.28, 1.3, 0, 0.86, -0.15, M.dark);
    for (const [wx, wz] of [
      [-0.7, 0.95],
      [0.7, 0.95],
      [-0.7, -0.95],
      [0.7, -0.95],
    ]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.22, 14), M.dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.27, wz);
      w.castShadow = true;
      o.add(w);
    }
  }
  function truck(x, z, yaw = 0) {
    const o = new THREE.Group();
    o.position.set(x, FLOOR, z);
    o.rotation.y = yaw;
    group.add(o);
    const add = (w, h, d, px, py, pz, m) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.06), m);
      b.position.set(px, py, pz);
      b.castShadow = b.receiveShadow = true;
      o.add(b);
    };
    add(1.9, 2, 4, 0, 1.4, -0.7, M.white);
    add(1.8, 1.35, 1.4, 0, 1.05, 2.05, M.white);
    add(1.82, 0.5, 0.9, 0, 1.35, 2.35, M.dark);
    add(1.9, 0.18, 5.6, 0, 0.4, 0, M.groove);
    for (const [wx, wz] of [
      [-0.85, 1.9],
      [0.85, 1.9],
      [-0.85, -1.6],
      [0.85, -1.6],
      [-0.85, -2.3],
      [0.85, -2.3],
    ]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14), M.dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.36, wz);
      w.castShadow = true;
      o.add(w);
    }
  }
  // A row of stalls: cars nose in, the row runs across the cars (along x for yaw 0, along z for a quarter turn).
  const parking = (x0, z0, n, yaw = 0, gap = 2.2) => {
    const side = Math.abs(Math.sin(yaw)) > 0.5;
    for (let i = 0; i < n; i++) {
      const x = side ? x0 : x0 + i * gap,
        z = side ? z0 + i * gap : z0;
      const l = B(0.07, 0.01, 3.2, side ? x : x - gap / 2, FLOOR + 0.006, side ? z - gap / 2 : z, M.groove);
      if (side) l.rotation.y = Math.PI / 2;
      if (i % 3 !== 1) miniCar(x, z, yaw);
    }
  };

  // --- Beacons: label card, signal icon, beam and a pulse on the roof ---------
  // Clickable places: id -> where to look, plus the plinth footprint and label.
  const beacons = [],
    places = {},
    zones = [],
    labels = [];
  function beacon(x, z, top, text, { size = 1, sub = '', id = null, zone = null } = {}) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 320;
    const g = c.getContext('2d');
    const font = '-apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
    g.font = `600 54px ${font}`;
    let tw = g.measureText(text).width;
    if (sub) {
      g.font = `500 36px ${font}`;
      tw = Math.max(tw, g.measureText(sub).width);
    }
    tw = Math.min(490, tw + 72);
    const cx = 256,
      ch = sub ? 118 : 96,
      cy = sub ? 14 : 26;
    g.shadowColor = 'rgba(40,60,110,.16)';
    g.shadowBlur = 22;
    g.shadowOffsetY = 6;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(cx - tw / 2, cy, tw, ch, 22);
    g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = C.label;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `600 54px ${font}`;
    g.fillText(text, cx, sub ? cy + 44 : 76);
    if (sub) {
      g.fillStyle = C.blue;
      g.font = `500 36px ${font}`;
      g.fillText(sub, cx, cy + 92);
    }
    // Signal icon: a dot and three arcs.
    g.strokeStyle = C.blue;
    g.fillStyle = C.blue;
    g.lineCap = 'round';
    for (let i = 1; i <= 3; i++) {
      g.globalAlpha = 1 - i * 0.22;
      g.lineWidth = 7;
      g.beginPath();
      g.ellipse(cx, 226, 24 * i, 9 * i, 0, Math.PI * 1.08, Math.PI * 1.92);
      g.stroke();
      g.beginPath();
      g.ellipse(cx, 226, 24 * i, 9 * i, 0, Math.PI * 0.08, Math.PI * 0.92);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.beginPath();
    g.ellipse(cx, 226, 12, 6, 0, 0, Math.PI * 2);
    g.fill();
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthWrite: false, transparent: true }));
    const lift = 3.6 * size;
    label.center.set(0.5, 0.29);
    label.scale.set(5.2 * size, 3.25 * size, 1);
    label.position.set(x, top + lift, z);
    label.renderOrder = 10;
    group.add(label);
    label.userData.keep = true;
    // The beam: narrow under the icon, fading toward the roof.
    const beamGeo = new THREE.CylinderGeometry(0.05 * size, 0.42 * size, lift - 0.3, 20, 1, true);
    const n = beamGeo.attributes.position.count,
      col = new Float32Array(n * 4),
      blue = new THREE.Color(C.blue);
    for (let i = 0; i < n; i++) {
      const t = beamGeo.attributes.position.getY(i) / (lift - 0.3) + 0.5;
      col.set([blue.r, blue.g, blue.b, 0.06 + 0.62 * t * t], i * 4);
    }
    beamGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    const beam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.set(x, top + 0.15 + (lift - 0.3) / 2, z);
    beam.userData.keep = true;
    beam.renderOrder = 9;
    group.add(beam);
    // The pulse: a flat ring that spreads over the roof and fades.
    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: C.blue, transparent: true, depthWrite: false, opacity: 0 }),
    );
    pulse.position.set(x, top + 0.06, z);
    pulse.userData.keep = true;
    pulse.renderOrder = 8;
    group.add(pulse);
    beacons.push({ label, pulse, phase: beacons.length * 0.37, size, y: label.position.y });
    if (id) {
      label.userData.id = id;
      labels.push(label);
      places[id] = { x, z };
      if (zone) zones.push({ id, x0: zone.x0, x1: zone.x1, z0: zone.z0, z1: zone.z1 });
    }
  }

  // --- Layout ------------------------------------------------------------------------
  const inset = 1.6,
    edge = 2;
  const block = (ci, ri, cut = {}) => {
    const [x0, x1] = COLS[ci],
      [z0, z1] = ROWS[ri];
    return plinth(
      cut.x0 ?? x0 + (ci === 0 ? edge : inset),
      cut.x1 ?? x1 - (ci === COLS.length - 1 ? edge : inset),
      cut.z0 ?? z0 + (ri === 0 ? edge : inset),
      cut.z1 ?? z1 - (ri === ROWS.length - 1 ? edge : inset),
    );
  };

  // Hero campus around the start (the composition of the reference model).
  {
    const p = block(1, 1, { z1: PLAZA.z0 - 1.6 }); // Work: two towers on a podium
    const podium = bandBlock(p.x, p.z - 1, p.w - 2.5, p.d - 5, 1, { roof: false });
    const t1 = finTower(p.x - 3.2, p.z - 3.2, 5.2, 4.4, 11, { base: podium });
    B(0.08, 2.4, 0.08, p.x - 1.6, podium + 9, p.z + 0.4, M.dark);
    finTower(p.x + 4.2, p.z - 1.6, 4.2, 4.2, 8.4, { base: podium, gap: 0.32 });
    for (let i = 0; i < 3; i++)
      B(3.6, 0.05, 0.05, p.x + 1.4, podium + 6.5 + i * 0.5, p.z - 1.2 + i * 0.1, M.dark); // cables between the towers
    beacon(p.x - 3.2, p.z - 3.2, t1, 'Work', { size: 1.15, sub: 'Experience', id: 'work', zone: p });
  }
  {
    const p = block(0, 1); // Skills: stepped block, gatehouse, bridge to Work
    const t = stepped(p.x - 5, p.z + 3, 8, 7.5);
    beacon(p.x - 5.6, p.z + 2.4, t, 'Skills');
    gate(p.x + 6, p.z - 4, 5.4, 3.6);
    bridge(p.x + 8.7, -9, p.z - 4, FLOOR + 2.2);
    parking(p.x - 7, p.z - 7.5, 3, Math.PI / 2);
  }
  {
    const p = block(2, 1); // Contact: warehouse, truck, pallets
    const t = warehouse(p.x - 2, p.z - 1, 10, 13, 3.2);
    beacon(p.x - 2, p.z - 1, t, 'Contact');
    truck(p.x + 8, p.z + 5, 0);
    truck(p.x + 8, p.z - 3.5, Math.PI);
    for (let i = 0; i < 3; i++)
      for (let k = 0; k < 2; k++)
        B(1.1, 0.5, 1.1, p.x + 5.5 + k * 1.3, FLOOR + 0.25, p.z - 10 + i * 1.3, M.soft);
  }
  {
    const p = block(1, 2, { z0: PLAZA.z1 + 1.6 }); // About: the factory with the name plate
    const t = factory(p.x - 1, p.z - 1.5);
    beacon(p.x - 4, p.z - 1.5, t, 'About', { size: 1.1 });
    parking(p.x - 9, p.z + 5.8, 4, 0);
    for (let i = 0; i < 5; i++)
      B(0.5, 0.6, 0.5, p.x + 8 + (i % 3) * 0.7, FLOOR + 0.3, p.z + 5 + Math.floor(i / 3) * 0.7, M.soft);
  }
  {
    const p = block(2, 2); // Projects: banded block with an annex
    const t = slabBlock(p.x - 2, p.z - 2, 9, 7, 4);
    beacon(p.x - 2, p.z - 2, t, 'Projects');
    slabBlock(p.x + 7, p.z + 3, 4.4, 4, 1);
    B(2.2, 1.6, 0.1, p.x + 7, FLOOR + 0.8, p.z + 5.05, M.groove);
    parking(p.x - 7, p.z + 7.5, 6, 0);
  }

  // --- Experience Row: the four companies side by side, oldest to newest -------------
  // They stand on a plinth along the back of the block, growing taller with the
  // career; the front half is a parking lot at street level, one bay per company.
  // Parking in a bay is how the experience story starts (see main.js).
  const row = [],
    lot = {
      x0: COLS[0][0] + edge,
      x1: COLS[0][1] - inset,
      z0: 13.4 + inset,
      z1: ROWS[2][1] + inset - 0.01,
      bayZ: [16.2, 22.2],
      bays: [],
    };
  {
    const x0 = lot.x0,
      x1 = lot.x1,
      z0 = ROWS[2][0] + inset,
      z1 = 13.4,
      p = plinth(x0, x1, z0, z1),
      gap = (x1 - x0) / JOBS.length,
      blue = std(C.blue, { roughness: 0.6 });
    [...JOBS].reverse().forEach((j, i) => {
      const x = x0 + gap * (i + 0.5),
        w = gap - 1.4,
        d = z1 - z0 - 2.6,
        z = z0 + 1.1 + d / 2;
      const top =
        i === JOBS.length - 1 ? finTower(x, z, w, d, 10.5, { gap: 0.36 }) : slabBlock(x, z, w, d, 3 + i);
      // Entrance on the lot side: glass doors under a canopy in the company colour.
      B(w * 0.42, 1.8, 0.08, x, FLOOR + 0.9, z + d / 2 + 0.04, M.glass);
      B(w * 0.62, 0.16, 1.3, x, FLOOR + 2.05, z + d / 2 + 0.62, std(j.accent, { roughness: 0.6 }));
      beacon(x, z, top, j.name, {
        sub: `${j.start[0]} – ${j.end[0]}`,
        id: j.id,
        zone: { x0: x - w / 2, x1: x + w / 2, z0, z1 },
      });
      row.push({ id: j.id, x, z, top, w, front: z + d / 2 });
      lot.bays.push({ id: j.id, x, x0: x - gap / 2 + 0.25, x1: x + gap / 2 - 0.25 });
      // Bay lines in blue, and the company colour painted at the head of the bay.
      B(
        0.12,
        0.012,
        lot.bayZ[1] - lot.bayZ[0],
        x - gap / 2,
        G + 0.006,
        (lot.bayZ[0] + lot.bayZ[1]) / 2,
        blue,
      );
      if (i === JOBS.length - 1)
        B(
          0.12,
          0.012,
          lot.bayZ[1] - lot.bayZ[0],
          x + gap / 2,
          G + 0.006,
          (lot.bayZ[0] + lot.bayZ[1]) / 2,
          blue,
        );
      B(gap - 1, 0.012, 0.5, x, G + 0.006, lot.bayZ[0] + 0.4, std(j.accent, { roughness: 0.6 }));
    });
    strip(lot.x0, lot.x1, lot.z0, lot.z1);
    // The lot's name painted on the ground, and a P sign.
    {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 128;
      const g = c.getContext('2d');
      g.fillStyle = C.blue;
      g.font = '700 72px -apple-system, "SF Pro Display", Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('P   EXPERIENCE PARKING', 512, 68);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      const decal = new THREE.Mesh(
        new THREE.PlaneGeometry(lot.x1 - lot.x0 - 3, (lot.x1 - lot.x0 - 3) / 8).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9, depthWrite: false }),
      );
      decal.position.set((lot.x0 + lot.x1) / 2, G + 0.01, lot.bayZ[1] + 1.9);
      decal.userData.keep = true;
      decal.receiveShadow = true;
      group.add(decal);
    }
    B(0.14, 2.6, 0.14, lot.x1 - 0.8, G, lot.z1 - 1, M.dark).position.y = G + 1.3;
    B(1.1, 1.1, 0.12, lot.x1 - 0.8, G + 2.9, lot.z1 - 1, blue);
  }

  // --- Skills Street: small places named after his tools and skills ---------------
  const shopWalls = ['#f6d6c8', '#cfe6d8', '#d9e4f6', '#f7e7b8', '#e9d5f0', '#f3d0d6'].map(c =>
      std(c, { roughness: 0.8 }),
    ),
    shopAccents = ['#ff6b5e', '#5ab4f0', '#3fb8a8', '#f2b705', '#a77be0', '#ff8a4c'];
  const awningWhite = std('#ffffff', { roughness: 0.7 }),
    glow = std('#ffb36b', { emissive: '#ff9a3c', emissiveIntensity: 0.7 }),
    accentMats = shopAccents.map(c => std(c, { roughness: 0.6 }));
  function shop(x, z, w, d, name, kind, i) {
    const h = 3.2,
      front = z + d / 2,
      wall = shopWalls[i % 6],
      accent = accentMats[i % 6];
    B(w, h, d, x, FLOOR + h / 2, z, wall);
    B(w + 0.18, 0.22, d + 0.18, x, FLOOR + h + 0.11, z, M.white);
    B(w * 0.78, 1.35, 0.08, x - w * 0.06, FLOOR + 0.45 + 0.68, front + 0.04, glow);
    B(0.9, 1.9, 0.1, x + w * 0.36, FLOOR + 0.95, front + 0.05, M.dark);
    // Striped awning sloping out over the window.
    const n = Math.max(4, Math.round((w * 0.78) / 0.42)),
      sw = (w * 0.82) / n,
      depth = 1.1,
      drop = 0.45,
      slope = Math.atan2(drop, depth),
      hyp = Math.hypot(depth, drop);
    for (let k = 0; k < n; k++) {
      const sx = x - w * 0.47 + sw * (k + 0.5),
        m = k % 2 ? accent : awningWhite,
        o = B(sw, 0.06, hyp, sx, FLOOR + 2.2, front + depth / 2, m);
      o.rotation.x = slope;
      B(sw, 0.26, 0.05, sx, FLOOR + 2.2 - drop / 2 - 0.12, front + depth, m);
    }
    // The sign on the roof: the tool's name big, the kind of place in its colour.
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 176;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(4, 4, 504, 168, 26);
    g.fill();
    g.strokeStyle = shopAccents[i % 6];
    g.lineWidth = 8;
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = C.label;
    g.font = '700 78px -apple-system, "SF Pro Display", Arial, sans-serif';
    g.fillText(name, 256, 70);
    g.fillStyle = shopAccents[i % 6];
    g.font = '600 44px -apple-system, "SF Pro Text", Arial, sans-serif';
    g.fillText(kind, 256, 136);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, (w * 0.92 * 176) / 512, 0.12), [
      M.white,
      M.white,
      M.white,
      M.white,
      std('#ffffff', { map: t, roughness: 0.6 }),
      M.white,
    ]);
    sign.position.set(x, FLOOR + h + 0.22 + (w * 0.92 * 176) / 512 / 2 + 0.15, front - 0.35);
    sign.castShadow = sign.receiveShadow = true;
    sign.userData.keep = true;
    group.add(sign);
    B(0.08, 0.4, 0.08, x - w * 0.3, FLOOR + h + 0.4, front - 0.4, M.dark);
    B(0.08, 0.4, 0.08, x + w * 0.3, FLOOR + h + 0.4, front - 0.4, M.dark);
    // A small table outside.
    cyl(0.35, 0.06, x - w * 0.2, FLOOR + 0.75, front + 1.7, M.dark, 10);
    cyl(0.05, 0.75, x - w * 0.2, FLOOR + 0.375, front + 1.7, M.dark, 6);
    for (const s of [-1, 1]) cyl(0.18, 0.45, x - w * 0.2 + s * 0.6, FLOOR + 0.225, front + 1.7, accent, 8);
  }
  {
    let si = 0;
    for (const ci of [0, 1, 2]) {
      const p = block(ci, 0),
        n = 4,
        w = (p.w - 1) / n;
      for (let k = 0; k < n; k++, si++) {
        const [name, kind] = SHOPS[si];
        shop(p.x0 + 0.5 + w * (k + 0.5), p.z0 + 0.5 + 2.5, w - 0.7, 5, name, kind, si);
      }
    }
  }

  // Quiet blocks: solar rows, an office with parking, sheds.
  const fill = [
    [0, 3, 'solar'],
    [1, 3, 'office'],
    [2, 3, 'shed'],
  ];
  for (const [ci, ri, kind] of fill) {
    const p = block(ci, ri);
    if (kind === 'solar') {
      solar(p.x, p.z, p.w - 3, p.d - 2);
    } else if (kind === 'shed') {
      shed(p.x - p.w * 0.18, p.z, p.w * 0.5, p.d - 3);
      shed(p.x + p.w * 0.3, p.z, p.w * 0.25, p.d * 0.55, 1.2);
    } else {
      slabBlock(p.x - p.w * 0.2, p.z, Math.min(9, p.w * 0.4), Math.min(7, p.d - 3), ri === 0 ? 2 : 3);
      parking(p.x + p.w * 0.12, p.z + (ri === 0 ? 0 : p.d * 0.25), Math.floor((p.w * 0.3) / 2.2), 0);
    }
  }
  // Rails along the plaza side of the hero plinths.
  rail(PLAZA.x0 + 1, PLAZA.z0 - 1.6 - 0.15, PLAZA.x1 - 1, PLAZA.z0 - 1.6 - 0.15);
  rail(PLAZA.x0 + 1, PLAZA.z1 + 1.6 + 0.15, PLAZA.x1 - 1, PLAZA.z1 + 1.6 + 0.15);

  mergeStatic(group);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  return {
    group,
    solids,
    places,
    labels,
    row,
    lot,
    // Which clickable place covers this ground point (null if none).
    placeAt(x, z) {
      for (const q of zones) if (x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1) return q.id;
      return null;
    },
    // Beacons pulse gently; returns true while animating.
    update(t) {
      if (reduced.matches) return false;
      for (const b of beacons) {
        const k = (t * 0.00042 + b.phase) % 1;
        b.pulse.scale.setScalar((0.6 + k * 2.6) * b.size);
        b.pulse.material.opacity = 0.55 * (1 - k) * (1 - k);
        b.label.position.y = b.y + Math.sin(t * 0.0016 + b.phase * 6) * 0.08 * b.size;
      }
      return true;
    },
  };
}
