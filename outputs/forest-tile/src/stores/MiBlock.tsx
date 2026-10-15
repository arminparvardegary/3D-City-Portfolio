
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { BRAND, imgTex } from "./brand";
import { Block, Foliage, Mat, Platform, ctex, noise, rng, roundedShape, stucco } from "./kit";

/* ---------- palette (sampled from the reference) ---------- */
const C = {
  cream: "#efe4d1",
  creamShade: "#e2d4bc",
  cap: "#f5ecdd",
  slate: "#9ea9b6",
  slateDark: "#8693a1",
  frame: "#cdd2d8",
  roof: "#45474c",
  black: "#232427",
  orange: "#7f86ff",   // Hindra violet (was Mi orange)
  awning: "#ec6a22",
  red: "#1c1c22",   // Hindra black (was red)
  terracotta: "#c8703e",
  pot: "#d8743b",
  wood: "#d48a4c",
  steel: "#c4c9cf",
  leaf: ["#4c8b2b", "#5a9e31", "#68b03a", "#79c044", "#4f9330", "#86c94c"],
};

/* ---------- textures ---------- */
function T() {
  const font = "-apple-system, 'SF Pro Display', Helvetica, Arial";
  return {
    tiles: ctex("mi-tiles", 512, 512, (g) => {
      const r = rng(7);
      g.fillStyle = "#c9c9ce";
      g.fillRect(0, 0, 512, 512);
      const n = 4, s = 128;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = `hsl(230, 5%, ${88.5 + r() * 3.5}%)`;
          g.fillRect(i * s + 2.5, j * s + 2.5, s - 5, s - 5);
          for (let k = 0; k < 160; k++) {
            g.fillStyle = `rgba(120,120,130,${r() * 0.06})`;
            g.fillRect(i * s + r() * s, j * s + r() * s, 2, 2);
          }
        }
    }, { repeat: [3, 3] }),
    tilesBump: ctex("mi-tiles-b", 512, 512, (g) => {
      noise(g, 512, 512, 2, 200, 30, 2);
      g.strokeStyle = "rgb(40,40,40)";
      g.lineWidth = 5;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke();
        g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke();
      }
    }, { repeat: [3, 3], color: false }),
    relief: ctex("mi-relief", 1024, 160, (g) => {
      const r = rng(9);
      g.fillStyle = "#a95b2f";
      g.fillRect(0, 0, 1024, 160);
      for (let k = 0; k < 8; k++) {
        const x = k * 128;
        g.fillStyle = `hsl(22, ${52 + r() * 6}%, ${50 + r() * 4}%)`;
        g.fillRect(x + 4, 6, 120, 148);
        g.strokeStyle = "#ad5d30";
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(x + 22, 134); g.lineTo(x + 22, 26); g.lineTo(x + 106, 26); g.lineTo(x + 106, 112);
        g.lineTo(x + 46, 112); g.lineTo(x + 46, 52); g.lineTo(x + 82, 52); g.lineTo(x + 82, 86);
        g.stroke();
        for (let i = 0; i < 300; i++) {
          g.fillStyle = `rgba(90,40,15,${r() * 0.12})`;
          g.fillRect(x + r() * 128, r() * 160, 2, 2);
        }
      }
    }, { repeat: [3, 1] }),
    reliefBump: ctex("mi-relief-b", 1024, 160, (g) => {
      g.fillStyle = "#202020";
      g.fillRect(0, 0, 1024, 160);
      for (let k = 0; k < 8; k++) {
        const x = k * 128;
        g.fillStyle = "#b0b0b0";
        g.fillRect(x + 4, 6, 120, 148);
        g.strokeStyle = "#555";
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(x + 22, 134); g.lineTo(x + 22, 26); g.lineTo(x + 106, 26); g.lineTo(x + 106, 112);
        g.lineTo(x + 46, 112); g.lineTo(x + 46, 52); g.lineTo(x + 82, 52); g.lineTo(x + 82, 86);
        g.stroke();
      }
    }, { repeat: [3, 1], color: false }),
    gravel: ctex("mi-gravel", 256, 256, (g) => {
      const r = rng(3);
      g.fillStyle = C.roof;
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5000; i++) {
        const v = 48 + r() * 60;
        g.fillStyle = `rgb(${v},${v},${v + 3})`;
        g.beginPath();
        g.arc(r() * 256, r() * 256, 0.6 + r() * 1.2, 0, 7);
        g.fill();
      }
    }, { repeat: [4, 4] }),
    gravelBump: ctex("mi-gravel-b", 256, 256, (g, w, h) => noise(g, w, h, 5, 128, 180, 2.5), { repeat: [4, 4], color: false }),
    // Hindra Studio: the deer logo from the brand guidelines.
    // Slightly over-scaled inside the circle so the crop's light margin never shows.
    logo: imgTex("hindra-logo", 512, 512, [BRAND.hindra.logo!], (g, [im]) => { if (!im) return; g.save(); g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.clip(); g.fillStyle = "#111"; g.fillRect(0, 0, 512, 512); g.drawImage(im, -40, -40, 592, 592); g.restore(); }),
    menu: ctex("mi-menu", 512, 112, (g) => {
      g.fillStyle = C.red;
      g.fillRect(0, 0, 512, 112);
      g.strokeStyle = "rgba(255,255,255,.85)";
      g.lineWidth = 4;
      g.strokeRect(10, 10, 492, 92);
      g.fillStyle = "#fff";
      g.font = `800 64px ${font}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("STUDIO", 200, 60);
      g.font = `700 40px ${font}`;
      g.fillText("OPEN", 395, 60);
    }),
    shopSign: ctex("mi-shopsign", 512, 112, (g) => {
      g.fillStyle = C.orange;
      g.fillRect(0, 0, 512, 112);
      g.fillStyle = "#fff";
      g.font = `800 66px ${font}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("HINDRA", 256, 60);
    }),
    upperGlass: ctex("mi-glass", 256, 256, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, "#7d93a6");
      grd.addColorStop(0.55, "#3c4a57");
      grd.addColorStop(1, "#263039");
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = "rgba(255,255,255,.22)";
      g.beginPath(); g.moveTo(150, 0); g.lineTo(210, 0); g.lineTo(70, 256); g.lineTo(10, 256); g.fill();
      g.fillStyle = "rgba(255,255,255,.1)";
      g.beginPath(); g.moveTo(225, 0); g.lineTo(245, 0); g.lineTo(105, 256); g.lineTo(85, 256); g.fill();
      // a hint of the room: ceiling lamp + curtain edge
      g.fillStyle = "rgba(255,236,200,.35)";
      g.fillRect(60, 30, 50, 8);
      g.fillStyle = "rgba(230,220,205,.25)";
      g.fillRect(0, 0, 26, 256);
    }),
    shopInside: ctex("mi-shopinside", 512, 256, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, "#e9e4dc");
      grd.addColorStop(1, "#cfc7bb");
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 256);
      g.fillStyle = "#b9b1a5";
      g.fillRect(0, 180, 512, 76);
      g.fillStyle = "#f2efe9";
      g.fillRect(0, 60, 512, 8);
      g.fillRect(0, 130, 512, 8);
    }),
    doorInside: ctex("mi-doorinside", 512, 256, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, "#f1ece4");
      grd.addColorStop(1, "#d9d1c4");
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 256);
      g.fillStyle = "#c9c0b2";
      g.fillRect(0, 205, 512, 51);
      // red display stand + products
      g.fillStyle = "#d63a3f";
      g.fillRect(280, 110, 90, 100);
      g.fillStyle = "#ececec";
      g.fillRect(292, 120, 26, 40);
      g.fillRect(330, 120, 26, 40);
      g.fillStyle = "#f46f20";
      g.fillRect(90, 140, 70, 70);
      g.fillStyle = "rgba(255,240,215,.9)";
      g.fillRect(40, 18, 120, 8);
      g.fillRect(300, 18, 120, 8);
    }),
    grid: ctex("mi-grid", 256, 140, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 140);
      grd.addColorStop(0, "#6e8496");
      grd.addColorStop(1, "#33414d");
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 140);
      g.fillStyle = "rgba(255,255,255,.2)";
      g.beginPath(); g.moveTo(120, 0); g.lineTo(165, 0); g.lineTo(90, 140); g.lineTo(45, 140); g.fill();
      g.fillStyle = "rgba(255,230,190,.3)";
      g.fillRect(150, 70, 60, 40);
    }),
    chalk: [0, 1, 2].map((v) =>
      ctex(`mi-chalk-${v}`, 256, 360, (g) => {
        const r = rng(11 + v);
        g.fillStyle = "#26292b";
        g.fillRect(0, 0, 256, 360);
        for (let i = 0; i < 400; i++) {
          g.fillStyle = `rgba(255,255,255,${r() * 0.04})`;
          g.fillRect(r() * 256, r() * 360, 3, 3);
        }
        g.fillStyle = "rgba(245,245,238,.92)";
        g.font = `700 52px "Bradley Hand", "Chalkboard SE", ${font}`;
        g.textAlign = "center";
        g.fillText(["MENU", "OPEN", "SALE"][v], 128, 78);
        g.strokeStyle = "rgba(245,245,238,.75)";
        g.lineCap = "round";
        g.lineWidth = 3;
        for (let y = 130; y < 300; y += 34) {
          g.beginPath();
          g.moveTo(36, y);
          g.lineTo(36 + 70 + r() * 90, y + (r() - 0.5) * 5);
          g.stroke();
          g.beginPath();
          g.arc(214, y - 2, 6, 0, 7);
          g.stroke();
        }
        g.strokeStyle = ["#f6a35a", "#ff8c8c", "#9fd88a"][v];
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(40, 96); g.lineTo(216, 96);
        g.stroke();
      }),
    ),
  };
}
type Tex = ReturnType<typeof T>;

