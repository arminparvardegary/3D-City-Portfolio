import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TILE } from './units.js';
import { THEME } from './theme.js';
import { box, mesh, tint } from '../geometry.js';

// Buildings in the clean isometric city style of the reference: teal glass
// offices with white floor bands and rooftop units, white apartment blocks with
// small windows and AC boxes, cream houses with coral roofs, shops with striped
// awnings, a hospital with a helipad, a basketball court and a coffee cup kiosk.
// Small parts are plain boxes (12 triangles each) so a whole street stays cheap;
// every builder returns its footprint for collisions.

let M = null;
export function buildingMaterials(prep) {
  if (M) return M;
  const B = THEME.buildings,
    make = (color, extra = {}) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, vertexColors: true, ...extra });
      prep?.(m);
      return m;
    };
  M = {
    glass: make(B.glass, { roughness: 0.25, metalness: 0.15 }),
    frame: make(B.frame),
    roof: make(B.roof),
    ac: make(B.ac),
    wall: make(B.wall),
    window: make(B.window, { roughness: 0.3 }),
    cream: make(B.cream),
    coral: make(B.coral),
    door: make(B.door),
    shopWall: make(B.shopWall),
    shopGlass: make(B.shopGlass, { roughness: 0.3 }),
    awning: B.awnings.map(c => make(c)),
    awningWhite: make('#ffffff'),
    hospital: make(B.hospital),
    cross: make(B.cross),
    helipad: make(B.helipad),
    mark: make('#ffffff'),
    court: make(B.court),
    courtEdge: make(B.courtEdge),
    hoop: make(B.hoop),
    rim: make(B.rimColor),
    cup: make(B.cup),
    lid: make(B.lid),
    sleeve: make(B.sleeve),
    plaza: make(B.plaza),
  };
  return M;
}
const G = TILE.slab;
// A plain box (no bevel), tinted for the merged vertex colour attribute.
const blk = (p, mat, [w, h, d], [x, y, z], ry = 0) =>
  mesh(p, tint(new THREE.BoxGeometry(w, h, d)), mat, [x, y, z], [0, ry, 0]);

// Windows on all four faces: `count` per floor along each face.
function windows(p, mat, w, d, floors, floorH, y0, { ww = 0.42, wh = 0.48, inset = 0.01, skip = 0 } = {}) {
  for (let f = skip; f < floors; f++) {
    const y = y0 + f * floorH + floorH * 0.55;
    for (const [len, axis, sign] of [
      [w, 'x', 1],
      [w, 'x', -1],
      [d, 'z', 1],
      [d, 'z', -1],
    ]) {
      const n = Math.max(1, Math.floor(len / 0.95)),
        step = len / n;
      for (let i = 0; i < n; i++) {
        const t = -len / 2 + step * (i + 0.5);
        if (axis === 'x') blk(p, mat, [ww, wh, 0.04], [t, y, sign * (d / 2 + inset)]);
        else blk(p, mat, [0.04, wh, ww], [sign * (w / 2 + inset), y, t]);
      }
    }
  }
}
function rooftop(p, w, d, top, units = 3, rand = Math.random) {
  blk(p, M.roof, [w + 0.12, 0.14, d + 0.12], [0, top + 0.07, 0]);
  for (let i = 0; i < units; i++)
    blk(p, M.ac, [0.55, 0.32, 0.4], [(rand() - 0.5) * (w - 0.8), top + 0.3, (rand() - 0.5) * (d - 0.8)]);
}

export function office(parent, { x, z, w = 5, d = 4, floors = 5, rand }) {
  const g = new THREE.Group();
  g.position.set(x, G, z);
  parent.add(g);
  const fh = 0.72,
    H = floors * fh;
  blk(g, M.glass, [w, H, d], [0, H / 2, 0]);
  for (let f = 1; f <= floors; f++) blk(g, M.frame, [w + 0.06, 0.09, d + 0.06], [0, f * fh - 0.05, 0]);
  for (const [len, axis] of [
    [w, 'x'],
    [d, 'z'],
  ]) {
    const n = Math.floor(len / 1.1);
    for (let i = 1; i < n; i++) {
      const t = -len / 2 + (len * i) / n;
      for (const s of [-1, 1]) {
        if (axis === 'x') blk(g, M.frame, [0.07, H, 0.07], [t, H / 2, s * (d / 2 + 0.02)]);
        else blk(g, M.frame, [0.07, H, 0.07], [s * (w / 2 + 0.02), H / 2, t]);
      }
    }
  }
  rooftop(g, w, d, H, 3, rand);
  return [x, z, w / 2 + 0.1, d / 2 + 0.1];
}

