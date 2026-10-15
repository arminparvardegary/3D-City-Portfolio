"use client";

import { RoundedBox } from "@react-three/drei";
import { Block, Foliage, Mat, Person, ctex } from "./kit";
import {
  Base, Bench, Bin, ClothesRack, Curtain, FONT, GLOW, LEAF, Label, LanternLamp, ProductShelf, Shrub, SignBox, WARM,
  grassBump, grassTop, signTex, woodFloor,
} from "./shop";

const N = { black: "#141416", frame: "#1b1c1f", panel: "#2a2c30" };
const SHOES = ["#f4f4f2", "#1b1c1f", "#e5483b", "#f2a33a", "#3a7bd5", "#c8ccd1", "#6ad1a8", "#f1d34a"];
const APPAREL = ["#1b1c1f", "#e9e7e2", "#5b6370", "#9aa3ad", "#c8423a", "#2f4a7a"];

function swoosh(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(60, 120);
  g.bezierCurveTo(10, 190, 50, 222, 140, 190);
  g.lineTo(500, 40);
  g.lineTo(150, 152);
  g.bezierCurveTo(90, 172, 62, 160, 60, 120);
  g.closePath();
  g.fill();
  g.restore();
}

function T() {
  return {
    swoosh: ctex("nike-swoosh", 512, 256, (g) => {
      g.fillStyle = "#fff";
      swoosh(g, 0, 0, 1);
    }),
    wordmark: ctex("nike-wordmark", 256, 256, (g) => {
      g.fillStyle = "#fff";
      g.font = `italic 900 92px ${FONT}`;
      g.textAlign = "center";
      g.fillText("NIKE", 128, 112);
      swoosh(g, 40, 120, 0.36);
    }),
    sign: signTex("nike-sign", "NIKE", { bg: N.black, fg: "#ffffff", size: 84, weight: 900, family: `italic ${FONT}` }),
  };
}
type Tex = ReturnType<typeof T>;

const S = 3.6;
const G = 1.45;
const SLAB = 0.14;
const U = 1.35;
const TOP = G + SLAB + U;