/* ---------- small parts ---------- */
function Glass({ w, h, t }: { w: number; h: number; t: THREE.Texture }) {
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshPhysicalMaterial map={t} roughness={0.06} metalness={0} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.4} />
    </mesh>
  );
}

function Window({ w, h, t, cross = true }: { w: number; h: number; t: THREE.Texture; cross?: boolean }) {
  return (
    <group>
      <RoundedBox args={[w + 0.14, h + 0.14, 0.1]} radius={0.025} smoothness={3}>
        <Mat c={C.frame} r={0.35} m={0.3} />
      </RoundedBox>
      <group position={[0, 0, 0.03]}>
        <Glass w={w} h={h} t={t} />
      </group>
      {cross && (
        <>
          <mesh position={[0, 0, 0.045]}>
            <boxGeometry args={[0.035, h, 0.03]} />
            <Mat c={C.frame} r={0.35} m={0.3} />
          </mesh>
          <mesh position={[0, h * 0.18, 0.045]}>
            <boxGeometry args={[w, 0.03, 0.03]} />
            <Mat c={C.frame} r={0.35} m={0.3} />
          </mesh>
        </>
      )}
      {/* sill */}
      <RoundedBox args={[w + 0.26, 0.05, 0.18]} radius={0.015} smoothness={2} position={[0, -h / 2 - 0.09, 0.06]}>
        <Mat c={C.cap} r={0.6} />
      </RoundedBox>
    </group>
  );
}

