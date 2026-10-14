import * as THREE from 'three';
import { ART } from './config.js';
import { box, mesh, branch } from './geometry.js';

function polygon(parent,points,material) {
  const p=[],indices=[];points.forEach(v=>p.push(...v));
  for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();
  return mesh(parent,g,material);
}

function badge(text,width,height,bg,fg,font='bold 42px Arial') {
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,512,128);x.fillStyle=fg;x.font=font;x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,68);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return {geometry:new THREE.PlaneGeometry(width,height),material:new THREE.MeshStandardMaterial({map,roughness:.7,side:THREE.DoubleSide})};
}

export function buildRanger(parent,m) {
  const truck=new THREE.Group();truck.name='ford-ranger-double-cab';truck.position.set(...ART.ranger.position);truck.rotation.y=ART.ranger.rotation;truck.scale.setScalar(ART.ranger.scale);parent.add(truck);
  // Double-cab pickup proportions: upright grille, four-door cab, open bed.
  box(truck,[1.37,.24,3.37],[0,.59,0],m.truck,.045);
  box(truck,[1.44,.36,1.02],[0,.88,1.17],m.truck,.045);
  box(truck,[1.4,.1,.94],[0,1.075,1.16],m.truck,.025);
  box(truck,[1.43,.33,1.55],[0,.86,-.05],m.truck,.025);
  // Cab shell, extruded from its sloping side profile.
  const profile=new THREE.Shape();profile.moveTo(-.86,1.04);profile.lineTo(-.45,1.6);profile.lineTo(.61,1.6);profile.lineTo(.74,.94);profile.closePath();
  const cabGeo=new THREE.ExtrudeGeometry(profile,{depth:1.34,bevelEnabled:false});
  const cab=mesh(truck,cabGeo,m.truck,[-.67,0,0],[0,Math.PI/2,0]);
  // The profile's horizontal coordinate is reversed by its Y rotation.
  // Glass uses matching 3D planes on each visible side.
  for(const side of [-1,1]){
    const x=side*.685;
    const panes=[
      [[x,1.07,-.68],[x,1.53,-.57],[x,1.53,.01],[x,1.07,.01]],
      [[x,1.07,.08],[x,1.53,.08],[x,1.53,.46],[x,1.07,.76]],
    ];
    for(const points of panes){const glass=polygon(truck,side===1?points.slice().reverse():points,m.truckGlass);glass.material.side=THREE.DoubleSide;}
    for(const z of [-.79,.045,.71])box(truck,[.012,.45,.013],[side*.713,.81,z],m.truckDark,.002);
    for(const z of [-.42,.46])box(truck,[.024,.035,.13],[side*.728,1.005,z],m.rim,.006);
    box(truck,[.15,.095,1.6],[side*.77,.45,-.04],m.truckDark,.012);
    box(truck,[.14,.055,1.45],[side*.78,.51,-.04],m.rim,.008);
    box(truck,[.15,.12,.19],[side*.81,1.17,.69],m.truckDark,.022);
  }
  // Front windshield slopes up from the hood toward the cab roof.
  polygon(truck,[[-.6,1.105,.82],[.6,1.105,.82],[.6,1.53,.51],[-.6,1.53,.51]],m.truckGlass);
  polygon(truck,[[.59,1.11,-.724],[-.59,1.11,-.724],[-.59,1.53,-.632],[.59,1.53,-.632]],m.truckGlass);
  box(truck,[1.39,.08,1.09],[0,1.62,-.08],m.truck,.025);
  // Open cargo bed and dark liner keep the Ranger readable as a pickup.
  box(truck,[1.26,.055,.88],[0,.78,-1.21],m.truckDark,.009);
  for(const side of [-1,1]){
    box(truck,[.12,.36,1.03],[side*.66,.92,-1.2],m.truck,.016);
    box(truck,[.14,.035,1.07],[side*.66,1.114,-1.2],m.truckDark,.008);
  }
  box(truck,[1.38,.36,.11],[0,.92,-1.69],m.truck,.014);
  box(truck,[1.44,.15,.13],[0,.61,-1.76],m.rim,.015);
  for(const side of [-1,1])box(truck,[.14,.26,.035],[side*.59,.94,-1.755],m.tailLight,.01);
  const rangerLabel=badge('R A N G E R',.8,.14,ART.palette.ranger,'#d7e4e8');
  mesh(truck,rangerLabel.geometry,rangerLabel.material,[0,.96,-1.751],[0,Math.PI,0]);
  // Dark grille with silver bars and Ford oval.
  box(truck,[1.43,.19,.14],[0,.59,1.72],m.truckDark,.019);
  box(truck,[1.29,.31,.035],[0,.89,1.695],m.truckDark,.018);
  for(const y of [.81,.89,.97])box(truck,[.84,.025,.025],[0,y,1.721],m.rim,.004);
  for(const side of [-1,1]){
    box(truck,[.2,.22,.045],[side*.54,.93,1.721],m.headlight,.013);
    box(truck,[.1,.055,.035],[side*.5,.62,1.802],m.headlight,.008);
  }
  box(truck,[.73,.075,.06],[0,.52,1.72],m.rim,.013);
  const ford=badge('Ford',.2,.085,'#254b70','#ffffff','italic bold 75px Georgia');
  mesh(truck,ford.geometry,ford.material,[0,.9,1.744]);
  const plate=badge('RANGER',.39,.085,'#e8eeea','#4d5c62','bold 50px Arial');
  mesh(truck,plate.geometry,plate.material,[0,.65,1.797]);
  // Four chunky all-terrain tires, chamfered rims and six simple spokes.
  for(const side of [-1,1])for(const z of [-1.13,1.15]){
    const x=side*.72,y=.36;
    mesh(truck,new THREE.CylinderGeometry(.34,.34,.2,20),m.rubber,[x,y,z],[0,0,Math.PI/2]);
    mesh(truck,new THREE.CylinderGeometry(.205,.205,.018,16),m.truckDark,[side*.828,y,z],[0,0,Math.PI/2]);
    mesh(truck,new THREE.TorusGeometry(.21,.022,6,20),m.rim,[side*.841,y,z],[0,Math.PI/2,0]);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      branch(truck,[side*.844,y,z],[side*.844,y+Math.sin(a)*.18,z+Math.cos(a)*.18],.025,.018,m.rim,1,4);
    }
    mesh(truck,new THREE.CylinderGeometry(.062,.062,.026,10),m.rim,[side*.852,y,z],[0,0,Math.PI/2]);
    mesh(truck,new THREE.TorusGeometry(.36,.041,5,20,Math.PI),m.truckDark,[side*.745,y,z],[0,Math.PI/2,0]);
  }
  return truck;
}
