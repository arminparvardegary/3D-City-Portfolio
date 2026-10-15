"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { Block, Mat, Person, ctex, rng, stucco } from "./kit";
import {
  Base, Bin, Bollard, CafeTable, Counter, Curtain, FONT, GLOW, Label, LEAF, Pendant, Planter, SignBox, WARM, signTex,
} from "./shop";

const M = {
  red: "#d52b1e",
  redDark: "#b3241a",
  yellow: "#ffbc0d",
  frame: "#2a2c30",
  metal: "#3a3d42",
};

function T() {
  return {
    sign: signTex("mcd-sign", "McDonald's", { bg: M.red, fg: "#ffffff", size: 78, weight: 800 }),
    arches: ctex("mcd-arches", 256, 256, (g) => {
      g.fillStyle = "rgba(0,0,0,0)";
      g.clearRect(0, 0, 256, 256);
      g.strokeStyle = M.yellow;
      g.lineWidth = 30;
      g.lineCap = "butt";
      g.beginPath();
      g.moveTo(28, 220);
      g.bezierCurveTo(32, 40, 110, 20, 128, 140);
      g.bezierCurveTo(146, 20, 224, 40, 228, 220);
      g.stroke();
    }),
    menu: ctex("mcd-menu", 512, 160, (g) => {
      const r = rng(4);
      g.fillStyle = "#1c1c1e";
      g.fillRect(0, 0, 512, 160);
      for (let i = 0; i < 4; i++) {
        const x = 12 + i * 125;
        g.fillStyle = "#2a2a2d";
        g.fillRect(x, 10, 115, 140);
        // burger / fries / drink photos as simple shapes
        g.fillStyle = ["#d9973f", "#f2c230", "#c8352b", "#8a4b23"][i];
        g.beginPath();
        g.ellipse(x + 57, 66, 38, 26, 0, 0, 7);
        g.fill();
        g.fillStyle = "#6ab544";
        g.fillRect(x + 22, 64, 70, 6);
        g.fillStyle = "#fff";
        g.font = `700 20px ${FONT}`;
        g.textAlign = "center";
        g.fillText(["Big Mac", "Fries", "Coke", "McFlurry"][i], x + 57, 118);
        g.fillStyle = M.yellow;
        g.fillText(`$${(3 + r() * 4).toFixed(2)}`, x + 57, 140);
      }
    }),
    poster: ctex("mcd-poster", 256, 384, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 384);
      grd.addColorStop(0, "#ffcf3a");
      grd.addColorStop(1, "#ffb000");
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 384);
      g.fillStyle = "#c8352b";
      g.beginPath(); g.ellipse(128, 170, 90, 30, 0, 0, 7); g.fill();
      g.fillStyle = "#6a3a1e";
      g.fillRect(48, 190, 160, 26);
      g.fillStyle = "#d9973f";
      g.beginPath(); g.ellipse(128, 236, 92, 26, 0, 0, Math.PI); g.fill();
      g.beginPath(); g.ellipse(128, 160, 92, 50, 0, Math.PI, 0); g.fill();
      g.fillStyle = "#fff";
      g.font = `800 40px ${FONT}`;
      g.textAlign = "center";
      g.fillText("NEW", 128, 70);
      g.font = `700 26px ${FONT}`;
      g.fillText("i'm lovin' it", 128, 330);
    }),
  };
}
type Tex = ReturnType<typeof T>;

/** 3D golden arches: one swept tube, flattened. */
function GoldenArches({ h = 0.9 }: { h?: number }) {
  const geo = useMemo(() => {
    const pts = [
      [-0.5, 0], [-0.49, 0.45], [-0.42, 0.82], [-0.3, 0.98], [-0.18, 0.86], [-0.06, 0.55], [0, 0.42],
      [0.06, 0.55], [0.18, 0.86], [0.3, 0.98], [0.42, 0.82], [0.49, 0.45], [0.5, 0],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 120, 0.055, 16);
    g.scale(1, 1, 0.55);
    return g;
  }, []);
  return (
    <group scale={h}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial color={M.yellow} emissive="#ffb000" emissiveIntensity={0.35} roughness={0.25} clearcoat={1} />
      </mesh>
      {/* steel post holding the sign */}
      <mesh position={[0, 0.2, -0.05]}>
        <boxGeometry args={[0.04, 0.4, 0.04]} />
        <Mat c={M.metal} r={0.4} m={0.6} />
      </mesh>
    </group>
  );
}

