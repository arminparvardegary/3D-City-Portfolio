import { STUDIOS } from '../data/profile.js';

// Experience, made easy to find: an always visible list (newest first) and one
// card. Picking a job in the list, clicking its building or label, or clicking
// the Work tower opens the card; Previous and Next walk the timeline. The
// caller moves the camera (onSelect gets the studio id).
export function createExperience({onSelect}){
  const root=document.createElement('nav');root.className='exp';root.setAttribute('aria-label','Experience');
  root.innerHTML=`<button class="exp-toggle" aria-expanded="false">Experience</button>
    <div class="exp-panel"><h2>Experience</h2><ol>${STUDIOS.map(s=>`<li><button data-id="${s.id}"><span class="exp-name">${s.name}</span><span class="exp-years">${s.years.replace(' – ','–')}</span></button></li>`).join('')}</ol></div>`;
  const card=document.createElement('section');card.className='exp-card';card.hidden=true;card.setAttribute('aria-live','polite');
  card.innerHTML=`<button class="exp-close" aria-label="Close">×</button><p class="exp-step"></p><h3></h3><p class="exp-role"></p><p class="exp-meta"></p>
    <div class="exp-nav"><button data-step="-1">‹ Newer</button><button data-step="1">Older ›</button></div>`;
  document.querySelector('.scene').append(root,card);
  const toggle=root.querySelector('.exp-toggle');
  toggle.onclick=()=>{const open=root.classList.toggle('open');toggle.setAttribute('aria-expanded',open);};

  let current=-1;
  function open(id,{fly=true}={}){
    const i=STUDIOS.findIndex(s=>s.id===id);if(i<0)return;current=i;const s=STUDIOS[i];
    card.querySelector('.exp-step').textContent=`${i+1} of ${STUDIOS.length}`;
    card.querySelector('h3').textContent=s.name;
    card.querySelector('.exp-role').textContent=s.role;
    card.querySelector('.exp-meta').textContent=`${s.years} · ${s.place}`;
    card.querySelector('[data-step="-1"]').disabled=i===0;card.querySelector('[data-step="1"]').disabled=i===STUDIOS.length-1;
    for(const b of root.querySelectorAll('[data-id]'))b.setAttribute('aria-current',b.dataset.id===id);
    card.hidden=false;root.classList.remove('open');toggle.setAttribute('aria-expanded','false');
    if(fly)onSelect?.(id);
  }
  function close(){card.hidden=true;current=-1;for(const b of root.querySelectorAll('[data-id]'))b.setAttribute('aria-current','false');}
  root.querySelector('ol').onclick=e=>{const b=e.target.closest('[data-id]');if(b)open(b.dataset.id);};
  card.querySelector('.exp-close').onclick=close;
  card.querySelector('.exp-nav').onclick=e=>{const d=+e.target.dataset.step;if(d&&current>=0)open(STUDIOS[current+d]?.id);};
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!card.hidden)close();});
  return {open,close,get isOpen(){return !card.hidden;},first:STUDIOS[0].id};
}
