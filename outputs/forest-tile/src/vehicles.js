import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, tint, mergeStatic } from './geometry.js';
import { buildRealCar, realWheels, physicalPaint } from './realcar.js';
import { MODELS, modelInfo, buildModelVehicle } from './cars/models.js';

// A small kit of clean toy vehicles in the style of the tile: soft rounded
// bodies with real wheel wells, a tinted glass cabin under a painted roof, dark
// bumpers, simple lamps and wheels. Units are tile units; the nose points to +z.

// Largest steering angle the controls use (rad). Every wheel well is sized so a
// tyre at a little more than this angle, either way, stays clear of the body.
export const MAX_STEER = 0.62;
const STEER_CHECK = 0.66,
  WELL_GAP = 0.06,
  CORE_GAP = 0.035;

function paint(color, prep) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.05, vertexColors: true });
  prep?.(mat);
  return mat;
}
// Surfaces that are not closed solids (liners, inner walls, signs) are tagged so
// the clearance check ignores them.
const open = o => {
  o.userData.open = true;
  o.castShadow = false;
  return o;
};

// How far in from the wheel centre plane a tyre reaches when steered to the limit.
const tyreReach = (w, steer) =>
  steer ? (w.tw / 2) * Math.cos(STEER_CHECK) + w.r * Math.sin(STEER_CHECK) : w.tw / 2;

// A body block cut from a side profile with arch openings over the wheels, then
// extruded across the car with soft bevelled edges. Inside each arch: a dark
// liner and an inner wall, placed inboard of where the steered tyre can reach.
function wellBody(car, m, body, { L, W, y0, H, zc = 0, corner = 0.12 }, w) {
  const b = 0.045,
    R = w.r + WELL_GAP,
    top = y0 + H;
  const zf = zc + L / 2 - b,
    zr = zc - L / 2 + b,
    yb = y0 + b,
    yt = top - b,
    rc = Math.min(corner, (yt - yb) / 2.2);
  const axles = w.axles.filter(a => a.z - R > zc - L / 2 && a.z + R < zc + L / 2).sort((a, c) => c.z - a.z);
  for (const a of axles)
    if (w.r + R > top - 0.04) console.warn('wheel well breaks through the top of the body', a.z);
  const s = new THREE.Shape();
  s.moveTo(zf - rc, yb);
  for (const a of axles) {
    const Rs = R + b,
      dy = yb - w.r,
      dz = Math.sqrt(Math.max(0, Rs * Rs - dy * dy)),
      a0 = Math.atan2(dy, dz);
    s.lineTo(a.z + dz, yb);
    s.absarc(a.z, w.r, Rs, a0, Math.PI - a0, false);
  }
  s.lineTo(zr + rc, yb);
  s.quadraticCurveTo(zr, yb, zr, yb + rc);
  s.lineTo(zr, yt - rc);
  s.quadraticCurveTo(zr, yt, zr + rc, yt);
  s.lineTo(zf - rc, yt);
  s.quadraticCurveTo(zf, yt, zf, yt - rc);
  s.lineTo(zf, yb + rc);
  s.quadraticCurveTo(zf, yb, zf - rc, yb);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: W - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
    curveSegments: 24,
  });
  mesh(car, tint(g.rotateY(-Math.PI / 2).translate(W / 2 - b, 0, 0)), body);
  for (const a of axles) {
    const inner = w.track - tyreReach(w, a.steer) - CORE_GAP,
      width = W / 2 - 0.012 - inner;
    if (inner < 0.05) console.warn('wheel well too wide for the body', a.z);
    for (const sx of [-1, 1]) {
      const liner = new THREE.CylinderGeometry(R - 0.004, R - 0.004, width, 32, 1, true, 0, Math.PI).rotateZ(
        Math.PI / 2,
      );
      open(mesh(car, tint(liner), m.wheelWell, [sx * (inner + width / 2), w.r, a.z]));
      open(
        mesh(
          car,
          tint(new THREE.CircleGeometry(R, 32, 0, Math.PI)),
          m.carTrim,
          [sx * inner, w.r, a.z],
          [0, (sx * Math.PI) / 2, 0],
        ),
      );
    }
  }
}