export function apartment(parent, { x, z, w = 4, d = 3.6, floors = 5, rand }) {
  const g = new THREE.Group();
  g.position.set(x, G, z);
  parent.add(g);
  const fh = 0.7,
    H = floors * fh;
  blk(g, M.wall, [w, H, d], [0, H / 2, 0]);
  windows(g, M.window, w, d, floors, fh, 0, { ww: 0.36, wh: 0.42 });
  // AC units under a few windows, as on the reference blocks.
  for (let f = 1; f < floors; f += 2)
    for (const s of [-1, 1]) blk(g, M.ac, [0.32, 0.22, 0.18], [s * w * 0.22, f * fh + 0.18, d / 2 + 0.1]);
  for (let f = 0; f < floors; f += 2)
    blk(g, M.ac, [0.18, 0.22, 0.32], [w / 2 + 0.1, f * fh + 0.25, -d * 0.2]);
  rooftop(g, w, d, H, 2, rand);
  blk(g, M.roof, [0.9, 0.55, 0.9], [w * 0.2, H + 0.42, -d * 0.15]);
  return [x, z, w / 2 + 0.15, d / 2 + 0.15];
}

export function house(parent, { x, z, w = 3.2, d = 2.8, yaw = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, G, z);
  g.rotation.y = yaw;
  parent.add(g);
  const H = 1.5;
  blk(g, M.cream, [w, H, d], [0, H / 2, 0]);
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - 0.18, 0);
  s.lineTo(0, 1.05);
  s.lineTo(w / 2 + 0.18, 0);
  s.closePath();
  mesh(g, tint(new THREE.ExtrudeGeometry(s, { depth: d + 0.3, bevelEnabled: false })), M.coral, [
    0,
    H,
    -d / 2 - 0.15,
  ]);
  blk(g, M.door, [0.5, 0.85, 0.06], [-w * 0.2, 0.43, d / 2 + 0.02]);
  for (const wx of [w * 0.22]) blk(g, M.window, [0.55, 0.5, 0.05], [wx, 0.85, d / 2 + 0.02]);
  for (const s2 of [-1, 1]) blk(g, M.window, [0.05, 0.5, 0.55], [s2 * (w / 2 + 0.02), 0.85, 0]);
  blk(g, M.cream, [0.32, 0.6, 0.32], [w * 0.25, H + 0.75, -d * 0.15]);
  return [
    x,
    z,
    (Math.abs(Math.cos(yaw)) * w + Math.abs(Math.sin(yaw)) * d) / 2 + 0.15,
    (Math.abs(Math.sin(yaw)) * w + Math.abs(Math.cos(yaw)) * d) / 2 + 0.15,
  ];
}

// A shop facing +z (rotate with yaw): glass front and a striped awning.
export function shop(parent, { x, z, w = 3.4, d = 2.6, yaw = 0, color = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, G, z);
  g.rotation.y = yaw;
  parent.add(g);
  const H = 1.5;
  blk(g, M.shopWall, [w, H, d], [0, H / 2, 0]);
  blk(g, M.shopGlass, [w - 0.5, 0.85, 0.05], [0, 0.6, d / 2 + 0.02]);
  blk(g, M.roof, [w + 0.1, 0.14, d + 0.1], [0, H + 0.07, 0]);
  const n = 7,
    aw = M.awning[color % M.awning.length];
  for (let i = 0; i < n; i++)
    blk(
      g,
      i % 2 ? M.awningWhite : aw,
      [w / n + 0.002, 0.06, 0.75],
      [-w / 2 + (w / n) * (i + 0.5), H - 0.15, d / 2 + 0.32],
      0,
    ).rotation.x = 0.38;
  blk(g, M.ac, [0.6, 0.3, 0.45], [w * 0.2, H + 0.3, -d * 0.15]);
  return [
    x,
    z,
    (Math.abs(Math.cos(yaw)) * w + Math.abs(Math.sin(yaw)) * d) / 2 + 0.2,
    (Math.abs(Math.sin(yaw)) * w + Math.abs(Math.cos(yaw)) * d) / 2 + 0.2,
  ];
}

