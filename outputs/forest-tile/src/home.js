import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh } from './geometry.js';

function simpleWindow(parent, m, x, y, z, w, h, angle = 0) {
  const frame = new THREE.Group();
  frame.position.set(x, y, z);
  frame.rotation.y = angle;
  parent.add(frame);
  box(frame, [w + 0.12, h + 0.12, 0.055], [0, 0, 0], m.trim, 0.009);
  box(frame, [w, h, 0.025], [0, 0, 0.038], m.window, 0.004);
  box(frame, [w + 0.18, 0.05, 0.13], [0, -h / 2 - 0.065, 0.035], m.trim, 0.006);
}

export function buildHome(parent, m) {
  const h = ART.house,
    house = new THREE.Group();
  house.name = 'my-minimal-house';
  house.position.set(...h.position);
  parent.add(house);
  const w = h.width,
    d = h.depth,
    wall = h.wallHeight,
    rise = h.roofRise;
  box(house, [w + 0.1, 0.12, d + 0.1], [0, 0.06, 0], m.path, 0.012);
  box(house, [w, wall, d], [0, wall / 2 + 0.12, 0], m.plaster, 0.014);
  const gable = new THREE.Shape();
  gable.moveTo(-w / 2, wall + 0.12);
  gable.lineTo(0, wall + rise + 0.12);
  gable.lineTo(w / 2, wall + 0.12);
  gable.closePath();
  mesh(house, new THREE.ExtrudeGeometry(gable, { depth: d, bevelEnabled: false }), m.plaster, [0, 0, -d / 2]);
  // Two unbroken roof planes, matching the minimal reference language.
  const overhang = 0.18,
    half = w / 2 + overhang,
    slope = rise / (w / 2),
    pitch = Math.atan(slope),
    length = half / Math.cos(pitch);
  for (const side of [-1, 1]) {
    box(
      house,
      [length, 0.105, d + 0.35],
      [(side * half) / 2, wall + rise + 0.17 - (half * slope) / 2, 0],
      m.roof,
      0.006,
      [0, 0, -side * pitch],
    );
  }
  // No timber framing or individual tiles: just a quiet, readable silhouette.
  box(house, [0.3, 0.7, 0.37], [-0.56, wall + rise + 0.12, -0.73], m.path, 0.008);
  box(house, [0.36, 0.07, 0.43], [-0.56, wall + rise + 0.49, -0.73], m.trim, 0.006);
  box(house, [0.17, 0.008, 0.23], [-0.56, wall + rise + 0.53, -0.73], m.truckDark, 0.003);
  simpleWindow(house, m, 0.72, 1.32, d / 2 + 0.024, 0.47, 0.67);
  simpleWindow(house, m, w / 2 + 0.024, 1.32, -0.77, 0.64, 0.75, Math.PI / 2);
  simpleWindow(house, m, w / 2 + 0.024, 1.32, 0.62, 0.64, 0.75, Math.PI / 2);
  const doorX = -0.53,
    front = d / 2;
  box(house, [0.85, 1.55, 0.07], [doorX, 0.895, front + 0.025], m.trim, 0.012);
  box(house, [0.71, 1.44, 0.035], [doorX, 0.87, front + 0.073], m.door, 0.006);
  box(house, [0.43, 0.43, 0.018], [doorX, 1.24, front + 0.098], m.window, 0.005);
  box(house, [0.025, 0.13, 0.03], [doorX + 0.23, 0.8, front + 0.12], m.rim, 0.004);
  box(house, [1.18, 0.11, 0.48], [doorX, 0.055, front + 0.3], m.path, 0.01);
  // Small porch canopy and wall lamp: restrained, functional details.
  box(house, [1.06, 0.065, 0.48], [doorX, 1.78, front + 0.16], m.trim, 0.009);
  box(house, [0.08, 0.18, 0.07], [doorX - 0.6, 1.53, front + 0.1], m.truckDark, 0.006);
  box(house, [0.054, 0.11, 0.01], [doorX - 0.6, 1.53, front + 0.14], m.headlight, 0.002);
  return house;
}

function flagTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e32332';
  ctx.fillRect(0, 0, 768, 512);
  // White crescent opening toward a five-pointed star.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(271, 256, 128, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e32332';
  ctx.beginPath();
  ctx.arc(303, 256, 102, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 === 0 ? 64 : 25.5;
    const x = 450 + Math.cos(angle) * r,
      y = 256 + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildTurkishFlag(parent, m) {
  const group = new THREE.Group();
  group.name = 'little-turkish-flag';
  group.position.set(-0.45, 0.12, 2.62);
  parent.add(group);
  box(group, [0.2, 0.06, 0.2], [0, 0.03, 0], m.path, 0.012);
  mesh(group, new THREE.CylinderGeometry(0.016, 0.02, 1.95, 10), m.rim, [0, 1.005, 0]);
  mesh(group, new THREE.SphereGeometry(0.033, 10, 8), m.rim, [0, 1.997, 0]);
  const width = 0.78,
    height = 0.52,
    geometry = new THREE.PlaneGeometry(width, height, 16, 6);
  geometry.translate(width / 2 + 0.016, 1.65, 0);
  const material = new THREE.MeshStandardMaterial({
    map: flagTexture(),
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
  });
  const fabric = mesh(group, geometry, material);
  fabric.rotation.y = Math.PI / 4;
  const pos = geometry.attributes.position;
  function animate(time) {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        t = x / width;
      pos.setZ(i, Math.sin(t * 5.2 - time * 0.0015 + (y - 1.65) * 1.6) * 0.045 * t);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  animate(0);
  return { animate, material };
}
