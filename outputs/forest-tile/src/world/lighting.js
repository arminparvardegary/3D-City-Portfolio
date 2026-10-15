import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { THEME } from './theme.js';

// Lighting presets: one object describes the whole look of a time of day, so
// every tile shares the same light and a new mood is one new entry.
export const LIGHTING = {
  storybook: THEME.light,
  daylight: {
    sun: { color: '#fffaf1', intensity: 2.9, azimuth: -30, elevation: 52, softness: 21 },
    sky: { color: '#f6f8fc', ground: '#bbc6b5', intensity: 1.55 },
    fill: { color: '#dfeaf3', intensity: 0.55 },
    env: 0.12,
    exposure: 1.0,
    toneMapping: 'aces',
    fog: { enabled: true, color: '#f1f2f1', near: 30, far: 64 },
    ao: { intensity: 2.4, radius: 0.5, falloff: 0.4, color: '#1c2a14' },
  },
};

export function createLights(scene) {
  const sky = new THREE.HemisphereLight();
  scene.add(sky);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  scene.add(sun, sun.target);
  // The shadow camera tightly fits one tile (with room for the tallest tree's shadow).
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 });
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.00012;
  const fill = new THREE.DirectionalLight();
  fill.position.set(5, 4, -5);
  scene.add(fill);
  return { sky, sun, fill };
}

// A real sky (physical sky model, sun placed where the scene's sun is),
// prefiltered once: glass, water and paint reflect a believable daylight sky.
export function createEnvironment(renderer, L) {
  const sky = new Sky();
  sky.scale.setScalar(1000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2;
  u.rayleigh.value = 1.4;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  const a = THREE.MathUtils.degToRad(L.sun.azimuth),
    e = THREE.MathUtils.degToRad(L.sun.elevation);
  u.sunPosition.value.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  const scene = new THREE.Scene();
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer),
    env = pmrem.fromScene(scene, 0, 0.1, 1000).texture;
  pmrem.dispose();
  sky.geometry.dispose();
  sky.material.dispose();
  return env;
}

export function applyLighting(L, { sky, sun, fill }, scene) {
  sky.color.set(L.sky.color);
  sky.groundColor.set(L.sky.ground);
  sky.intensity = L.sky.intensity;
  sun.color.set(L.sun.color);
  sun.intensity = L.sun.intensity;
  sun.shadow.radius = L.sun.softness;
  const a = THREE.MathUtils.degToRad(L.sun.azimuth),
    e = THREE.MathUtils.degToRad(L.sun.elevation),
    d = 12;
  sun.position.set(Math.sin(a) * Math.cos(e) * d, Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d);
  fill.color.set(L.fill.color);
  fill.intensity = L.fill.intensity;
  scene.environmentIntensity = L.env;
  if (L.fog.enabled) {
    scene.fog ??= new THREE.Fog();
    scene.fog.color.set(L.fog.color);
    scene.fog.near = L.fog.near;
    scene.fog.far = L.fog.far;
  } else scene.fog = null;
}
