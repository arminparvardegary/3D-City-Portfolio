"use client";

import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { Block, Mat, Person, ctex, rng } from "./kit";
import {
  Base, Bench, CafeTable, Counter, Curtain, FONT, GLOW, Label, LanternLamp, Pendant, Topiary, WARM, brick, brickBump,
  grassBump, grassTop, slats, woodFloor,
} from "./shop";

const SB = {
  green: "#00704a",
  greenDark: "#1e3932",
  walnut: "#4a2f1f",
  wood: "#7a4e2d",
};

function T() {
  return {
    logo: ctex("sbux-logo", 512, 512, (g) => {
      const c = 256;
      g.fillStyle = SB.green;
      g.beginPath(); g.arc(c, c, 250, 0, 7); g.fill();
      g.strokeStyle = "#fff";
      g.lineWidth = 8;
      g.beginPath(); g.arc(c, c, 236, 0, 7); g.stroke();
      g.beginPath(); g.arc(c, c, 160, 0, 7); g.stroke();
      // lettering around the ring
      g.fillStyle = "#fff";
      g.font = `800 52px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const ring = (text: string, start: number, step: number, flip: boolean) => {
        [...text].forEach((ch, i) => {
          const a = start + i * step;
          g.save();
          g.translate(c + Math.cos(a) * 198, c + Math.sin(a) * 198);
          g.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
          g.fillText(ch, 0, 0);
          g.restore();
        });
      };
      ring("STARBUCKS", -Math.PI / 2 - 4 * 0.27, 0.27, false);
      ring("COFFEE", Math.PI / 2 + 2.5 * 0.3, -0.3, true);
      g.beginPath(); g.arc(c - 205, c, 9, 0, 7); g.arc(c + 205, c, 9, 0, 7); g.fill();
      // siren: inner disc, face, hair, crown with star
      g.fillStyle = SB.green;
      g.beginPath(); g.arc(c, c, 150, 0, 7); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.ellipse(c, c + 10, 48, 60, 0, 0, 7); g.fill();
      g.strokeStyle = "#fff";
      g.lineWidth = 16;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(c + s * 52, c - 30);
        g.bezierCurveTo(c + s * 110, c + 10, c + s * 70, c + 70, c + s * 120, c + 120);
        g.stroke();
        g.beginPath();
        g.moveTo(c + s * 56, c + 10);
        g.bezierCurveTo(c + s * 96, c + 60, c + s * 60, c + 100, c + s * 90, c + 140);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(c - 54, c - 50); g.lineTo(c - 40, c - 100); g.lineTo(c - 14, c - 70); g.lineTo(c, c - 112);
      g.lineTo(c + 14, c - 70); g.lineTo(c + 40, c - 100); g.lineTo(c + 54, c - 50); g.closePath();
      g.fill();
      g.fillStyle = SB.green;
      g.beginPath(); g.ellipse(c - 17, c + 2, 7, 4, 0, 0, 7); g.ellipse(c + 17, c + 2, 7, 4, 0, 0, 7); g.fill();
      g.strokeStyle = SB.green;
      g.lineWidth = 4;
      g.beginPath(); g.arc(c, c + 30, 14, 0.2, Math.PI - 0.2); g.stroke();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(c, c - 82, 9, 0, 7); g.fill();
    }),
    menu: ctex("sbux-menu", 512, 192, (g) => {
      const r = rng(9);
      g.fillStyle = "#1f2321";
      g.fillRect(0, 0, 512, 192);
      for (let p = 0; p < 3; p++) {
        const x = 16 + p * 166;
        g.strokeStyle = "rgba(255,255,255,.25)";
        g.strokeRect(x, 12, 150, 168);
        g.fillStyle = "#f3efe6";
        g.font = `700 22px ${FONT}`;
        g.fillText(["Espresso", "Frappuccino", "Tea"][p], x + 12, 40);
        g.font = `400 14px ${FONT}`;
        for (let i = 0; i < 6; i++) {
          g.fillStyle = "rgba(243,239,230,.8)";
          g.fillRect(x + 12, 60 + i * 18, 70 + r() * 40, 3);
          g.fillText((2 + r() * 4).toFixed(2), x + 112, 64 + i * 18);
        }
      }
    }),
    awningText: ctex("sbux-awning", 512, 64, (g) => {
      g.fillStyle = SB.green;
      g.fillRect(0, 0, 512, 64);
      g.fillStyle = "rgba(255,255,255,.92)";
      g.font = `700 30px ${FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("STARBUCKS COFFEE", 256, 34);
    }),
  };
}
type Tex = ReturnType<typeof T>;

function Awning({ w, depth = 0.5, map }: { w: number; depth?: number; map?: THREE.Texture }) {
  return (
    <group>
      <mesh position={[0, -0.08, depth / 2]} rotation={[0.38, 0, 0]}>
        <boxGeometry args={[w, 0.035, depth]} />
        <Mat c={SB.green} r={0.8} />
      </mesh>
      <mesh position={[0, -0.24, depth - 0.02]}>
        <boxGeometry args={[w, 0.13, 0.025]} />
        <meshStandardMaterial attach="material-0" color={SB.green} />
        <meshStandardMaterial attach="material-1" color={SB.green} />
        <meshStandardMaterial attach="material-2" color={SB.green} />
        <meshStandardMaterial attach="material-3" color={SB.green} />
        <meshStandardMaterial attach="material-4" map={map ?? null} color={map ? "#ffffff" : SB.green} roughness={0.8} />
        <meshStandardMaterial attach="material-5" color={SB.green} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * w) / 2, -0.15, depth / 2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[depth, 0.18]} />
          <meshStandardMaterial color={SB.green} side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function EspressoMachine({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.4, 0.24, 0.2]} radius={0.02} smoothness={2} position={[0, 0.12, 0]}>
        <meshPhysicalMaterial color="#3d6b4f" metalness={0.5} roughness={0.25} clearcoat={1} />
      </RoundedBox>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.42, 0.02, 0.22]} />
        <Mat c="#cfd3d8" r={0.2} m={0.9} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.06, 0.12]}>
          <cylinderGeometry args={[0.02, 0.02, 0.06, 12]} />
          <Mat c="#cfd3d8" r={0.2} m={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function PastryCase({ position }: { position: [number, number, number] }) {
  const r = rng(12);
  return (
    <group position={position}>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.5, 0.26, 0.28]} />
        <meshPhysicalMaterial color="#e8f2f5" transparent opacity={0.2} roughness={0.02} depthWrite={false} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.18 + (i % 3) * 0.18, 0.56 + Math.floor(i / 3) * 0.11, 0]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[0.04, 12, 8]} />
          <meshStandardMaterial color={["#c98a4b", "#e2b36b", "#7a4a2b"][Math.floor(r() * 3)]} emissive={GLOW} emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