function SignBox({ w, h, map, color }: { w: number; h: number; map: THREE.Texture; color: string }) {
  return (
    <mesh>
      <boxGeometry args={[w, h, 0.06]} />
      <meshStandardMaterial attach="material-0" color={color} />
      <meshStandardMaterial attach="material-1" color={color} />
      <meshStandardMaterial attach="material-2" color={color} />
      <meshStandardMaterial attach="material-3" color={color} />
      <meshStandardMaterial attach="material-4" map={map} roughness={0.45} emissive="#ffffff" emissiveMap={map} emissiveIntensity={0.12} />
      <meshStandardMaterial attach="material-5" color={color} />
    </mesh>
  );
}

/* ---------- building ---------- */
const GF = { w: 2.8, h: 1.55, r: 0.7 };
const UF = { w: 2.95, h: 1.3, r: 0.78 };

function Building({ t }: { t: Tex }) {
  const gh = GF.w / 2;
  const uh = UF.w / 2;
  const roofY = GF.h + UF.h;
  const dc = gh - GF.r;
  const plaster = stucco();

  return (
    <group position={[-0.35, 0.05, -0.45]}>
      {/* ground floor + skirting */}
      <Block w={GF.w} d={GF.w} h={GF.h} radii={[GF.r, 0.14, 0.14, 0.14]}>
        <Mat c={C.cream} r={0.85} bump={plaster} bs={0.8} />
      </Block>
      <Block w={GF.w + 0.04} d={GF.w + 0.04} h={0.14} radii={[GF.r + 0.02, 0.16, 0.16, 0.16]} bevel={0.015}>
        <Mat c={C.creamShade} r={0.8} bump={plaster} bs={0.6} />
      </Block>

      {/* cornice + upper floor */}
      <group position={[0, GF.h - 0.05, 0]}>
        <Block w={UF.w + 0.08} d={UF.w + 0.08} h={0.12} radii={[UF.r + 0.04, 0.26, 0.26, 0.26]} bevel={0.025}>
          <Mat c={C.cap} r={0.7} />
        </Block>
      </group>
      <group position={[0, GF.h + 0.07, 0]}>
        <Block w={UF.w} d={UF.w} h={UF.h - 0.07} radii={[UF.r, 0.22, 0.22, 0.22]}>
          <Mat c={C.slate} r={0.7} bump={plaster} bs={0.5} />
        </Block>
      </group>

      {/* parapet + coping + gravel roof */}
      <group position={[0, roofY, 0]}>
        <Block w={3.15} d={3.15} h={0.4} radii={[0.9, 0.36, 0.36, 0.36]} hole={0.17} bevel={0.05}>
          <Mat c={C.cream} r={0.8} bump={plaster} bs={0.8} />
        </Block>
        <group position={[0, 0.38, 0]}>
          <Block w={3.19} d={3.19} h={0.06} radii={[0.92, 0.38, 0.38, 0.38]} hole={0.2} bevel={0.02}>
            <Mat c={C.cap} r={0.6} />
          </Block>
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
          <shapeGeometry args={[roundedShape(2.85, 2.85, [0.75, 0.22, 0.22, 0.22]), 40]} />
          <meshStandardMaterial map={t.gravel} bumpMap={t.gravelBump} bumpScale={1.5} roughness={0.95} />
        </mesh>
        <RoofProps />
      </group>

      {/* ----- +Z facade ----- */}
      <group position={[0, 0, gh]}>
        {/* bay shop window with a real display inside */}
        <group position={[-0.62, 0.72, 0]}>
          <RoundedBox args={[1.2, 1.08, 0.22]} radius={0.035} smoothness={3} position={[0, 0, 0.1]}>
            <Mat c="#3a3e44" r={0.4} m={0.4} />
          </RoundedBox>
          <mesh position={[0, 0, 0.212]}>
            <planeGeometry args={[1.04, 0.92]} />
            <meshStandardMaterial map={t.shopInside} roughness={0.8} />
          </mesh>
          {/* display: orange product, shelf, small devices */}
          <mesh position={[0, -0.33, 0.24]}>
            <boxGeometry args={[1.0, 0.04, 0.12]} />
            <Mat c="#f2efe9" r={0.5} />
          </mesh>
          <RoundedBox args={[0.34, 0.24, 0.06]} radius={0.02} smoothness={2} position={[-0.1, -0.18, 0.245]}>
            <Mat c={C.orange} r={0.4} />
          </RoundedBox>
          {[0.2, 0.32].map((x) => (
            <RoundedBox key={x} args={[0.07, 0.13, 0.015]} radius={0.008} smoothness={2} position={[x, -0.24, 0.26]}>
              <Mat c="#1c1d20" r={0.2} />
            </RoundedBox>
          ))}
          <mesh position={[0, 0, 0.3]} userData={{ noCast: true }}>
            <planeGeometry args={[1.04, 0.92]} />
            <meshPhysicalMaterial color="#dfe9ef" transparent opacity={0.14} roughness={0.03} clearcoat={1} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.5, 0.18]}>
            <boxGeometry args={[1.28, 0.06, 0.32]} />
            <Mat c={C.cap} r={0.6} />
          </mesh>
          <group position={[0.04, 0.68, 0.06]}>
            <SignBox w={0.98} h={0.21} map={t.shopSign} color={C.orange} />
          </group>
        </group>
      </group>
      <group position={[0, 0, uh]}>
        {/* slate panel with logo */}
        <group position={[-0.78, GF.h + 0.62, 0.035]}>
          <RoundedBox args={[1.08, 1.32, 0.07]} radius={0.02} smoothness={2}>
            <Mat c={C.slateDark} r={0.55} m={0.15} />
          </RoundedBox>
        </group>
        <group position={[-0.78, GF.h + 0.72, 0.1]}>
          {/* Hindra's deer badge: a full black disc, the logo round on top */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.33, 0.33, 0.06, 48]} />
            <Mat c="#111111" r={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.031]}>
            <circleGeometry args={[0.31, 48]} />
            <meshStandardMaterial map={t.logo} transparent roughness={0.35} emissive="#ffffff" emissiveMap={t.logo} emissiveIntensity={0.15} />
          </mesh>
        </group>
        <DrainPipe x={-0.15} top={roofY + 0.25} />
        <group position={[0.3, GF.h + 0.68, 0.04]}>
          <Window w={0.56} h={0.72} t={t.upperGlass} />
        </group>
      </group>

      {/* ----- +X facade ----- */}
      <group position={[uh, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <group position={[0.3, GF.h + 0.66, 0.04]}>
          <Window w={1.15} h={0.8} t={t.upperGlass} />
        </group>
      </group>
      <group position={[gh, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Awning />
        <group position={[0.35, 1.08, 0.04]}>
          <SignBox w={1.12} h={0.23} map={t.menu} color={C.red} />
        </group>
        <group position={[0.35, 0.6, 0.03]}>
          <RoundedBox args={[1.14, 0.68, 0.08]} radius={0.025} smoothness={3}>
            <Mat c={C.orange} r={0.45} />
          </RoundedBox>
          <mesh position={[0, 0, 0.042]}>
            <planeGeometry args={[1.02, 0.56]} />
            <meshPhysicalMaterial map={t.grid} roughness={0.06} clearcoat={1} />
          </mesh>
          {[-0.255, 0, 0.255].map((x) => (
            <mesh key={x} position={[x, 0, 0.05]}>
              <boxGeometry args={[0.03, 0.56, 0.02]} />
              <Mat c={C.cap} r={0.5} />
            </mesh>
          ))}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[1.02, 0.03, 0.02]} />
            <Mat c={C.cap} r={0.5} />
          </mesh>
          <RoundedBox args={[1.22, 0.05, 0.16]} radius={0.015} smoothness={2} position={[0, -0.37, 0.05]}>
            <Mat c={C.cap} r={0.6} />
          </RoundedBox>
        </group>
      </group>

      {/* ----- curved glass door on the corner ----- */}
      <group position={[dc, 0, dc]}>
        <mesh position={[0, 0.66, 0]}>
          <cylinderGeometry args={[GF.r + 0.004, GF.r + 0.004, 1.2, 48, 1, true, 0.04, Math.PI / 2 - 0.08]} />
          <meshStandardMaterial map={t.doorInside} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.66, 0]} userData={{ noCast: true }}>
          <cylinderGeometry args={[GF.r + 0.06, GF.r + 0.06, 1.2, 48, 1, true, 0.04, Math.PI / 2 - 0.08]} />
          <meshPhysicalMaterial color="#dbe7ee" transparent opacity={0.18} roughness={0.03} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* header, threshold, step */}
        {[[1.29, 0.07], [0.035, 0.035]].map(([y, h]) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[GF.r + 0.09, GF.r + 0.09, h, 48, 1, false, 0, Math.PI / 2]} />
            <Mat c="#c6ccd2" r={0.3} m={0.6} />
          </mesh>
        ))}
        <mesh position={[0, -0.015, 0]}>
          <cylinderGeometry args={[GF.r + 0.22, GF.r + 0.22, 0.04, 48, 1, false, 0, Math.PI / 2]} />
          <Mat c="#d9d9dc" r={0.6} />
        </mesh>
        {[0.04, 0.42, 0.79, 1.15, Math.PI / 2 - 0.04].map((a) => (
          <mesh key={a} position={[Math.sin(a) * (GF.r + 0.065), 0.66, Math.cos(a) * (GF.r + 0.065)]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.04, 1.22, 0.04]} />
            <Mat c="#c6ccd2" r={0.3} m={0.6} />
          </mesh>
        ))}
        {[0.66, 0.92].map((a) => (
          <mesh key={a} position={[Math.sin(a) * (GF.r + 0.11), 0.68, Math.cos(a) * (GF.r + 0.11)]}>
            <cylinderGeometry args={[0.012, 0.012, 0.36, 8]} />
            <Mat c="#a7adb4" r={0.2} m={0.9} />
          </mesh>
        ))}
      </group>

      {/* wall lamp by the door */}
      <group position={[gh + 0.02, 1.32, -0.38]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[0.08, 0.14, 0.04]} />
          <Mat c={C.black} r={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function DrainPipe({ x, top }: { x: number; top: number }) {
  const elbow = useMemo(() => {
    const c = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, top - 0.35, 0.07),
      new THREE.Vector3(0, top - 0.15, 0.07),
      new THREE.Vector3(0, top - 0.12, -0.05),
      new THREE.Vector3(0, top, -0.12),
    );
    return new THREE.TubeGeometry(c, 20, 0.035, 12);
  }, [top]);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, (top - 0.35 + 0.18) / 2, 0.07]}>
        <cylinderGeometry args={[0.035, 0.035, top - 0.35 - 0.18, 14]} />
        <Mat c={C.black} r={0.35} m={0.3} />
      </mesh>
      <mesh geometry={elbow}>
        <Mat c={C.black} r={0.35} m={0.3} />
      </mesh>
      {/* shoe */}
      <mesh position={[0, 0.14, 0.1]} rotation={[0.7, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.12, 14]} />
        <Mat c={C.black} r={0.35} m={0.3} />
      </mesh>
      {[0.5, 1.3, 2.1].map((y) => (
        <mesh key={y} position={[0, y, 0.05]}>
          <boxGeometry args={[0.1, 0.03, 0.06]} />
          <Mat c="#3b3d41" r={0.4} m={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Awning() {
  const scallops = 9;
  const w = 1.36;
  return (
    <group position={[0.35, 1.52, 0]}>
      <mesh position={[0, -0.08, 0.25]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[w, 0.04, 0.54]} />
        <Mat c={C.awning} r={0.75} bump={stucco()} bs={0.3} />
      </mesh>
      {/* stripes */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.11 + i * 0.228, -0.056, 0.25]} rotation={[0.42, 0, 0]}>
          <boxGeometry args={[0.1, 0.004, 0.54]} />
          <Mat c="#f58743" r={0.75} />
        </mesh>
      ))}
      {/* scalloped valance */}
      <mesh position={[0, -0.25, 0.49]}>
        <boxGeometry args={[w, 0.1, 0.03]} />
        <Mat c="#df5e19" r={0.75} />
      </mesh>
      {Array.from({ length: scallops }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (w / scallops) * (i + 0.5), -0.3, 0.49]} rotation={[0, 0, Math.PI]}>
          <cylinderGeometry args={[w / scallops / 2, w / scallops / 2, 0.03, 16, 1, false, -Math.PI / 2, Math.PI]} />
          <Mat c="#df5e19" r={0.75} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (w / 2 - 0.01), -0.12, 0.24]} rotation={[0, Math.PI / 2, 0]}>
            <shapeGeometry args={[sideShape(), 1]} />
            <meshStandardMaterial color="#df5e19" roughness={0.75} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[s * 0.6, -0.2, 0.22]} rotation={[-0.75, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
            <Mat c={C.black} r={0.4} m={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function sideShape() {
  const s = new THREE.Shape();
  s.moveTo(0.27, 0.1);
  s.lineTo(-0.24, -0.12);
  s.lineTo(-0.24, -0.2);
  s.lineTo(0.27, 0.1);
  return s;
}

function RoofProps() {
  const pipe = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, 0.25, 0.45),
      new THREE.Vector3(-0.75, 0.08, 0.6),
      new THREE.Vector3(-1.1, 0.06, 0.75),
      new THREE.Vector3(-1.3, 0.12, 1.1),
      new THREE.Vector3(-1.32, 0.3, 1.35),
    ]);
    return new THREE.TubeGeometry(c, 40, 0.022, 8);
  }, []);
  return (
    <group position={[0, 0.16, 0]}>
      {/* AC unit on rubber base */}
      <group position={[-0.2, 0, 0.15]}>
        <RoundedBox args={[1.02, 0.07, 0.78]} radius={0.02} smoothness={2} position={[0, 0.035, 0]}>
          <Mat c="#1b1c1f" r={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.82, 0.48, 0.56]} radius={0.04} smoothness={3} position={[0, 0.31, 0]}>
          <Mat c="#e6e8eb" r={0.4} m={0.15} />
        </RoundedBox>
        {[-0.19, 0.19].map((x) => (
          <group key={x} position={[x, 0.31, 0.282]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.01, 32]} />
              <Mat c="#3e4248" r={0.6} />
            </mesh>
            {[0.14, 0.1, 0.06].map((r) => (
              <mesh key={r} position={[0, 0, 0.008]}>
                <torusGeometry args={[r, 0.008, 6, 32]} />
                <Mat c="#cfd3d8" r={0.4} m={0.4} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0.012]}>
              <cylinderGeometry args={[0.02, 0.02, 0.01, 12]} />
              <Mat c="#cfd3d8" r={0.4} m={0.4} />
            </mesh>
          </group>
        ))}
        {/* top grille lines */}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[-0.3 + i * 0.1, 0.556, 0]}>
            <boxGeometry args={[0.015, 0.006, 0.46]} />
            <Mat c="#b9bec4" r={0.5} />
          </mesh>
        ))}
      </group>
      <mesh geometry={pipe}>
        <Mat c="#dad7d0" r={0.6} />
      </mesh>
      {/* antenna */}
      <group position={[-1.05, 0, -0.85]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.1, 0.13, 0.06, 20]} />
          <Mat c={C.black} r={0.6} />
        </mesh>
        <mesh position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.03, 0.035, 0.86, 14]} />
          <Mat c={C.black} r={0.35} m={0.4} />
        </mesh>
        <mesh position={[0, 0.91, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.09, 14]} />
          <Mat c={C.black} r={0.35} m={0.4} />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.2, 0.012, 0.012]} />
          <Mat c={C.black} r={0.35} m={0.4} />
        </mesh>
      </group>
      {/* vent pipe with flashing and cap */}
      <group position={[0.75, 0, -0.85]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.24, 0.27, 0.06, 28]} />
          <Mat c="#1b1c1f" r={0.8} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.095, 0.17, 0.14, 24]} />
          <Mat c={C.black} r={0.4} m={0.3} />
        </mesh>
        <mesh position={[0, 0.56, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.8, 24]} />
          <Mat c={C.black} r={0.3} m={0.4} />
        </mesh>
        <mesh position={[0, 1.04, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.22, 24]} />
          <Mat c="#c2c7cd" r={0.22} m={0.85} />
        </mesh>
        <mesh position={[0, 1.155, 0]}>
          <cylinderGeometry args={[0.07, 0.1, 0.02, 24]} />
          <Mat c="#9ba1a8" r={0.3} m={0.8} />
        </mesh>
      </group>
      {/* rolled tubes */}
      <group position={[0.7, 0.07, 0.4]} rotation={[0, 0.5, 0]}>
        {[
          { p: [0, 0, 0], r: 0.07, l: 0.72, y: 0 },
          { p: [0.04, 0.0, 0.17], r: 0.06, l: 0.56, y: -0.3 },
          { p: [0.12, 0.0, -0.18], r: 0.045, l: 0.32, y: 0.6 },
        ].map((tb, i) => (
          <group key={i} position={tb.p as [number, number, number]} rotation={[0, tb.y, Math.PI / 2]}>
            <mesh>
              <cylinderGeometry args={[tb.r, tb.r, tb.l, 24]} />
              <Mat c={["#efede8", "#e2dfd8", "#d6d3cc"][i]} r={0.55} />
            </mesh>
            <mesh position={[0, tb.l / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[tb.r * 0.35, tb.r, 24]} />
              <Mat c="#c9c5bd" r={0.7} />
            </mesh>
          </group>
        ))}
      </group>
      {/* roof hatch + drain */}
      <RoundedBox args={[0.42, 0.1, 0.42]} radius={0.02} smoothness={2} position={[0.55, 0.05, -0.15]}>
        <Mat c="#8f959c" r={0.5} m={0.3} />
      </RoundedBox>
      <mesh position={[-1.1, 0.005, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 20]} />
        <Mat c="#2a2b2e" r={0.4} m={0.5} />
      </mesh>
    </group>
  );
}

