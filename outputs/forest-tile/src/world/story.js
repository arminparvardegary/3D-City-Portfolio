import * as THREE from 'three';
import { damp } from '../motion.js';
import { months, duration, span, totalYears } from '../data/profile.js';

// The experience story, played in the city when the car is parked at Experience
// Row and Enter is pressed. Step by step, oldest job to newest, then About:
// a column rises in each company's bay, sized by the time he worked there; a
// card floats in front of the building (role, dates, place, what he did); a
// timeline painted on the lot fills in. Arrow keys or the buttons step through,
// Esc (or Enter on the last step) leaves. onFocus(x, y, z) moves the camera.
const CARD_W=13;
function card(lines,{w=1024,accent='#2f6bff'}={}){
  const f='-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
  const c=document.createElement('canvas');c.width=w;const g=c.getContext('2d');
  // Measure: each line is [text, size, weight, colour, gap above].
  const wrap=(text,size,weight)=>{g.font=`${weight} ${size}px ${f}`;const words=text.split(' '),out=[];let line='';for(const word of words){const t=line?line+' '+word:word;if(g.measureText(t).width>w-120&&line){out.push(line);line=word;}else line=t;}if(line)out.push(line);return out;};
  const laid=[];let h=64;for(const [text,size,weight,color,gap=0] of lines){if(!text)continue;h+=gap;for(const l of wrap(text,size,weight)){laid.push([l,size,weight,color,h+size*.8]);h+=size*1.25;}}
  h+=48;c.height=Math.ceil(h);
  g.fillStyle='#ffffff';g.beginPath();g.roundRect(0,0,w,c.height,56);g.fill();g.fillStyle=accent;g.beginPath();g.roundRect(0,0,w,20,[56,56,0,0]);g.fill();
  g.textBaseline='alphabetic';for(const [l,size,weight,color,y] of laid){g.font=`${weight} ${size}px ${f}`;g.fillStyle=color;g.fillText(l,60,y);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false,depthWrite:false,opacity:0}));
  s.scale.set(CARD_W,CARD_W*c.height/w,1);s.center.set(.5,0);s.renderOrder=30;return s;
}