export function hospital(parent, { x, z, w = 5.4, d = 4.4, floors = 4 }) {
  const g = new THREE.Group();
  g.position.set(x, G, z);
  parent.add(g);
  const fh = 0.75,
    H = floors * fh;
  blk(g, M.hospital, [w, H, d], [0, H / 2, 0]);
  windows(g, M.glass, w, d, floors, fh, 0, { ww: 0.55, wh: 0.45 });
  blk(g, M.cross, [0.25, 0.8, 0.06], [w * 0.3, H - 0.55, d / 2 + 0.05]);
  blk(g, M.cross, [0.8, 0.25, 0.07], [w * 0.3, H - 0.55, d / 2 + 0.05]);
  blk(g, M.roof, [w + 0.12, 0.14, d + 0.12], [0, H + 0.07, 0]);
  // Helipad: a blue disc with a white ring and an H.
  mesh(g, tint(new THREE.CylinderGeometry(1.45, 1.45, 0.05, 40)), M.helipad, [0, H + 0.17, 0]);
  mesh(g, tint(new THREE.TorusGeometry(1.25, 0.05, 4, 40)).rotateX(Math.PI / 2), M.mark, [0, H + 0.2, 0]);
  for (const s of [-1, 1]) blk(g, M.mark, [0.14, 0.03, 0.9], [s * 0.32, H + 0.21, 0]);
  blk(g, M.mark, [0.64, 0.03, 0.14], [0, H + 0.21, 0]);
  return [x, z, w / 2 + 0.1, d / 2 + 0.1];
}

export function court(parent, { x, z, w = 6.4, d = 4.2 }) {
  const g = new THREE.Group();
  g.position.set(x, G, z);
  parent.add(g);
  blk(g, M.courtEdge, [w + 0.6, 0.03, d + 0.6], [0, 0.015, 0]);
  blk(g, M.court, [w, 0.032, d], [0, 0.03, 0]);
  const line = (lw, ld, lx, lz) => blk(g, M.mark, [lw, 0.008, ld], [lx, 0.05, lz]);
  line(w, 0.05, 0, d / 2 - 0.03);
  line(w, 0.05, 0, -d / 2 + 0.03);
  line(0.05, d, w / 2 - 0.03, 0);
  line(0.05, d, -w / 2 + 0.03, 0);
  line(0.05, d, 0, 0);
  mesh(g, tint(new THREE.TorusGeometry(0.6, 0.025, 4, 32)).rotateX(Math.PI / 2), M.mark, [0, 0.05, 0]);
  for (const s of [-1, 1]) {
    blk(g, M.hoop, [0.08, 1.6, 0.08], [s * (w / 2 + 0.15), 0.8, 0]);
    blk(g, M.mark, [0.05, 0.5, 0.7], [s * (w / 2 - 0.02), 1.55, 0]);
    mesh(g, tint(new THREE.TorusGeometry(0.14, 0.02, 4, 16)).rotateX(Math.PI / 2), M.rim, [
      s * (w / 2 - 0.2),
      1.35,
      0,
    ]);
  }
  return null; // you can drive across the court
}

export function kiosk(parent, { x, z }) {
  const g = new THREE.Group();
  g.position.set(x, G, z);
  parent.add(g);
  mesh(g, tint(new THREE.CylinderGeometry(1.05, 0.8, 2, 28)), M.cup, [0, 1, 0]);
  mesh(g, tint(new THREE.CylinderGeometry(1.12, 1.12, 0.22, 28)), M.lid, [0, 2.08, 0]);
  mesh(g, tint(new THREE.CylinderGeometry(0.98, 0.88, 0.5, 28)), M.sleeve, [0, 1.05, 0]);
  blk(g, M.shopGlass, [0.9, 0.5, 0.05], [0, 0.75, 0.93]);
  return [x, z, 1.15, 1.15];
}

