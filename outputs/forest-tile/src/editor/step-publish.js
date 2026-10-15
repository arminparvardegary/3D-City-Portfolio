import { normalize } from '../plan/plan.js';

// Step 4, Publish: your city on your own site. The site is a copy of this
// project on your GitHub, hosted free on Vercel; your city is one file in it
// (public/city.json), which the site opens as its homepage.
const REPO = 'https://github.com/arminparvardegary/3D-City-Portfolio';
const CLONE =
  'https://vercel.com/new/clone?' +
  new URLSearchParams({
    'repository-url': REPO,
    'root-directory': 'outputs/forest-tile',
    'project-name': 'my-portfolio-city',
    'repository-name': 'my-portfolio-city',
  });

export function publishStep() {
  return {
    mount(el, api) {
      el.innerHTML = `
        <section class="page panel">
          <h2>Publish</h2>
          <p class="lead">Your city on your own site, free. Three steps, about five minutes.</p>
          <ol class="publish">
            <li><b>Save your city file</b>
              <span>It is named city.json. Keep it: you can open it here again to edit your city.</span>
              <button class="btn primary" data-act="download">Download city.json</button></li>
            <li><b>Make your site</b>
              <span>Vercel copies this project to your GitHub and puts it online. Sign in with GitHub when it asks.</span>
              <a class="btn" href="${CLONE}" target="_blank" rel="noopener">Deploy to Vercel ›</a></li>
            <li><b>Put your city in it</b>
              <span>On GitHub, open your new repository, go to <code>outputs/forest-tile/public</code>,
                choose Add file › Upload files, drop city.json in and press Commit changes.
                Vercel updates your site in about a minute.</span></li>
          </ol>
          <p class="empty">To change your city later: edit it here, download city.json again and upload it over the old one.</p>
          <div class="tools-row">
            <button class="btn" data-act="open">Open a city file</button>
            <input type="file" accept="application/json,.json" hidden />
          </div>
        </section>`;
      const file = el.querySelector('input[type=file]');
      el.querySelector('[data-act="download"]').onclick = () => {
        api.save();
        const blob = new Blob([JSON.stringify(api.plan, null, 2)], { type: 'application/json' }),
          a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'city.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      el.querySelector('[data-act="open"]').onclick = () => file.click();
      file.onchange = async () => {
        if (!file.files[0]) return;
        try {
          api.replace(normalize(JSON.parse(await file.files[0].text())));
          api.status('City opened');
        } catch {
          api.status('That file is not a city file', true);
        }
      };
    },
  };
}
