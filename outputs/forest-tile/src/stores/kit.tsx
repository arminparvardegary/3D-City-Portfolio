"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ---------- random ---------- */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- canvas textures (cached, built once) ---------- */
const cache = new Map<string, THREE.CanvasTexture>();

export function ctex(
  key: string,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeat?: [number, number]; color?: boolean } = {},
) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  cache.set(key, t);
  return t;
}

/** Soft grainy noise, used as bump for plaster, stone and soil. */
export function noise(g: CanvasRenderingContext2D, w: number, h: number, seed: number, base = 128, amp = 60, size = 2) {
  const r = rng(seed);
  g.fillStyle = `rgb(${base},${base},${base})`;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 6; i++) {
    const v = base + (r() - 0.5) * amp;
    g.fillStyle = `rgba(${v},${v},${v},0.5)`;
    const s = size * (0.5 + r());
    g.fillRect(r() * w, r() * h, s, s);
  }
}

export const stucco = () =>
  ctex("stucco", 256, 256, (g, w, h) => noise(g, w, h, 1, 128, 70, 2.2), { repeat: [2, 2], color: false });

export const brushed = () =>
  ctex(
    "brushed",
    256,
    256,
    (g, w, h) => {
      const r = rng(4);
      g.fillStyle = "rgb(110,110,110)";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const v = 90 + r() * 50;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(r() * w, 0, 0.6 + r(), h);
      }
    },
    { repeat: [3, 1], color: false },
  );

/* ---------- shapes ---------- */
/** Corner radii by world corner: [+x+z, +x-z, -x-z, -x+z] */
export type Radii = [number, number, number, number];

export function roundedShape(w: number, d: number, [pp, pn, nn, np]: Radii) {
  const hw = w / 2;
  const hd = d / 2;
  // shape Y maps to world -Z after rotateX(-PI/2)
  const s = new THREE.Shape();
  s.moveTo(-hw + np, -hd);
  s.lineTo(hw - pp, -hd);
  s.absarc(hw - pp, -hd + pp, pp, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - pn);
  s.absarc(hw - pn, hd - pn, pn, 0, Math.PI / 2, false);
  s.lineTo(-hw + nn, hd);
  s.absarc(-hw + nn, hd - nn, nn, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + np);
  s.absarc(-hw + np, -hd + np, np, Math.PI, Math.PI * 1.5, false);
  return s;
}

export function Block({
  w, d, h, radii, hole, bevel = 0.03, children,
}: { w: number; d: number; h: number; radii: Radii; hole?: number; bevel?: number; children: React.ReactNode }) {
  const geo = useMemo(() => {
    const shrink = (r: Radii) => r.map((v) => Math.max(v - bevel, 0.001)) as Radii;
    const shape = roundedShape(w - bevel * 2, d - bevel * 2, shrink(radii));
    if (hole) {
      const ir = radii.map((v) => Math.max(v - hole, 0.02)) as Radii;
      shape.holes.push(roundedShape(w - hole * 2, d - hole * 2, ir));
    }
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(h - bevel * 2, 0.001),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 40,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bevel, 0);
    g.computeVertexNormals();
    return g;
  }, [w, d, h, radii, hole, bevel]);
  return <mesh geometry={geo}>{children}</mesh>;
}

/* ---------- materials ---------- */
export function Mat({
  c, r = 0.6, m = 0, bump, bs = 0.004, map, e, ei = 1,
}: { c: string; r?: number; m?: number; bump?: THREE.Texture; bs?: number; map?: THREE.Texture; e?: string; ei?: number }) {
  return (
    <meshStandardMaterial
      color={c}
      roughness={r}
      metalness={m}
      bumpMap={bump}
      bumpScale={bs}
      map={map}
      emissive={e ?? "#000000"}
      emissiveIntensity={e ? ei : 0}
    />
  );
}