// Trees for a whole city, as three instanced meshes: trunks, round crowns, pines.
export function createForest(prep, m) {
  const items = [];
  return {
    add(x, z, { kind = 'round', h = 2.2 } = {}) {
      items.push({ x, z, kind, h });
    },
    build() {
      const round = items.filter(t => t.kind === 'round'),
        pine = items.filter(t => t.kind === 'pine');
      const group = new THREE.Group(),
        o = new THREE.Object3D(),
        c = new THREE.Color();
      const trunkGeo = new THREE.CylinderGeometry(0.035, 0.055, 1, 7).translate(0, 0.5, 0);
      // Round tree: five overlapping masses, gently lumpy, darker underneath and inside.
      const crownGeo = (() => {
        const parts = [
          [0, 0.1, 0, 1],
          [0.55, -0.2, 0.25, 0.72],
          [-0.5, -0.15, -0.2, 0.74],
          [0.12, 0.45, -0.3, 0.62],
          [-0.2, -0.3, 0.48, 0.66],
        ].map(([x, y, z, s], k) => {
          const g = new THREE.IcosahedronGeometry(1, 3),
            p = g.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const vx = p.getX(i),
              vy = p.getY(i),
              vz = p.getZ(i),
              n = 1 + 0.07 * Math.sin(vx * 7 + k) * Math.cos(vz * 6 - k) * Math.sin(vy * 5 + k * 2);
            p.setXYZ(i, x + vx * s * n, y + vy * s * n, z + vz * s * n);
          }
          return g;
        });
        const g = mergeGeometries(parts);
        g.computeVertexNormals();
        const p = g.attributes.position,
          col = [];
        for (let i = 0; i < p.count; i++) {
          const y = p.getY(i),
            r = Math.hypot(p.getX(i), p.getZ(i)),
            k = 0.62 + 0.3 * THREE.MathUtils.clamp((y + 1) / 2.2, 0, 1) + 0.12 * Math.min(1, r);
          col.push(k, k * 1.02, k * 0.94);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        return g;
      })();
      // Pine: five drooping tiers, darker at the base of each tier.
      const pineGeo = (() => {
        const tiers = [
          [0.5, 0.5, 0],
          [0.42, 0.46, 0.3],
          [0.34, 0.42, 0.56],
          [0.25, 0.38, 0.8],
          [0.15, 0.34, 1.02],
        ].map(([r, h, y]) => new THREE.ConeGeometry(r, h, 12, 2, true).translate(0, y + h / 2, 0));
        // Keep the cones' own normals: recomputing them makes the zero-area apex triangles
        // produce zero normals, which shade as NaN and showed as white rims.
        const g = mergeGeometries(tiers);
        const p = g.attributes.position,
          col = [];
        for (let i = 0; i < p.count; i++) {
          const y = p.getY(i),
            frac = (y % 0.3) / 0.3,
            k = 0.55 + 0.18 * frac + 0.12 * Math.min(1, y / 1.3);
          col.push(k, k * 1.03, k * 0.95);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        return g;
      })();
      const inst = (geo, mat, list, place) => {
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((t, i) => {
          place(t);
          o.updateMatrix();
          im.setMatrixAt(i, o.matrix);
          im.setColorAt(i, c.setScalar(0.9 + ((i * 37) % 17) / 80));
        });
        im.castShadow = true;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        group.add(im);
      };
      inst(trunkGeo, m.bark, items, t => {
        o.position.set(t.x, G, t.z);
        o.rotation.set(0, 0, 0);
        o.scale.set(1, t.kind === 'pine' ? t.h * 0.3 : t.h * 0.62, 1);
      });
      inst(crownGeo, m.leaves, round, t => {
        o.position.set(t.x, G + t.h * 0.72, t.z);
        o.rotation.set(0, t.x * 3.1, 0);
        o.scale.set(t.h * 0.2, t.h * 0.24, t.h * 0.2);
      });
      inst(pineGeo, m.pine, pine, t => {
        o.position.set(t.x, G + t.h * 0.22, t.z);
        o.rotation.set(0, t.z * 2.7, 0);
        o.scale.setScalar(t.h * 0.66);
      });
      return group;
    },
    get count() {
      return items.length;
    },
  };
}
