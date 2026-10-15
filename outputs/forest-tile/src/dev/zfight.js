import * as THREE from 'three';

// Dev only: finds faces that would flicker (z-fighting): flat faces of two
// different looks (material or vertex colour) lying in the same plane, facing
// the same way and overlapping. In the console:
//   const z=await import('/src/dev/zfight.js'); z.scan(window.forestTile.scene)
export function scan(scene, { eps = 0.004, minArea = 0.0025 } = {}) {
  const buckets = new Map(),
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3(),
    e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || !o.visible || o.isInstancedMesh || o.isBatchedMesh || o.name === 'colliders') return;
    const mats = [].concat(o.material);
    if (mats.every(m => m.transparent && !m.depthWrite)) return; // decals drawn without depth do not fight
    const g = o.geometry,
      p = g.attributes.position,
      col = g.attributes.color,
      idx = g.index;
    if (!p) return;
    const groups = g.groups.length
      ? g.groups
      : [{ start: 0, count: idx ? idx.count : p.count, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex] ?? mats[0];
      if (mat.transparent && !mat.depthWrite) continue;
      for (let i = gr.start; i + 2 < gr.start + gr.count; i += 3) {
        const ia = idx ? idx.getX(i) : i,
          ib = idx ? idx.getX(i + 1) : i + 1,
          ic = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(p, ia).applyMatrix4(o.matrixWorld);
        b.fromBufferAttribute(p, ib).applyMatrix4(o.matrixWorld);
        c.fromBufferAttribute(p, ic).applyMatrix4(o.matrixWorld);
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
        const area = n.length() / 2;
        if (area < minArea) continue;
        n.normalize();
        const ax = Math.abs(n.x) > 0.999 ? 0 : Math.abs(n.y) > 0.999 ? 1 : Math.abs(n.z) > 0.999 ? 2 : -1;
        if (ax < 0) continue; // axis aligned faces only
        const sign = Math.sign(n.getComponent(ax)),
          plane = a.getComponent(ax),
          u = (ax + 1) % 3,
          v = (ax + 2) % 3;
        if (ax === 1 && sign < 0 && plane < 1.5) continue; // undersides at ground level are never seen
        const box = [
          Math.min(a.getComponent(u), b.getComponent(u), c.getComponent(u)),
          Math.max(a.getComponent(u), b.getComponent(u), c.getComponent(u)),
          Math.min(a.getComponent(v), b.getComponent(v), c.getComponent(v)),
          Math.max(a.getComponent(v), b.getComponent(v), c.getComponent(v)),
        ];
        const look =
          mat.uuid +
          (col
            ? ':' + col.getX(ia).toFixed(2) + ',' + col.getY(ia).toFixed(2) + ',' + col.getZ(ia).toFixed(2)
            : '') +
          (mat.map ? ':tex' : '');
        const key = ax + '|' + sign + '|' + Math.round(plane / eps);
        let list = buckets.get(key);
        if (!list) buckets.set(key, (list = []));
        list.push({
          box,
          look,
          po: mat.polygonOffset ? mat.polygonOffsetUnits : 0,
          name: o.name || o.parent?.name || '(mesh)',
          mat:
            (mat.name || mat.type) +
            ' #' +
            (col
              ? new THREE.Color(col.getX(ia), col.getY(ia), col.getZ(ia)).getHexString()
              : mat.color?.getHexString?.()) +
            (mat.map ? ' tex' : ''),
          plane,
          center: [(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3],
        });
      }
    }
  });
  const hits = new Map();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    list.sort((p, q) => p.box[0] - q.box[0]);
    for (let i = 0; i < list.length; i++) {
      const A = list[i];
      for (let j = i + 1; j < list.length && list[j].box[0] < A.box[1]; j++) {
        const B = list[j];
        if (A.look === B.look || A.po !== B.po) continue; // a fixed draw order (polygon offset) settles the pair
        const ou = Math.min(A.box[1], B.box[1]) - Math.max(A.box[0], B.box[0]),
          ov = Math.min(A.box[3], B.box[3]) - Math.max(A.box[2], B.box[2]);
        if (ou > 0.01 && ov > 0.01) {
          const k = [A.name + '/' + A.mat, B.name + '/' + B.mat].sort().join('  vs  ');
          const h = hits.get(k);
          const ax = k;
          if (h) {
            h.count++;
            if (h.ats.length < 4 && h.count % 97 === 0) h.ats.push(A.center.map(v => +v.toFixed(1)));
          } else
            hits.set(k, {
              count: 1,
              at: A.center.map(v => +v.toFixed(2)),
              ats: [],
              plane: +A.plane.toFixed(3),
            });
        }
      }
    }
  }
  return [...hits.entries()]
    .sort((p, q) => q[1].count - p[1].count)
    .map(
      ([k, v]) =>
        `${v.count}x  ${k}  plane ${v.plane}  at ${[v.at, ...v.ats].map(q => q.join(',')).join(' | ')}`,
    );
}
