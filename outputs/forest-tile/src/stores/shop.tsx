import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { Foliage, Mat, Platform, ctex, noise, rng } from './kit';

/* Shared parts for the store blocks: glass, signs, furniture, lamps, paving. */

export const LEAF = ['#3f7d2a', '#4c8f31', '#5aa23a', '#6ab544', '#447f2c', '#78bf4a'];
export const PINE = ['#2f5f2a', '#356b2e', '#3e7a34', '#2b5426'];
export const FONT = "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial";
export const WARM = '#f7e3c0';
export const GLOW = '#ffc77a';

/* ---------- surfaces ---------- */
function relief(key: string, base: string, face: string, line: string) {
  return {
    relief: ctex(
      `${key}-relief`,
      1024,
      160,
      g => {
        g.fillStyle = base;
        g.fillRect(0, 0, 1024, 160);
        for (let k = 0; k < 8; k++) {
          const x = k * 128;
          g.fillStyle = face;
          g.fillRect(x + 4, 6, 120, 148);
          g.strokeStyle = line;
          g.lineWidth = 8;
          g.beginPath();
          g.moveTo(x + 22, 134);
          g.lineTo(x + 22, 26);
          g.lineTo(x + 106, 26);
          g.lineTo(x + 106, 112);
          g.lineTo(x + 46, 112);
          g.lineTo(x + 46, 52);
          g.lineTo(x + 82, 52);
          g.lineTo(x + 82, 86);
          g.stroke();
        }
      },
      { repeat: [3, 1] },
    ),
    reliefBump: ctex(
      'shared-relief-b',
      1024,
      160,
      g => {
        g.fillStyle = '#202020';
        g.fillRect(0, 0, 1024, 160);
        for (let k = 0; k < 8; k++) {
          const x = k * 128;
          g.fillStyle = '#b0b0b0';
          g.fillRect(x + 4, 6, 120, 148);
          g.strokeStyle = '#555';
          g.lineWidth = 8;
          g.beginPath();
          g.moveTo(x + 22, 134);
          g.lineTo(x + 22, 26);
          g.lineTo(x + 106, 26);
          g.lineTo(x + 106, 112);
          g.lineTo(x + 46, 112);
          g.lineTo(x + 46, 52);
          g.lineTo(x + 82, 52);
          g.lineTo(x + 82, 86);
          g.stroke();
        }
      },
      { repeat: [3, 1], color: false },
    ),
  };
}

/** Rounded cobblestones (Starbucks, Nike). */
function cobble(key: string, hue: number, sat: number, light: number) {
  const draw = (bump: boolean) => (g: CanvasRenderingContext2D) => {
    const r = rng(hue * 7 + light);
    g.fillStyle = bump ? '#111' : `hsl(${hue}, ${sat}%, ${light - 22}%)`;
    g.fillRect(0, 0, 512, 512);
    const s = 32;
    for (let row = 0; row < 16; row++)
      for (let col = -1; col < 17; col++) {
        const x = col * s + (row % 2 ? s / 2 : 0) + (r() - 0.5) * 3;
        const y = row * s + (r() - 0.5) * 3;
        if (bump) {
          const grd = g.createRadialGradient(x + s / 2, y + s / 2, 2, x + s / 2, y + s / 2, s * 0.62);
          grd.addColorStop(0, '#fff');
          grd.addColorStop(1, '#444');
          g.fillStyle = grd;
        } else g.fillStyle = `hsl(${hue + (r() - 0.5) * 8}, ${sat}%, ${light + (r() - 0.5) * 10}%)`;
        g.beginPath();
        g.roundRect(x + 2, y + 2, s - 4, s - 4, 8);
        g.fill();
      }
  };
  return {
    tiles: ctex(`${key}-cobble`, 512, 512, draw(false), { repeat: [3, 3] }),
    tilesBump: ctex(`${key}-cobble-b`, 512, 512, draw(true), { repeat: [3, 3], color: false }),
  };
}

