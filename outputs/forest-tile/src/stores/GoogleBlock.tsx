"use client";

import { RoundedBox } from "@react-three/drei";
import { Block, Mat, Person, ctex, stucco } from "./kit";
import { Base, Bench, Bollard, Curtain, FONT, GLOW, Label, Planter, ProductShelf, WARM } from "./shop";

const GG = {
  blue: "#2a9a8d",      // AAQ teal (was Google blue)
  blueDark: "#1f6f66",
  white: "#f6f5f1",
  trim: "#e9e7e1",
  colors: ["#3fb8a8", "#3fb8a8", "#1f6f66"],   // AAQ
};
const PRODUCTS = ["#f4f4f2", "#202124", "#a8c7fa", "#f6c3c0", "#c4eed0", "#fde293", "#e8eaed"];

function T() {
  return {
    logo: ctex("aaq-logo", 1024, 320, (g) => {
      g.font = `800 200px ${FONT}`;
      g.textBaseline = "middle";
      const letters = [..."AAQ"];
      const widths = letters.map((l) => g.measureText(l).width);
      let x = (1024 - widths.reduce((a, b) => a + b, 0)) / 2;
      letters.forEach((l, i) => {
        // soft drop shadow so the letters read as raised
        g.fillStyle = "rgba(0,0,0,.18)";
        g.fillText(l, x + 6, 172);
        g.fillStyle = GG.colors[i];
        g.fillText(l, x, 166);
        x += widths[i];
      });
      g.font = `600 64px ${FONT}`;
      g.textAlign = "center";
      g.fillStyle = GG.colors[2];
      g.fillText("REAL ESTATE", 512, 290);
    }),
    small: ctex("aaq-small", 512, 128, (g) => {
      g.font = `800 84px ${FONT}`;
      g.textBaseline = "middle";
      g.textAlign = "left";
      const letters = [..."AAQ"];
      const widths = letters.map((l) => g.measureText(l).width);
      let x = (512 - widths.reduce((a, b) => a + b, 0)) / 2;
      letters.forEach((l, i) => {
        g.fillStyle = GG.colors[i];
        g.fillText(l, x, 68);
        x += widths[i];
      });
    }),
  };
}
type Tex = ReturnType<typeof T>;

const S = 3.6;
const G = 1.5;
const BAND = 0.16;
const U = 1.25;
const TOP = G + BAND + U;

function Window({ w, h }: { w: number; h: number }) {
  return (
    <group>
      <RoundedBox args={[w + 0.12, h + 0.12, 0.08]} radius={0.015} smoothness={2}>
        <Mat c={GG.blue} r={0.4} />
      </RoundedBox>
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial color="#9cc3e8" emissive="#ffe2b0" emissiveIntensity={0.15} roughness={0.04} clearcoat={1} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.035, h, 0.02]} />
        <Mat c={GG.blue} r={0.4} />
      </mesh>
      <mesh position={[0, h * 0.2, 0.05]}>
        <boxGeometry args={[w, 0.035, 0.02]} />
        <Mat c={GG.blue} r={0.4} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.08, 0.06]}>
        <boxGeometry args={[w + 0.2, 0.04, 0.12]} />
        <Mat c={GG.trim} r={0.6} />
      </mesh>
    </group>
  );
}

