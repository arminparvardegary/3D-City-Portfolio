import './editor.css';
import { loadPlan, normalize, PUBLISHED, savePlan, starterPlan } from '../plan/plan.js';
import { aboutStep } from './step-about.js';
import { contentStep } from './step-content.js';
import { mapStep } from './step-map.js';
import { publishStep } from './step-publish.js';

// The city builder, in four steps:
//   1 About you    name, title, a few words, age, email, phones (all optional)
//   2 Experience   work, education, skills, tools
//   3 Build        place all of it on the map, lay roads, add city blocks
//   4 Publish      your own copy on GitHub and Vercel
// Everything is saved in this browser as you go (Undo goes back one change).
// Each step is a module with mount(element, api); this file holds the plan,
// the steps bar, saving and undo.

const STEPS = [
  { key: 'about', label: 'About you', make: aboutStep },
  { key: 'content', label: 'Experience', make: contentStep },
  { key: 'build', label: 'Build', make: mapStep },
  { key: 'publish', label: 'Publish', make: publishStep },
];

// --- The plan, saving and undo -------------------------------------------------------
let plan = loadPlan() ?? PUBLISHED ?? normalize(starterPlan());
const undo = [],
  redo = [];
let saveTimer = 0;
const api = {
  get plan() {
    return plan;
  },
  // Call before a change, once per gesture, so Undo can bring the plan back.
  remember() {
    undo.push(JSON.stringify(plan));
    if (undo.length > 80) undo.shift();
    redo.length = 0;
  },
  // Call after a change: saves shortly after; rebuild redraws the step.
  changed({ rebuild = false } = {}) {
    status('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
    if (rebuild) show(step);
  },
  // Swap in a whole plan (opened from a file).
  replace(next) {
    api.remember();
    plan = normalize(next);
    api.changed({ rebuild: true });
  },
  go: key => show(STEPS.findIndex(s => s.key === key)),
  status,
  save,
};
function restore(from, to) {
  if (!from.length) return;
  to.push(JSON.stringify(plan));
  plan = normalize(JSON.parse(from.pop()));
  api.changed({ rebuild: true });
}
function save() {
  const ok = savePlan(plan);
  status(ok ? 'Saved' : 'Not saved: this browser is out of space (use smaller logos)', !ok);
  return ok;
}
function status(text, warn = false) {
  const s = app.querySelector('.status');
  s.textContent = text;
  s.classList.toggle('warn', warn);
}

// --- Page -------------------------------------------------------------------------------
const app = document.getElementById('app');
app.className = 'app';
app.innerHTML = `
  <header class="top panel">
    <h1>City Builder</h1>
    <nav class="steps" aria-label="Steps">${STEPS.map((s, i) => `<button data-step="${i}"><b>${i + 1}</b>${s.label}</button>`).join('')}</nav>
    <span class="status" aria-live="polite"></span>
    <button class="btn" data-act="undo" title="Undo (Cmd/Ctrl+Z)">Undo</button>
    <button class="btn" data-act="back">‹ Back</button>
    <button class="btn primary" data-act="next">Next ›</button>
  </header>
  <div class="body"></div>`;
const body = app.querySelector('.body'),
  next = app.querySelector('[data-act="next"]'),
  back = app.querySelector('[data-act="back"]');
let step = 0,
  current = null;

// Show a step: its page, the steps bar, and the one main action (Next, or Drive it on the map).
function show(i) {
  step = Math.max(0, Math.min(STEPS.length - 1, i));
  current?.unmount?.();
  body.innerHTML = '';
  body.dataset.step = STEPS[step].key;
  current = STEPS[step].make();
  current.mount(body, api);
  app
    .querySelectorAll('[data-step]')
    .forEach(b => b.setAttribute('aria-current', String(+b.dataset.step === step)));
  back.hidden = step === 0;
  next.hidden = step === STEPS.length - 1;
  next.textContent = STEPS[step].key === 'build' ? 'Drive it ›' : 'Next ›';
  try {
    sessionStorage.setItem('builder-step', String(step));
  } catch {}
}
app.querySelectorAll('[data-step]').forEach(b => (b.onclick = () => show(+b.dataset.step)));
back.onclick = () => show(step - 1);
next.onclick = () => {
  if (STEPS[step].key === 'build') {
    if (save()) location.href = `${import.meta.env.BASE_URL}?city=mine`;
  } else show(step + 1);
};
app.querySelector('[data-act="undo"]').onclick = () => restore(undo, redo);
addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? restore(redo, undo) : restore(undo, redo);
  }
});

let start = 0;
try {
  start = +(sessionStorage.getItem('builder-step') ?? 0);
} catch {}
show(start);
status(loadPlan() ? 'Saved' : 'A starter city: make it yours');
