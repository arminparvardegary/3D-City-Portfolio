// All the sound, made live with the Web Audio API (no files), tuned to feel
// expensive: the car is a smooth V8 built from its firing harmonics (deep, round,
// never buzzy), with intake breath on throttle, seamless shifts through seven
// gears and soft burbles when you lift off; tyre roll and wind stay calm, as in
// a quiet cabin; a warm two tone horn (H). The city sits in a real acoustic
// space (reverb): a low traffic rumble, nearby cars, distant horns and sirens,
// the police car's siren when close, birds in Central Park, water at the edge.
// A soft lounge pad plays underneath (N toggles it). Sound starts on the first
// key press or click; the button mutes; both are remembered.
const KEY='nyc-sound',MKEY='nyc-music';

export function createAudio({car,world,maxSpeed=()=>9.6}){
  let voice=null,ctx=null,master=null,on=true,music=true,started=false;
  try{on=localStorage.getItem(KEY)!=='off';music=localStorage.getItem(MKEY)!=='off';}catch{}
  const N={};
  // Mute button (top right).
  const btn=document.createElement('button');btn.className='sound-toggle';
  const icon=()=>{btn.setAttribute('aria-pressed',String(on));btn.setAttribute('aria-label',on?'Sound on (N for music)':'Sound off');btn.innerHTML=on
    ?'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>'
    :'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';};
  icon();document.querySelector('.scene')?.append(btn);
  const save=()=>{try{localStorage.setItem(KEY,on?'on':'off');localStorage.setItem(MKEY,music?'on':'off');}catch{}};
  const setOn=v=>{on=v;save();icon();if(master)master.gain.setTargetAtTime(on?.9:0,ctx.currentTime,.12);if(on)start();};
  const setMusic=v=>{music=v;save();if(N.music)N.music.gain.setTargetAtTime(music?.55:0,ctx.currentTime,1.2);};
  btn.onclick=()=>setOn(!on);

  const noiseBuffer=(type,seconds=3)=>{const b=ctx.createBuffer(1,ctx.sampleRate*seconds,ctx.sampleRate),d=b.getChannelData(0);let l=0,b0=0,b1=0,b2=0;
    for(let i=0;i<d.length;i++){const w=Math.random()*2-1;
      if(type==='brown'){l=(l+.02*w)/1.02;d[i]=l*3.5;}
      else if(type==='pink'){b0=.997*b0+w*.029;b1=.985*b1+w*.032;b2=.95*b2+w*.048;d[i]=(b0+b1+b2+w*.02)*.9;}
      else d[i]=w;}
    return b;};
  // A gentle room: a generated impulse response (decaying noise) for the reverb.
  const impulse=(seconds=2.4,decay=2.6)=>{const len=ctx.sampleRate*seconds,b=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}return b;};
  const loopNoise=(type,ft,freq,q,dest)=>{const s=ctx.createBufferSource();s.buffer=noiseBuffer(type);s.loop=true;const f=ctx.createBiquadFilter();f.type=ft;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=0;s.connect(f).connect(g).connect(dest);s.start();return {f,g};};

  function start(){
    if(started||!on)return;started=true;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    // Output chain: a gentle compressor and a touch of warmth.
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=12;comp.ratio.value=2.5;comp.attack.value=.01;comp.release.value=.3;comp.connect(ctx.destination);
    master=ctx.createGain();master.gain.value=on?.9:0;master.connect(comp);
    const verb=ctx.createConvolver();verb.buffer=impulse();const wet=ctx.createGain();wet.gain.value=.22;verb.connect(wet).connect(master);
    const send=(gain=.3)=>{const dry=ctx.createGain(),s=ctx.createGain();s.gain.value=gain;dry.connect(master);dry.connect(s);s.connect(verb);return dry;};
    N.space=send(.35);N.near=send(.12);

    // V8: harmonics of the firing frequency (four fires per turn), each a sine,
    // with half order partials for the burble and a slow cylinder to cylinder pulse.
    const eng=ctx.createGain();eng.gain.value=0;const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.Q.value=.8;tone.frequency.value=900;
    const body=ctx.createBiquadFilter();body.type='peaking';body.frequency.value=140;body.gain.value=5;body.Q.value=.9;
    tone.connect(body).connect(eng).connect(N.near);
    const pulse=ctx.createGain();pulse.gain.value=1;pulse.connect(tone);
    const lfo=ctx.createOscillator();lfo.type='sine';const lfoG=ctx.createGain();lfoG.gain.value=.12;lfo.connect(lfoG).connect(pulse.gain);lfo.start();
    const partials=[.5,1,1.5,2,3,4,6].map(mul=>{const o=ctx.createOscillator();o.type='sine';const g=ctx.createGain();g.gain.value=0;o.connect(g).connect(pulse);o.start();return {o,mul,g};});
    // Intake: soft filtered pink noise that breathes with the throttle.
    const intake=loopNoise('pink','bandpass',600,.9,N.near);
    N.engine={eng,tone,partials,lfo,lfoG,intake,rpm:.12,gear:0,shift:0};
    // Cabin: calm tyre roll, wind; tyre squeal kept soft.
    N.roll=loopNoise('brown','lowpass',260,.7,N.near);
    N.wind=loopNoise('pink','lowpass',900,.5,N.near);
    N.squeal=loopNoise('white','bandpass',1700,9,N.near);
    // City round you.
    N.city=loopNoise('brown','lowpass',300,.6,N.space);N.city.g.gain.value=.1;
    N.traffic=loopNoise('brown','lowpass',200,.8,N.space);
    N.water=loopNoise('pink','lowpass',650,.5,N.space);
    const sir=ctx.createOscillator();sir.type='sine';const sirG=ctx.createGain();sirG.gain.value=0;sir.connect(sirG).connect(N.space);sir.start();N.siren={o:sir,g:sirG};
    // Horn (H): built for the car you drive, see setHorn.
    const hornG=ctx.createGain();hornG.gain.value=0;const hornF=ctx.createBiquadFilter();hornF.type='lowpass';hornF.connect(hornG).connect(N.space);
    N.horn=hornG;N.hornF=hornF;N.hornOsc=[];voice=null;
    // Music: a slow pad of warm chords, with now and then a soft bell note.
    const mus=ctx.createGain();mus.gain.value=music?.55:0;const musF=ctx.createBiquadFilter();musF.type='lowpass';musF.frequency.value=1800;musF.connect(mus).connect(N.space);N.music=mus;N.musicIn=musF;
    N.voices=[0,1,2,3].map(()=>{const g=ctx.createGain();g.gain.value=0;g.connect(musF);const os=[-6,6].map(det=>{const o=ctx.createOscillator();o.type='triangle';o.detune.value=det;o.connect(g);o.start();return o;});return {g,os};});
  }
  // Each car has its own engine and horn (MODELS in cars/models.js names them).
  // Engine: idle and top firing frequency (Hz), the loudness of each harmonic
  // (½, 1, 1½, 2, 3, 4, 6 × firing), how lumpy it runs, how bright and how loud.
  const ENGINES={
    v8:    {base:26,range:120,amps:[.55,1,.35,.5,.22,.12,.05],lump:.12,lumpDiv:8,bright:1,  loud:1},     // muscle burble
    flat6: {base:42,range:200,amps:[.12,.8,.5,.75,.5,.32,.18],lump:.05,lumpDiv:6,bright:1.45,loud:.95},  // sports wail
    i4:    {base:38,range:165,amps:[.04,.55,.08,1,.28,.38,.12],lump:.03,lumpDiv:4,bright:1.2,loud:.8},   // buzzy four
    v6:    {base:32,range:140,amps:[.25,1,.3,.6,.3,.16,.06],lump:.07,lumpDiv:6,bright:1.05,loud:.9},     // smooth SUV
    v12:   {base:46,range:170,amps:[.04,.7,.2,.6,.45,.4,.28],lump:.015,lumpDiv:12,bright:1.3,loud:.75},  // silky limo
    ev:    {base:70,range:520,amps:[0,.7,0,.35,.08,.04,0],lump:0,lumpDiv:1,bright:1.7,loud:.08,breath:0},   // electric: almost silent, a faint motor whine
    diesel:{base:15,range:62,amps:[.75,1,.65,.55,.35,.25,.12],lump:.32,lumpDiv:2,bright:.65,loud:1.25}, // big clattering diesel
  };
  // Horns: tones (Hz), wave and filter; sirens sweep while H is held.
  const HORNS={
    car:   {f:[392,494],wave:'sawtooth',cut:1300,gain:.05},
    sport: {f:[523,659],wave:'square',cut:2400,gain:.035},
    muscle:{f:[311,392],wave:'sawtooth',cut:1050,gain:.06},
    taxi:  {f:[440,554],wave:'square',cut:1700,gain:.04},
    van:   {f:[370,466],wave:'sawtooth',cut:1150,gain:.05},
    limo:  {f:[349,440,523],wave:'sawtooth',cut:1500,gain:.04},
    bus:   {f:[175,220],wave:'sawtooth',cut:900,gain:.08},
    truck: {f:[155,196,233],wave:'sawtooth',cut:850,gain:.08},
    fire:  {f:[131,165,196],wave:'sawtooth',cut:800,gain:.09},
    police:   {f:[1000],wave:'triangle',cut:3000,gain:.12,sweep:{rate:5.5,depth:380}},   // yelp
    ambulance:{f:[810],wave:'square',cut:2200,gain:.05,sweep:{rate:.9,depth:150,step:true}}, // hi lo
  };
  function setVoice(drive){
    if(!ctx)return;const T=ctx.currentTime,eng=ENGINES[drive?.engine]??ENGINES.v8,horn=HORNS[drive?.horn]??HORNS.car,E=N.engine;
    voice={eng,horn};
    E.partials.forEach((q,i)=>q.g.gain.setTargetAtTime(eng.amps[i]*.22,T,.1));E.lfoG.gain.setTargetAtTime(eng.lump,T,.1);
    for(const o of N.hornOsc)o.stop();N.hornOsc=[];N.hornF.frequency.value=horn.cut;
    let mod=null;if(horn.sweep){mod=ctx.createOscillator();mod.type=horn.sweep.step?'square':'sine';mod.frequency.value=horn.sweep.rate;const d=ctx.createGain();d.gain.value=horn.sweep.depth;mod.connect(d);mod.start();N.hornOsc.push(mod);mod=d;}
    for(const f of horn.f)for(const det of horn.sweep?[0]:[-4,4]){const o=ctx.createOscillator();o.type=horn.wave;o.frequency.value=f;o.detune.value=det;if(mod)mod.connect(o.frequency);
      const g=ctx.createGain();g.gain.value=horn.gain;o.connect(g).connect(N.hornF);o.start();N.hornOsc.push(o);}
  }
  // One shots.
  const tone1=(freq,len,gain,{type='sine',slide=0,delay=0,dest}={})=>{if(!ctx||!on)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+len);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g).connect(dest??N.space);o.start(t);o.stop(t+len+.05);};
  const thump=(gain,len,freq)=>{if(!ctx||!on)return;const t=ctx.currentTime,s=ctx.createBufferSource();s.buffer=noiseBuffer('brown',.6);const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=ctx.createGain();
    g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+len);s.connect(f).connect(g).connect(N.near);s.start(t);s.stop(t+len+.05);};
  const hit=s=>{thump(.9*s,.45,260);tone1(58,.35,.35*s,{slide:.6,dest:N.near});};
  const burble=()=>{thump(.25,.12,500);};
  const distantHorn=()=>{const f=[311,349,392][Math.floor(Math.random()*3)];tone1(f,.4,.018,{type:'triangle'});tone1(f*1.25,.4,.014,{type:'triangle'});};
  const chirp=()=>{const f=2800+Math.random()*1600;for(let k=0;k<2+Math.floor(Math.random()*3);k++)tone1(f*(1+Math.random()*.15),.08,.025,{slide:1.35,delay:k*.1});};
  const ui={prompt:()=>{tone1(784,.5,.07);tone1(1175,.7,.05,{delay:.12});},step:()=>tone1(988,.25,.04),open:()=>{tone1(523,.6,.06);tone1(659,.7,.05,{delay:.1});tone1(988,.9,.04,{delay:.2});}};

  const typing=t=>t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  addEventListener('keydown',e=>{if(typing(e.target)||e.metaKey||e.ctrlKey)return;start();
    if(e.code==='KeyN'){setMusic(!music);return;}   // M is the map now; mute is the sound button
    if(e.code==='KeyH'&&N.horn&&!e.repeat)N.horn.gain.setTargetAtTime(1,ctx.currentTime,.015);},true);
  addEventListener('keyup',e=>{if(e.code==='KeyH'&&N.horn)N.horn.gain.setTargetAtTime(0,ctx.currentTime,.05);});
  addEventListener('pointerdown',()=>start(),{capture:true});
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;document.hidden?ctx.suspend():on&&ctx.resume();});

  // Seven gears: where each ends, as a share of top speed.
  const GEARS=[.1,.2,.32,.46,.62,.8,1];
  // Lounge chords (MIDI notes): Dmaj9, Bm9, Gmaj7#11, A13sus.
  const CHORDS=[[50,57,61,64,66],[47,54,57,61,62],[43,50,54,59,61],[45,52,55,59,62]];
  const midi=n=>440*Math.pow(2,(n-69)/12);
  let shown={},time=0,nextHorn=5,nextSiren=25,nextChirp=0,chord=-1,nextChord=0,nextBell=6,lastThr=0;
  function update(dt){
    if(!ctx||!on||ctx.state!=='running'){if(ctx&&on&&ctx.state==='suspended'&&!document.hidden)ctx.resume();return;}
    time+=dt;const T=ctx.currentTime,p=car.pose(),v=Math.abs(car.speed),k=Math.min(1,v/maxSpeed()),thr=Math.max(0,car.throttle),set=(param,val,tc=.08)=>param.setTargetAtTime(val,T,tc);
    // Engine: rpm rises through each gear and drops softly at each shift.
    const E=N.engine;let g=0;while(g<GEARS.length-1&&k>GEARS[g])g++;
    if(g!==E.gear){E.shift=.18;E.gear=g;}E.shift=Math.max(0,E.shift-dt);
    const lo=g?GEARS[g-1]:0,inGear=(k-lo)/(GEARS[g]-lo),target=.16+.7*inGear*(1-g*.035)+thr*.06;
    E.rpm+=(target-E.rpm)*Math.min(1,dt*(E.shift>0?4:7));
    if(car.vehicle!==shown){shown=car.vehicle;setVoice(shown?.drive);}const V=voice.eng;
    const fire=V.base+E.rpm*V.range;for(const {o,mul} of E.partials)set(o.frequency,fire*mul,.04);set(E.lfo.frequency,fire/V.lumpDiv,.1);
    set(E.tone.frequency,(520+E.rpm*900+thr*1100)*V.bright);
    set(E.eng.gain,(.22+E.rpm*.28+thr*.18)*(E.shift>0?.65:1)*V.loud,.07);
    set(E.intake.g.gain,thr*(.02+E.rpm*.05)*(V.breath??1));set(E.intake.f.frequency,420+E.rpm*900);
    if(V.lump>0&&lastThr>.5&&thr<.5&&v>3)for(let i=0;i<3;i++)setTimeout(burble,60+i*90+Math.random()*60);lastThr=thr;
    // Cabin noise.
    set(N.roll.g.gain,.04+k*.12);set(N.roll.f.frequency,180+k*260);
    set(N.wind.g.gain,k*k*.08);set(N.wind.f.frequency,600+k*1200);
    set(N.squeal.g.gain,Math.min(.06,Math.max(0,car.slide-.5)*.12*Math.min(1,v/3)),.05);
    // Traffic nearby, the police siren when close.
    let near=1e9,police=1e9;for(const c of world.trafficCars??[]){const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<near)near=d;if(String(c.type).startsWith('police')&&d<police)police=d;}
    set(N.traffic.g.gain,.14/(1+near/7),.3);
    set(N.siren.o.frequency,650+Math.sin(time*2)*230,.06);set(N.siren.g.gain,police<40?.025*(1-police/40):0,.3);
    // Water at the edge of the island, birds in Central Park.
    const edge=Math.min(Math.abs(p.x-54),Math.abs(p.x-82),Math.abs(p.x+120),Math.abs(p.z-120),Math.abs(p.z+120));
    set(N.water.g.gain,edge<18?.05*(1-edge/18)*(.75+.25*Math.sin(time*.8)):0,.4);
    if(p.x<-35&&p.z<-39&&time>nextChirp){chirp();nextChirp=time+.5+Math.random()*1.8;}
    if(time>nextHorn){distantHorn();nextHorn=time+7+Math.random()*12;}
    if(time>nextSiren){const t0=T,o=ctx.createOscillator(),gg=ctx.createGain();o.type='sine';gg.gain.setValueAtTime(0,t0);gg.gain.linearRampToValueAtTime(.008,t0+2);gg.gain.linearRampToValueAtTime(0,t0+8);
      for(let i=0;i<16;i++)o.frequency.setValueAtTime(i%2?700:920,t0+i*.5);o.connect(gg).connect(N.space);o.start(t0);o.stop(t0+8.2);nextSiren=time+45+Math.random()*45;}
    // Music: change chord every 8 s with slow fades; a bell note now and then.
    if(time>nextChord){chord=(chord+1)%CHORDS.length;nextChord=time+8;const notes=CHORDS[chord];
      N.voices.forEach((vo,i)=>{const f=midi(notes[i+1]??notes[0]+12);vo.os.forEach(o=>o.frequency.setTargetAtTime(f,T,.6));vo.g.gain.setTargetAtTime(.022,T,1.4);});}
    if(music&&time>nextBell){const notes=CHORDS[Math.max(0,chord)];tone1(midi(notes[Math.floor(Math.random()*notes.length)]+24),2.2,.018,{type:'sine',dest:N.musicIn});nextBell=time+3+Math.random()*5;}
  }
  return {update,hit,ui,start,get on(){return on;}};
}
