import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mesh, mergeStatic } from './geometry.js';

// A realistic sports saloon, built from smooth lofted surfaces rather than boxes:
// a body whose cross sections are rounded rectangles that change along the car
// (wide at the hips, tapering to a rounded nose and tail, rising over the wheels
// to form the arches), and a glass cabin that leans in toward the roof
// (tumblehome). Painted roof and pillars, chrome belt line, LED lamps, a full
// width rear light bar, grille and intakes, mirrors, door seams, exhausts and
// plates. Units are tile units (about 1.5 m each); the nose points to +z.

// Smooth interpolation through a table [[z, value], ...].
export const curve = table => z => {
  if (z <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [z1, v1] = table[i];
    if (z <= z1) {
      const [z0, v0] = table[i - 1],
        t = (z - z0) / (z1 - z0),
        s = t * t * (3 - 2 * t);
      return v0 + (v1 - v0) * s;
    }
  }
  return table.at(-1)[1];
};
// Superellipse: a rounded rectangle point at angle a (n: squareness).
export const se = (a, n) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [Math.sign(c) * Math.abs(c) ** (2 / n), Math.sign(s) * Math.abs(s) ** (2 / n)];
};

// Loft: rings of points (same count, counter clockwise seen from the front) at
// increasing z, joined into one smooth surface; ends closed with a fan.
export function loft(rings, { caps = true, closed = true } = {}) {
  const M = rings[0].pts.length,
    pos = [],
    idx = [];
  for (const r of rings) for (const [x, y] of r.pts) pos.push(x, y, r.z);
  for (let k = 0; k < rings.length - 1; k++)
    for (let j = 0; j < (closed ? M : M - 1); j++) {
      const a = k * M + j,
        b = k * M + ((j + 1) % M),
        c = (k + 1) * M + j,
        d = (k + 1) * M + ((j + 1) % M);
      idx.push(a, b, c, b, d, c);
    }
  if (caps)
    for (const [k, flip] of [
      [0, true],
      [rings.length - 1, false],
    ]) {
      const r = rings[k],
        cx = r.pts.reduce((s, p) => s + p[0], 0) / M,
        cy = r.pts.reduce((s, p) => s + p[1], 0) / M,
        ci = pos.length / 3;
      pos.push(cx, cy, r.z);
      for (let j = 0; j < M; j++) {
        const a = k * M + j,
          b = k * M + ((j + 1) % M);
        flip ? idx.push(ci, b, a) : idx.push(ci, a, b);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function physicalPaint(color, prep) {
  const m = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.55,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.4,
  });
  prep?.(m);
  return m;
}

export function buildRealCar(car, m, paint, w, { L = 3.7, W = 1.62, taxi = false } = {}, prep) {
  const P = prep ?? (x => x),
    mat = o => {
      const x = new THREE.MeshStandardMaterial(o);
      P(x);
      return x;
    };
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#0c1218',
    metalness: 0.2,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.8,
  });
  P(glass);
  const chrome = mat({ color: '#e8ebef', metalness: 1, roughness: 0.12, envMapIntensity: 1.6 }),
    black = mat({ color: '#121417', roughness: 0.55, metalness: 0.1 }),
    gloss = mat({ color: '#0b0c0e', roughness: 0.2, metalness: 0.3 });
  const led = mat({ color: '#f4f8ff', emissive: '#eaf2ff', emissiveIntensity: 1.6, roughness: 0.2 }),
    lens = new THREE.MeshPhysicalMaterial({
      color: '#20242a',
      metalness: 0.4,
      roughness: 0.05,
      clearcoat: 1,
    });
  P(lens);
  const red = m.tailLight;
  const zr = -L / 2,
    zf = L / 2,
    az = w.axles.map(a => a.z),
    R = w.r + 0.07;
  // Profiles along the car (rear to front).
  const shoulder = curve([
    [zr, 0.66],
    [zr + 0.18, 0.82],
    [zr + 0.6, 0.88],
    [0.25, 0.88],
    [0.62, 0.86],
    [zf - 0.45, 0.76],
    [zf - 0.08, 0.66],
    [zf, 0.56],
  ]);
  const half = curve([
    [zr, 0.6],
    [zr + 0.25, 0.76],
    [zr + 0.8, 0.81],
    [0, W / 2],
    [zf - 0.7, 0.79],
    [zf - 0.2, 0.72],
    [zf, 0.56],
  ]);
  const floor = z => {
    let y = 0.2;
    for (const a of az) {
      const d = Math.abs(z - a);
      if (d < R) y = Math.max(y, w.r + Math.sqrt(R * R - d * d) - 0.02);
    }
    return y;
  };
  // Lower body.
  const rings = [],
    N = 48,
    M = 28;
  for (let i = 0; i <= N; i++) {
    const z = zr + ((zf - zr) * i) / N,
      yb = floor(z),
      yt = shoulder(z),
      hw = half(z),
      yc = (yb + yt) / 2,
      hh = (yt - yb) / 2,
      pts = [];
    for (let j = 0; j < M; j++) {
      const [sx, sy] = se((j / M) * Math.PI * 2, 4.2);
      pts.push([sx * hw, yc + sy * hh]);
    }
    rings.push({ z, pts });
  }
  mesh(car, loft(rings), paint);
  // Cabin: base on the shoulder, roof over the middle, steep windshield, fastback rear.
  const cz0 = -1.12,
    cz1 = 0.66,
    roof = curve([
      [cz0, 0.86],
      [-0.72, 1.18],
      [-0.35, 1.3],
      [0.08, 1.32],
      [0.36, 1.18],
      [cz1, 0.86],
    ]);
  const cab = [],
    roofRings = [],
    K = 26,
    Q = 28;
  for (let i = 0; i <= K; i++) {
    const z = cz0 + ((cz1 - cz0) * i) / K,
      base = shoulder(z) - 0.05,
      top = Math.max(base + 0.02, roof(z)),
      wb = half(z) - 0.11,
      wt = wb - 0.2,
      yc = (base + top) / 2,
      hh = (top - base) / 2,
      pts = [],
      rp = [];
    for (let j = 0; j < Q; j++) {
      const [sx, sy] = se((j / Q) * Math.PI * 2, 3.6),
        y = yc + sy * hh,
        v = Math.max(0, (y - base) / (top - base)),
        x = sx * (wb + (wt - wb) * v);
      pts.push([x, y]);
      rp.push([x * 1.012, y + 0.006]);
    }
    cab.push({ z, pts });
    roofRings.push({ z, pts: rp });
  }
  mesh(car, loft(cab), glass);
  // Painted roof: the top of the cabin, slightly proud, where the cabin is tall.
  {
    const keep = j => {
      const a = (j / Q) * Math.PI * 2;
      return a > Math.PI * 0.18 && a < Math.PI * 0.82;
    };
    const top = roofRings.slice(5, K - 6).map(r => ({ z: r.z, pts: r.pts.filter((_, j) => keep(j)) }));
    mesh(car, loft(top, { caps: false, closed: false }), paint);
  }
  // Chrome belt line along the base of the side windows.
  for (const s of [-1, 1]) {
    const pts = [];
    for (let z = cz0 + 0.1; z <= cz1 - 0.05; z += 0.1)
      pts.push(new THREE.Vector3(s * (half(z) - 0.1), shoulder(z) - 0.03, z));
    mesh(car, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014, 5), chrome);
  }
  // Front: LED headlights in dark lenses, grille, lower intakes, splitter.
  for (const s of [-1, 1]) {
    mesh(
      car,
      new RoundedBoxGeometry(0.42, 0.11, 0.2, 2, 0.04),
      lens,
      [s * 0.5, 0.72, zf - 0.2],
      [-0.25, s * 0.32, 0],
    );
    mesh(
      car,
      new THREE.BoxGeometry(0.36, 0.025, 0.05),
      led,
      [s * 0.5, 0.735, zf - 0.12],
      [-0.25, s * 0.32, 0],
    );
    mesh(car, new RoundedBoxGeometry(0.32, 0.13, 0.1, 2, 0.04), black, [s * 0.5, 0.38, zf - 0.05]);
  }
  mesh(car, new RoundedBoxGeometry(0.62, 0.16, 0.12, 2, 0.05), gloss, [0, 0.52, zf - 0.02]);
  for (let k = -2; k <= 2; k++)
    mesh(car, new THREE.BoxGeometry(0.56, 0.012, 0.02), chrome, [0, 0.47 + k * 0.025, zf + 0.03]);
  mesh(car, new THREE.BoxGeometry(1.2, 0.04, 0.16), black, [0, 0.24, zf - 0.02]);
  // Rear: full width light bar, lamp clusters, diffuser, twin exhausts.
  mesh(car, new THREE.BoxGeometry(1.0, 0.045, 0.04), red, [0, 0.8, zr + 0.13]);
  for (const s of [-1, 1])
    mesh(car, new RoundedBoxGeometry(0.3, 0.1, 0.12, 2, 0.04), red, [s * 0.5, 0.78, zr + 0.12]);
  mesh(car, new THREE.BoxGeometry(1.1, 0.14, 0.14), black, [0, 0.3, zr + 0.06]);
  for (const s of [-1, 1]) {
    const e = new THREE.CylinderGeometry(0.055, 0.055, 0.18, 14).rotateX(Math.PI / 2);
    mesh(car, e, chrome, [s * 0.38, 0.28, zr + 0.02]);
  }
  // Plates.
  const plate = text => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#f4f4f0';
    g.fillRect(0, 0, 256, 64);
    g.strokeStyle = '#222';
    g.lineWidth = 4;
    g.strokeRect(3, 3, 250, 58);
    g.fillStyle = '#1a1d24';
    g.font = '700 40px Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 35);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return mat({ map: t, roughness: 0.5 });
  };
  const pm = plate(taxi ? 'NYC 1' : 'ARMIN');
  mesh(car, new THREE.PlaneGeometry(0.42, 0.1), pm, [0, 0.42, zf + 0.062]);
  mesh(car, new THREE.PlaneGeometry(0.42, 0.1), pm, [0, 0.52, zr + 0.03], [0, Math.PI, 0]);
  // Sides: mirrors on stalks, door seams, handles, black sills.
  for (const s of [-1, 1]) {
    const x = s * (half(0.5) - 0.06);
    mesh(car, new THREE.BoxGeometry(0.05, 0.04, 0.12), black, [x + s * 0.07, 0.92, 0.48]);
    mesh(car, new RoundedBoxGeometry(0.2, 0.11, 0.13, 2, 0.045), paint, [x + s * 0.17, 0.95, 0.46]);
    mesh(car, new THREE.BoxGeometry(0.012, 0.08, 0.1), gloss, [x + s * 0.27, 0.95, 0.47]);
    for (const z of [0.52, -0.3, -1.0]) {
      const hw = half(z);
      mesh(car, new THREE.BoxGeometry(0.008, shoulder(z) - floor(z) - 0.08, 0.012), gloss, [
        s * (hw + 0.002),
        (shoulder(z) + floor(z)) / 2,
        z,
      ]);
    }
    for (const z of [0.25, -0.55])
      mesh(car, new RoundedBoxGeometry(0.03, 0.035, 0.16, 2, 0.012), chrome, [
        s * (half(z) + 0.008),
        0.78,
        z,
      ]);
    mesh(car, new THREE.BoxGeometry(0.04, 0.08, az[0] - az[1] - 0.95), black, [
      s * (half(0) - 0.02),
      0.25,
      (az[0] + az[1]) / 2,
    ]);
  }
  if (taxi) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#fff8d6';
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#1d1d1f';
    g.font = '800 56px Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('TAXI', 128, 52);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const sm = mat({ map: t, emissive: '#fff2b0', emissiveIntensity: 0.25, emissiveMap: t });
    mesh(car, new RoundedBoxGeometry(0.56, 0.17, 0.24, 2, 0.05), sm, [0, 1.4, -0.12]);
    // Checker stripe along each side.
    const cream = mat({ color: '#f6f4ee' });
    for (const s of [-1, 1])
      for (let k = 0; k < 14; k++) {
        const z = -1.0 + k * 0.1;
        mesh(car, new THREE.BoxGeometry(0.006, 0.05, 0.1), k % 2 ? black : cream, [
          s * (half(z) + 0.004),
          0.64,
          z,
        ]);
      }
  }
  return { L, W };
}

