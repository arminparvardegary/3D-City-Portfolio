import './style.css';
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, ToneMappingEffect, ToneMappingMode, HueSaturationEffect } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { ART, TILE_SPEC } from './config.js';
import { createMaterials } from './materials.js';
import { createCarControls } from './car.js';
import { softenShadows, setShadowTaps } from './shadows.js';
import { PRESETS, ORDER, detectQuality, FrameMonitor } from './quality.js';
import { LIGHTING, createLights, createEnvironment, applyLighting } from './world/lighting.js';
import { wind, setDensity } from './world/vegetation.js';
import { buildGrid, GRID, HOME_NUMBER, tileNumber, tileCenter } from './world/grid.js';
import { THEME } from './world/theme.js';
import { createPlayground } from './world/playground.js';
import { buildCampus } from './world/campus.js';
import { createExperience } from './ui/experience.js';
import { VEHICLES } from './vehicles.js';
import { FEEL, damp, spring } from './motion.js';

const viewport=document.querySelector('#viewport');
const $=id=>document.getElementById(id);
let renderer;
try {
  renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,stencil:false,powerPreference:'high-performance'});
} catch(error) {
  $('loading').textContent='This little world needs WebGL 2. Please open it in a browser with hardware acceleration enabled.';
  throw error;
}
renderer.setClearColor(0x000000,0);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate=false;
renderer.info.autoReset=false;
// Tone mapping happens once, in the final effect pass (renderer stays linear).
renderer.toneMapping=THREE.NoToneMapping;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-label','A white architectural model of a campus with Armin\'s sections (About, Work, Skills, Projects, Contact) and the studios he worked at. Drive the car with the arrow keys or WASD.');
renderer.domElement.setAttribute('role','img');
viewport.appendChild(renderer.domElement);

const scene=new THREE.Scene();
// Fixed isometric angle. The camera can pan over the map and zoom, but never rotates;
// it sits far back so the whole map fits between the clip planes.
const camera=new THREE.OrthographicCamera(-10,10,8,-8,1,400);
const target=new THREE.Vector3(...ART.camera.target);
const az=THREE.MathUtils.degToRad(ART.camera.azimuth),el=THREE.MathUtils.degToRad(ART.camera.elevation);
const viewDir=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
const CAMERA_DISTANCE=160;
function placeCamera(){camera.position.copy(target).addScaledVector(viewDir,CAMERA_DISTANCE);camera.lookAt(target);}
placeCamera();

const art=structuredClone(LIGHTING.storybook);   // the harbour theme (world/theme.js)
art.fog.enabled=false;   // the whole map: every tile should read the same
const lights=createLights(scene),{sky,sun,fill}=lights;
scene.environment=createEnvironment(renderer,art);
const materials=createMaterials();
Object.values(materials).forEach(softenShadows);
// --- The map: a square of 9 x 9 numbered tiles (81) ------------------------------
// The numbered tiles show only with ?tiles; normally the playground floor is the map.
const tileGrid=buildGrid(softenShadows);if(new URLSearchParams(location.search).has('tiles'))scene.add(tileGrid.group);
const bounds=tileGrid.bounds;
document.documentElement.style.setProperty('--sky-top',THEME.sky.top);document.documentElement.style.setProperty('--sky-horizon',THEME.sky.horizon);
// Your car starts in the middle of the map.
const car=createCarControls(scene,materials,{prep:softenShadows,index:VEHICLES.findIndex(v=>v.name==='City'),home:{x:0,z:0,h:Math.PI/2}});
car.setBounds({x0:bounds.x0+.4,x1:bounds.x1-.4,z0:bounds.z0+.4,z1:bounds.z1-.4});
// The white campus: plinths, buildings, beacons. The car cannot drive onto the plinths.
const campus=buildCampus({prep:softenShadows});scene.add(campus.group);
car.addStatic([],campus.solids);car.paint.color.set(THEME.campus.car);
const playground=createPlayground({scene,prep:softenShadows,car,bounds,solids:campus.solids});
const canopies=[],animateTile=null,meadow={layers:[],grassMaterial:null};
const grid=new THREE.Group();grid.visible=false;scene.add(grid);
const gridMat=new THREE.LineBasicMaterial({color:'#738662',transparent:true,opacity:.32,depthTest:false});
const gridVertices=[];
for(let i=-5;i<=5;i++){
  gridVertices.push(-5,.17,i,5,.17,i,i,.17,-5,i,.17,5);
}
const gridGeo=new THREE.BufferGeometry();gridGeo.setAttribute('position',new THREE.Float32BufferAttribute(gridVertices,3));
const lines=new THREE.LineSegments(gridGeo,gridMat);lines.renderOrder=20;grid.add(lines);