// Glass cabin from a side profile [[z, y], ...] (front base, front top, rear top,
// rear base), with a painted roof, A and C pillars and optional B pillars.
function cabin(car, m, body, { pts, width, pillars = [], roof = true }) {
  const s = new THREE.Shape(),
    bevel = 0.04;
  s.moveTo(...pts[0]);
  for (const p of pts.slice(1)) s.lineTo(...p);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
  });
  mesh(car, tint(g.rotateY(-Math.PI / 2).translate(width / 2 - bevel, 0, 0)), m.carGlass);
  if (!roof) return;
  const [fb, ft, rt, rb] = pts,
    top = Math.max(ft[1], rt[1]) + bevel;
  box(car, [width + 0.05, 0.07, Math.abs(ft[0] - rt[0]) + 0.1], [0, top, (ft[0] + rt[0]) / 2], body, 0.035);
  const post = (a, b) => {
    const dz = b[0] - a[0],
      dy = b[1] - a[1];
    for (const sx of [-1, 1])
      box(
        car,
        [0.07, Math.hypot(dz, dy) + 0.04, 0.09],
        [sx * (width / 2 + 0.012), (a[1] + b[1]) / 2, (a[0] + b[0]) / 2],
        body,
        0.03,
        [Math.atan2(dz, dy), 0, 0],
      );
  };
  post(fb, ft);
  post(rb, rt);
  for (const z of pillars) {
    const y0 = Math.min(fb[1], rb[1]);
    for (const sx of [-1, 1])
      box(car, [0.07, top - y0, 0.1], [sx * (width / 2 + 0.012), (top + y0) / 2, z], body, 0.03);
  }
}

// The lower body with wheel wells, dark bumpers, lamps and mirrors.
function lowerBody(car, m, body, { L, W, y0, H, lamps = true, mirrorZ = null, bumpers = true }, w) {
  wellBody(car, m, body, { L, W, y0, H }, w);
  const top = y0 + H;
  if (bumpers)
    for (const sz of [-1, 1])
      box(car, [W + 0.03, 0.16, 0.18], [0, y0 + 0.09, sz * (L / 2 - 0.05)], m.carTrim, 0.07);
  if (lamps)
    for (const sx of [-1, 1]) {
      box(car, [0.3, 0.09, 0.04], [sx * (W / 2 - 0.26), top - 0.17, L / 2 + 0.006], m.headlight, 0.035);
      box(car, [0.3, 0.08, 0.04], [sx * (W / 2 - 0.26), top - 0.16, -L / 2 - 0.006], m.tailLight, 0.035);
    }
  // Mirrors sit on the body shoulder, slightly embedded so they never float.
  if (mirrorZ !== null)
    for (const sx of [-1, 1])
      box(car, [0.14, 0.08, 0.11], [sx * (W / 2 + 0.02), top + 0.02, mirrorZ], body, 0.035);
}

// Wheels: tyre, light rim, hub and spokes, on a steering pivot at the wheel centre.
function wheels(rig, m, w) {
  const spins = [],
    { r, tw, track } = w;
  for (const { z, steer } of w.axles)
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * track, r, z);
      rig.add(pivot);
      const spin = new THREE.Group();
      pivot.add(spin);
      spin.userData.steer = pivot;
      spin.userData.front = !!steer;
      const tyre = mesh(
        spin,
        new THREE.CylinderGeometry(r, r, tw, 28),
        m.rubber,
        [0, 0, 0],
        [0, 0, Math.PI / 2],
      );
      tyre.userData.tyre = true;
      mesh(
        spin,
        new THREE.CylinderGeometry(r * 0.58, r * 0.58, 0.02, 24),
        m.rim,
        [sx * (tw / 2 + 0.004), 0, 0],
        [0, 0, Math.PI / 2],
      );
      mesh(
        spin,
        new THREE.CylinderGeometry(r * 0.17, r * 0.17, 0.024, 14),
        m.carTrim,
        [sx * (tw / 2 + 0.012), 0, 0],
        [0, 0, Math.PI / 2],
      );
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        box(
          spin,
          [0.012, r * 0.18, r * 0.1],
          [sx * (tw / 2 + 0.012), Math.sin(a) * r * 0.36, Math.cos(a) * r * 0.36],
          m.carTrim,
          0.005,
          [Math.PI / 2 - a, 0, 0],
        );
      }
      mergeStatic(spin); // tyre, rim, hub and spokes: three draw calls per wheel, not eight
      spins.push(spin);
    }
  return spins;
}

