import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ART, TILE_SPEC } from './config.js';
import { createMaterials } from './materials.js';
import { buildTile } from './tile.js';
import { softenShadows } from './shadows.js';

const viewport=document.querySelector('#viewport');
const $=id=>document.getElementById(id);
let renderer;
try {
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
} catch(error) {
  $('loading').textContent='This little world needs WebGL 2. Please open it in a browser with hardware acceleration enabled.';
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio,ART.rendering.maxPixelRatio));
renderer.setClearColor(0x000000,0);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate=false;
renderer.info.autoReset=false;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=ART.light.exposure;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-label','My House: a minimal cream house with a coral roof, a Tesla Model S in the parking space, and a small Turkish flag on a 100 by 100 design-pixel tile.');
renderer.domElement.setAttribute('role','img');
viewport.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,100);
const target=new THREE.Vector3(...ART.camera.target);
const az=THREE.MathUtils.degToRad(ART.camera.azimuth),el=THREE.MathUtils.degToRad(ART.camera.elevation);
camera.position.copy(target).add(new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(30));
camera.lookAt(target);

const sky=new THREE.HemisphereLight('#ffffff','#bbc6b5',ART.light.fill);scene.add(sky);
const sun=new THREE.DirectionalLight('#fffaf1',ART.light.sun);sun.position.set(...ART.light.position);scene.add(sun);
sun.castShadow=true;
sun.shadow.mapSize.setScalar(ART.light.shadowSize);
Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:25});
sun.shadow.normalBias=.025;sun.shadow.bias=-.00012;sun.shadow.radius=ART.light.shadowSoftness;
const fill=new THREE.DirectionalLight('#dceaf4',.72);fill.position.set(5,4,-5);scene.add(fill);

const materials=createMaterials();
Object.values(materials).forEach(softenShadows);
const {group:tile,canopies,animate:animateTile,extraMaterials=[]}=buildTile(materials);scene.add(tile);
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

const renderTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
const composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));
const ao=new SSAOPass(scene,camera,1,1,16);ao.kernelRadius=.72;ao.minDistance=.0006;ao.maxDistance=.025;
composer.addPass(ao);composer.addPass(new OutputPass());
let zoom=1,breeze=ART.vegetation.breeze,needsRender=true,hidden=document.hidden,lastTime=0,lastShadow=0,noticeTimer;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
if(reducedMotion.matches)breeze=false;

function resize(){
  const {width,height}=viewport.getBoundingClientRect();
  const aspect=width/height;
  // Keep the entire tile visible on portrait devices while retaining a large
  // inspection view on desktop. Zoom never changes camera orientation.
  const frustum=Math.max(ART.camera.viewHeight,16.8/aspect);
  camera.left=-frustum*aspect/2;camera.right=frustum*aspect/2;camera.top=frustum/2;camera.bottom=-frustum/2;camera.zoom=zoom;
  camera.updateProjectionMatrix();renderer.setSize(width,height);composer.setSize(width,height);
  ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
  ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
  renderer.shadowMap.needsUpdate=true;needsRender=true;
}
new ResizeObserver(resize).observe(viewport);
function render(time=0){
  requestAnimationFrame(render);
  if(hidden||time-lastTime<1000/ART.rendering.targetFPS)return;
  if(breeze){
    const carMoving=animateTile?.(time);
    for(const canopy of canopies){const phase=canopy.userData.phase;canopy.rotation.z=Math.sin(time*.00065+phase)*ART.vegetation.sway;canopy.rotation.x=Math.cos(time*.00048+phase)*ART.vegetation.sway*.6;}
    needsRender=true;
    // The breeze is tiny; refreshing shadows at 6 Hz is enough to follow it.
    if(carMoving||time-lastShadow>160){renderer.shadowMap.needsUpdate=true;lastShadow=time;}
  }
  if(!needsRender)return;
  renderer.info.reset();composer.render();lastTime=time;needsRender=false;
  renderer.domElement.dataset.ready='true';
  renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);
  renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);
}
resize();renderer.shadowMap.needsUpdate=true;
renderer.compile(scene,camera);$('loading').remove();render();
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;needsRender=true;});

