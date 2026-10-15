import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from '../config.js';
import { TILE } from './units.js';
import { THEME } from './theme.js';
import { box, mesh, tint } from '../geometry.js';
import { grassMap, rockMap, worldUV } from './textures.js';

// The land: one continuous island over the 150 tile grid (no seams between
// tiles), a sand rim, a river channel from the waterfall to the harbour,
// faceted pastel mountains along the north and west, rock terraces where the
// slopes meet the meadow, and rocky outcrops on the east shore.
export const RIVER = { x0: 8.6, x1: 11.4, zStart: -21.5 };
const TOP = TILE.slab;

const mat = (color, extra = {}, prep) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, vertexColors: true, ...extra });
  prep?.(m);
  return m;
};

// Faceted mountain: an irregular cone, coloured meadow green at the foot,
// lavender rock above and a light cap at the top.
function mountainGeometry(rand, r, h) {
  const g = new THREE.ConeGeometry(r, h, 14, 7).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + h / 2,
      k = 1 - y / h,
      j = 0.18 * k;
    p.setXYZ(
      i,
      p.getX(i) * (1 + Math.sin(p.getZ(i) * 1.7 + r) * j),
      y * (1 + Math.cos(p.getX(i) * 1.3) * 0.06 * k),
      p.getZ(i) * (1 + Math.cos(p.getX(i) * 1.9 - r) * j),
    );
  }
  g.computeVertexNormals();
  const T = THEME.terrain,
    cMeadow = new THREE.Color(T.meadow),
    cRock = new THREE.Color(T.rock),
    cDark = new THREE.Color(T.rockDark),
    cSnow = new THREE.Color(T.snow),
    c = new THREE.Color(),
    col = [];
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 / h,
      n = rand() * 0.08;
    if (y < 0.22) c.copy(cMeadow).lerp(cRock, (Math.max(0, y - 0.08) / 0.14) * 0.7);
    else if (y < 0.7) c.copy(cRock).lerp(cDark, (0.35 + n * 2) * (1 - Math.abs(y - 0.45) * 1.6));
    else c.copy(cRock).lerp(cSnow, Math.min(1, (y - 0.7) / 0.08));
    c.offsetHSL(0, 0, n - 0.04);
    for (let j = 0; j < 3; j++) col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
function rockGeometry(rand, s) {
  const g = new THREE.DodecahedronGeometry(1, 0).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setXYZ(
      i,
      p.getX(i) * s * (1 + (rand() - 0.5) * 0.15),
      p.getY(i) * s * 0.62,
      p.getZ(i) * s * (1 + (rand() - 0.5) * 0.15),
    );
  g.computeVertexNormals();
  return tint(g);
}

