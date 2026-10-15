// A city plan: everything the builder lets people choose, as plain data. The
// game builds the city from it with the same pieces as Armin's New York.
//
// The grid: (cols + 1) avenues running north to south at xs and (rows + 1)
// streets running east to west at zs, PITCH apart. Between them, cols x rows
// cells. Roads are segments of those lines:
//   roads.h[j][i]  along street j, from avenue i to avenue i + 1
//   roads.v[i][j]  along avenue i, from street j to street j + 1
// Each cell holds one kind of block (KINDS). A "place" cell is someone's company
// or project: its store design, name, logo, card text and link.
// Traffic lights stand at every crossing of three or more roads, except at the
// crossings listed in lightsOff ("i,j").

export const PITCH = 38; // avenue to avenue (a block plus a road)
export const MIN = 2,
  MAX = 8; // cells per side

// What a cell can hold, in the order the editor shows them.
export const KINDS = {
  place: { label: 'My place', hint: 'A company or project you can park at' },
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

// The five store designs a place can use (the built-in brand each one starts from).
export const STYLES = {
  studio: { label: 'Studio', base: 'rush' },
  shop: { label: 'Corner shop', base: 'hindra' },
  office: { label: 'Office', base: 'aaq' },
  agency: { label: 'Agency', base: 'bigup' },
  hq: { label: 'Glass HQ', base: 'keel' },
};

export const STORAGE_KEY = 'city-plan';
export const fullGrid = (n, m, v = true) => Array.from({ length: n }, () => Array(m).fill(v));

export function newPlace(n = 1) {
  return {
    name: `My Company ${n}`,
    role: 'Founder',
    from: '2022',
    to: 'now',
    note: 'What I built there, in one or two lines.',
    link: '',
    logo: '',
    color: ['#ff6b5e', '#5ab4f0', '#c9a957', '#ffc93a', '#2f6bff'][(n - 1) % 5],
    style: Object.keys(STYLES)[(n - 1) % 5],
  };
}

// A small starter city: a 4 x 3 grid with every road, two places, a park and a garage.
export function starterPlan() {
  const cols = 4,
    rows = 3;
  const cells = Array.from({ length: rows }, (_, j) =>
    Array.from({ length: cols }, (_, i) => ({ kind: ['mid', 'tall', 'low', 'brownstone'][(i + j) % 4] })),
  );
  cells[0][0] = { kind: 'park' };
  cells[1][1] = { kind: 'place', place: newPlace(1) };
  cells[1][2] = { kind: 'place', place: newPlace(2) };
  cells[2][3] = { kind: 'garage' };
  return {
    version: 1,
    name: 'My city',
    owner: { name: 'Your Name', title: 'Designer' },
    cols,
    rows,
    roads: { h: fullGrid(rows + 1, cols), v: fullGrid(cols + 1, rows) },
    cells,
    lightsOff: [],
  };
}

// Make any loaded plan safe to build: right sizes, known kinds, roads present.
export function normalize(input) {
  const p = structuredClone(input ?? starterPlan());
  p.version = 1;
  p.name = String(p.name || 'My city').slice(0, 60);
  p.owner = {
    name: String(p.owner?.name || 'Your Name').slice(0, 60),
    title: String(p.owner?.title || '').slice(0, 60),
  };
  p.cols = Math.min(MAX, Math.max(MIN, p.cols | 0 || 4));
  p.rows = Math.min(MAX, Math.max(MIN, p.rows | 0 || 3));
  const cell = (j, i) => {
    const c = p.cells?.[j]?.[i];
    if (!c || !KINDS[c.kind]) return { kind: 'mid' };
    if (c.kind === 'place')
      return {
        kind: 'place',
        place: { ...newPlace(), ...c.place, style: STYLES[c.place?.style] ? c.place.style : 'studio' },
      };
    return { kind: c.kind };
  };
  p.cells = Array.from({ length: p.rows }, (_, j) => Array.from({ length: p.cols }, (_, i) => cell(j, i)));
  const bool = (arr, a, b) =>
    Array.from({ length: a }, (_, x) => Array.from({ length: b }, (_, y) => arr?.[x]?.[y] !== false));
  p.roads = { h: bool(p.roads?.h, p.rows + 1, p.cols), v: bool(p.roads?.v, p.cols + 1, p.rows) };
  p.lightsOff = Array.isArray(p.lightsOff) ? p.lightsOff.filter(k => typeof k === 'string') : [];
  return p;
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

// The plan the game should build: a builder city when the page is opened with
// ?city=mine (and one is saved), otherwise null, which means Armin's New York.
export function activePlan() {
  if (typeof location === 'undefined') return null;
  if (new URLSearchParams(location.search).get('city') !== 'mine') return null;
  return loadPlan() ?? normalize(starterPlan());
}
