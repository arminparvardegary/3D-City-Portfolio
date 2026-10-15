import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { BRAND, contain, imgTex, round } from './brand';
import { Block, Foliage, Mat, Person, Platform, brushed, ctex, noise, rng, stucco } from './kit';

const A = {
  silver: '#c3c8cf',
  silverDark: '#a9afb7',
  wood: '#d6b487',
  woodDark: '#b8925f',
  warm: '#f7e3c0',
  glow: '#ffc77a',
  black: '#1e1f22',
  leaf: ['#3f7d2a', '#4c8f31', '#5aa23a', '#6ab544', '#447f2c'],
};

function T() {
  const font = "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial";
  return {
    relief: ctex(
      'ap-relief',
      1024,
      160,
      g => {
        const r = rng(19);
        g.fillStyle = '#7d838b';
        g.fillRect(0, 0, 1024, 160);
        for (let k = 0; k < 8; k++) {
          const x = k * 128;
          g.fillStyle = `hsl(215, 6%, ${66 + r() * 4}%)`;
          g.fillRect(x + 4, 6, 120, 148);
          g.strokeStyle = '#8a9098';
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
      'ap-relief-b',
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
    pavers: ctex(
      'ap-pavers',
      512,
      512,
      g => {
        const r = rng(23);
        g.fillStyle = '#b9b9bc';
        g.fillRect(0, 0, 512, 512);
        // running-bond pavers
        const pw = 128,
          ph = 64;
        for (let row = 0; row < 8; row++)
          for (let col = -1; col < 5; col++) {
            const x = col * pw + (row % 2 ? pw / 2 : 0);
            g.fillStyle = `hsl(35, 6%, ${83 + r() * 5}%)`;
            g.fillRect(x + 2, row * ph + 2, pw - 4, ph - 4);
            for (let k = 0; k < 60; k++) {
              g.fillStyle = `rgba(110,105,100,${r() * 0.07})`;
              g.fillRect(x + r() * pw, row * ph + r() * ph, 2, 2);
            }
          }
      },
      { repeat: [3, 3] },
    ),
    paversBump: ctex(
      'ap-pavers-b',
      512,
      512,
      g => {
        noise(g, 512, 512, 24, 200, 30, 2);
        g.fillStyle = 'rgb(40,40,40)';
        const pw = 128,
          ph = 64;
        for (let row = 0; row <= 8; row++) {
          g.fillRect(0, row * ph - 2, 512, 4);
          for (let col = -1; col < 5; col++)
            g.fillRect(col * pw + (row % 2 ? pw / 2 : 0) - 2, row * ph, 4, ph);
        }
      },
      { repeat: [3, 3], color: false },
    ),
    grass: ctex(
      'ap-grass',
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
        // mowing stripes
        for (let i = 0; i < 8; i++) {
          g.fillStyle = `rgba(255,255,220,${i % 2 ? 0.05 : 0})`;
          g.fillRect(i * 64, 0, 64, 512);
        }
      },
      { repeat: [2, 2] },
    ),
    grassBump: ctex('ap-grass-b', 256, 256, (g, w, h) => noise(g, w, h, 42, 128, 200, 1.6), {
      repeat: [4, 4],
      color: false,
    }),
    floor: ctex(
      'ap-floor',
      512,
      512,
      g => {
        const r = rng(51);
        for (let i = 0; i < 16; i++) {
          g.fillStyle = `hsl(33, ${30 + r() * 10}%, ${70 + r() * 8}%)`;
          g.fillRect(0, i * 32, 512, 32);
          g.fillStyle = 'rgba(120,80,40,.25)';
          g.fillRect(0, i * 32, 512, 1.5);
          g.fillRect((i * 197) % 512 | 0, i * 32, 1.5, 32);
          for (let k = 0; k < 30; k++) {
            g.fillStyle = `rgba(140,95,50,${r() * 0.12})`;
            g.fillRect(r() * 512, i * 32 + r() * 32, 30 + r() * 80, 1);
          }
        }
      },
      { repeat: [2, 2] },
    ),
    seams: ctex('ap-seams', 512, 512, g => {
      g.fillStyle = '#c6cbd2';
      g.fillRect(0, 0, 512, 512);
      const grd = g.createLinearGradient(0, 0, 512, 0);
      grd.addColorStop(0, 'rgba(255,255,255,.08)');
      grd.addColorStop(0.5, 'rgba(0,0,0,.03)');
      grd.addColorStop(1, 'rgba(255,255,255,.08)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 512);
      g.fillStyle = 'rgba(60,64,70,.55)';
      g.fillRect(0, 0, 3, 512);
      g.fillRect(509, 0, 3, 512);
      g.fillRect(0, 254, 512, 3);
    }),
    // Keel: the avatar as the store logo, the name, and the landing banner on the display wall.
    logo: imgTex('keel-logo', 256, 256, [BRAND.keel.logo!], (g, [im]) => {
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(128, 128, 124, 0, Math.PI * 2);
      g.fill();
      round(g, im, 128, 128, 116);
    }),
    text: ctex('keel-text', 512, 128, g => {
      g.fillStyle = '#fff';
      g.font = `700 76px ${font}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Keel.', 256, 66);
    }),
    screen: imgTex('keel-banner', 1600, 800, [BRAND.keel.banner!], (g, [pose]) => {
      const grd = g.createLinearGradient(0, 0, 0, 800);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(1, '#eaf0ff');
      g.fillStyle = grd;
      g.fillRect(0, 0, 1600, 800);
      g.fillStyle = '#1d1d1f';
      g.font = `700 190px ${font}`;
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left';
      g.fillText('Meet', 80, 260);
      g.fillStyle = BRAND.keel.color;
      g.fillText('Keel.', 80, 450);
      g.fillStyle = '#6e6e73';
      g.font = `500 58px ${font}`;
      g.fillText('The AI assistant', 84, 570);
      g.fillText('you text like a friend.', 84, 640);
      g.fillStyle = BRAND.keel.color;
      g.beginPath();
      g.roundRect(80, 680, 470, 96, 48);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `600 44px ${font}`;
      g.fillText('keeltwin.com', 150, 742);
      contain(g, pose, 820, 20, 760, 780);
    }),
    laptop: ctex('ap-laptop', 128, 80, g => {
      const grd = g.createLinearGradient(0, 0, 128, 80);
      grd.addColorStop(0, '#5aa7ff');
      grd.addColorStop(1, '#b36bff');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 80);
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.fillRect(0, 0, 128, 6);
    }),
    box: ctex('ap-box', 64, 96, g => {
      g.fillStyle = '#f6f6f4';
      g.fillRect(0, 0, 64, 96);
      g.fillStyle = '#2b2d33';
      g.beginPath();
      g.roundRect(18, 22, 28, 52, 6);
      g.fill();
    }),
  };
}
type Tex = ReturnType<typeof T>;

const AS = 3.5;
const AH = 1.95;

function Glass({ w, h }: { w: number; h: number }) {
  return (
    <mesh userData={{ noCast: true }}>
      <planeGeometry args={[w, h]} />
      <meshPhysicalMaterial
        color="#dfeaf1"
        transparent
        opacity={0.12}
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

function Label({ map, w, h, ei = 1.4 }: { map: THREE.Texture; w: number; h: number; ei?: number }) {
  return (
    <mesh userData={{ noCast: true }}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={map}
        transparent
        emissive="#ffffff"
        emissiveMap={map}
        emissiveIntensity={ei}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Panel({ args, t }: { args: [number, number, number]; t: Tex }) {
  return (
    <mesh>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color="#ffffff"
        map={t.seams}
        roughness={0.32}
        metalness={0.55}
        roughnessMap={brushed()}
      />
    </mesh>
  );
}

function Laptop({
  position,
  rotation = 0,
  t,
}: {
  position: [number, number, number];
  rotation?: number;
  t: Tex;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.004, 0]}>
        <boxGeometry args={[0.16, 0.008, 0.11]} />
        <Mat c="#c9ccd1" r={0.3} m={0.8} />
      </mesh>
      <group position={[0, 0.008, -0.055]} rotation={[-0.28, 0, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.16, 0.1, 0.005]} />
          <Mat c="#c9ccd1" r={0.3} m={0.8} />
        </mesh>
        <mesh position={[0, 0.05, 0.003]}>
          <planeGeometry args={[0.145, 0.088]} />
          <meshStandardMaterial
            map={t.laptop}
            emissive="#ffffff"
            emissiveMap={t.laptop}
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function Phone({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.03, 0]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.04, 0.075, 0.006]} />
        <Mat c="#202226" r={0.2} e="#6aa8ff" ei={0.5} />
      </mesh>
      <mesh position={[0, 0.01, -0.01]}>
        <boxGeometry args={[0.03, 0.02, 0.03]} />
        <Mat c="#d9dce0" r={0.3} m={0.6} />
      </mesh>
    </group>
  );
}

function Table({ position, len = 1.0, t }: { position: [number, number, number]; len?: number; t: Tex }) {
  const n = Math.round(len / 0.32);
  return (
    <group position={position}>
      <RoundedBox args={[len, 0.04, 0.4]} radius={0.012} smoothness={2} position={[0, 0.42, 0]}>
        <Mat c={A.wood} r={0.5} bump={stucco()} bs={0.15} />
      </RoundedBox>
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * (len - 0.14)) / 2, 0.2, 0]}>
          <boxGeometry args={[0.05, 0.4, 0.32]} />
          <Mat c={A.woodDark} r={0.55} />
        </mesh>
      ))}
      {Array.from({ length: n }, (_, i) => {
        const x = -len / 2 + (len / n) * (i + 0.5);
        return i % 2 ? (
          <Phone key={i} position={[x, 0.44, 0.05]} />
        ) : (
          <Laptop key={i} position={[x, 0.44, 0.04]} t={t} />
        );
      })}
    </group>
  );
}

function Shelf({
  position,
  rotation = 0,
  t,
}: {
  position: [number, number, number];
  rotation?: number;
  t: Tex;
}) {
  const items = useMemo(() => {
    const r = rng(Math.round(position[0] * 100 + position[2] * 10 + 3));
    return Array.from({ length: 15 }, (_, i) => ({
      x: -0.36 + (i % 5) * 0.18,
      y: 0.2 + Math.floor(i / 5) * 0.42,
      tint: ['#ffffff', '#f1f4f8', '#fdf3e6', '#e9f1ff'][Math.floor(r() * 4)],
    }));
  }, [position]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.0, 1.44, 0.24]} />
        <Mat c={A.wood} r={0.55} />
      </mesh>
      {[0.12, 0.54, 0.96].map(y => (
        <mesh key={y} position={[0, y + 0.18, 0.06]}>
          <boxGeometry args={[0.93, 0.34, 0.16]} />
          <meshStandardMaterial color={A.warm} emissive={A.glow} emissiveIntensity={0.55} />
        </mesh>
      ))}
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, it.y, 0.1]}>
          <boxGeometry args={[0.1, 0.15, 0.06]} />
          <meshStandardMaterial attach="material-0" color={it.tint} />
          <meshStandardMaterial attach="material-1" color={it.tint} />
          <meshStandardMaterial attach="material-2" color={it.tint} />
          <meshStandardMaterial attach="material-3" color={it.tint} />
          <meshStandardMaterial attach="material-4" map={t.box} />
          <meshStandardMaterial attach="material-5" color={it.tint} />
        </mesh>
      ))}
    </group>
  );
}

function IndoorTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.3, 0.24, 0.3]} />
        <Mat c={A.wood} r={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.8, 8]} />
        <Mat c="#6a4a33" r={0.9} />
      </mesh>
      <group position={[0, 1.15, 0]}>
        <Foliage
          count={140}
          radius={0.34}
          blob={0.07}
          seed={77 + Math.round(position[0] * 10)}
          palette={A.leaf}
        />
      </group>
    </group>
  );
}

function Store({ t }: { t: Tex }) {
  const h = AS / 2;
  return (
    <group position={[-0.25, 0.05, -0.35]}>
      {/* floor */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[AS - 0.08, 0.04, AS - 0.08]} />
        <meshStandardMaterial map={t.floor} roughness={0.45} />
      </mesh>
      {/* warm back walls (inside) */}
      <mesh position={[0, AH / 2, -h + 0.07]}>
        <boxGeometry args={[AS - 0.1, AH, 0.04]} />
        <meshStandardMaterial color={A.warm} emissive={A.glow} emissiveIntensity={0.28} roughness={0.9} />
      </mesh>
      <mesh position={[-h + 0.07, AH / 2, 0]}>
        <boxGeometry args={[0.04, AH, AS - 0.1]} />
        <meshStandardMaterial color={A.warm} emissive={A.glow} emissiveIntensity={0.28} roughness={0.9} />
      </mesh>
      {/* outer skin of the back walls */}
      <group position={[0, AH / 2, -h + 0.025]}>
        <Panel args={[AS, AH, 0.05]} t={t} />
      </group>
      <group position={[-h + 0.025, AH / 2, 0]}>
        <Panel args={[0.05, AH, AS]} t={t} />
      </group>

      {/* video wall + shelves */}
      {/* Keel's banner on the back wall, seen through the glass */}
      <mesh position={[0.2, 1.28, -h + 0.1]}>
        <planeGeometry args={[2.2, 1.1]} />
        <meshStandardMaterial
          map={t.screen}
          emissive="#ffffff"
          emissiveMap={t.screen}
          emissiveIntensity={0.55}
          toneMapped={false}
        />
      </mesh>
      <Shelf position={[-0.95, 0.04, -h + 0.22]} t={t} />
      <Shelf position={[-h + 0.22, 0.04, -0.4]} rotation={Math.PI / 2} t={t} />
      <Shelf position={[-h + 0.22, 0.04, 0.75]} rotation={Math.PI / 2} t={t} />

      {/* tables + trees + shoppers */}
      <Table position={[0.3, 0.04, -0.45]} len={1.3} t={t} />
      <Table position={[0.35, 0.04, 0.45]} len={1.3} t={t} />
      <Table position={[-0.6, 0.04, 1.1]} len={0.9} t={t} />
      <IndoorTree position={[-0.75, 0.04, -0.35]} />
      <IndoorTree position={[1.25, 0.04, 1.15]} />
      <Person position={[0.1, 0.04, 0.0]} shirt="#e9e4dc" rotation={0.2} />
      <Person position={[0.8, 0.04, -0.05]} shirt="#2f6fd1" rotation={-2.6} />
      <Person position={[-0.25, 0.04, 0.85]} shirt="#7b3b3b" rotation={2.8} hair="#8a5a2b" />

      {/* ceiling light strips (seen through glass) */}
      {[-1.0, -0.2, 0.6, 1.3].map(z => (
        <mesh
          key={z}
          position={[0, AH - 0.005, z]}
          rotation={[Math.PI / 2, 0, 0]}
          userData={{ noCast: true }}
        >
          <planeGeometry args={[AS - 0.3, 0.08]} />
          <meshStandardMaterial color="#fff" emissive="#fff3dc" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0.2, 1.6, 0.2]} intensity={4} distance={4.5} decay={1.5} color="#ffd39a" />
      <pointLight position={[-0.9, 1.6, 0.9]} intensity={2.5} distance={3.5} decay={1.5} color="#ffd39a" />

      {/* corner column + solid panels near the corner */}
      <group position={[h - 0.17, AH / 2, h - 0.17]}>
        <Panel args={[0.34, AH, 0.34]} t={t} />
      </group>
      <group position={[h - 0.78, AH / 2, h - 0.05]}>
        <Panel args={[0.9, AH, 0.1]} t={t} />
      </group>
      <group position={[h - 0.78, 1.05, h + 0.002]}>
        <Label map={t.text} w={0.8} h={0.2} />
      </group>
      <group position={[h - 0.05, AH / 2, h - 0.78]}>
        <Panel args={[0.1, AH, 0.9]} t={t} />
      </group>
      <group position={[h + 0.002, 1.32, h - 0.78]} rotation={[0, Math.PI / 2, 0]}>
        <Label map={t.logo} w={0.55} h={0.55} ei={2.2} />
      </group>

      {/* glass walls with mullions and rails */}
      <group position={[-0.5, AH / 2, h - 0.03]}>
        <Glass w={AS - 1.2} h={AH} />
      </group>
      <group position={[h - 0.03, AH / 2, -0.5]} rotation={[0, Math.PI / 2, 0]}>
        <Glass w={AS - 1.2} h={AH} />
      </group>
      {[-1.6, -0.5, 0.6].map(v => (
        <group key={v}>
          <mesh position={[v + 0.0, AH / 2, h - 0.03]}>
            <boxGeometry args={[0.03, AH, 0.05]} />
            <Mat c={A.silverDark} r={0.3} m={0.7} />
          </mesh>
          <mesh position={[h - 0.03, AH / 2, v]}>
            <boxGeometry args={[0.05, AH, 0.03]} />
            <Mat c={A.silverDark} r={0.3} m={0.7} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.5, 0.03, h - 0.03]}>
        <boxGeometry args={[AS - 1.2, 0.06, 0.06]} />
        <Mat c={A.silverDark} r={0.3} m={0.7} />
      </mesh>
      <mesh position={[h - 0.03, 0.03, -0.5]}>
        <boxGeometry args={[0.06, 0.06, AS - 1.2]} />
        <Mat c={A.silverDark} r={0.3} m={0.7} />
      </mesh>
      {/* glass door handles */}
      {[-0.95, -0.85].map(x => (
        <mesh key={x} position={[x, 0.75, h + 0.01]}>
          <boxGeometry args={[0.015, 0.5, 0.02]} />
          <Mat c="#dfe2e6" r={0.15} m={0.9} />
        </mesh>
      ))}

      {/* fascia + green roof */}
      <group position={[0, AH, 0]}>
        <Block w={AS + 0.1} d={AS + 0.1} h={0.42} radii={[0.06, 0.06, 0.06, 0.06]} bevel={0.02}>
          <meshStandardMaterial color={A.silver} roughness={0.3} metalness={0.55} roughnessMap={brushed()} />
        </Block>
        <group position={[0, 0.42, 0]}>
          <Block w={AS + 0.1} d={AS + 0.1} h={0.1} radii={[0.06, 0.06, 0.06, 0.06]} hole={0.1} bevel={0.02}>
            <Mat c={A.silverDark} r={0.3} m={0.6} />
          </Block>
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.425, 0]}>
          <planeGeometry args={[AS - 0.1, AS - 0.1]} />
          <meshStandardMaterial map={t.grass} bumpMap={t.grassBump} bumpScale={2} roughness={1} />
        </mesh>
        <group position={[h + 0.052, 0.21, -0.5]} rotation={[0, Math.PI / 2, 0]}>
          <Label map={t.text} w={1.0} h={0.25} />
        </group>
        {/* skylight */}
        <group position={[-0.3, 0.43, -0.7]}>
          <RoundedBox args={[1.15, 0.2, 0.85]} radius={0.04} smoothness={3} position={[0, 0.1, 0]}>
            <Mat c="#e7ebee" r={0.35} m={0.2} />
          </RoundedBox>
          <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.95, 0.65]} />
            <meshPhysicalMaterial color="#9fb6c6" roughness={0.03} clearcoat={1} envMapIntensity={1.6} />
          </mesh>
        </group>
        {/* hedge planters along two edges + pots */}
        {[
          { p: [0.55, 0.43, 1.5], s: [1.6, 0.18, 0.28] },
          { p: [1.5, 0.43, 0.25], s: [0.28, 0.18, 1.8] },
        ].map((hp, i) => (
          <group key={i} position={hp.p as [number, number, number]}>
            <mesh position={[0, 0.09, 0]}>
              <boxGeometry args={hp.s as [number, number, number]} />
              <Mat c="#b2b7be" r={0.5} m={0.3} />
            </mesh>
            <mesh position={[0, 0.25, 0]} scale={[hp.s[0] * 0.48, 0.13, hp.s[2] * 0.48]}>
              <sphereGeometry args={[1, 20, 12]} />
              <Mat c="#3f7f2b" r={0.95} bump={stucco()} bs={3} />
            </mesh>
          </group>
        ))}
        {[
          [-1.4, -1.4],
          [-1.45, 0.3],
          [-1.2, 1.4],
          [1.3, -1.4],
          [0.5, -1.45],
          [0.35, 0.2],
          [-0.6, 0.55],
        ].map(([x, z], i) => (
          <Shrub key={i} position={[x, 0.43, z]} s={0.8} seed={60 + i} pot="#b8bcc2" />
        ))}
      </group>
    </group>
  );
}

function ModernLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.1, 24]} />
        <Mat c={A.black} r={0.45} m={0.4} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.028, 0.04, 1.9, 16]} />
        <Mat c={A.black} r={0.35} m={0.5} />
      </mesh>
      <mesh position={[0, 1.99, 0]}>
        <cylinderGeometry args={[0.075, 0.1, 0.17, 8]} />
        <meshStandardMaterial color="#fff1cf" emissive={A.glow} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3].map(i => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 2 + 0.4) * 0.09,
            1.99,
            Math.sin((i * Math.PI) / 2 + 0.4) * 0.09,
          ]}
        >
          <boxGeometry args={[0.012, 0.18, 0.012]} />
          <Mat c={A.black} r={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 2.11, 0]}>
        <coneGeometry args={[0.15, 0.1, 8]} />
        <Mat c={A.black} r={0.35} m={0.5} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.09, -0.03, 0.03, 0.09].map(z => (
        <mesh key={z} position={[0, 0.22, z]}>
          <boxGeometry args={[0.85, 0.03, 0.05]} />
          <Mat c={A.wood} r={0.6} />
        </mesh>
      ))}
      {[0.3, 0.37].map(y => (
        <mesh key={y} position={[0, y, -0.13]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.85, 0.05, 0.025]} />
          <Mat c={A.wood} r={0.6} />
        </mesh>
      ))}
      {[-0.34, 0.34].map(x => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.04, 0.2, 0.24]} />
            <Mat c={A.black} r={0.5} m={0.4} />
          </mesh>
          <mesh position={[0, 0.3, -0.12]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.04, 0.22, 0.03]} />
            <Mat c={A.black} r={0.5} m={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Shrub({
  position,
  s = 1,
  seed = 1,
  pot = '#9aa0a8',
}: {
  position: [number, number, number];
  s?: number;
  seed?: number;
  pot?: string;
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
        <Foliage count={60} radius={0.16} blob={0.05} seed={seed} palette={A.leaf} />
      </group>
    </group>
  );
}

function Bollard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.34, 20]} />
        <Mat c="#3a3d42" r={0.35} m={0.6} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat c="#3a3d42" r={0.35} m={0.6} />
      </mesh>
    </group>
  );
}

export default function AppleBlock() {
  const t = T();
  return (
    <group>
      <Platform
        relief={t.relief}
        reliefBump={t.reliefBump}
        tiles={t.pavers}
        tilesBump={t.paversBump}
        plinth="#a7acb3"
        cap="#d8d8da"
      />
      <Store t={t} />
      <group position={[0, 0.045, 0]}>
        <ModernLamp position={[-2.8, 0, 2.8]} />
        <ModernLamp position={[2.8, 0, -2.8]} />
        <ModernLamp position={[2.8, 0, 2.6]} />
        <Bench position={[0.4, 0, 2.6]} />
        <Bench position={[2.6, 0, 0.3]} rotation={-Math.PI / 2} />
        <Shrub position={[-1.8, 0, 1.75]} seed={3} />
        <Shrub position={[1.3, 0, 1.8]} seed={4} />
        <Shrub position={[1.8, 0, 1.3]} seed={5} />
        <Shrub position={[1.8, 0, -1.95]} seed={6} />
        {[-2.6, -1.9, -1.2].map(x => (
          <Bollard key={x} position={[x, 0, 2.9]} />
        ))}
        <mesh position={[2.15, 0.18, 1.95]}>
          <cylinderGeometry args={[0.11, 0.1, 0.36, 20]} />
          <Mat c="#3a3d42" r={0.4} m={0.5} />
        </mesh>
        <Person position={[-1.0, 0, 2.3]} shirt="#e8e4dc" rotation={0.4} bag="#f2f2f2" />
        <Person position={[-0.7, 0, 2.5]} shirt="#7a2f2f" rotation={-0.3} hair="#5a3a22" />
        <Person position={[0.2, 0, 2.95]} shirt="#2f3a4a" rotation={2.6} />
        <Person position={[1.0, 0, 2.25]} shirt="#5a6b52" rotation={-1} hair="#c9a46a" />
        <Person position={[2.3, 0, 1.4]} shirt="#c26a3b" rotation={1.2} />
        <Person position={[2.5, 0, -0.9]} shirt="#ececec" rotation={-2} bag="#1d1d1f" />
        <Person position={[2.2, 0, -1.5]} shirt="#3b3f47" rotation={0.8} />
        <Person position={[-2.6, 0, 0.9]} shirt="#8a7c6b" rotation={1.5} />
      </group>
    </group>
  );
}