export function buildTerrain({ bounds, prep }) {
  const group = new THREE.Group();
  group.name = 'terrain';
  const T = THEME.terrain,
    rand = seededRandom(101);
  const M = {
    grass: mat(THEME.palette.grass, { map: grassMap(), envMapIntensity: 0.35 }, prep),
    sand: mat(T.sand, { map: rockMap() }, prep),
    rock: mat(T.rock, { map: rockMap() }, prep),
    mountain: mat('#ffffff', { flatShading: true, map: rockMap() }, prep),
    bank: mat(T.rockLight, { map: rockMap() }, prep),
    bed: mat('#5aa9c9', {}, prep),
    cliff: mat(T.cliff, { flatShading: true, map: rockMap() }, prep),
  };
  const { x0, x1, z0, z1 } = bounds,
    cx = (x0 + x1) / 2;
  // Sand rim and island body below the lawn, so the coast reads as a beach.
  box(group, [x1 - x0 + 3, 1.7, z1 - z0 + 3], [cx, TOP - 0.04 - 0.85, (z0 + z1) / 2], M.sand, 0.25);
  // Lawn: two halves either side of the river, and a closing piece north of the pool.
  const R = RIVER;
  box(group, [R.x0 - x0, TOP, z1 - z0], [(x0 + R.x0) / 2, TOP / 2, (z0 + z1) / 2], M.grass, 0.004);
  box(group, [x1 - R.x1, TOP, z1 - z0], [(R.x1 + x1) / 2, TOP / 2, (z0 + z1) / 2], M.grass, 0.004);
  box(
    group,
    [R.x1 - R.x0, TOP, R.zStart - 3.4 - z0],
    [(R.x0 + R.x1) / 2, TOP / 2, (z0 + R.zStart - 3.4) / 2],
    M.grass,
    0.004,
  );
  // River bed and stone banks (the animated water surface is added by sea.js).
  const len = z1 + 1.5 - R.zStart;
  box(group, [R.x1 - R.x0, 0.1, len], [(R.x0 + R.x1) / 2, -0.12, R.zStart + len / 2], M.bed, 0.004);
  for (const x of [R.x0, R.x1])
    box(group, [0.34, 0.22, len - 0.4], [x, TOP - 0.02, R.zStart + len / 2 + 0.2], M.bank, 0.06);
  // Waterfall cliff above the pool, flanked by mountains.
  const cliff = rockGeometry(rand, 1);
  cliff.scale(6.5, 9, 2.2);
  mesh(group, cliff, M.cliff, [10, 1.9, -26.4]);
  // Mountains: a ridge along the north edge and down the west side, highest at the back corner.
  const peaks = [];
  for (let x = x0 + 6; x < x1 - 4; x += 9 + rand() * 4)
    peaks.push([x, z0 + 6 + rand() * 5, Math.abs(x - 10) < 9 ? 6 : 9 + rand() * 7]);
  for (let z = z0 + 16; z < 5; z += 10 + rand() * 3) peaks.push([x0 + 7 + rand() * 4, z, 8 + rand() * 6]);
  peaks.push([x0 + 8, z0 + 8, 17], [x0 + 20, z0 + 7, 14]);
  const geos = peaks.map(([x, z, h]) => {
    const r = h * 0.85 + rand() * 2;
    return mountainGeometry(rand, r, h).translate(x, h / 2 + TOP - 0.05, z);
  });
  mesh(group, mergeGeometries(geos), M.mountain);
  // Rock terraces where the slopes meet the meadow, and boulders along the east shore.
  const rocks = [];
  for (let i = 0; i < 26; i++) {
    const x = x0 + 12 + rand() * (x1 - x0 - 24),
      z = z0 + 13 + rand() * 5;
    if (Math.abs(x - 10) < 5) continue;
    rocks.push(rockGeometry(rand, 0.8 + rand() * 1.6).translate(x, TOP + 0.2, z));
  }
  for (let i = 0; i < 14; i++) {
    const z = z0 + 18 + rand() * (z1 - z0 - 30);
    rocks.push(rockGeometry(rand, 0.6 + rand() * 1.2).translate(x1 - 0.8 - rand() * 1.6, TOP + 0.1, z));
  }
  for (let i = 0; i < 10; i++) {
    const z = z0 + 40 + rand() * (z1 - z0 - 55);
    rocks.push(rockGeometry(rand, 0.6 + rand() * 1.1).translate(x0 + 0.8 + rand() * 1.6, TOP + 0.1, z));
  }
  mesh(group, mergeGeometries(rocks), M.rock);
  // Grain at a consistent world scale on every textured surface.
  const scale = new Map([
    [M.grass, 7],
    [M.sand, 6],
    [M.rock, 3],
    [M.mountain, 9],
    [M.bank, 2],
    [M.cliff, 5],
  ]);
  group.traverse(o => {
    if (o.isMesh && scale.has(o.material)) {
      o.updateMatrix();
      o.geometry = worldUV(o.geometry.clone().applyMatrix4(o.matrix), scale.get(o.material));
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
    }
  });
  return { group, peaks, materials: Object.values(M) };
}
