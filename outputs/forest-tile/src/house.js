import * as THREE from 'three';
import { box, mesh, tint, branch } from './geometry.js';

function roofPatch(sign, a, b, c, d, shade, lift = 0) {
  const points = [], indices = [], uv = [];
  const nx = 4, nz = 4;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const u = THREE.MathUtils.lerp(a, b, i / nx), z = THREE.MathUtils.lerp(c, d, j / nz);
    const y = 3.12 - 1.18 * u + 0.16 * Math.pow(u, 4) + Math.sin(j / nz * Math.PI) * 0.023 + lift;
    points.push(sign * u * 1.48, y, z); uv.push(u, z);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const p = i * (nz + 1) + j;
    if (sign > 0) indices.push(p, p + 1, p + nz + 1, p + 1, p + nz + 2, p + nz + 1);
    else indices.push(p, p + nz + 1, p + 1, p + 1, p + nz + 1, p + nz + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals();
  return tint(geo, shade);
}

function window(parent, m, pos, angle = 0, w = 0.57, h = 0.7, flowerbox = false) {
  const g = new THREE.Group(); parent.add(g); g.position.set(...pos); g.rotation.y = angle;
  box(g, [w + 0.12, h + 0.12, 0.08], [0, 0, 0], m.timber, 0.012, [0, 0, 0], 0.8);
  box(g, [w - 0.05, h - 0.05, 0.035], [0, 0, 0.045], m.windowDark, 0.008);
  box(g, [w - 0.11, h - 0.1, 0.025], [0, 0, 0.065], m.window, 0.005);
  for (const x of [-w / 2, w / 2]) box(g, [0.047, h + 0.06, 0.075], [x, 0, 0.075], m.cream);
  for (const y of [-h / 2, h / 2]) box(g, [w + 0.04, 0.047, 0.075], [0, y, 0.075], m.cream);
  box(g, [0.035, h, 0.045], [0, 0, 0.096], m.cream, 0.004);
  box(g, [w, 0.032, 0.045], [0, 0.03, 0.096], m.cream, 0.004);
  box(g, [w + 0.23, 0.07, 0.18], [0, -h / 2 - 0.065, 0.06], m.timber);
  // Light catches a slightly pale upper pane, as in old cottage glass.
  box(g, [w * 0.3, 0.022, 0.005], [-w * 0.2, h * 0.31, 0.083], m.cream, 0.001, [0, 0, -0.3]);
  if (flowerbox) {
    box(g, [w + 0.15, 0.19, 0.25], [0, -h / 2 - 0.2, 0.11], m.door, 0.02);
    box(g, [w + 0.19, 0.035, 0.28], [0, -h / 2 - 0.12, 0.11], m.timber);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.083, y = -h / 2 - 0.03 + Math.sin(i * 3.1) * 0.04;
      mesh(g, tint(new THREE.IcosahedronGeometry(0.095, 1), 0.9 + i * 0.025), m.leaves, [x, y, 0.13], [0, i, 0], [1, 0.8, 1]);
      mesh(g, tint(new THREE.SphereGeometry(0.026, 5, 4)), m.flower, [x, y + 0.065, 0.15]);
    }
  }
}