function Floor({ y, t }: { y: number; t: Tex }) {
  const h = S / 2;
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[S - 0.1, 0.04, S - 0.1]} />
        <meshStandardMaterial map={woodFloor()} roughness={0.45} />
      </mesh>
      <ProductShelf position={[-0.4, 0.04, -h + 0.2]} w={1.6} h={1.1} palette={SHOES} seed={Math.round(y * 10) + 1} wood="#d4b48a" />
      <ProductShelf position={[-h + 0.2, 0.04, 0.2]} rotation={Math.PI / 2} w={1.4} h={1.1} palette={SHOES} seed={Math.round(y * 10) + 2} wood="#d4b48a" />
      <ClothesRack position={[0.7, 0.04, -0.6]} palette={APPAREL} seed={Math.round(y * 10) + 3} />
      <ClothesRack position={[0.5, 0.04, 0.55]} rotation={Math.PI / 2} palette={APPAREL} seed={Math.round(y * 10) + 4} />
      <RoundedBox args={[0.7, 0.32, 0.45]} radius={0.02} smoothness={2} position={[-0.35, 0.2, 0.55]}>
        <Mat c="#d4b48a" r={0.5} />
      </RoundedBox>
      {[-0.55, -0.35, -0.15].map((x) => (
        <mesh key={x} position={[x, 0.4, 0.55]}>
          <boxGeometry args={[0.12, 0.06, 0.06]} />
          <Mat c={SHOES[Math.abs(Math.round(x * 10)) % SHOES.length]} r={0.5} />
        </mesh>
      ))}
      {/* ceiling light strips */}
      {[-1.0, -0.2, 0.6, 1.3].map((z) => (
        <mesh key={z} position={[0, (y === 0 ? G : U) - 0.01, z]} rotation={[Math.PI / 2, 0, 0]} userData={{ noCast: true }}>
          <planeGeometry args={[S - 0.4, 0.06]} />
          <meshStandardMaterial color="#fff" emissive="#fff3dc" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Store({ t }: { t: Tex }) {
  const h = S / 2;
  return (
    <group position={[-0.25, 0.05, -0.35]}>
      <Floor y={0} t={t} />
      <Floor y={G + SLAB} t={t} />
      <Person position={[0.2, 0.04, 0.1]} shirt="#e9e4dc" rotation={2.5} />
      <Person position={[-0.6, 0.04, -0.6]} shirt="#e5483b" rotation={Math.PI} hair="#c9a46a" />
      <Person position={[0.9, G + SLAB, 0.2]} shirt="#2f4a7a" rotation={-2} />
      <Person position={[-0.3, G + SLAB, -0.4]} shirt="#1b1c1f" rotation={Math.PI} bag="#f2a33a" />
      <pointLight position={[0, 1.0, 0.2]} intensity={4} distance={4.5} decay={1.5} color="#ffd39a" />
      <pointLight position={[0, G + SLAB + 0.9, 0.2]} intensity={4} distance={4.5} decay={1.5} color="#ffd39a" />

      {/* slab between floors */}
      <mesh position={[0, G + SLAB / 2, 0]}>
        <boxGeometry args={[S + 0.06, SLAB, S + 0.06]} />
        <Mat c={N.frame} r={0.45} m={0.4} />
      </mesh>
      {/* back walls: warm inside, black outside */}
      <mesh position={[0, TOP / 2, -h + 0.07]}>
        <boxGeometry args={[S - 0.1, TOP, 0.04]} />
        <meshStandardMaterial color={WARM} emissive={GLOW} emissiveIntensity={0.28} roughness={0.9} />
      </mesh>
      <mesh position={[-h + 0.07, TOP / 2, 0]}>
        <boxGeometry args={[0.04, TOP, S - 0.1]} />
        <meshStandardMaterial color={WARM} emissive={GLOW} emissiveIntensity={0.28} roughness={0.9} />
      </mesh>
      <mesh position={[0, TOP / 2, -h + 0.025]}>
        <boxGeometry args={[S, TOP, 0.05]} />
        <Mat c={N.panel} r={0.4} m={0.5} />
      </mesh>
      <mesh position={[-h + 0.025, TOP / 2, 0]}>
        <boxGeometry args={[0.05, TOP, S]} />
        <Mat c={N.panel} r={0.4} m={0.5} />
      </mesh>

      {/* thick black corner frame */}
      {[[h - 0.08, h - 0.08], [-h + 0.08, h - 0.08], [h - 0.08, -h + 0.08]].map(([x, z], i) => (
        <mesh key={i} position={[x, TOP / 2, z]}>
          <boxGeometry args={[0.16, TOP, 0.16]} />
          <Mat c={N.frame} r={0.4} m={0.5} />
        </mesh>
      ))}

      {/* +Z glazing on both floors, big swoosh upstairs, NIKE sign over the door */}
      <group position={[0, G / 2, h - 0.04]}>
        <Curtain w={S - 0.16} h={G} bays={3} frame={N.frame} bar={0.06} />
      </group>
      <group position={[0, G + SLAB + U / 2, h - 0.04]}>
        <Curtain w={S - 0.16} h={U} bays={3} frame={N.frame} bar={0.06} />
      </group>
      <group position={[-0.55, G + SLAB + U / 2 - 0.05, h + 0.005]}>
        <Label map={t.swoosh} w={1.3} h={0.65} ei={1.3} />
      </group>
      <group position={[-0.05, G - 0.22, h + 0.03]}>
        <SignBox w={0.9} h={0.3} d={0.08} color={N.black} map={t.sign} ei={1} />
      </group>
      {[-0.1, 0.0].map((x) => (
        <mesh key={x} position={[x, 0.62, h + 0.01]}>
          <boxGeometry args={[0.015, 0.45, 0.02]} />
          <Mat c="#d9dce0" r={0.15} m={0.9} />
        </mesh>
      ))}

      {/* +X glazing and the solid black logo column at the far end */}
      <group position={[h - 0.04, G / 2, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <Curtain w={S - 0.75} h={G} bays={2} frame={N.frame} bar={0.06} />
      </group>
      <group position={[h - 0.04, G + SLAB + U / 2, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <Curtain w={S - 0.75} h={U} bays={2} frame={N.frame} bar={0.06} />
      </group>
      <mesh position={[h - 0.05, TOP / 2, -h + 0.32]}>
        <boxGeometry args={[0.12, TOP, 0.64]} />
        <Mat c={N.panel} r={0.4} m={0.5} />
      </mesh>
      <group position={[h + 0.015, TOP - 0.45, -h + 0.32]} rotation={[0, Math.PI / 2, 0]}>
        <Label map={t.wordmark} w={0.6} h={0.6} ei={1.3} />
      </group>

      {/* roof: lawn, glass railing, skylight, pots */}
      <group position={[0, TOP, 0]}>
        <Block w={S + 0.1} d={S + 0.1} h={0.14} radii={[0.03, 0.03, 0.03, 0.03]} bevel={0.02}>
          <Mat c={N.frame} r={0.45} m={0.4} />
        </Block>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.145, 0]}>
          <planeGeometry args={[S - 0.05, S - 0.05]} />
          <meshStandardMaterial map={grassTop()} bumpMap={grassBump()} bumpScale={2} roughness={1} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <mesh position={[0, 0.36, S / 2 + 0.02]} userData={{ noCast: true }}>
              <planeGeometry args={[S + 0.08, 0.42]} />
              <meshPhysicalMaterial color="#dfeaf1" transparent opacity={0.18} roughness={0.02} clearcoat={1} depthWrite={false} side={2} />
            </mesh>
            <mesh position={[0, 0.58, S / 2 + 0.02]}>
              <boxGeometry args={[S + 0.1, 0.03, 0.04]} />
              <Mat c={N.frame} r={0.4} m={0.6} />
            </mesh>
          </group>
        ))}
        <RoundedBox args={[0.9, 0.22, 0.7]} radius={0.03} smoothness={2} position={[-0.2, 0.25, -0.4]}>
          <Mat c="#d9dce0" r={0.4} m={0.2} />
        </RoundedBox>
        {[[-1.4, -1.4], [1.4, -1.4], [1.4, 1.4], [-1.4, 1.4], [0.8, 0.4]].map(([x, z], i) => (
          <Shrub key={i} position={[x, 0.14, z]} s={0.9} seed={90 + i} pot="#2a2c30" />
        ))}
      </group>
    </group>
  );
}

function SquareTree({ position, seed }: { position: [number, number, number]; seed: number }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.5, 0.26, 0.5]} radius={0.02} smoothness={2} position={[0, 0.13, 0]}>
        <Mat c="#2a2c30" r={0.5} m={0.3} />
      </RoundedBox>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 1.0, 10]} />
        <Mat c="#6a4a33" r={0.95} />
      </mesh>
      <group position={[0, 1.45, 0]}>
        <Foliage count={160} radius={0.5} blob={0.11} seed={seed} palette={LEAF} />
      </group>
    </group>
  );
}

export default function NikeBlock() {
  const t = T();
  return (
    <group>
      <Base kind="nike" />
      <Store t={t} />
      <group position={[0, 0.045, 0]}>
        <Bench position={[-1.0, 0, 2.55]} />
        <Bench position={[2.55, 0, -0.9]} rotation={-Math.PI / 2} />
        <SquareTree position={[-2.55, 0, 1.4]} seed={301} />
        <SquareTree position={[1.6, 0, 2.6]} seed={302} />
        <LanternLamp position={[-2.75, 0, 2.75]} />
        <LanternLamp position={[2.75, 0, 2.75]} />
        <LanternLamp position={[2.75, 0, -2.75]} />
        <Bin position={[0.5, 0, 2.85]} />
        <Person position={[-0.6, 0, 2.2]} shirt="#e5483b" rotation={0.3} />
        <Person position={[0.4, 0, 2.3]} shirt="#1b1c1f" rotation={-2.6} bag="#f4f4f2" />
        <Person position={[2.2, 0, 0.6]} shirt="#3a7bd5" rotation={1.4} hair="#c9a46a" />
        <Person position={[2.4, 0, -1.8]} shirt="#e9e7e2" rotation={-0.4} />
      </group>
    </group>
  );
}
