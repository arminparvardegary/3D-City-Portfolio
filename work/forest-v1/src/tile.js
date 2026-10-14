import * as THREE from 'three';
import { ART, TILE_SPEC, seededRandom, groundHeight } from './config.js';
import { box, mesh, branch, tint, blobGeometry, mergeStatic } from './geometry.js';
import { buildHouse } from './house.js';
import { buildTree, bush, fern } from './trees.js';

const pathCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.02,0,-.35),new THREE.Vector3(1.85,0,.08),new THREE.Vector3(2.05,0,1.2),new THREE.Vector3(1.43,0,2.85),new THREE.Vector3(1.65,0,5),
]);
const pathPoints=pathCurve.getPoints(90);
function pathDistance(x,z){return Math.sqrt(Math.min(...pathPoints.map(p=>(p.x-x)**2+(p.z-z)**2)));}
function occupied(x,z){return (x>-2.18&&x<.7&&z>-2.3&&z<.82)||pathDistance(x,z)<.48;}

function terrain(parent,m,rand){
  // A slim, accurately square tile; only the underside is softly bevelled.
  box(parent,[10,.43,10],[0,.035,0],m.soil,.065);
  box(parent,[9.99,.075,9.99],[0,.236,0],m.ground,.028,[0,0,0],.83);
  const geo=new THREE.PlaneGeometry(10,10,64,64);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position, colors=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,groundHeight(x,z));
    const shade=.97+Math.sin(x*.9+z*.2)*.018+Math.cos(z*1.1-x*.7)*.018;
    colors.push(shade,shade,shade*.96);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();mesh(parent,geo,m.ground);
  // Fine strata along the earth edge keep the cutaway intentional and light.
  for(const z of [-4.996,4.996]){
    box(parent,[9.88,.022,.008],[0,-.08,z],m.soil,.001,[0,0,0],.85);
    box(parent,[9.88,.018,.008],[0,.17,z],m.soil,.001,[0,0,0],1.13);
  }
  for(const x of [-4.996,4.996]){
    box(parent,[.008,.022,9.88],[x,-.08,0],m.soil,.001,[0,0,0],.85);
    box(parent,[.008,.018,9.88],[x,.17,0],m.soil,.001,[0,0,0],1.13);
  }
  // A ribbon of warm fine gravel, with a clean modular endpoint.
  const p=[],c=[],idx=[],uv=[];
  for(let i=0;i<=90;i++){
    const t=i/90,point=pathCurve.getPoint(t),dir=pathCurve.getTangent(t);
    const width=.48+Math.sin(t*Math.PI)*.11+(t>.9?(t-.9)*1.7:0);
    for(const sign of [-1,1]){
      const jag=(i===90?0:Math.sin(i*1.9)*.025);
      const x=i===90?1.65+.65*sign:point.x+dir.z*(width+jag)*sign,z=i===90?5:Math.min(5,point.z-dir.x*(width+jag)*sign);
      p.push(x,groundHeight(x,z)+.018,z);uv.push(sign,t*4);
      const shade=.95+rand()*.07;c.push(shade,shade,shade);
    }
    if(i<90){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  const path=new THREE.BufferGeometry();path.setAttribute('position',new THREE.Float32BufferAttribute(p,3));path.setAttribute('color',new THREE.Float32BufferAttribute(c,3));path.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));path.setIndex(idx);path.computeVertexNormals();mesh(parent,path,m.path);
  // Worn stepping stones, irregularly set into the path.
  for(let i=0;i<9;i++){
    const t=.14+i*.093,pt=pathCurve.getPoint(t);const x=pt.x+(rand()-.5)*.18,z=pt.z+(rand()-.5)*.12;
    mesh(parent,tint(blobGeometry(i*2.17,1,.15),.94+rand()*.12),m.stone,[x,groundHeight(x,z)+.035,z],[0,rand()*6,0],[.24+rand()*.1,.055,.19+rand()*.06]);
  }
}