/** Large square slabs (McDonald's, Google). */
function slabs(key: string, hue: number, sat: number, light: number) {
  const n = 4,
    s = 128;
  return {
    tiles: ctex(
      `${key}-slab`,
      512,
      512,
      g => {
        const r = rng(hue + light);
        g.fillStyle = `hsl(${hue}, ${sat}%, ${light - 12}%)`;
        g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            g.fillStyle = `hsl(${hue}, ${sat}%, ${light + (r() - 0.5) * 5}%)`;
            g.fillRect(i * s + 2.5, j * s + 2.5, s - 5, s - 5);
            for (let k = 0; k < 120; k++) {
              g.fillStyle = `rgba(90,90,95,${r() * 0.07})`;
              g.fillRect(i * s + r() * s, j * s + r() * s, 2, 2);
            }
          }
      },
      { repeat: [3, 3] },
    ),
    tilesBump: ctex(
      `${key}-slab-b`,
      512,
      512,
      g => {
        noise(g, 512, 512, 3, 200, 30, 2);
        g.fillStyle = 'rgb(40,40,40)';
        for (let i = 0; i <= n; i++) {
          g.fillRect(i * s - 2.5, 0, 5, 512);
          g.fillRect(0, i * s - 2.5, 512, 5);
        }
      },
      { repeat: [3, 3], color: false },
    ),
  };
}

export function Base({ kind }: { kind: 'mcd' | 'sbux' | 'nike' | 'google' }) {
  const t = useMemo(() => {
    switch (kind) {
      case 'mcd':
        return {
          ...slabs('mcd', 30, 6, 84),
          ...relief('mcd', '#7f848b', '#a7acb3', '#8a9098'),
          plinth: '#a7acb3',
          cap: '#d8d8da',
        };
      case 'sbux':
        return {
          ...cobble('sbux', 30, 8, 72),
          ...relief('sbux', '#6f5a48', '#9b8371', '#7f6a58'),
          plinth: '#9b8371',
          cap: '#cfc6bb',
        };
      case 'nike':
        return {
          ...cobble('nike', 220, 4, 62),
          ...relief('nike', '#55585d', '#7c8087', '#64686e'),
          plinth: '#7c8087',
          cap: '#c9cacd',
        };
      default:
        return {
          ...slabs('google', 210, 4, 86),
          ...relief('google', '#7f848b', '#a9aeb5', '#8a9098'),
          plinth: '#a9aeb5',
          cap: '#dcdcde',
        };
    }
  }, [kind]);
  return (
    <Platform
      relief={t.relief}
      reliefBump={t.reliefBump}
      tiles={t.tiles}
      tilesBump={t.tilesBump}
      plinth={t.plinth}
      cap={t.cap}
    />
  );
}

export const woodFloor = () =>
  ctex(
    'shop-floor',
    512,
    512,
    g => {
      const r = rng(51);
      for (let i = 0; i < 16; i++) {
        g.fillStyle = `hsl(32, ${32 + r() * 10}%, ${62 + r() * 10}%)`;
        g.fillRect(0, i * 32, 512, 32);
        g.fillStyle = 'rgba(110,70,35,.3)';
        g.fillRect(0, i * 32, 512, 1.5);
        g.fillRect((i * 197) % 512 | 0, i * 32, 1.5, 32);
        for (let k = 0; k < 30; k++) {
          g.fillStyle = `rgba(120,80,40,${r() * 0.12})`;
          g.fillRect(r() * 512, i * 32 + r() * 32, 30 + r() * 80, 1);
        }
      }
    },
    { repeat: [2, 2] },
  );

export const brick = () =>
  ctex(
    'shop-brick',
    512,
    512,
    g => {
      const r = rng(61);
      g.fillStyle = '#c9b9a6';
      g.fillRect(0, 0, 512, 512);
      const bw = 64,
        bh = 24;
      for (let row = 0; row < 22; row++)
        for (let col = -1; col < 9; col++) {
          const x = col * bw + (row % 2 ? bw / 2 : 0);
          g.fillStyle = `hsl(${10 + r() * 10}, ${42 + r() * 14}%, ${30 + r() * 12}%)`;
          g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
        }
    },
    { repeat: [3, 3] },
  );

