import { THEME } from './world/theme.js';

// All spatial dimensions are in world units. 1 unit = 10 design pixels.
// Camera is deliberately fixed: no orbit, drag, or perspective controls.
export const ART = {
  seed: 38271,
  tile: { designPixels: 100, worldSize: 10, top: 0.12, depth: 0.12, edgeHeight: 0.12 },
  camera: { azimuth: 45, elevation: 35.264, viewHeight: 13.9, target: [0, 1.05, 0] },
  palette: {
    background: THEME.sky.horizon, grass: THEME.palette.grass, grassLight: THEME.palette.grassLight,
    leaves: THEME.palette.leaves, leafLight: THEME.palette.leafLight, bark: THEME.palette.bark,
    soil: THEME.palette.soil, plaster: THEME.palette.plaster, timber: THEME.palette.timber,
    roof: THEME.palette.roof, roofLight: THEME.palette.roofLight, glass: THEME.palette.glass, path: THEME.palette.path,
    car: '#e8574a', parking: THEME.palette.parking, trim: THEME.palette.trim,
  },

  light: { sun: 3.0, fill: 1.8, exposure: 1.05, position: [-3.5, 9, 6], shadowSize: 2048, shadowSoftness: 21 },
  material: { roughness: 0.9, bump: 0.002 },
  vegetation: { canopyScale: 1, grassClumps: 0, breeze: true, sway: 0.004 },
  house: { position: [-1.5, 0.12, -0.7], width: 2.9, depth: 3.1, wallHeight: 2.12, roofRise: 1.17 },
  car: { position: [2.2, 0.145, 0.95], rotation: 0, scale: 1 },
  rendering: { maxPixelRatio: 1.75, targetFPS: 30, ao: true },
};

// Neighbor tiles snap by exactly worldSize along X or Z. Edges stay at a
// common elevation. The south driveway connects to a future street tile.
export const TILE_SPEC = Object.freeze({
  id: 'my-house-01', footprint: { width: 100, height: 100, unit: 'design-px' },
  unitsPerDesignPixel: 0.1, edgeElevation: 0.12,
  connectors: { north: 'lawn', east: 'lawn', west: 'lawn', south: { type: 'driveway', offset: 22, width: 28, elevation: 0.145 } },
});

export function seededRandom(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}

export function groundHeight(x, z) {
  return ART.tile.top;
}
