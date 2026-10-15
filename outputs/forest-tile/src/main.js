import './style.css';
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, ToneMappingEffect, ToneMappingMode, HueSaturationEffect, BloomEffect } from 'postprocessing';
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
import { createIntro } from './ui/intro.js';
import { startAnalytics, track } from './analytics.js';
startAnalytics();
import { buildNYCWorld } from './nyc/world.js';
import { createStory } from './world/story.js';
import { JOBS, PROFILE } from './data/profile.js';
import { createAudio } from './audio.js';
import { VEHICLES } from './vehicles.js';
import { FEEL, damp, dampAngle, spring } from './motion.js';

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
renderer.domElement.setAttribute('aria-label','A low poly New York you drive through: Armin\'s Experience Row with a parking lot, Skills Street and the city\'s landmarks. Drive with the arrow keys or WASD; park at Experience Row and press Enter.');
renderer.domElement.setAttribute('role','img');
viewport.appendChild(renderer.domElement);

const scene=new THREE.Scene();
// Fixed isometric angle. The camera can pan over the map and zoom, but never rotates;
// it sits far back so the whole map fits between the clip planes.
// New York is driven from behind the car (a chase camera, like a racing game);
// the campus keeps the fixed isometric view.
const WORLD=new URLSearchParams(location.search).get('world')==='campus'?'campus':'nyc',CHASE=WORLD==='nyc';
const camera=CHASE?new THREE.PerspectiveCamera(FEEL.chase.fov,1,.1,700):new THREE.OrthographicCamera(-10,10,8,-8,1,400);
const target=new THREE.Vector3(...ART.camera.target);
// The view looks from one of four corners (azimuth); it turns only to keep the car in sight.
const HOME_AZ=THREE.MathUtils.degToRad(ART.camera.azimuth),el=THREE.MathUtils.degToRad(ART.camera.elevation);
let az=HOME_AZ;
const viewDir=new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
const CAMERA_DISTANCE=160;
function placeCamera(){if(CHASE)return;camera.position.copy(target).addScaledVector(viewDir,CAMERA_DISTANCE);camera.lookAt(target);}
placeCamera();

