import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Animated film style people (world units; 1 unit is about 1.5 m). Big round
// heads with simple friendly faces (dark oval eyes with a highlight, small nose,
// ears, brows), soft rounded bodies in sweaters and shirts, trousers with rolled
// cuffs, chunky white sneakers and mitten hands. Five hair styles (short crop,
// bun, long, beanie, curls), skin tones, outfits and heights vary. Most walk
// with a bouncy step; some stand and sway. Every part is one instanced mesh for
// everyone; colours are per person.
const SKIN = ['#f6d6c1', '#efc3a1', '#d9a079', '#b47a52', '#8a5636', '#5e3a24'];
const HAIR = ['#2a1b14', '#4a2e1e', '#7a4a2a', '#c46a2c', '#e0b25a', '#1b1b22', '#8a5a3c'];
const TOPS = [
  '#f2efe8',
  '#e6dc8a',
  '#f2a27a',
  '#86c4b0',
  '#7aa8d8',
  '#e48a9a',
  '#b4a2d8',
  '#efc35e',
  '#4f6f8f',
  '#d9e4ee',
  '#e8705e',
  '#a6c98a',
];
const BOTTOMS = ['#2f3a5a', '#4c6a8f', '#2b2b33', '#7a5a3c', '#9aa6b8', '#3f5f4a', '#5a4a7a'];
const BEANIE = ['#f2c14e', '#5a8fd6', '#e8505b', '#7fc8b0'];
const U = 1 / 1.5;

