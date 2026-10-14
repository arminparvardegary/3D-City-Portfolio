import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh } from './geometry.js';

function simpleWindow(parent,m,x,y,z,w,h,angle=0) {
  const frame=new THREE.Group();frame.position.set(x,y,z);frame.rotation.y=angle;parent.add(frame);
  box(frame,[w+.12,h+.12,.055],[0,0,0],m.trim,.009);
  box(frame,[w,h,.025],[0,0,.038],m.window,.004);
  box(frame,[w+.18,.05,.13],[0,-h/2-.065,.035],m.trim,.006);
}

export function buildHome(parent,m) {
  const h=ART.house,house=new THREE.Group();house.name='my-minimal-house';house.position.set(...h.position);parent.add(house);
  const w=h.width,d=h.depth,wall=h.wallHeight,rise=h.roofRise;
  box(house,[w+.1,.12,d+.1],[0,.06,0],m.path,.012);
  box(house,[w,wall,d],[0,wall/2+.12,0],m.plaster,.014);
  const gable=new THREE.Shape();gable.moveTo(-w/2,wall+.12);gable.lineTo(0,wall+rise+.12);gable.lineTo(w/2,wall+.12);gable.closePath();
  mesh(house,new THREE.ExtrudeGeometry(gable,{depth:d,bevelEnabled:false}),m.plaster,[0,0,-d/2]);
  // Two unbroken roof planes, matching the minimal reference language.
  const overhang=.18,half=w/2+overhang,slope=rise/(w/2),pitch=Math.atan(slope),length=half/Math.cos(pitch);
  for(const side of [-1,1]){
    box(house,[length,.105,d+.35],[side*half/2,wall+rise+.17-half*slope/2,0],m.roof,.006,[0,0,-side*pitch]);
  }
  // No timber framing or individual tiles: just a quiet, readable silhouette.
  box(house,[.3,.7,.37],[-.56,wall+rise+.12,-.73],m.path,.008);
  box(house,[.36,.07,.43],[-.56,wall+rise+.49,-.73],m.trim,.006);
  box(house,[.17,.008,.23],[-.56,wall+rise+.53,-.73],m.truckDark,.003);
  simpleWindow(house,m,.72,1.32,d/2+.024,.47,.67);
  simpleWindow(house,m,w/2+.024,1.32,-.77,.64,.75,Math.PI/2);
  simpleWindow(house,m,w/2+.024,1.32,.62,.64,.75,Math.PI/2);
  const doorX=-.53,front=d/2;
  box(house,[.85,1.55,.07],[doorX,.895,front+.025],m.trim,.012);
  box(house,[.71,1.44,.035],[doorX,.87,front+.073],m.door,.006);
  box(house,[.43,.43,.018],[doorX,1.24,front+.098],m.window,.005);
  box(house,[.025,.13,.03],[doorX+.23,.8,front+.12],m.rim,.004);
  box(house,[1.18,.11,.48],[doorX,.055,front+.3],m.path,.01);
  // Small porch canopy and wall lamp: restrained, functional details.
  box(house,[1.06,.065,.48],[doorX,1.78,front+.16],m.trim,.009);
  box(house,[.08,.18,.07],[doorX-.6,1.53,front+.1],m.truckDark,.006);
  box(house,[.054,.11,.01],[doorX-.6,1.53,front+.14],m.headlight,.002);
  return house;
}

function flagTexture() {
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#e32332';ctx.fillRect(0,0,768,512);
  // White crescent opening toward a five-pointed star.
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(271,256,128,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e32332';ctx.beginPath();ctx.arc(303,256,102,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();
  for(let i=0;i<10;i++){
    const angle=-Math.PI/2+i*Math.PI/5,r=i%2===0?64:25.5;
    const x=450+Math.cos(angle)*r,y=256+Math.sin(angle)*r;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.fill();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

export function buildTurkishFlag(parent,m) {
  const group=new THREE.Group();group.name='little-turkish-flag';group.position.set(-.45,.12,2.62);parent.add(group);
  box(group,[.2,.06,.2],[0,.03,0],m.path,.012);
  mesh(group,new THREE.CylinderGeometry(.016,.02,1.95,10),m.rim,[0,1.005,0]);
  mesh(group,new THREE.SphereGeometry(.033,10,8),m.rim,[0,1.997,0]);
  const width=.78,height=.52,geometry=new THREE.PlaneGeometry(width,height,16,6);
  geometry.translate(width/2+.016,1.65,0);
  const material=new THREE.MeshStandardMaterial({map:flagTexture(),side:THREE.DoubleSide,roughness:.95,metalness:0});
  const fabric=mesh(group,geometry,material);fabric.rotation.y=Math.PI/4;
  const pos=geometry.attributes.position;
  function animate(time){
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),t=x/width;
      pos.setZ(i,Math.sin(t*5.2-time*.0015+(y-1.65)*1.6)*.045*t);
    }
    pos.needsUpdate=true;geometry.computeVertexNormals();
  }
  animate(0);return {animate,material};
}