/* ---------- foliage (instanced leaf cards: one draw call per bush) ---------- */
let _leaf: THREE.BufferGeometry | null = null;
function leafGeometry() {
  if (_leaf) return _leaf;
  const s = new THREE.Shape();
  s.moveTo(0, -1);
  s.quadraticCurveTo(0.75, -0.2, 0, 1);
  s.quadraticCurveTo(-0.75, -0.2, 0, -1);
  const g = new THREE.ShapeGeometry(s, 4);
  // cup the leaf so light catches it unevenly
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getX(i) ** 2 * 0.6 - pos.getY(i) * 0.15);
  g.computeVertexNormals();
  _leaf = g;
  return g;
}

export function Foliage({
  count, radius, blob, seed, squash = 1, palette,
}: { count: number; radius: number; blob: number; seed: number; squash?: number; palette: string[]; detail?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const n = count * 4;
  // Disney-style crown: a few round clumps, each a soft core wrapped in leaves
  const clumps = useMemo(() => {
    const r = rng(seed * 3 + 1);
    const k = radius > 0.3 ? 6 : 3;
    return Array.from({ length: k }, (_, i) => {
      const a = (i / k) * Math.PI * 2 + r() * 0.6;
      const up = i === 0 ? 1 : r() * 0.9 - 0.2;
      const d = i === 0 ? 0 : radius * 0.5;
      return {
        c: new THREE.Vector3(Math.cos(a) * d * Math.sqrt(1 - up * up * 0.5), (i === 0 ? radius * 0.35 : up * radius * 0.45) * squash, Math.sin(a) * d),
        r: radius * (i === 0 ? 0.62 : 0.5 + r() * 0.12),
      };
    });
  }, [radius, seed, squash]);
  useLayoutEffect(() => {
    const r = rng(seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const cl = clumps[i % clumps.length];
      const u = r() * Math.PI * 2;
      const v = Math.acos(2 * r() - 1);
      const d = cl.r * (0.82 + r() * 0.22);
      const local = new THREE.Vector3(Math.sin(v) * Math.cos(u) * d, Math.cos(v) * d, Math.sin(v) * Math.sin(u) * d);
      const p = local.clone().add(cl.c);
      const s = blob * (0.45 + r() * 0.4);
      q.setFromEuler(e.set(r() * 6.28, r() * 6.28, r() * 6.28));
      m.compose(p, q, new THREE.Vector3(s * 0.55, s, s));
      ref.current.setMatrixAt(i, m);
      // sunlit tops glow warm, undersides fall into cool shade
      const lift = THREE.MathUtils.clamp(0.62 + (local.y / cl.r) * 0.32 + (p.y / (radius * 1.2)) * 0.12, 0.42, 1.18);
      col.set(palette[Math.floor(r() * palette.length)]).multiplyScalar(lift);
      ref.current.setColorAt(i, col);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [n, clumps, radius, blob, seed, palette]);
  const core = useMemo(() => new THREE.Color(palette[0]).multiplyScalar(0.62), [palette]);
  return (
    <group>
      {clumps.map((cl, i) => (
        <mesh key={i} position={cl.c} scale={cl.r * 0.9}>
          <icosahedronGeometry args={[1, 3]} />
          <meshStandardMaterial color={core} roughness={0.95} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[leafGeometry(), undefined, n]}>
        <meshStandardMaterial roughness={0.65} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

/* ---------- platform (shared by both blocks) ---------- */
export const P = 6.4;
export const PH = 0.55;

export function Platform({
  relief, reliefBump, tiles, tilesBump, plinth, cap,
}: {
  relief: THREE.Texture;
  reliefBump: THREE.Texture;
  tiles: THREE.Texture;
  tilesBump: THREE.Texture;
  plinth: string;
  cap: string;
}) {
  const side = P - 0.36;
  return (
    <group>
      <group position={[0, -PH, 0]}>
        <Block w={P} d={P} h={PH} radii={[0.2, 0.2, 0.2, 0.2]} bevel={0.04}>
          <Mat c={plinth} r={0.85} />
        </Block>
      </group>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <mesh position={[0, -PH / 2 - 0.02, P / 2 + 0.002]}>
            <planeGeometry args={[side, PH - 0.12]} />
            <meshStandardMaterial map={relief} bumpMap={reliefBump} bumpScale={1.2} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* coping stone around the top edge */}
      <group position={[0, -0.04, 0]}>
        <Block w={P + 0.04} d={P + 0.04} h={0.08} radii={[0.22, 0.22, 0.22, 0.22]} hole={0.2} bevel={0.02}>
          <Mat c={cap} r={0.7} bump={stucco()} bs={0.6} />
        </Block>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]} receiveShadow>
        <planeGeometry args={[P - 0.38, P - 0.38]} />
        <meshStandardMaterial map={tiles} bumpMap={tilesBump} bumpScale={1.4} roughness={0.62} />
      </mesh>
    </group>
  );
}

/* ---------- intro rise + shadow flags ---------- */
export function useReducedMotion() {
  return useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
}

export function Rise({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const root = useRef<THREE.Group>(null!);
  const reduce = useReducedMotion();
  const start = useRef<number | null>(null);

  useLayoutEffect(() => {
    root.current.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = !o.userData.noCast;
        o.receiveShadow = true;
      }
    });
  });

  useFrame((state) => {
    if (reduce) return;
    const g = root.current;
    if (start.current === null) start.current = state.clock.elapsedTime;
    const k = THREE.MathUtils.clamp((state.clock.elapsedTime - start.current - delay) / 1.7, 0, 1);
    const e = 1 - Math.pow(1 - k, 4);
    g.position.y = -1.2 * (1 - e);
    g.rotation.y = -0.5 * (1 - e);
    g.scale.setScalar(0.85 + 0.15 * e);
    g.visible = k > 0;
  });

  return <group ref={root}>{children}</group>;
}

/* ---------- shared street furniture ---------- */
export function Person({
  position, shirt, pants = "#2f3640", hair = "#2b211b", skin = "#d7a588", rotation = 0, bag,
}: {
  position: [number, number, number];
  shirt: string;
  pants?: string;
  hair?: string;
  skin?: string;
  rotation?: number;
  bag?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.034, 0.034].map((x, i) => (
        <group key={x} position={[x, 0, i ? 0.02 : -0.02]}>
          <mesh position={[0, 0.14, 0]}>
            <capsuleGeometry args={[0.026, 0.21, 4, 10]} />
            <Mat c={pants} r={0.8} />
          </mesh>
          <mesh position={[0, 0.018, 0.018]} scale={[1, 0.6, 1.5]}>
            <sphereGeometry args={[0.026, 10, 8]} />
            <Mat c="#1d1e20" r={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.41, 0]} scale={[1, 1, 0.75]}>
        <capsuleGeometry args={[0.068, 0.17, 6, 14]} />
        <Mat c={shirt} r={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.082, 0.39, 0]} rotation={[0, 0, s * 0.12]}>
          <capsuleGeometry args={[0.02, 0.2, 4, 8]} />
          <Mat c={shirt} r={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 0.535, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.04, 10]} />
        <Mat c={skin} r={0.6} />
      </mesh>
      <mesh position={[0, 0.61, 0]} scale={[1.18, 1.25, 1.18]}>
        <sphereGeometry args={[0.05, 20, 16]} />
        <Mat c={skin} r={0.55} />
      </mesh>
      <mesh position={[0, 0.635, -0.008]} scale={[1.25, 1.3, 1.28]}>
        <sphereGeometry args={[0.05, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.85]} />
        <Mat c={hair} r={0.75} />
      </mesh>
      {bag && (
        <mesh position={[0.1, 0.27, 0]}>
          <boxGeometry args={[0.03, 0.12, 0.1]} />
          <Mat c={bag} r={0.6} />
        </mesh>
      )}
    </group>
  );
}
