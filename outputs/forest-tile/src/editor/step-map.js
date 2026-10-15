import {
  KINDS,
  MAX,
  MIN,
  SOLO,
  STYLES,
  mergeRect,
  normalize,
  placeOf,
  planRects,
  rectAt,
  splitRect,
} from '../plan/plan.js';
import { esc } from './ui.js';

// Step 3, Build: place everything in the city. Two views of the same plan: 3D
// (the real city, as it drives, updated after each change) and Map (a flat plan
// for precise work). Both edit the same way:
//   Your things   each job, school and the skills and tools boards: drag one onto
//                 a square (or pick it and click a square); placing it again moves it
//   Select        click a square to see it
//   Roads         drag along the grid lines to lay or remove roads
//   Traffic lights  click a crossing
//   Merge         drag across squares to make one big block; click a big block to split it
//   Car start     click a road where the car starts; click it again to turn the car round
//   City blocks   drag or paint them anywhere

// Colours of the blocks on the map (the same family as the game's map).
const COLOR = {
  place: '#ff9a4a',
  skills: '#7f86ff',
  tools: '#5ab4f0',
  boutique: '#e8c98a',
  garage: '#cfd6e2',
  low: '#8a5a6a',
  mid: '#5b4fa8',
  tall: '#3d78c9',
  brownstone: '#7a4a3a',
  park: '#3f8a62',
  pond: '#3b6fa8',
  plaza: '#8b84b3',
  empire: '#b9b0ef',
  chrysler: '#b9b0ef',
  wtc: '#b9b0ef',
  dome: '#b98b5e',
};
const TOOLS = {
  select: { label: 'Select', hint: 'Click a square to see it. Drag things from the left onto the city.' },
  road: { label: 'Roads', hint: 'Drag along a road to remove it, or along an empty line to lay one.' },
  light: { label: 'Traffic lights', hint: 'Click a crossing to switch its traffic lights on or off.' },
  merge: {
    label: 'Merge blocks',
    hint: 'Drag across squares to make one big block. Click a big block to split it.',
  },
  start: {
    label: 'Car start',
    hint: 'Click a road where the car starts. Click it again to turn the car round.',
  },
};
const HINT_3D = ' Drag to turn the view (right drag with a tool), scroll to zoom.';
// A brush: a tool, a city block ("kind"), or one of your things ("exp:id", "edu:id", "skills", "tools").
const isThing = b => /^(exp|edu):/.test(b) || b === 'skills' || b === 'tools';
// How close to a grid line counts as on it, in squares (a road is 12 of a square's 38).
const NEAR = (12 / 38) * 0.6;

