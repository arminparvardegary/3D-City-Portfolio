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
import { VEHICLES, buildVehicle, disposeVehicle } from './vehicles.js';

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
const camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,100);
const target=new THREE.Vector3(...ART.camera.target);
const az=THREE.MathUtils.degToRad(ART.camera.azimuth),el=THREE.MathUtils.degToRad(ART.camera.elevation);
camera.position.copy(target).add(new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(30));
camera.lookAt(target);

const art=structuredClone(LIGHTING.daylight);
const lights=createLights(scene),{sky,sun,fill}=lights;
scene.environment=createEnvironment(renderer);
const materials=createMaterials();
Object.values(materials).forEach(softenShadows);
const {group:tile,canopies,animate:animateTile,car,meadow,extraMaterials=[]}=buildTile(materials);scene.add(tile);
extraMaterials.forEach(softenShadows);
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
  applyLighting(art,lights,scene);
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
let zoom=1,breeze=ART.vegetation.breeze,needsRender=true,hidden=document.hidden,lastTime=0,noticeTimer;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
if(reducedMotion.matches)breeze=false;

function resize(){
  const {width,height}=viewport.getBoundingClientRect();
  const aspect=width/height;
  // Keep the entire tile visible on portrait devices while retaining a large
  // inspection view on desktop. Zoom never changes camera orientation.
  const frustum=Math.max(ART.camera.viewHeight,16.8/aspect);
  camera.left=-frustum*aspect/2;camera.right=frustum*aspect/2;camera.top=frustum/2;camera.bottom=-frustum/2;camera.zoom=zoom;
  camera.updateProjectionMatrix();
  // Sharp on high density screens, capped by the preset, scaled down only by the monitor.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,quality.maxDpr)*renderScale);
  renderer.setSize(width,height);composer.setSize(width,height);
  renderer.shadowMap.needsUpdate=true;needsRender=true;
}
new ResizeObserver(resize).observe(viewport);
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

