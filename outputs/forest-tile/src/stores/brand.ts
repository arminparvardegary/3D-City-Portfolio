import * as THREE from "three";

// Armin's companies on the store blocks: names, colours and logo images.
export const BRAND = {
  rush: { name: "Rush Graphics", short: "RUSH", sub: "GRAPHICS", color: "#ff6b5e", dark: "#141416" },
  hindra: { name: "Hindra Studio", short: "HINDRA", sub: "STUDIO", color: "#5ab4f0", dark: "#121212", logo: "logos/hindra.png" },
  aaq: { name: "AAQ Properties", short: "AAQ", sub: "PROPERTIES", color: "#c9a957", dark: "#58585a", logo: "logos/aaq.png" },
  bigup: { name: "Big Uppetite", short: "Big Uppetite", sub: "BU", color: "#ffc93a", dark: "#2a211a", logo: "logos/biguppetite.svg", logoWhite: "logos/biguppetite-white.svg" },
  keel: { name: "Keel", short: "Keel", sub: "Your AI assistant", color: "#2f6bff", dark: "#1d1d1f", logo: "keel/avatar.jpg", banner: "keel/pose-chat.webp" },
};
export const url = (p: string) => `${import.meta.env.BASE_URL}${p}`;

// A canvas texture drawn now and drawn again once its images have loaded.
const cache = new Map<string, THREE.CanvasTexture>();
export function imgTex(key: string, w: number, h: number, srcs: string[], draw: (g: CanvasRenderingContext2D, imgs: (HTMLImageElement | null)[]) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const imgs = srcs.map((s) => { const im = new Image(); im.src = url(s); return im; });
  const paint = () => { g.clearRect(0, 0, w, h); draw(g, imgs.map((im) => (im.complete && im.naturalWidth ? im : null))); t.needsUpdate = true; };
  paint();
  imgs.forEach((im) => im.addEventListener("load", paint));
  cache.set(key, t);
  return t;
}
// Draw an image inside a box, keeping its proportions (bottom aligned).
export function contain(g: CanvasRenderingContext2D, im: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  if (!im) return;
  const s = Math.min(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s;
  g.drawImage(im, x + (w - iw) / 2, y + (h - ih), iw, ih);
}
// A round image (a logo in a circle).
export function round(g: CanvasRenderingContext2D, im: HTMLImageElement | null, cx: number, cy: number, r: number) {
  if (!im) return;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  const s = Math.max((2 * r) / im.naturalWidth, (2 * r) / im.naturalHeight);
  g.drawImage(im, cx - (im.naturalWidth * s) / 2, cy - (im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
  g.restore();
}
