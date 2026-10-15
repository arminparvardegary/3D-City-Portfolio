import * as THREE from 'three';
import { createKit, facade } from '../diorama/kit.js';
import { JOBS, SHOPS } from '../data/profile.js';
import { NYC } from './city.js';

// Armin's own streets inside New York, built at full size around the car (world
// units, not the city's scaled ones):
// - Experience Row: his four companies side by side, oldest to newest, taller as
//   the career grows, each with its name and years on the front. In front is a
//   street level parking lot with one bay per company; parking there starts the
//   experience story (see main.js).
// - Skills Street: twelve small places named after his tools and skills, with
//   striped awnings and a sign on the roof ("Figma Café", "Behance Restaurant").
export function buildDistrict({ row: R, shops: SH, top }) {
  const root = new THREE.Group(),
    K = createKit(),
    { box, cyl, add, mat } = K;
  const solids = [],
    signs = [],
    occluders = [];
  const sign = (text, sub, accent, w, h, { x, y, z, yaw = 0 }) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = Math.round((512 * h) / w);
    const g = c.getContext('2d'),
      H = c.height;
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.roundRect(4, 4, 504, H - 8, Math.min(28, H * 0.2));
    g.fill();
    g.strokeStyle = accent;
    g.lineWidth = 8;
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#2f3440';
    const f = '-apple-system, "SF Pro Display", Arial, sans-serif';
    let size = Math.min(H * 0.4, 96);
    g.font = `700 ${size}px ${f}`;
    while (g.measureText(text).width > 470 && size > 20) {
      size -= 2;
      g.font = `700 ${size}px ${f}`;
    }
    g.fillText(text, 256, sub ? H * 0.4 : H / 2);
    if (sub) {
      g.fillStyle = accent;
      g.font = `600 ${Math.min(H * 0.3, 64)}px ${f}`;
      g.fillText(sub, 256, H * 0.76);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    // A white backing (merged with the rest) and one textured face: one draw call per sign.
    add(new THREE.BoxGeometry(w, h, 0.15).rotateY(yaw), '#ffffff', [x, y, z]);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }),
    );
    m.position.set(x + Math.sin(yaw) * 0.08, y, z + Math.cos(yaw) * 0.08);
    m.rotation.y = yaw;
    m.receiveShadow = true;
    root.add(m);
    signs.push(m);
    return m;
  };
  const tint = (hex, k = 0.55) =>
    '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();

  // --- Experience Row -----------------------------------------------------------
  const { x0, x1, z0, z1 } = R,
    slabD = 16,
    front = z0 + slabD;
  box(x1 - x0, top - 0.12, slabD, (x0 + x1) / 2, 0.12, z0 + slabD / 2, NYC.walk);
  solids.push([(x0 + x1) / 2, z0 + slabD / 2, (x1 - x0) / 2, slabD / 2]);
  const slot = (x1 - x0) / JOBS.length,
    row = [],
    bays = [];
  const lot = { x0, x1, z0: front, z1, bayZ: [front + 1.8, front + 9.8], bays };
  const skin = (color, kind, size = 1.1) => {
    const m = mat(color, { map: facade(kind) });
    m.userData.uvSize = size;
    return m;
  };
  const glassDark = [NYC.glassDark, { roughness: 0.3 }];
  // An arched window or doorway on the front (+z) or side (+x) face: a dark pane with a round top.
  const arch = (cx, cy, cz, w, h, { side = false, m = glassDark, frame = null } = {}) => {
    const r = w / 2,
      o = side ? [0.08, 0] : [0, 0.08];
    if (frame) {
      box(
        side ? 0.1 : w + 0.3,
        h + 0.15,
        side ? w + 0.3 : 0.1,
        cx + o[0] * 0.5,
        cy - 0.15,
        cz + o[1] * 0.5,
        frame,
      );
      add(new THREE.CircleGeometry(r + 0.15, 12, 0, Math.PI).rotateY(side ? Math.PI / 2 : 0), frame, [
        cx + o[0] * 0.6,
        cy + h - 0.15,
        cz + o[1] * 0.6,
      ]);
    }
    box(side ? 0.1 : w, h, side ? w : 0.1, cx + o[0], cy, cz + o[1], m);
    add(new THREE.CircleGeometry(r, 12, 0, Math.PI).rotateY(side ? Math.PI / 2 : 0), m, [
      cx + o[0] * 1.6,
      cy + h,
      cz + o[1] * 1.6,
    ]);
  };
  const planter = (px, py, pz, s = 1) => {
    box(0.9 * s, 0.45 * s, 0.9 * s, px, py, pz, '#c8794f');
    add(new THREE.IcosahedronGeometry(0.45 * s, 0), NYC.grass, [px, py + 0.75 * s, pz], [px, pz, 0]);
  };

  // Each company has its own building, a nod to its place and time. All share the
  // footprint, face the lot (+z) and return where their name sign goes.
  const DESIGNS = {
    // Big Uppetite, Australia: a red brick creative warehouse with a sawtooth roof.
    bigup(x, z, w, d) {
      const h = 7,
        zf = z + d / 2;
      box(w, h, d, x, top, z, skin('#c9775c', 'brick', 1));
      box(w + 0.2, 0.25, d + 0.2, x, top + h, z, '#e9d6c2');
      const n = 3,
        td = d / n,
        shape = new THREE.Shape([
          new THREE.Vector2(0, 0),
          new THREE.Vector2(td, 0),
          new THREE.Vector2(0, 1.7),
        ]);
      for (let k = 0; k < n; k++) {
        const zt = zf - k * td;
        add(
          new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false })
            .rotateY(Math.PI / 2)
            .translate(-w / 2, 0, 0),
          NYC.roof,
          [x, top + h + 0.25, zt],
        );
        box(w - 0.5, 1.35, 0.08, x, top + h + 0.3, zt - 0.06, [NYC.glass, { roughness: 0.25 }]);
      }
      for (const k of [-1, 0, 1]) arch(x + k * w * 0.3, top + 3.6, zf, 1.1, 2.2, { frame: '#f2e6d6' });
      for (const k of [-1, 0, 1])
        arch(x + w / 2, top + 3.6, z + k * d * 0.3, 1.1, 2.2, { side: true, frame: '#f2e6d6' });
      for (const k of [-1, 1])
        cyl(0.22, 0.26, 0.9, 8, x + k * w * 0.25, top + h + 0.25, z - d * 0.35, NYC.steel);
      // A wide workshop door with ribs, framed in the company yellow.
      box(3, 2.9, 0.14, x, top, zf + 0.05, '#f2b705');
      box(2.6, 2.6, 0.16, x, top, zf + 0.07, NYC.grey);
      for (let r = 1; r < 7; r++) box(2.6, 0.05, 0.2, x, top + r * 0.37, zf + 0.08, '#9aa1ab');
      return top + h + 1.7 + 1.25; // the sign stands on the roof front
    },
    // AAQ Real Estate, United Kingdom: London stone, a slate mansard with dormers, a portico.
    aaq(x, z, w, d) {
      const h = 9,
        zf = z + d / 2;
      box(w, h, d, x, top, z, skin('#eadfc9', 'stone', 1));
      box(w + 0.2, 3, d + 0.2, x, top, z, '#f1e8d6');
      for (let r = 1; r < 4; r++) box(w + 0.24, 0.06, d + 0.24, x, top + r * 0.75, z, '#d6c8ae'); // rusticated ground floor
      box(w + 0.5, 0.45, d + 0.5, x, top + h, z, '#f6efe1'); // cornice
      add(
        new THREE.CylinderGeometry(0.68, 1, 3, 4, 1)
          .rotateY(Math.PI / 4)
          .scale(w / 1.414 + 0.2, 1, d / 1.414 + 0.2)
          .translate(0, 1.5, 0),
        '#6f7885',
        [x, top + h + 0.45, z],
      ); // mansard
      for (const k of [-1, 1]) {
        box(1.1, 1.2, 0.9, x + k * w * 0.24, top + h + 0.9, zf - 0.55, '#f6efe1');
        box(0.75, 0.8, 0.1, x + k * w * 0.24, top + h + 1.05, zf - 0.08, glassDark);
        add(new THREE.ConeGeometry(0.82, 0.6, 4).rotateY(Math.PI / 4).scale(1, 1, 0.75), '#5d6672', [
          x + k * w * 0.24,
          top + h + 2.4,
          zf - 0.55,
        ]);
        box(0.9, 1.2, 1.1, x + w / 2 - 0.55, top + h + 0.9, z + k * d * 0.24, '#f6efe1');
        box(0.1, 0.8, 0.75, x + w / 2 - 0.08, top + h + 1.05, z + k * d * 0.24, glassDark);
      }
      for (const k of [-1, 1]) {
        box(0.8, 2.2, 0.8, x + k * w * 0.32, top + h + 1.2, z - d * 0.3, '#b46a54');
        for (const q of [-0.18, 0.18])
          cyl(0.09, 0.09, 0.35, 6, x + k * w * 0.32 + q, top + h + 3.4, z - d * 0.3, '#c88a6a');
      }
      // Portico: two columns and a pediment over a teal door.
      box(1.5, 2.5, 0.12, x, top, zf + 0.06, '#2f6f68');
      for (const k of [-1, 1]) cyl(0.18, 0.2, 3, 10, x + k * 1.15, top, zf + 0.9, '#ffffff');
      box(2.9, 0.25, 1.3, x, top + 3, zf + 0.65, '#ffffff');
      add(
        new THREE.ExtrudeGeometry(
          new THREE.Shape([new THREE.Vector2(-1.5, 0), new THREE.Vector2(1.5, 0), new THREE.Vector2(0, 0.8)]),
          { depth: 1.3, bevelEnabled: false },
        ).translate(0, 0, -0.65),
        '#ffffff',
        [x, top + 3.25, zf + 0.65],
      );
      for (let r = 0; r < 3; r++)
        for (const k of [-1, 1]) box(1, 1.3, 0.1, x + k * w * 0.3, top + 4.2 + r * 1.6, zf + 0.05, glassDark);
      return top + 5;
    },
    // Hindra Studio, Turkey: white terraces stepping back, arches, planters, a blue dome.
    hindra(x, z, w, d) {
      const zf = z + d / 2,
        white = '#f7f2e9',
        lev = [
          [w, d, 0],
          [w - 1.4, d - 2.8, 1.4],
          [w - 2.8, d - 5.6, 2.8],
        ];
      let y = top;
      lev.forEach(([lw, ld, back], k) => {
        const cz = z - back / 2;
        box(lw, 4, ld, x, y, cz, white);
        box(lw + 0.12, 0.22, ld + 0.12, x, y + 4, cz, '#ece4d6');
        const fz = cz + ld / 2;
        if (k > 0)
          for (const a of [-1, 0, 1]) arch(x + a * lw * 0.3, y + 0.9, fz, 1, 2, { frame: '#3f7fc8' });
        for (const a of [-1, 1])
          arch(x + lw / 2, y + 0.9, cz + a * ld * 0.25, 1, 2, { side: true, frame: '#3f7fc8' });
        if (k < 2) {
          const nz = z - lev[k + 1][2] / 2 + lev[k + 1][1] / 2;
          box(lw, 0.5, 0.16, x, y + 4.2, fz - 0.08, white); // terrace parapet
          for (const a of [-1, 1]) planter(x + a * lw * 0.38, y + 4.2, (fz + nz) / 2, 0.8);
        }
        y += 4.22;
      });
      // Pergola on the first terrace.
      {
        const pz = z - 1.4 / 2 + (d - 2.8) / 2 + 0.7,
          py = top + 4.22;
        for (const a of [-1, 1])
          for (const b of [0, 1]) box(0.12, 2, 0.12, x + a * 1.2, py, pz - b * 1.1 + 0.55, '#a8743f');
        for (let r = 0; r < 5; r++) box(2.7, 0.1, 0.12, x, py + 2, pz - 0.5 + r * 0.25, '#a8743f');
      }
      // The dome.
      const dz = z - 1.4;
      cyl(1.2, 1.2, 0.6, 10, x, y, dz, white);
      add(new THREE.SphereGeometry(1.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#3f7fc8', [x, y + 0.6, dz]);
      cyl(0.06, 0.06, 0.7, 6, x, y + 1.8, dz, NYC.gold);
      add(new THREE.IcosahedronGeometry(0.14, 0), NYC.gold, [x, y + 2.55, dz]);
      // Arched doorway with a blue frame.
      arch(x, top, zf, 1.5, 2.2, { frame: '#3f7fc8', m: '#2a5d96' });
      return top + 5.4;
    },
    // Rush Graphics, USA: a glass tower with fins and a slanted crown in coral.
    rush(x, z, w, d) {
      const zf = z + d / 2;
      box(w, 3, d, x, top, z, glassDark);
      box(w + 0.2, 0.3, d + 0.2, x, top + 3, z, NYC.white);
      const tw = w - 0.8,
        td = d - 1.4,
        h = 17;
      box(tw, h, td, x, top + 3.3, z - 0.2, skin('#8fb8e8', 'glass', 1));
      for (let k = 0; k <= 8; k++) {
        const fx = x - tw / 2 + (k * tw) / 8;
        box(0.1, h, 0.35, fx, top + 3.3, z - 0.2 + td / 2 + 0.12, NYC.white);
      }
      for (let k = 0; k <= 10; k++) {
        const fz = z - 0.2 - td / 2 + (k * td) / 10;
        box(0.35, h, 0.1, x + tw / 2 + 0.12, top + 3.3, fz, NYC.white);
      }
      // Slanted crown: low at the front, high at the back, faced in coral.
      const y = top + 3.3 + h,
        shape = new THREE.Shape([
          new THREE.Vector2(-td / 2, 0),
          new THREE.Vector2(td / 2, 0),
          new THREE.Vector2(td / 2, 0.6),
          new THREE.Vector2(-td / 2, 3.2),
        ]);
      add(
        new THREE.ExtrudeGeometry(shape, { depth: tw, bevelEnabled: false })
          .rotateY(-Math.PI / 2)
          .translate(tw / 2, 0, 0),
        '#ff6b5e',
        [x, y, z - 0.2],
      );
      cyl(0.05, 0.05, 2.4, 6, x + tw * 0.3, y + 3, z - 0.2 - td * 0.35, NYC.steel);
      add(
        new THREE.IcosahedronGeometry(0.2, 0),
        ['#ff3b30', { emissive: '#ff3b30', emissiveIntensity: 1 }],
        [x + tw * 0.3, y + 5.5, z - 0.2 - td * 0.35],
      );
      // Revolving door under a thin cantilevered canopy.
      cyl(0.9, 0.9, 2.4, 12, x, top, zf + 0.4, [
        NYC.glass,
        { roughness: 0.2, transparent: true, opacity: 0.85 },
      ]);
      box(w * 0.7, 0.18, 2.2, x, top + 2.6, zf + 1.1, '#ff6b5e');
      return top + 4.6;
    },
  };
  [...JOBS].reverse().forEach((j, i) => {
    const x = x0 + slot * (i + 0.5),
      w = slot - 1.7,
      d = 11,
      z = front - 1.4 - d / 2;
    const signY = DESIGNS[j.id](x, z, w, d),
      sw = w * 0.86,
      sh = sw * 0.36;
    sign(j.name, `${j.start[0]} – ${j.end[0]}`, j.accent, sw, sh, {
      x,
      y: signY + sh / 2,
      z: z + d / 2 + (j.id === 'bigup' ? -0.4 : 0.25),
    });
    row.push({ id: j.id, x, z, top: signY + sh, w, front: z + d / 2 });
    occluders.push(
      new THREE.Box3(
        new THREE.Vector3(x - w / 2, top, z - d / 2),
        new THREE.Vector3(x + w / 2, top + { bigup: 9.5, aaq: 13, hindra: 15, rush: 24 }[j.id], z + d / 2),
      ),
    );
    // Bay: white lines, the company colour painted at its head.
    const bx0 = x - slot / 2,
      bx1 = x + slot / 2;
    box(0.16, 0.02, 8, bx0 + 0.08, 0.12, front + 5.8, NYC.line);
    if (i === JOBS.length - 1) box(0.16, 0.02, 8, bx1 - 0.08, 0.12, front + 5.8, NYC.line);
    box(slot - 0.8, 0.02, 0.6, x, 0.12, front + 2.1, j.accent);
    bays.push({ id: j.id, x, x0: bx0 + 0.3, x1: bx1 - 0.3 });
  });
  // The lot's name on the ground, and a P sign at its corner.
  {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.font = '700 76px -apple-system, "SF Pro Display", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('P   EXPERIENCE PARKING', 512, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(x1 - x0 - 4, (x1 - x0 - 4) / 8).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9, depthWrite: false }),
    );
    // At the lot's street edge, clear of the story timeline.
    decal.position.set((x0 + x1) / 2, 0.135, z1 - 0.6 - (x1 - x0 - 4) / 16);
    decal.receiveShadow = true;
    root.add(decal);
    lot.decal = decal;
  }
  cyl(0.12, 0.12, 3.4, 6, x1 - 1.2, 0.12, z1 - 1.2, NYC.dark);
  box(1.6, 1.6, 0.15, x1 - 1.2, 3.5, z1 - 1.2, '#3d7bff');
  {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#3d7bff';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#fff';
    g.font = '800 96px Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('P', 64, 70);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: t }));
    p.position.set(x1 - 1.2, 4.3, z1 - 1.2 + 0.08);
    root.add(p);
  }

  // --- Skills Street ------------------------------------------------------------
  const walls = ['#f6d6c8', '#cfe6d8', '#d9e4f6', '#f7e7b8', '#e9d5f0', '#f3d0d6'],
    accents = ['#ff6b5e', '#5ab4f0', '#3fb8a8', '#f2b705', '#a77be0', '#ff8a4c'];
  // A shop with its front facing +z (yaw 0) or +x (yaw π/2), sitting on y.
  function shop(cx, cz, yaw, y, w, d, [name, kind], i) {
    const side = Math.abs(Math.sin(yaw)) > 0.5; // front faces along x
    const h = 4.4,
      acc = accents[i % 6],
      wall = walls[i % 6],
      fx = Math.sin(yaw),
      fz = Math.cos(yaw),
      rx = Math.cos(yaw),
      rz = -Math.sin(yaw);
    const at = (a, f) => [cx + rx * a + fx * f, cz + rz * a + fz * f]; // a: across the front, f: out from the centre
    const [bx, bz] = at(0, 0);
    box(side ? d : w, h, side ? w : d, bx, y, bz, wall);
    box((side ? d : w) + 0.3, 0.3, (side ? w : d) + 0.3, bx, y + h, bz, NYC.white);
    const [gx, gz] = at(-w * 0.12, d / 2 + 0.05);
    box(side ? 0.12 : w * 0.6, 1.8, side ? w * 0.6 : 0.12, gx, y + 0.55, gz, [
      NYC.flame,
      { emissive: '#ff9a3c', emissiveIntensity: 0.6 },
    ]);
    const [dx, dz] = at(w * 0.33, d / 2 + 0.06);
    box(side ? 0.14 : 1.1, 2.4, side ? 1.1 : 0.14, dx, y, dz, NYC.dark);
    // Striped awning.
    const n = Math.max(5, Math.round((w * 0.85) / 0.5)),
      sw = (w * 0.85) / n,
      dep = 1.4,
      drop = 0.55,
      slope = Math.atan2(drop, dep),
      hyp = Math.hypot(dep, drop);
    for (let k = 0; k < n; k++) {
      const a = -w * 0.425 + sw * (k + 0.5),
        [sx, sz] = at(a, d / 2 + dep / 2),
        col = k % 2 ? acc : '#ffffff';
      add(new THREE.BoxGeometry(sw, 0.08, hyp).rotateX(slope).rotateY(yaw), col, [
        sx,
        y + 2.95 - drop / 2,
        sz,
      ]);
      const [vx, vz] = at(a, d / 2 + dep);
      box(side ? 0.06 : sw, 0.32, side ? sw : 0.06, vx, y + 2.95 - drop - 0.3, vz, col);
    }
    // Roof sign, facing the street.
    const sw2 = w * 0.98,
      sh = sw2 * 0.5,
      [sx, sz] = at(0, d / 2 - 0.5);
    sign(name, kind, acc, sw2, sh, { x: sx, y: y + h + 0.3 + sh / 2 + 0.3, z: sz, yaw });
    // A table and two stools outside.
    const [tx, tz] = at(-w * 0.25, d / 2 + 2.4);
    cyl(0.5, 0.5, 0.08, 10, tx, y + 0.9, tz, NYC.dark);
    cyl(0.07, 0.07, 0.9, 6, tx, y, tz, NYC.dark);
    for (const s of [-1, 1]) {
      const [ux, uz] = at(-w * 0.25 + s * 0.85, d / 2 + 2.4);
      cyl(0.26, 0.26, 0.55, 8, ux, y, uz, acc);
    }
  }
  let si = 0;
  for (const S of SH) {
    if (S.slab) {
      box(S.x1 - S.x0, top - 0.12, S.z1 - S.z0, (S.x0 + S.x1) / 2, 0.12, (S.z0 + S.z1) / 2, NYC.walk);
      solids.push([(S.x0 + S.x1) / 2, (S.z0 + S.z1) / 2, (S.x1 - S.x0) / 2, (S.z1 - S.z0) / 2]);
    }
    const side = Math.abs(Math.sin(S.yaw)) > 0.5,
      out = side ? Math.sign(Math.sin(S.yaw)) : Math.sign(Math.cos(S.yaw)),
      along = side ? S.z1 - S.z0 : S.x1 - S.x0,
      w = along / S.count;
    for (let k = 0; k < S.count; k++, si++) {
      const a = (side ? S.z0 : S.x0) + w * (k + 0.5),
        d = 6.4,
        c = S.front - out * (3.8 + d / 2); // S.front: the sidewalk edge the shops face
      shop(side ? c : a, side ? a : c, S.yaw, top, w - 1, d, SHOPS[si], si);
    }
  }
  K.finish(root);
  return { root, solids, row, lot, occluders };
}