function Palm({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  const fronds = useMemo(() => {
    const r = rng(position[0] * 31 + position[2] * 7);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.06, 0.18, 0, 0.42);
    shape.quadraticCurveTo(-0.06, 0.18, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getY(i) ** 2 * 0.9);
    geo.computeVertexNormals();
    return { geo, list: Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2 + r() * 0.3, t: 0.5 + r() * 0.6, c: LEAF[Math.floor(r() * LEAF.length)] })) };
  }, [position]);
  return (
    <group position={position} scale={s}>
      <RoundedBox args={[0.34, 0.24, 0.34]} radius={0.02} smoothness={2} position={[0, 0.12, 0]}>
        <Mat c="#8c9096" r={0.6} />
      </RoundedBox>
      <group position={[0, 0.24, 0]}>
        {fronds.list.map((f, i) => (
          <group key={i} rotation={[0, f.a, 0]}>
            <mesh geometry={fronds.geo} rotation={[-f.t, 0, 0]}>
              <meshStandardMaterial color={f.c} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Umbrella({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <CafeTable position={[0, 0, 0]} chair={M.red} top="#f2f2ef" />
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.9, 8]} />
        <Mat c="#d9d9d9" r={0.3} m={0.7} />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <coneGeometry args={[0.42, 0.18, 8, 1, true]} />
        <meshStandardMaterial color={M.red} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

const S = 3.6;
const G = 1.5; // ground floor height
const BAND = 0.32;
const U = 1.08; // upper floor height
const TOP = G + BAND + U;

function Store({ t }: { t: Tex }) {
  const h = S / 2;
  const wall = (
    <meshStandardMaterial color={WARM} emissive={GLOW} emissiveIntensity={0.3} roughness={0.9} />
  );
  return (
    <group position={[-0.25, 0.05, -0.35]}>
      {/* floors */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[S - 0.08, 0.04, S - 0.08]} />
        <Mat c="#d8d2c8" r={0.35} />
      </mesh>
      <mesh position={[0, G + BAND / 2, 0]}>
        <boxGeometry args={[S - 0.1, BAND, S - 0.1]} />
        <Mat c="#cfc8bd" r={0.6} />
      </mesh>

      {/* warm back walls inside, dark metal outside */}
      <mesh position={[0, TOP / 2, -h + 0.07]}>
        <boxGeometry args={[S - 0.1, TOP, 0.04]} />
        {wall}
      </mesh>
      <mesh position={[-h + 0.07, TOP / 2, 0]}>
        <boxGeometry args={[0.04, TOP, S - 0.1]} />
        {wall}
      </mesh>
      <mesh position={[0, TOP / 2, -h + 0.025]}>
        <boxGeometry args={[S, TOP, 0.05]} />
        <Mat c={M.metal} r={0.45} m={0.5} />
      </mesh>
      <mesh position={[-h + 0.025, TOP / 2, 0]}>
        <boxGeometry args={[0.05, TOP, S]} />
        <Mat c={M.metal} r={0.45} m={0.5} />
      </mesh>

      {/* corner posts */}
      {[[h - 0.06, h - 0.06], [-h + 0.06, h - 0.06], [h - 0.06, -h + 0.06]].map(([x, z], i) => (
        <mesh key={i} position={[x, TOP / 2, z]}>
          <boxGeometry args={[0.12, TOP, 0.12]} />
          <Mat c={M.frame} r={0.4} m={0.5} />
        </mesh>
      ))}

      {/* ----- ground floor: red panels + glazing ----- */}
      <mesh position={[-h + 0.45, G / 2, h - 0.04]}>
        <boxGeometry args={[0.8, G, 0.08]} />
        <Mat c={M.red} r={0.45} bump={stucco()} bs={0.2} />
      </mesh>
      <group position={[0.35, G / 2, h - 0.04]}>
        <Curtain w={S - 0.95} h={G} bays={3} frame={M.frame} />
      </group>
      <mesh position={[h - 0.04, G / 2, -h + 0.45]}>
        <boxGeometry args={[0.08, G, 0.8]} />
        <Mat c={M.red} r={0.45} bump={stucco()} bs={0.2} />
      </mesh>
      <group position={[h + 0.005, 0.85, -h + 0.45]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[0.46, 0.66, 0.03]} />
          <Mat c="#1d1e21" r={0.4} m={0.5} />
        </mesh>
        <Label map={t.poster} w={0.4} h={0.6} ei={0.8} />
      </group>
      <group position={[h - 0.04, G / 2, 0.35]} rotation={[0, Math.PI / 2, 0]}>
        <Curtain w={S - 0.95} h={G} bays={3} frame={M.frame} />
      </group>
      {/* door handles */}
      {[0.02, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.7, h + 0.01]}>
          <boxGeometry args={[0.015, 0.4, 0.02]} />
          <Mat c="#d9dce0" r={0.15} m={0.9} />
        </mesh>
      ))}

      {/* ----- yellow band with red signs ----- */}
      <group position={[0, G, 0]}>
        <Block w={S + 0.14} d={S + 0.14} h={BAND} radii={[0.04, 0.04, 0.04, 0.04]} bevel={0.02}>
          <meshPhysicalMaterial color={M.yellow} roughness={0.35} clearcoat={0.6} />
        </Block>
      </group>
      <group position={[-0.25, G + BAND / 2, h + 0.1]}>
        <SignBox w={1.55} h={0.4} d={0.08} color={M.red} map={t.sign} ei={0.5} />
      </group>
      <group position={[h + 0.1, G + BAND / 2, -0.15]} rotation={[0, Math.PI / 2, 0]}>
        <SignBox w={1.55} h={0.4} d={0.08} color={M.red} map={t.sign} ei={0.5} />
      </group>

      {/* ----- upper floor glazing + logo panel ----- */}
      <group position={[0, G + BAND + U / 2, h - 0.04]}>
        <Curtain w={S - 0.1} h={U} bays={5} frame={M.frame} />
      </group>
      <group position={[h - 0.04, G + BAND + U / 2, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <Curtain w={S - 0.7} h={U} bays={4} frame={M.frame} />
      </group>
      <mesh position={[h - 0.04, G + BAND + U / 2, -h + 0.32]}>
        <boxGeometry args={[0.1, U, 0.62]} />
        <Mat c="#26272b" r={0.4} m={0.5} />
      </mesh>
      <group position={[h + 0.015, G + BAND + U / 2 + 0.05, -h + 0.32]} rotation={[0, Math.PI / 2, 0]}>
        <Label map={t.arches} w={0.5} h={0.5} ei={1.4} />
      </group>

      {/* ----- interior ----- */}
      <Counter position={[0.2, 0.04, -h + 0.45]} w={1.8} color={M.red} />
      <mesh position={[0.2, 1.05, -h + 0.1]}>
        <planeGeometry args={[1.9, 0.6]} />
        <meshStandardMaterial map={t.menu} emissive="#ffffff" emissiveMap={t.menu} emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.66, -h + 0.42]}>
          <boxGeometry args={[0.18, 0.24, 0.12]} />
          <Mat c="#cfd3d8" r={0.3} m={0.6} />
        </mesh>
      ))}
      <CafeTable position={[-0.9, 0.04, 0.5]} chair={M.yellow} top="#f2f2ef" round={false} />
      <CafeTable position={[0.25, 0.04, 0.85]} chair={M.red} top="#f2f2ef" round={false} />
      <CafeTable position={[1.1, 0.04, 0.2]} chair={M.yellow} top="#f2f2ef" round={false} />
      <Person position={[0.3, 0.04, -0.6]} shirt="#e9e4dc" rotation={Math.PI} />
      <Person position={[-0.1, 0.04, -0.4]} shirt="#2f6fd1" rotation={2.8} />
      <Person position={[0.2, 0.04, -1.25]} shirt={M.red} hair="#3a2a20" />
      {/* upstairs */}
      <CafeTable position={[-0.7, G + BAND, 0.7]} chair={M.red} top="#f2f2ef" round={false} />
      <CafeTable position={[0.6, G + BAND, 0.9]} chair={M.yellow} top="#f2f2ef" round={false} />
      <CafeTable position={[1.0, G + BAND, -0.4]} chair={M.red} top="#f2f2ef" round={false} />
      <Person position={[-0.7, G + BAND, 0.95]} shirt="#5a6b52" rotation={Math.PI} />
      <Person position={[0.85, G + BAND, -0.4]} shirt="#ececec" rotation={-Math.PI / 2} hair="#c9a46a" />
      {[-0.8, 0.2, 1.0].map((x) =>
        [-0.5, 0.6].map((z) => <Pendant key={`${x}${z}`} position={[x, G - 0.15, z]} color={M.red} />),
      )}
      <pointLight position={[0, 1.1, 0.2]} intensity={4} distance={4.5} decay={1.5} color="#ffd39a" />
      <pointLight position={[0, G + BAND + 0.8, 0.2]} intensity={3} distance={4} decay={1.5} color="#ffd39a" />
      {/* upstairs ceiling lights */}
      {[-0.8, 0.2, 1.1].map((z) => (
        <mesh key={z} position={[0, TOP - 0.005, z]} rotation={[Math.PI / 2, 0, 0]} userData={{ noCast: true }}>
          <planeGeometry args={[S - 0.4, 0.06]} />
          <meshStandardMaterial color="#fff" emissive="#fff3dc" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      ))}

      {/* ----- roof ----- */}
      <group position={[0, TOP, 0]}>
        <Block w={S + 0.08} d={S + 0.08} h={0.14} radii={[0.04, 0.04, 0.04, 0.04]} bevel={0.02}>
          <Mat c="#9a9fa6" r={0.6} />
        </Block>
        <group position={[0, 0.14, 0]}>
          <Block w={S + 0.08} d={S + 0.08} h={0.14} radii={[0.04, 0.04, 0.04, 0.04]} hole={0.08} bevel={0.02}>
            <Mat c="#2a2c30" r={0.4} m={0.4} />
          </Block>
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.145, 0]}>
          <planeGeometry args={[S - 0.1, S - 0.1]} />
          <Mat c="#8b8f95" r={0.9} bump={stucco()} bs={1} />
        </mesh>
        <group position={[-0.55, 0.14, h - 0.3]}>
          <GoldenArches h={1.05} />
        </group>
        <RoundedBox args={[0.7, 0.32, 0.5]} radius={0.03} smoothness={2} position={[0.6, 0.3, -0.7]}>
          <Mat c="#d9dce0" r={0.4} m={0.2} />
        </RoundedBox>
        <Palm position={[1.2, 0.14, 0.9]} s={1.1} />
        <Palm position={[-1.2, 0.14, -1.1]} s={1.2} />
        <Palm position={[0.3, 0.14, -1.3]} s={0.9} />
      </group>
    </group>
  );
}