function grass(parent,m,rand){
  const positions=[],colors=[],normals=[];
  // Three tapered, bent blades per clump, all batched into one mesh.
  for(let i=0;i<ART.vegetation.grassClumps;i++){
    const x=(rand()-.5)*9.83,z=(rand()-.5)*9.83;
    if(occupied(x,z))continue;
    const patch=(Math.sin(x*2.1+z*1.3)+Math.sin(z*2.8-x*.7)+2)/4;
    const nearEdge=Math.max(Math.abs(x),Math.abs(z))>4.35;
    const nearPlanting=(x+3.5)**2+(z-1.25)**2<1||(x-3.65)**2+(z+.85)**2<1;
    if((!nearEdge&&!nearPlanting)||patch<.6||rand()>.5)continue;
    const h=groundHeight(x,z)+.006;
    for(let j=0;j<3;j++){
      const a=rand()*6.28, len=.025+rand()*.035, w=.004+rand()*.004;
      const dx=Math.cos(a),dz=Math.sin(a), bend=.012+rand()*.018;
      const px=x+(rand()-.5)*.1,pz=z+(rand()-.5)*.1;
      const verts=[[px-dx*w,h,pz-dz*w],[px+dx*w,h,pz+dz*w],[px+dx*w*.4+dz*bend*.5,h+len*.6,pz+dz*w*.4+dx*bend*.5],[px-dx*w*.4+dz*bend*.5,h+len*.6,pz-dz*w*.4+dx*bend*.5],[px+dz*bend,h+len,pz+dx*bend]];
      const shade=.88+rand()*.38;
      for(const k of [0,1,2,0,2,3,3,2,4]){positions.push(...verts[k]);colors.push(shade,shade,k===4?shade*.95:shade*.85);normals.push(0,1,0);}
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const blades=mesh(parent,geo,m.grass);blades.castShadow=false;
  return blades;
}

function details(parent,m,rand){
  // Rounded limestone nestled in the ground, with nearby fern growth.
  const rocks=[[-3.6,3.35,.45],[-3.14,3.5,.25],[3.7,2.9,.4],[3.4,3.2,.22],[-1.6,-3.65,.25]];
  for(const[x,z,s]of rocks)mesh(parent,tint(blobGeometry(x+z,1,.15),.86+rand()*.2),m.stone,[x,groundHeight(x,z)+s*.29,z],[.13,rand()*6,.1],[s,s*.61,s*.76]);
  for(const[x,z,s]of[[-3.6,2.7,.36],[3.4,2.65,.4],[-2.55,-2.7,.32],[.55,-3.5,.3]])fern(parent,m,x,z,s,rand()*6);
  for(const[x,z,s]of[[-3.9,-.6,.48],[-2.8,-3.7,.42],[2.95,-2.5,.48],[3.9,-.15,.35],[-2.5,1.6,.35],[-.4,3.55,.28]])bush(parent,m,rand,x,z,s);
  // Daisies and a handful of buttery wildflowers, composed in little patches.
  const patches=[[-2.9,2.45],[-1.2,3.35],[2.6,2.7],[3.6,1.0],[-3.5,-.2],[.8,-3.5]];
  for(const[px,pz]of patches)for(let i=0;i<8;i++){
    const x=px+(rand()-.5)*.8,z=pz+(rand()-.5)*.7;if(occupied(x,z))continue;
    const y=groundHeight(x,z),h=.12+rand()*.12;
    branch(parent,[x,y,z],[x+.015,y+h,z],.006,.003,m.leaves,.9,4);
    for(let j=0;j<5;j++){
      const a=j*Math.PI*2/5;
      mesh(parent,tint(new THREE.SphereGeometry(1,5,3),1),m.flower,[x+Math.cos(a)*.032,y+h,z+Math.sin(a)*.032],[0,-a,0],[.033,.012,.018]);
    }
    mesh(parent,new THREE.SphereGeometry(.015,6,4),m.gold,[x,y+h+.012,z]);
  }
  // A small fallen log, with exposed end grain and two mushrooms.
  const x=3.4,z=1.4,y=groundHeight(x,z)+.15;
  branch(parent,[x-.45,y,z-.2],[x+.4,y+.02,z+.2],.14,.115,m.bark,.87,10);
  for(const end of [-1,1]){
    const disk=mesh(parent,tint(new THREE.CircleGeometry(.103,10),1.15),m.timber,[x+end*.43,y+.01,z+end*.2]);
    disk.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(end*.9,0,end*.42).normalize());
  }
  for(let i=0;i<3;i++){
    const xx=-3.2+i*.12,zz=1.6+(i%2)*.16,yy=groundHeight(xx,zz),h=.08+i*.018;
    branch(parent,[xx,yy,zz],[xx,yy+h,zz],.014,.011,m.cream,1,6);
    mesh(parent,new THREE.SphereGeometry(.052,10,6,0,Math.PI*2,0,Math.PI/2),m.mushroom,[xx,yy+h,zz],[0,0,.12],[1,.65,1]);
  }
  // Tiny path gravel is deliberately sparse and uses the stone batch.
  for(let i=0;i<90;i++){
    const t=rand(),p=pathCurve.getPoint(t),x=p.x+(rand()-.5)*1.15,z=Math.min(4.96,p.z+(rand()-.5)*.3);
    if(x<.9||z<-.1)continue;
    const r=.012+rand()*.025;
    mesh(parent,tint(new THREE.IcosahedronGeometry(1,0),.9+rand()*.2),m.path,[x,groundHeight(x,z)+.029,z],[0,rand()*6,0],[r,r*.45,r*.7]);
  }
}

export function buildTile(materials) {
  const rand=seededRandom(ART.seed),group=new THREE.Group();group.name='forest-01';group.userData.spec=TILE_SPEC;
  const staticGroup=new THREE.Group();group.add(staticGroup);
  terrain(staticGroup,materials,rand);buildHouse(staticGroup,materials,rand);details(staticGroup,materials,rand);
  mergeStatic(staticGroup);grass(group,materials,rand);
  const trees=[
    {x:-3.1,z:-2.65,height:4.6,radius:1.37,lean:.13},
    {x:1.7,z:-3.38,height:4.05,radius:1.2,lean:-.1},
    {x:-3.55,z:1.25,height:3.0,radius:.87,birch:true,lean:.1},
    {x:3.65,z:-.85,height:3.3,radius:.92,lean:-.12},
  ];
  const canopies=trees.map(spec=>buildTree(group,materials,rand,spec));
  return {group,canopies};
}