// Render pipeline: one multisampled scene pass, N8AO ambient occlusion (from
// depth, no second scene render), then a single merged pass for tone mapping
// and colour space output.
const composer=new EffectComposer(renderer,{frameBufferType:THREE.HalfFloatType,multisampling:4});
composer.addPass(new RenderPass(scene,camera));
const ao=new N8AOPostPass(scene,camera,1,1);
// The only transparent surfaces are ground shadow catchers that need no AO; letting
// N8AO auto-detect them made it re-render transparency every frame (~10 ms).
ao.autoDetectTransparency=false;
Object.assign(ao.configuration,{gammaCorrection:false,screenSpaceRadius:false,depthAwareUpsampling:true,transparencyAware:false});
composer.addPass(ao);
const toneMapping=new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL});
// Saturation runs in the same pass as tone mapping: no extra cost. (A contrast
// effect here pushed the darkest shadows below zero, which tone mapping turned
// white; contrast comes from the light instead: strong sun, low fill, deep AO.)
const saturation=new HueSaturationEffect({saturation:.08});
composer.addPass(new EffectPass(camera,toneMapping,saturation));
const TONE={neutral:ToneMappingMode.NEUTRAL,agx:ToneMappingMode.AGX,aces:ToneMappingMode.ACES_FILMIC};
function applyArt(){
  applyLighting(art,lights,scene);if(typeof placeSun==='function')placeSun();
  renderer.toneMappingExposure=art.exposure;toneMapping.mode=TONE[art.toneMapping]??ToneMappingMode.NEUTRAL;
  Object.assign(ao.configuration,{intensity:art.ao.intensity,aoRadius:art.ao.radius,distanceFalloff:art.ao.falloff});ao.configuration.color.set(art.ao.color);
  if(art.grade)saturation.saturation=art.grade.saturation;
  renderer.shadowMap.needsUpdate=true;needsRender=true;
}

// Quality: preset from the device (or ?quality=), render scale adapts within it.
let qualityName='balanced',quality=PRESETS.balanced,renderScale=1,qualityMode='auto';
function setQuality(name,mode=qualityMode){
  qualityName=name;quality=PRESETS[name];qualityMode=mode;
  composer.multisampling=quality.msaa;
  ao.enabled=quality.ao.enabled;Object.assign(ao.configuration,{halfRes:quality.ao.halfRes,aoSamples:quality.ao.aoSamples,denoiseSamples:quality.ao.denoiseSamples,denoiseIterations:quality.ao.denoiseIterations});
  if(sun.shadow.mapSize.x!==quality.shadowMap){sun.shadow.mapSize.setScalar(quality.shadowMap);sun.shadow.map?.dispose();sun.shadow.map=null;}
  setShadowTaps(quality.shadowTaps);
  for(const layer of meadow.layers)setDensity(layer,quality.decor*decorDensity);
  monitor.reset(quality.minScale);renderScale=1;resize();
}
let decorDensity=1;
const monitor=new FrameMonitor({
  onScale:s=>{renderScale=s;resize();},
  onPreset:()=>{const i=ORDER.indexOf(qualityName);if(i<ORDER.length-1)setQuality(ORDER[i+1],'auto');},
});
let zoom=.55,breeze=ART.vegetation.breeze,needsRender=true,hidden=document.hidden;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
if(reducedMotion.matches)breeze=false;

