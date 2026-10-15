// Shared motion helpers and the feel constants. Every smoothing in the project
// uses damp(), so it behaves the same at any frame rate; every simulation runs
// on a fixed step. FEEL is read live, so the dev panel can tune it while driving.
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dampAngle = (a, b, lambda, dt) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * (1 - Math.exp(-lambda * dt));
export const lerpAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

export const STEP = 1 / 120,
  MAX_FRAME = 0.1;

// A fixed timestep clock: advance(dt, fn) runs fn(STEP) as many times as the
// elapsed time allows; alpha is how far the display sits between the last two
// states. reset() drops any backlog (after the tab was hidden), so nothing jumps.
export function fixedClock(step = STEP) {
  let acc = 0;
  return {
    advance(dt, fn) {
      acc += Math.min(Math.max(dt, 0), MAX_FRAME);
      let n = 0;
      while (acc >= step) {
        fn(step);
        acc -= step;
        n++;
      }
      return n;
    },
    get alpha() {
      return acc / step;
    },
    reset() {
      acc = 0;
    },
  };
}

// A critically damped spring that is exact for any dt (no overshoot, never
// unstable): moves `s.x` toward `goal` with velocity `s.v` over about `time` s.
export function spring(s, goal, time, dt) {
  const w = 2 / Math.max(time, 1e-4),
    x = w * dt,
    e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const d = s.x - goal,
    t = (s.v + w * d) * dt;
  s.v = (s.v - w * t) * e;
  s.x = goal + (d + t) * e;
  return s.x;
}

export const FEEL = {
  // Tuned by Armin in the Feel panel.
  car: {
    maxSpeed: 18,
    maxReverse: 3.4,
    engine: 9.9,
    brake: 13,
    coast: 1.4,
    drag: 0.045,
    grip: 13,
    steerIn: 7.5,
    steerOut: 9,
    handGrip: 0.6,
    handSwing: 1.95,
  },
  // Body on springs: stiffness (1/s²) and damping (1/s). Damping under 2·√stiffness
  // gives a small, weighty overshoot.
  suspension: {
    stiffness: 105,
    damping: 15.5,
    pitch: 0.0095,
    roll: 0.0095,
    maxPitch: 0.065,
    maxRoll: 0.065,
    bump: 0.095,
  },
  drift: { slip: 0.9, markLife: 9, markWidth: 0.23, dust: 0.8 },
  camera: {
    follow: 0.24,
    lookAhead: 0.6,
    speedZoomOut: 0.16,
    panGlide: 3.2,
    zoomGlide: 5,
    shake: 0.35,
    shakeDecay: 2.6,
  },
  props: { restDelay: 4, resetTime: 1.6 },
  // Chase camera (New York): distance behind, height above, how far ahead it looks,
  // how quickly it swings round after the car, pull back per unit of speed,
  // smoothing time, field of view and how much it widens at top speed.
  chase: {
    distance: 8,
    height: 2.2,
    lookAhead: 10,
    turnLag: 3.6,
    speedPull: 0.3,
    follow: 0.14,
    fov: 40,
    fovBoost: 11,
  },
};