// A text sign (taxi light, ambulance lettering) drawn once on a canvas.
function sign(text, bg, fg, w = 256, h = 96) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  x.fillStyle = fg;
  x.font = `700 ${Math.round(h * 0.55)}px Arial`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 2);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.6 });
}

// Truck cab: a tall block with a well over the front wheels, big windscreen, mirrors.
function truckCab(car, m, body, { z0, z1, W, y0 }, w) {
  wellBody(car, m, body, { L: z1 - z0, W, y0, H: 0.75, zc: (z0 + z1) / 2, corner: 0.14 }, w);
  cabin(car, m, body, {
    pts: [
      [z1 - 0.02, y0 + 0.75],
      [z1 - 0.14, y0 + 1.42],
      [z0 + 0.08, y0 + 1.42],
      [z0 + 0.06, y0 + 0.75],
    ],
    width: W - 0.12,
  });
  box(car, [W + 0.03, 0.18, 0.16], [0, y0 + 0.1, z1 + 0.02], m.carTrim, 0.07);
  for (const sx of [-1, 1]) {
    box(car, [0.3, 0.12, 0.04], [sx * (W / 2 - 0.25), y0 + 0.4, z1 + 0.006], m.headlight, 0.04);
    box(car, [0.07, 0.3, 0.05], [sx * (W / 2 + 0.03), y0 + 1.0, z1 - 0.2], m.carTrim, 0.025);
  }
}

// name, paint, wheels {r tyre radius, tw tyre width, track, axles [{z, steer}]}, body.
const v = (name, color, wheels, make, real = false) => ({
  name,
  color,
  wheels: { tw: 0.24, ...wheels },
  make,
  real,
});

