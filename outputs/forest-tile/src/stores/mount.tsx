import * as THREE from "three";
import { createRoot, createPortal, extend, _roots } from "@react-three/fiber";
import type { ComponentType } from "react";

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
  group.name = "stores";
  parent.add(group);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const root = createRoot(canvas);
  root.configure({
    frameloop: "never",
    events: undefined,
    size: { width: 1, height: 1, top: 0, left: 0 },
    gl: { antialias: false, powerPreference: "low-power", alpha: true },
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
  let t = 0;
  return {
    group,
    update(dt: number) {
      const store = _roots.get(canvas)?.store;
      if (!store) return;
      const state = store.getState();
      t += dt;
      state.clock.elapsedTime = t;
      for (const s of state.internal.subscribers) s.ref.current(state, dt, undefined);
    },
  };
}