export function buildHouse(parent, m, rand) {
  const house = new THREE.Group(); house.name = 'terracotta-cottage'; house.position.set(-0.7, 0.34, -0.75); parent.add(house);
  // Shallow stone footing and textured lime-plaster walls.
  box(house, [2.43, 0.21, 2.68], [0, 0.1, 0], m.stone, 0.055);
  box(house, [2.3, 1.84, 2.55], [0, 1.12, 0], m.plaster, 0.035);
  const gable = new THREE.Shape(); gable.moveTo(-1.15, 2.02); gable.lineTo(0, 3.01); gable.lineTo(1.15, 2.02); gable.closePath();
  const g = new THREE.ExtrudeGeometry(gable, {depth:2.55, bevelEnabled:false});
  mesh(house, g, m.plaster, [0, 0, -1.275]);
  for (const x of [-1.16, 1.16]) for (const z of [-1.28, 1.28]) box(house, [0.105, 1.9, 0.105], [x, 1.14, z], m.timber, 0.015);
  for (const x of [-1.17, 1.17]) {
    box(house, [0.11, 0.11, 2.67], [x, 2.02, 0], m.timber);
    box(house, [0.08, 0.1, 2.57], [x, 0.25, 0], m.timber, 0.01, [0,0,0], 0.88);
  }
  for (const z of [-1.29, 1.29]) {
    box(house, [2.4, 0.105, 0.095], [0, 2.02, z], m.timber);
    box(house, [2.4, 0.09, 0.09], [0, 0.25, z], m.timber);
    branch(house, [-1.22, 2.05, z], [0, 3.08, z], 0.052, 0.052, m.timber, 1, 4);
    branch(house, [1.22, 2.05, z], [0, 3.08, z], 0.052, 0.052, m.timber, 1, 4);
    box(house, [0.07, 0.77, 0.07], [0, 2.48, z], m.timber, 0.008);
  }
  // Roof underlay plus individually curved, staggered clay tiles.
  for (const side of [-1, 1]) {
    const under = mesh(house, roofPatch(side, 0, 1.015, -1.57, 1.57, 1, -0.018), m.roofDark);
    under.material.side = THREE.DoubleSide;
    for (let row = 0; row < 7; row++) {
      const a = row / 7, b = (row + 1) / 7 + 0.02;
      for (let col = 0; col < 11; col++) {
        let c = -1.57 + col * 0.3 + (row % 2) * 0.15;
        let d = Math.min(1.57, c + 0.292); c = Math.max(-1.57, c);
        if (d <= c) continue;
        const shade = 0.88 + rand() * 0.23;
        mesh(house, roofPatch(side, a, b, c, d, shade, 0.014 + row * 0.001), m.roof);
        // Exposed tile lips add actual relief without a heavy texture.
        const y = 3.12 - 1.18 * b + 0.16 * b ** 4 + 0.01;
        box(house, [0.026, 0.032, d - c], [side * b * 1.48, y, (c+d)/2], m.roof, 0.009, [0,0,side * -0.45], shade * 0.93);
      }
    }
    // Fine eave fascia follows the outer edge.
    box(house, [0.07, 0.1, 3.16], [side * 1.49, 2.055, 0], m.timber, 0.016);
  }
  for (let i = 0; i < 12; i++) {
    const ridge = new THREE.CylinderGeometry(0.105, 0.105, 0.277, 10, 1, false, 0, Math.PI);
    mesh(house, tint(ridge, 0.94 + rand() * 0.13), m.roof, [0, 3.12, -1.51 + i * 0.274], [Math.PI/2, Math.PI/2, 0]);
  }
  // A squat chimney, softened stone cap and a dark opening.
  box(house, [0.35, 0.91, 0.4], [-0.63, 2.95, -0.64], m.plaster, 0.022);
  for (let i=0;i<4;i++) box(house, [0.356, 0.016, 0.406], [-0.63, 2.62 + i * 0.2, -0.64], m.stone, 0.003, [0,0,0], 1.05);
  box(house, [0.45, 0.1, 0.49], [-0.63, 3.42, -0.64], m.stone, 0.022);
  box(house, [0.24, 0.012, 0.27], [-0.63, 3.476, -0.64], m.dark, 0.018);

  // Door faces the same broad visible wall as the reference.
  const door = new THREE.Group(); house.add(door); door.position.set(1.168, 0.9, 0.39); door.rotation.y = Math.PI/2;
  box(door, [0.78, 1.48, 0.12], [0, 0, 0], m.timber, 0.02, [0,0,0], 0.85);
  box(door, [0.64, 1.35, 0.05], [0, -0.012, 0.07], m.door, 0.012);
  for (let i=0;i<5;i++) box(door, [0.006, 1.26, 0.006], [-0.246 + i*0.124, -0.013, 0.099], m.timber, 0.001, [0,0,0], 0.6);
  box(door, [0.5, 0.08, 0.04], [0, -0.4, 0.1], m.door, 0.009, [0,0,0], 1.15);
  box(door, [0.5, 0.08, 0.04], [0, 0.4, 0.1], m.door, 0.009, [0,0,0], 1.15);
  mesh(door, new THREE.SphereGeometry(0.032, 10, 8), m.gold, [0.22, -0.035, 0.15]);
  box(house, [0.49, 0.14, 0.94], [1.39, 0.075, 0.39], m.stone, 0.03);
  box(house, [0.28, 0.07, 1.01], [1.69, 0.035, 0.39], m.stone, 0.03, [0,0,0], 1.08);
  window(house, m, [1.17, 1.25, -0.75], Math.PI/2, 0.54, 0.67, true);
  window(house, m, [0.22, 1.21, 1.285], 0, 0.75, 0.81, true);
  // Little circular loft window in the gable.
  mesh(house, new THREE.CylinderGeometry(0.19,0.19,0.035,28), m.timber, [0,2.43,1.304], [Math.PI/2,0,0]);
  mesh(house, new THREE.CylinderGeometry(0.14,0.14,0.04,24), m.window, [0,2.43,1.325], [Math.PI/2,0,0]);
  box(house,[0.025,0.27,0.03],[0,2.43,1.35],m.cream,0.003);
  box(house,[0.27,0.025,0.03],[0,2.43,1.35],m.cream,0.003);
  // Copper lamp and terracotta pot beside the door.
  box(house, [0.12,0.2,0.12], [1.31,1.47,1.04], m.gold,0.01);
  box(house, [0.15,0.035,0.15], [1.31,1.59,1.04], m.dark,0.01);
  branch(house,[1.17,1.66,1.04],[1.34,1.66,1.04],0.015,0.015,m.dark);
  branch(house,[1.31,1.66,1.04],[1.31,1.6,1.04],0.015,0.015,m.dark);
  mesh(house,new THREE.CylinderGeometry(0.14,0.095,0.22,12),m.clay,[1.44,0.12,-0.22]);
  mesh(house,new THREE.TorusGeometry(0.132,0.02,6,14),m.clay,[1.44,0.23,-0.22],[Math.PI/2,0,0]);
  for(let i=0;i<8;i++){
    const a=i*2.4; branch(house,[1.44,0.21,-0.22],[1.44+Math.cos(a)*0.11,0.4+rand()*0.1,-0.22+Math.sin(a)*0.11],0.008,0.002,m.leaves);
    mesh(house,tint(new THREE.IcosahedronGeometry(0.05,1)),m.leaves,[1.44+Math.cos(a)*0.1,0.4,-0.22+Math.sin(a)*0.1],[0,a,0],[1,2,1]);
  }
  // Stacked split logs on the sheltered gable side.
  for(let i=0;i<8;i++){
    const x=-0.83+(i%3)*0.19, y=0.12+Math.floor(i/3)*0.16, z=1.48;
    branch(house,[x,y,z-0.2],[x,y,z+0.2],0.086,0.074,m.bark,0.85+rand()*0.2,9);
    mesh(house,tint(new THREE.CircleGeometry(0.064,9),0.8+rand()*0.2),m.timber,[x,y,z+0.204]);
  }
  return house;
}