function resize(){
  const {width,height}=viewport.getBoundingClientRect();
  const aspect=width/height;
  // Keep the entire tile visible on portrait devices while retaining a large
  // inspection view on desktop. Zoom never changes camera orientation.
  const frustum=Math.max(ART.camera.viewHeight,16.8/aspect);
  camera.left=-frustum*aspect/2;camera.right=frustum*aspect/2;camera.top=frustum/2;camera.bottom=-frustum/2;camera.zoom=zoom*speedZoom;
  camera.updateProjectionMatrix();fitShadow();
  // Sharp on high density screens, capped by the preset, scaled down only by the monitor.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,quality.maxDpr)*renderScale);
  renderer.setSize(width,height);composer.setSize(width,height);
  renderer.shadowMap.needsUpdate=true;needsRender=true;
}
new ResizeObserver(resize).observe(viewport);

// --- View: drag to pan, wheel or pinch to zoom, and a spring follow of the car.
// The angle never changes. The view springs toward the car plus a look-ahead
// along its motion and pulls back a little at speed; a hard hit gives a tiny
// shake that dies away. Pans and zooms glide to a stop after release, and a pan
// holds the view for a moment before follow resumes. Constants: FEEL.camera.
const F=FEEL.camera,ZOOM_MIN=.08,ZOOM_MAX=2.2;
let followHold=0,zoomVel=0,speedZoom=1,trauma=0,shakeClock=0;
const panVel=new THREE.Vector3(),camX={x:target.x,v:0},camZ={x:target.z,v:0};
const groundRight=new THREE.Vector3(Math.cos(az),0,-Math.sin(az)),groundUp=new THREE.Vector3(-Math.sin(az),0,-Math.cos(az)).multiplyScalar(1/Math.sin(el));
const screenUp=new THREE.Vector3().crossVectors(groundRight,viewDir).normalize();
const pointers=new Map();let lastMove=0;
const canvasEl=renderer.domElement;canvasEl.style.touchAction='none';
const syncFollow=()=>{camX.x=target.x;camZ.x=target.z;camX.v=panVel.x;camZ.v=panVel.z;};
let pressAt=null;
canvasEl.addEventListener('pointerdown',e=>{try{canvasEl.setPointerCapture(e.pointerId);}catch{}pointers.set(e.pointerId,[e.clientX,e.clientY,e.timeStamp]);panVel.set(0,0,0);zoomVel=0;pressAt=pointers.size===1?[e.clientX,e.clientY]:null;});
canvasEl.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);if(!p){hover(e);return;}
  const dt=Math.max(.004,(e.timeStamp-p[2])/1000);
  if(pointers.size===2){
    const [a,b]=[...pointers.values()],d0=Math.hypot(a[0]-b[0],a[1]-b[1]);pointers.set(e.pointerId,[e.clientX,e.clientY,e.timeStamp]);
    const [c,d]=[...pointers.values()],d1=Math.hypot(c[0]-d[0],c[1]-d[1]);
    if(d0>0){const k=Math.log(d1/d0);zoom=THREE.MathUtils.clamp(zoom*Math.exp(k),ZOOM_MIN,ZOOM_MAX);zoomVel=damp(zoomVel,k/dt,20,dt);}
    return;
  }
  const dx=e.clientX-p[0],dy=e.clientY-p[1];pointers.set(e.pointerId,[e.clientX,e.clientY,e.timeStamp]);
  const unitsPerPx=(camera.top-camera.bottom)/camera.zoom/canvasEl.clientHeight;
  const wx=(-dx*groundRight.x-dy*groundUp.x)*unitsPerPx,wz=(-dx*groundRight.z-dy*groundUp.z)*unitsPerPx;
  target.x+=wx;target.z+=wz;
  // Pan speed, smoothed, so a flick glides on after release.
  panVel.x=damp(panVel.x,wx/dt,20,dt);panVel.z=damp(panVel.z,wz/dt,20,dt);lastMove=e.timeStamp;
  syncFollow();followHold=2.5;focus=null;needsRender=true;
});
for(const ev of ['pointerup','pointercancel'])canvasEl.addEventListener(ev,e=>{
  // A tap (no drag) on a building or its label opens it.
  if(ev==='pointerup'&&pressAt&&pointers.size===1&&Math.hypot(e.clientX-pressAt[0],e.clientY-pressAt[1])<6){const id=pick(e);if(id){panVel.set(0,0,0);openPlace(id);}}
  pressAt=null;pointers.delete(e.pointerId);
  if(e.timeStamp-lastMove>80)panVel.set(0,0,0);   // held still before letting go: no glide
  if(pointers.size)panVel.set(0,0,0);
});
canvasEl.addEventListener('wheel',e=>{e.preventDefault();zoomVel+=-e.deltaY*.0015*F.zoomGlide;},{passive:false});
// --- Places: click a building or label, or pick from the Experience list ------
// The camera glides to the place and holds there until you drive again.
let focus=null;
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.47),hitPoint=new THREE.Vector3();
function pick(e){
  const r=canvasEl.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects(campus.labels,false)[0];if(hit)return hit.object.userData.id;
  return ray.ray.intersectPlane(floorPlane,hitPoint)?campus.placeAt(hitPoint.x,hitPoint.z):null;
}
function hover(e){if(e.pointerType==='mouse')canvasEl.style.cursor=pick(e)?'pointer':'';}
function focusOn(id){const q=campus.places[id];if(!q)return;focus={x:q.x,z:q.z,zoom:THREE.MathUtils.clamp(zoom,.5,.75)};followHold=0;needsRender=true;}
const experience=createExperience({onSelect:focusOn});
// The Work tower opens the timeline at the newest job.
function openPlace(id){experience.open(id==='work'?experience.first:id);}

