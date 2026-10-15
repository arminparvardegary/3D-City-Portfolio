import './editor.css';
import {
  KINDS,
  STYLES,
  MIN,
  MAX,
  loadPlan,
  newPlace,
  normalize,
  savePlan,
  starterPlan,
} from '../plan/plan.js';

// The city builder: draw a city on a grid, then drive it.
// Roads: drag along the grid lines. Blocks: drag one from the left onto a square,
// or pick it and paint. Traffic lights: click a crossing. The square you click
// opens on the right (for a place: its name, logo, card text and store design).
// Everything is saved in this browser as you go; Download and Open move a city
// between browsers; Drive it opens the game with this city.

// Colours of the blocks on the map (the same family as the game's map).
const COLOR = {
  place: '#ff9a4a',
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
  select: { label: 'Select', hint: 'Click a square to edit it. Drag blocks from the left onto the map.' },
  road: { label: 'Roads', hint: 'Drag along the lines to lay roads. Drag over a road to remove it.' },
  light: { label: 'Traffic lights', hint: 'Click a crossing to switch its traffic lights on or off.' },
};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// --- State -----------------------------------------------------------------------
let plan = loadPlan() ?? normalize(starterPlan());
let tool = 'select'; // a TOOLS key or a KINDS key (paint that block)
let selected = null; // [i, j] of the square on the right
const undo = [],
  redo = [];
// Remember the city before a change (one step per gesture), so Undo can bring it back.
function remember() {
  undo.push(JSON.stringify(plan));
  if (undo.length > 80) undo.shift();
  redo.length = 0;
}
function restore(from, to) {
  if (!from.length) return;
  to.push(JSON.stringify(plan));
  plan = normalize(JSON.parse(from.pop()));
  if (selected && (selected[0] >= plan.cols || selected[1] >= plan.rows)) selected = null;
  changed();
}

// --- Page ------------------------------------------------------------------------
const app = document.getElementById('app');
app.className = 'app';
app.innerHTML = `
  <header class="top panel">
    <h1>City Builder</h1>
    <div class="name">
      <input type="text" data-k="name" aria-label="City name" placeholder="City name" />
      <input type="text" data-k="owner" aria-label="Your name" placeholder="Your name" />
      <input type="text" data-k="title" aria-label="What you do" placeholder="What you do" />
    </div>
    <span class="status" aria-live="polite"></span>
    <button class="btn" data-act="undo" title="Undo (Cmd/Ctrl+Z)">Undo</button>
    <button class="btn" data-act="open">Open</button>
    <button class="btn" data-act="download">Download</button>
    <button class="btn primary" data-act="drive">Drive it ›</button>
    <input type="file" accept="application/json,.json" hidden data-file="plan" />
  </header>
  <aside class="left panel">
    <h2>Tools</h2>
    <div class="tools" data-group="tools"></div>
    <div class="sep"></div>
    <h2>Blocks</h2>
    <div class="tools" data-group="kinds"></div>
  </aside>
  <main class="map">
    <canvas aria-label="City map"></canvas>
    <div class="size">
      <span>Width</span><button data-size="cols:-1" aria-label="Fewer columns">−</button><b data-v="cols"></b><button data-size="cols:1" aria-label="More columns">+</button>
      <span>Height</span><button data-size="rows:-1" aria-label="Fewer rows">−</button><b data-v="rows"></b><button data-size="rows:1" aria-label="More rows">+</button>
    </div>
    <p class="hint"></p>
  </main>
  <aside class="right panel" aria-live="polite"></aside>`;
const $ = s => app.querySelector(s);
const cv = $('canvas'),
  g = cv.getContext('2d');

// Palette: tools, then every kind of block (draggable).
$('[data-group="tools"]').innerHTML = Object.entries(TOOLS)
  .map(([k, t]) => `<button class="tool" data-tool="${k}"><span>${t.label}</span></button>`)
  .join('');
$('[data-group="kinds"]').innerHTML = Object.entries(KINDS)
  .map(
    ([k, t]) =>
      `<button class="tool" data-tool="${k}" draggable="true"><span class="swatch" style="background:${COLOR[k]}"></span><span>${t.label}<small>${t.hint}</small></span></button>`,
  )
  .join('');