export const brickBump = () =>
  ctex(
    'shop-brick-b',
    512,
    512,
    g => {
      g.fillStyle = '#222';
      g.fillRect(0, 0, 512, 512);
      const bw = 64,
        bh = 24;
      for (let row = 0; row < 22; row++)
        for (let col = -1; col < 9; col++) {
          g.fillStyle = '#bbb';
          g.fillRect(col * bw + (row % 2 ? bw / 2 : 0) + 2, row * bh + 2, bw - 4, bh - 4);
        }
    },
    { repeat: [3, 3], color: false },
  );

export const slats = () =>
  ctex(
    'shop-slats',
    256,
    256,
    g => {
      const r = rng(71);
      for (let i = 0; i < 16; i++) {
        g.fillStyle = `hsl(${24 + r() * 6}, ${45 + r() * 10}%, ${34 + r() * 10}%)`;
        g.fillRect(0, i * 16, 256, 16);
        g.fillStyle = 'rgba(30,15,5,.55)';
        g.fillRect(0, i * 16 + 14, 256, 2);
        for (let k = 0; k < 12; k++) {
          g.fillStyle = `rgba(60,30,10,${r() * 0.2})`;
          g.fillRect(r() * 256, i * 16 + r() * 14, 20 + r() * 50, 1);
        }
      }
    },
    { repeat: [3, 2] },
  );

export const grassTop = () =>
  ctex(
    'shop-grass',
    512,
    512,
    g => {
      const r = rng(41);
      g.fillStyle = '#4a8a2c';
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 26000; i++) {
        g.fillStyle = `hsl(${88 + r() * 22}, ${42 + r() * 22}%, ${22 + r() * 24}%)`;
        g.fillRect(r() * 512, r() * 512, 1.3, 2.5 + r() * 2);
      }
    },
    { repeat: [2, 2] },
  );

export const grassBump = () =>
  ctex('shop-grass-b', 256, 256, (g, w, h) => noise(g, w, h, 42, 128, 200, 1.6), {
    repeat: [4, 4],
    color: false,
  });

