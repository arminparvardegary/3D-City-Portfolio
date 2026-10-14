import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { buildTeslaModelY } from './tesla.js';
// Close-up inspection page for the car only: /car.html?a=35&e=18&d=7
const q=new URLSearchParams(location.search);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f1f2f1');
scene.add(new THREE.HemisphereLight('#ffffff','#bbc6b5',1.8));
const sun=new THREE.DirectionalLight('#fffaf1',3);sun.position.set(-3.5,9,6);sun.castShadow=true;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#c7ceca'}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const m=createMaterials();
const parts=buildTeslaModelY(scene,m);parts.rig.position.set(0,0,0);
const a=THREE.MathUtils.degToRad(+(q.get('a')??35)),e=THREE.MathUtils.degToRad(+(q.get('e')??18)),d=+(q.get('d')??7);
const cam=new THREE.PerspectiveCamera(30,innerWidth/innerHeight,.1,100);
cam.position.set(Math.sin(a)*Math.cos(e)*d,Math.sin(e)*d+.5,Math.cos(a)*Math.cos(e)*d);cam.lookAt(0,.6,0);
renderer.render(scene,cam);window.__ready=true;window.__scene=scene;window.__draw=()=>renderer.render(scene,cam);window.__m=m;
