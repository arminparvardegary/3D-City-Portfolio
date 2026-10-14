import './style.css';
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { ART, TILE_SPEC } from './config.js';
import { createMaterials } from './materials.js';
import { buildTile } from './tile.js';
import { softenShadows, setShadowTaps } from './shadows.js';
import { PRESETS, ORDER, detectQuality, FrameMonitor } from './quality.js';
import { LIGHTING, createLights, createEnvironment, applyLighting } from './world/lighting.js';
import { wind, setDensity } from './world/vegetation.js';
import { buildGrid, GRID, HOME_NUMBER, tileNumber, tileCenter } from './world/grid.js';
import { VEHICLES } from './vehicles.js';

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
renderer.domElement.setAttribute('aria-label','My House: a minimal cream house with a coral roof, a little blue car in the parking space, and a small Turkish flag on a 100 by 100 design-pixel tile.');
renderer.domElement.setAttribute('role','img');
viewport.appendChild(renderer.domElement);

const scene=new THREE.Scene();
// Fixed isometric angle. The camera can pan over the map and zoom, but never rotates;
// it sits far back so the whole 150 tile map fits between the clip planes.
const camera=new THREE.OrthographicCamera(-10,10,8,-8,1,400);
const target=new THREE.Vector3(...ART.camera.target);
const az=THREE.MathUtils.degToRad(ART.camera.azimuth),el=THREE.MathUtils.degToRad(ART.camera.elevation);
const viewDir=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
const CAMERA_DISTANCE=160;
function placeCamera(){camera.position.copy(target).addScaledVector(viewDir,CAMERA_DISTANCE);camera.lookAt(target);}
placeCamera();

const art=structuredClone(LIGHTING.daylight);
art.fog.enabled=false;   // a 150 tile map: every tile should read the same
const lights=createLights(scene),{sky,sun,fill}=lights;
scene.environment=createEnvironment(renderer);
const materials=createMaterials();
Object.values(materials).forEach(softenShadows);
const {group:tile,canopies,animate:animateTile,car,meadow,extraMaterials=[]}=buildTile(materials);scene.add(tile);
extraMaterials.forEach(softenShadows);
const grid150=buildGrid(softenShadows);scene.add(grid150.group);
car.setBounds(grid150.bounds);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:'#76806a',opacity:.21}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
softenShadows(floor.material);

