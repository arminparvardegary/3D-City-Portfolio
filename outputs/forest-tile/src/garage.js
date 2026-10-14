import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { VEHICLES, buildVehicle, checkClearance } from './vehicles.js';
// Every vehicle side by side (?a= azimuth, ?e= elevation in degrees).
const q=new URLSearchParams(location.search),cols=4,cw=Math.floor(innerWidth/cols),ch=Math.floor(cw*.62),rows=Math.ceil(VEHICLES.length/cols);
const r=new THREE.WebGLRenderer({antialias:true});r.setPixelRatio(devicePixelRatio);r.setSize(cw*cols,ch*rows);r.toneMapping=THREE.ACESFilmicToneMapping;r.setScissorTest(true);document.body.append(r.domElement);
const m=createMaterials(),az=THREE.MathUtils.degToRad(+(q.get('a')??45)),el=THREE.MathUtils.degToRad(+(q.get('e')??30));
const ctx=document.createElement('canvas').getContext('2d');
VEHICLES.forEach((v,i)=>{
  const s=new THREE.Scene();s.background=new THREE.Color('#f1f2f1');s.add(new THREE.HemisphereLight('#fff','#bbc6b5',1.9));const d=new THREE.DirectionalLight('#fffaf1',2.6);d.position.set(-3.5,9,6);s.add(d);
  const g=new THREE.Group();s.add(g);const p=buildVehicle(i,g,m);p.rig.position.set(0,0,0);
  const cam=new THREE.OrthographicCamera(-3.4*cw/ch,3.4*cw/ch,3.4,-3.4,.1,100);cam.position.set(Math.sin(az)*Math.cos(el)*30,Math.sin(el)*30+.8,Math.cos(az)*Math.cos(el)*30);cam.lookAt(0,.8,0);cam.zoom=1.15;cam.updateProjectionMatrix();
  const x=(i%cols)*cw,y=(rows-1-Math.floor(i/cols))*ch;r.setViewport(x,y,cw,ch);r.setScissor(x,y,cw,ch);r.render(s,cam);
  const l=document.createElement('div');l.textContent=`${i+1}. ${v.name}`;l.style.cssText=`position:absolute;left:${(i%cols)*cw+10}px;top:${Math.floor(i/cols)*ch+8}px;font:600 13px sans-serif;color:#4a5640`;document.body.append(l);
});

// ?check=1 runs the wheel clearance test on every vehicle (steered both ways).
if(q.get('check')){
  window.__clearance=VEHICLES.map((v,i)=>({n:i+1,name:v.name,hits:checkClearance(i,m)}));
  console.log(JSON.stringify(window.__clearance.map(r=>({n:r.n,name:r.name,hits:r.hits.length,first:r.hits[0]}))));
}
