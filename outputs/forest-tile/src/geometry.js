import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function tint(geo, value = 1) {
  const color = value instanceof THREE.Color ? value : new THREE.Color(value, value, value);
  const data = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < data.length; i += 3) {
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(data, 3));
  return geo;
}

export function mesh(
  parent,
  geometry,
  material,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function box(parent, size, position, material, radius = 0.015, rotation = [0, 0, 0], shade = 1) {
  return mesh(
    parent,
    tint(new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v / 3))), shade),
    material,
    position,
    rotation,
  );
}

export function branch(parent, start, end, r1, r2, material, shade = 1, sides = 7) {
  const from = new THREE.Vector3(...start),
    to = new THREE.Vector3(...end);
  const delta = to.clone().sub(from);
  const object = mesh(
    parent,
    tint(new THREE.CylinderGeometry(r2, r1, delta.length(), sides), shade),
    material,
    from.clone().add(to).multiplyScalar(0.5).toArray(),
  );
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return object;
}

export function blobGeometry(seed = 1, detail = 2, amplitude = 0.07) {
  const smooth = detail >= 2;
  const geo = smooth ? new THREE.SphereGeometry(1, 24, 16) : new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const n = Math.sin(x * 6.2 + seed) * Math.cos(z * 7.1 - seed) * Math.sin(y * 5.3 + seed * 2);
    const amount = smooth ? amplitude * 0.45 : amplitude;
    pos.setXYZ(i, x * (1 + n * amount), y * (1 + n * amount), z * (1 + n * amount));
  }
  // Preserve smooth radial normals on foliage. Low-detail stones retain
  // their gently faceted normals; crown surfaces never show triangle seams.
  if (!smooth) geo.computeVertexNormals();
  return geo;
}

// Merge static meshes per material. Transforms are baked in group-local space.
// Retain independent canopy groups for a subtle, inexpensive breeze.
export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const buckets = new Map();
  const old = [];
  group.traverse(object => {
    if (!object.isMesh || object.isInstancedMesh || object.userData.keep) return; // `keep`: stays its own object (clickable, animated)
    const key = object.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: object.material, geometries: [] });
    let geo = object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    if (geo.index) {
      const original = geo;
      geo = geo.toNonIndexed();
      original.dispose();
    }
    if (!geo.attributes.color) tint(geo);
    if (!geo.attributes.uv)
      geo.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2),
      );
    geo.deleteAttribute('uv1');
    geo.deleteAttribute('tangent');
    buckets.get(key).geometries.push(geo);
    old.push(object);
  });
  for (const o of old) {
    o.removeFromParent();
    o.geometry.dispose();
  }
  for (const { material, geometries } of buckets.values()) {
    const merged = mergeGeometries(geometries, false);
    const object = mesh(group, merged, material);
    object.name = `merged-${material.uuid.slice(0, 6)}`;
    for (const g of geometries) g.dispose();
  }
  return group;
}
