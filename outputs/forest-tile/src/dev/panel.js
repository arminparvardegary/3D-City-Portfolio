// Developer controls, added to the existing Workbench panel in development
// builds only (main.js imports this behind import.meta.env.DEV, so production
// bundles never contain it). Edits the shared `art` state live and can save,
// restore, export and import art direction presets.
const STORE = 'forest-art-presets',
  FEEL_STORE = 'forest-feel';

export function mountDevPanel(api) {
  // The Feel panel is retired: its tuned values are now the defaults in motion.js.
  try {
    localStorage.removeItem(FEEL_STORE);
  } catch {}
  const { art, applyArt, materials, meadow, canopies } = api;
  const panel = document.getElementById('settings');
  // Without the Workbench on the page, only the stats overlay is shown.
  if (!panel) return hudOnly(api);
  const sec = document.createElement('details');
  sec.className = 'dev-panel';
  sec.innerHTML = '<summary><span class="eyebrow">DEVELOPER</span></summary><div class="dev-body"></div>';
  panel.insertBefore(sec, panel.querySelector('.panel-footer'));
  const body = sec.querySelector('.dev-body');
  const state = {
    quality: 'auto',
    scale: 1,
    decor: 1,
    timeScale: 1,
    leaves: '#' + materials.leaves.color.getHexString(),
    ground: '#' + materials.ground.color.getHexString(),
  };

  const range = (label, get, set, min, max, step) => {
    const l = document.createElement('label');
    l.className = 'range-row';
    l.innerHTML = `<span>${label} <output></output></span><input type="range" min="${min}" max="${max}" step="${step}"/>`;
    const i = l.querySelector('input'),
      o = l.querySelector('output');
    const show = () => {
      i.value = get();
      o.value = (+i.value).toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0);
    };
    i.oninput = () => {
      set(+i.value);
      show();
    };
    show();
    body.append(l);
    return show;
  };
  const choice = (label, options, get, set) => {
    const l = document.createElement('label');
    l.className = 'range-row dev-select';
    l.innerHTML = `<span>${label}</span><select>${options.map(o => `<option>${o}</option>`).join('')}</select>`;
    const s = l.querySelector('select');
    s.value = get();
    s.onchange = () => set(s.value);
    body.append(l);
    return () => {
      s.value = get();
    };
  };
  const color = (label, get, set) => {
    const l = document.createElement('label');
    l.innerHTML = `${label}<input type="color"/>`;
    const i = l.querySelector('input');
    i.value = get();
    i.oninput = () => set(i.value);
    row.append(l);
    return () => {
      i.value = get();
    };
  };
  const live = f => v => {
    f(v);
    applyArt();
  };

  const ui = [];
  ui.push(
    choice(
      'Quality',
      ['auto', 'high', 'balanced', 'performance'],
      () => state.quality,
      v => {
        state.quality = v;
        api.setQuality(v);
      },
    ),
  );
  ui.push(
    range(
      'Render scale',
      () => state.scale,
      v => {
        state.scale = v;
        api.setScale(v);
      },
      0.5,
      1,
      0.05,
    ),
  );
  ui.push(
    range(
      'Sun azimuth',
      () => art.sun.azimuth,
      live(v => (art.sun.azimuth = v)),
      -180,
      180,
      1,
    ),
  );
  ui.push(
    range(
      'Sun elevation',
      () => art.sun.elevation,
      live(v => (art.sun.elevation = v)),
      10,
      85,
      1,
    ),
  );
  ui.push(
    range(
      'Sun intensity',
      () => art.sun.intensity,
      live(v => (art.sun.intensity = v)),
      0,
      5,
      0.05,
    ),
  );
  ui.push(
    range(
      'Sky light',
      () => art.sky.intensity,
      live(v => (art.sky.intensity = v)),
      0,
      3,
      0.05,
    ),
  );
  ui.push(
    range(
      'Environment',
      () => art.env,
      live(v => (art.env = v)),
      0,
      1.5,
      0.01,
    ),
  );
  ui.push(
    range(
      'Exposure',
      () => art.exposure,
      live(v => (art.exposure = v)),
      0.5,
      1.8,
      0.01,
    ),
  );
  ui.push(
    choice(
      'Tone mapping',
      ['neutral', 'agx', 'aces'],
      () => art.toneMapping,
      live(v => (art.toneMapping = v)),
    ),
  );
  ui.push(
    range(
      'Shadow softness',
      () => art.sun.softness,
      live(v => (art.sun.softness = v)),
      1,
      40,
      1,
    ),
  );
  ui.push(
    range(
      'AO intensity',
      () => art.ao.intensity,
      live(v => (art.ao.intensity = v)),
      0,
      6,
      0.1,
    ),
  );
  ui.push(
    range(
      'AO radius',
      () => art.ao.radius,
      live(v => (art.ao.radius = v)),
      0.05,
      2,
      0.05,
    ),
  );
  ui.push(
    range(
      'Fog near',
      () => art.fog.near,
      live(v => (art.fog.near = v)),
      10,
      60,
      1,
    ),
  );
  ui.push(
    range(
      'Fog far',
      () => art.fog.far,
      live(v => (art.fog.far = v)),
      20,
      120,
      1,
    ),
  );
  ui.push(
    range(
      'Decor density',
      () => state.decor,
      v => {
        state.decor = v;
        api.setDecor(v);
      },
      0,
      1,
      0.05,
    ),
  );
  ui.push(
    range(
      'Animation speed',
      () => state.timeScale,
      v => {
        state.timeScale = v;
        api.setTimeScale(v);
      },
      0,
      3,
      0.05,
    ),
  );
  const row = document.createElement('div');
  row.className = 'color-row';
  body.append(row);
  ui.push(
    color(
      'Ground',
      () => state.ground,
      v => {
        state.ground = v;
        materials.ground.color.set(v);
        materials.grass.color.set(v);
        meadow.grassMaterial?.color.set(v);
        api.refresh();
      },
    ),
  );
  ui.push(
    color(
      'Trees',
      () => state.leaves,
      v => {
        state.leaves = v;
        materials.leaves.color.set(v);
        api.refresh();
      },
    ),
  );
  ui.push(
    color(
      'AO tint',
      () => art.ao.color,
      live(v => (art.ao.color = v)),
    ),
  );
  ui.push(
    color(
      'Fog',
      () => art.fog.color,
      live(v => (art.fog.color = v)),
    ),
  );

  // Presets: save the whole art direction under a name, restore, delete, export/import JSON.
  const presets = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {};
    } catch {
      return {};
    }
  };
  const keep = p => {
    try {
      localStorage.setItem(STORE, JSON.stringify(p));
    } catch {}
  };
  const box = document.createElement('div');
  box.className = 'dev-presets';
  box.innerHTML =
    '<input placeholder="Preset name"/><button data-a="save">Save</button><select></select><button data-a="load">Load</button><button data-a="del">Delete</button><button data-a="export">Copy JSON</button><button data-a="import">Paste JSON</button>';
  body.append(box);
  const [name] = box.querySelectorAll('input'),
    sel = box.querySelector('select');
  const list = () => {
    sel.innerHTML = Object.keys(presets())
      .map(k => `<option>${k}</option>`)
      .join('');
  };
  list();
  const snapshot = () => ({ art: structuredClone(art), ...state });
  const restore = s => {
    Object.assign(art, structuredClone(s.art));
    Object.assign(state, {
      quality: s.quality,
      scale: s.scale,
      decor: s.decor,
      timeScale: s.timeScale,
      leaves: s.leaves,
      ground: s.ground,
    });
    api.setQuality(state.quality);
    api.setScale(state.scale);
    api.setDecor(state.decor);
    api.setTimeScale(state.timeScale);
    materials.leaves.color.set(state.leaves);
    materials.ground.color.set(state.ground);
    materials.grass.color.set(state.ground);
    meadow.grassMaterial?.color.set(state.ground);
    applyArt();
    ui.forEach(f => f());
  };
  box.onclick = async e => {
    const a = e.target.dataset.a;
    if (!a) return;
    const p = presets();
    if (a === 'save' && name.value.trim()) {
      p[name.value.trim()] = snapshot();
      keep(p);
      list();
      sel.value = name.value.trim();
    }
    if (a === 'load' && p[sel.value]) restore(p[sel.value]);
    if (a === 'del' && p[sel.value]) {
      delete p[sel.value];
      keep(p);
      list();
    }
    if (a === 'export') await navigator.clipboard?.writeText(JSON.stringify(snapshot(), null, 2));
    if (a === 'import') {
      try {
        restore(JSON.parse(await navigator.clipboard.readText()));
      } catch {}
    }
  };

  // Live stats overlay: frame rate, frame time, draw calls, triangles, resolution, preset.
  const hud = document.createElement('div');
  hud.className = 'dev-hud';
  document.body.append(hud);
  const times = [];
  let lastHud = 0,
    lastT = 0;
  return function stats(t) {
    if (lastT) times.push(t - lastT);
    lastT = t;
    if (times.length > 120) times.shift();
    if (t - lastHud < 500) return;
    lastHud = t;
    const avg = times.reduce((a, b) => a + b, 0) / (times.length || 1),
      worst = Math.max(...times, 0),
      info = api.renderer.info.render,
      q = api.getQuality();
    hud.textContent = `${(1000 / avg).toFixed(0)} fps  ${avg.toFixed(1)} ms (worst ${worst.toFixed(1)})\n${info.calls} calls  ${(info.triangles / 1000).toFixed(1)}k tris\n${q.name} (${q.mode})  dpr ${api.renderer.getPixelRatio().toFixed(2)}`;
  };
}

function hudOnly(api) {
  const hud = document.createElement('div');
  hud.className = 'dev-hud';
  document.body.append(hud);
  const times = [];
  let lastHud = 0,
    lastT = 0;
  return function stats(t) {
    if (lastT) times.push(t - lastT);
    lastT = t;
    if (times.length > 120) times.shift();
    if (t - lastHud < 500) return;
    lastHud = t;
    const avg = times.reduce((a, b) => a + b, 0) / (times.length || 1),
      worst = Math.max(...times, 0),
      info = api.renderer.info.render,
      q = api.getQuality();
    hud.textContent = `${(1000 / avg).toFixed(0)} fps  ${avg.toFixed(1)} ms (worst ${worst.toFixed(1)})\n${info.calls} calls  ${(info.triangles / 1000).toFixed(1)}k tris\n${q.name} (${q.mode})  dpr ${api.renderer.getPixelRatio().toFixed(2)}`;
  };
}
