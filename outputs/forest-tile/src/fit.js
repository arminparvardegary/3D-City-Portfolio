import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { bodyLoft, glassLoft, BODY_SECTIONS, GLASS_SECTIONS, buildTeslaModelY } from './tesla.js';
// Development tool: fits a 3D Model Y to the supplied studio render. The camera
// and the car's profile are optimised together so the car's silhouette covers
// the render's silhouette (IoU). Modes via ?mode=  model | diff | ref
const W=1446,H=762,S=.5,w=Math.round(W*S),h=Math.round(H*S),q=new URLSearchParams(location.search);
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('gl'),antialias:false,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setClearColor(0xffffff,0);
const scene=new THREE.Scene();
scene.add(new THREE.HemisphereLight('#ffffff','#999999',1.6));const sun=new THREE.DirectionalLight('#fff',2.4);sun.position.set(4,8,6);scene.add(sun);
const m=createMaterials();
const body=JSON.parse(JSON.stringify(window.__BODY||BODY_SECTIONS)),glass=JSON.parse(JSON.stringify(window.__GLASS||GLASS_SECTIONS));
const saved=JSON.parse(localStorage.getItem('modely-fit')||'null');
if(saved&&!q.get('fresh')){saved.body.forEach((r,i)=>body[i]=r);saved.glass.forEach((r,i)=>glass[i]=r);}
let bodyMesh=new THREE.Mesh(bodyLoft(body,3.4,.92),m.carBody),glassMesh=new THREE.Mesh(glassLoft(glass),m.carGlass);glassMesh.material.side=THREE.DoubleSide;
const T={r:.356,zf:1.445,zr:-1.445,track:.818,...(saved&&!q.get('fresh')&&saved.T?saved.T:{})};
const tires=new THREE.Group();const tireMeshes=[];
for(const sx of [-1,1])for(const f of [0,1]){const t=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.255,32),m.rubber);t.rotation.z=Math.PI/2;t.userData={sx,f};tires.add(t);tireMeshes.push(t);}
function placeTires(){for(const t of tireMeshes){t.scale.set(T.r,1,T.r);t.position.set(t.userData.sx*T.track,T.r,t.userData.f?T.zf:T.zr);}}
placeTires();
scene.add(bodyMesh,glassMesh,tires);
function rebuild(){placeTires();bodyMesh.geometry.dispose();bodyMesh.geometry=bodyLoft(body,3.4,.92);glassMesh.geometry.dispose();glassMesh.geometry=glassLoft(glass);}
// Reference mask from the alpha of the cut out car (down sampled for the search).
const refImg=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='/ref/subject.png';});
const rc=document.createElement('canvas');rc.width=w;rc.height=h;const rx=rc.getContext('2d',{willReadFrequently:true});rx.drawImage(refImg,0,0,w,h);
const refA=rx.getImageData(0,0,w,h).data;
const mc=document.createElement('canvas');mc.width=w;mc.height=h;const mx=mc.getContext('2d',{willReadFrequently:true});
export const P={az:60,el:30.7,dist:7.15,fov:18,sx:0,sy:-.048,...(saved&&!q.get('fresh')?saved.P:{}),...JSON.parse(q.get('p')||'{}')};
const cam=new THREE.PerspectiveCamera(30,W/H,.1,100),target=new THREE.Vector3(0,.7,0);
// Camera solved from the wheel anchors (least squares, upright, lens centre at
// the 2048 canvas centre): position in metres, yaw/pitch of the view, focal in px.
const CAM={pos:[5.053,1.931,6.155],yaw:-141.37,pitch:-8.34,f:3189.9,pp:[1024-224,1024-729]};
function aim(){
  const y=THREE.MathUtils.degToRad(CAM.yaw),p=THREE.MathUtils.degToRad(CAM.pitch);
  cam.position.set(...CAM.pos);cam.lookAt(cam.position.clone().add(new THREE.Vector3(Math.sin(y)*Math.cos(p),Math.sin(p),Math.cos(y)*Math.cos(p))));
  cam.fov=THREE.MathUtils.radToDeg(2*Math.atan(H/2/CAM.f));cam.aspect=W/H;cam.updateProjectionMatrix();
  cam.projectionMatrix.elements[8]=-(CAM.pp[0]-W/2)/(W/2);cam.projectionMatrix.elements[9]=(CAM.pp[1]-H/2)/(H/2);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}
