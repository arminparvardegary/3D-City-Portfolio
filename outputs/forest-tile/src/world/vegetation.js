import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from '../config.js';
import { mesh, branch, tint } from '../geometry.js';
import { TILE } from './units.js';

// Shared, reusable vegetation for every tile: geometry and materials are made
// once and drawn with InstancedMesh, so a meadow is one draw call, not hundreds.

// Wind is computed on the GPU from each instance's position, so swaying grass
// costs no JavaScript per frame. `wind.value` is the strength, `time` the clock.
export const wind = { time: { value: 0 }, strength: { value: 1 } };
function addWind(material, amount) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uTime = wind.time;
    shader.uniforms.uWind = wind.strength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;uniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 ip=instanceMatrix[3].xz;
          float bend=transformed.y*transformed.y*${amount.toFixed(3)}*uWind;
          transformed.x+=sin(uTime*1.6+ip.x*.9+ip.y*.4)*bend;
          transformed.z+=cos(uTime*1.2+ip.y*.8)*bend*.6;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => `wind-${amount}`;
  return material;
}

// One grass tuft: five tapered blades leaning out. Normals point up so the tuft
// shades like the lawn it grows from, with a darker base and a sunlit tip.
function tuftGeometry() {
  const rand = seededRandom(77),
    blades = [];
  for (let b = 0; b < 4; b++) {
    const a = (b / 4) * Math.PI * 2 + rand() * 0.7,
      h = 0.075 + rand() * 0.06,
      w = 0.045 + rand() * 0.015,
      lean = 0.035 + rand() * 0.035;
    const cx = Math.cos(a) * 0.025,
      cz = Math.sin(a) * 0.025,
      tx = cx + Math.cos(a) * lean,
      tz = cz + Math.sin(a) * lean,
      px = -Math.sin(a) * w,
      pz = Math.cos(a) * w;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([cx - px, 0, cz - pz, cx + px, 0, cz + pz, tx, h, tz], 3),
    );
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.setAttribute(
      'color',
      new THREE.Float32BufferAttribute([0.84, 0.88, 0.8, 0.84, 0.88, 0.8, 1.06, 1.08, 0.95], 3),
    );
    blades.push(g);
  }
  return mergeGeometries(blades);
}

// A small daisy: green stem, white petals, yellow heart, in one vertex coloured mesh.
function flowerGeometry() {
  const stem = tint(
    new THREE.CylinderGeometry(0.004, 0.005, 0.09, 4).translate(0, 0.045, 0),
    new THREE.Color(0.45, 0.62, 0.32),
  );
  const petals = tint(
    new THREE.CircleGeometry(0.032, 7).rotateX(-Math.PI / 2).translate(0, 0.092, 0),
    new THREE.Color(1, 1, 0.97),
  );
  const heart = tint(
    new THREE.SphereGeometry(0.011, 6, 4).scale(1, 0.6, 1).translate(0, 0.096, 0),
    new THREE.Color(1, 0.8, 0.25),
  );
  return mergeGeometries([stem, petals, heart].map(g => (g.index ? g.toNonIndexed() : g)));
}

function stoneGeometry() {
  const g = new THREE.DodecahedronGeometry(0.07, 0);
  g.scale(1, 0.5, 0.8);
  return tint(g);
}

