// A city plan: everything the builder lets people choose, as plain data. The
// game builds the city from it with the same pieces as Armin's New York.
//
// Content (steps 1 and 2 of the builder):
//   profile      name, title, about, age, email, phones (all optional)
//   experiences  [{ id, company, role, from, to, note, link, logo, color, style }]
//   education    [{ id, school, degree, from, to, note, link, logo, color, style }]
//   skills, tools  lists of words
// The city (step 3): a grid of (cols + 1) avenues and (rows + 1) streets, PITCH
// apart, with cols x rows squares between them. Roads are segments of those lines:
//   roads.h[j][i]  along street j, from avenue i to avenue i + 1
//   roads.v[i][j]  along avenue i, from street j to street j + 1
// Each square holds one kind of block (KINDS). A "place" square stands for one
// experience or education entry (ref "exp:<id>" or "edu:<id>"): a store with its
// logo and a parking bay. "skills" and "tools" squares are boards listing them.
// Traffic lights stand at every crossing of three or more roads, except at the
// crossings listed in lightsOff ("i,j").
// Neighbouring squares of the same kind with no road between them are one big
// block (planRects). start: where the car starts, a road segment and a direction
// ({ axis: 'h' | 'v', i, j, dir: 1 | -1 }), or null for in front of the first place.

export const PITCH = 38; // avenue to avenue (a block plus a road)
export const MIN = 2,
  MAX = 8; // squares per side

// City blocks the builder offers, in the order it shows them.
export const KINDS = {
  boutique: { label: 'Glass boutique', hint: 'A luxury glass store' },
  garage: { label: 'Car garage', hint: 'Visitors choose their car here' },
  low: { label: 'Walk-ups', hint: 'Low brick buildings' },
  mid: { label: 'Offices', hint: 'Mid-rise offices' },
  tall: { label: 'Towers', hint: 'Glass and stone towers' },
  brownstone: { label: 'Brownstones', hint: 'Row houses with stoops' },
  park: { label: 'Park', hint: 'Grass, trees and paths' },
  pond: { label: 'Park with pond', hint: 'A park with a pond' },
  plaza: { label: 'Plaza', hint: 'An open paved square' },
  empire: { label: 'Empire State', hint: 'Landmark' },
  chrysler: { label: 'Chrysler', hint: 'Landmark' },
  wtc: { label: 'One World Trade', hint: 'Landmark' },
  dome: { label: 'Copper dome', hint: 'Landmark' },
};
// Squares that show your content (placed from the builder's "Your things").
export const CONTENT = {
  place: { label: 'Place' },
  skills: { label: 'Skills board' },
  tools: { label: 'Tools board' },
};
export const isKind = k => !!(KINDS[k] || CONTENT[k]);

// The five store designs a place can use (the built-in brand each one starts from).
export const STYLES = {
  studio: { label: 'Studio', base: 'rush' },
  shop: { label: 'Corner shop', base: 'hindra' },
  office: { label: 'Office', base: 'aaq' },
  agency: { label: 'Agency', base: 'bigup' },
  hq: { label: 'Glass HQ', base: 'keel' },
};
const COLORS = ['#ff6b5e', '#5ab4f0', '#c9a957', '#ffc93a', '#2f6bff', '#7f86ff'];

export const STORAGE_KEY = 'city-plan';
export const fullGrid = (n, m, v = true) => Array.from({ length: n }, () => Array(m).fill(v));
export const newId = () => Math.random().toString(36).slice(2, 9);

export function newExperience(n = 1) {
  return {
    id: newId(),
    company: `Company ${n}`,
    role: '',
    from: '',
    to: '',
    note: '',
    link: '',
    logo: '',
    color: COLORS[(n - 1) % COLORS.length],
    style: Object.keys(STYLES)[(n - 1) % 5],
  };
}
export function newEducation(n = 1) {
  return {
    id: newId(),
    school: `School ${n}`,
    degree: '',
    from: '',
    to: '',
    note: '',
    link: '',
    logo: '',
    color: COLORS[(n + 2) % COLORS.length],
    style: 'office',
  };
}

// A small starter city: a 4 x 3 grid with every road, two sample jobs placed,
// skills and tools boards, a park and a garage.
export function starterPlan() {
  const cols = 4,
    rows = 3,
    a = newExperience(1),
    b = newExperience(2);
  const cells = Array.from({ length: rows }, (_, j) =>
    Array.from({ length: cols }, (_, i) => ({ kind: ['mid', 'tall', 'low', 'brownstone'][(i + j) % 4] })),
  );
  cells[0][0] = { kind: 'park' };
  cells[1][1] = { kind: 'place', ref: 'exp:' + a.id };
  cells[1][2] = { kind: 'place', ref: 'exp:' + b.id };
  cells[0][2] = { kind: 'skills' };
  cells[2][3] = { kind: 'garage' };
  return {
    version: 2,
    name: 'My city',
    profile: { name: '', title: '', about: '', age: '', email: '', phones: [] },
    experiences: [a, b],
    education: [],
    skills: ['Design', 'Product', 'Leadership'],
    tools: [],
    cols,
    rows,
    roads: { h: fullGrid(rows + 1, cols), v: fullGrid(cols + 1, rows) },
    cells,
    lightsOff: [],
  };
}

