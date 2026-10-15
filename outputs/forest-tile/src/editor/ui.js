// Small helpers the builder's steps share.

// Text going into HTML.
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// A logo is kept inside the plan as an image: scaled to at most 256 px so the
// whole city stays small enough for the browser to save.
export function shrinkImage(file, max = 256) {
  return new Promise((ok, fail) => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)),
        c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * k));
      c.height = Math.max(1, Math.round(im.naturalHeight * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(im.src);
      ok(c.toDataURL('image/png'));
    };
    im.onerror = fail;
    im.src = URL.createObjectURL(file);
  });
}

// Bind form fields to an object: <input data-f="key"> edits obj[key] as you
// type (one undo step per field you enter), then calls after().
export function bindFields(root, obj, api, after = () => {}) {
  root.querySelectorAll('[data-f]').forEach(f => {
    f.onfocus = () => api.remember();
    f.oninput = () => {
      obj[f.dataset.f] = f.value;
      api.changed();
      after(f.dataset.f);
    };
  });
}

// A logo picker: a preview, Add / Change and Remove. entry.logo holds the image.
export function logoPicker(entry, api, onChange) {
  const el = document.createElement('div');
  el.className = 'logo-drop';
  const render = () => {
    const letter = esc((entry.company ?? entry.school ?? '?').slice(0, 1));
    el.innerHTML = `
      <div class="preview" style="${entry.logo ? `background-image:url('${esc(entry.logo)}')` : `background-color:${esc(entry.color)};color:#fff`}">${entry.logo ? '' : letter}</div>
      <div class="actions"><button class="btn" data-a="pick">${entry.logo ? 'Change logo' : 'Add logo'}</button>
        ${entry.logo ? '<button class="btn" data-a="clear">Remove</button>' : ''}</div>
      <input type="file" accept="image/*" hidden />`;
    const file = el.querySelector('input');
    el.querySelector('[data-a="pick"]').onclick = () => file.click();
    el.querySelector('[data-a="clear"]')?.addEventListener('click', () => {
      api.remember();
      entry.logo = '';
      api.changed();
      render();
      onChange?.();
    });
    file.onchange = async () => {
      if (!file.files[0]) return;
      api.remember();
      entry.logo = await shrinkImage(file.files[0]);
      api.changed();
      render();
      onChange?.();
    };
  };
  render();
  return el;
}

// A list of words as chips: type and press Enter (or a comma) to add, × to remove.
export function chipsInput(list, api, placeholder) {
  const el = document.createElement('div');
  el.className = 'chips-input';
  const render = () => {
    el.innerHTML = `${list.map((w, i) => `<span class="chip">${esc(w)}<button data-i="${i}" aria-label="Remove ${esc(w)}">×</button></span>`).join('')}
      <input type="text" placeholder="${esc(placeholder)}" maxlength="40" />`;
    const input = el.querySelector('input');
    el.querySelectorAll('[data-i]').forEach(b => {
      b.onclick = () => {
        api.remember();
        list.splice(+b.dataset.i, 1);
        api.changed();
        render();
        el.querySelector('input').focus();
      };
    });
    input.onkeydown = e => {
      if (e.key === 'Backspace' && !input.value && list.length) {
        api.remember();
        list.pop();
        api.changed();
        render();
        el.querySelector('input').focus();
        return;
      }
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      const words = input.value
        .split(',')
        .map(w => w.trim())
        .filter(w => w && !list.includes(w));
      if (!words.length) return;
      api.remember();
      list.push(...words);
      api.changed();
      render();
      el.querySelector('input').focus();
    };
  };
  render();
  return el;
}
