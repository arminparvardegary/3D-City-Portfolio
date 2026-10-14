import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, ToneMappingEffect, ToneMappingMode, HueSaturationEffect } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { buildDiorama } from './diorama.js';
import { damp } from '../motion.js';

// One block on its own page: a fixed three quarter view, soft sun from the left,
// cool sky light and a warm bounce, ambient occlusion, and the block's long soft
// shadow on the backdrop. Drag turns it a little and it eases back; the wheel zooms.
const view=document.getElementById('view');
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
view.append(renderer.domElement);

const scene=new THREE.Scene();
scene.add(buildDiorama());
// The backdrop: the page's teal gradient with a blush corner, drawn into the scene
// so the block's real soft shadow lands on it cleanly.
const backdrop=document.createElement('canvas');backdrop.width=64;backdrop.height=256;
const bgTex=new THREE.CanvasTexture(backdrop);bgTex.colorSpace=THREE.SRGBColorSpace;scene.background=bgTex;
function paintBackdrop(aspect){
  backdrop.width=Math.round(256*Math.max(aspect,.2));backdrop.height=256;const g=backdrop.getContext('2d'),w=backdrop.width,h=256;
  const lin=g.createLinearGradient(0,0,0,h);lin.addColorStop(0,'#9ad7e2');lin.addColorStop(1,'#7fc4d4');g.fillStyle=lin;g.fillRect(0,0,w,h);
  const rad=g.createRadialGradient(0,h,0,0,h,Math.max(w,h)*.7);rad.addColorStop(0,'rgba(244,201,210,1)');rad.addColorStop(1,'rgba(244,201,210,0)');g.fillStyle=rad;g.fillRect(0,0,w,h);
  bgTex.needsUpdate=true;
}
const catcher=new THREE.Mesh(new THREE.PlaneGeometry(400,400).rotateX(-Math.PI/2),new THREE.ShadowMaterial({color:'#1d5f73',opacity:.3}));
catcher.position.y=-6.02;catcher.receiveShadow=true;scene.add(catcher);
scene.add(new THREE.HemisphereLight('#dff5ff','#ffd9e0',1.6));
const sun=new THREE.DirectionalLight('#fff3e6',2.5);sun.position.set(-22,30,14);sun.castShadow=true;sun.shadow.mapSize.setScalar(4096);
Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34,near:1,far:120});sun.shadow.radius=9;sun.shadow.blurSamples=16;sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;scene.add(sun);
const fill=new THREE.DirectionalLight('#a6e6f2',.7);fill.position.set(26,8,6);scene.add(fill);

// Camera: three quarter view from the front left, slightly turned to the street side.
const camera=new THREE.OrthographicCamera(-1,1,1,-1,1,400);
const EL=THREE.MathUtils.degToRad(31);let yaw=THREE.MathUtils.degToRad(37),yawGoal=yaw,zoom=1,zoomGoal=1;
const look=new THREE.Vector3(0,.4,0);
const place=()=>{camera.position.set(Math.sin(yaw)*Math.cos(EL),Math.sin(EL),Math.cos(yaw)*Math.cos(EL)).multiplyScalar(120).add(look);camera.lookAt(look);};

const composer=new EffectComposer(renderer,{frameBufferType:THREE.HalfFloatType,multisampling:4});
composer.addPass(new RenderPass(scene,camera));
const ao=new N8AOPostPass(scene,camera,1,1);ao.autoDetectTransparency=false;
Object.assign(ao.configuration,{aoRadius:1.1,distanceFalloff:.6,intensity:2.2,gammaCorrection:false,halfRes:true,depthAwareUpsampling:true});ao.configuration.color.set('#3a3348');
composer.addPass(ao);
composer.addPass(new EffectPass(camera,new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL}),new HueSaturationEffect({saturation:.08})));

function resize(){
  const w=view.clientWidth,h=view.clientHeight,a=w/h,size=Math.max(34,33/a);paintBackdrop(a);
  camera.left=-size*a/2;camera.right=size*a/2;camera.top=size/2;camera.bottom=-size/2;camera.zoom=zoom;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);composer.setSize(w,h);dirty=true;
}
let dirty=true;new ResizeObserver(resize).observe(view);

// Drag turns the block a little (it eases back on release); wheel or pinch zooms.
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOME=yaw,LIMIT=.5;let drag=null;
const el=renderer.domElement;
el.addEventListener('pointerdown',e=>{drag={x:e.clientX,yaw:yawGoal};try{el.setPointerCapture(e.pointerId);}catch{}});
el.addEventListener('pointermove',e=>{if(!drag)return;yawGoal=THREE.MathUtils.clamp(drag.yaw-(e.clientX-drag.x)*.006,HOME-LIMIT,HOME+LIMIT);});
for(const ev of ['pointerup','pointercancel'])el.addEventListener(ev,()=>{drag=null;yawGoal=HOME;});
el.addEventListener('wheel',e=>{e.preventDefault();zoomGoal=THREE.MathUtils.clamp(zoomGoal*Math.exp(-e.deltaY*.0012),.6,3);},{passive:false});

let last=null;
function frame(t){
  requestAnimationFrame(frame);
  const dt=last===null?0:Math.min(.1,(t-last)/1000);last=t;
  const k=reduced?1e3:1;
  if(Math.abs(yawGoal-yaw)>1e-4){yaw=damp(yaw,yawGoal,drag?14*k:4*k,dt);dirty=true;}
  if(Math.abs(zoomGoal-zoom)>1e-4){zoom=damp(zoom,zoomGoal,10*k,dt);camera.zoom=zoom;camera.updateProjectionMatrix();dirty=true;}
  if(!dirty)return;dirty=false;place();composer.render();
}
document.addEventListener('visibilitychange',()=>{last=null;});
place();requestAnimationFrame(frame);
window.block={scene,camera,renderer,composer,render:()=>{dirty=true;}};