export function createPeople({ loops, perLoop = 3, seed = 7 }) {
  const root = new THREE.Group();
  let r = seed;
  const rand = () => (r = (r * 16807) % 2147483647) / 2147483647,
    pick = a => a[Math.floor(rand() * a.length)];
  const vc = (g, c) => {
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    const col = new THREE.Color(c),
      a = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) {
      a[i] = col.r;
      a[i + 1] = col.g;
      a[i + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  };
  const sph = (rad, w = 8, h = 6) => new THREE.SphereGeometry(rad, w, h),
    cap = (rad, len) => new THREE.CapsuleGeometry(rad, len, 2, 7);
  // Parts in metres. Head centre at 1.47 m (a big head: about a quarter of the height).
  const HEAD = 1.47,
    HR = 0.17;
  const geo = {
    torso: mergeGeometries([
      vc(cap(0.18, 0.27).scale(0.98, 1, 0.8).translate(0, 1.05, 0), '#ffffff'),
      vc(new THREE.TorusGeometry(0.07, 0.025, 4, 8).rotateX(Math.PI / 2).translate(0, 1.29, 0), '#ffffff'),
    ]),
    hips: vc(cap(0.165, 0.06).scale(1.12, 1, 0.85).translate(0, 0.8, 0), '#ffffff'),
    leg: mergeGeometries([
      vc(cap(0.075, 0.46).translate(0, -0.33, 0), '#ffffff'),
      vc(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10).translate(0, -0.55, 0), '#ffffff'),
    ]), // trouser leg and rolled cuff
    shoe: mergeGeometries([
      vc(
        new THREE.CapsuleGeometry(0.07, 0.12, 2, 6)
          .rotateX(Math.PI / 2)
          .scale(1.05, 0.75, 1)
          .translate(0, -0.67, 0.05),
        '#ffffff',
      ),
      vc(new THREE.BoxGeometry(0.15, 0.035, 0.27).translate(0, -0.715, 0.05), '#e9e9ec'),
      vc(new THREE.BoxGeometry(0.1, 0.02, 0.08).translate(0, -0.62, 0.1), '#5a6378'),
    ]),
    arm: vc(cap(0.06, 0.3).translate(0, -0.2, 0), '#ffffff'),
    hand: vc(sph(0.065, 10, 8).scale(1, 1.1, 0.85).translate(0, -0.43, 0), '#ffffff'),
    head: mergeGeometries([
      vc(sph(HR, 12, 9).scale(1, 1.06, 1).translate(0, HEAD, 0), '#ffffff'),
      vc(sph(0.04, 6, 4).translate(-0.165, HEAD, 0), '#ffffff'),
      vc(sph(0.04, 6, 4).translate(0.165, HEAD, 0), '#ffffff'),
      vc(
        sph(0.032, 6, 4)
          .scale(1, 0.85, 1)
          .translate(0, HEAD - 0.02, 0.165),
        '#ffffff',
      ),
      vc(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 6).translate(0, HEAD - 0.2, 0), '#ffffff'),
    ]),
    // Face: dark oval eyes with a white highlight, brows, a little smile.
    face: mergeGeometries([
      ...[-1, 1].flatMap(s => [
        vc(
          sph(0.026, 6, 5)
            .scale(0.8, 1.2, 0.5)
            .translate(s * 0.058, HEAD + 0.02, 0.155),
          '#1d1a1c',
        ),
        vc(sph(0.008, 4, 3).translate(s * 0.058 + 0.008, HEAD + 0.035, 0.168), '#ffffff'),
        vc(
          new THREE.CapsuleGeometry(0.008, 0.04, 1, 4)
            .rotateZ(Math.PI / 2 + s * 0.15)
            .translate(s * 0.06, HEAD + 0.085, 0.15),
          '#3a2a22',
        ),
      ]),
      vc(
        new THREE.TorusGeometry(0.03, 0.006, 3, 6, Math.PI * 0.8)
          .rotateZ(Math.PI * 1.1)
          .translate(0, HEAD - 0.06, 0.158),
        '#8a3b3b',
      ),
    ]),
  };
  // Hair styles: each its own mesh.
  const HAIRS = {
    crop: vc(
      new THREE.SphereGeometry(HR * 1.07, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.52).translate(
        0,
        HEAD + 0.005,
        -0.01,
      ),
      '#ffffff',
    ),
    bun: mergeGeometries([
      vc(
        new THREE.SphereGeometry(HR * 1.07, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(
          0,
          HEAD,
          -0.01,
        ),
        '#ffffff',
      ),
      vc(sph(0.075, 8, 6).translate(0, HEAD + 0.2, -0.04), '#ffffff'),
    ]),
    long: mergeGeometries([
      vc(
        new THREE.SphereGeometry(HR * 1.08, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.6).translate(
          0,
          HEAD,
          -0.01,
        ),
        '#ffffff',
      ),
      vc(
        cap(0.13, 0.18)
          .scale(1.15, 1, 0.55)
          .translate(0, HEAD - 0.16, -0.08),
        '#ffffff',
      ),
    ]),
    beanie: mergeGeometries([
      vc(
        new THREE.SphereGeometry(HR * 1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).translate(
          0,
          HEAD + 0.02,
          0,
        ),
        '#ffffff',
      ),
      vc(
        new THREE.TorusGeometry(HR * 1.07, 0.025, 4, 12).rotateX(Math.PI / 2).translate(0, HEAD + 0.03, 0),
        '#ffffff',
      ),
    ]),
    curls: mergeGeometries(
      Array.from({ length: 9 }, (_, k) => {
        const a = (k / 9) * Math.PI * 2,
          y = k % 2 ? 0.08 : 0.02;
        return vc(
          sph(0.075, 6, 5).translate(Math.cos(a) * 0.13, HEAD + y + 0.06, Math.sin(a) * 0.13 - 0.01),
          '#ffffff',
        );
      }).concat([vc(sph(0.13, 8, 6).translate(0, HEAD + 0.13, -0.01), '#ffffff')]),
    ),
  };
  for (const g of [...Object.values(geo), ...Object.values(HAIRS)]) g.scale(U, U, U);
  // Who walks where.
  const people = [],
    styles = Object.keys(HAIRS);
  for (const L of loops) {
    const pts = [
        [L.x0, L.z0],
        [L.x1, L.z0],
        [L.x1, L.z1],
        [L.x0, L.z1],
      ],
      len = 2 * (L.x1 - L.x0 + (L.z1 - L.z0));
    for (let k = 0; k < perLoop; k++) {
      const standing = rand() < 0.15,
        style = pick(styles);
      people.push({
        L,
        pts,
        len,
        s: rand() * len,
        v: standing ? 0 : (1.05 + rand() * 0.45) * U * (rand() < 0.5 ? 1 : -1),
        dir: rand() < 0.5 ? 1 : -1,
        phase: rand() * 6,
        scale: 0.9 + rand() * 0.18,
        style,
        skin: pick(SKIN),
        hair: style === 'beanie' ? pick(BEANIE) : pick(HAIR),
        top: pick(TOPS),
        bottom: pick(BOTTOMS),
      });
    }
  }
  const N = people.length,
    mat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.7,
      sheen: 0.6,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color('#ffe8dc'),
    }); // fabric and skin sheen
  const make = (g, count) => {
    const m = new THREE.InstancedMesh(g, mat, Math.max(1, count));
    m.count = count;
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    root.add(m);
    return m;
  };
  const M = {
    torso: make(geo.torso, N),
    hips: make(geo.hips, N),
    head: make(geo.head, N),
    face: make(geo.face, N),
    leg: make(geo.leg, N * 2),
    shoe: make(geo.shoe, N * 2),
    arm: make(geo.arm, N * 2),
    hand: make(geo.hand, N * 2),
  };
  const H = {};
  for (const st of styles) {
    const list = people.filter(p => p.style === st);
    H[st] = { mesh: make(HAIRS[st], list.length), list };
    list.forEach((p, i) => (p.hairIdx = i));
  }
  const c = new THREE.Color();
  people.forEach((p, i) => {
    M.torso.setColorAt(i, c.set(p.top));
    M.hips.setColorAt(i, c.set(p.bottom));
    M.head.setColorAt(i, c.set(p.skin));
    M.face.setColorAt(i, c.set('#ffffff'));
    H[p.style].mesh.setColorAt(p.hairIdx, c.set(p.hair));
    for (const k of [0, 1]) {
      M.leg.setColorAt(i * 2 + k, c.set(p.bottom));
      M.shoe.setColorAt(i * 2 + k, c.set('#ffffff'));
      M.arm.setColorAt(i * 2 + k, c.set(p.top));
      M.hand.setColorAt(i * 2 + k, c.set(p.skin));
    }
  });
  const base = new THREE.Matrix4(),
    part = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    pos = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1);
  const HIP = 0.78 * U,
    SHOULDER = 1.22 * U,
    ARM_OUT = 0.21;
  let time = 0;
  function update(dt) {
    time += dt;
    people.forEach((p, i) => {
      p.s += p.v * dt;
      let s = ((p.s % p.len) + p.len) % p.len,
        x = 0,
        z = 0,
        h = 0;
      for (let k = 0; k < 4; k++) {
        const [ax, az] = p.pts[k],
          [bx, bz] = p.pts[(k + 1) % 4],
          seg = Math.abs(bx - ax) + Math.abs(bz - az);
        if (s <= seg) {
          const t = s / seg;
          x = ax + (bx - ax) * t;
          z = az + (bz - az) * t;
          const sg = p.v ? Math.sign(p.v) : p.dir;
          h = Math.atan2((bx - ax) * sg, (bz - az) * sg);
          break;
        }
        s -= seg;
      }
      // A bouncy walk (or a gentle sway when standing).
      const walking = p.v !== 0,
        ph = walking ? ((time * Math.abs(p.v)) / U) * 3.6 + p.phase : time * 1.6 + p.phase,
        swing = walking ? Math.sin(ph) : Math.sin(ph) * 0.08;
      const bob = walking ? Math.abs(Math.cos(ph)) * 0.045 * U : 0,
        lean = walking ? 0.06 : 0;
      base.compose(
        pos.set(x, p.L.y + bob, z),
        q.setFromEuler(e.set(lean, h, Math.sin(ph) * (walking ? 0.04 : 0.03))),
        sc.set(p.scale, p.scale, p.scale),
      );
      M.torso.setMatrixAt(i, base);
      M.hips.setMatrixAt(i, base);
      M.head.setMatrixAt(i, base);
      M.face.setMatrixAt(i, base);
      H[p.style].mesh.setMatrixAt(p.hairIdx, base);
      for (const k of [0, 1]) {
        const sd = k ? 1 : -1;
        part
          .compose(pos.set(sd * 0.09 * U, HIP, 0), q.setFromEuler(e.set(swing * sd * 0.55, 0, 0)), one)
          .premultiply(base);
        M.leg.setMatrixAt(i * 2 + k, part);
        M.shoe.setMatrixAt(i * 2 + k, part);
        part
          .compose(
            pos.set(sd * ARM_OUT * U, SHOULDER, 0),
            q.setFromEuler(e.set(-swing * sd * 0.6, 0, sd * (walking ? 0.12 : 0.08))),
            one,
          )
          .premultiply(base);
        M.arm.setMatrixAt(i * 2 + k, part);
        M.hand.setMatrixAt(i * 2 + k, part);
      }
    });
    for (const m of [...Object.values(M), ...Object.values(H).map(h => h.mesh)])
      m.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { root, update, count: N };
}