const flat=new THREE.MeshBasicMaterial({color:0x000000});
function silhouette(sw,sh){
  aim(P);renderer.setSize(sw,sh,false);scene.overrideMaterial=flat;renderer.render(scene,cam);scene.overrideMaterial=null;
  mc.width=sw;mc.height=sh;mx.clearRect(0,0,sw,sh);mx.drawImage(renderer.domElement,0,0);return mx.getImageData(0,0,sw,sh).data;
}
function iou(){
  const d=silhouette(w,h);let i=0,u=0;
  for(let k=3;k<d.length;k+=4){const a=d[k]>128,b=refA[k]>128;if(a&&b)i++;if(a||b)u++;}
  return i/u;
}
// Parameter list: every number the search may move, with its step and limits.
const params=[];
const addP=(obj,key,step,lo,hi,tag)=>params.push({obj,key,step,lo,hi,tag});
if(q.get('freecam'))for(const k of ['az','el','dist','fov','sx','sy'])addP(P,k,{az:4,el:3,dist:.8,fov:3,sx:.04,sy:.04}[k],{az:20,el:5,dist:5,fov:8,sx:-.6,sy:-.6}[k],{az:90,el:55,dist:20,fov:50,sx:.6,sy:.6}[k],'cam');
addP(T,'r',.005,.345,.365,'tire');addP(T,'zf',.01,1.415,1.475,'tire');addP(T,'zr',.01,-1.475,-1.415,'tire');addP(T,'track',.006,.8,.84,'tire');
const B0=JSON.parse(JSON.stringify(BODY_SECTIONS)),G0=JSON.parse(JSON.stringify(GLASS_SECTIONS));
body.forEach((r,i)=>{
  addP(r,2,.025,B0[i][2]-.12,B0[i][2]+.12,'body');addP(r,3,.025,B0[i][3]-.2,B0[i][3]+.2,'body');addP(r,1,.01,B0[i][1]*.97,B0[i][1]*1.03,'body');
  if(i>0&&i<body.length-1)addP(r,0,.03,B0[i][0]-.15,B0[i][0]+.15,'body');
});
glass.forEach((r,i)=>{addP(r,2,.02,G0[i][2]-.1,G0[i][2]+.1,'glass');addP(r,3,.025,G0[i][3]-.2,G0[i][3]+.2,'glass');addP(r,0,.03,G0[i][0]-.2,G0[i][0]+.2,'glass');addP(r,1,.01,G0[i][1]*.95,G0[i][1]*1.05,'glass');});
// Smoothness: penalise bumpy top and bottom lines so the car stays a believable shape.
function bumpiness(rows,j){let s=0;for(let i=1;i<rows.length-1;i++){const d=rows[i-1][j]-2*rows[i][j]+rows[i+1][j];s+=d*d;}return s;}
// Anchors measured on the render (pixels): centre, top and bottom of each rim
// face. The rim face sits ~9 cm outboard of the tyre centre; rim radius 0.241 m.
const RIM=.241,FACE=.092;
const ANCHORS=[['f',0,[653,617]],['f',1,[653,500]],['f',-1,[653,735]],['r',0,[1350,415]],['r',1,[1350,323]],['r',-1,[1350,507]]];
const pv=new THREE.Vector3();
export function anchorError(){
  aim(P);let e=0;
  for(const [w,dy,[px,py]] of ANCHORS){
    pv.set(T.track+FACE,T.r+dy*RIM,w==='f'?T.zf:T.zr).project(cam);
    const x=(pv.x*.5+.5)*W,y=(1-(pv.y*.5+.5))*H;e+=(x-px)**2+(y-py)**2;
  }
  return Math.sqrt(e/ANCHORS.length);
}
function score(){rebuild();const a=anchorError();return iou()-(a/100)**2-.02*(bumpiness(body,3)+bumpiness(body,2)+bumpiness(glass,3));}
// Camera only, from the wheel anchors: a smooth problem, solved first.
function fitCamera(iters=600){
  const keys=['az','el','dist','fov','sx','sy'],step={az:2,el:2,dist:.5,fov:2,sx:.03,sy:.03};let best=anchorError();
  for(let t=0;t<iters;t++){const k=keys[t%6];let moved=false;
    for(const d of [1,-1]){const v=P[k];P[k]=v+d*step[k];const e=anchorError();if(e<best){best=e;moved=true;break;}P[k]=v;}
    if(!moved)step[k]*=.8;}
  return best;
}
function fit(passes=3){
  let best=score();const log=[];
  for(let pass=0;pass<passes;pass++){
    for(const p of params){
      const v0=p.obj[p.key];let moved=false;
      for(const dir of [1,-1]){
        const v=Math.min(p.hi,Math.max(p.lo,v0+dir*p.step));if(v===p.obj[p.key])continue;p.obj[p.key]=v;const s=score();
        if(s>best){best=s;moved=true;break;}p.obj[p.key]=v0;
      }
      if(!moved)p.obj[p.key]=v0;
    }
    for(const p of params)p.step*=.85;
    log.push(best.toFixed(4));
  }
  rebuild();return {best,log};
}
const out=document.getElementById('info');
const ray=new THREE.Raycaster();
// Pixel on the render -> point on the 3D body (or glass) seen through that pixel.
window.__pick=(pts,target='body')=>{aim(P);rebuild();const objs=target==='glass'?[glassMesh]:target==='any'?[bodyMesh,glassMesh]:[bodyMesh];
  return pts.map(([px,py])=>{ray.setFromCamera(new THREE.Vector2(px/W*2-1,-(py/H*2-1)),cam);const h=ray.intersectObjects(objs)[0];return h?h.point.toArray().map(v=>+v.toFixed(3)):null;});};
