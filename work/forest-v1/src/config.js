// All spatial dimensions are in world units. 1 unit = 10 design pixels.
// Camera is deliberately fixed: no orbit, drag, or perspective controls.
export const ART = {
  seed: 38271,
  tile: { designPixels: 100, worldSize: 10, top: 0.28, depth: 0.48, edgeHeight: 0.28 },
  camera: { azimuth: 45, elevation: 32, viewHeight: 14.9, target: [0, 1.2, 0] },
  palette: {
    background: '#f4f3eb', grass: '#829d57', grassLight: '#afbd75',
    leaves: '#628538', leafLight: '#9eaf55', bark: '#76624a',
    soil: '#a3956c', plaster: '#ece5cb', timber: '#847153',
    roof: '#ba6047', roofLight: '#d17a59', glass: '#789c9c', path: '#c6bb92',
  },
  light: { sun: 3.0, fill: 1.65, exposure: 1.05, position: [-3.5, 9, 6], shadowSize: 2048 },
  material: { roughness: 0.9, bump: 0.028 },
  vegetation: { canopyScale: 1, grassClumps: 850, breeze: true, sway: 0.008 },
  rendering: { maxPixelRatio: 1.75, targetFPS: 30, ao: true },
};

// Neighbor tiles snap by exactly worldSize along X or Z. Edges stay at a
// common elevation. The south path connector is centered at x=1.65.
export const TILE_SPEC = Object.freeze({
  id: 'forest-01', footprint: { width: 100, height: 100, unit: 'design-px' },
  unitsPerDesignPixel: 0.1, edgeElevation: 0.28,
  connectors: { north: 'meadow', east: 'meadow', west: 'meadow', south: { type: 'path', offset: 16.5, width: 13 } },
});

export function seededRandom(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}

export function groundHeight(x, z) {
  const edge = Math.max(0, Math.min(1, (5 - Math.max(Math.abs(x), Math.abs(z))) / 1.4));
  return ART.tile.top + edge * (0.035 + Math.sin(x * 0.8 + z * 0.6) * 0.022 + Math.cos(z * 1.2 - x * 0.35) * 0.018);
}
