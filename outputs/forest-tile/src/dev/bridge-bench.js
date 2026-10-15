// Dev only (never imported by the game): drives every vehicle over the bridge
// in the real physics and reports wheel contact, sticking and railing contact.
// In the browser console, on the New York page:
//   const b=await import('/src/dev/bridge-bench.js'); await b.run()
import * as THREE from 'three';
import { BRIDGE, LANE, G, AV, BAV, DECK_HALF } from '../nyc/drive/layout.js';

export async function run({ vehicles = null, scenarios = null } = {}) {
  const F = window.forestTile,
    c = F.car,
    W = F.world;
  c.setVehicleBoxes(() => []);
  c.setObstacles(() => []); // other cars out of the way
  // One clock for every run that only moves forward (time never runs backwards in the game).
  const Z = BRIDGE.z,
    v3 = new THREE.Vector3();
  const step = () => {
    window.__benchT = Math.max(window.__benchT ?? 0, performance.now()) + 1000 / 60;
    c.update(window.__benchT);
  };
  const spins = () => {
    const a = [];
    c.rig.traverse(o => {
      if (o.userData?.steer) a.push(o);
    });
    return a;
  };
  // Lowest point of each wheel against the road under it (the tyres sit 2.8 cm in by design).
  // Returns [deepest into the road (negative), highest above it] over the wheels.
  // Penetration: the deepest the tyre circle reaches below the road anywhere under
  // it (17 points across its length); float: the gap under the tyre's lowest point.
  const wheelErr = () => {
    let lo = 0,
      hi = 0;
    const h = c.shown.h,
      fx = Math.sin(h),
      fz = Math.cos(h);
    for (const s of spins()) {
      s.getWorldPosition(v3);
      const r = s.userData.r;
      let pen = 0,
        gap = 9;
      for (let i = -8; i <= 8; i++) {
        const k = i / 8.5,
          g = W.surface(v3.x + fx * k * r, v3.z + fz * k * r, c.shown.y);
        if (g === null) continue;
        const bottom = v3.y - Math.sqrt(1 - k * k) * r + 0.028;
        pen = Math.min(pen, bottom - (G + g));
        if (i === 0) gap = bottom - (G + g);
      }
      lo = Math.min(lo, pen);
      if (gap < 9) hi = Math.max(hi, gap);
    }
    return [lo, hi];
  };
  const release = () => ['gas', 'brake', 'left', 'right', 'hand'].forEach(k => c.press(k, false));
  function drive(start, wps, { reverse = false, maxT = 40, stopAt = null } = {}) {
    release();
    c.teleport(start.x, start.z, start.h, 0);
    for (let i = 0; i < 10; i++) step();
    let wi = 0,
      stuckT = 0,
      sink = 0,
      float = 0,
      sinkAt = '',
      stuck = null,
      steps = 0,
      maxV = 0,
      stopped = false;
    while (wi < wps.length && steps < maxT * 60) {
      const p = c.shown,
        w = wps[wi];
      if (Math.hypot(w.x - p.x, w.z - p.z) < 2.5) {
        wi++;
        continue;
      }
      if (stopAt !== null && !stopped && p.x > stopAt) {
        c.press('gas', false);
        c.press('brake', true);
        let k = 0;
        while (Math.abs(c.shown.speed) > 0.05 && k < 600) {
          step();
          k++;
        }
        c.press('brake', false);
        for (let k2 = 0; k2 < 60; k2++) step();
        stopped = true;
      }
      let want = Math.atan2(w.x - p.x, w.z - p.z);
      if (reverse) want += Math.PI;
      const dh = Math.atan2(Math.sin(want - p.h), Math.cos(want - p.h));
      c.press(reverse ? 'brake' : 'gas', true);
      c.press(reverse ? 'gas' : 'brake', false);
      c.press('left', reverse ? dh < -0.03 : dh > 0.03);
      c.press('right', reverse ? dh > 0.03 : dh < -0.03);
      step();
      steps++;
      const [lo, hi] = wheelErr();
      if (lo < sink)
        sinkAt = `x${p.x.toFixed(1)} dz${(p.z - Z).toFixed(1)} step${steps} v${c.shown.speed.toFixed(2)} h${p.h.toFixed(2)} cy${c.probe().cy.toFixed(3)} wheels ${spins()
          .map(s => {
            s.getWorldPosition(v3);
            const g = W.surface(v3.x, v3.z, 0);
            return (
              '(' +
              (v3.z - Z).toFixed(2) +
              ' g' +
              g +
              ' off' +
              (s.userData.steer.position.y - (s.userData.steer.userData.baseY ?? 0)).toFixed(3) +
              ' e' +
              (v3.y - s.userData.r - (G + g) + 0.028).toFixed(3) +
              ')'
            );
          })
          .join(' ')}`;
      sink = Math.min(sink, lo);
      float = Math.max(float, hi);
      maxV = Math.max(maxV, Math.abs(c.shown.speed));
      if (Math.abs(c.shown.speed) < 0.3 && steps > 90) {
        stuckT += 1 / 60;
        if (stuckT > 1.5) {
          const sg = reverse ? -1 : 1,
            ahead = c.probe(p.x + Math.sin(p.h) * 0.06 * sg, p.z + Math.cos(p.h) * 0.06 * sg, p.h);
          stuck = {
            x: +p.x.toFixed(2),
            dz: +(p.z - Z).toFixed(2),
            h: +p.h.toFixed(2),
            ahead: ahead.impossible
              ? 'no road ahead'
              : ahead.why
                  .map(
                    w =>
                      w[0] +
                      '@' +
                      (+w[1]).toFixed(2) +
                      ',' +
                      (+w[2] - Z).toFixed(2) +
                      ' r/hw' +
                      (+w[3]).toFixed(2),
                  )
                  .join('|') || 'clear',
          };
          break;
        }
      } else stuckT = 0;
    }
    release();
    return {
      ok: wi >= wps.length && !stuck,
      stuck,
      sink: +sink.toFixed(3),
      sinkAt,
      float: +float.toFixed(3),
      maxV: +maxV.toFixed(1),
      timeout: wi < wps.length && !stuck,
    };
  }
  // Lamp posts stand on the deck just inside each railing (x 55, 68, 81; their
  // inner face is 4.8 from the centre line). 1) Drive the whole bridge with the
  // body side 3 cm from that line: it must pass untouched. 2) Between two lamps,
  // steer into the railing: when the car stops, the body's corner must be
  // touching the rail's inner face (5.04), not short of it or through it.
  const bodyGap = (side, pr) => {
    const p = c.shown,
      fx = Math.sin(p.h),
      fz = Math.cos(p.h),
      sx = fz,
      sz = -fx,
      ox = p.x + fx * pr.oz,
      oz = p.z + fz * pr.oz;
    let far = -9;
    for (const a of [-1, 1])
      for (const b of [-1, 1]) far = Math.max(far, side * (oz + fz * a * pr.hl + sz * b * pr.hw - Z));
    return far;
  };
  function alongLamps(side) {
    const pr = c.probe(),
      dz = side * (DECK_HALF - 0.4 - pr.hw - 0.03);
    release();
    c.teleport(30, Z + dz, Math.PI / 2, 0);
    for (let i = 0; i < 10; i++) step();
    c.press('gas', true);
    let minV = 99;
    for (let i = 0; i < 60 * 14 && c.shown.x < 95; i++) {
      step();
      if (c.shown.x > 52 && c.shown.x < 84) minV = Math.min(minV, Math.abs(c.shown.speed));
    }
    release();
    const p = c.shown,
      ah = c.probe(p.x + 0.06, p.z, p.h);
    return {
      passed: c.shown.x >= 95,
      slowestOnBridge: +minV.toFixed(1),
      at: +p.x.toFixed(2),
      ahead: ah.impossible
        ? 'no road'
        : ah.why.map(w => w[0] + '@' + (+w[1]).toFixed(2) + ',' + (+w[2] - Z).toFixed(2)).join('|'),
    };
  }
  function intoRail(side) {
    const pr = c.probe();
    release();
    c.teleport(58.5, Z + side * LANE * 0.5, Math.PI / 2 - side * 0.5, 0);
    for (let i = 0; i < 10; i++) step();
    c.press('gas', true);
    let k = 0;
    while (k < 60 * 4) {
      step();
      k++;
      if (Math.abs(c.shown.speed) < 0.05 && k > 30) break;
    }
    const gap = DECK_HALF - 0.16 - bodyGap(side, pr);
    c.press('gas', false);
    // then steer away while still on the gas: it must come off the rail and drive on
    c.press('gas', true);
    c.press(side > 0 ? 'left' : 'right', true);
    const x0 = c.shown.x;
    for (let i = 0; i < 120; i++) step();
    release();
    return { gapWhenStopped: +gap.toFixed(3), drivesAway: c.shown.x - x0 > 1 };
  }
  const LN = LANE,
    FDR = AV.at(-1),
    RIV = BAV[0];
  const S = {
    straightEast: () =>
      drive({ x: 30, z: Z + LN, h: Math.PI / 2 }, [
        { x: 60, z: Z + LN },
        { x: 98, z: Z + LN },
      ]),
    straightWest: () =>
      drive({ x: 110, z: Z - LN, h: -Math.PI / 2 }, [
        { x: 70, z: Z - LN },
        { x: 38, z: Z - LN },
      ]),
    fastEntry: () =>
      drive({ x: -20, z: Z + LN, h: Math.PI / 2 }, [
        { x: 60, z: Z + LN },
        { x: 98, z: Z + LN },
      ]),
    rightTurnOn: () =>
      drive({ x: FDR + LN, z: Z - 34, h: 0 }, [
        { x: FDR + LN, z: Z - 9 },
        { x: 54, z: Z + LN },
        { x: 70, z: Z + LN },
        { x: 98, z: Z + LN },
      ]),
    leftTurnOn: () =>
      drive({ x: FDR - LN, z: Z + 7, h: Math.PI }, [
        { x: FDR - LN, z: Z + 4 },
        { x: 54, z: Z + LN },
        { x: 70, z: Z + LN },
        { x: 98, z: Z + LN },
      ]),
    turnOnFromBrooklyn: () =>
      drive({ x: RIV - LN, z: Z - 34, h: 0 }, [
        { x: RIV - LN, z: Z - 9 },
        { x: 82, z: Z - LN },
        { x: 66, z: Z - LN },
        { x: 38, z: Z - LN },
      ]),
    stopAtCrest: () =>
      drive(
        { x: 30, z: Z + LN, h: Math.PI / 2 },
        [
          { x: 60, z: Z + LN },
          { x: 98, z: Z + LN },
        ],
        { stopAt: 68 },
      ),
    reverseOn: () =>
      drive(
        { x: 36, z: Z + LN, h: -Math.PI / 2 },
        [
          { x: 60, z: Z + LN },
          { x: 98, z: Z + LN },
        ],
        { reverse: true },
      ),
    alongNorthLamps: () => alongLamps(1),
    alongSouthLamps: () => alongLamps(-1),
    intoNorthRail: () => intoRail(1),
    intoSouthRail: () => intoRail(-1),
  };
  const out = {},
    ids = vehicles ?? [...Array(c.count).keys()];
  for (const vi of ids) {
    c.select(vi);
    const name = c.vehicle?.name ?? vi;
    out[name] = {};
    for (const [k, f] of Object.entries(S)) {
      if (scenarios && !scenarios.includes(k)) continue;
      out[name][k] = f();
      await new Promise(r => setTimeout(r, 0));
    }
  }
  return out;
}
