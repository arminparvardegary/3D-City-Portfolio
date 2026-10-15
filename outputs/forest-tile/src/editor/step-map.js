import { KINDS, MAX, MIN, STYLES, normalize, placeOf } from '../plan/plan.js';
import { esc } from './ui.js';

// Step 3, Build: place everything on the map. "Your things" lists each job,
// school and the skills and tools boards: drag one onto a square (or pick it and
// click a square); dragging it again moves it. Roads: drag along the grid lines.
// Traffic lights: click a crossing. City blocks: drag or paint them anywhere.

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
  select: { label: 'Select', hint: 'Click a square to see it. Drag things from the left onto the map.' },
  road: { label: 'Roads', hint: 'Drag along the lines to lay roads. Drag over a road to remove it.' },
  light: { label: 'Traffic lights', hint: 'Click a crossing to switch its traffic lights on or off.' },
};
// A brush: a tool, a city block ("kind"), or one of your things ("exp:id", "edu:id", "skills", "tools").
const isThing = b => /^(exp|edu):/.test(b) || b === 'skills' || b === 'tools';

export function mapStep() {
  let ro = null;
  return {
    unmount() {
      ro?.disconnect();
    },
    mount(el, api) {
      const plan = () => api.plan;
      let tool = 'select',
        selected = null,
        gesture = null,
        L = null;
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
            <canvas aria-label="City map"></canvas>
            <div class="size">
              <span>Width</span><button data-size="cols:-1" aria-label="Fewer columns">−</button><b data-v="cols"></b><button data-size="cols:1" aria-label="More columns">+</button>
              <span>Height</span><button data-size="rows:-1" aria-label="Fewer rows">−</button><b data-v="rows"></b><button data-size="rows:1" aria-label="More rows">+</button>
            </div>
            <p class="hint"></p>
          </main>
          <aside class="right panel" aria-live="polite"></aside>
        </div>`;
      const $ = s => el.querySelector(s),
        cv = $('canvas'),
        g = cv.getContext('2d');

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
              <span>${esc(t.label)}<small>${esc(t.sub)}${on ? ' · on the map' : ' · drag onto the map'}</small></span></button>`;
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
            // A thing already on the map: clicking it shows its square.
            const at = isThing(b.dataset.brush) && where(b.dataset.brush);
            if (at) {
              selected = at;
              setTool('select');
              redraw();
            } else setTool(b.dataset.brush);
          };
          b.ondragstart = e => e.dataTransfer.setData('text/plain', b.dataset.brush);
          b.setAttribute('aria-pressed', String(b.dataset.brush === tool));
        });
      }
      function setTool(t) {
        tool = t;
        el.querySelectorAll('[data-brush]').forEach(b =>
          b.setAttribute('aria-pressed', String(b.dataset.brush === t)),
        );
        $('.hint').textContent = TOOLS[t]?.hint ?? 'Click or drag over squares to place it.';
        cv.style.cursor = t === 'select' ? 'pointer' : 'crosshair';
      }

      // --- Map geometry (canvas pixels) ------------------------------------------------
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
      // What is under a point: a crossing, a road segment, or a square.
      function hit(e) {
        const r = cv.getBoundingClientRect(),
          px = (e.clientX - r.left) * L.dpr,
          py = (e.clientY - r.top) * L.dpr;
        const { step, road } = L,
          p = plan(),
          fi = (px - L.x0) / step,
          fj = (py - L.y0) / step,
          i = Math.round(fi),
          j = Math.round(fj);
        const nearX = Math.abs(fi - i) * step < road * 0.6,
          nearY = Math.abs(fj - j) * step < road * 0.6;
        if (nearX && nearY && i >= 0 && j >= 0 && i <= p.cols && j <= p.rows) return { node: [i, j] };
        if (nearY && j >= 0 && j <= p.rows && fi >= 0 && fi < p.cols) return { h: [j, Math.floor(fi)] };
        if (nearX && i >= 0 && i <= p.cols && fj >= 0 && fj < p.rows) return { v: [i, Math.floor(fj)] };
        if (fi >= 0 && fj >= 0 && fi < p.cols && fj < p.rows)
          return { cell: [Math.floor(fi), Math.floor(fj)] };
        return null;
      }
      const roadsAt = (i, j) => {
        const p = plan();
        return [p.roads.h[j]?.[i - 1], p.roads.h[j]?.[i], p.roads.v[i]?.[j - 1], p.roads.v[i]?.[j]].filter(
          Boolean,
        ).length;
      };

      // --- Drawing ----------------------------------------------------------------------
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
      function draw() {
        layout();
        const { dpr, step, road } = L,
          p = plan();
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
        // Squares: a place shows its logo and name; any other block its name.
        for (let j = 0; j < p.rows; j++)
          for (let i = 0; i < p.cols; i++) {
            const c = p.cells[j][i],
              x = L.x(i) + road / 2,
              y = L.y(j) + road / 2,
              s = step - road,
              place = c.kind === 'place' && placeOf(p, c.ref);
            g.fillStyle = place ? place.color : COLOR[c.kind];
            rr(x, y, s, s, 10 * dpr);
            g.fill();
            if (selected && selected[0] === i && selected[1] === j) {
              g.lineWidth = 4 * dpr;
              g.strokeStyle = '#ffffff';
              rr(x - 3 * dpr, y - 3 * dpr, s + 6 * dpr, s + 6 * dpr, 12 * dpr);
              g.stroke();
            }
            if (place) {
              const r = Math.min(s * 0.22, 34 * dpr);
              g.fillStyle = '#fff';
              g.beginPath();
              g.arc(x + s / 2, y + s * 0.42, r, 0, 7);
              g.fill();
              const im = place.logo && logoImage(place.logo);
              if (im?.complete && im.naturalWidth) {
                const k = Math.min((r * 1.4) / im.naturalWidth, (r * 1.4) / im.naturalHeight);
                g.drawImage(
                  im,
                  x + s / 2 - (im.naturalWidth * k) / 2,
                  y + s * 0.42 - (im.naturalHeight * k) / 2,
                  im.naturalWidth * k,
                  im.naturalHeight * k,
                );
              } else {
                g.fillStyle = place.color;
                g.font = `700 ${r * 1.2}px ${hand}`;
                g.textAlign = 'center';
                g.textBaseline = 'middle';
                g.fillText(place.name.slice(0, 1).toUpperCase(), x + s / 2, y + s * 0.42 + r * 0.08);
              }
              label(place.name, x + s / 2, y + s * 0.78, s);
            } else
              label(
                KINDS[c.kind]?.label ?? (c.kind === 'skills' ? 'Skills board' : 'Tools board'),
                x + s / 2,
                y + s / 2,
                s,
              );
          }
        // Roads: asphalt with a dashed centre line; missing ones as faint dots.
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
        for (let j = 0; j <= p.rows; j++)
          for (let i = 0; i < p.cols; i++) seg(L.x(i), L.y(j), L.x(i + 1), L.y(j), p.roads.h[j][i]);
        for (let i = 0; i <= p.cols; i++)
          for (let j = 0; j < p.rows; j++) seg(L.x(i), L.y(j), L.x(i), L.y(j + 1), p.roads.v[i][j]);
        // Crossings: asphalt where a road reaches; a traffic light where three or more meet.
        for (let j = 0; j <= p.rows; j++)
          for (let i = 0; i <= p.cols; i++) {
            const n = roadsAt(i, j);
            if (!n) continue;
            g.fillStyle = '#23203f';
            g.fillRect(L.x(i) - road / 2, L.y(j) - road / 2, road, road);
            if (n < 3) continue;
            const off = p.lightsOff.includes(i + ',' + j);
            g.fillStyle = off ? '#6b6890' : '#21e06e';
            g.shadowColor = off ? 'transparent' : '#21e06e';
            g.shadowBlur = 10 * dpr;
            g.beginPath();
            g.arc(L.x(i), L.y(j), 6 * dpr, 0, 7);
            g.fill();
            g.shadowBlur = 0;
          }
      }

      // --- Editing on the map ------------------------------------------------------------
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
      function applyAt(e) {
        const h = hit(e),
          p = plan();
        if (!h || !gesture) return;
        if ('road' in gesture) {
          if (h.h) p.roads.h[h.h[0]][h.h[1]] = gesture.road;
          if (h.v) p.roads.v[h.v[0]][h.v[1]] = gesture.road;
        } else if (gesture.brush && h.cell) {
          paint(h.cell, gesture.brush);
          selected = h.cell;
          // One of your things goes on one square: the gesture ends there, saved, back to Select.
          if (isThing(gesture.brush)) {
            gesture = null;
            setTool('select');
            redraw();
            return;
          }
        }
        redraw(false);
      }
      cv.onpointerdown = e => {
        const h = hit(e);
        if (!h) return;
        if (tool === 'select') {
          if (h.cell) selected = h.cell;
          redraw(false);
          return;
        }
        api.remember();
        if (tool === 'light') {
          if (h.node && roadsAt(...h.node) >= 3) {
            const k = h.node.join(','),
              list = plan().lightsOff,
              at = list.indexOf(k);
            if (at >= 0) list.splice(at, 1);
            else list.push(k);
            redraw();
          }
          return;
        }
        if (tool === 'road') {
          const on = h.h ? plan().roads.h[h.h[0]][h.h[1]] : h.v ? plan().roads.v[h.v[0]][h.v[1]] : null;
          if (on === null) return;
          gesture = { road: !on };
        } else gesture = { brush: tool };
        cv.setPointerCapture(e.pointerId);
        applyAt(e);
      };
      cv.onpointermove = e => gesture && applyAt(e);
      cv.onpointerup = cv.onpointercancel = () => {
        if (gesture) redraw();
        gesture = null;
      };
      cv.ondragover = e => e.preventDefault();
      cv.ondrop = e => {
        e.preventDefault();
        const brush = e.dataTransfer.getData('text/plain'),
          h = hit(e);
        if (!h?.cell || !(KINDS[brush] || isThing(brush))) return;
        api.remember();
        paint(h.cell, brush);
        selected = h.cell;
        redraw();
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
          if (selected && (selected[0] >= nextN || selected[1] >= nextN)) selected = null;
          api.replace(normalize(p));
        };
      });

      // --- The square on the right ----------------------------------------------------------
      function inspector() {
        const box = $('.right'),
          p = plan();
        if (!selected) {
          box.innerHTML = `<h2>Square</h2><p class="empty">Click a square to see it. Drag your jobs, schools and boards
            from the left onto the map; drag again to move one. Park in front of a building and press Enter to open its card.</p>`;
          return;
        }
        const [i, j] = selected,
          c = p.cells[j][i],
          place = c.kind === 'place' && placeOf(p, c.ref);
        if (place || c.kind === 'skills' || c.kind === 'tools') {
          box.innerHTML = place
            ? `<h2>${esc(place.name)}</h2><p class="empty">${esc(place.kind)}${place.role ? ' · ' + esc(place.role) : ''}</p>
               <div><span class="field-label">Building</span><div class="designs">${Object.entries(STYLES)
                 .map(
                   ([k, s]) =>
                     `<button data-style="${k}" aria-pressed="${place.style === k}">${s.label}</button>`,
                 )
                 .join('')}</div></div>
               <button class="btn" data-edit>Edit details</button><button class="btn" data-off>Remove from the map</button>`
            : `<h2>${c.kind === 'skills' ? 'Skills board' : 'Tools board'}</h2><p class="empty">${esc(p[c.kind].join(', ') || 'Nothing yet')}</p>
               <button class="btn" data-edit>Edit the list</button><button class="btn" data-off>Remove from the map</button>`;
          box.querySelectorAll('[data-style]').forEach(b => {
            b.onclick = () => {
              api.remember();
              const [type, id] = c.ref.split(':');
              (type === 'exp' ? p.experiences : p.education).find(x => x.id === id).style = b.dataset.style;
              redraw();
            };
          });
          box.querySelector('[data-edit]').onclick = () => api.go('content');
          box.querySelector('[data-off]').onclick = () => {
            api.remember();
            p.cells[j][i] = { kind: 'plaza' };
            redraw();
          };
          return;
        }
        box.innerHTML = `<h2>${esc(KINDS[c.kind].label)}</h2><label>Block<select>${Object.entries(KINDS)
          .map(([k, t]) => `<option value="${k}" ${k === c.kind ? 'selected' : ''}>${t.label}</option>`)
          .join('')}</select></label>`;
        box.querySelector('select').onchange = e => {
          api.remember();
          p.cells[j][i] = { kind: e.target.value };
          redraw();
        };
      }

      // After a change: redraw the map and panels, and save (persist false while a drag is still going).
      function redraw(persist = true) {
        draw();
        palette();
        inspector();
        $('[data-v="cols"]').textContent = plan().cols;
        $('[data-v="rows"]').textContent = plan().rows;
        if (persist) api.changed();
      }
      setTool('select');
      ro = new ResizeObserver(draw);
      ro.observe(cv);
      redraw(false);
    },
  };
}
