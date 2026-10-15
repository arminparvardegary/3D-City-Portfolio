import { css } from 'goober';
import { gsap } from 'gsap';
import { JOBS, span, duration } from '../data/profile.js';
import { BRAND, url } from '../stores/brand.ts';
import { track } from '../analytics.js';

// Park in a bay, press Enter: a card about that place. One prompt ("Enter ·
// Rush Graphics") while the car stands in a bay; the card shows the logo, the
// role, the years and what Armin did. Esc, the close button or driving away
// closes it.
const HAND='"Amatic SC","Marker Felt",cursive',FONT='-apple-system,"SF Pro Text",Inter,system-ui,sans-serif';
const INK='#f4f0ff',DIM='#b9b0ef',WARM='#ff9a4a';
const glass=`background:rgba(22,16,56,.86);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 18px 56px #0007,inset 0 0 0 1px #ffffff14;color:${INK};font-family:${FONT};`;
const promptCls=css`
  position:absolute;left:50%;bottom:28px;transform:translateX(-50%);z-index:9;display:flex;align-items:center;gap:12px;height:56px;padding:0 24px 0 10px;border-radius:28px;${glass}
  font-size:17px;font-weight:600;cursor:pointer;white-space:nowrap;
  &[hidden]{display:none;}
  kbd{height:38px;padding:0 14px;display:grid;place-items:center;border-radius:19px;background:${WARM};color:#1a1035;font:700 22px ${HAND};box-shadow:0 0 18px #ff9a4a88;}
  b{font:700 26px ${HAND};letter-spacing:.02em;}
  &:focus-visible{outline:3px solid #ff9a4a88;outline-offset:2px;}
  @media(hover:none){bottom:150px;}
`;
const cardCls=css`
  position:absolute;right:24px;top:24px;z-index:9;width:min(380px,calc(100% - 48px));padding:28px;border-radius:28px;${glass}
  &[hidden]{display:none;}
  .logo{width:96px;height:96px;border-radius:22px;background:#fff center/contain no-repeat;margin-bottom:16px;}
  .label{margin:0;font:700 22px ${HAND};letter-spacing:.06em;color:${WARM};}
  h2{margin:4px 0 6px;font:700 48px/1 ${HAND};color:${INK};}
  .role{margin:0 0 16px;font-size:17px;color:${INK};}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
  .meta div{background:#ffffff10;border-radius:16px;padding:12px;}
  .meta b{display:block;font:700 28px/1.1 ${HAND};}
  .meta span{font-size:13px;color:${DIM};}
  .note{margin:0 0 16px;font-size:15px;line-height:1.45;color:${DIM};}
  .row{display:flex;justify-content:space-between;align-items:center;}
  a,button{font:700 24px ${HAND};color:${INK};}
  a{color:${WARM};text-decoration:none;}
  button{padding:6px 2px;}
  a:focus-visible,button:focus-visible{outline:3px solid #ff9a4a88;outline-offset:2px;border-radius:8px;}
  @media(max-width:520px){left:16px;right:16px;top:16px;width:auto;padding:22px;h2{font-size:40px;}}
`;

const LOGO={rush:null,hindra:BRAND.hindra.logo,aaq:BRAND.aaq.logo,bigup:BRAND.bigup.logo,keel:BRAND.keel.logo};

export function createVisit({onOpen,onClose}){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const prompt=document.createElement('button');prompt.className=promptCls;prompt.hidden=true;
  const card=document.createElement('section');card.className=cardCls;card.hidden=true;card.setAttribute('aria-live','polite');
  document.querySelector('.scene').append(prompt,card);
  let bay=null,open=null;

  function fill(b){
    const job=JOBS.find(j=>j.id===b.id),logo=LOGO[b.id.startsWith('keel')?'keel':b.id];
    const logoHtml=logo?`<div class="logo" style="background-image:url('${url(logo)}');${b.id.startsWith('keel')?'background-size:cover;':''}"></div>`
      :`<div class="logo" style="background:#141416;display:grid;place-items:center;color:${BRAND.rush.color};font:italic 900 30px ${FONT}">RUSH</div>`;
    if(job){
      card.innerHTML=`${logoHtml}<p class="label">Experience</p><h2>${b.name}</h2><p class="role">${job.role}</p>
        <div class="meta"><div><b>${duration(job)}</b><span>${span(job)}</span></div><div><b>${job.place.split(' · ')[0]}</b><span>${job.place.includes('·')?job.place.split(' · ')[1]:'On site'}</span></div></div>
        ${job.note?`<p class="note">${job.note}</p>`:''}<div class="row"><span></span><button data-close>Close ×</button></div>`;
    }else if(b.id.startsWith('lux')){   // a Brooklyn boutique: no branding
      card.innerHTML=`<p class="label">Brooklyn</p><h2>Boutique</h2><p class="role">Glass, gold and marble on the river</p>
        <p class="note">One of six boutiques along the Brooklyn waterfront. Walk round the glass and look inside.</p><div class="row"><span></span><button data-close>Close ×</button></div>`;
    }else{   // Keel
      card.innerHTML=`${logoHtml}<p class="label">My company</p><h2>Keel</h2><p class="role">Founder</p>
        <p class="note">The AI assistant you text like a friend. It remembers the small stuff, plans your day and keeps your money straight, on iMessage and Telegram.</p>
        <div class="row"><a href="https://www.keeltwin.com" target="_blank" rel="noopener">keeltwin.com ›</a><button data-close>Close ×</button></div>`;
    }
    card.querySelector('[data-close]').onclick=close;
  }
  function show(){
    if(!bay||open)return;open=bay;fill(bay);card.hidden=false;prompt.hidden=true;track('open_place',{place:bay.id});onOpen?.(bay);
    if(!reduced.matches)gsap.fromTo(card,{y:16,opacity:0},{y:0,opacity:1,duration:.45,ease:'power2.out'});
  }
  function close(){if(!open)return;card.hidden=true;open=null;onClose?.();if(bay)prompt.hidden=false;}
  prompt.onclick=show;
  addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.repeat&&bay&&!open){e.preventDefault();show();}
    else if(e.key==='Escape'&&open){close();}
  });
  return {
    // Every frame: the bay the car stands still in (or null).
    update(b){
      if(open&&(!b||b.id!==open.id))close();   // drove away
      if(b!==bay){bay=b;if(b&&!open){prompt.innerHTML=`<kbd>Enter</kbd><span>${b.id.startsWith('keel')?'Visit':'See'}</span><b>${b.name||'Boutique'}</b>`;prompt.hidden=false;
          if(!reduced.matches)gsap.fromTo(prompt,{y:12,opacity:0},{y:0,opacity:1,duration:.35,ease:'power2.out'});}
        else prompt.hidden=true;}
    },
    get isOpen(){return !!open;},
  };
}