/* ---------- props ---------- */
function StreetLamp({ position, flip = false }: { position: [number, number, number]; flip?: boolean }) {
  const parts = useMemo(() => {
    const s = flip ? -1 : 1;
    const a = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, 1.72, 0), new THREE.Vector3(0, 2.08, 0),
      new THREE.Vector3(0.44 * s, 2.18, 0), new THREE.Vector3(0.5 * s, 1.9, 0),
    );
    const b = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, 1.42, 0), new THREE.Vector3(0, 1.62, 0),
      new THREE.Vector3(-0.38 * s, 1.74, 0), new THREE.Vector3(-0.42 * s, 1.52, 0),
    );
    // decorative scroll under the upper arm
    const curl = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.02 * s, 1.62, 0), new THREE.Vector3(0.16 * s, 1.66, 0),
      new THREE.Vector3(0.24 * s, 1.78, 0), new THREE.Vector3(0.18 * s, 1.86, 0),
      new THREE.Vector3(0.11 * s, 1.8, 0),
    ]);
    return {
      arms: [a, b].map((c) => ({ geo: new THREE.TubeGeometry(c, 48, 0.026, 10), end: c.getPoint(1) })),
      curl: new THREE.TubeGeometry(curl, 32, 0.012, 6),
    };
  }, [flip]);
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.13, 0.17, 0.1, 28]} />
        <Mat c={C.black} r={0.45} m={0.4} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 0.16, 24]} />
        <Mat c={C.black} r={0.45} m={0.4} />
      </mesh>
      {[0.28, 0.9, 1.4].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.048, 0.014, 8, 24]} />
          <Mat c={C.black} r={0.4} m={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.034, 0.048, 1.6, 20]} />
        <Mat c={C.black} r={0.35} m={0.4} />
      </mesh>
      <mesh position={[0, 1.96, 0]}>
        <sphereGeometry args={[0.048, 16, 12]} />
        <Mat c={C.black} r={0.35} m={0.4} />
      </mesh>
      <mesh position={[0, 2.02, 0]}>
        <coneGeometry args={[0.025, 0.08, 12]} />
        <Mat c={C.black} r={0.35} m={0.4} />
      </mesh>
      <mesh geometry={parts.curl}>
        <Mat c={C.black} r={0.35} m={0.4} />
      </mesh>
      {parts.arms.map(({ geo, end }, i) => (
        <group key={i}>
          <mesh geometry={geo}>
            <Mat c={C.black} r={0.35} m={0.4} />
          </mesh>
          <group position={end}>
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.03, 0.13, 0.1, 28]} />
              <Mat c={C.black} r={0.35} m={0.4} />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <torusGeometry args={[0.13, 0.008, 6, 28]} />
              <Mat c={C.black} r={0.35} m={0.4} />
            </mesh>
            <mesh position={[0, -0.1, 0]} userData={{ noCast: true }}>
              <sphereGeometry args={[0.075, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <meshStandardMaterial color="#fff6dc" emissive="#ffd790" emissiveIntensity={1.4} roughness={0.3} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  const branches = useMemo(
    () =>
      [
        [new THREE.Vector3(0, 0.75, 0), new THREE.Vector3(0.18, 1.05, 0.08), new THREE.Vector3(0.32, 1.35, 0.1)],
        [new THREE.Vector3(0, 0.85, 0), new THREE.Vector3(-0.2, 1.1, -0.05), new THREE.Vector3(-0.3, 1.4, -0.12)],
        [new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0.02, 1.25, -0.18), new THREE.Vector3(0.0, 1.55, -0.25)],
      ].map((pts) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.03, 6)),
    [],
  );
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.055, 0.085, 1.0, 12]} />
        <Mat c="#6a4a33" r={0.95} bump={stucco()} bs={2} />
      </mesh>
      {branches.map((g, i) => (
        <mesh key={i} geometry={g}>
          <Mat c="#6a4a33" r={0.95} />
        </mesh>
      ))}
      {/* small tree grate */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.3, 32]} />
        <Mat c="#3a3b3e" r={0.5} m={0.5} />
      </mesh>
      <group position={[0, 1.5, 0]}>
        <Foliage count={260} radius={0.7} blob={0.12} seed={21} squash={1.02} palette={C.leaf} />
      </group>
      <group position={[0.28, 1.25, 0.25]}>
        <Foliage count={70} radius={0.36} blob={0.1} seed={22} palette={C.leaf} />
      </group>
      <group position={[-0.3, 1.35, 0.15]}>
        <Foliage count={60} radius={0.32} blob={0.1} seed={23} palette={C.leaf} />
      </group>
    </group>
  );
}