app.querySelectorAll('[data-tool]').forEach(b => {
  b.onclick = () => setTool(b.dataset.tool);
  b.ondragstart = e => e.dataTransfer.setData('text/plain', b.dataset.tool);
});
function setTool(t) {
  tool = t;
  app
    .querySelectorAll('[data-tool]')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  $('.hint').textContent = TOOLS[t]?.hint ?? `Click or drag over squares to place: ${KINDS[t].label}.`;
  cv.style.cursor = t === 'select' ? 'pointer' : 'crosshair';
}

// --- Map geometry (canvas pixels) -------------------------------------------------
// The grid fills the canvas with a margin; a road is as wide on the map as in the game.
let L = null;
function layout() {
  const r = cv.getBoundingClientRect(),
    dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  const W = cv.width,
    H = cv.height,
    m = 60 * dpr,
    step = Math.min((W - 2 * m) / plan.cols, (H - 2 * m) / plan.rows);
  L = {
    dpr,
    step,
    road: step * (12 / 38), // a road is 12 of a block's 38 units
    x0: (W - step * plan.cols) / 2,
    y0: (H - step * plan.rows) / 2,
  };
  L.x = i => L.x0 + i * L.step;
  L.y = j => L.y0 + j * L.step;
}
// What is under a point: a crossing, a road segment, or a square.
function hit(px, py) {
  const { step, road } = L,
    fi = (px - L.x0) / step,
    fj = (py - L.y0) / step,
    i = Math.round(fi),
    j = Math.round(fj);
  const nearX = Math.abs(fi - i) * step < road * 0.6,
    nearY = Math.abs(fj - j) * step < road * 0.6;
  if (nearX && nearY && i >= 0 && j >= 0 && i <= plan.cols && j <= plan.rows) return { node: [i, j] };
  if (nearY && j >= 0 && j <= plan.rows && fi >= 0 && fi < plan.cols) return { h: [j, Math.floor(fi)] };
  if (nearX && i >= 0 && i <= plan.cols && fj >= 0 && fj < plan.rows) return { v: [i, Math.floor(fj)] };
  if (fi >= 0 && fj >= 0 && fi < plan.cols && fj < plan.rows)
    return { cell: [Math.floor(fi), Math.floor(fj)] };
  return null;
}
const roadsAt = (i, j) =>
  [plan.roads.h[j]?.[i - 1], plan.roads.h[j]?.[i], plan.roads.v[i]?.[j - 1], plan.roads.v[i]?.[j]].filter(
    Boolean,
  ).length;

