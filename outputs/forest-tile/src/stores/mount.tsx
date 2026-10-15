import * as THREE from 'three';
import { createRoot, createPortal, extend, _roots } from '@react-three/fiber';
import type { ComponentType } from 'react';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The store blocks are React Three Fiber components. They are rendered by a
// hidden R3F root straight into a group of the city's own scene (a portal), so
// the city's renderer, lights and post effects draw them like everything else.
// R3F never renders a frame itself; update(dt) runs the blocks' useFrame hooks
// (the rise in, people, signs) from the city's loop.
// <Canvas> normally registers three's classes; without it, register them here.
extend(THREE as any);

export type Store = { C: ComponentType; x: number; y: number; z: number; rot: number; scale: number };

export function mountStores(parent: THREE.Object3D, stores: Store[]) {
  const group = new THREE.Group();
  group.name = 'stores';
  parent.add(group);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const root = createRoot(canvas);
  root.configure({
    frameloop: 'never',
    events: undefined,
    size: { width: 1, height: 1, top: 0, left: 0 },
    gl: { antialias: false, powerPreference: 'low-power', alpha: true },
  });
  root.render(
    createPortal(
      <>
        {stores.map(({ C, x, y, z, rot, scale }, i) => (
          <group key={i} position={[x, y, z]} rotation={[0, rot, 0]} scale={scale}>
            <C />
          </group>
        ))}
      </>,
      group,
    ),
  );
  // The blocks are static: once React has built them, meshes that look the same
  // (same kind of material, colour, maps, shadows) are merged into one draw. The
  // originals stay in React's tree, hidden. Instanced foliage and anything added
  // later (the Rush logo loads after) are left as they are.
  const baked = new THREE.Group();
  baked.name = 'stores-baked';
  parent.add(baked);
  const sig = (m: any) =>
    [
      m.type,
      m.color?.getHexString(),
      m.emissive?.getHexString(),
      m.emissiveIntensity,
      m.roughness,
      m.metalness,
      m.map?.uuid,
      m.emissiveMap?.uuid,
      m.bumpMap?.uuid,
      m.normalMap?.uuid,
      m.alphaMap?.uuid,
      m.transparent,
      m.opacity,
      m.side,
      m.toneMapped,
      m.vertexColors,
      m.clearcoat,
      m.transmission,
      m.flatShading,
    ].join('|');
  function bake() {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const buckets = new Map<
      string,
      { mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }
    >();
    group.traverse((o: any) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.visible)
        return;
      let v: any = o;
      while (v) {
        if (!v.visible) return;
        v = v.parent;
      }
      const g0: THREE.BufferGeometry = o.geometry;
      if (!g0?.attributes?.position) return;
      let g = (g0.index ? g0.toNonIndexed() : g0.clone()) as THREE.BufferGeometry;
      for (const k of Object.keys(g.attributes))
        if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv)
        g.setAttribute(
          'uv',
          new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2),
        );
      const m: any = o.material;
      if (!m.vertexColors && g.attributes.color) g.deleteAttribute('color');
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const key = sig(m) + '|' + o.castShadow + '|' + Object.keys(g.attributes).sort().join(',');
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat: m, cast: o.castShadow, geos: [], meshes: [] }));
      b.geos.push(g);
      b.meshes.push(o);
    });
    for (const b of buckets.values()) {
      if (b.geos.length < 2) {
        b.geos.forEach(g => g.dispose());
        continue;
      }
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach(g => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, b.mat);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      baked.add(mesh);
      for (const o of b.meshes) o.visible = false;
    }
  }
  let t = 0,
    bakedYet = false;
  return {
    group,
    bake,
    get baked() {
      return bakedYet;
    },
    update(dt: number) {
      const store = _roots.get(canvas)?.store;
      if (!store) return;
      if (!bakedYet && t > 1.5) {
        bakedYet = true;
        bake();
      }
      const state = store.getState();
      t += dt;
      state.clock.elapsedTime = t;
      for (const s of state.internal.subscribers) s.ref.current(state, dt, undefined);
    },
  };
}