export const VEHICLES = [
  // Realistic: smooth lofted bodies, clearcoat paint, alloy wheels (realcar.js).
  v(
    'Sport',
    '#b5121b',
    { r: 0.33, tw: 0.27, track: 0.68, axles: [{ z: 1.22, steer: 1 }, { z: -1.2 }], style: 'real' },
    (c, m, p, w, prep) => buildRealCar(c, m, p, w, {}, prep),
    true,
  ),
  v(
    'Sport Taxi',
    '#f5bf0a',
    { r: 0.33, tw: 0.27, track: 0.68, axles: [{ z: 1.22, steer: 1 }, { z: -1.2 }], style: 'real' },
    (c, m, p, w, prep) => buildRealCar(c, m, p, w, { taxi: true }, prep),
    true,
  ),
  v(
    'Hatchback',
    '#e8574a',
    { r: 0.3, track: 0.68, axles: [{ z: 1.05, steer: 1 }, { z: -1.05 }] },
    (c, m, p, w) => {
      lowerBody(c, m, p, { L: 3.4, W: 1.56, y0: 0.24, H: 0.52, mirrorZ: 0.62 }, w);
      cabin(c, m, p, {
        pts: [
          [0.72, 0.76],
          [0.22, 1.24],
          [-1.22, 1.26],
          [-1.6, 0.84],
        ],
        width: 1.38,
        pillars: [-0.35],
      });
      return { L: 3.4, W: 1.56 };
    },
  ),
  v(
    'Sedan',
    '#3c6fd1',
    { r: 0.3, track: 0.7, axles: [{ z: 1.25, steer: 1 }, { z: -1.25 }] },
    (c, m, p, w) => {
      lowerBody(c, m, p, { L: 3.9, W: 1.6, y0: 0.24, H: 0.5, mirrorZ: 0.7 }, w);
      cabin(c, m, p, {
        pts: [
          [0.78, 0.74],
          [0.22, 1.18],
          [-0.78, 1.18],
          [-1.3, 0.74],
        ],
        width: 1.4,
        pillars: [-0.25],
      });
      return { L: 3.9, W: 1.6 };
    },
  ),
  v(
    'Coupe',
    '#f07a2a',
    { r: 0.31, track: 0.71, axles: [{ z: 1.25, steer: 1 }, { z: -1.2 }] },
    (c, m, p, w) => {
      lowerBody(c, m, p, { L: 3.9, W: 1.62, y0: 0.22, H: 0.52, mirrorZ: 0.5 }, w);
      cabin(c, m, p, {
        pts: [
          [0.55, 0.74],
          [-0.05, 1.12],
          [-0.62, 1.12],
          [-1.4, 0.78],
        ],
        width: 1.36,
      });
      box(c, [1.3, 0.05, 0.22], [0, 0.76, -1.82], p, 0.025);
      return { L: 3.9, W: 1.62 };
    },
  ),
  v(
    'SUV',
    '#3b7d6b',
    { r: 0.38, track: 0.76, axles: [{ z: 1.35, steer: 1 }, { z: -1.35 }] },
    (c, m, p, w) => {
      lowerBody(c, m, p, { L: 4.1, W: 1.74, y0: 0.32, H: 0.66, mirrorZ: 0.75 }, w);
      cabin(c, m, p, {
        pts: [
          [0.88, 0.98],
          [0.46, 1.52],
          [-1.7, 1.52],
          [-1.88, 1.0],
        ],
        width: 1.56,
        pillars: [-0.25, -1.15],
      });
      for (const sx of [-1, 1]) box(c, [0.05, 0.05, 1.9], [sx * 0.62, 1.615, -0.6], m.carTrim, 0.02);
      return { L: 4.1, W: 1.74 };
    },
  ),
  v('Wagon', '#9aa7b4', { r: 0.3, track: 0.7, axles: [{ z: 1.3, steer: 1 }, { z: -1.3 }] }, (c, m, p, w) => {
    lowerBody(c, m, p, { L: 4.1, W: 1.6, y0: 0.24, H: 0.5, mirrorZ: 0.72 }, w);
    cabin(c, m, p, {
      pts: [
        [0.82, 0.74],
        [0.3, 1.2],
        [-1.78, 1.22],
        [-1.92, 0.8],
      ],
      width: 1.42,
      pillars: [-0.3, -1.2],
    });
    return { L: 4.1, W: 1.6 };
  }),
  v(
    'Minivan',
    '#8a7fd6',
    { r: 0.32, track: 0.76, axles: [{ z: 1.42, steer: 1 }, { z: -1.38 }] },
    (c, m, p, w) => {
      lowerBody(c, m, p, { L: 4.3, W: 1.74, y0: 0.28, H: 0.6, mirrorZ: 0.95 }, w);
      cabin(c, m, p, {
        pts: [
          [1.2, 0.88],
          [0.6, 1.6],
          [-1.95, 1.6],
          [-2.08, 0.92],
        ],
        width: 1.6,
        pillars: [0.05, -1.1],
      });
      for (const sx of [-1, 1]) box(c, [0.03, 0.03, 1.1], [sx * 0.88, 0.8, -0.55], m.carTrim, 0.01);
      return { L: 4.3, W: 1.74 };
    },
  ),
  v('Taxi', '#f5c400', { r: 0.3, track: 0.7, axles: [{ z: 1.25, steer: 1 }, { z: -1.25 }] }, (c, m, p, w) => {
    lowerBody(c, m, p, { L: 3.9, W: 1.6, y0: 0.24, H: 0.5, mirrorZ: 0.7 }, w);
    cabin(c, m, p, {
      pts: [
        [0.78, 0.74],
        [0.22, 1.18],
        [-0.78, 1.18],
        [-1.3, 0.74],
      ],
      width: 1.4,
      pillars: [-0.25],
    });
    // Dark band between the wheel wells, proud of the door skin.
    box(c, [1.63, 0.08, 1.4], [0, 0.56, 0], m.carTrim, 0.01);
    const t = sign('TAXI', '#fff6c8', '#2a2a2a');
    box(c, [0.5, 0.16, 0.2], [0, 1.32, -0.25], t, 0.04);
    return { L: 3.9, W: 1.6 };
  }),
  v(
    'City',
    '#8fd0c3',
    { r: 0.28, track: 0.66, axles: [{ z: 0.92, steer: 1 }, { z: -0.95 }] },
    (c, m, p, w, prep) => {
      lowerBody(c, m, p, { L: 3.0, W: 1.5, y0: 0.24, H: 0.5, mirrorZ: 0.48 }, w);
      const roofWhite = paint('#f6f5ef', prep);
      cabin(c, m, roofWhite, {
        pts: [
          [0.6, 0.74],
          [0.2, 1.24],
          [-0.98, 1.26],
          [-1.36, 0.8],
        ],
        width: 1.34,
        pillars: [-0.42],
      });
      return { L: 3.0, W: 1.5 };
    },
  ),
  v(
    'Ambulance',
    '#f4f5f2',
    { r: 0.34, track: 0.8, axles: [{ z: 1.55, steer: 1 }, { z: -1.5 }] },
    (c, m, p, w, prep) => {
      const red = paint('#e2372f', prep);
      // Cab and a tall patient box with a red band, red crosses and a light bar.
      lowerBody(c, m, p, { L: 4.7, W: 1.82, y0: 0.3, H: 0.52, lamps: false }, w);
      box(c, [1.86, 1.3, 2.9], [0, 1.47, -0.87], p, 0.12);
      cabin(c, m, p, {
        pts: [
          [1.55, 0.82],
          [1.05, 1.5],
          [0.6, 1.52],
          [0.6, 0.82],
        ],
        width: 1.62,
      });
      for (const sx of [-1, 1]) {
        box(c, [0.02, 0.16, 2.9], [sx * 0.935, 1.12, -0.87], red, 0.01);
        // The cross: two bars, the vertical one a hair prouder so their faces never coincide.
        box(c, [0.024, 0.42, 0.13], [sx * 0.936, 1.62, -0.95], red, 0.01);
        box(c, [0.02, 0.13, 0.42], [sx * 0.935, 1.62, -0.95], red, 0.01);
        box(c, [0.3, 0.1, 0.04], [sx * 0.66, 0.68, 2.356], m.headlight, 0.035);
        box(c, [0.24, 0.1, 0.04], [sx * 0.7, 0.68, -2.356], m.tailLight, 0.035);
        box(c, [0.07, 0.28, 0.05], [sx * 0.95, 1.15, 0.9], m.carTrim, 0.025);
      }
      box(c, [0.42, 0.42, 0.02], [0, 1.62, -2.335], red, 0.01);
      // Red and blue halves of the light bar meet without overlapping.
      box(c, [0.34, 0.1, 0.24], [-0.19, 2.17, 0.42], red, 0.04);
      box(c, [0.34, 0.1, 0.24], [0.19, 2.17, 0.42], m.siren, 0.04);
      const word = sign('AMBULANCE', '#f4f5f2', '#e2372f', 512, 96);
      open(mesh(c, new THREE.PlaneGeometry(1.1, 0.2), word, [0, 1.84, 0.592]));
      return { L: 4.7, W: 1.86 };
    },
  ),
  v(
    'Box truck',
    '#2f6fd6',
    { r: 0.4, tw: 0.3, track: 0.8, axles: [{ z: 1.75, steer: 1 }, { z: -1.2 }, { z: -1.95 }] },
    (c, m, p, w, prep) => {
      const white = paint('#f3f2ee', prep);
      box(c, [0.72, 0.2, 4.7], [0, 0.52, -0.1], m.carTrim, 0.04); // chassis rails, inside the wheels
      truckCab(c, m, p, { z0: 1.15, z1: 2.45, W: 1.86, y0: 0.42 }, w);
      box(c, [1.9, 0.1, 3.45], [0, 0.92, -0.6], p, 0.03); // painted sill above the rear wheels
      box(c, [1.96, 1.36, 3.45], [0, 1.65, -0.6], white, 0.08); // cargo box
      for (const sx of [-1, 1]) box(c, [0.26, 0.08, 0.04], [sx * 0.72, 1.12, -2.336], m.tailLight, 0.03);
      return { L: 4.9, W: 1.96 };
    },
  ),
  v(
    'Dump truck',
    '#f08a24',
    { r: 0.4, tw: 0.3, track: 0.8, axles: [{ z: 1.75, steer: 1 }, { z: -1.15 }, { z: -1.9 }] },
    (c, m, p, w, prep) => {
      const bed = paint('#f2b62c', prep);
      box(c, [0.72, 0.2, 4.7], [0, 0.52, -0.1], m.carTrim, 0.04);
      truckCab(c, m, p, { z0: 1.15, z1: 2.45, W: 1.86, y0: 0.42 }, w);
      // Open tipper above the rear wheels: floor, side walls, and end walls between them.
      const z0 = -2.4,
        z1 = 0.95,
        zc = (z0 + z1) / 2,
        Lb = z1 - z0;
      box(c, [1.9, 0.12, Lb], [0, 0.92, zc], bed, 0.03);
      for (const sx of [-1, 1]) box(c, [0.08, 0.78, Lb], [sx * 0.91, 1.33, zc], bed, 0.03);
      box(c, [1.74, 0.95, 0.08], [0, 1.42, z1 - 0.04], bed, 0.03);
      box(c, [1.74, 0.7, 0.08], [0, 1.29, z0 + 0.04], bed, 0.03);
      box(c, [1.68, 0.06, Lb - 0.2], [0, 0.99, zc], m.carTrim, 0.02);
      for (const sx of [-1, 1]) box(c, [0.26, 0.08, 0.04], [sx * 0.72, 0.82, -2.43], m.tailLight, 0.03);
      return { L: 4.9, W: 1.96 };
    },
  ),
];