// The world: low poly New York (default) or the white campus (?world=campus).
const art=structuredClone(WORLD==='nyc'?THEME.nyc.light:LIGHTING.storybook);
art.fog.enabled=CHASE;   // the chase view looks far: the city fades softly into the sky
const lights=createLights(scene),{sun}=lights;
scene.environment=createEnvironment(renderer,art);
const materials=createMaterials();
Object.values(materials).forEach(softenShadows);
// --- The map: a square of 9 x 9 numbered tiles (81) ------------------------------
// The numbered tiles show only with ?tiles; normally the playground floor is the map.
const tileGrid=buildGrid(softenShadows);if(new URLSearchParams(location.search).has('tiles'))scene.add(tileGrid.group);
let carRef=null;   // the world's traffic watches your car (set once the car exists)
const world=WORLD==='nyc'?buildNYCWorld({prep:softenShadows,materials,player:()=>carRef?.shown??null}):buildCampus({prep:softenShadows});scene.add(world.group);
const tb=tileGrid.bounds,bounds=world.bounds??{x0:tb.x0+.4,x1:tb.x1-.4,z0:tb.z0+.4,z1:tb.z1-.4};
const skyTint=WORLD==='nyc'?THEME.nyc.sky:THEME.sky;
document.documentElement.style.setProperty('--sky-top',skyTint.top);document.documentElement.style.setProperty('--sky-horizon',skyTint.horizon);
// Your car: blocked by the world's solids (sidewalks, plinths, the river) and its traffic.
const CAR_MODEL=world.vehicle??'City';
const car=createCarControls(scene,materials,{prep:softenShadows,index:VEHICLES.findIndex(v=>v.name===CAR_MODEL),home:world.start??{x:0,z:0,h:Math.PI/2}});
car.setBounds(bounds);car.addStatic([],world.solids);car.paint.color.set(world.carColor??THEME.campus.car);
if(world.obstacles)car.setObstacles(world.obstacles);
carRef=car;if(world.surface)car.setSurface(world.surface);if(world.circles)car.addStatic(world.circles);
// Physics toys belong to the campus only.
const playground=WORLD==='campus'?createPlayground({scene,prep:softenShadows,car,bounds:tb,solids:world.solids}):null;
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
// A gentle bloom: only the brightest highlights (lamps, sun glints) glow, as on film.
const bloom=new BloomEffect({luminanceThreshold:.62,luminanceSmoothing:.25,intensity:.35,mipmapBlur:true,radius:.75});
composer.addPass(new EffectPass(camera,bloom,toneMapping,saturation));
const TONE={neutral:ToneMappingMode.NEUTRAL,agx:ToneMappingMode.AGX,aces:ToneMappingMode.ACES_FILMIC};
function applyArt(){
  applyLighting(art,lights,scene);if(typeof placeSun==='function')placeSun();
  renderer.toneMappingExposure=art.exposure;toneMapping.mode=TONE[art.toneMapping]??ToneMappingMode.NEUTRAL;
  Object.assign(ao.configuration,{intensity:art.ao.intensity,aoRadius:art.ao.radius,distanceFalloff:art.ao.falloff});ao.configuration.color.set(art.ao.color);
  if(art.grade)saturation.saturation=art.grade.saturation;
  bloom.intensity=art.bloom??0;
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
// New York keeps one zoom, close on the car; the campus can be zoomed.
const FIXED=!!world.fixedZoom;
let zoom=world.zoom??.55,breeze=ART.vegetation.breeze,needsRender=true,hidden=document.hidden;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
if(reducedMotion.matches)breeze=false;

function resize(){
  const {width,height}=viewport.getBoundingClientRect();
  const aspect=width/height;
  // Keep the entire tile visible on portrait devices while retaining a large
  // inspection view on desktop. Zoom never changes camera orientation.
  if(CHASE)camera.aspect=aspect;
  else{const frustum=Math.max(ART.camera.viewHeight,16.8/aspect);
    camera.left=-frustum*aspect/2;camera.right=frustum*aspect/2;camera.top=frustum/2;camera.bottom=-frustum/2;camera.zoom=zoom*speedZoom;}
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
const panVel=new THREE.Vector3(),camX={x:target.x,v:0},camZ={x:target.z,v:0},BASE_Y=target.y,camY={x:target.y,v:0};
const groundRight=new THREE.Vector3(Math.cos(az),0,-Math.sin(az)),groundUp=new THREE.Vector3(-Math.sin(az),0,-Math.cos(az)).multiplyScalar(1/Math.sin(el));
const screenUp=new THREE.Vector3().crossVectors(groundRight,viewDir).normalize();
function setAzimuth(a){az=a;viewDir.set(Math.sin(a)*Math.cos(el),Math.sin(el),Math.cos(a)*Math.cos(el));groundRight.set(Math.cos(a),0,-Math.sin(a));
  groundUp.set(-Math.sin(a),0,-Math.cos(a)).multiplyScalar(1/Math.sin(el));screenUp.crossVectors(groundRight,viewDir).normalize();}
// Look around tall buildings: when one hides the car for a moment, turn smoothly to
// the nearest of the four corners where the car is in clear view; come back to the
// home corner once that is clear again for a while.
let azGoal=HOME_AZ,hiddenFor=0,homeClear=0,viewCheck=0;
const sight=new THREE.Ray(),sightDir=new THREE.Vector3();
function inSight(a,p){
  if(!world.occluders)return true;sightDir.set(Math.sin(a)*Math.cos(el),Math.sin(el),Math.cos(a)*Math.cos(el));
  for(const lift of [.5,1.3]){sight.origin.set(p.x,(p.y??.12)+lift,p.z);sight.direction.copy(sightDir);
    for(const b of world.occluders)if(sight.intersectsBox(b))return false;}
  return true;
}
function chooseView(p,dt){
  if(story?.active){azGoal=HOME_AZ;return;}
  hiddenFor=inSight(azGoal,p)?0:hiddenFor+dt;
  if(hiddenFor>=.3){hiddenFor=0;
    const options=[1,-1,2].map(k=>azGoal+k*Math.PI/2);for(const a of options)if(inSight(a,p)){azGoal=a;break;}}
  if(Math.abs(Math.atan2(Math.sin(azGoal-HOME_AZ),Math.cos(azGoal-HOME_AZ)))>.01){homeClear=inSight(HOME_AZ,p)?homeClear+dt:0;if(homeClear>1.5){azGoal=HOME_AZ;homeClear=0;}}
}
const pointers=new Map();let lastMove=0;
const canvasEl=renderer.domElement;canvasEl.style.touchAction='none';
const syncFollow=()=>{camX.x=target.x;camZ.x=target.z;camX.v=panVel.x;camZ.v=panVel.z;};
let pressAt=null;
canvasEl.addEventListener('pointerdown',e=>{try{canvasEl.setPointerCapture(e.pointerId);}catch{}pointers.set(e.pointerId,[e.clientX,e.clientY,e.timeStamp]);panVel.set(0,0,0);zoomVel=0;pressAt=pointers.size===1?[e.clientX,e.clientY]:null;});
canvasEl.addEventListener('pointermove',e=>{
  const p=pointers.get(e.pointerId);if(!p){hover(e);return;}
  const dt=Math.max(.004,(e.timeStamp-p[2])/1000);
  if(pointers.size===2){
    if(FIXED)return;
    const [a,b]=[...pointers.values()],d0=Math.hypot(a[0]-b[0],a[1]-b[1]);pointers.set(e.pointerId,[e.clientX,e.clientY,e.timeStamp]);
    const [c,d]=[...pointers.values()],d1=Math.hypot(c[0]-d[0],c[1]-d[1]);
    if(d0>0){const k=Math.log(d1/d0);zoom=THREE.MathUtils.clamp(zoom*Math.exp(k),ZOOM_MIN,ZOOM_MAX);zoomVel=damp(zoomVel,k/dt,20,dt);}
    return;
  }
  const dx=e.clientX-p[0],dy=e.clientY-p[1];pointers.set(e.pointerId,[e.clientX,e.clientY,e.timeStamp]);
  if(CHASE){lookYaw-=dx*.006;lookPitch=THREE.MathUtils.clamp(lookPitch+dy*.004,-.12,.6);looking=true;return;}   // drag looks around the car
  if(FIXED)return;   // the view stays on the car
  const unitsPerPx=(camera.top-camera.bottom)/camera.zoom/canvasEl.clientHeight;
  const wx=(-dx*groundRight.x-dy*groundUp.x)*unitsPerPx,wz=(-dx*groundRight.z-dy*groundUp.z)*unitsPerPx;
  target.x+=wx;target.z+=wz;
  // Pan speed, smoothed, so a flick glides on after release.
  panVel.x=damp(panVel.x,wx/dt,20,dt);panVel.z=damp(panVel.z,wz/dt,20,dt);lastMove=e.timeStamp;
  syncFollow();followHold=2.5;focus=null;needsRender=true;
});
for(const ev of ['pointerup','pointercancel'])canvasEl.addEventListener(ev,e=>{
  looking=false;
  // A tap (no drag) on a building or its label opens it.
  if(ev==='pointerup'&&pressAt&&pointers.size===1&&Math.hypot(e.clientX-pressAt[0],e.clientY-pressAt[1])<6){const id=pick(e);if(id){panVel.set(0,0,0);openPlace(id);}}
  pressAt=null;pointers.delete(e.pointerId);
  if(e.timeStamp-lastMove>80)panVel.set(0,0,0);   // held still before letting go: no glide
  if(pointers.size)panVel.set(0,0,0);
});
canvasEl.addEventListener('wheel',e=>{e.preventDefault();if(FIXED)return;zoomVel+=-e.deltaY*.0015*F.zoomGlide;},{passive:false});
// --- Places: click a building or label, or pick from the Experience list ------
// The camera glides to the place and holds there until you drive again.
let focus=null;
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),WORLD==='nyc'?-.78:-.47),hitPoint=new THREE.Vector3();
function pick(e){
  const r=canvasEl.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObjects(world.labels,false)[0];if(hit)return hit.object.userData.id;
  return ray.ray.intersectPlane(floorPlane,hitPoint)?world.placeAt(hitPoint.x,hitPoint.z):null;
}
function hover(e){if(e.pointerType==='mouse')canvasEl.style.cursor=pick(e)?'pointer':'';}
function focusOn(id){const q=world.places[id];if(!q)return;focus={x:q.x,z:q.z,y:q.y??BASE_Y,dist:q.dist,zoom:FIXED?zoom:THREE.MathUtils.clamp(zoom,.5,.75)};followHold=0;needsRender=true;}
// The city has no Experience list for now (experience and skills are off).
const experience=WORLD==='nyc'?{open(){},close(){},first:null,get isOpen(){return false;}}:createExperience({onSelect:focusOn});
// The Work tower opens the timeline at the newest job.
function openPlace(id){experience.open(id==='work'?experience.first:id);}
if(WORLD==='nyc')createIntro({onPlace:focusOn});