function notify(message){$('notice').textContent=message;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),2400);}
function updateZoom(value){zoom=THREE.MathUtils.clamp(value,.75,1.45);$('zoom-label').textContent=`${Math.round(zoom*100)}%`;$('zoom-out').disabled=zoom<=.75;$('zoom-in').disabled=zoom>=1.45;resize();}
$('zoom-in').onclick=()=>updateZoom(zoom+.1);$('zoom-out').onclick=()=>updateZoom(zoom-.1);$('zoom-reset').onclick=()=>updateZoom(1);
function updateBreeze(){const b=$('breeze-toggle');b.classList.toggle('is-active',breeze);b.setAttribute('aria-pressed',String(breeze));b.setAttribute('aria-label',breeze?'Pause breeze':'Play breeze');b.title=breeze?'Pause breeze':'Play breeze';needsRender=true;}
$('breeze-toggle').onclick=()=>{breeze=!breeze;updateBreeze();};updateBreeze();
function showSettings(open){$('settings').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));$('settings-toggle').classList.toggle('is-active',open);}
$('settings-toggle').onclick=()=>showSettings($('settings').hidden);$('settings-close').onclick=()=>showSettings(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){showSettings(false);$('settings-toggle').focus();}});
function updateLight(){const value=Number($('light').value);sun.intensity=art.sun.intensity*value;sky.intensity=art.sky.intensity*(.75+value*.25);$('light-value').value=value.toFixed(1);needsRender=true;}
function updateCanopy(){const value=Number($('canopy').value);for(const c of canopies)c.scale.setScalar(value);$('canopy-value').value=value.toFixed(2);renderer.shadowMap.needsUpdate=true;needsRender=true;}
function updateRoughness(){const value=Number($('roughness').value);for(const [name,mat] of Object.entries(materials)){if(!['window','gold'].includes(name))mat.roughness=value;}$('roughness-value').value=value.toFixed(2);needsRender=true;}
$('light').oninput=updateLight;$('canopy').oninput=updateCanopy;$('roughness').oninput=updateRoughness;
function updateColors(){materials.ground.color.set($('grass-color').value);materials.grass.color.copy(materials.ground.color);meadow.grassMaterial?.color.copy(materials.ground.color);materials.leaves.color.set($('leaf-color').value);materials.leafTips.color.copy(materials.leaves.color).lerp(new THREE.Color('#d2cb76'),.32);materials.roof.color.set($('roof-color').value);car.paint.color.set($('car-color').value);needsRender=true;}
for(const id of ['grass-color','leaf-color','roof-color','car-color'])$(id).oninput=updateColors;
$('grid-toggle').onchange=()=>{grid.visible=$('grid-toggle').checked;needsRender=true;if(grid.visible)notify('10 divisions × 10 design pixels = 100 × 100');};
$('reset-style').onclick=()=>{
  $('light').value=1;$('canopy').value=1;$('roughness').value=ART.material.roughness;$('grass-color').value=ART.palette.grass;$('leaf-color').value=ART.palette.leaves;$('roof-color').value=ART.palette.roof;$('car-color').value=car.color;
  car.reset();updateLight();updateCanopy();updateRoughness();updateColors();$('grid-toggle').checked=false;grid.visible=false;updateZoom(1);notify('Original house style restored.');
};
$('save-render').onclick=()=>{
  composer.render();  // drawn and copied in the same task, so no preserved buffer is neededconst image=document.createElement('canvas');image.width=renderer.domElement.width;image.height=renderer.domElement.height;
  const context=image.getContext('2d');context.fillStyle=ART.palette.background;context.fillRect(0,0,image.width,image.height);context.drawImage(renderer.domElement,0,0);
  image.toBlob(blob=>{if(!blob){notify('Could not save this view. Please try again.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='my-house-tile.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Your house tile, saved.');},'image/png');
};

for(const b of document.querySelectorAll('[data-drive]')){
  const k=b.dataset.drive;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);car.press(k,true);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>car.press(k,false));
}
$('park-car').onclick=()=>{car.reset();needsRender=true;renderer.shadowMap.needsUpdate=true;notify('Parked.');};

// The numbered vehicle list: a small rendered thumbnail of each, click to drive it.
function thumbnails(){
  const w=150,h=90,r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  r.setPixelRatio(2);r.setSize(w,h);r.toneMapping=THREE.NeutralToneMapping;r.outputColorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Scene();s.add(new THREE.HemisphereLight('#ffffff','#bbc6b5',1.9));const d=new THREE.DirectionalLight('#fffaf1',2.6);d.position.set(-3.5,9,6);s.add(d);
  const cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,100),box=new THREE.Box3(),c=new THREE.Vector3(),size=new THREE.Vector3();
  const urls=VEHICLES.map((_,i)=>{
    const g=new THREE.Group();s.add(g);const parts=buildVehicle(i,g,materials);parts.rig.position.set(0,0,0);
    box.setFromObject(g);box.getCenter(c);box.getSize(size);
    cam.position.copy(c).add(new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(30));cam.lookAt(c);
    const half=Math.max(size.x,size.z)*.62;cam.left=-half*w/h;cam.right=half*w/h;cam.top=half;cam.bottom=-half;cam.updateProjectionMatrix();
    r.render(s,cam);const url=r.domElement.toDataURL('image/png');disposeVehicle(parts,materials);g.removeFromParent();return url;
  });
  r.dispose();r.forceContextLoss();return urls;
}
const list=$('vehicles');
VEHICLES.forEach((v,i)=>{
  const li=document.createElement('li'),b=document.createElement('button');
  b.type='button';b.dataset.index=i;b.setAttribute('aria-label',`${i+1}. ${v.name}`);
  b.innerHTML=`<span class="v-num">${i+1}</span><img alt="" width="60" height="36"/><span class="v-name">${v.name}</span>`;
  b.onclick=()=>chooseVehicle(i);li.append(b);list.append(li);
});
function chooseVehicle(i){
  car.select(i);$('car-color').value=car.color;
  for(const b of list.querySelectorAll('button'))b.setAttribute('aria-current',String(+b.dataset.index===i));
  needsRender=true;renderer.shadowMap.needsUpdate=true;
}
chooseVehicle(0);
// Thumbnails are rendered after the first frame, when the browser is idle, so
// they never delay the scene appearing.
(window.requestIdleCallback||(f=>setTimeout(f,200)))(()=>{const urls=thumbnails();list.querySelectorAll('img').forEach((im,i)=>im.src=urls[i]);},{timeout:1500});

// Deliberately small inspection API for performance checks and future tiles.
window.forestTile={car,composer,ao,art,applyArt,setQuality,get quality(){return {name:qualityName,mode:qualityMode,scale:renderScale,pixelRatio:renderer.getPixelRatio()};},spec:TILE_SPEC,art:ART,scene,camera,renderer,materials,tile,canopies,refresh:()=>{needsRender=true;renderer.shadowMap.needsUpdate=true;},stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,footprint:TILE_SPEC.footprint})};

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
