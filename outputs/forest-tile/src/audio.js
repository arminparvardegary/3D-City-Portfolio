// All the sound, made live with the Web Audio API (no files): the car's engine
// through four gears, tyre squeal, wind and road noise, hits and the horn (H);
// the city around it: a low traffic rumble, the hum of cars nearby, distant
// horns and sirens, the police car's siren when it is close, birds in Central
// Park and water at the waterfront; and soft interface chimes. Sound starts on
// the first key press or click (browsers require it) and can be muted (M or the
// button), remembered per browser.
const KEY='nyc-sound';

export function createAudio({car,world,maxSpeed=()=>9.6}){
  let ctx=null,master=null,on=true,started=false;
  try{on=localStorage.getItem(KEY)!=='off';}catch{}
  const nodes={};
  // Mute button (top right).
  const btn=document.createElement('button');btn.className='sound-toggle';btn.setAttribute('aria-pressed',String(on));
  const icon=()=>{btn.setAttribute('aria-label',on?'Sound on (M to mute)':'Sound off (M to turn on)');btn.innerHTML=on
    ?'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>'
    :'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';};
  icon();document.querySelector('.scene')?.append(btn);
  const setOn=v=>{on=v;try{localStorage.setItem(KEY,on?'on':'off');}catch{}icon();btn.setAttribute('aria-pressed',String(on));if(master)master.gain.setTargetAtTime(on?1:0,ctx.currentTime,.08);if(on)start();};
  btn.onclick=()=>setOn(!on);

  function noiseBuffer(type='white',seconds=2){
    const b=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate),d=b.getChannelData(0);let last=0;
    for(let i=0;i<d.length;i++){const w=Math.random()*2-1;if(type==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.5;}else d[i]=w;}
    return b;
  }
  const loopNoise=(type,filterType,freq,q=1)=>{const s=ctx.createBufferSource();s.buffer=noiseBuffer(type);s.loop=true;const f=ctx.createBiquadFilter();f.type=filterType;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=0;s.connect(f).connect(g).connect(master);s.start();return {f,g};};
  function start(){
    if(started||!on)return;started=true;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.connect(ctx.destination);
    master=ctx.createGain();master.gain.value=on?1:0;master.connect(comp);
    // Engine: three oscillators, a soft distortion and a filter that opens with the throttle.
    const shaper=ctx.createWaveShaper(),curve=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;curve[i]=Math.tanh(x*2.2);}shaper.curve=curve;
    const engF=ctx.createBiquadFilter();engF.type='lowpass';engF.Q.value=2;const engG=ctx.createGain();engG.gain.value=0;
    const oscs=[['sawtooth',1,.5],['square',.5,.35],['sine',2,.25]].map(([type,mul,gain])=>{const o=ctx.createOscillator();o.type=type;const g=ctx.createGain();g.gain.value=gain;o.connect(g).connect(shaper);o.start();return {o,mul};});
    shaper.connect(engF).connect(engG).connect(master);
    nodes.engine={oscs,engF,engG,rpm:0};
    nodes.tyres=loopNoise('white','bandpass',1900,7);
    nodes.wind=loopNoise('white','lowpass',700,.7);
    nodes.city=loopNoise('brown','lowpass',380,.7);nodes.city.g.gain.value=.12;
    nodes.traffic=loopNoise('brown','lowpass',220,1);
    nodes.water=loopNoise('white','lowpass',500,.6);
    // Police siren (a wail) and the horn: oscillators that run quietly until needed.
    const sir=ctx.createOscillator();sir.type='triangle';const sirG=ctx.createGain();sirG.gain.value=0;sir.connect(sirG).connect(master);sir.start();nodes.siren={o:sir,g:sirG};
    const hornG=ctx.createGain();hornG.gain.value=0;const hornF=ctx.createBiquadFilter();hornF.type='lowpass';hornF.frequency.value=1600;hornF.connect(hornG).connect(master);
    for(const f of [349,440]){const o=ctx.createOscillator();o.type='square';o.frequency.value=f;const g=ctx.createGain();g.gain.value=.18;o.connect(g).connect(hornF);o.start();}
    nodes.horn=hornG;
  }
  // One shots.
  const ping=(freq,len=.25,gain=.12,type='sine',slide=0,delay=0)=>{if(!ctx||!on)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+len);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g).connect(master);o.start(t);o.stop(t+len+.05);};
  const burst=(gain,len,freq)=>{if(!ctx||!on)return;const t=ctx.currentTime,s=ctx.createBufferSource();s.buffer=noiseBuffer('white',.6);const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=ctx.createGain();
    g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+len);s.connect(f).connect(g).connect(master);s.start(t);s.stop(t+len+.05);};
  const hit=s=>{burst(.5*s,.35,320);ping(70,.3,.4*s,'sine',.5);};
  const distantHorn=()=>{const f=[300,330,370,415][Math.floor(Math.random()*4)];ping(f,.35,.03,'square',1,0);ping(f*1.26,.35,.025,'square',1,0);};
  const chirp=()=>{const f=2600+Math.random()*1800;for(let k=0;k<2+Math.floor(Math.random()*3);k++)ping(f*(1+Math.random()*.2),.09,.03,'sine',1.4,k*.11);};
  const ui={prompt:()=>{ping(880,.18,.06);ping(1320,.25,.05,'sine',1,.09);},step:()=>ping(660,.08,.04,'triangle'),open:()=>{ping(523,.2,.05);ping(784,.3,.05,'sine',1,.1);}};

  // Keys: H for the horn, M to mute; the first key or click starts the sound.
  const typing=t=>t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  addEventListener('keydown',e=>{if(typing(e.target)||e.metaKey||e.ctrlKey)return;start();if(e.code==='KeyM'){setOn(!on);return;}if(e.code==='KeyH'&&nodes.horn)nodes.horn.gain.setTargetAtTime(.22,ctx.currentTime,.01);},true);
  addEventListener('keyup',e=>{if(e.code==='KeyH'&&nodes.horn)nodes.horn.gain.setTargetAtTime(0,ctx.currentTime,.03);});
  addEventListener('pointerdown',()=>start(),{once:false,capture:true});
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;document.hidden?ctx.suspend():on&&ctx.resume();});

  // Gears: (speed share at which each gear ends). The engine revs up within a gear and drops after a shift.
  const GEARS=[.22,.45,.7,1];
  let nextHorn=4,nextSiren=20,nextChirp=0,time=0;
  function update(dt){
    if(!ctx||!on||ctx.state!=='running'){if(ctx&&on&&ctx.state==='suspended'&&!document.hidden)ctx.resume();return;}
    time+=dt;const T=ctx.currentTime,p=car.pose(),v=Math.abs(car.speed),vm=maxSpeed(),k=Math.min(1,v/vm),thr=car.throttle,set=(param,val,tc=.06)=>param.setTargetAtTime(val,T,tc);
    // Engine.
    let g=0;while(g<GEARS.length-1&&k>GEARS[g])g++;const lo=g?GEARS[g-1]:0,inGear=(k-lo)/(GEARS[g]-lo);
    const rpm=Math.max(.12,.25+.75*inGear)*(thr>0?1:.92),E=nodes.engine;E.rpm+=(rpm-E.rpm)*Math.min(1,dt*8);
    const base=34+E.rpm*95;for(const {o,mul} of E.oscs)set(o.frequency,base*mul,.03);
    set(E.engF.frequency,380+E.rpm*900+(thr>0?900:0));set(E.engG.gain,.045+E.rpm*.05+(thr>0?.035:0));
    // Tyres, wind, road.
    set(nodes.tyres.g.gain,Math.min(.22,Math.max(0,car.slide-.45)*.35*Math.min(1,v/3)),.04);
    set(nodes.wind.g.gain,.012+k*k*.12);set(nodes.wind.f.frequency,500+k*1400);
    // Nearby traffic: hum by the distance to the nearest car; the police siren when it is close.
    let near=1e9,police=1e9;for(const c of world.trafficCars??[]){const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<near)near=d;if(c.type==='police')police=d;}
    set(nodes.traffic.g.gain,.16/(1+near/6),.2);
    const wail=.5+.5*Math.sin(time*2.2);set(nodes.siren.o.frequency,620+wail*420,.05);set(nodes.siren.g.gain,police<45?.05*(1-police/45):0,.2);
    // Water near the waterfront; birds in Central Park.
    const edge=Math.min(Math.abs(p.x-52),Math.abs(p.x-84),Math.abs(p.x+120),Math.abs(p.z-120),Math.abs(p.z+120));
    set(nodes.water.g.gain,edge<18?.06*(1-edge/18)*(.7+.3*Math.sin(time*.9)):0,.3);
    const inPark=p.x<-35&&p.z<-39;
    if(inPark&&time>nextChirp){chirp();nextChirp=time+.4+Math.random()*1.6;}
    // The city: distant horns, now and then a far siren.
    if(time>nextHorn){distantHorn();nextHorn=time+5+Math.random()*10;}
    if(time>nextSiren){const t0=ctx.currentTime,o=ctx.createOscillator(),gg=ctx.createGain();o.type='sine';gg.gain.setValueAtTime(0,t0);gg.gain.linearRampToValueAtTime(.012,t0+1.5);gg.gain.linearRampToValueAtTime(0,t0+7);
      for(let i=0;i<14;i++)o.frequency.setValueAtTime(i%2?720:960,t0+i*.5);o.connect(gg).connect(master);o.start(t0);o.stop(t0+7.2);nextSiren=time+35+Math.random()*40;}
  }
  return {update,hit,ui,start,get on(){return on;}};
}