// Builds vehicle i into a rig: `car` is the sprung body (it pitches and rolls
// while driving), the wheels hang off the rig so they stay planted.
// New York drives the downloaded models (cars/models.js): once they are loaded,
// the vehicle list becomes those 21 cars.
// Models that finished loading later (the garage only Teslas) join the end of
// the list, so no car's position changes while someone drives.
export function addModelVehicles() {
  for (const M of MODELS) {
    const C = modelInfo(M.id);
    if (C && !VEHICLES.some(v => v.model === M.id))
      VEHICLES.push({
        name: M.name,
        color: C.paintColor,
        model: M.id,
        real: true,
        drive: M.drive,
        paints: M.paints,
      });
  }
}
export function useModelVehicles() {
  VEHICLES.length = 0;
  for (const M of MODELS) {
    const C = modelInfo(M.id);
    if (C)
      VEHICLES.push({
        name: M.name,
        color: C.paintColor,
        model: M.id,
        real: true,
        drive: M.drive,
        paints: M.paints,
      });
  }
}

export function buildVehicle(i, parent, m, prep, { merge = true } = {}) {
  if (VEHICLES[i]?.model) {
    const parts = buildModelVehicle(VEHICLES[i].model, parent);
    parts.rig.position.set(...ART.car.position);
    parts.rig.rotation.y = ART.car.rotation;
    parts.model = true;
    return parts;
  }
  const veh = VEHICLES[i],
    rig = new THREE.Group();
  rig.name = 'vehicle';
  rig.position.set(...ART.car.position);
  rig.rotation.y = ART.car.rotation;
  parent.add(rig);
  const body = new THREE.Group();
  rig.add(body);
  const paintMat = veh.real ? physicalPaint(veh.color, prep) : paint(veh.color, prep),
    w = veh.wheels;
  const spec = veh.make(body, m, paintMat, w, prep);
  const spins = w.style === 'real' ? realWheels(rig, m, w) : wheels(rig, m, w);
  if (merge) mergeStatic(body);
  const zs = w.axles.map(a => a.z),
    front = Math.max(...zs),
    rears = zs.filter(z => z < 0);
  return {
    rig,
    car: body,
    wheels: spins,
    paint: paintMat,
    color: veh.color,
    name: veh.name,
    wheelR: w.r,
    wheelbase: front - rears.reduce((a, b) => a + b, 0) / rears.length,
    rearZ: rears.reduce((a, b) => a + b, 0) / rears.length,
    track: w.track,
    length: spec.L,
    width: spec.W,
  };
}