car.onHit=s=>{if(!reducedMotion.matches&&s>.2)trauma=Math.min(1,trauma+s*.8);};

function updateView(dt){
  let moved=false;
  // Zoom glides in log space, so it feels the same zoomed in or out.
  if(Math.abs(zoomVel)>1e-3&&!(pointers.size===2)){
    const z=THREE.MathUtils.clamp(zoom*Math.exp(zoomVel*dt),ZOOM_MIN,ZOOM_MAX);if(z===zoom)zoomVel=0;zoom=z;zoomVel=damp(zoomVel,0,F.zoomGlide,dt);moved=true;
  }else if(!pointers.size)zoomVel=0;
  // A released pan glides to a stop.
  if(!pointers.size&&panVel.lengthSq()>1e-6){
    target.addScaledVector(panVel,dt);panVel.x=damp(panVel.x,0,F.panGlide,dt);panVel.z=damp(panVel.z,0,F.panGlide,dt);
    syncFollow();followHold=Math.max(followHold,1.2);moved=true;
  }
  followHold=Math.max(0,followHold-dt);
  const p=car.shown;
  if(focus&&p.speed>.6)focus=null;   // driving takes the camera back
  // Pull back a little at speed.
  const zGoal=1-F.speedZoomOut*Math.min(1,p.speed/FEEL.car.maxSpeed);
  if(Math.abs(zGoal-speedZoom)>1e-4)speedZoom=damp(speedZoom,zGoal,2.2,dt);
  // Spring follow toward the car plus a look-ahead along its velocity.
  if(focus&&Math.abs(zoomVel)<1e-3&&Math.abs(zoom-focus.zoom)>1e-3){zoom=damp(zoom,focus.zoom,3,dt);moved=true;}
  if(focus||followHold===0){
    const gx=focus?focus.x:p.x+p.vx*F.lookAhead,gz=focus?focus.z:p.z+p.vz*F.lookAhead;
    if(Math.abs(gx-camX.x)+Math.abs(gz-camZ.x)>1e-4||Math.abs(camX.v)+Math.abs(camZ.v)>1e-4){
      target.x=spring(camX,gx,F.follow,dt);target.z=spring(camZ,gz,F.follow,dt);moved=true;
    }
  }
  const zoomNow=zoom*speedZoom;
  if(Math.abs(camera.zoom-zoomNow)>1e-5){camera.zoom=zoomNow;camera.updateProjectionMatrix();fitShadow();moved=true;}
  if(moved){placeCamera();placeSun();}
  // Shake: a little noise, scaled by trauma squared, fading fast.
  if(trauma>0){
    trauma=Math.max(0,trauma-F.shakeDecay*dt);shakeClock+=dt;
    if(!moved)placeCamera();
    const k=trauma*trauma*F.shake/camera.zoom,t=shakeClock;
    camera.position.addScaledVector(groundRight,k*(Math.sin(t*47.3)*.6+Math.sin(t*83.1+1.3)*.4)).addScaledVector(screenUp,k*(Math.sin(t*53.9+2.1)*.6+Math.sin(t*97.7)*.4));
    moved=true;
  }
  return moved;
}
// Shadows are drawn for the area in view only; the sun follows the view and snaps
// to whole shadow texels so edges never crawl while the camera glides.
const sunDir=new THREE.Vector3(),sunAt=new THREE.Vector3();
function fitShadow(){
  const half=THREE.MathUtils.clamp((camera.right-camera.left)/camera.zoom*.6,8,90),cam=sun.shadow.camera;
  cam.left=-half;cam.right=half;cam.top=half;cam.bottom=-half;cam.near=.5;cam.far=60;cam.updateProjectionMatrix();placeSun();
}
function placeSun(){
  const a=THREE.MathUtils.degToRad(art.sun.azimuth),e=THREE.MathUtils.degToRad(art.sun.elevation);sunDir.set(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
  const texel=(sun.shadow.camera.right-sun.shadow.camera.left)/sun.shadow.mapSize.x;
  sunAt.set(Math.round(target.x/texel)*texel,0,Math.round(target.z/texel)*texel);
  sun.target.position.copy(sunAt);sun.position.copy(sunAt).addScaledVector(sunDir,25);sun.target.updateMatrixWorld();
  renderer.shadowMap.needsUpdate=true;
}
let timeScale=1,animClock=0,lastFrame=null,worldClock=0;
function render(time=0){
  requestAnimationFrame(render);
  if(hidden){lastFrame=null;return;}
  const frameDt=lastFrame===null?0:Math.min(100,Math.max(0,time-lastFrame));lastFrame=time;
  let animating=false;
  if(breeze&&canopies.length){
    animClock+=frameDt*timeScale;wind.time.value=animClock/1000;
    animateTile?.(animClock);
    for(const canopy of canopies){const phase=canopy.userData.phase;canopy.rotation.z=Math.sin(animClock*.00065+phase)*ART.vegetation.sway;canopy.rotation.x=Math.cos(animClock*.00048+phase)*ART.vegetation.sway*.6;}
    animating=true;renderer.shadowMap.needsUpdate=true;
  }
  // The car is driven by the visitor, so it keeps running even with the breeze paused.
  if(campus.update(time))animating=true;   // beacons pulse; no shadow change
  if(car.update(time)){animating=true;renderer.shadowMap.needsUpdate=true;}
  if(playground.update(frameDt/1000)){animating=true;renderer.shadowMap.needsUpdate=true;}
  if(updateView(frameDt/1000))animating=true;
  if(!animating&&!needsRender)return;
  renderer.info.reset();composer.render();needsRender=false;
  monitor.frame(time,animating);
  renderer.domElement.dataset.ready='true';
  if(import.meta.env.DEV)devStats?.(time);
}
let devStats=null;
const detected=detectQuality(renderer);
setQuality(detected.preset,detected.reason==='url'?'manual':'auto');monitor.auto=detected.reason!=='url';
applyArt();renderer.shadowMap.needsUpdate=true;
renderer.compile(scene,camera);$('loading').remove();requestAnimationFrame(render);
// Back from a hidden tab: drop the missed time so nothing jumps.
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;lastFrame=null;playground.resync();panVel.set(0,0,0);zoomVel=0;needsRender=true;});