// Places `count` instances on a tile, avoiding the given zones. Instances are
// shuffled, so lowering `density` thins them evenly rather than clearing a corner.
export function scatter({
  geometry,
  material,
  count,
  seed,
  exclude = [],
  margin = 0.25,
  scale = [0.75, 1.25],
  tint: tintRange = [0.88, 1.08],
  castShadow = false,
}) {
  const rand = seededRandom(seed),
    m = new THREE.InstancedMesh(geometry, material, count),
    o = new THREE.Object3D(),
    c = new THREE.Color();
  const lim = TILE.size / 2 - margin;
  const blocked = (x, z) =>
    exclude.some(e =>
      e.r
        ? (x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r
        : Math.abs(x - e.x) < e.hw && Math.abs(z - e.z) < e.hd,
    );
  let n = 0,
    tries = 0;
  while (n < count && tries < count * 40) {
    tries++;
    const x = (rand() * 2 - 1) * lim,
      z = (rand() * 2 - 1) * lim;
    if (blocked(x, z)) continue;
    o.position.set(x, TILE.top, z);
    o.rotation.set(0, rand() * Math.PI * 2, 0);
    o.scale.setScalar(scale[0] + rand() * (scale[1] - scale[0]));
    o.updateMatrix();
    m.setMatrixAt(n, o.matrix);
    const k = tintRange[0] + rand() * (tintRange[1] - tintRange[0]);
    m.setColorAt(n, c.setRGB(k, k, k));
    n++;
  }
  m.count = n;
  m.userData.total = n;
  m.castShadow = castShadow;
  m.receiveShadow = true;
  m.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  m.computeBoundingSphere();
  return m;
}
export const setDensity = (m, d) => {
  m.count = Math.round(m.userData.total * Math.min(1, Math.max(0, d)));
};

// The meadow for a tile: grass tufts, a scattering of daisies and a few stones.
export function meadow(m, exclude, { grass = 850, flowers = 70, stones = 14 } = {}) {
  const grassMat = addWind(
    new THREE.MeshStandardMaterial({
      color: m.grass.color,
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.95,
    }),
    9,
  );
  const flowerMat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), 5);
  const group = new THREE.Group();
  group.name = 'meadow';
  const tufts = scatter({
    geometry: tuftGeometry(),
    material: grassMat,
    count: grass,
    seed: 11,
    exclude,
    scale: [0.8, 1.35],
    tint: [0.94, 1.04],
  });
  const daisies = scatter({
    geometry: flowerGeometry(),
    material: flowerMat,
    count: flowers,
    seed: 23,
    exclude,
    scale: [0.8, 1.2],
    tint: [0.95, 1],
  });
  const pebbles = scatter({
    geometry: stoneGeometry(),
    material: m.stone,
    count: stones,
    seed: 31,
    exclude,
    scale: [0.6, 1.3],
    tint: [0.9, 1.05],
    castShadow: true,
  });
  group.add(tufts, daisies, pebbles);
  return {
    group,
    layers: [tufts, daisies, pebbles],
    materials: [grassMat, flowerMat],
    grassMaterial: grassMat,
  };
}

// Trees in the clean low-poly style of the city reference: a faceted round crown
// (or a stacked-cone pine) on a tapered trunk. Faces are flat shaded, each a
// slightly different shade, darker underneath. The crown is its own group so it can sway.
export function tree(parent, m, { x, z, height = 2.25, seed = 1, kind = 'round' }) {
  const rand = seededRandom(seed),
    g = new THREE.Group();
  g.position.set(x, TILE.top, z);
  parent.add(g);
  branch(g, [0, 0, 0], [0.015, height * (kind === 'pine' ? 0.3 : 0.64), 0], 0.05, 0.03, m.bark, 1, 8);
  const crown = new THREE.Group();
  crown.position.y = height * (kind === 'pine' ? 0.3 : 0.7);
  g.add(crown);
  let geo;
  if (kind === 'pine') {
    const tiers = [
      [0.42, 0.62, 0],
      [0.33, 0.52, 0.34],
      [0.22, 0.42, 0.64],
    ].map(([r, h, y]) =>
      new THREE.ConeGeometry(r * height * 0.62, h * height * 0.62, 7)
        .translate(0, y * height * 0.62 + h * height * 0.31, 0)
        .toNonIndexed(),
    );
    geo = mergeGeometries(tiers);
  } else {
    geo = new THREE.IcosahedronGeometry(1, 1);
    geo.scale(height * 0.22, height * 0.33, height * 0.21);
  }
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo.computeVertexNormals();
  const p = geo.attributes.position,
    col = [],
    top = kind === 'pine' ? height * 0.62 : height * 0.33;
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
      t = THREE.MathUtils.clamp(kind === 'pine' ? y / top : (y / top + 1) / 2, 0, 1),
      k = (0.84 + 0.2 * t) * (0.94 + rand() * 0.1);
    for (let j = 0; j < 3; j++) col.push(k, k, k * 0.97);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  mesh(crown, geo, kind === 'pine' ? m.pine : m.leaves, [0, 0, 0], [0, rand() * Math.PI, 0]);
  crown.userData.phase = rand() * 6.28;
  return crown;
}
