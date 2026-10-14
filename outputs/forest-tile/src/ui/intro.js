import { css } from 'goober';
import { gsap } from 'gsap';
import { PROFILE, JOBS, totalYears } from '../data/profile.js';
import { track } from '../analytics.js';

// The portfolio first: who Armin is, then the way into the city. One primary
// action (Start driving); Experience, Skills and Keel jump the camera there.
// After closing, a name pill at the top brings the card back. Styles are scoped
// with goober; GSAP lifts the card in and counts the numbers up.
const EASE='cubic-bezier(.28,.11,.32,1)',SPRING='cubic-bezier(.34,1.56,.64,1)',FONT='-apple-system,"SF Pro Text",Inter,system-ui,sans-serif';
const card=css`
  position:absolute;left:24px;top:24px;z-index:8;width:min(400px,calc(100% - 48px));padding:32px;border-radius:28px;
  background:#fff;box-shadow:0 18px 56px #1e28461f;font-family:${FONT};color:#1d1d1f;
  &[hidden]{display:none;}
  .label{margin:0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6e6e73;}
  h1{font-family:inherit;font-size:40px;line-height:1.05;font-weight:600;letter-spacing:-.03em;margin:8px 0;color:#1d1d1f;}
  .role{margin:0;font-size:17px;color:#6e6e73;}
  .role b{color:#2f6bff;font-weight:600;}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:24px 0;}
  .stats div{background:#f5f5f7;border-radius:18px;padding:14px 12px;}
  .stats b{display:block;font-size:28px;font-weight:600;letter-spacing:-.02em;}
  .stats span{font-size:13px;color:#6e6e73;}
  .go{width:100%;height:56px;border-radius:28px;background:#2f6bff;color:#fff;font-size:17px;font-weight:600;transition:transform .3s ${SPRING};}
  .go:active{transform:scale(.97);}
  .links{display:flex;justify-content:space-between;margin-top:16px;}
  .links button{font-size:17px;color:#2f6bff;padding:8px 4px;}
  button:focus-visible{outline:3px solid #2f6bff66;outline-offset:2px;}
  @media(max-width:520px){left:16px;right:16px;top:16px;width:auto;padding:24px;h1{font-size:32px;}}
`;
const pillClass=css`
  position:absolute;left:50%;top:24px;transform:translateX(-50%);z-index:7;height:44px;padding:0 20px;border-radius:22px;
  background:#fff;box-shadow:0 8px 28px #1e284618;font-family:${FONT};font-size:17px;font-weight:600;color:#1d1d1f;transition:transform .3s ${SPRING};
  &[hidden]{display:none;}
  &:active{transform:translateX(-50%) scale(.95);}
  &:focus-visible{outline:3px solid #2f6bff66;outline-offset:2px;}
`;

export function createIntro({onExperience,onPlace}){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const stats=[[totalYears(),'+','Years'],[JOBS.length,'','Companies'],[PROFILE.services.length,'','Skills']];
  const el=document.createElement('section');el.className=card;el.setAttribute('aria-label','About Armin');
  el.innerHTML=`<p class="label">Portfolio</p>
    <h1>${PROFILE.name}</h1>
    <p class="role">${PROFILE.role} · Founder of <b>Keel</b></p>
    <div class="stats">${stats.map(([n,s,l])=>`<div><b data-n="${n}" data-s="${s}">${n}${s}</b><span>${l}</span></div>`).join('')}</div>
    <button class="go">Start driving</button>
    <nav class="links"><button data-go="experience">Experience ›</button><button data-go="skills">Skills ›</button><button data-go="keel">Keel ›</button></nav>`;
  const pill=document.createElement('button');pill.className=pillClass;pill.hidden=true;pill.textContent=PROFILE.name.split(' ')[0];
  document.querySelector('.scene').append(el,pill);

  // The card lifts in, its rows follow, the numbers count up.
  function enter(){
    if(reduced.matches)return;
    gsap.fromTo(el,{y:24,opacity:0,scale:.98},{y:0,opacity:1,scale:1,duration:.6,ease:EASE});
    gsap.fromTo(el.children,{y:12,opacity:0},{y:0,opacity:1,duration:.5,stagger:.05,delay:.1,ease:EASE});
    for(const b of el.querySelectorAll('[data-n]')){const o={v:0};gsap.to(o,{v:+b.dataset.n,duration:1.1,delay:.25,ease:'power2.out',onUpdate:()=>{b.textContent=Math.round(o.v)+b.dataset.s;}});}
  }
  const close=()=>{if(el.hidden)return;el.hidden=true;pill.hidden=false;if(!reduced.matches)gsap.fromTo(pill,{y:-12,opacity:0},{y:0,opacity:1,duration:.4,ease:EASE});};
  const open=()=>{el.hidden=false;pill.hidden=true;enter();el.querySelector('.go').focus();track('intro_open');};
  el.querySelector('.go').onclick=()=>{close();track('start_driving');};
  pill.onclick=open;
  el.querySelector('.links').onclick=e=>{const go=e.target.closest('[data-go]')?.dataset.go;if(!go)return;close();track('open_place',{place:go});go==='experience'?onExperience():onPlace(go);};
  // Driving closes it.
  addEventListener('keydown',e=>{if(!el.hidden&&/^(Arrow|[wasdWASD]$)/.test(e.key))close();});
  enter();
  return {open,close};
}