const S = 3.4;
const H = 2.35;
const GLASS_H = 1.6;

function Store({ t }: { t: Tex }) {
  const h = S / 2;
  const bm = brick();
  const bb = brickBump();
  const brickMat = <meshStandardMaterial map={bm} bumpMap={bb} bumpScale={1.5} roughness={0.9} />;
  return (
    <group position={[-0.25, 0.05, -0.3]}>
      {/* floor */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[S - 0.08, 0.04, S - 0.08]} />
        <meshStandardMaterial map={woodFloor()} roughness={0.45} />
      </mesh>
      {/* back brick walls + warm inside faces */}
      <mesh position={[0, H / 2, -h + 0.08]}>
        <boxGeometry args={[S, H, 0.16]} />
        {brickMat}
      </mesh>
      <mesh position={[-h + 0.08, H / 2, 0]}>
        <boxGeometry args={[0.16, H, S]} />
        {brickMat}
      </mesh>
      <mesh position={[0, H / 2, -h + 0.165]}>
        <planeGeometry args={[S - 0.3, H]} />
        <meshStandardMaterial color={WARM} emissive={GLOW} emissiveIntensity={0.25} roughness={0.9} />
      </mesh>

      {/* ----- +Z: brick front with walnut logo panel and the door ----- */}
      <mesh position={[0.35, H / 2, h - 0.08]}>
        <boxGeometry args={[S - 0.7, H, 0.16]} />
        {brickMat}
      </mesh>
      <mesh position={[-h + 0.4, H / 2, h - 0.04]}>
        <boxGeometry args={[0.8, H + 0.05, 0.24]} />
        <Mat c={SB.walnut} r={0.55} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[-h + 0.06 + i * 0.13, H / 2, h + 0.082]}>
          <boxGeometry args={[0.012, H, 0.01]} />
          <Mat c="#2d1b11" r={0.6} />
        </mesh>
      ))}
      <group position={[-h + 0.4, H - 0.5, h + 0.09]}>
        <mesh>
          <cylinderGeometry args={[0.34, 0.34, 0.04, 48]} />
          <Mat c="#1b1c1e" r={0.4} />
        </mesh>
        <group rotation={[Math.PI / 2, 0, 0]} />
        <group position={[0, 0, 0.022]}>
          <Label map={t.logo} w={0.64} h={0.64} ei={1.2} />
        </group>
      </group>
      {/* door + transom */}
      <group position={[0.15, 0, h + 0.005]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.62, 1.4, 0.04]} />
          <Mat c={SB.greenDark} r={0.4} m={0.3} />
        </mesh>
        <mesh position={[0, 0.7, 0.025]}>
          <planeGeometry args={[0.52, 1.3]} />
          <meshStandardMaterial color="#e9d6b4" emissive={GLOW} emissiveIntensity={0.55} roughness={0.2} />
        </mesh>
        <mesh position={[0.2, 0.7, 0.04]}>
          <boxGeometry args={[0.015, 0.36, 0.02]} />
          <Mat c="#d9dce0" r={0.15} m={0.9} />
        </mesh>
        <group position={[0, 1.6, 0]}>
          <Awning w={0.9} depth={0.35} />
        </group>
        <group position={[-0.46, 1.25, 0.06]}>
          <mesh>
            <boxGeometry args={[0.06, 0.14, 0.06]} />
            <Mat c="#1b1c1e" r={0.4} />
          </mesh>
          <mesh position={[0, -0.06, 0.02]}>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshStandardMaterial color="#fff" emissive={GLOW} emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
        </group>
      </group>
      {/* small side window on the brick front */}
      <group position={[1.05, 0.95, h + 0.01]}>
        <mesh>
          <boxGeometry args={[0.6, 0.8, 0.04]} />
          <Mat c={SB.greenDark} r={0.4} m={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[0.52, 0.72]} />
          <meshStandardMaterial color="#efd9b3" emissive={GLOW} emissiveIntensity={0.5} roughness={0.2} />
        </mesh>
      </group>

      {/* ----- +X: big glass storefront, slatted wood band, long awning ----- */}
      <group position={[h - 0.04, GLASS_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Curtain w={S - 0.2} h={GLASS_H} bays={4} frame={SB.greenDark} bar={0.05} />
      </group>
      <mesh position={[h - 0.06, GLASS_H + (H - GLASS_H) / 2, 0]}>
        <boxGeometry args={[0.12, H - GLASS_H, S]} />
        <meshStandardMaterial map={slats()} roughness={0.7} />
      </mesh>
      <group position={[h - 0.02, GLASS_H + 0.04, 0.05]} rotation={[0, Math.PI / 2, 0]}>
        <Awning w={S - 0.3} depth={0.55} map={t.awningText} />
      </group>
      <mesh position={[h - 0.08, H / 2, h - 0.08]}>
        <boxGeometry args={[0.16, H, 0.16]} />
        <Mat c={SB.walnut} r={0.55} />
      </mesh>

      {/* ----- interior ----- */}
      <Counter position={[-0.6, 0.04, -h + 0.55]} w={1.5} color={SB.walnut} top="#e9e6df" />
      <EspressoMachine position={[-0.9, 0.56, -h + 0.5]} />
      <PastryCase position={[-0.15, 0.04, -h + 0.55]} />
      <mesh position={[-0.5, 1.4, -h + 0.17]}>
        <planeGeometry args={[1.5, 0.56]} />
        <meshStandardMaterial map={t.menu} emissive="#ffffff" emissiveMap={t.menu} emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
      <CafeTable position={[0.95, 0.04, -0.2]} chair={SB.walnut} top="#e2cfae" />
      <CafeTable position={[0.95, 0.04, 0.85]} chair={SB.walnut} top="#e2cfae" />
      <CafeTable position={[-0.2, 0.04, 0.8]} chair={SB.walnut} top="#e2cfae" />
      <Person position={[-0.6, 0.04, -h + 0.25]} shirt={SB.green} hair="#2b211b" />
      <Person position={[-0.1, 0.04, -0.6]} shirt="#e9e4dc" rotation={Math.PI} />
      <Person position={[0.95, 0.04, 0.6]} shirt="#b5523b" rotation={Math.PI} hair="#8a5a2b" />
      {[[-0.6, -0.9], [0.9, -0.2], [0.9, 0.85], [-0.2, 0.8]].map(([x, z], i) => (
        <Pendant key={i} position={[x, H - 0.3, z]} color={SB.greenDark} />
      ))}
      <pointLight position={[0.2, 1.4, 0.2]} intensity={4} distance={4.5} decay={1.5} color="#ffcf8a" />

      {/* ----- roof: green coping, lawn, little conifers ----- */}
      <group position={[0, H, 0]}>
        <Block w={S + 0.12} d={S + 0.12} h={0.1} radii={[0.03, 0.03, 0.03, 0.03]} bevel={0.02}>
          <Mat c="#6b5a4a" r={0.8} />
        </Block>
        <group position={[0, 0.1, 0]}>
          <Block w={S + 0.16} d={S + 0.16} h={0.16} radii={[0.04, 0.04, 0.04, 0.04]} hole={0.12} bevel={0.025}>
            <Mat c={SB.greenDark} r={0.5} />
          </Block>
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
          <planeGeometry args={[S - 0.1, S - 0.1]} />
          <meshStandardMaterial map={grassTop()} bumpMap={grassBump()} bumpScale={2} roughness={1} />
        </mesh>
        {[[-1.2, -1.2, 0.75], [-0.6, -1.35, 0.55], [1.25, -1.2, 0.6], [1.3, 1.15, 0.7], [-1.25, 0.6, 0.6], [0.2, -0.3, 0.45]].map(([x, z, s], i) => (
          <Topiary key={i} position={[x, 0.16, z]} h={s} pot={null} seed={i + 3} />
        ))}
      </group>
    </group>
  );
}

