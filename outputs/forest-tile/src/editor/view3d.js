import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PITCH, planRects } from '../plan/plan.js';

// The builder's 3D view: the game, opened inside the builder (?city=mine&edit),
// with a camera that orbits over the whole city instead of chasing the car.
// The builder does the editing; this view only tells it where on the grid the
// pointer is (in grid units: avenue i is at gi = i, street j at gj = j) and shows
// what it asks for: the square you picked, and a merge in progress.
//
//   to the builder:   ready · click {g} · down / move / up {g} · drop {brush, g}
//   from the builder: tool {tool} · select {rect} · preview {rect}
// A rect is [i0, i1, j0, j1] in squares.

const ROAD_HALF = 6; // centre line to curb (layout.js HALF)
const send = msg => parent.postMessage({ city: true, ...msg }, location.origin);

export function createEditView({ camera, canvas, scene, plan, onRender }) {
  const { cols, rows } = plan,
    size = Math.max(cols, rows) * PITCH;
  camera.far = size * 6;
  camera.updateProjectionMatrix();

  // --- Camera: drag to turn, right drag (or two fingers) to move, wheel to zoom.
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.4; // never under the ground
  controls.minDistance = 25;
  controls.maxDistance = size * 4;
  controls.screenSpacePanning = false;
  // Where the camera was before the last update of the view (the builder reloads it).
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem('builder-camera'));
  } catch {}
  // The whole city in view, from the south and above (once the view knows its shape).
  function frame() {
    const v = THREE.MathUtils.degToRad(camera.fov) / 2,
      h = Math.atan(Math.tan(v) * camera.aspect),
      dist = (size * 0.56) / Math.tan(Math.min(v, h)),
      up = THREE.MathUtils.degToRad(52);
    controls.target.set(0, 0, 0);
    camera.position.set(0, Math.sin(up) * dist, Math.cos(up) * dist);
    controls.update();
  }
  const resumed = !!(saved?.p && saved?.t);
  if (resumed) {
    camera.position.fromArray(saved.p);
    controls.target.fromArray(saved.t);
  }
  controls.update();
  const keepCamera = () => {
    try {
      sessionStorage.setItem(
        'builder-camera',
        JSON.stringify({ p: camera.position.toArray(), t: controls.target.toArray() }),
      );
    } catch {}
  };
  controls.addEventListener('change', () => {
    // The target stays over the city.
    const t = controls.target,
      lim = size * 0.6;
    t.x = THREE.MathUtils.clamp(t.x, -lim, lim);
    t.z = THREE.MathUtils.clamp(t.z, -lim, lim);
    t.y = 0;
    onRender();
  });
  controls.addEventListener('end', keepCamera);

  // A tool (anything but Select) uses the left button and one finger; the camera
  // then turns with the right button or two fingers.
  let tool = 'select';
  function setTool(t) {
    tool = t;
    const free = t === 'select';
    controls.mouseButtons.LEFT = free ? THREE.MOUSE.ROTATE : -1;
    controls.mouseButtons.RIGHT = free ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.touches.ONE = free ? THREE.TOUCH.ROTATE : -1;
    canvas.style.cursor = free ? 'grab' : 'crosshair';
  }
  setTool('select');

  // --- Where the pointer is on the grid ------------------------------------------------
  const ray = new THREE.Raycaster(),
    ndc = new THREE.Vector2(),
    ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.12),
    hitAt = new THREE.Vector3();
  ray.params.Line.threshold = 0.1;
  ray.camera = camera; // sprites need it to be tested
  const overlay = new THREE.Group();
  overlay.name = 'builder-overlay';
  // Solid: the first thing under the pointer (a tower, a sign), so clicking a
  // building picks its own square; otherwise the street level.
  function grid(e, solid = false) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let p = null;
    if (solid) {
      // Only what stands in the city counts: not the sky dome, clouds or sprites.
      const lim = size / 2 + 10,
        hit = ray
          .intersectObjects(scene.children, true)
          .find(
            h =>
              !h.object.isSprite &&
              !overlay.children.includes(h.object.parent) &&
              h.point.y < 120 &&
              Math.abs(h.point.x) < lim &&
              Math.abs(h.point.z) < lim,
          );
      if (hit) p = hit.point;
    }
    p ??= ray.ray.intersectPlane(ground, hitAt);
    return p && [p.x / PITCH + cols / 2, p.z / PITCH + rows / 2];
  }

  // --- Pointer: a click picks a square; with a tool, a drag paints ---------------------
  let down = null,
    drawing = false;
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY };
    if (tool !== 'select') {
      drawing = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      const g = grid(e, tool !== 'road' && tool !== 'light' && tool !== 'start');
      if (g) send({ type: 'down', g });
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (drawing) {
      const g = grid(e);
      if (g) send({ type: 'move', g });
    } else if (!e.buttons) hover(grid(e));
  });
  const finish = e => {
    if (drawing) {
      drawing = false;
      send({ type: 'up', g: grid(e) });
    } else if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
      const g = grid(e, true);
      if (g) send({ type: 'click', g });
    }
    down = null;
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', () => {
    drawing = false;
    down = null;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  // Things dragged from the builder's lists land on the square under the pointer.
  canvas.addEventListener('dragover', e => {
    e.preventDefault();
    hover(grid(e, true));
  });
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    const g = grid(e, true),
      brush = e.dataTransfer.getData('text/plain');
    if (g && brush) send({ type: 'drop', brush, g });
  });

  // --- Highlights: hover, the picked square, a merge in progress ------------------------
  scene.add(overlay);
  function marker(color, opacity) {
    const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthTest: false,
          depthWrite: false,
        }),
      ),
      edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false }),
      ),
      m = new THREE.Group();
    fill.renderOrder = edge.renderOrder = 10;
    m.add(fill, edge);
    m.visible = false;
    overlay.add(m);
    return m;
  }
  const marks = {
    hover: marker('#ffffff', 0.1),
    select: marker('#ffffff', 0.22),
    preview: marker('#ff9a4a', 0.35),
  };
  // Show a marker over a rect of squares (the blocks, inside the roads).
  function show(m, rect) {
    m.visible = !!rect;
    if (!rect) return;
    const [i0, i1, j0, j1] = rect,
      x0 = (i0 - cols / 2) * PITCH + ROAD_HALF,
      x1 = (i1 + 1 - cols / 2) * PITCH - ROAD_HALF,
      z0 = (j0 - rows / 2) * PITCH + ROAD_HALF,
      z1 = (j1 + 1 - rows / 2) * PITCH - ROAD_HALF;
    m.position.set((x0 + x1) / 2, 0.5, (z0 + z1) / 2);
    m.scale.set(x1 - x0, 1, z1 - z0);
    onRender();
  }
  // The block under the pointer: a merged block lights up whole.
  const { rects } = planRects(plan);
  function hover(g) {
    const i = g && Math.floor(g[0]),
      j = g && Math.floor(g[1]);
    show(
      marks.hover,
      g && tool !== 'road' && tool !== 'light' && tool !== 'start'
        ? rects.find(([i0, i1, j0, j1]) => i >= i0 && i <= i1 && j >= j0 && j <= j1)
        : null,
    );
  }
  canvas.addEventListener('pointerleave', () => show(marks.hover, null));

  addEventListener('message', e => {
    const m = e.data;
    if (e.origin !== location.origin || !m?.city) return;
    if (m.type === 'tool') setTool(m.tool);
    if (m.type === 'select') show(marks.select, m.rect);
    if (m.type === 'preview') show(marks.preview, m.rect);
  });

  let ready = false;
  return {
    half: size / 2 + 24, // the shadows' reach

    // Each frame: glide the camera; the first frame tells the builder the view is up.
    update() {
      if (!ready) {
        ready = true;
        if (!resumed) frame();
        requestAnimationFrame(() => send({ type: 'ready' }));
      }
      return controls.update();
    },
  };
}
