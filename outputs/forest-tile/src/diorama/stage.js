import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, ToneMappingEffect, ToneMappingMode, HueSaturationEffect } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { damp } from '../motion.js';

// The stage for a low poly diorama page: a fixed three quarter view, soft sun
// from the left, cool sky light with a warm bounce, ambient occlusion, and the
// model's soft shadow on a teal backdrop with a blush corner. Drag turns the
// model a little and it eases back; the wheel zooms. `update(dt, t)` runs every
// frame and returns true while something moves.
export function createStage({view,content,fit=34,look=[0,.4,0],floor=-6,shadow=34,sun=[-22,30,14],aoRadius=1.1,update=null}){
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
  view.append(renderer.domElement);
  const scene=new THREE.Scene();scene.add(content);

  // The backdrop is drawn into the scene so the real soft shadow lands on it cleanly.
  const backdrop=document.createElement('canvas');const bgTex=new THREE.CanvasTexture(backdrop);bgTex.colorSpace=THREE.SRGBColorSpace;scene.background=bgTex;
  function paintBackdrop(aspect){
    backdrop.width=Math.round(256*Math.max(aspect,.2));backdrop.height=256;const g=backdrop.getContext('2d'),w=backdrop.width,h=256;
    const lin=g.createLinearGradient(0,0,0,h);lin.addColorStop(0,'#9ad7e2');lin.addColorStop(1,'#7fc4d4');g.fillStyle=lin;g.fillRect(0,0,w,h);
    const rad=g.createRadialGradient(0,h,0,0,h,Math.max(w,h)*.7);rad.addColorStop(0,'rgba(244,201,210,1)');rad.addColorStop(1,'rgba(244,201,210,0)');g.fillStyle=rad;g.fillRect(0,0,w,h);
    bgTex.needsUpdate=true;
  }
  const catcher=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000).rotateX(-Math.PI/2),new THREE.ShadowMaterial({color:'#1d5f73',opacity:.3}));
  catcher.position.y=floor-.02;catcher.receiveShadow=true;scene.add(catcher);
  scene.add(new THREE.HemisphereLight('#dff5ff','#ffd9e0',1.6));
  const light=new THREE.DirectionalLight('#fff3e6',2.5);light.position.set(...sun);light.castShadow=true;light.shadow.mapSize.setScalar(4096);
  Object.assign(light.shadow.camera,{left:-shadow,right:shadow,top:shadow,bottom:-shadow,near:1,far:Math.hypot(...sun)*2.6});
  light.shadow.radius=9;light.shadow.blurSamples=16;light.shadow.bias=-.0003;light.shadow.normalBias=.03;scene.add(light);
  const fill=new THREE.DirectionalLight('#a6e6f2',.7);fill.position.set(26,8,6);scene.add(fill);

  const camera=new THREE.OrthographicCamera(-1,1,1,-1,1,800);
  const EL=THREE.MathUtils.degToRad(31),target=new THREE.Vector3(...look);let yaw=THREE.MathUtils.degToRad(37),yawGoal=yaw,zoom=1,zoomGoal=1;
  const place=()=>{camera.position.set(Math.sin(yaw)*Math.cos(EL),Math.sin(EL),Math.cos(yaw)*Math.cos(EL)).multiplyScalar(300).add(target);camera.lookAt(target);};

  const composer=new EffectComposer(renderer,{frameBufferType:THREE.HalfFloatType,multisampling:4});
  composer.addPass(new RenderPass(scene,camera));
  const ao=new N8AOPostPass(scene,camera,1,1);ao.autoDetectTransparency=false;
  Object.assign(ao.configuration,{aoRadius,distanceFalloff:.6,intensity:2.2,gammaCorrection:false,halfRes:true,depthAwareUpsampling:true});ao.configuration.color.set('#3a3348');
  composer.addPass(ao);
  composer.addPass(new EffectPass(camera,new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL}),new HueSaturationEffect({saturation:.08})));

  let dirty=true;
  function resize(){
    const w=view.clientWidth,h=view.clientHeight,a=w/h,size=Math.max(fit,fit*.97/a);paintBackdrop(a);
    camera.left=-size*a/2;camera.right=size*a/2;camera.top=size/2;camera.bottom=-size/2;camera.zoom=zoom;camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);composer.setSize(w,h);dirty=true;
  }
  new ResizeObserver(resize).observe(view);

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
    if(update&&!reduced&&update(dt,t)){dirty=true;light.shadow.needsUpdate=true;}
    if(!dirty)return;dirty=false;place();composer.render();
  }
  document.addEventListener('visibilitychange',()=>{last=null;});
  place();requestAnimationFrame(frame);
  return {scene,camera,renderer,composer,render:()=>{dirty=true;}};
}