// --- Experience story: park in a bay at Experience Row and press Enter ------------
const story=world.lot?createStory({scene,row:world.row,lot:world.lot,jobs:JOBS,profile:PROFILE,
  onFocus:(x,y,z)=>{focus={x,z,y,zoom};followHold=0;needsRender=true;},
  onExit:()=>{car.lock(false);focus=null;needsRender=true;}}):null;
const prompt=document.createElement('button');prompt.className='park-prompt';prompt.hidden=true;
prompt.innerHTML='<kbd>Enter</kbd><span>See my experience</span>';document.querySelector('.scene').append(prompt);
let parkedAt=null;
// The bay the car is stopped in, or null.
function parkedBay(){const L=world.lot,p=car.pose();if(Math.abs(p.v)>.4||p.z<L.bayZ[0]||p.z>L.bayZ[1])return null;return L.bays.find(b=>p.x>b.x0&&p.x<b.x1)?.id??null;}
function startStory(){if(!story||story.active||!parkedAt)return;track('open_experience',{company:parkedAt});audio.ui.open();car.lock(true);experience.close();prompt.hidden=true;story.start(parkedAt);}
prompt.onclick=startStory;
addEventListener('keydown',e=>{if(e.key==='Enter'&&!prompt.hidden&&!e.repeat){e.preventDefault();startStory();}});