export function mapStep() {
  let ro = null,
    off = null;
  const step = {
    unmount() {
      ro?.disconnect();
      off?.();
    },
    mount(el, api) {
      const plan = () => api.plan;
      let tool = 'select',
        selected = null, // a square [i, j]; its whole block shows as picked
        gesture = null,
        L = null,
        view = 'map';
      try {
        view = sessionStorage.getItem('builder-view') ?? '3d';
      } catch {}
      el.innerHTML = `
        <div class="build">
          <aside class="left panel">
            <h2>Your things</h2><div class="tools" data-group="things"></div>
            <div class="sep"></div>
            <h2>Tools</h2><div class="tools" data-group="tools"></div>
            <div class="sep"></div>
            <h2>City blocks</h2><div class="tools" data-group="kinds"></div>
          </aside>
          <main class="map">
            <div class="stage3d"></div>
            <canvas aria-label="City map"></canvas>
            <div class="size">
              <div class="views" role="group" aria-label="View">
                <button data-view="3d">3D</button><button data-view="map">Map</button>
              </div>
              <span data-short="W">Width</span><button data-size="cols:-1" aria-label="Fewer columns">−</button><b data-v="cols"></b><button data-size="cols:1" aria-label="More columns">+</button>
              <span data-short="H">Height</span><button data-size="rows:-1" aria-label="Fewer rows">−</button><b data-v="rows"></b><button data-size="rows:1" aria-label="More rows">+</button>
            </div>
            <p class="hint"></p>
            <p class="updating" hidden>Updating the city…</p>
          </main>
          <aside class="right panel" aria-live="polite"></aside>
        </div>`;
      const $ = s => el.querySelector(s),
        cv = $('canvas'),
        g = cv.getContext('2d'),
        stage = $('.stage3d');

      // --- Palette ------------------------------------------------------------------
      const where = brush => {
        for (let j = 0; j < plan().rows; j++)
          for (let i = 0; i < plan().cols; i++) {
            const c = plan().cells[j][i];
            if (c.ref === brush || (c.kind === brush && (brush === 'skills' || brush === 'tools')))
              return [i, j];
          }
        return null;
      };
      function palette() {
        const p = plan(),
          things = [
            ...p.experiences.map(e => ({
              key: 'exp:' + e.id,
              label: e.company || 'Company',
              sub: 'Work',
              color: e.color,
              logo: e.logo,
            })),
            ...p.education.map(e => ({
              key: 'edu:' + e.id,
              label: e.school || 'School',
              sub: 'Education',
              color: e.color,
              logo: e.logo,
            })),
            { key: 'skills', label: 'Skills board', sub: `${p.skills.length} skills`, color: COLOR.skills },
            { key: 'tools', label: 'Tools board', sub: `${p.tools.length} tools`, color: COLOR.tools },
          ];
        $('[data-group="things"]').innerHTML = things
          .map(t => {
            const on = where(t.key);
            return `<button class="tool${on ? ' placed' : ''}" data-brush="${esc(t.key)}" draggable="true">
              <span class="swatch" style="${t.logo ? `background:#fff url('${esc(t.logo)}') center/contain no-repeat` : `background:${esc(t.color)}`}"></span>
              <span>${esc(t.label)}<small>${esc(t.sub)}${on ? ' · in the city' : ' · drag into the city'}</small></span></button>`;
          })
          .join('');
        $('[data-group="tools"]').innerHTML = Object.entries(TOOLS)
          .map(([k, t]) => `<button class="tool" data-brush="${k}"><span>${t.label}</span></button>`)
          .join('');
        $('[data-group="kinds"]').innerHTML = Object.entries(KINDS)
          .map(
            ([k, t]) =>
              `<button class="tool" data-brush="${k}" draggable="true"><span class="swatch" style="background:${COLOR[k]}"></span><span>${t.label}<small>${t.hint}</small></span></button>`,
          )
          .join('');
        el.querySelectorAll('[data-brush]').forEach(b => {
          b.onclick = () => {
            // A thing already in the city: clicking it shows its square.
            const at = isThing(b.dataset.brush) && where(b.dataset.brush);
            if (at) {
              selected = at;
              setTool('select');
              refresh();
            } else setTool(b.dataset.brush);
          };
          b.ondragstart = e => e.dataTransfer.setData('text/plain', b.dataset.brush);
          b.setAttribute('aria-pressed', String(b.dataset.brush === tool));
        });
      }
      // A short warning in the hint bar over the map; the tool's hint comes back after.
      let warnTimer = 0;
      function warn(text) {
        const hint = $('.hint');
        hint.textContent = text;
        hint.classList.add('warn');
        clearTimeout(warnTimer);
        warnTimer = setTimeout(() => {
          hint.classList.remove('warn');
          setTool(tool);
        }, 4000);
      }
      function setTool(t) {
        tool = t;
        el.querySelectorAll('[data-brush]').forEach(b =>
          b.setAttribute('aria-pressed', String(b.dataset.brush === t)),
        );
        $('.hint').textContent =
          (TOOLS[t]?.hint ?? 'Click or drag over squares to place it.') + (view === '3d' ? HINT_3D : '');
        cv.style.cursor = t === 'select' ? 'pointer' : 'crosshair';
        tell({ type: 'tool', tool: TOOLS[t] ? t : 'paint' });
      }

      // --- What is at a grid point (gi, gj in squares): a crossing, a road, a square ------
      // A point near a line is also in a square (cell), so square tools work anywhere,
      // including over the missing roads inside a big block.
      function hitGrid(gi, gj) {
        const p = plan(),
          i = Math.round(gi),
          j = Math.round(gj),
          nearX = Math.abs(gi - i) < NEAR,
          nearY = Math.abs(gj - j) < NEAR,
          ci = Math.min(p.cols - 1, Math.max(0, Math.floor(gi))),
          cj = Math.min(p.rows - 1, Math.max(0, Math.floor(gj))),
          cell = gi > 0 && gj > 0 && gi < p.cols && gj < p.rows ? [ci, cj] : null;
        if (nearX && nearY && i >= 0 && j >= 0 && i <= p.cols && j <= p.rows) return { node: [i, j], cell };
        if (nearY && j >= 0 && j <= p.rows && gi >= 0 && gi < p.cols) return { h: [j, Math.floor(gi)], cell };
        if (nearX && i >= 0 && i <= p.cols && gj >= 0 && gj < p.rows) return { v: [i, Math.floor(gj)], cell };
        return cell && { cell };
      }
      // The same, under a pointer on the flat map.
      function hit(e) {
        const r = cv.getBoundingClientRect();
        return hitGrid(
          ((e.clientX - r.left) * L.dpr - L.x0) / L.step,
          ((e.clientY - r.top) * L.dpr - L.y0) / L.step,
        );
      }
      const roadsAt = (i, j) => {
        const p = plan();
        return [p.roads.h[j]?.[i - 1], p.roads.h[j]?.[i], p.roads.v[i]?.[j - 1], p.roads.v[i]?.[j]].filter(
          Boolean,
        ).length;
      };
      const span = (a, b) => [
        Math.min(a[0], b[0]),
        Math.max(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[1], b[1]),
      ];

      // --- The flat map --------------------------------------------------------------------
      function layout() {
        const r = cv.getBoundingClientRect(),
          dpr = Math.min(2, devicePixelRatio || 1);
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
        const m = 60 * dpr,
          step = Math.min((cv.width - 2 * m) / plan().cols, (cv.height - 2 * m) / plan().rows);
        L = {
          dpr,
          step,
          road: step * (12 / 38),
          x0: (cv.width - step * plan().cols) / 2,
          y0: (cv.height - step * plan().rows) / 2,
        };
        L.x = i => L.x0 + i * L.step;
        L.y = j => L.y0 + j * L.step;
      }
      const logos = new Map();
      const logoImage = src => {
        if (!logos.has(src)) {
          const im = new Image();
          im.onload = draw;
          im.src = src;
          logos.set(src, im);
        }
        return logos.get(src);
      };
      const hand = getComputedStyle(document.documentElement).getPropertyValue('--hand'),
        font = getComputedStyle(document.body).fontFamily;
      function rr(x, y, w, h, r) {
        g.beginPath();
        g.roundRect(x, y, w, h, r);
      }
      function line(x1, y1, x2, y2) {
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      }
      function label(text, x, y, s) {
        const size = Math.max(11, Math.min(s * 0.12, 18 * L.dpr));
        g.font = `600 ${size}px ${font}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = 'rgba(16,10,40,.55)';
        // Shorten the name until it fits the square.
        let t = text;
        while (t.length > 1 && g.measureText(t).width > s - 26) t = t.slice(0, -2) + '…';
        const w = g.measureText(t).width + 16;
        rr(x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.75);
        g.fill();
        g.fillStyle = '#fff';
        g.fillText(t, x, y + 1);
      }
      // A rect of squares on the canvas: [x, y, w, h], inside the roads.
      const box = ([i0, i1, j0, j1]) => [
        L.x(i0) + L.road / 2,
        L.y(j0) + L.road / 2,
        L.x(i1 + 1) - L.x(i0) - L.road,
        L.y(j1 + 1) - L.y(j0) - L.road,
      ];
      function draw() {
        if (view !== 'map') return;
        layout();
        const { dpr, step, road } = L,
          p = plan(),
          { rects, merged } = planRects(p);
        g.clearRect(0, 0, cv.width, cv.height);
        // The island: 8 units of promenade round the outer roads.
        const pad = road / 2 + step * (8 / 38);
        g.fillStyle = '#b98b5e';
        rr(
          L.x(0) - pad - 6 * dpr,
          L.y(0) - pad - 6 * dpr,
          step * p.cols + 2 * pad + 12 * dpr,
          step * p.rows + 2 * pad + 12 * dpr,
          22 * dpr,
        );
        g.fill();
        g.fillStyle = '#4e4796';
        rr(L.x(0) - pad, L.y(0) - pad, step * p.cols + 2 * pad, step * p.rows + 2 * pad, 18 * dpr);
        g.fill();
        // Blocks: a big block is one shape; a place shows its logo and name.
        const pick = selected && rectAt(p, ...selected);
        for (const r of rects) {
          const [x, y, w, h] = box(r),
            c = p.cells[r[2]][r[0]],
            place = c.kind === 'place' && placeOf(p, c.ref);
          g.fillStyle = place ? place.color : COLOR[c.kind];
          rr(x, y, w, h, 10 * dpr);
          g.fill();
          if (pick && pick.join() === r.join()) {
            g.lineWidth = 4 * dpr;
            g.strokeStyle = '#ffffff';
            rr(x - 3 * dpr, y - 3 * dpr, w + 6 * dpr, h + 6 * dpr, 12 * dpr);
            g.stroke();
          }
          const s = Math.min(w, h);
          if (place) {
            const cx = x + w / 2,
              cy = y + h * 0.42,
              rad = Math.min(s * 0.22, 34 * dpr);
            g.fillStyle = '#fff';
            g.beginPath();
            g.arc(cx, cy, rad, 0, 7);
            g.fill();
            const im = place.logo && logoImage(place.logo);
            if (im?.complete && im.naturalWidth) {
              const k = Math.min((rad * 1.4) / im.naturalWidth, (rad * 1.4) / im.naturalHeight);
              g.drawImage(
                im,
                cx - (im.naturalWidth * k) / 2,
                cy - (im.naturalHeight * k) / 2,
                im.naturalWidth * k,
                im.naturalHeight * k,
              );
            } else {
              g.fillStyle = place.color;
              g.font = `700 ${rad * 1.2}px ${hand}`;
              g.textAlign = 'center';
              g.textBaseline = 'middle';
              g.fillText(place.name.slice(0, 1).toUpperCase(), cx, cy + rad * 0.08);
            }
            label(place.name, x + w / 2, y + h * 0.78, w);
          } else
            label(
              KINDS[c.kind]?.label ?? (c.kind === 'skills' ? 'Skills board' : 'Tools board'),
              x + w / 2,
              y + h / 2,
              w,
            );
        }
        // Roads: asphalt with a dashed centre line; missing ones as faint dots
        // (none inside a big block).
        const seg = (x1, y1, x2, y2, on) => {
          g.lineCap = 'butt';
          if (on) {
            g.strokeStyle = '#23203f';
            g.lineWidth = road;
            line(x1, y1, x2, y2);
            g.strokeStyle = 'rgba(255,214,90,.55)';
            g.lineWidth = 2 * dpr;
            g.setLineDash([8 * dpr, 8 * dpr]);
          } else {
            g.strokeStyle = 'rgba(220,214,255,.22)';
            g.lineWidth = 2 * dpr;
            g.setLineDash([3 * dpr, 9 * dpr]);
          }
          line(x1, y1, x2, y2);
          g.setLineDash([]);
        };
        const inside = (i, j) => merged[j]?.[i];
        for (let j = 0; j <= p.rows; j++)
          for (let i = 0; i < p.cols; i++)
            if (p.roads.h[j][i] || !(inside(i, j - 1) && inside(i, j)))
              seg(L.x(i), L.y(j), L.x(i + 1), L.y(j), p.roads.h[j][i]);
        for (let i = 0; i <= p.cols; i++)
          for (let j = 0; j < p.rows; j++)
            if (p.roads.v[i][j] || !(inside(i - 1, j) && inside(i, j)))
              seg(L.x(i), L.y(j), L.x(i), L.y(j + 1), p.roads.v[i][j]);
        // Crossings: asphalt where a road reaches; a traffic light where three or more meet.
        for (let j = 0; j <= p.rows; j++)
          for (let i = 0; i <= p.cols; i++) {
            const n = roadsAt(i, j);
            if (!n) continue;
            g.fillStyle = '#23203f';
            g.fillRect(L.x(i) - road / 2, L.y(j) - road / 2, road, road);
            if (n < 3) continue;
            const lit = !p.lightsOff.includes(i + ',' + j);
            g.fillStyle = lit ? '#21e06e' : '#6b6890';
            g.shadowColor = lit ? '#21e06e' : 'transparent';
            g.shadowBlur = 10 * dpr;
            g.beginPath();
            g.arc(L.x(i), L.y(j), 6 * dpr, 0, 7);
            g.fill();
            g.shadowBlur = 0;
          }
        // The car's start: an arrow in its lane, pointing the way it drives.
        if (p.start) {
          const s = p.start,
            along = s.axis === 'h',
            cx = along ? (L.x(s.i) + L.x(s.i + 1)) / 2 : L.x(s.i),
            cy = along ? L.y(s.j) : (L.y(s.j) + L.y(s.j + 1)) / 2,
            dx = along ? s.dir : 0,
            dy = along ? 0 : s.dir,
            // Traffic keeps right: the lane is to the right of the way it drives.
            ox = cx - dy * road * 0.25,
            oy = cy + dx * road * 0.25,
            k = road * 0.42;
          g.fillStyle = '#ff9a4a';
          g.shadowColor = '#ff9a4a';
          g.shadowBlur = 12 * dpr;
          g.beginPath();
          g.moveTo(ox + dx * k, oy + dy * k);
          g.lineTo(ox - dx * k * 0.7 - dy * k * 0.6, oy - dy * k * 0.7 + dx * k * 0.6);
          g.lineTo(ox - dx * k * 0.7 + dy * k * 0.6, oy - dy * k * 0.7 - dx * k * 0.6);
          g.closePath();
          g.fill();
          g.shadowBlur = 0;
        }
        // A merge being dragged.
        if (gesture?.merge) {
          const [x, y, w, h] = box(span(gesture.merge, gesture.to));
          g.lineWidth = 3 * dpr;
          g.strokeStyle = '#ff9a4a';
          g.fillStyle = 'rgba(255,154,74,.25)';
          rr(x, y, w, h, 10 * dpr);
          g.fill();
          g.stroke();
        }
      }

      // --- The 3D view: the game in edit mode, reloaded after each change -----------------
      // A new view loads behind the old one and replaces it once it is drawn, so the
      // city never goes blank while it updates.
      let frame = null,
        next = null,
        timer = 0;
      const BASE = import.meta.env.BASE_URL;
      function load3d() {
        if (view !== '3d') return;
        next?.remove();
        next = document.createElement('iframe');
        next.className = 'view3d behind';
        next.title = 'Your city in 3D';
        next.src = `${BASE}?city=mine&edit&v=${Date.now()}`;
        stage.append(next);
        const note = $('.updating');
        note.textContent = frame ? 'Updating the city…' : 'Building your city in 3D…';
        note.classList.toggle('first', !frame);
        note.hidden = false;
      }
      function update3d() {
        clearTimeout(timer);
        timer = setTimeout(() => {
          api.save();
          load3d();
        }, 250);
      }
      const tell = msg => frame?.contentWindow?.postMessage({ city: true, ...msg }, location.origin);
      function sync3d() {
        tell({ type: 'tool', tool: TOOLS[tool] ? tool : 'paint' });
        tell({ type: 'select', rect: selected && rectAt(plan(), ...selected) });
      }
      const onMessage = e => {
        const m = e.data;
        if (e.origin !== location.origin || !m?.city) return;
        if (m.type === 'ready' && next && e.source === next.contentWindow) {
          frame?.remove();
          frame = next;
          next = null;
          frame.classList.remove('behind');
          $('.updating').hidden = true;
          sync3d();
          return;
        }
        if (!frame || e.source !== frame.contentWindow) return;
        const h = m.g && hitGrid(...m.g);
        if (m.type === 'click') select(h);
        else if (m.type === 'down') start(h);
        else if (m.type === 'move') h && gesture && apply(h);
        else if (m.type === 'up') end(h);
        else if (m.type === 'drop') drop(h, m.brush);
      };
      addEventListener('message', onMessage);
      off = () => removeEventListener('message', onMessage);

      function setView(v) {
        view = v;
        try {
          sessionStorage.setItem('builder-view', v);
        } catch {}
        el.querySelectorAll('[data-view]').forEach(b =>
          b.setAttribute('aria-pressed', String(b.dataset.view === v)),
        );
        cv.hidden = v !== 'map';
        stage.hidden = v !== '3d';
        if (v === '3d' && !frame && !next) load3d();
        setTool(tool);
        draw();
      }
      el.querySelectorAll('[data-view]').forEach(b => (b.onclick = () => setView(b.dataset.view)));

      // --- Editing (the same from either view) -----------------------------------------------
      // Put a brush on a square: a city block, or one of your things (moved if it was elsewhere).
      function paint([i, j], brush) {
        const p = plan();
        if (isThing(brush)) {
          const old = where(brush);
          if (old && old[0] === i && old[1] === j) return;
          if (old) p.cells[old[1]][old[0]] = { kind: 'plaza' };
          p.cells[j][i] = /^(exp|edu):/.test(brush) ? { kind: 'place', ref: brush } : { kind: brush };
        } else if (p.cells[j][i].kind !== brush || p.cells[j][i].ref) p.cells[j][i] = { kind: brush };
      }
      function select(h) {
        if (!h?.cell) return;
        selected = h.cell;
        refresh();
      }
      // A gesture starts (pointer down with a tool).
      function start(h) {
        if (!h) return;
        const p = plan();
        if (tool === 'select') return select(h);
        api.remember();
        if (tool === 'light') {
          if (h.node && roadsAt(...h.node) >= 3) {
            const k = h.node.join(','),
              at = p.lightsOff.indexOf(k);
            if (at >= 0) p.lightsOff.splice(at, 1);
            else p.lightsOff.push(k);
            commit();
          }
          return;
        }
        if (tool === 'start') {
          const axis = h.h ? 'h' : h.v ? 'v' : null;
          if (!axis) return;
          const [i, j] = h.h ? [h.h[1], h.h[0]] : h.v;
          if (!(axis === 'h' ? p.roads.h[j][i] : p.roads.v[i][j])) return;
          const s = p.start;
          // The same road again turns the car round.
          p.start =
            s && s.axis === axis && s.i === i && s.j === j ? { ...s, dir: -s.dir } : { axis, i, j, dir: 1 };
          commit();
          return;
        }
        if (tool === 'road') {
          const on = h.h ? p.roads.h[h.h[0]][h.h[1]] : h.v ? p.roads.v[h.v[0]][h.v[1]] : null;
          if (on === null) return;
          gesture = { road: !on };
        } else if (tool === 'merge') {
          if (!h.cell) return;
          gesture = { merge: h.cell, to: h.cell };
        } else gesture = { brush: tool };
        apply(h);
      }
      // The gesture moves over another point.
      function apply(h) {
        const p = plan();
        if (!gesture || !h) return;
        if ('road' in gesture) {
          if (h.h) p.roads.h[h.h[0]][h.h[1]] = gesture.road;
          if (h.v) p.roads.v[h.v[0]][h.v[1]] = gesture.road;
          // A road taken away under the start: the start goes back to the default.
          if (
            p.start &&
            !(p.start.axis === 'h' ? p.roads.h[p.start.j][p.start.i] : p.roads.v[p.start.i][p.start.j])
          )
            p.start = null;
        } else if (gesture.merge) {
          if (h.cell) gesture.to = h.cell;
          tell({ type: 'preview', rect: span(gesture.merge, gesture.to) });
        } else if (gesture.brush && h.cell) {
          paint(h.cell, gesture.brush);
          selected = h.cell;
          // One of your things goes on one square: the gesture ends there, saved, back to Select.
          if (isThing(gesture.brush)) {
            gesture = null;
            setTool('select');
            commit();
            return;
          }
        }
        draw();
      }
      // The gesture ends: a merge is applied, anything else saved.
      function end() {
        if (!gesture) return;
        const gs = gesture;
        gesture = null;
        if (!gs.merge) return commit();
        tell({ type: 'preview', rect: null });
        const p = plan(),
          r = span(gs.merge, gs.to),
          [i0, i1, j0, j1] = r,
          kind = p.cells[gs.merge[1]][gs.merge[0]].kind;
        selected = gs.merge;
        if (i0 === i1 && j0 === j1) {
          // A click: a big block splits back into squares.
          const big = rectAt(p, i0, j0);
          if (big && (big[0] !== big[1] || big[2] !== big[3])) splitRect(p, big);
          return commit();
        }
        if (SOLO.has(kind)) {
          warn(
            'Your things, boutiques and the garage stay one square. Merge city blocks like parks or towers.',
          );
          return draw();
        }
        // Your things are never merged away: say which one is in the way.
        for (let b = j0; b <= j1; b++)
          for (let a = i0; a <= i1; a++) {
            const c = p.cells[b][a];
            if (!SOLO.has(c.kind)) continue;
            const name =
              c.kind === 'place' ? placeOf(p, c.ref)?.name : (KINDS[c.kind]?.label ?? `${c.kind} board`);
            warn(`${name} is in the way: move it first, or merge a smaller area.`);
            return draw();
          }
        mergeRect(p, r, kind);
        commit();
      }
      function drop(h, brush) {
        if (!h?.cell || !(KINDS[brush] || isThing(brush))) return;
        api.remember();
        paint(h.cell, brush);
        selected = h.cell;
        commit();
      }
      cv.onpointerdown = e => {
        const h = hit(e);
        if (!h) return;
        if (tool !== 'select') cv.setPointerCapture(e.pointerId);
        start(h);
      };
      cv.onpointermove = e => gesture && apply(hit(e));
      cv.onpointerup = cv.onpointercancel = () => end();
      cv.ondragover = e => e.preventDefault();
      cv.ondrop = e => {
        e.preventDefault();
        drop(hit(e), e.dataTransfer.getData('text/plain'));
      };

      // Grid size: add or remove a column or row on the right / bottom edge.
      el.querySelectorAll('[data-size]').forEach(b => {
        b.onclick = () => {
          const [axis, d] = b.dataset.size.split(':'),
            p = structuredClone(plan()),
            nextN = p[axis] + +d;
          if (nextN < MIN || nextN > MAX) return;
          p[axis] = nextN;
          if (axis === 'cols') {
            p.cells.forEach(row => (d > 0 ? row.push({ kind: 'mid' }) : row.pop()));
            p.roads.h.forEach(row => (d > 0 ? row.push(true) : row.pop()));
            if (d > 0) p.roads.v.push(Array(p.rows).fill(true));
            else p.roads.v.pop();
          } else {
            if (d > 0) p.cells.push(Array.from({ length: p.cols }, () => ({ kind: 'mid' })));
            else p.cells.pop();
            p.roads.v.forEach(col => (d > 0 ? col.push(true) : col.pop()));
            if (d > 0) p.roads.h.push(Array(p.cols).fill(true));
            else p.roads.h.pop();
          }
          // The camera framed the old size: let the new city frame itself.
          try {
            sessionStorage.removeItem('builder-camera');
          } catch {}
          api.replace(normalize(p));
        };
      });

      // --- The block on the right ----------------------------------------------------------
      function inspector() {
        const out = $('.right'),
          p = plan();
        if (selected && (selected[0] >= p.cols || selected[1] >= p.rows)) selected = null;
        if (!selected) {
          out.innerHTML = `<h2>Square</h2><p class="empty">Click a square to see it. Drag your jobs, schools and boards
            from the left into the city; place one again to move it. Park in front of a building and press Enter to open its card.</p>`;
          return;
        }
        const [i, j] = selected,
          c = p.cells[j][i],
          place = c.kind === 'place' && placeOf(p, c.ref);
        if (place || c.kind === 'skills' || c.kind === 'tools') {
          out.innerHTML = place
            ? `<h2>${esc(place.name)}</h2><p class="empty">${esc(place.kind)}${place.role ? ' · ' + esc(place.role) : ''}</p>
               <div><span class="field-label">Building</span><div class="designs">${Object.entries(STYLES)
                 .map(
                   ([k, s]) =>
                     `<button data-style="${k}" aria-pressed="${place.style === k}">${s.label}</button>`,
                 )
                 .join('')}</div></div>
               <button class="btn" data-edit>Edit details</button><button class="btn" data-off>Remove from the city</button>`
            : `<h2>${c.kind === 'skills' ? 'Skills board' : 'Tools board'}</h2><p class="empty">${esc(p[c.kind].join(', ') || 'Nothing yet')}</p>
               <button class="btn" data-edit>Edit the list</button><button class="btn" data-off>Remove from the city</button>`;
          out.querySelectorAll('[data-style]').forEach(b => {
            b.onclick = () => {
              api.remember();
              const [type, id] = c.ref.split(':');
              (type === 'exp' ? p.experiences : p.education).find(x => x.id === id).style = b.dataset.style;
              commit();
            };
          });
          out.querySelector('[data-edit]').onclick = () => api.go('content');
          out.querySelector('[data-off]').onclick = () => {
            api.remember();
            p.cells[j][i] = { kind: 'plaza' };
            commit();
          };
          return;
        }
        // A city block (maybe a big one): its kind, and Split for a big one.
        const r = rectAt(p, i, j),
          big = r[0] !== r[1] || r[2] !== r[3];
        out.innerHTML = `<h2>${esc(KINDS[c.kind].label)}</h2>
          ${big ? `<p class="empty">One big block, ${r[1] - r[0] + 1} by ${r[3] - r[2] + 1} squares.</p>` : ''}
          <label>Block<select>${Object.entries(KINDS)
            .map(([k, t]) => `<option value="${k}" ${k === c.kind ? 'selected' : ''}>${t.label}</option>`)
            .join('')}</select></label>
          ${big ? '<button class="btn" data-split>Split into squares</button>' : ''}`;
        out.querySelector('select').onchange = e => {
          api.remember();
          const kind = e.target.value;
          // A big block keeps its size, unless the new kind is one that stays one square.
          if (big && SOLO.has(kind)) splitRect(p, r);
          for (let b = r[2]; b <= r[3]; b++) for (let a = r[0]; a <= r[1]; a++) p.cells[b][a] = { kind };
          commit();
        };
        out.querySelector('[data-split]')?.addEventListener('click', () => {
          api.remember();
          splitRect(p, r);
          commit();
        });
      }

      // Show the plan: map, lists, the picked block (in both views). No saving.
      function refresh() {
        draw();
        palette();
        inspector();
        $('[data-v="cols"]').textContent = plan().cols;
        $('[data-v="rows"]').textContent = plan().rows;
        sync3d();
      }
      // After a change: show it, save it and update the 3D city.
      function commit() {
        refresh();
        api.changed();
        update3d();
      }
      // The plan was swapped (undo, a new size, an opened file): show it, rebuild the 3D city.
      step.refresh = () => {
        gesture = null;
        refresh();
        update3d();
      };
      setView(view);
      ro = new ResizeObserver(draw);
      ro.observe(cv);
      refresh();
    },
  };
  return step;
}