// --- Drawing ----------------------------------------------------------------------
const logos = new Map(); // data URL -> Image
function logoImage(src) {
  if (!logos.has(src)) {
    const im = new Image();
    im.onload = draw;
    im.src = src;
    logos.set(src, im);
  }
  return logos.get(src);
}
function draw() {
  layout();
  const { dpr, step, road } = L,
    W = cv.width,
    H = cv.height;
  g.clearRect(0, 0, W, H);
  // Water and the island (8 units of promenade round the outer roads).
  const pad = road / 2 + step * (8 / 38);
  g.fillStyle = '#b98b5e';
  rr(
    L.x(0) - pad - 6 * dpr,
    L.y(0) - pad - 6 * dpr,
    step * plan.cols + 2 * pad + 12 * dpr,
    step * plan.rows + 2 * pad + 12 * dpr,
    22 * dpr,
  );
  g.fill();
  g.fillStyle = '#4e4796';
  rr(L.x(0) - pad, L.y(0) - pad, step * plan.cols + 2 * pad, step * plan.rows + 2 * pad, 18 * dpr);
  g.fill();
  // Squares.
  for (let j = 0; j < plan.rows; j++)
    for (let i = 0; i < plan.cols; i++) {
      const c = plan.cells[j][i],
        x = L.x(i) + road / 2,
        y = L.y(j) + road / 2,
        s = step - road;
      g.fillStyle = COLOR[c.kind];
      rr(x, y, s, s, 10 * dpr);
      g.fill();
      if (selected && selected[0] === i && selected[1] === j) {
        g.lineWidth = 4 * dpr;
        g.strokeStyle = '#ffffff';
        rr(x - 3 * dpr, y - 3 * dpr, s + 6 * dpr, s + 6 * dpr, 12 * dpr);
        g.stroke();
      }
      // A place shows its logo and name; any other block its name.
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (c.kind === 'place') {
        const p = c.place,
          r = Math.min(s * 0.22, 34 * dpr);
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x + s / 2, y + s * 0.42, r, 0, 7);
        g.fill();
        const im = p.logo && logoImage(p.logo);
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
          g.fillStyle = p.color;
          g.font = `700 ${r * 1.2}px ${getComputedStyle(document.body).getPropertyValue('--hand')}`;
          g.fillText(p.name.slice(0, 1).toUpperCase(), x + s / 2, y + s * 0.42 + r * 0.08);
        }
        label(p.name, x + s / 2, y + s * 0.78, s);
      } else label(KINDS[c.kind].label, x + s / 2, y + s / 2, s);
    }
  // Roads: asphalt with a dashed centre line; missing ones as faint dots to show where one can go.
  const seg = (x1, y1, x2, y2, on) => {
    g.lineCap = 'butt';
    if (on) {
      g.strokeStyle = '#23203f';
      g.lineWidth = road;
      line(x1, y1, x2, y2);
      g.strokeStyle = 'rgba(255,214,90,.55)';
      g.lineWidth = 2 * dpr;
      g.setLineDash([8 * dpr, 8 * dpr]);
      line(x1, y1, x2, y2);
      g.setLineDash([]);
    } else {
      g.strokeStyle = 'rgba(220,214,255,.22)';
      g.lineWidth = 2 * dpr;
      g.setLineDash([3 * dpr, 9 * dpr]);
      line(x1, y1, x2, y2);
      g.setLineDash([]);
    }
  };
  for (let j = 0; j <= plan.rows; j++)
    for (let i = 0; i < plan.cols; i++) seg(L.x(i), L.y(j), L.x(i + 1), L.y(j), plan.roads.h[j][i]);
  for (let i = 0; i <= plan.cols; i++)
    for (let j = 0; j < plan.rows; j++) seg(L.x(i), L.y(j), L.x(i), L.y(j + 1), plan.roads.v[i][j]);
  // Crossings: asphalt where a road reaches; a traffic light where three or more meet.
  for (let j = 0; j <= plan.rows; j++)
    for (let i = 0; i <= plan.cols; i++) {
      const n = roadsAt(i, j);
      if (!n) continue;
      g.fillStyle = '#23203f';
      g.fillRect(L.x(i) - road / 2, L.y(j) - road / 2, road, road);
      if (n >= 3) {
        const off = plan.lightsOff.includes(i + ',' + j);
        g.fillStyle = off ? '#6b6890' : '#21e06e';
        g.shadowColor = off ? 'transparent' : '#21e06e';
        g.shadowBlur = 10 * dpr;
        g.beginPath();
        g.arc(L.x(i), L.y(j), 6 * dpr, 0, 7);
        g.fill();
        g.shadowBlur = 0;
      }
    }
}
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
  g.font = `600 ${size}px ${getComputedStyle(document.body).fontFamily}`;
  g.fillStyle = 'rgba(16,10,40,.55)';
  const w = Math.min(s - 10, g.measureText(text).width + 16);
  rr(x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.75);
  g.fill();
  g.fillStyle = '#fff';
  g.fillText(text.length > 18 ? text.slice(0, 17) + '…' : text, x, y + 1);
}