// Sound: engine, tyres, wind, horn (H), the city round you; M or the button mutes.
const audio=createAudio({car,world,maxSpeed:()=>FEEL.car.maxSpeed});
// Night driving: two warm headlight beams that light the road ahead.
if(CHASE){const beam=new THREE.SpotLight('#ffd7a1',60,38,.42,.55,1.3);beam.position.set(0,.75,1.7);beam.target.position.set(0,0,14);car.rig.add(beam,beam.target);}
car.onHit=s=>{audio.hit(s);if(!reducedMotion.matches&&s>.2)trauma=Math.min(1,trauma+s*.8);};
addEventListener('keydown',e=>{if(story?.active&&/^Arrow/.test(e.key))audio.ui.step();});

let holdCamera=false;   // dev: keep the camera where a test put it
function updateView(dt){
  if(holdCamera)return true;
  if(CHASE)return chaseView(dt);
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
  const zGoal=FIXED?1:1-F.speedZoomOut*Math.min(1,p.speed/FEEL.car.maxSpeed);
  if(Math.abs(zGoal-speedZoom)>1e-4)speedZoom=damp(speedZoom,zGoal,2.2,dt);
  // Spring follow toward the car plus a look-ahead along its velocity.
  if(focus&&Math.abs(zoomVel)<1e-3&&Math.abs(zoom-focus.zoom)>1e-3){zoom=damp(zoom,focus.zoom,3,dt);moved=true;}
  if(focus||followHold===0){
    const gx=focus?focus.x:p.x+p.vx*F.lookAhead,gz=focus?focus.z:p.z+p.vz*F.lookAhead;
    if(Math.abs(gx-camX.x)+Math.abs(gz-camZ.x)>1e-4||Math.abs(camX.v)+Math.abs(camZ.v)>1e-4){
      target.x=spring(camX,gx,F.follow,dt);target.z=spring(camZ,gz,F.follow,dt);moved=true;
    }
  }
  viewCheck+=dt;if(viewCheck>=.1){chooseView(p,viewCheck);viewCheck=0;}
  if(Math.abs(Math.atan2(Math.sin(azGoal-az),Math.cos(azGoal-az)))>1e-4){setAzimuth(dampAngle(az,azGoal,2.2,dt));moved=true;}
  // Height: up to a place being shown, back down to the street after.
  const gy=focus?.y??BASE_Y;
  if(Math.abs(gy-camY.x)>1e-4||Math.abs(camY.v)>1e-4){target.y=spring(camY,gy,F.follow*1.4,dt);moved=true;}
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
// --- Chase camera (New York) ----------------------------------------------------
// Behind the car and a little above, looking over it toward where it is going.
// The camera's heading follows the car's with a short lag, so it swings out in
// turns; it pulls back and the field of view widens with speed. If a building
// comes between the car and the camera, the camera slides in along the line so
// the car stays in view. A drag looks around and springs back on release. When a
// place is being shown (the experience story, the Experience list), the camera
// glides to face it and comes back behind the car when you drive off.
let chaseYaw=null,lookYaw=0,lookPitch=0,looking=false,fov=FEEL.chase.fov;
const eyeS=[{x:0,v:0},{x:0,v:0},{x:0,v:0}],lookS=[{x:0,v:0},{x:0,v:0},{x:0,v:0}];
const eye=new THREE.Vector3(),look=new THREE.Vector3(),pull=new THREE.Ray(),hit=new THREE.Vector3(),camRight=new THREE.Vector3(),camUp=new THREE.Vector3();
function chaseView(dt){
  const C=FEEL.chase,p=car.shown,py=p.y??.12;
  if(focus&&p.speed>.6)focus=null;
  if(chaseYaw===null)chaseYaw=p.h;
  if(focus){const fd=focus.dist??16;look.set(focus.x,focus.y??4,focus.z-3);eye.set(focus.x+2.5*fd/16,(focus.y??4)+4.5*fd/16,focus.z+fd);}
  else{
    chaseYaw=dampAngle(chaseYaw,p.h,C.turnLag*(1+p.speed*.05),dt);
    if(!looking){lookYaw=damp(lookYaw,0,2.4,dt);lookPitch=damp(lookPitch,0,2.4,dt);}
    const yaw=chaseYaw+lookYaw,D=C.distance+p.speed*C.speedPull,H=C.height+lookPitch*D;
    look.set(p.x+Math.sin(p.h)*C.lookAhead,py+1.1,p.z+Math.cos(p.h)*C.lookAhead);
    eye.set(p.x-Math.sin(yaw)*D,py+H,p.z-Math.cos(yaw)*D);
    // Keep the car in view: stop short of any tall building on the line.
    if(world.occluders){pull.origin.set(p.x,py+1.2,p.z);pull.direction.subVectors(eye,pull.origin);const len=pull.direction.length();pull.direction.multiplyScalar(1/len);
      let near=len;for(const b of world.occluders)if(pull.intersectBox(b,hit)){const d=hit.distanceTo(pull.origin);if(d<near)near=d;}
      if(near<len)eye.copy(pull.origin).addScaledVector(pull.direction,Math.max(2.2,near-.7));}
  }
  // Smooth both points (a critically damped spring each), snapping on the first frame.
  const first=eyeS[0].x===0&&eyeS[2].x===0;
  ['x','y','z'].forEach((k,i)=>{if(first){eyeS[i].x=eye[k];lookS[i].x=look[k];}eye[k]=spring(eyeS[i],eye[k],focus?.6:C.follow,dt);look[k]=spring(lookS[i],look[k],focus?.6:C.follow*.7,dt);});
  // Never under the road: on a slope (down off the bridge) the camera behind the
  // car would sink into the deck. Keep it above the surface the car drives on there.
  if(world.surface&&!focus){const g=world.surface(eye.x,eye.z,py-.12);if(g!==null){const floor=g+.12+1.6;if(eye.y<floor){eye.y=floor;eyeS[1].x=Math.max(eyeS[1].x,floor);}}}
  camera.position.copy(eye);camera.lookAt(look);
  const wantFov=C.fov+C.fovBoost*Math.min(1,p.speed/FEEL.car.maxSpeed);
  if(Math.abs(wantFov-fov)>.01){fov=damp(fov,wantFov,3,dt);camera.fov=fov;camera.updateProjectionMatrix();}
  // Shadows follow the car.
  if(Math.abs(target.x-p.x)+Math.abs(target.z-p.z)>.5){target.set(p.x,target.y,p.z);placeSun();}
  if(trauma>0){trauma=Math.max(0,trauma-F.shakeDecay*dt);shakeClock+=dt;const k=trauma*trauma*F.shake*.6,t=shakeClock;
    camRight.setFromMatrixColumn(camera.matrixWorld,0);camUp.setFromMatrixColumn(camera.matrixWorld,1);
    camera.position.addScaledVector(camRight,k*(Math.sin(t*47.3)*.6+Math.sin(t*83.1+1.3)*.4)).addScaledVector(camUp,k*(Math.sin(t*53.9+2.1)*.6+Math.sin(t*97.7)*.4));}
  return true;
}
// Shadows are drawn for the area in view only; the sun follows the view and snaps
// to whole shadow texels so edges never crawl while the camera glides.
const sunDir=new THREE.Vector3(),sunAt=new THREE.Vector3();
function fitShadow(){
  // The chase view sees far ahead: shadows cover a wide square round the car.
  const half=CHASE?72:THREE.MathUtils.clamp((camera.right-camera.left)/camera.zoom*.6,8,90),cam=sun.shadow.camera;
  cam.left=-half;cam.right=half;cam.top=half;cam.bottom=-half;cam.near=.5;cam.far=420;cam.updateProjectionMatrix();placeSun();
}
function placeSun(){
  const a=THREE.MathUtils.degToRad(art.sun.azimuth),e=THREE.MathUtils.degToRad(art.sun.elevation);sunDir.set(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
  const texel=(sun.shadow.camera.right-sun.shadow.camera.left)/sun.shadow.mapSize.x;
  sunAt.set(Math.round(target.x/texel)*texel,0,Math.round(target.z/texel)*texel);
  sun.target.position.copy(sunAt);sun.position.copy(sunAt).addScaledVector(sunDir,200);sun.target.updateMatrixWorld();
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
  // The world animates (beacons, taxis, clouds); 2 means moving shadows too.
  {const w=world.update(time,frameDt/1000,camera);if(w){animating=true;if(w===2)renderer.shadowMap.needsUpdate=true;}}
  parkedAt=story&&!story.active?parkedBay():null;if(prompt.hidden===!!parkedAt){prompt.hidden=!parkedAt;if(parkedAt)audio.ui.prompt();}
  audio.update(frameDt/1000);
  if(story?.update(frameDt/1000))animating=true;
  if(car.update(time)){animating=true;renderer.shadowMap.needsUpdate=true;}
  if(playground?.update(frameDt/1000)){animating=true;renderer.shadowMap.needsUpdate=true;}
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
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;lastFrame=null;playground?.resync();panVel.set(0,0,0);zoomVel=0;needsRender=true;});

// The page shows only the scene and the vehicle concepts: no toolbar, Workbench
// or captions. The breeze stays on (unless reduced motion is requested).
for(const b of document.querySelectorAll('[data-drive]')){
  const k=b.dataset.drive;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);car.press(k,true);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>car.press(k,false));
}