export function createStory({scene,row,lot,jobs,profile,onFocus,onExit}){
  const group=new THREE.Group();group.visible=false;scene.add(group);
  const byId=Object.fromEntries(jobs.map(j=>[j.id,j]));
  const ordered=row.map(b=>({...b,job:byId[b.id]}));   // oldest to newest, as built
  const bayZ=(lot.bayZ[0]+lot.bayZ[1])/2;
  // Columns: one per company, height by months worked.
  const items=ordered.map(b=>{
    const j=b.job,h=Math.max(1.2,months(j)*.22);
    const col=new THREE.Mesh(new THREE.BoxGeometry(2.4,h,2.4).translate(0,h/2,0),new THREE.MeshStandardMaterial({color:j.accent,roughness:.55,flatShading:true}));
    col.position.set(b.x,.12,bayZ);col.scale.y=.001;col.castShadow=col.receiveShadow=true;group.add(col);
    const tag=card([[duration(j),64,700,'#1d1d1f']],{w:560,accent:j.accent});tag.scale.multiplyScalar(.42);tag.position.set(b.x,.12+h+.4,bayZ);group.add(tag);
    const info=card([[j.name,76,700,'#1d1d1f'],[j.role,40,500,'#1d1d1f',12],[`${span(j)} · ${duration(j)}`,36,500,'#6e6e73',14],[j.place,36,500,'#6e6e73',4],[j.note,36,500,j.accent,18]],{accent:j.accent});
    info.position.set(b.x,6.6,b.front+3.2);group.add(info);
    return {b,col,tag,info,h,grow:0};
  });
  // The timeline painted on the lot: 2019 to the latest end, a band per company.
  const first=Math.min(...jobs.map(j=>j.start[0])),last=Math.max(...jobs.map(j=>j.end[0]))+1;
  const tl=document.createElement('canvas');tl.width=2048;tl.height=256;const tg=tl.getContext('2d');
  const tlTex=new THREE.CanvasTexture(tl);tlTex.colorSpace=THREE.SRGBColorSpace;tlTex.anisotropy=8;
  const X=(y,m=1)=>80+(y+(m-1)/12-first)/(last-first)*(2048-160);
  function paintTimeline(upTo){
    tg.clearRect(0,0,2048,256);tg.fillStyle='rgba(255,255,255,.92)';tg.beginPath();tg.roundRect(0,0,2048,256,48);tg.fill();
    tg.strokeStyle='#c7cdd6';tg.lineWidth=6;tg.beginPath();tg.moveTo(80,150);tg.lineTo(1968,150);tg.stroke();
    tg.font='600 44px -apple-system, Arial, sans-serif';tg.textAlign='center';tg.fillStyle='#6e6e73';
    for(let y=first;y<=last;y++){tg.fillRect(X(y)-3,132,6,36);tg.fillText(String(y),X(y),222);}
    ordered.forEach((it,i)=>{if(i>upTo)return;const j=it.job;tg.fillStyle=j.accent;tg.beginPath();tg.roundRect(X(...j.start),112,X(j.end[0],j.end[1]+1)-X(...j.start),76,20);tg.fill();
      tg.fillStyle='#1d1d1f';tg.font='700 40px -apple-system, Arial, sans-serif';tg.fillText(j.name,(X(...j.start)+X(j.end[0],j.end[1]+1))/2,86);});
    tlTex.needsUpdate=true;
  }
  const tlW=lot.x1-lot.x0-4;
  const timeline=new THREE.Mesh(new THREE.PlaneGeometry(tlW,tlW/8).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:tlTex,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  timeline.position.set((lot.x0+lot.x1)/2,.16,lot.bayZ[1]+.3+tlW/16);timeline.renderOrder=5;group.add(timeline);
  // About: who he is, in one card over the middle of the row.
  const midX=(row[0].x+row.at(-1).x)/2,front=Math.max(...row.map(b=>b.front));
  const about=card([[profile.name,80,700,'#1d1d1f'],[`${profile.role} · ${profile.location}`,42,500,'#1d1d1f',12],[profile.study,38,500,'#6e6e73',10],
    [`${totalYears()}+ years across ${jobs.length} companies`,42,700,'#2f6bff',22],[profile.services.join(' · '),36,500,'#1d1d1f',18]],{accent:'#2f6bff'});
  about.scale.multiplyScalar(1.25);about.position.set(midX,7.5,front+5);group.add(about);

  // HUD: where you are in the story, and how to move.
  const hud=document.createElement('div');hud.className='story-hud';hud.hidden=true;
  hud.innerHTML='<button data-s="-1" aria-label="Previous">‹</button><span class="story-title"></span><button data-s="1" aria-label="Next">›</button><button data-s="x" class="story-exit">Esc</button>';
  document.querySelector('.scene')?.append(hud);
  hud.onclick=e=>{const s=e.target.dataset.s;if(s==='x')stop();else if(s)go(step+ +s);};

  let step=-1,active=false;
  const steps=[...ordered.map(it=>it.job.name),'About'];
  function go(i){
    if(!active)return;if(i>=steps.length){stop();return;}step=Math.max(0,i);
    hud.querySelector('.story-title').textContent=`${step+1} of ${steps.length} · ${steps[step]}`;
    hud.querySelector('[data-s="-1"]').disabled=step===0;
    paintTimeline(Math.min(step,ordered.length-1));
    if(step<items.length){const b=items[step].b;onFocus(b.x,5.5,b.front+4.5);}else onFocus(midX,6.5,front+6);
  }
  function start(id){
    active=true;group.visible=true;hud.hidden=false;if(lot.decal)lot.decal.visible=false;   // the timeline takes its place
    const i=Math.max(0,items.findIndex(it=>it.b.id===id));for(const it of items){it.grow=0;it.col.scale.y=.001;}
    go(i);
  }
  function stop(){if(!active)return;active=false;hud.hidden=true;if(lot.decal)lot.decal.visible=true;onExit?.();}
  addEventListener('keydown',e=>{
    if(!active)return;e.stopPropagation();
    if(e.key==='ArrowRight'||e.key==='ArrowDown'){go(step+1);e.preventDefault();}
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){go(step-1);e.preventDefault();}
    else if(e.key==='Escape'){stop();e.preventDefault();}
    else if(e.key==='Enter'){go(step+1);e.preventDefault();}
  },true);

  return {
    get active(){return active;},start,stop,
    // Animates columns, cards and the timeline; returns true while anything moves.
    update(dt){
      if(!group.visible)return false;let moving=false;
      items.forEach((it,i)=>{
        const on=active&&i<=step,show=active&&i===step;
        it.grow=damp(it.grow,on?1:0,on?3:6,dt);it.col.scale.y=Math.max(.001,it.grow);it.tag.position.y=.12+it.h*it.grow+.4;
        it.tag.material.opacity=damp(it.tag.material.opacity,on?1:0,6,dt);it.info.material.opacity=damp(it.info.material.opacity,show?1:0,7,dt);
        if(Math.abs(it.grow-(on?1:0))>.002||Math.abs(it.info.material.opacity-(show?1:0))>.004)moving=true;
      });
      const showAbout=active&&step===items.length;
      about.material.opacity=damp(about.material.opacity,showAbout?1:0,6,dt);
      timeline.material.opacity=damp(timeline.material.opacity,active?1:0,5,dt);
      if(Math.abs(about.material.opacity-(showAbout?1:0))>.004||Math.abs(timeline.material.opacity-(active?1:0))>.004)moving=true;
      if(!active&&!moving)group.visible=false;
      return moving;
    },
  };
}
