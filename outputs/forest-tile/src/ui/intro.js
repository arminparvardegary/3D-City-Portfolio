import { PROFILE, JOBS, totalYears } from '../data/profile.js';

// The portfolio first: who Armin is, then the way into the city. One primary
// action (Start driving); Experience, Skills and Keel jump the camera there.
// After closing, a name pill at the top brings the card back.
export function createIntro({onExperience,onPlace}){
  const years=totalYears();
  const card=document.createElement('section');card.className='intro';card.setAttribute('aria-label','About Armin');
  card.innerHTML=`<p class="intro-label">Portfolio</p>
    <h1>${PROFILE.name}</h1>
    <p class="intro-role">${PROFILE.role} · Founder of <b>Keel</b></p>
    <div class="intro-stats"><div><b>${years}+</b><span>Years</span></div><div><b>${JOBS.length}</b><span>Companies</span></div><div><b>${PROFILE.services.length}</b><span>Skills</span></div></div>
    <button class="intro-go">Start driving</button>
    <nav class="intro-links"><button data-go="experience">Experience ›</button><button data-go="skills">Skills ›</button><button data-go="keel">Keel ›</button></nav>`;
  const pill=document.createElement('button');pill.className='intro-pill';pill.hidden=true;pill.textContent=PROFILE.name.split(' ')[0];
  document.querySelector('.scene').append(card,pill);
  const close=()=>{card.hidden=true;pill.hidden=false;};
  const open=()=>{card.hidden=false;pill.hidden=true;card.querySelector('.intro-go').focus();};
  card.querySelector('.intro-go').onclick=close;
  pill.onclick=open;
  card.querySelector('.intro-links').onclick=e=>{const go=e.target.closest('[data-go]')?.dataset.go;if(!go)return;close();go==='experience'?onExperience():onPlace(go);};
  // Driving closes it.
  addEventListener('keydown',e=>{if(!card.hidden&&/^(Arrow|[wasdWASD]$)/.test(e.key))close();});
  return {open,close};
}
