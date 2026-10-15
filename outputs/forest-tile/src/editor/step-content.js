import { STYLES, newEducation, newExperience } from '../plan/plan.js';
import { bindFields, chipsInput, esc, logoPicker } from './ui.js';

// Step 2, Experience: work experience and education (each becomes a building
// with a parking bay and a card in the city), skills and tools (each becomes a
// board). Entries can be added, edited, moved and removed.
const SECTIONS = {
  experiences: {
    title: 'Work experience',
    add: 'Add a job',
    make: newExperience,
    name: 'company',
    fields: [
      ['company', 'Company', 'Acme Studio'],
      ['role', 'Your role', 'Lead designer'],
    ],
    ref: 'exp',
  },
  education: {
    title: 'Education',
    add: 'Add a school',
    make: newEducation,
    name: 'school',
    fields: [
      ['school', 'School', 'University of Design'],
      ['degree', 'Degree or course', 'BA Graphic Design'],
    ],
    ref: 'edu',
  },
};

export function contentStep() {
  return {
    mount(el, api) {
      const plan = api.plan;
      el.innerHTML = `<section class="page panel wide"><h2>Your experience</h2>
        <p class="lead">Each job and school becomes a building in your city; skills and tools become boards.
          You place them on the map in the next step.</p><div class="sections"></div></section>`;
      const box = el.querySelector('.sections');
      for (const [key, S] of Object.entries(SECTIONS)) box.append(section(key, S));
      box.append(words('skills', 'Skills', 'Type a skill and press Enter'));
      box.append(words('tools', 'Tools', 'Type a tool and press Enter'));

      // A list of entries: one card each, then an Add button.
      function section(key, S) {
        const sec = document.createElement('div');
        sec.className = 'section';
        const render = () => {
          const list = plan[key];
          sec.innerHTML = `<h3>${S.title}</h3><div class="cards"></div><button class="btn add">+ ${S.add}</button>`;
          const cards = sec.querySelector('.cards');
          list.forEach((e, i) => cards.append(card(key, S, e, i, render)));
          if (!list.length) cards.innerHTML = '<p class="empty">Nothing yet.</p>';
          sec.querySelector('.add').onclick = () => {
            api.remember();
            list.push(S.make(list.length + 1));
            api.changed();
            render();
            // The new card's name is a placeholder: select it so typing replaces it.
            const first = sec.querySelectorAll('.card')[list.length - 1]?.querySelector('input');
            first?.focus();
            first?.select();
          };
        };
        render();
        return sec;
      }

      // One entry: its fields, years, what you did, link, colour, logo and store design.
      function card(key, S, e, i, rerender) {
        const list = plan[key],
          c = document.createElement('article');
        c.className = 'card';
        c.innerHTML = `
          <div class="card-head"><b>${esc(e[S.name] || S.title)}</b>
            <span class="tools-row">
              <button class="btn" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
              <button class="btn" data-move="1" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
              <button class="btn" data-del aria-label="Remove">Remove</button>
            </span></div>
          <div class="row2">${S.fields.map(([f, label, ph]) => `<label>${label}<input type="text" data-f="${f}" value="${esc(e[f])}" maxlength="60" placeholder="${ph}" /></label>`).join('')}</div>
          <div class="row2"><label>From<input type="text" data-f="from" value="${esc(e.from)}" maxlength="12" placeholder="2021" /></label>
            <label>To<input type="text" data-f="to" value="${esc(e.to)}" maxlength="12" placeholder="now" /></label></div>
          <label>What you did<textarea data-f="note" maxlength="400" placeholder="One or two lines.">${esc(e.note)}</textarea></label>
          <div class="row2"><label>Link<input type="url" data-f="link" value="${esc(e.link)}" placeholder="example.com" /></label>
            <label>Colour<input type="color" data-f="color" value="${esc(e.color)}" /></label></div>
          <div class="design"><span class="field-label">Building</span><div class="designs">${Object.entries(
            STYLES,
          )
            .map(([k, s]) => `<button data-style="${k}" aria-pressed="${e.style === k}">${s.label}</button>`)
            .join('')}</div></div>`;
        c.querySelector('.design').before(logoPicker(e, api));
        bindFields(c, e, api, f => {
          if (f === S.name) c.querySelector('.card-head b').textContent = e[S.name] || S.title;
        });
        c.querySelectorAll('[data-style]').forEach(b => {
          b.onclick = () => {
            api.remember();
            e.style = b.dataset.style;
            api.changed();
            c.querySelectorAll('[data-style]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          };
        });
        c.querySelectorAll('[data-move]').forEach(b => {
          b.onclick = () => {
            const j = i + +b.dataset.move;
            if (j < 0 || j >= list.length) return;
            api.remember();
            [list[i], list[j]] = [list[j], list[i]];
            api.changed();
            rerender();
          };
        });
        c.querySelector('[data-del]').onclick = () => {
          api.remember();
          list.splice(i, 1);
          // Its building leaves the map too (the square becomes a plaza).
          for (const row of plan.cells)
            row.forEach((cell, x) => {
              if (cell.ref === `${S.ref}:${e.id}`) row[x] = { kind: 'plaza' };
            });
          api.changed();
          rerender();
        };
        return c;
      }

      // Skills or tools: words as chips.
      function words(key, title, placeholder) {
        const sec = document.createElement('div');
        sec.className = 'section';
        sec.innerHTML = `<h3>${title}</h3>`;
        sec.append(chipsInput(plan[key], api, placeholder));
        return sec;
      }
    },
  };
}