function Washer({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.25, 0]}>
      <RoundedBox args={[0.62, 0.44, 0.56]} radius={0.05} smoothness={4} position={[0, 0.22, 0]}>
        <Mat c={C.orange} r={0.35} />
      </RoundedBox>
      <RoundedBox args={[0.62, 0.2, 0.56]} radius={0.05} smoothness={4} position={[0, 0.52, 0]}>
        <Mat c="#f3f2ef" r={0.3} />
      </RoundedBox>
      {/* control strip */}
      <mesh position={[0.12, 0.53, 0.282]}>
        <boxGeometry args={[0.24, 0.08, 0.01]} />
        <Mat c="#1e2023" r={0.2} e="#5ec0ff" ei={0.25} />
      </mesh>
      <mesh position={[-0.18, 0.53, 0.285]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 24]} />
        <Mat c="#cfd3d8" r={0.25} m={0.6} />
      </mesh>
      <group position={[0, 0.28, 0.285]}>
        <mesh>
          <torusGeometry args={[0.15, 0.04, 16, 40]} />
          <Mat c="#f3f2ef" r={0.3} />
        </mesh>
        <mesh position={[0, 0, -0.005]}>
          <circleGeometry args={[0.14, 40]} />
          <meshPhysicalMaterial color="#2f3943" roughness={0.05} clearcoat={1} />
        </mesh>
        <mesh position={[0.17, 0, 0.02]}>
          <boxGeometry args={[0.03, 0.08, 0.03]} />
          <Mat c="#cfd3d8" r={0.25} m={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function CameraProp({ position }: { position: [number, number, number] }) {
  const grip = ctex("cam-grip", 64, 64, (g, w, h) => noise(g, w, h, 33, 128, 120, 1.5), { repeat: [4, 2], color: false });
  return (
    <group position={position} rotation={[0, -0.35, 0]}>
      <RoundedBox args={[0.64, 0.05, 0.48]} radius={0.02} smoothness={2} position={[0, 0.025, 0]}>
        <Mat c={C.wood} r={0.6} bump={stucco()} bs={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.44, 0.22, 0.18]} radius={0.04} smoothness={3} position={[0, 0.16, 0]}>
        <Mat c="#3c3f44" r={0.8} bump={grip} bs={1.5} />
      </RoundedBox>
      <RoundedBox args={[0.44, 0.07, 0.18]} radius={0.025} smoothness={3} position={[0, 0.3, 0]}>
        <Mat c="#c7cbd0" r={0.25} m={0.75} />
      </RoundedBox>
      <RoundedBox args={[0.13, 0.08, 0.13]} radius={0.015} smoothness={2} position={[-0.1, 0.36, 0]}>
        <Mat c="#2a2c30" r={0.4} />
      </RoundedBox>
      <mesh position={[0.13, 0.35, 0.02]}>
        <cylinderGeometry args={[0.03, 0.03, 0.04, 20]} />
        <Mat c="#c7cbd0" r={0.25} m={0.75} />
      </mesh>
      <mesh position={[0.06, 0.345, 0.04]}>
        <cylinderGeometry args={[0.015, 0.015, 0.03, 16]} />
        <Mat c="#d6393e" r={0.35} />
      </mesh>
      <group position={[0.02, 0.16, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.092, 0.092, 0.1, 32]} />
          <Mat c="#2a2c30" r={0.5} />
        </mesh>
        {[0.03, 0.07].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <torusGeometry args={[0.093, 0.006, 6, 32]} />
            <Mat c="#55595f" r={0.4} m={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.105, 0]}>
          <cylinderGeometry args={[0.078, 0.084, 0.02, 32]} />
          <Mat c="#c7cbd0" r={0.25} m={0.75} />
        </mesh>
        <mesh position={[0, 0.116, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.062, 32]} />
          <meshPhysicalMaterial color="#1b2a39" roughness={0.02} metalness={0.4} clearcoat={1} iridescence={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function Pot({ rTop, rBottom, h }: { rTop: number; rBottom: number; h: number }) {
  const soil = ctex("soil", 64, 64, (g, w, hh) => noise(g, w, hh, 8, 128, 160, 2), { color: false });
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[rTop, rBottom, h, 36]} />
        <Mat c={C.pot} r={0.75} bump={stucco()} bs={0.6} />
      </mesh>
      <mesh position={[0, h - 0.03, 0]}>
        <cylinderGeometry args={[rTop + 0.025, rTop + 0.015, 0.07, 36]} />
        <Mat c="#cf6532" r={0.75} />
      </mesh>
      <mesh position={[0, h - 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[rTop - 0.005, 36]} />
        <Mat c="#43302a" r={1} bump={soil} bs={2} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[rBottom + 0.03, rBottom + 0.03, 0.02, 36]} />
        <Mat c="#b95a2b" r={0.8} />
      </mesh>
    </group>
  );
}

function FlowerPot({ position }: { position: [number, number, number] }) {
  const flowers = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 18 }, () => {
      const a = r() * Math.PI * 2;
      const d = 0.04 + r() * 0.15;
      return { p: [Math.cos(a) * d, 0.1 + r() * 0.08 - d * 0.3, Math.sin(a) * d] as [number, number, number], c: r() };
    });
  }, []);
  return (
    <group position={position}>
      <Pot rTop={0.2} rBottom={0.14} h={0.3} />
      <group position={[0, 0.36, 0]}>
        <Foliage count={70} radius={0.2} blob={0.05} seed={9} squash={0.7} palette={C.leaf} />
        {flowers.map((f, i) => (
          <group key={i} position={f.p}>
            {[0, 1, 2, 3, 4].map((k) => (
              <mesh key={k} position={[Math.cos(k * 1.256) * 0.022, 0, Math.sin(k * 1.256) * 0.022]} scale={[1, 0.5, 1]}>
                <sphereGeometry args={[0.02, 8, 6]} />
                <Mat c={f.c > 0.6 ? "#f6a9c4" : f.c > 0.3 ? "#e8638f" : "#ffffff"} r={0.6} />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.012, 8, 6]} />
              <Mat c="#ffd04a" r={0.6} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function LeafPlant({ position }: { position: [number, number, number] }) {
  const leaves = useMemo(() => {
    const r = rng(17);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.07, 0.15, 0, 0.38);
    shape.quadraticCurveTo(-0.07, 0.15, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 8);
    // fold the leaf a little along its spine
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.abs(x) * 0.6 + y * y * 0.6);
    }
    geo.computeVertexNormals();
    return {
      geo,
      list: Array.from({ length: 22 }, (_, i) => ({
        a: (i / 22) * Math.PI * 2 + r() * 0.3,
        tilt: 0.25 + r() * 0.75,
        s: 0.75 + r() * 0.5,
        c: C.leaf[Math.floor(r() * C.leaf.length)],
      })),
    };
  }, []);
  return (
    <group position={position}>
      <Pot rTop={0.24} rBottom={0.17} h={0.36} />
      <group position={[0, 0.34, 0]}>
        {leaves.list.map((l, i) => (
          <group key={i} rotation={[0, l.a, 0]}>
            <mesh geometry={leaves.geo} rotation={[-l.tilt, 0, 0]} scale={l.s}>
              <meshStandardMaterial color={l.c} roughness={0.55} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function SandwichBoard({
  position, rotation = 0, frame, scale = 1, map,
}: { position: [number, number, number]; rotation?: number; frame: string; scale?: number; map: THREE.Texture }) {
  const tilt = 0.2;
  const H = 0.78;
  const top = H * Math.cos(tilt);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {[1, -1].map((s) => (
        <group key={s} position={[0, top, 0]} rotation={[s * tilt, s === 1 ? 0 : Math.PI, 0]}>
          <group position={[0, -H / 2, 0]}>
            <RoundedBox args={[0.52, H, 0.035]} radius={0.012} smoothness={2}>
              <Mat c={frame} r={0.6} bump={stucco()} bs={0.4} />
            </RoundedBox>
            <mesh position={[0, 0.02, 0.019]}>
              <planeGeometry args={[0.42, H - 0.14]} />
              <meshStandardMaterial map={map} roughness={0.95} />
            </mesh>
          </group>
        </group>
      ))}
      <mesh position={[0, top - 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.54, 8]} />
        <Mat c="#8a8f96" r={0.3} m={0.8} />
      </mesh>
    </group>
  );
}

/* ---------- block ---------- */
export default function MiBlock() {
  const t = T();
  return (
    <group>
      <Platform relief={t.relief} reliefBump={t.reliefBump} tiles={t.tiles} tilesBump={t.tilesBump} plinth={C.terracotta} cap="#d9d6d0" />
      <Building t={t} />
      <group position={[0, 0.045, 0]}>
        <Tree position={[-2.55, 0, 0.75]} />
        <Washer position={[-2.7, 0, 1.95]} />
        <StreetLamp position={[-1.6, 0, 2.1]} />
        <StreetLamp position={[0.2, 0, 2.35]} flip />
        <CameraProp position={[0.95, 0, 2.7]} />
        <FlowerPot position={[1.8, 0, 2.6]} />
        <SandwichBoard position={[1.45, 0, 1.55]} rotation={0.6} frame={C.wood} scale={0.8} map={t.chalk[1]} />
        <SandwichBoard position={[2.15, 0, 0.55]} rotation={1.1} frame="#efe8dc" map={t.chalk[0]} />
        <SandwichBoard position={[2.55, 0, -0.65]} rotation={1.35} frame={C.wood} scale={0.9} map={t.chalk[2]} />
        <LeafPlant position={[2.55, 0, -2.0]} />
      </group>
    </group>
  );
}
