import * as THREE from 'three';
import { ART, seededRandom } from './config.js';
import { THEME } from './world/theme.js';

function grainTexture(kind, seed = 291) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rand = seededRandom(seed);
  ctx.fillStyle = '#a5a5a5'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16000; i++) {
    const v = 118 + Math.floor(rand() * 85);
    ctx.fillStyle = `rgba(${v},${v},${v},${kind === 'wood' ? 0.13 : 0.4})`;
    const x = rand() * 256, y = rand() * 256;
    ctx.fillRect(x, y, kind === 'wood' ? 0.4 + rand() : 0.5 + rand() * 1.3, kind === 'wood' ? 8 + rand() * 65 : 0.5 + rand() * 1.3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'wood' ? 2 : 3, kind === 'wood' ? 1 : 3);
  texture.anisotropy = 4;
  return texture;
}

export function createMaterials() {
  const grain = grainTexture('stone');
  const wood = grainTexture('wood');
  const make = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: ART.material.roughness, metalness: 0, ...extra});
  const tactile = { bumpMap: grain, bumpScale: ART.material.bump };
  const colors = ART.palette;
  return {
    ground: make(colors.grass, { vertexColors: true }),
    grass: make(colors.grass, { vertexColors: true, side: THREE.DoubleSide }),
    soil: make(colors.soil, { ...tactile, vertexColors: true, bumpScale: 0.025 }),
    path: make(colors.path, { ...tactile, vertexColors: true }),
    stone: make(THEME.palette.stone, { ...tactile, vertexColors: true }),
    plaster: make(colors.plaster, { ...tactile, bumpScale: 0.014 }),
    timber: make(colors.timber, { bumpMap: wood, bumpScale: 0.018, vertexColors: true }),
    door: make(THEME.palette.door, { vertexColors: true }),
    roof: make(colors.roof, { ...tactile, bumpScale: 0.018, vertexColors: true }),
    roofDark: make(THEME.palette.roofDark, { ...tactile }),
    leaves: make(colors.leaves, { ...tactile, bumpScale: 0.006, vertexColors: true, envMapIntensity: 0.35, side: THREE.DoubleSide }),
    pine: make(THEME.palette.pine, { vertexColors: true, envMapIntensity: 0.3 }),
    leafTips: make(colors.leafLight, { vertexColors: true, side: THREE.DoubleSide }),
    bark: make(colors.bark, { bumpMap: wood, bumpScale: 0.075, vertexColors: true }),
    birch: make('#d5d1b2', { ...tactile }),
    birchMark: make('#7e806a'),
    window: make(colors.glass, { roughness: 0.24, metalness: 0.12 }),
    windowDark: make('#415d52', { roughness: 0.7 }),
    cream: make('#e5e1bd'),
    flower: make('#eee5be', { side: THREE.DoubleSide, vertexColors: true }),
    gold: make(THEME.palette.gold, { roughness: 0.5, metalness: 0.15 }),
    clay: make('#bc7b54', { ...tactile }),
    mushroom: make('#c78359', { ...tactile }),
    dark: make('#3f4b3e'),
    parking: make(colors.parking),
    trim: make(colors.trim),
    carBody: make(colors.car, { roughness: 0.34, metalness: 0.08, vertexColors: true }),
    carGlass: make('#24303b', { roughness: 0.12, metalness: 0.35, vertexColors: true }),
    carTrim: make('#2b3036', { roughness: 0.7, vertexColors: true }),
    caliper: make('#e0453a', { roughness: 0.5 }),
    wheelWell: make('#1d2125', { roughness: 0.9, vertexColors: true, side: THREE.BackSide }),
    siren: make('#2f7cf0', { emissive: '#2f7cf0', emissiveIntensity: 0.6 }),
    rubber: make('#242526', { roughness: 0.92 }),
    rim: make('#9a9c9e', { roughness: 0.5, metalness: 0.35 }),
    truckDark: make('#42515a', { roughness: 0.75 }),
    headlight: make('#fffaf0', { emissive: '#fff6e0', emissiveIntensity: 0.55 }),
    tailLight: make('#d84f4a', { roughness: 0.42, emissive: '#ff2a22', emissiveIntensity: 0.45 }),
    roofEdge: make('#dc5c53'),
  };
}