// The page shows only the scene and the vehicle concepts: no toolbar, Workbench
// or captions. The breeze stays on (unless reduced motion is requested).
for(const b of document.querySelectorAll('[data-drive]')){
  const k=b.dataset.drive;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);car.press(k,true);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>car.press(k,false));
}

// The vehicle is hardcoded: the City car.
car.select(VEHICLES.findIndex(v=>v.name==='City'));

// Deliberately small inspection API for performance checks and future tiles.
window.forestTile={car,playground,campus,grid:{GRID,HOME_NUMBER,tileNumber,tileCenter},composer,ao,art,applyArt,setQuality,get quality(){return {name:qualityName,mode:qualityMode,scale:renderScale,pixelRatio:renderer.getPixelRatio()};},spec:TILE_SPEC,art:ART,scene,camera,renderer,materials,canopies,refresh:()=>{needsRender=true;renderer.shadowMap.needsUpdate=true;},stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,footprint:TILE_SPEC.footprint})};

// Development benchmark: runs n full animated frames (breeze, car, shadows,
// composer) back to back, each synced with a 1 px read so GPU time is included.
if(import.meta.env.DEV){
  // Drive the camera by hand in tests: one view update of dt seconds.
  window.forestTile.view={update:updateView,target,get trauma(){return trauma;},get zoom(){return camera.zoom;}};
  window.forestTile.bench=(n=120)=>{
    const gl=renderer.getContext(),px=new Uint8Array(4),times=[];let t=performance.now();
    for(let i=0;i<n;i++){
      const t0=performance.now();t+=1000/60;
      animateTile?.(t);for(const c of canopies){const ph=c.userData.phase;c.rotation.z=Math.sin(t*.00065+ph)*ART.vegetation.sway;}
      car.update(t);playground.update(1/60);updateView(1/60);renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();
      gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);times.push(performance.now()-t0);
    }
    times.sort((a,b)=>a-b);const mean=times.reduce((a,b)=>a+b,0)/n;
    return {frames:n,meanMs:+mean.toFixed(2),p50:+times[n>>1].toFixed(2),p95:+times[Math.floor(n*.95)].toFixed(2),max:+times[n-1].toFixed(2),
      drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
      canvas:[renderer.domElement.width,renderer.domElement.height],pixelRatio:renderer.getPixelRatio()};
  };
}

// Developer panel and live stats: development builds only (removed from production).
if(import.meta.env.DEV){
  import('./dev/panel.js').then(({mountDevPanel})=>{
    devStats=mountDevPanel({art,applyArt,renderer,scene,materials,meadow,canopies,
      getQuality:()=>({name:qualityName,mode:qualityMode,scale:renderScale}),
      setQuality:(name)=>{if(name==='auto'){monitor.auto=true;setQuality(detectQuality(renderer).preset,'auto');}else{monitor.auto=false;setQuality(name,'manual');}},
      setScale:s=>{renderScale=s;resize();},setDecor:d=>{decorDensity=d;for(const l of meadow.layers)setDensity(l,quality.decor*d);needsRender=true;},
      setTimeScale:t=>{timeScale=t;},refresh:()=>{needsRender=true;renderer.shadowMap.needsUpdate=true;}});
  });
}

if(import.meta.hot)import.meta.hot.dispose(()=>{
  scene.traverse(o=>{o.geometry?.dispose();});for(const mat of Object.values(materials))mat.dispose();scene.environment?.dispose();composer.dispose();renderer.dispose();
});
