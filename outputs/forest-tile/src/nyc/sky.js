import * as THREE from 'three';
import { THEME } from '../world/theme.js';
import { G } from './drive/layout.js';

// The night sky over a city: a dome (deep blue overhead, a light horizon, a glow
// round the sun) that follows the camera, stars, violet clouds drifting high, and
// steam rising from the street stacks (steam: their positions). update(dt, camera)
// moves it all.
export function createSky({ group, steam: stacks = [] }) {
  // Sky: a physically based sky dome (it follows the camera), clouds drifting high
  // over the city, and steam rising from the street stacks.
  // Sky dome: deep blue overhead fading to a light horizon, a warm glow round the sun.
  const sunDir = (() => {
    const L = THEME.nyc.light.sun,
      a = THREE.MathUtils.degToRad(L.azimuth),
      e = THREE.MathUtils.degToRad(L.elevation);
    return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  })();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        zenith: { value: new THREE.Color('#0a0826') },
        horizon: { value: new THREE.Color('#3b2a8f') },
        ground: { value: new THREE.Color('#140f38') },
        sun: { value: sunDir },
        glow: { value: new THREE.Color('#6d5cff') },
      },
      vertexShader:
        'varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;}',
      fragmentShader:
        'uniform vec3 zenith,horizon,ground,glow,sun;varying vec3 vDir;void main(){float h=vDir.y;vec3 c=h>0.?mix(horizon,zenith,pow(clamp(h,0.,1.),.55)):mix(horizon,ground,clamp(-h*3.,0.,1.));float s=max(dot(vDir,normalize(sun)),0.);c+=glow*(pow(s,48.)*.6+pow(s,6.)*.12);gl_FragColor=vec4(c,1.);}',
    }),
  );
  sky.renderOrder = -2;
  sky.frustumCulled = false;
  group.add(sky);
  const puffTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d'),
      gr = g.createRadialGradient(64, 64, 0, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.55, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const cloudTex = [0, 1, 2].map(v => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d');
    let r = 17 + v * 31;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) {
      const x = 60 + rnd() * 392,
        y = 165 - Math.sin(((x - 60) / 392) * Math.PI) * 95 + rnd() * 35,
        rad = 34 + rnd() * 60,
        gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,.95)');
      gr.addColorStop(0.6, 'rgba(246,248,252,.6)');
      gr.addColorStop(1, 'rgba(235,240,248,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const shade = g.createLinearGradient(0, 90, 0, 256);
    shade.addColorStop(0, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(196,206,222,.25)');
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = shade;
    g.fillRect(0, 0, 512, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  // Stars: a few hundred points on the dome, twinkle-free and cheap.
  {
    const N = 700,
      pos = new Float32Array(N * 3);
    let r = 11;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) {
      const u = rnd() * Math.PI * 2,
        v = 0.08 + rnd() * 0.9,
        R = 400;
      pos.set([Math.cos(u) * Math.cos(v) * R, Math.sin(v) * R, Math.sin(u) * Math.cos(v) * R], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: '#d8d4ff',
        size: 1.6,
        sizeAttenuation: false,
        fog: false,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    stars.renderOrder = -2;
    stars.frustumCulled = false;
    sky.add(stars);
  }
  const clouds = [];
  {
    let r = 5;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const m = new THREE.SpriteMaterial({
        map: cloudTex[i % 3],
        transparent: true,
        depthWrite: false,
        fog: false,
        opacity: 0.35,
        color: '#7b6cff',
      });
      const sp = new THREE.Sprite(m);
      const w = 120 + rnd() * 160;
      sp.scale.set(w, w * 0.55, 1);
      sp.position.set(-330 + rnd() * 660, 110 + rnd() * 60, -330 + rnd() * 660);
      sp.renderOrder = -1;
      group.add(sp);
      clouds.push(sp);
    }
  }
  const steamMat = new THREE.SpriteMaterial({
    map: puffTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.5,
    color: '#f2f3f5',
  });
  const steam = stacks.flatMap(p =>
    Array.from({ length: 7 }, (_, i) => {
      const sp = new THREE.Sprite(steamMat.clone());
      sp.userData = { x: p.x, z: p.z, age: (i / 7) * 3 };
      group.add(sp);
      return sp;
    }),
  );
  return {
    update(dt, camera) {
      if (camera) sky.position.copy(camera.position);
      // Seen from above (the builder's view) the clouds would hide the city.
      const above = camera?.position.y > 90;
      for (const c of clouds) {
        c.visible = !above;
        c.position.x += dt * 1.6;
        if (c.position.x > 340) c.position.x -= 680;
      }
      for (const sp of steam) {
        const u = sp.userData;
        u.age = (u.age + dt) % 3;
        const k = u.age / 3;
        sp.position.set(u.x + k * 1.2, G + 1.6 + k * 6, u.z);
        sp.scale.setScalar(0.8 + k * 4);
        sp.material.opacity = 0.45 * (1 - k) * Math.min(1, k * 6);
      }
    },
  };
}
