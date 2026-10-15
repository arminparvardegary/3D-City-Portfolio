import * as THREE from 'three';

// Collider view (dev): open the page with ?colliders to see every collision
// shape as a wireframe over the scene: static solids (orange), posts (yellow),
// your car's body box (green) and every other car's box (cyan), live.
export function showColliders({ scene, car, world }) {
  const root = new THREE.Group();
  root.name = 'colliders';
  scene.add(root);
  const line = c =>
    new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.9 });
  const solidM = line('#ff8a3c'),
    postM = line('#ffe14a'),
    carM = line('#3cff7a'),
    otherM = line('#3ce4ff');
  const unitBox = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    unitCyl = new THREE.EdgesGeometry(new THREE.CylinderGeometry(1, 1, 1, 16, 1));
  const surf = (x, z) => world.surface?.(x, z, 9) ?? 0;
  // Static boxes: [x, z, halfW, halfD, top?] from the ground (or deck) to their top or 1.6 above.
  for (const [x, z, hw, hd, top] of world.solids ?? []) {
    const g = surf(x, z),
      h = top !== undefined ? Math.max(0.3, top + 0.2 - g) : 1.6;
    const m = new THREE.LineSegments(unitBox, solidM);
    m.scale.set(hw * 2, h, hd * 2);
    m.position.set(x, 0.12 + g + h / 2, z);
    m.renderOrder = 999;
    root.add(m);
  }
  for (const [x, z, r] of world.circles ?? []) {
    const g = surf(x, z),
      m = new THREE.LineSegments(unitCyl, postM);
    m.scale.set(r, 1.6, r);
    m.position.set(x, 0.12 + g + 0.8, z);
    m.renderOrder = 999;
    root.add(m);
  }
  const mine = new THREE.LineSegments(unitBox, carM);
  mine.renderOrder = 999;
  root.add(mine);
  const others = [];
  const tick = () => {
    const p = car.shown,
      pr = car.probe();
    if (p) {
      mine.scale.set(pr.hw * 2, 1.2, pr.hl * 2);
      mine.rotation.set(0, p.h, 0);
      mine.position.set(p.x + Math.sin(p.h) * pr.oz, (p.y ?? 0.12) + 0.6, p.z + Math.cos(p.h) * pr.oz);
    }
    const boxes = world.vehicleBoxes?.() ?? [];
    while (others.length < boxes.length) {
      const m = new THREE.LineSegments(unitBox, otherM);
      m.renderOrder = 999;
      root.add(m);
      others.push(m);
    }
    boxes.forEach(([x, z, h, hl, hw, y], i) => {
      const m = others[i];
      m.scale.set(hw * 2, 1.2, hl * 2);
      m.rotation.set(0, h, 0);
      m.position.set(x, 0.12 + y + 0.6, z);
    });
    requestAnimationFrame(tick);
  };
  tick();
  return root;
}