function Boxes({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[[0, 0.1, 0, 0.3], [0.32, 0.1, 0.04, 0.3], [0.12, 0.3, 0.02, 0.26], [0.02, 0.48, 0.0, 0.2]].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i * 0.2, 0]}>
          <boxGeometry args={[s, s * 0.66, s * 0.8]} />
          <Mat c={i % 2 ? "#c79a62" : "#b98a52"} r={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Store({ t }: { t: Tex }) {
  const h = S / 2;
  const plaster = stucco();
  return (
    <group position={[-0.25, 0.05, -0.35]}>
      {/* interior */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[S - 0.1, 0.04, S - 0.1]} />
        <Mat c="#eceae5" r={0.35} />
      </mesh>
      <mesh position={[0, G / 2, -h + 0.12]}>
        <boxGeometry args={[S - 0.2, G, 0.04]} />
        <meshStandardMaterial color={WARM} emissive={GLOW} emissiveIntensity={0.25} roughness={0.9} />
      </mesh>
      <mesh position={[-h + 0.12, G / 2, 0]}>
        <boxGeometry args={[0.04, G, S - 0.2]} />
        <meshStandardMaterial color={WARM} emissive={GLOW} emissiveIntensity={0.25} roughness={0.9} />
      </mesh>
      <ProductShelf position={[-0.3, 0.04, -h + 0.28]} w={1.8} h={1.15} palette={PRODUCTS} seed={5} wood="#f2f1ed" />
      <ProductShelf position={[-h + 0.28, 0.04, 0.25]} rotation={Math.PI / 2} w={1.4} h={1.15} palette={PRODUCTS} seed={6} wood="#f2f1ed" />
      {[[0.2, 0.2], [0.75, 0.95]].map(([x, z], i) => (
        <group key={i} position={[x, 0.04, z]}>
          <RoundedBox args={[0.9, 0.04, 0.42]} radius={0.015} smoothness={2} position={[0, 0.42, 0]}>
            <Mat c="#f2f1ed" r={0.4} />
          </RoundedBox>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.7, 0.4, 0.3]} />
            <Mat c="#dadce0" r={0.5} />
          </mesh>
          {[-0.3, -0.1, 0.1, 0.3].map((px, k) => (
            <mesh key={k} position={[px, 0.47, 0.04]} rotation={[-0.4, 0, 0]}>
              <boxGeometry args={[0.05, 0.09, 0.006]} />
              <Mat c="#202124" r={0.2} e={["#4285F4", "#EA4335", "#FBBC05", "#34A853"][k]} ei={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      <Boxes position={[1.1, 0.04, -0.6]} rotation={0.4} />
      <Person position={[0.2, 0.04, 0.5]} shirt="#4285F4" rotation={Math.PI} />
      <Person position={[0.9, 0.04, 0.6]} shirt="#e9e4dc" rotation={2.2} hair="#8a5a2b" />
      <Person position={[-0.5, 0.04, -0.4]} shirt="#34A853" rotation={Math.PI} />
      <pointLight position={[0.2, 1.1, 0.3]} intensity={4} distance={4.5} decay={1.5} color="#ffd9a3" />
      {[-0.9, 0.0, 0.9].map((z) => (
        <mesh key={z} position={[0, G - 0.01, z]} rotation={[Math.PI / 2, 0, 0]} userData={{ noCast: true }}>
          <planeGeometry args={[S - 0.5, 0.06]} />
          <meshStandardMaterial color="#fff" emissive="#fff3dc" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}

      {/* ground floor shopfront: blue frames wrapping the corner */}
      <group position={[0.05, G / 2, h - 0.05]}>
        <Curtain w={S - 0.3} h={G - 0.05} bays={4} frame={GG.blue} bar={0.07} depth={0.08} />
      </group>
      <group position={[h - 0.05, G / 2, 0.05]} rotation={[0, Math.PI / 2, 0]}>
        <Curtain w={S - 0.3} h={G - 0.05} bays={4} frame={GG.blue} bar={0.07} depth={0.08} />
      </group>
      {/* back walls (outside skin) */}
      <mesh position={[0, TOP / 2, -h + 0.05]}>
        <boxGeometry args={[S, TOP, 0.1]} />
        <Mat c={GG.white} r={0.85} bump={plaster} bs={0.6} />
      </mesh>
      <mesh position={[-h + 0.05, TOP / 2, 0]}>
        <boxGeometry args={[0.1, TOP, S]} />
        <Mat c={GG.white} r={0.85} bump={plaster} bs={0.6} />
      </mesh>
      {/* blue pilasters at the corners */}
      {[[h - 0.08, h - 0.08], [-h + 0.08, h - 0.08], [h - 0.08, -h + 0.08]].map(([x, z], i) => (
        <mesh key={i} position={[x, TOP / 2, z]}>
          <boxGeometry args={[0.18, TOP, 0.18]} />
          <Mat c={GG.blue} r={0.4} />
        </mesh>
      ))}
      {/* door handles */}
      {[0.32, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.7, h + 0.01]}>
          <boxGeometry args={[0.015, 0.4, 0.02]} />
          <Mat c="#d9dce0" r={0.15} m={0.9} />
        </mesh>
      ))}

      {/* white cornice band */}
      <group position={[0, G, 0]}>
        <Block w={S + 0.16} d={S + 0.16} h={BAND} radii={[0.03, 0.03, 0.03, 0.03]} bevel={0.02}>
          <Mat c={GG.trim} r={0.6} />
        </Block>
      </group>

      {/* upper floor: white walls, logo on +Z, blue framed windows on +X and on the right of +Z */}
      <mesh position={[0, G + BAND + U / 2, h - 0.08]}>
        <boxGeometry args={[S - 0.1, U, 0.16]} />
        <Mat c={GG.white} r={0.85} bump={plaster} bs={0.6} />
      </mesh>
      <mesh position={[h - 0.08, G + BAND + U / 2, 0]}>
        <boxGeometry args={[0.16, U, S - 0.1]} />
        <Mat c={GG.white} r={0.85} bump={plaster} bs={0.6} />
      </mesh>
      <group position={[-0.45, G + BAND + U / 2 + 0.05, h + 0.01]}>
        <Label map={t.logo} w={1.9} h={0.6} ei={0.25} lit />
      </group>
      <mesh position={[1.15, G + BAND + U / 2, h + 0.01]}>
        <boxGeometry args={[0.9, U, 0.04]} />
        <Mat c={GG.blue} r={0.4} />
      </mesh>
      <group position={[1.15, G + BAND + U / 2 + 0.03, h + 0.04]}>
        <Window w={0.6} h={0.8} />
      </group>
      {[-1.0, -0.2, 0.6].map((z) => (
        <group key={z} position={[h + 0.01, G + BAND + U / 2 + 0.03, z]} rotation={[0, Math.PI / 2, 0]}>
          <Window w={0.5} h={0.8} />
        </group>
      ))}
      <group position={[h + 0.02, G - 0.25, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <Label map={t.small} w={0.6} h={0.15} ei={0.4} />
      </group>

      {/* roof: cornice with blue trim */}
      <group position={[0, TOP, 0]}>
        <Block w={S + 0.2} d={S + 0.2} h={0.14} radii={[0.03, 0.03, 0.03, 0.03]} bevel={0.02}>
          <Mat c={GG.trim} r={0.6} />
        </Block>
        <group position={[0, 0.14, 0]}>
          <Block w={S + 0.2} d={S + 0.2} h={0.08} radii={[0.03, 0.03, 0.03, 0.03]} hole={0.1} bevel={0.015}>
            <Mat c={GG.blue} r={0.4} />
          </Block>
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.145, 0]}>
          <planeGeometry args={[S, S]} />
          <Mat c="#b9bcc1" r={0.9} bump={plaster} bs={1} />
        </mesh>
        <RoundedBox args={[0.8, 0.36, 0.55]} radius={0.03} smoothness={2} position={[-0.6, 0.32, -0.6]}>
          <Mat c="#dadce0" r={0.4} m={0.2} />
        </RoundedBox>
        {[-0.75, -0.45].map((x) => (
          <mesh key={x} position={[x, 0.33, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
            <Mat c="#5f6368" r={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Cone({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[0.22, 0.03, 0.22]} />
        <Mat c="#e8622c" r={0.6} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.08, 0.36, 20]} />
        <Mat c="#f26a2e" r={0.5} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.052, 0.062, 0.07, 20, 1, true]} />
        <Mat c="#f5f5f5" r={0.4} />
      </mesh>
    </group>
  );
}

function StreetLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.028, 0.04, 2.1, 14]} />
        <Mat c="#3c4043" r={0.35} m={0.5} />
      </mesh>
      <mesh position={[0.2, 2.08, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        <Mat c="#3c4043" r={0.35} m={0.5} />
      </mesh>
      <mesh position={[0.38, 2.04, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.11]} />
        <meshStandardMaterial color="#fff" emissive="#fff1cf" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function GoogleBlock() {
  const t = T();
  return (
    <group>
      <Base kind="google" />
      <Store t={t} />
      <group position={[0, 0.045, 0]}>
        <Cone position={[2.4, 0, 2.3]} />
        <Boxes position={[-2.4, 0, 1.9]} rotation={0.3} />
        <Planter position={[-1.0, 0, 2.15]} w={1.0} color="#e9e7e1" seed={41} />
        <Planter position={[2.15, 0, -1.2]} w={1.0} color="#e9e7e1" seed={42} rotation={Math.PI / 2} />
        <Bench position={[0.9, 0, 2.6]} wood="#c49a6c" />
        {[2.85, 2.35].map((x) => (
          <Bollard key={x} position={[x, 0, 0.6]} />
        ))}
        <StreetLight position={[2.8, 0, -2.75]} />
        <StreetLight position={[-2.8, 0, 2.75]} />
        <Person position={[-1.6, 0, 2.6]} shirt="#EA4335" rotation={0.5} />
        <Person position={[0.2, 0, 2.3]} shirt="#e9e4dc" rotation={-2.4} bag="#4285F4" />
        <Person position={[2.5, 0, 1.0]} shirt="#202124" rotation={1.6} hair="#c9a46a" />
      </group>
    </group>
  );
}