// --- Editing on the map -------------------------------------------------------------
let gesture = null; // what a drag keeps doing: { road: true|false } or { kind }
function paintCell([i, j], kind) {
  const c = plan.cells[j][i];
  if (c.kind === kind) return;
  if (kind === 'place') {
    const n = plan.cells.flat().filter(q => q.kind === 'place').length + 1;
    plan.cells[j][i] = { kind, place: newPlace(n) };
  } else plan.cells[j][i] = { kind };
}
function applyAt(e) {
  const r = cv.getBoundingClientRect(),
    h = hit((e.clientX - r.left) * L.dpr, (e.clientY - r.top) * L.dpr);
  if (!h || !gesture) return;
  if ('road' in gesture) {
    if (h.h) plan.roads.h[h.h[0]][h.h[1]] = gesture.road;
    if (h.v) plan.roads.v[h.v[0]][h.v[1]] = gesture.road;
  } else if (gesture.kind && h.cell) {
    paintCell(h.cell, gesture.kind);
    selected = h.cell;
  }
  changed();
}
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect(),
    h = hit((e.clientX - r.left) * L.dpr, (e.clientY - r.top) * L.dpr);
  if (!h) return;
  if (tool === 'select') {
    if (h.cell) selected = h.cell;
    changed(false);
    return;
  }
  remember();
  if (tool === 'light') {
    if (h.node && roadsAt(...h.node) >= 3) {
      const k = h.node.join(','),
        at = plan.lightsOff.indexOf(k);
      if (at >= 0) plan.lightsOff.splice(at, 1);
      else plan.lightsOff.push(k);
      changed();
    }
    return;
  }
  if (tool === 'road') {
    const on = h.h ? plan.roads.h[h.h[0]][h.h[1]] : h.v ? plan.roads.v[h.v[0]][h.v[1]] : null;
    if (on === null) return;
    gesture = { road: !on };
  } else gesture = { kind: tool };
  cv.setPointerCapture(e.pointerId);
  applyAt(e);
});
cv.addEventListener('pointermove', e => {
  if (gesture) applyAt(e);
});
cv.addEventListener('pointerup', () => (gesture = null));
cv.addEventListener('pointercancel', () => (gesture = null));
// Drop a block from the left onto a square.
cv.addEventListener('dragover', e => e.preventDefault());
cv.addEventListener('drop', e => {
  e.preventDefault();
  const kind = e.dataTransfer.getData('text/plain'),
    r = cv.getBoundingClientRect(),
    h = hit((e.clientX - r.left) * L.dpr, (e.clientY - r.top) * L.dpr);
  if (!KINDS[kind] || !h?.cell) return;
  remember();
  paintCell(h.cell, kind);
  selected = h.cell;
  changed();
});

// Grid size: add or remove a column or row on the right / bottom edge.
app.querySelectorAll('[data-size]').forEach(b => {
  b.onclick = () => {
    const [axis, d] = b.dataset.size.split(':'),
      next = plan[axis] + +d;
    if (next < MIN || next > MAX) return;
    remember();
    const p = structuredClone(plan);
    p[axis] = next;
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
    plan = normalize(p);
    if (selected && (selected[0] >= plan.cols || selected[1] >= plan.rows)) selected = null;
    changed();
  };
});