const str = (v, n) => String(v ?? '').slice(0, n);
const entry = (e, base, i) => ({
  ...base,
  ...e,
  id: str(e?.id, 20) || newId(),
  style: STYLES[e?.style] ? e.style : base.style,
  color: /^#[0-9a-f]{6}$/i.test(e?.color ?? '') ? e.color : base.color,
  note: str(e?.note, 400),
  logo: typeof e?.logo === 'string' && /^data:image\//.test(e.logo) ? e.logo : '',
  i,
});

// Make any loaded plan safe to build: right sizes, known kinds, roads present.
// A version 1 plan (places written into the squares) is converted.
export function normalize(input) {
  const p = structuredClone(input ?? starterPlan());
  // Version 1: owner and inline places.
  if (!p.version || p.version < 2) {
    p.profile = { name: p.owner?.name ?? '', title: p.owner?.title ?? '' };
    p.experiences = [];
    (p.cells ?? []).forEach(row =>
      row?.forEach((c, i) => {
        if (c?.kind !== 'place' || !c.place) return;
        const e = {
          ...newExperience(p.experiences.length + 1),
          ...c.place,
          company: c.place.name ?? 'Company',
        };
        delete e.name;
        p.experiences.push(e);
        row[i] = { kind: 'place', ref: 'exp:' + e.id };
      }),
    );
  }
  const out = { version: 2 };
  out.name = str(p.name || 'My city', 60);
  const pr = p.profile ?? {};
  out.profile = {
    name: str(pr.name, 60),
    title: str(pr.title, 80),
    about: str(pr.about, 600),
    age: str(pr.age, 4),
    email: str(pr.email, 120),
    phones: (Array.isArray(pr.phones) ? pr.phones : [])
      .map(v => str(v, 30))
      .filter(Boolean)
      .slice(0, 4),
  };
  out.experiences = (Array.isArray(p.experiences) ? p.experiences : [])
    .slice(0, 24)
    .map((e, i) => entry(e, newExperience(i + 1), i));
  out.education = (Array.isArray(p.education) ? p.education : [])
    .slice(0, 12)
    .map((e, i) => entry(e, newEducation(i + 1), i));
  for (const list of [out.experiences, out.education]) list.forEach(e => delete e.i);
  const words = v =>
    (Array.isArray(v) ? v : [])
      .map(w => str(w, 40).trim())
      .filter(Boolean)
      .slice(0, 40);
  out.skills = words(p.skills);
  out.tools = words(p.tools);
  out.cols = Math.min(MAX, Math.max(MIN, p.cols | 0 || 4));
  out.rows = Math.min(MAX, Math.max(MIN, p.rows | 0 || 3));
  const refs = new Set([
    ...out.experiences.map(e => 'exp:' + e.id),
    ...out.education.map(e => 'edu:' + e.id),
  ]);
  const placed = new Set();
  const cell = (j, i) => {
    const c = p.cells?.[j]?.[i];
    if (!c || !isKind(c.kind)) return { kind: 'mid' };
    // A place needs an entry that exists and is not already on the map.
    if (c.kind === 'place') {
      if (!refs.has(c.ref) || placed.has(c.ref)) return { kind: 'plaza' };
      placed.add(c.ref);
      return { kind: 'place', ref: c.ref };
    }
    return { kind: c.kind };
  };
  out.cells = Array.from({ length: out.rows }, (_, j) =>
    Array.from({ length: out.cols }, (_, i) => cell(j, i)),
  );
  const bool = (arr, a, b) =>
    Array.from({ length: a }, (_, x) => Array.from({ length: b }, (_, y) => arr?.[x]?.[y] !== false));
  out.roads = { h: bool(p.roads?.h, out.rows + 1, out.cols), v: bool(p.roads?.v, out.cols + 1, out.rows) };
  out.lightsOff = Array.isArray(p.lightsOff) ? p.lightsOff.filter(k => typeof k === 'string') : [];
  // The start must be on a road that is there.
  const st = p.start;
  out.start =
    st && (st.axis === 'h' ? out.roads.h[st.j]?.[st.i] : st.axis === 'v' && out.roads.v[st.i]?.[st.j])
      ? { axis: st.axis, i: st.i | 0, j: st.j | 0, dir: st.dir === -1 ? -1 : 1 }
      : null;
  return out;
}

// What a place square shows: its entry as a store and a card.
export function placeOf(plan, ref) {
  const [type, id] = String(ref).split(':');
  if (type === 'exp') {
    const e = plan.experiences.find(x => x.id === id);
    return e && { ...e, kind: 'Experience', name: e.company, role: e.role };
  }
  if (type === 'edu') {
    const e = plan.education.find(x => x.id === id);
    return e && { ...e, kind: 'Education', name: e.school, role: e.degree };
  }
  return null;
}

// Squares that never join a neighbour: each of your things, a boutique, the garage.
export const SOLO = new Set(['place', 'boutique', 'garage', 'skills', 'tools']);