export default function McDonaldsBlock() {
  const t = T();
  return (
    <group>
      <Base kind="mcd" />
      <Store t={t} />
      <group position={[0, 0.045, 0]}>
        <Planter position={[-1.3, 0, 2.15]} w={1.0} color="#7a5a42" seed={3} />
        <Planter position={[2.15, 0, -1.3]} w={1.0} color="#7a5a42" seed={4} rotation={Math.PI / 2} />
        <Umbrella position={[2.35, 0, 1.25]} />
        <Umbrella position={[1.1, 0, 2.5]} />
        {[-2.6, -2.1].map((x) => (
          <Bollard key={x} position={[x, 0, 2.9]} />
        ))}
        <Bin position={[2.8, 0, 2.8]} />
        <Person position={[-2.3, 0, 1.4]} shirt="#e8e4dc" rotation={0.6} bag="#d52b1e" />
        <Person position={[-0.2, 0, 2.6]} shirt="#7a2f2f" rotation={-0.3} hair="#5a3a22" />
        <Person position={[2.6, 0, -0.2]} shirt="#2f3a4a" rotation={2.4} />
        <Person position={[0.5, 0, 2.9]} shirt="#c26a3b" rotation={1.2} />
        <group position={[-2.75, 0, 2.75]}>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.028, 0.04, 2.0, 14]} />
            <Mat c="#2a2c30" r={0.35} m={0.5} />
          </mesh>
          <mesh position={[0.18, 1.98, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.36, 8]} />
            <Mat c="#2a2c30" r={0.35} m={0.5} />
          </mesh>
          <mesh position={[0.34, 1.94, 0]}>
            <boxGeometry args={[0.16, 0.05, 0.1]} />
            <meshStandardMaterial color="#fff" emissive="#fff1cf" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