// --- The square on the right --------------------------------------------------------
function inspector() {
  const el = $('.right');
  if (!selected) {
    el.innerHTML = `<h2>Square</h2><p class="empty">Click a square on the map to edit it. A place is a company or project:
      it gets a store with your logo and a parking bay; park there and press Enter to open its card.</p>`;
    return;
  }
  const [i, j] = selected,
    c = plan.cells[j][i];
  const kinds = Object.entries(KINDS)
    .map(([k, t]) => `<option value="${k}" ${k === c.kind ? 'selected' : ''}>${t.label}</option>`)
    .join('');
  let html = `<h2>${esc(KINDS[c.kind].label)}</h2><label>Block<select data-f="kind">${kinds}</select></label>`;
  if (c.kind === 'place') {
    const p = c.place;
    html += `
      <div class="logo-drop">
        <div class="preview" style="${p.logo ? `background-image:url('${esc(p.logo)}')` : `background-color:${esc(p.color)};color:#fff`}">${p.logo ? '' : esc(p.name.slice(0, 1))}</div>
        <div><button class="btn" data-act="logo">${p.logo ? 'Change logo' : 'Add logo'}</button>
          ${p.logo ? '<button class="btn" data-act="nologo">Remove</button>' : ''}</div>
        <input type="file" accept="image/*" hidden data-file="logo" />
      </div>
      <label>Name<input type="text" data-f="name" value="${esc(p.name)}" maxlength="40" /></label>
      <label>Your role<input type="text" data-f="role" value="${esc(p.role)}" maxlength="40" /></label>
      <div class="row2"><label>From<input type="text" data-f="from" value="${esc(p.from)}" maxlength="12" /></label>
        <label>To<input type="text" data-f="to" value="${esc(p.to)}" maxlength="12" /></label></div>
      <label>What you did<textarea data-f="note" maxlength="240">${esc(p.note)}</textarea></label>
      <label>Link<input type="url" data-f="link" value="${esc(p.link)}" placeholder="yourcompany.com" /></label>
      <label>Colour<input type="color" data-f="color" value="${esc(p.color)}" style="height:40px;width:64px;border:0;background:none" /></label>
      <div><label>Store design</label><div class="designs">${Object.entries(STYLES)
        .map(([k, s]) => `<button data-style="${k}" aria-pressed="${p.style === k}">${s.label}</button>`)
        .join('')}</div></div>`;
  }
  el.innerHTML = html;
  el.querySelector('[data-f="kind"]').onchange = e => {
    remember();
    paintCell(selected, e.target.value);
    changed();
  };
  if (c.kind !== 'place') return;
  const p = c.place;
  el.querySelectorAll('[data-f]').forEach(f => {
    if (f.dataset.f === 'kind') return;
    f.onfocus = () => remember();
    f.oninput = () => {
      p[f.dataset.f] = f.value;
      changed(true, false);
    };
  });
  el.querySelectorAll('[data-style]').forEach(b => {
    b.onclick = () => {
      remember();
      p.style = b.dataset.style;
      changed();
    };
  });
  const file = el.querySelector('[data-file="logo"]');
  el.querySelector('[data-act="logo"]').onclick = () => file.click();
  el.querySelector('[data-act="nologo"]')?.addEventListener('click', () => {
    remember();
    p.logo = '';
    changed();
  });
  file.onchange = async () => {
    const f = file.files[0];
    if (!f) return;
    remember();
    p.logo = await shrink(f);
    changed();
  };
}
// A logo is kept inside the plan: scaled to at most 256 px so the city stays small enough to save.
function shrink(f) {
  return new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 256 / Math.max(im.naturalWidth, im.naturalHeight)),
        c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * k));
      c.height = Math.max(1, Math.round(im.naturalHeight * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(im.src);
      ok(c.toDataURL('image/png'));
    };
    im.onerror = fail;
    im.src = URL.createObjectURL(f);
  });
}

// --- Top bar ---------------------------------------------------------------------------
const nameIn = $('[data-k="name"]'),
  ownerIn = $('[data-k="owner"]'),
  titleIn = $('[data-k="title"]');
for (const f of [nameIn, ownerIn, titleIn]) {
  f.onfocus = () => remember();
  f.oninput = () => {
    if (f === nameIn) plan.name = f.value;
    else if (f === ownerIn) plan.owner.name = f.value;
    else plan.owner.title = f.value;
    changed(true, false);
  };
}
$('[data-act="undo"]').onclick = () => restore(undo, redo);
$('[data-act="download"]').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
  a.download = (plan.name || 'city').replace(/[^\w-]+/g, '-').toLowerCase() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
const planFile = $('[data-file="plan"]');
$('[data-act="open"]').onclick = () => planFile.click();
planFile.onchange = async () => {
  const f = planFile.files[0];
  if (!f) return;
  try {
    const next = normalize(JSON.parse(await f.text()));
    remember();
    plan = next;
    selected = null;
    changed();
  } catch {
    status('That file is not a city.', true);
  }
  planFile.value = '';
};
$('[data-act="drive"]').onclick = () => {
  if (save()) location.href = `${import.meta.env.BASE_URL}?city=mine`;
};
addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? restore(redo, undo) : restore(undo, redo);
  } else if (e.key === 'r') setTool('road');
  else if (e.key === 'l') setTool('light');
  else if (e.key === 'v' || e.key === 'Escape') setTool('select');
});

// --- Saving ----------------------------------------------------------------------------
function status(text, warn = false) {
  const s = $('.status');
  s.textContent = text;
  s.classList.toggle('warn', warn);
}
function save() {
  const ok = savePlan(plan);
  status(ok ? 'Saved' : 'Not saved: this browser is out of space (use smaller logos)', !ok);
  return ok;
}
let saveTimer = 0;
// After any change: redraw the map, refresh the panels, save shortly after.
function changed(persist = true, refreshPanel = true) {
  draw();
  if (refreshPanel) inspector();
  $('[data-v="cols"]').textContent = plan.cols;
  $('[data-v="rows"]').textContent = plan.rows;
  if (persist === false) return;
  status('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

nameIn.value = plan.name;
ownerIn.value = plan.owner.name;
titleIn.value = plan.owner.title;
setTool('select');
new ResizeObserver(draw).observe(cv);
changed(false);
status(loadPlan() ? 'Saved' : 'A starter city: make it yours');