// The plan's blocks as rectangles of squares [i0, i1, j0, j1]. Squares joined by
// missing roads are one block when they are the same kind and together fill a
// rectangle with no road left inside; otherwise each stays its own block (the
// empty road between them is paved). merged[j][i] marks squares inside a big block.
export function planRects(plan) {
  const { cols, rows, roads, cells } = plan;
  const open = (i, j, di) => (di ? !roads.v[i + 1][j] : !roads.h[j + 1][i]); // no road toward +x / +z
  const grid = () => Array.from({ length: rows }, () => Array(cols).fill(false));
  const seen = grid(),
    merged = grid(),
    rects = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      if (seen[j][i]) continue;
      // The squares reachable through missing roads, between plain blocks of one kind.
      const comp = [],
        stack = [[i, j]];
      seen[j][i] = true;
      while (stack.length) {
        const [a, b] = stack.pop();
        comp.push([a, b]);
        for (const [da, db] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const na = a + da,
            nb = b + db;
          if (na < 0 || nb < 0 || na >= cols || nb >= rows || seen[nb][na]) continue;
          const k = cells[b][a].kind,
            alike = k === cells[nb][na].kind && !SOLO.has(k);
          if (alike && (da ? open(Math.min(a, na), b, 1) : open(a, Math.min(b, nb), 0))) {
            seen[nb][na] = true;
            stack.push([na, nb]);
          }
        }
      }
      const i0 = Math.min(...comp.map(c => c[0])),
        i1 = Math.max(...comp.map(c => c[0])),
        j0 = Math.min(...comp.map(c => c[1])),
        j1 = Math.max(...comp.map(c => c[1]));
      let rect = comp.length === (i1 - i0 + 1) * (j1 - j0 + 1);
      for (let a = i0; rect && a <= i1; a++)
        for (let b = j0; rect && b <= j1; b++) {
          if (a < i1 && !open(a, b, 1)) rect = false;
          if (b < j1 && !open(a, b, 0)) rect = false;
        }
      if (rect) {
        rects.push([i0, i1, j0, j1]);
        if (comp.length > 1) for (const [a, b] of comp) merged[b][a] = true;
      } else for (const [a, b] of comp) rects.push([a, a, b, b]);
    }
  return { rects, merged };
}
// The block a square belongs to.
export const rectAt = (plan, i, j) =>
  planRects(plan).rects.find(([i0, i1, j0, j1]) => i >= i0 && i <= i1 && j >= j0 && j <= j1);

// Make the squares from (i0, j0) to (i1, j1) one block of the given kind: every
// road inside goes. Things (places, boards) and SOLO blocks cannot be merged.
export function mergeRect(plan, [i0, i1, j0, j1], kind) {
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      plan.cells[j][i] = { kind };
      if (i < i1) plan.roads.v[i + 1][j] = false;
      if (j < j1) plan.roads.h[j + 1][i] = false;
    }
}
// Split a big block back into squares: its inside roads return.
export function splitRect(plan, [i0, i1, j0, j1]) {
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      if (i < i1) plan.roads.v[i + 1][j] = true;
      if (j < j1) plan.roads.h[j + 1][i] = true;
    }
}

// Where the car starts in the world: the middle of the start road, in the lane
// for its direction (traffic keeps right), or null.
export function startPose(plan) {
  const s = plan.start;
  if (!s) return null;
  const X = xsOf(plan),
    Z = zsOf(plan),
    LANE = 3.85 / 2;
  const h = s.axis === 'h' ? (s.dir * Math.PI) / 2 : s.dir > 0 ? 0 : Math.PI,
    x = s.axis === 'h' ? (X[s.i] + X[s.i + 1]) / 2 : X[s.i],
    z = s.axis === 'h' ? Z[s.j] : (Z[s.j] + Z[s.j + 1]) / 2;
  return { x: x + LANE * Math.cos(h), z: z - LANE * Math.sin(h), h };
}

// World positions of the grid lines, centred on the origin.
export const xsOf = p => Array.from({ length: p.cols + 1 }, (_, i) => (i - p.cols / 2) * PITCH);
export const zsOf = p => Array.from({ length: p.rows + 1 }, (_, j) => (j - p.rows / 2) * PITCH);

export function savePlan(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false; // full (big logos) or blocked: the editor says so
  }
}
export function loadPlan() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? normalize(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

// A published city: someone who copied this project to their own site puts
// their city file there as public/city.json. Loaded once, before the game starts.
async function fetchPublished() {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}city.json`, { cache: 'no-cache' });
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    return normalize(await r.json());
  } catch {
    return null;
  }
}
export const PUBLISHED = typeof location === 'undefined' ? null : await fetchPublished();

// The plan the game should build: ?city=mine shows the city being made in this
// browser (the builder's Drive it); otherwise a published city.json if the site
// has one; otherwise null, which means Armin's New York.
export function activePlan() {
  if (typeof location === 'undefined') return null;
  if (new URLSearchParams(location.search).get('city') === 'mine')
    return loadPlan() ?? PUBLISHED ?? normalize(starterPlan());
  return PUBLISHED;
}