/** Text sign texture. */
export function signTex(
  key: string,
  text: string,
  opts: { bg?: string; fg: string; w?: number; h?: number; size?: number; weight?: number; family?: string },
) {
  const w = opts.w ?? 512,
    h = opts.h ?? 128;
  return ctex(key, w, h, g => {
    if (opts.bg) {
      g.fillStyle = opts.bg;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = opts.fg;
    g.font = `${opts.weight ?? 700} ${opts.size ?? 70}px ${opts.family ?? FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

/* ---------- glass + signs ---------- */
export function Glass({ w, h, tint = '#dfeaf1' }: { w: number; h: number; tint?: string }) {
  return (
    <mesh userData={{ noCast: true }}>
      <planeGeometry args={[w, h]} />
      <meshPhysicalMaterial
        color={tint}
        transparent
        opacity={0.13}
        roughness={0.02}
        clearcoat={1}
        clearcoatRoughness={0.02}
        envMapIntensity={1.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export function Label({
  map,
  w,
  h,
  ei = 1.2,
  lit = true,
}: {
  map: THREE.Texture;
  w: number;
  h: number;
  ei?: number;
  lit?: boolean;
}) {
  return (
    <mesh userData={{ noCast: true }}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={map}
        transparent
        emissive="#ffffff"
        emissiveMap={lit ? map : null}
        emissiveIntensity={lit ? ei : 0}
        depthWrite={false}
        toneMapped={!lit}
      />
    </mesh>
  );
}

/** A box sign: colored body with a printed (optionally lit) face on +z. */
export function SignBox({
  w,
  h,
  d = 0.06,
  color,
  map,
  ei = 0.6,
}: {
  w: number;
  h: number;
  d?: number;
  color: string;
  map: THREE.Texture;
  ei?: number;
}) {
  return (
    <mesh>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial attach="material-0" color={color} />
      <meshStandardMaterial attach="material-1" color={color} />
      <meshStandardMaterial attach="material-2" color={color} />
      <meshStandardMaterial attach="material-3" color={color} />
      <meshStandardMaterial
        attach="material-4"
        map={map}
        roughness={0.45}
        emissive="#ffffff"
        emissiveMap={map}
        emissiveIntensity={ei}
      />
      <meshStandardMaterial attach="material-5" color={color} />
    </mesh>
  );
}

/** Glazed wall with evenly spaced mullions and top/bottom rails, centred on its own origin, facing +z. */
export function Curtain({
  w,
  h,
  bays,
  frame,
  depth = 0.06,
  bar = 0.04,
  tint,
}: {
  w: number;
  h: number;
  bays: number;
  frame: string;
  depth?: number;
  bar?: number;
  tint?: string;
}) {
  return (
    <group>
      <Glass w={w} h={h} tint={tint} />
      {Array.from({ length: bays + 1 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (w / bays) * i, 0, 0]}>
          <boxGeometry args={[bar, h, depth]} />
          <Mat c={frame} r={0.35} m={0.5} />
        </mesh>
      ))}
      {[-1, 1].map(s => (
        <mesh key={s} position={[0, (s * h) / 2, 0]}>
          <boxGeometry args={[w + bar, bar * 1.4, depth]} />
          <Mat c={frame} r={0.35} m={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- interior ---------- */
export function Chair({
  position,
  rotation = 0,
  color,
}: {
  position: [number, number, number];
  rotation?: number;
  color: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.16, 0.025, 0.16]} />
        <Mat c={color} r={0.5} />
      </mesh>
      <mesh position={[0, 0.3, -0.075]}>
        <boxGeometry args={[0.16, 0.18, 0.02]} />
        <Mat c={color} r={0.5} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.065, 0.1, z * 0.065]}>
          <cylinderGeometry args={[0.008, 0.008, 0.2, 6]} />
          <Mat c="#2a2c30" r={0.4} m={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function CafeTable({
  position,
  chair = '#2b2d31',
  top = '#d9c3a0',
  round = true,
}: {
  position: [number, number, number];
  chair?: string;
  top?: string;
  round?: boolean;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.34, 0]}>
        {round ? (
          <cylinderGeometry args={[0.16, 0.16, 0.025, 28]} />
        ) : (
          <boxGeometry args={[0.34, 0.025, 0.34]} />
        )}
        <Mat c={top} r={0.45} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.34, 8]} />
        <Mat c="#2a2c30" r={0.4} m={0.6} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.02, 20]} />
        <Mat c="#2a2c30" r={0.4} m={0.6} />
      </mesh>
      <mesh position={[0.04, 0.38, 0.02]}>
        <cylinderGeometry args={[0.022, 0.018, 0.06, 14]} />
        <Mat c="#f4f1ea" r={0.4} />
      </mesh>
      <Chair position={[0, 0, 0.24]} rotation={Math.PI} color={chair} />
      <Chair position={[0, 0, -0.24]} color={chair} />
    </group>
  );
}

export function Counter({
  position,
  w,
  color,
  top = '#e9e6df',
  rotation = 0,
}: {
  position: [number, number, number];
  w: number;
  color: string;
  top?: string;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[w, 0.5, 0.3]} />
        <Mat c={color} r={0.5} />
      </mesh>
      <RoundedBox args={[w + 0.04, 0.03, 0.34]} radius={0.01} smoothness={2} position={[0, 0.515, 0]}>
        <Mat c={top} r={0.3} />
      </RoundedBox>
    </group>
  );
}

/** Warm lit shelving with product boxes; colours picked from a palette. */
export function ProductShelf({
  position,
  rotation = 0,
  w = 1,
  h = 1.4,
  palette,
  seed = 1,
  wood = '#c9a274',
  glow = true,
}: {
  position: [number, number, number];
  rotation?: number;
  w?: number;
  h?: number;
  palette: string[];
  seed?: number;
  wood?: string;
  glow?: boolean;
}) {
  const rows = Math.max(2, Math.round(h / 0.38));
  const cols = Math.max(3, Math.round(w / 0.17));
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: rows * cols }, (_, i) => ({
      x: -w / 2 + (w / cols) * ((i % cols) + 0.5),
      y: 0.12 + Math.floor(i / cols) * (h / rows),
      c: palette[Math.floor(r() * palette.length)],
      hgt: 0.08 + r() * 0.08,
    }));
  }, [rows, cols, w, h, palette, seed]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, h / 2, -0.02]}>
        <boxGeometry args={[w + 0.06, h, 0.2]} />
        <Mat c={wood} r={0.6} />
      </mesh>
      {Array.from({ length: rows }, (_, i) => (
        <mesh key={i} position={[0, 0.1 + i * (h / rows), 0.06]}>
          <boxGeometry args={[w, 0.02, 0.18]} />
          <meshStandardMaterial color={WARM} emissive={GLOW} emissiveIntensity={glow ? 0.9 : 0} />
        </mesh>
      ))}
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, it.y + it.hgt / 2, 0.07]}>
          <boxGeometry args={[(w / cols) * 0.7, it.hgt, 0.1]} />
          <Mat c={it.c} r={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function ClothesRack({
  position,
  rotation = 0,
  palette,
  seed = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  palette: string[];
  seed?: number;
}) {
  const shirts = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 9 }, (_, i) => ({
      x: -0.32 + i * 0.08,
      c: palette[Math.floor(r() * palette.length)],
    }));
  }, [palette, seed]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.8, 8]} />
        <Mat c="#2a2c30" r={0.3} m={0.8} />
      </mesh>
      {[-0.4, 0.4].map(x => (
        <mesh key={x} position={[x, 0.31, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.62, 8]} />
          <Mat c="#2a2c30" r={0.3} m={0.8} />
        </mesh>
      ))}
      {shirts.map((s, i) => (
        <mesh key={i} position={[s.x, 0.46, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.2, 0.3, 0.02]} />
          <Mat c={s.c} r={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function Pendant({
  position,
  color = '#1c1d20',
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.3, 4]} />
        <Mat c="#111" r={0.5} />
      </mesh>
      <mesh>
        <coneGeometry args={[0.07, 0.07, 20, 1, true]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <sphereGeometry args={[0.025, 12, 8]} />
        <meshStandardMaterial color="#fff" emissive="#ffd89a" emissiveIntensity={4} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------- street furniture ---------- */
export function Bench({
  position,
  rotation = 0,
  wood = '#b98a58',
}: {
  position: [number, number, number];
  rotation?: number;
  wood?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.09, -0.03, 0.03, 0.09].map(z => (
        <mesh key={z} position={[0, 0.22, z]}>
          <boxGeometry args={[0.85, 0.03, 0.05]} />
          <Mat c={wood} r={0.6} />
        </mesh>
      ))}
      {[0.3, 0.37].map(y => (
        <mesh key={y} position={[0, y, -0.13]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.85, 0.05, 0.025]} />
          <Mat c={wood} r={0.6} />
        </mesh>
      ))}
      {[-0.34, 0.34].map(x => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.04, 0.2, 0.24]} />
            <Mat c="#1e1f22" r={0.5} m={0.4} />
          </mesh>
          <mesh position={[0, 0.3, -0.12]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.04, 0.22, 0.03]} />
            <Mat c="#1e1f22" r={0.5} m={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Shrub({
  position,
  s = 1,
  seed = 1,
  pot = '#9aa0a8',
  palette = LEAF,
}: {
  position: [number, number, number];
  s?: number;
  seed?: number;
  pot?: string;
  palette?: string[];
}) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.24, 24]} />
        <Mat c={pot} r={0.55} m={0.15} />
      </mesh>
      <mesh position={[0, 0.235, 0]}>
        <cylinderGeometry args={[0.135, 0.135, 0.02, 24]} />
        <Mat c={pot} r={0.55} m={0.15} />
      </mesh>
      <group position={[0, 0.36, 0]}>
        <Foliage count={60} radius={0.16} blob={0.05} seed={seed} palette={palette} />
      </group>
    </group>
  );
}

/** Conical topiary / small conifer in a pot (Starbucks). */
export function Topiary({
  position,
  h = 0.6,
  pot = '#c9733f',
  seed = 1,
}: {
  position: [number, number, number];
  h?: number;
  pot?: string | null;
  seed?: number;
}) {
  const tiers = useMemo(() => {
    const r = rng(seed);
    return [0, 1, 2, 3].map(i => ({ y: 0.12 + i * h * 0.2, r: h * (0.3 - i * 0.065), j: r() }));
  }, [h, seed]);
  return (
    <group position={position}>
      {pot && (
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.12, 0.09, 0.2, 24]} />
          <Mat c={pot} r={0.7} />
        </mesh>
      )}
      {tiers.map((t, i) => (
        <mesh key={i} position={[0, (pot ? 0.2 : 0) + t.y + h * 0.15, 0]} rotation={[0, t.j * 3, 0]}>
          <coneGeometry args={[t.r, h * 0.42, 9]} />
          <Mat c={PINE[i % PINE.length]} r={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function Planter({
  position,
  w,
  d = 0.3,
  color = '#7a5a42',
  rotation = 0,
  seed = 1,
}: {
  position: [number, number, number];
  w: number;
  d?: number;
  color?: string;
  rotation?: number;
  seed?: number;
}) {
  const bushes = Math.max(2, Math.round(w / 0.28));
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={[w, 0.2, d]} radius={0.02} smoothness={2} position={[0, 0.1, 0]}>
        <Mat c={color} r={0.7} />
      </RoundedBox>
      {Array.from({ length: bushes }, (_, i) => (
        <group key={i} position={[-w / 2 + (w / bushes) * (i + 0.5), 0.27, 0]}>
          <Foliage count={30} radius={0.13} blob={0.05} seed={seed * 13 + i} palette={LEAF} squash={0.8} />
        </group>
      ))}
    </group>
  );
}

export function LanternLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 0.12, 20]} />
        <Mat c="#1b1c1f" r={0.4} m={0.4} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.03, 0.045, 1.7, 14]} />
        <Mat c="#1b1c1f" r={0.35} m={0.4} />
      </mesh>
      <mesh position={[0, 1.82, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.06, 8]} />
        <Mat c="#1b1c1f" r={0.35} m={0.4} />
      </mesh>
      <mesh position={[0, 1.96, 0]}>
        <cylinderGeometry args={[0.085, 0.06, 0.22, 4]} />
        <meshStandardMaterial color="#fff1cf" emissive={GLOW} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.12, 0]}>
        <coneGeometry args={[0.12, 0.12, 4]} />
        <Mat c="#1b1c1f" r={0.35} m={0.4} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.02, 8, 6]} />
        <Mat c="#1b1c1f" r={0.35} m={0.4} />
      </mesh>
    </group>
  );
}

export function Bollard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.34, 20]} />
        <Mat c="#2e3135" r={0.35} m={0.6} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat c="#2e3135" r={0.35} m={0.6} />
      </mesh>
    </group>
  );
}

export function Bin({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.11, 0.1, 0.36, 20]} />
        <Mat c="#3a3d42" r={0.4} m={0.5} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 20]} />
        <Mat c="#2a2c30" r={0.4} m={0.5} />
      </mesh>
    </group>
  );
}
