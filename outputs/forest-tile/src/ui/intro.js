import { css } from 'goober';
import { gsap } from 'gsap';
import { PROFILE } from '../data/profile.js';
import { track } from '../analytics.js';

// The portfolio first: who Armin is, then the way into the city. One primary
// action (Start driving); Keel jumps the camera to his project.
// After closing, a name pill at the top brings the card back. Styles are scoped
// with goober; GSAP lifts the card in.
const HAND='"Amatic SC","Marker Felt",cursive',INK='#f4f0ff',DIM='#b9b0ef',WARM='#ff9a4a';
const EASE='cubic-bezier(.28,.11,.32,1)',SPRING='cubic-bezier(.34,1.56,.64,1)',FONT='-apple-system,"SF Pro Text",Inter,system-ui,sans-serif';
const card=css`
  position:absolute;left:24px;top:24px;z-index:8;width:min(400px,calc(100% - 48px));padding:32px;border-radius:28px;
  background:rgba(22,16,56,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 18px 56px #0006,inset 0 0 0 1px #ffffff14;font-family:${FONT};color:${INK};
  &[hidden]{display:none;}
  .label{margin:0;font-family:${HAND};font-size:22px;letter-spacing:.06em;color:${WARM};}
  h1{font-family:${HAND};font-size:58px;line-height:.95;font-weight:700;letter-spacing:.01em;margin:6px 0 8px;color:${INK};}
  .role{margin:0;font-size:17px;color:${DIM};}
  .role b{color:${WARM};font-weight:600;}
  .go{margin-top:24px;width:100%;height:56px;border-radius:28px;background:${WARM};color:#1a1035;font-family:${HAND};font-size:28px;font-weight:700;box-shadow:0 0 24px #ff9a4a66;transition:transform .3s ${SPRING};}
  .go:active{transform:scale(.97);}
  .links{display:flex;justify-content:center;margin-top:16px;}
  .links button{font-family:${HAND};font-size:24px;color:${INK};padding:8px 4px;}
  button:focus-visible{outline:3px solid #ff9a4a88;outline-offset:2px;}
  @media(max-width:520px){left:16px;right:16px;top:16px;width:auto;padding:24px;h1{font-size:46px;}}
`;
const pillClass=css`
  position:absolute;left:50%;top:24px;transform:translateX(-50%);z-index:7;height:44px;padding:0 20px;border-radius:22px;
  background:rgba(22,16,56,.82);backdrop-filter:blur(14px);box-shadow:0 8px 28px #0006,inset 0 0 0 1px #ffffff14;font-family:${HAND};font-size:26px;font-weight:700;color:${INK};transition:transform .3s ${SPRING};
  &[hidden]{display:none;}
  &:active{transform:translateX(-50%) scale(.95);}
  &:focus-visible{outline:3px solid #ff9a4a88;outline-offset:2px;}
`;

export function createIntro({onPlace}){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const el=document.createElement('section');el.className=card;el.setAttribute('aria-label','About Armin');
  el.innerHTML=`<p class="label">Portfolio</p>
    <h1>${PROFILE.name}</h1>
    <p class="role">${PROFILE.role} · Founder of <b>Keel</b></p>
    <button class="go">Start driving</button>
    <nav class="links"><button data-go="keel">See Keel ›</button></nav>`;
  const pill=document.createElement('button');pill.className=pillClass;pill.hidden=true;pill.textContent=PROFILE.name.split(' ')[0];
  document.querySelector('.scene').append(el,pill);

  // The card lifts in and its rows follow.
  function enter(){
    if(reduced.matches)return;
    gsap.fromTo(el,{y:24,opacity:0,scale:.98},{y:0,opacity:1,scale:1,duration:.6,ease:EASE});
    gsap.fromTo(el.children,{y:12,opacity:0},{y:0,opacity:1,duration:.5,stagger:.05,delay:.1,ease:EASE});
  }
  const close=()=>{if(el.hidden)return;el.hidden=true;pill.hidden=false;if(!reduced.matches)gsap.fromTo(pill,{y:-12,opacity:0},{y:0,opacity:1,duration:.4,ease:EASE});};
  const open=()=>{el.hidden=false;pill.hidden=true;enter();el.querySelector('.go').focus();track('intro_open');};
  el.querySelector('.go').onclick=()=>{close();track('start_driving');};
  pill.onclick=open;
  el.querySelector('.links').onclick=e=>{const go=e.target.closest('[data-go]')?.dataset.go;if(!go)return;close();track('open_place',{place:go});onPlace(go);};
  // Driving closes it.
  addEventListener('keydown',e=>{if(!el.hidden&&/^(Arrow|[wasdWASD]$)/.test(e.key))close();});
  enter();
  return {open,close};
}
