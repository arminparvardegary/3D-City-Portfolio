import { bindFields, esc } from './ui.js';

// Step 1, About you: what the intro card shows when someone opens the city.
// Every field is optional; phones can be one or more.
export function aboutStep() {
  return {
    mount(el, api) {
      const p = api.plan.profile,
        city = api.plan;
      const render = () => {
        el.innerHTML = `
          <section class="page panel">
            <h2>About you</h2>
            <p class="lead">What visitors see first. Everything here is optional.</p>
            <label>Full name<input type="text" data-f="name" value="${esc(p.name)}" maxlength="60" placeholder="Jane Doe" autocomplete="name" /></label>
            <div class="row2">
              <label>Job title<input type="text" data-f="title" value="${esc(p.title)}" maxlength="80" placeholder="Product designer" /></label>
              <label>Age<input type="text" data-f="age" value="${esc(p.age)}" maxlength="3" inputmode="numeric" placeholder="29" /></label>
            </div>
            <label>About you<textarea data-f="about" maxlength="600" placeholder="A few words about you and what you do.">${esc(p.about)}</textarea></label>
            <label>Email<input type="email" data-f="email" value="${esc(p.email)}" maxlength="120" placeholder="you@example.com" autocomplete="email" /></label>
            <div class="phones">
              <span class="field-label">Phone numbers</span>
              ${p.phones.map((n, i) => `<div class="phone"><input type="tel" data-phone="${i}" value="${esc(n)}" maxlength="30" aria-label="Phone ${i + 1}" /><button class="btn" data-del="${i}" aria-label="Remove phone ${i + 1}">Remove</button></div>`).join('')}
              ${p.phones.length < 4 ? '<button class="btn" data-add>+ Add a phone number</button>' : ''}
            </div>
            <label>City name<input type="text" data-city value="${esc(city.name)}" maxlength="60" placeholder="My city" /></label>
          </section>`;
        bindFields(el, p, api);
        const cityName = el.querySelector('[data-city]');
        cityName.onfocus = () => api.remember();
        cityName.oninput = () => {
          city.name = cityName.value;
          api.changed();
        };
        el.querySelectorAll('[data-phone]').forEach(f => {
          f.onfocus = () => api.remember();
          f.oninput = () => {
            p.phones[+f.dataset.phone] = f.value;
            api.changed();
          };
        });
        el.querySelectorAll('[data-del]').forEach(b => {
          b.onclick = () => {
            api.remember();
            p.phones.splice(+b.dataset.del, 1);
            api.changed();
            render();
          };
        });
        el.querySelector('[data-add]')?.addEventListener('click', () => {
          api.remember();
          p.phones.push('');
          api.changed();
          render();
          el.querySelector(`[data-phone="${p.phones.length - 1}"]`)?.focus();
        });
      };
      render();
    },
  };
}