// Frees a vehicle: its geometry and every material it made (shared ones stay).
export function disposeVehicle(parts, m) {
  const shared = new Set(Object.values(m));
  parts.rig.removeFromParent();
  if (parts.model) {
    parts.paint?.dispose();
    return;
  } // model geometry is shared with the loaded copy
  parts.rig.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    if (!shared.has(o.material)) {
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
}

// Clearance check: samples each tyre's surface at full lock both ways and at
// rest, and reports any sample inside a closed body part (ray parity test).
export function checkClearance(i, m) {
  const holder = new THREE.Group(),
    parts = buildVehicle(i, holder, m, null, { merge: false });
  parts.rig.position.set(0, 0, 0);
  parts.rig.rotation.set(0, 0, 0);
  const solids = [],
    test = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  parts.car.traverse(o => {
    if (o.isMesh && !o.userData.open) solids.push(o);
  });
  holder.updateMatrixWorld(true);
  // A slightly tilted ray, with hits on shared edges counted once, keeps the parity honest.
  const ray = new THREE.Raycaster(),
    dirs = [
      [0.013, 1, 0.007],
      [-0.011, 1, -0.009],
      [0.004, 1, -0.015],
    ].map(d => new THREE.Vector3(...d).normalize()),
    p = new THREE.Vector3(),
    hits = [],
    { r, tw } = VEHICLES[i].wheels;
  for (const spin of parts.wheels)
    for (const steer of spin.userData.front ? [-MAX_STEER, 0, MAX_STEER] : [0]) {
      const pivot = spin.userData.steer;
      pivot.rotation.y = steer;
      pivot.updateMatrixWorld(true);
      for (let k = 0; k < 36; k++)
        for (const xs of [-tw / 2, 0, tw / 2])
          for (const rr of [r * 0.999, r * 0.8]) {
            const a = (k / 36) * Math.PI * 2;
            p.set(xs, Math.sin(a) * rr, Math.cos(a) * rr).applyMatrix4(pivot.matrixWorld);
            // The open well surfaces: the inner wall and the arch liner.
            const w = VEHICLES[i].wheels,
              ax = w.axles.find(q => q.z === pivot.position.z),
              wall = w.track - tyreReach(w, ax.steer) - CORE_GAP;
            if (Math.abs(p.x) < wall) {
              hits.push({ steer, z: ax.z, part: 'inner wall', at: p.toArray().map(v => +v.toFixed(2)) });
              continue;
            }
            if (Math.hypot(p.y - w.r, p.z - ax.z) > w.r + WELL_GAP - 0.004 && p.y > w.r) {
              hits.push({ steer, z: ax.z, part: 'liner', at: p.toArray().map(v => +v.toFixed(2)) });
              continue;
            }
            for (const s of solids) {
              // Inside only if three slightly different rays all cross the surface an odd number of times.
              const keep = s.material;
              s.material = test;
              const inside = dirs.every(dir => {
                ray.set(p, dir);
                const d = ray.intersectObject(s, false).map(h => h.distance);
                return d.filter((x, k) => k === 0 || x - d[k - 1] > 1e-5).length % 2 === 1;
              });
              s.material = keep;
              if (inside) {
                hits.push({
                  steer,
                  z: +pivot.position.z.toFixed(2),
                  part: s.geometry.type,
                  at: p.toArray().map(v => +v.toFixed(2)),
                });
                break;
              }
            }
          }
    }
  disposeVehicle(parts, m);
  return hits;
}