function notify(message){$('notice').textContent=message;$('notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').classList.remove('visible'),2400);}
function updateZoom(value){zoom=THREE.MathUtils.clamp(value,.75,1.45);$('zoom-label').textContent=`${Math.round(zoom*100)}%`;$('zoom-out').disabled=zoom<=.75;$('zoom-in').disabled=zoom>=1.45;resize();}
$('zoom-in').onclick=()=>updateZoom(zoom+.1);$('zoom-out').onclick=()=>updateZoom(zoom-.1);$('zoom-reset').onclick=()=>updateZoom(1);
function updateBreeze(){const b=$('breeze-toggle');b.classList.toggle('is-active',breeze);b.setAttribute('aria-pressed',String(breeze));b.setAttribute('aria-label',breeze?'Pause motion':'Play motion');b.title=breeze?'Pause motion':'Play motion';needsRender=true;}
$('breeze-toggle').onclick=()=>{breeze=!breeze;updateBreeze();};updateBreeze();
function showSettings(open){$('settings').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));$('settings-toggle').classList.toggle('is-active',open);}
$('settings-toggle').onclick=()=>showSettings($('settings').hidden);$('settings-close').onclick=()=>showSettings(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){showSettings(false);$('settings-toggle').focus();}});
function updateLight(){const value=Number($('light').value);sun.intensity=ART.light.sun*value;sky.intensity=ART.light.fill*(.75+value*.25);$('light-value').value=value.toFixed(1);needsRender=true;}
function updateCanopy(){const value=Number($('canopy').value);for(const c of canopies)c.scale.setScalar(value);$('canopy-value').value=value.toFixed(2);renderer.shadowMap.needsUpdate=true;needsRender=true;}
function updateRoughness(){const value=Number($('roughness').value);for(const [name,mat] of Object.entries(materials)){if(!['window','gold'].includes(name))mat.roughness=value;}$('roughness-value').value=value.toFixed(2);needsRender=true;}
$('light').oninput=updateLight;$('canopy').oninput=updateCanopy;$('roughness').oninput=updateRoughness;
function updateColors(){materials.ground.color.set($('grass-color').value);materials.grass.color.copy(materials.ground.color);materials.leaves.color.set($('leaf-color').value);materials.leafTips.color.copy(materials.leaves.color).lerp(new THREE.Color('#d2cb76'),.32);materials.roof.color.set($('roof-color').value);materials.carBody.color.set($('car-color').value);needsRender=true;}
for(const id of ['grass-color','leaf-color','roof-color','car-color'])$(id).oninput=updateColors;
$('grid-toggle').onchange=()=>{grid.visible=$('grid-toggle').checked;needsRender=true;if(grid.visible)notify('10 divisions × 10 design pixels = 100 × 100');};
$('reset-style').onclick=()=>{
  $('light').value=1;$('canopy').value=1;$('roughness').value=ART.material.roughness;$('grass-color').value=ART.palette.grass;$('leaf-color').value=ART.palette.leaves;$('roof-color').value=ART.palette.roof;$('car-color').value=ART.palette.car;
  updateLight();updateCanopy();updateRoughness();updateColors();$('grid-toggle').checked=false;grid.visible=false;updateZoom(1);notify('Original house style restored.');
};
$('save-render').onclick=()=>{
  composer.render();const image=document.createElement('canvas');image.width=renderer.domElement.width;image.height=renderer.domElement.height;
  const context=image.getContext('2d');context.fillStyle=ART.palette.background;context.fillRect(0,0,image.width,image.height);context.drawImage(renderer.domElement,0,0);
  image.toBlob(blob=>{if(!blob){notify('Could not save this view. Please try again.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='my-house-tile.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Your house tile, saved.');},'image/png');
};

// Deliberately small inspection API for performance checks and future tiles.
window.forestTile={spec:TILE_SPEC,art:ART,scene,camera,renderer,materials,tile,canopies,refresh:()=>{needsRender=true;renderer.shadowMap.needsUpdate=true;},stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,footprint:TILE_SPEC.footprint})};

if(import.meta.hot)import.meta.hot.dispose(()=>{
  scene.traverse(o=>{o.geometry?.dispose();});for(const mat of Object.values(materials))mat.dispose();composer.dispose();renderer.dispose();
});