// The vehicle is hardcoded: the City car.
car.select(VEHICLES.findIndex(v=>v.name===CAR_MODEL));
// X-ray: where a building hides the car, its outline shows through in its colour
// (drawn only where something is in front of it). Not needed behind the car.
if(!CHASE){const ghost=new THREE.MeshBasicMaterial({color:world.carColor??'#ff6b5e',transparent:true,opacity:.55,depthWrite:false,depthFunc:THREE.GreaterDepth});
  const meshes=[];car.rig.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const o of meshes){const g=new THREE.Mesh(o.geometry,ghost);g.renderOrder=40;g.castShadow=g.receiveShadow=false;o.add(g);}}

// Deliberately small inspection API for performance checks and future tiles.
window.forestTile={car,playground,world,audio,get story(){return story;},grid:{GRID,HOME_NUMBER,tileNumber,tileCenter},composer,ao,art,applyArt,setQuality,get quality(){return {name:qualityName,mode:qualityMode,scale:renderScale,pixelRatio:renderer.getPixelRatio()};},spec:TILE_SPEC,art:ART,scene,camera,renderer,materials,canopies,refresh:()=>{needsRender=true;renderer.shadowMap.needsUpdate=true;},stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,footprint:TILE_SPEC.footprint})};

// Development benchmark: runs n full animated frames (breeze, car, shadows,
// composer) back to back, each synced with a 1 px read so GPU time is included.
if(import.meta.env.DEV){
  // Drive the camera by hand in tests: one view update of dt seconds.
  window.forestTile.hold=on=>{holdCamera=on;};
  window.forestTile.view={update:updateView,target,get trauma(){return trauma;},get zoom(){return camera.zoom;},get azimuth(){return az;}};
  window.forestTile.bench=(n=120)=>{
    const gl=renderer.getContext(),px=new Uint8Array(4),times=[];let t=performance.now();
    for(let i=0;i<n;i++){
      const t0=performance.now();t+=1000/60;
      animateTile?.(t);for(const c of canopies){const ph=c.userData.phase;c.rotation.z=Math.sin(t*.00065+ph)*ART.vegetation.sway;}
      car.update(t);playground?.update(1/60);updateView(1/60);renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();
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