window.__fit=fit;window.__state=()=>({P,body,glass,T,iou:iou(),anchorPx:anchorError()});
window.__save=()=>localStorage.setItem('modely-fit',JSON.stringify({P,body,glass,T}));
rebuild();
if(q.get('fit')){const r=fit(+q.get('fit'));window.__save();window.__result=r;out.textContent='IoU '+iou().toFixed(4)+'  wheel anchor error '+anchorError().toFixed(1)+'px  passes '+r.log.join(' ');}
else out.textContent='IoU '+iou().toFixed(4);
// Presentation at full size.
const mode=q.get('mode')||'diff';
const dc=document.getElementById('diff');dc.width=W;dc.height=H;const dx=dc.getContext('2d');
const refFull=await new Promise(r=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(refImg,0,0);r(x.getImageData(0,0,W,H).data);});
if(mode==='diff'){
  const d=silhouette(W,H),img=dx.createImageData(W,H);
  for(let k=0;k<d.length;k+=4){const a=d[k+3]>128,b=refFull[k+3]>128;
    img.data.set(a&&b?[120,120,120,255]:a?[230,40,40,255]:b?[40,80,230,255]:[255,255,255,255],k);}
  dx.putImageData(img,0,0);document.getElementById('gl').style.display='none';document.getElementById('ref').style.display='none';
}else if(mode==='ref'){document.getElementById('gl').style.display='none';}
else if(mode==='full'||mode==='solo'){
  scene.remove(bodyMesh,glassMesh,tires);const full=buildTeslaModelY(scene,m);full.rig.position.set(0,0,0);full.rig.scale.setScalar(1);
  m.headlight.emissive.set('#ffffff');m.headlight.emissiveIntensity=.9;
  aim(P);renderer.setSize(W,H,false);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.render(scene,cam);
  document.getElementById('gl').style.opacity=mode==='solo'?'1':(q.get('o')||'.55');if(mode==='solo')document.getElementById('ref').style.display='none';
}
else{aim(P);renderer.setSize(W,H,false);renderer.setClearColor(0xffffff,0);renderer.render(scene,cam);document.getElementById('gl').style.opacity=q.get('o')||'.6';}
window.__ready=true;