// Realistic wheels: a rounded tyre, a ten spoke alloy, a brake disc and a red
// calliper that steers but does not spin.
export function realWheels(rig, m, w) {
  const spins = [],
    { r, tw, track } = w;
  const tyreProfile = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    tyreProfile.push(new THREE.Vector2(r - 0.06 + Math.cos(a) * 0.06, ((Math.sin(a) * tw) / 2) * 0.98));
  }
  const tyreGeo = new THREE.LatheGeometry(
    [new THREE.Vector2(r * 0.66, -tw / 2), ...tyreProfile, new THREE.Vector2(r * 0.66, tw / 2)],
    24,
  ).rotateZ(Math.PI / 2);
  const alloy = new THREE.MeshStandardMaterial({
      color: '#c4c8ce',
      metalness: 0.9,
      roughness: 0.25,
      envMapIntensity: 1.5,
    }),
    disc = new THREE.MeshStandardMaterial({ color: '#7d8188', metalness: 0.8, roughness: 0.4 });
  const caliper = new THREE.MeshStandardMaterial({ color: '#d01e24', roughness: 0.35, metalness: 0.2 }),
    rubber = m.rubber;
  for (const { z, steer } of w.axles)
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * track, r, z);
      rig.add(pivot);
      const spin = new THREE.Group();
      pivot.add(spin);
      spin.userData.steer = pivot;
      spin.userData.front = !!steer;
      mesh(spin, tyreGeo, rubber).userData.tyre = true;
      const face = sx * (tw / 2 - 0.03);
      mesh(
        spin,
        new THREE.CylinderGeometry(r * 0.66, r * 0.66, tw * 0.8, 28, 1, true),
        alloy,
        [0, 0, 0],
        [0, 0, Math.PI / 2],
      );
      mesh(
        spin,
        new THREE.CylinderGeometry(r * 0.66, r * 0.62, 0.03, 28),
        alloy,
        [face, 0, 0],
        [0, 0, Math.PI / 2],
      );
      mesh(
        spin,
        new THREE.CylinderGeometry(r * 0.13, r * 0.13, 0.05, 16),
        alloy,
        [face + sx * 0.015, 0, 0],
        [0, 0, Math.PI / 2],
      );
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        mesh(
          spin,
          new THREE.BoxGeometry(0.03, r * 0.5, 0.045),
          alloy,
          [face + sx * 0.012, Math.sin(a) * r * 0.36, Math.cos(a) * r * 0.36],
          [Math.PI / 2 - a, 0, 0],
        );
      }
      mesh(
        spin,
        new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.02, 24),
        disc,
        [sx * (tw / 2 - 0.12), 0, 0],
        [0, 0, Math.PI / 2],
      );
      mesh(pivot, new RoundedBoxGeometry(0.06, 0.16, 0.22, 2, 0.025), caliper, [
        sx * (tw / 2 - 0.1),
        r * 0.3,
        -r * 0.18,
      ]);
      mergeStatic(spin);
      spins.push(spin);
    }
  return spins;
}