export default function StarbucksBlock() {
  const t = T();
  return (
    <group>
      <Base kind="sbux" />
      <Store t={t} />
      <group position={[0, 0.045, 0]}>
        {/* benches along the glass, topiaries in pots */}
        {[-0.9, 0.35].map((z) => (
          <Bench key={z} position={[2.15, 0, z]} rotation={-Math.PI / 2} wood="#8a5a35" />
        ))}
        {[-1.6, -0.25, 1.0].map((z, i) => (
          <Topiary key={z} position={[2.15, 0, z]} h={0.55} seed={20 + i} />
        ))}
        {[-1.5, -1.15].map((x, i) => (
          <Topiary key={x} position={[x, 0, 1.9]} h={0.5} seed={30 + i} />
        ))}
        <mesh position={[0.0, 0.006, 1.65]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 0.45]} />
          <Mat c="#2f5a3a" r={0.95} />
        </mesh>
        <LanternLamp position={[-2.75, 0, 2.75]} />
        <LanternLamp position={[2.75, 0, 2.75]} />
        <LanternLamp position={[2.75, 0, -2.75]} />
        <Person position={[-1.9, 0, 2.5]} shirt="#3b4a66" rotation={0.5} hair="#c9a46a" />
        <Person position={[1.2, 0, 2.7]} shirt="#4a4f57" rotation={2.8} />
        <Person position={[2.6, 0, 0.9]} shirt="#a23a3a" rotation={-0.8} bag="#e9e4dc" />
        <Person position={[2.1, 0, -0.27]} shirt="#e9e4dc" rotation={-Math.PI / 2} />
      </group>
    </group>
  );
}