// A low-frequency contact shadow anchors the base without adding geometry.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=256;
const ctx=shadowCanvas.getContext('2d');ctx.filter='blur(13px)';ctx.fillStyle='#485035';ctx.fillRect(30,30,196,196);
const contact=new THREE.Mesh(new THREE.PlaneGeometry(12.5,12.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,opacity:.18,depthWrite:false,toneMapped:false}));
contact.rotation.x=-Math.PI/2;contact.position.y=-.009;contact.material.opacity=.08;contact.renderOrder=1;scene.add(contact);

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
composer.addPass(new EffectPass(camera,toneMapping));
const TONE={neutral:ToneMappingMode.NEUTRAL,agx:ToneMappingMode.AGX,aces:ToneMappingMode.ACES_FILMIC};
function applyArt(){
  applyLighting(art,lights,scene);if(typeof placeSun==='function')placeSun();
  renderer.toneMappingExposure=art.exposure;toneMapping.mode=TONE[art.toneMapping]??ToneMappingMode.NEUTRAL;
  Object.assign(ao.configuration,{intensity:art.ao.intensity,aoRadius:art.ao.radius,distanceFalloff:art.ao.falloff});ao.configuration.color.set(art.ao.color);
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
let zoom=1,breeze=ART.vegetation.breeze,needsRender=true,hidden=document.hidden;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
if(reducedMotion.matches)breeze=false;

function resize(){
  const {width,height}=viewport.getBoundingClientRect();
  const aspect=width/height;
  // Keep the entire tile visible on portrait devices while retaining a large
  // inspection view on desktop. Zoom never changes camera orientation.
  const frustum=Math.max(ART.camera.viewHeight,16.8/aspect);
  camera.left=-frustum*aspect/2;camera.right=frustum*aspect/2;camera.top=frustum/2;camera.bottom=-frustum/2;camera.zoom=zoom;
  camera.updateProjectionMatrix();fitShadow();
  // Sharp on high density screens, capped by the preset, scaled down only by the monitor.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,quality.maxDpr)*renderScale);
  renderer.setSize(width,height);composer.setSize(width,height);
  renderer.shadowMap.needsUpdate=true;needsRender=true;
}
new ResizeObserver(resize).observe(viewport);

// --- View: drag to pan, wheel or pinch to zoom, and a smooth follow of the car.
// The angle never changes. While the car is driven the view eases toward it
// (with a little look-ahead); a pan holds the view for a moment before follow resumes.
let zoomGoal=1,followHold=0;const ZOOM_MIN=.08,ZOOM_MAX=2.2;
const groundRight=new THREE.Vector3(Math.cos(az),0,-Math.sin(az)),groundUp=new THREE.Vector3(-Math.sin(az),0,-Math.cos(az)).multiplyScalar(1/Math.sin(el));
const pointers=new Map();let pinch=0;
const canvasEl=renderer.domElement;canvasEl.style.touchAction='none';
canvasEl.addEventListener('pointerdown',e=>{canvasEl.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);});
canvasEl.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);if(!p)return;
  if(pointers.size===2){const [a,b]=[...pointers.values()];const d0=Math.hypot(a[0]-b[0],a[1]-b[1]);pointers.set(e.pointerId,[e.clientX,e.clientY]);const [c,d]=[...pointers.values()];const d1=Math.hypot(c[0]-d[0],c[1]-d[1]);if(d0>0)zoomGoal=THREE.MathUtils.clamp(zoomGoal*d1/d0,ZOOM_MIN,ZOOM_MAX);return;}
  const dx=e.clientX-p[0],dy=e.clientY-p[1];pointers.set(e.pointerId,[e.clientX,e.clientY]);
  const unitsPerPx=(camera.top-camera.bottom)/camera.zoom/canvasEl.clientHeight;
  target.addScaledVector(groundRight,-dx*unitsPerPx).addScaledVector(groundUp,-dy*unitsPerPx);
  followHold=2.5;placeCamera();placeSun();needsRender=true;
});
for(const ev of ['pointerup','pointercancel'])canvasEl.addEventListener(ev,e=>pointers.delete(e.pointerId));
canvasEl.addEventListener('wheel',e=>{e.preventDefault();zoomGoal=THREE.MathUtils.clamp(zoomGoal*Math.exp(-e.deltaY*.0015),ZOOM_MIN,ZOOM_MAX);},{passive:false});
const followTo=new THREE.Vector3();
function updateView(dt){
  let moved=false;
  if(Math.abs(zoomGoal-zoom)>1e-4){zoom+=(zoomGoal-zoom)*(1-Math.exp(-dt*10));camera.zoom=zoom;camera.updateProjectionMatrix();fitShadow();moved=true;}
  followHold=Math.max(0,followHold-dt);
  const p=car.pose();
  if(followHold===0&&(Math.abs(p.v)>.05||target.distanceToSquared(followTo.set(p.x,target.y,p.z))>.02)){
    // Ease toward the car plus a short look-ahead along its motion.
    followTo.set(p.x+Math.sin(p.h)*p.v*.35,target.y,p.z+Math.cos(p.h)*p.v*.35);
    target.lerp(followTo,1-Math.exp(-dt*3.2));placeCamera();placeSun();moved=true;
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
let timeScale=1,animClock=0,lastFrame=0;
function render(time=0){
  requestAnimationFrame(render);
  if(hidden){lastFrame=time;return;}
  const frameDt=Math.min(100,time-lastFrame);lastFrame=time;
  let animating=false;
  if(breeze){
    animClock+=frameDt*timeScale;wind.time.value=animClock/1000;
    animateTile?.(animClock);
    for(const canopy of canopies){const phase=canopy.userData.phase;canopy.rotation.z=Math.sin(animClock*.00065+phase)*ART.vegetation.sway;canopy.rotation.x=Math.cos(animClock*.00048+phase)*ART.vegetation.sway*.6;}
    animating=true;renderer.shadowMap.needsUpdate=true;
  }
  // The car is driven by the visitor, so it keeps running even with the breeze paused.
  if(car.update(time)){animating=true;renderer.shadowMap.needsUpdate=true;}
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
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;needsRender=true;});

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
window.forestTile={car,grid:{GRID,HOME_NUMBER,tileNumber,tileCenter},composer,ao,art,applyArt,setQuality,get quality(){return {name:qualityName,mode:qualityMode,scale:renderScale,pixelRatio:renderer.getPixelRatio()};},spec:TILE_SPEC,art:ART,scene,camera,renderer,materials,tile,canopies,refresh:()=>{needsRender=true;renderer.shadowMap.needsUpdate=true;},stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,footprint:TILE_SPEC.footprint})};

// Development benchmark: runs n full animated frames (breeze, car, shadows,
// composer) back to back, each synced with a 1 px read so GPU time is included.
if(import.meta.env.DEV){
  window.forestTile.bench=(n=120)=>{
    const gl=renderer.getContext(),px=new Uint8Array(4),times=[];let t=performance.now();
    for(let i=0;i<n;i++){
      const t0=performance.now();t+=1000/60;
      animateTile?.(t);for(const c of canopies){const ph=c.userData.phase;c.rotation.z=Math.sin(t*.00065+ph)*ART.vegetation.sway;}
      car.update(t);renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();
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
