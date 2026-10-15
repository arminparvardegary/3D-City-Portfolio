import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, branch } from './geometry.js';

function polygon(parent, points, material) {
  const p = [],
    indices = [];
  points.forEach(v => p.push(...v));
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return mesh(parent, g, material);
}

function badge(text, width, height, bg, fg, font = 'bold 42px Arial') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, 512, 128);
  x.fillStyle = fg;
  x.font = font;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 256, 68);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return {
    geometry: new THREE.PlaneGeometry(width, height),
    material: new THREE.MeshStandardMaterial({ map, roughness: 0.7, side: THREE.DoubleSide }),
  };
}

export function buildRanger(parent, m) {
  const truck = new THREE.Group();
  truck.name = 'ford-ranger-double-cab';
  truck.position.set(...ART.ranger.position);
  truck.rotation.y = ART.ranger.rotation;
  truck.scale.setScalar(ART.ranger.scale);
  parent.add(truck);
  // Double-cab pickup proportions: upright grille, four-door cab, open bed.
  box(truck, [1.37, 0.24, 3.37], [0, 0.59, 0], m.truck, 0.045);
  box(truck, [1.44, 0.36, 1.02], [0, 0.88, 1.17], m.truck, 0.045);
  box(truck, [1.4, 0.1, 0.94], [0, 1.075, 1.16], m.truck, 0.025);
  box(truck, [1.43, 0.33, 1.55], [0, 0.86, -0.05], m.truck, 0.025);
  // Cab shell, extruded from its sloping side profile.
  const profile = new THREE.Shape();
  profile.moveTo(-0.86, 1.04);
  profile.lineTo(-0.45, 1.6);
  profile.lineTo(0.61, 1.6);
  profile.lineTo(0.74, 0.94);
  profile.closePath();
  const cabGeo = new THREE.ExtrudeGeometry(profile, { depth: 1.34, bevelEnabled: false });
  const cab = mesh(truck, cabGeo, m.truck, [-0.67, 0, 0], [0, Math.PI / 2, 0]);
  // The profile's horizontal coordinate is reversed by its Y rotation.
  // Glass uses matching 3D planes on each visible side.
  for (const side of [-1, 1]) {
    const x = side * 0.685;
    const panes = [
      [
        [x, 1.07, -0.68],
        [x, 1.53, -0.57],
        [x, 1.53, 0.01],
        [x, 1.07, 0.01],
      ],
      [
        [x, 1.07, 0.08],
        [x, 1.53, 0.08],
        [x, 1.53, 0.46],
        [x, 1.07, 0.76],
      ],
    ];
    for (const points of panes) {
      const glass = polygon(truck, side === 1 ? points.slice().reverse() : points, m.truckGlass);
      glass.material.side = THREE.DoubleSide;
    }
    for (const z of [-0.79, 0.045, 0.71])
      box(truck, [0.012, 0.45, 0.013], [side * 0.713, 0.81, z], m.truckDark, 0.002);
    for (const z of [-0.42, 0.46]) box(truck, [0.024, 0.035, 0.13], [side * 0.728, 1.005, z], m.rim, 0.006);
    box(truck, [0.15, 0.095, 1.6], [side * 0.77, 0.45, -0.04], m.truckDark, 0.012);
    box(truck, [0.14, 0.055, 1.45], [side * 0.78, 0.51, -0.04], m.rim, 0.008);
    box(truck, [0.15, 0.12, 0.19], [side * 0.81, 1.17, 0.69], m.truckDark, 0.022);
  }
  // Front windshield slopes up from the hood toward the cab roof.
  polygon(
    truck,
    [
      [-0.6, 1.105, 0.82],
      [0.6, 1.105, 0.82],
      [0.6, 1.53, 0.51],
      [-0.6, 1.53, 0.51],
    ],
    m.truckGlass,
  );
  polygon(
    truck,
    [
      [0.59, 1.11, -0.724],
      [-0.59, 1.11, -0.724],
      [-0.59, 1.53, -0.632],
      [0.59, 1.53, -0.632],
    ],
    m.truckGlass,
  );
  box(truck, [1.39, 0.08, 1.09], [0, 1.62, -0.08], m.truck, 0.025);
  // Open cargo bed and dark liner keep the Ranger readable as a pickup.
  box(truck, [1.26, 0.055, 0.88], [0, 0.78, -1.21], m.truckDark, 0.009);
  for (const side of [-1, 1]) {
    box(truck, [0.12, 0.36, 1.03], [side * 0.66, 0.92, -1.2], m.truck, 0.016);
    box(truck, [0.14, 0.035, 1.07], [side * 0.66, 1.114, -1.2], m.truckDark, 0.008);
  }
  box(truck, [1.38, 0.36, 0.11], [0, 0.92, -1.69], m.truck, 0.014);
  box(truck, [1.44, 0.15, 0.13], [0, 0.61, -1.76], m.rim, 0.015);
  for (const side of [-1, 1]) box(truck, [0.14, 0.26, 0.035], [side * 0.59, 0.94, -1.755], m.tailLight, 0.01);
  const rangerLabel = badge('R A N G E R', 0.8, 0.14, ART.palette.ranger, '#d7e4e8');
  mesh(truck, rangerLabel.geometry, rangerLabel.material, [0, 0.96, -1.751], [0, Math.PI, 0]);
  // Dark grille with silver bars and Ford oval.
  box(truck, [1.43, 0.19, 0.14], [0, 0.59, 1.72], m.truckDark, 0.019);
  box(truck, [1.29, 0.31, 0.035], [0, 0.89, 1.695], m.truckDark, 0.018);
  for (const y of [0.81, 0.89, 0.97]) box(truck, [0.84, 0.025, 0.025], [0, y, 1.721], m.rim, 0.004);
  for (const side of [-1, 1]) {
    box(truck, [0.2, 0.22, 0.045], [side * 0.54, 0.93, 1.721], m.headlight, 0.013);
    box(truck, [0.1, 0.055, 0.035], [side * 0.5, 0.62, 1.802], m.headlight, 0.008);
  }
  box(truck, [0.73, 0.075, 0.06], [0, 0.52, 1.72], m.rim, 0.013);
  const ford = badge('Ford', 0.2, 0.085, '#254b70', '#ffffff', 'italic bold 75px Georgia');
  mesh(truck, ford.geometry, ford.material, [0, 0.9, 1.744]);
  const plate = badge('RANGER', 0.39, 0.085, '#e8eeea', '#4d5c62', 'bold 50px Arial');
  mesh(truck, plate.geometry, plate.material, [0, 0.65, 1.797]);
  // Four chunky all-terrain tires, chamfered rims and six simple spokes.
  for (const side of [-1, 1])
    for (const z of [-1.13, 1.15]) {
      const x = side * 0.72,
        y = 0.36;
      mesh(truck, new THREE.CylinderGeometry(0.34, 0.34, 0.2, 20), m.rubber, [x, y, z], [0, 0, Math.PI / 2]);
      mesh(
        truck,
        new THREE.CylinderGeometry(0.205, 0.205, 0.018, 16),
        m.truckDark,
        [side * 0.828, y, z],
        [0, 0, Math.PI / 2],
      );
      mesh(
        truck,
        new THREE.TorusGeometry(0.21, 0.022, 6, 20),
        m.rim,
        [side * 0.841, y, z],
        [0, Math.PI / 2, 0],
      );
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        branch(
          truck,
          [side * 0.844, y, z],
          [side * 0.844, y + Math.sin(a) * 0.18, z + Math.cos(a) * 0.18],
          0.025,
          0.018,
          m.rim,
          1,
          4,
        );
      }
      mesh(
        truck,
        new THREE.CylinderGeometry(0.062, 0.062, 0.026, 10),
        m.rim,
        [side * 0.852, y, z],
        [0, 0, Math.PI / 2],
      );
      mesh(
        truck,
        new THREE.TorusGeometry(0.36, 0.041, 5, 20, Math.PI),
        m.truckDark,
        [side * 0.745, y, z],
        [0, Math.PI / 2, 0],
      );
    }
  return truck;
}
