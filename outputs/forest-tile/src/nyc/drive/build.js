import * as THREE from 'three';
import { createKit } from '../../diorama/kit.js';
import { FACADE } from './facades.js';
import { G,CURB,HALF,LANE,WALK,MAN,BKN,NS,AV,BAV,ST,BRIDGE,blocks,network } from './layout.js';

// The city itself (world units): land and water, sidewalks with curbs, street
// markings and crosswalks, traffic lights, street lamps and trees, Central Park,
// the landmarks, and every other block filled with buildings that suit its
// district (midtown and downtown towers, brick walk-ups with water tanks,
// Brooklyn brownstones). Realistic materials, merged per material.
let seed=7;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647),pick=a=>a[Math.floor(rand()*a.length)],range=(a,b)=>a+rand()*(b-a);

export function buildCity({reserved=new Set(),fills=[]}={}){
  seed=7;
  const root=new THREE.Group(),K=createKit({flat:false}),{box,cyl,add,mat}=K;
  const solids=[],occluders=[],loops=[];
  const skin=(color,kind,size=2,extra={})=>{const m=mat(color,{map:FACADE[kind](),roughness:.8,...extra});m.userData.uvSize=size;return m;};
  const glassSkin=c=>skin(c,'glass',2,{metalness:.55,roughness:.12,envMapIntensity:1.3});
  const PAL={brick:['#a3543c','#8f4a37','#b06a50','#9a5b46'].map(c=>skin(c,'brick')),office:['#d9d6cf','#c4c8ce','#e2dccf'].map(c=>skin(c,'office')),
    lime:['#d9ccb3','#e4d9c4','#cbbd9c'].map(c=>skin(c,'limestone')),brown:['#7f5642','#8d6450','#6f4b3a'].map(c=>skin(c,'brownstone')),glass:['#a9c1d8','#9db4c6','#b9cad8','#8fa9c2'].map(glassSkin)};
  const stone=mat('#cfc6b4',{roughness:.85}),cornice=mat('#e6dfd0',{roughness:.8}),roofM=mat('#6d7077',{roughness:.9}),dark=mat('#23262b',{roughness:.6}),
    metal=mat('#9aa0a8',{metalness:.7,roughness:.35}),wood=mat('#7b5a44',{roughness:.85}),greenM=mat('#4f7f3a',{roughness:.95}),copper=mat('#6fae98',{roughness:.5,metalness:.3});
  const occl=(x,z,w,d,h,y=G+CURB)=>occluders.push(new THREE.Box3(new THREE.Vector3(x-w/2,y,z-d/2),new THREE.Vector3(x+w/2,y+h,z+d/2)));
  const top=G+CURB;

  // --- Land, water, waterfront ------------------------------------------------------
  const asphalt=mat('#4b4d53',{map:FACADE.asphalt(),roughness:.92});asphalt.userData.uvSize=14;
  const land=(x0,x1)=>{box(x1-x0,1.4,NS.z1-NS.z0,(x0+x1)/2,G-1.4,0,asphalt);box(x1-x0+.02,1.2,NS.z1-NS.z0+.02,(x0+x1)/2,G-2.6,0,stone);};
  land(MAN.x0,MAN.x1);land(BKN.x0,BKN.x1);
  {const water=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:'#36677f',roughness:.12,metalness:.15,envMapIntensity:1.4}));
    water.position.y=-.9;water.receiveShadow=true;root.add(water);}
  const paving=mat('#bcb8b1',{map:FACADE.paving(),roughness:.85});paving.userData.uvSize=4;
  // Sidewalks are solid for the car; a waterfront strip (low=true) only at street level, so the bridge passes over it.
  const walkRect=(x0,x1,z0,z1,low=false)=>{box(x1-x0,CURB,z1-z0,(x0+x1)/2,G,(z0+z1)/2,paving);solids.push(low?[(x0+x1)/2,(z0+z1)/2,(x1-x0)/2,(z1-z0)/2,1.5]:[(x0+x1)/2,(z0+z1)/2,(x1-x0)/2,(z1-z0)/2]);};
  // Promenades round the island and along the river, with railings.
  const rail=(x0,z0,x1,z1)=>{const len=Math.hypot(x1-x0,z1-z0),n=Math.ceil(len/2.5),ang=Math.atan2(x1-x0,z1-z0);
    add(new THREE.BoxGeometry(.12,.1,len).rotateY(ang),metal,[(x0+x1)/2,top+1.05,(z0+z1)/2]);
    for(let i=0;i<=n;i++){const t=i/n;box(.1,1.05,.1,x0+(x1-x0)*t,top,z0+(z1-z0)*t,metal);}};
  {const e=AV[0]-HALF;walkRect(MAN.x0,e,NS.z0,NS.z1);rail(MAN.x0+.3,NS.z0,MAN.x0+.3,NS.z1);
    walkRect(e,MAN.x1,NS.z0,ST[0]-HALF);walkRect(e,MAN.x1,ST.at(-1)+HALF,NS.z1);rail(MAN.x0,NS.z0+.3,MAN.x1,NS.z0+.3);rail(MAN.x0,NS.z1-.3,MAN.x1,NS.z1-.3);
    walkRect(AV.at(-1)+HALF,MAN.x1,ST[0]-HALF,ST.at(-1)+HALF,true);rail(MAN.x1-.3,NS.z0,MAN.x1-.3,NS.z1);
    walkRect(BKN.x0,BAV[0]-HALF,ST[0]-HALF,ST.at(-1)+HALF,true);rail(BKN.x0+.3,NS.z0,BKN.x0+.3,NS.z1);
    walkRect(BKN.x0,BKN.x1,NS.z0,ST[0]-HALF);walkRect(BKN.x0,BKN.x1,ST.at(-1)+HALF,NS.z1);walkRect(BAV[1]+HALF,BKN.x1,ST[0]-HALF,ST.at(-1)+HALF);}

  // --- Street markings, crosswalks, stop lines ------------------------------------------
  const {nodes,edges}=network();
  const yellow=mat('#e3bd3a',{roughness:.6}),white=mat('#ecebe6',{roughness:.6});
  const seen=new Set();
  for(const e of edges){
    if(e.kind!=='road')continue;const k=[e.a.k,e.b.k].sort().join('|');if(seen.has(k))continue;seen.add(k);
    const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,inner=len-2*(HALF+4);if(inner<=0)continue;
    const cx=(e.a.x+e.b.x)/2,cz=(e.a.z+e.b.z)/2,ang=Math.atan2(fx,fz);
    for(const o of [-.14,.14])add(new THREE.BoxGeometry(.12,.02,inner).rotateY(ang),yellow,[cx+fz*o,G+.005,cz-fx*o]);
  }
  for(const n of nodes){
    for(const e of n.out){
      const dx=e.b.x-n.x,dz=e.b.z-n.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,rx=-fz,rz=fx,ang=Math.atan2(fx,fz);
      // Zebra crossing just outside the crossing, then a stop line on the lane coming in.
      if(n.degree>2)for(let k=-4;k<=4;k++)add(new THREE.BoxGeometry(.55,.02,2.2).rotateY(ang),white,[n.x+fx*(HALF+2.3)+rx*k*1.05,G+.006,n.z+fz*(HALF+2.3)+rz*k*1.05]);
      if(n.degree>2)add(new THREE.BoxGeometry(HALF-.3,.02,.4).rotateY(ang),white,[n.x+fx*(HALF+3.9)-rx*LANE,G+.006,n.z+fz*(HALF+3.9)-rz*LANE]);
    }
  }

  // --- Traffic lights: at every crossing with three or more roads ---------------------
  // One head per road coming in, on the corner to its right, facing the traffic.
  // Roads along z and along x take turns: 20 s cycle.
  const LIGHT={z:{},x:{}};for(const a of ['z','x'])for(const [c,hex] of [['r','#ff3b30'],['y','#ffc93a'],['g','#33e07a']])LIGHT[a][c]=new THREE.MeshStandardMaterial({color:hex,emissive:hex,emissiveIntensity:.05});
  const lights=[];
  for(const n of nodes){if(n.degree<3)continue;lights.push(n);
    for(const e of n.out){
      const dx=e.b.x-n.x,dz=e.b.z-n.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,rx=-fz,rz=fx,axis=Math.abs(fx)>.5?'x':'z';
      // Traffic coming in along this road drives toward the node (direction -f); its right is -r.
      const px=n.x+fx*(HALF+1.2)-rx*(HALF+1.2),pz=n.z+fz*(HALF+1.2)-rz*(HALF+1.2);
      cyl(.1,.12,4.6,8,px,top,pz,dark);
      const hx=px+rx*1.6,hz=pz+rz*1.6;add(new THREE.BoxGeometry(.1,.1,3.2).rotateY(Math.atan2(rx,rz)),dark,[px+rx*.8,top+4.4,pz+rz*.8]);
      add(new THREE.BoxGeometry(.5,1.3,.35).rotateY(Math.atan2(fx,fz)),dark,[hx,top+3.7,hz]);
      ['r','y','g'].forEach((c,k)=>add(new THREE.SphereGeometry(.14,10,8),LIGHT[axis][c],[hx+fx*.2,top+4.12-k*.4,hz+fz*.2]));
    }
  }
  const phase=t=>{const k=t%20;return {z:k<8?'g':k<10?'y':'r',x:k<10?'r':k<18?'g':'y'};};

  // --- Blocks ------------------------------------------------------------------------
  const lampHead=mat('#fff3d6',{emissive:'#ffe2a8',emissiveIntensity:.5});
  const lamp=(x,z,ox,oz)=>{cyl(.09,.13,5.6,8,x,top,z,dark);add(new THREE.BoxGeometry(.08,.08,1.6).rotateY(Math.atan2(ox,oz)),dark,[x+ox*.8,top+5.5,z+oz*.8]);
    add(new THREE.BoxGeometry(.5,.16,.8).rotateY(Math.atan2(ox,oz)),dark,[x+ox*1.6,top+5.38,z+oz*1.6]);box(.4,.04,.6,x+ox*1.6,top+5.3,z+oz*1.6,lampHead);};
  const leafs=['#4e7d36','#5b8c3e','#46703a'].map(c=>mat(c,{roughness:.9})),bark=mat('#5b4636',{roughness:.95});
  const tree=(x,z,s=1,y=top)=>{cyl(.14*s,.2*s,2.6*s,7,x,y,z,bark);for(let k=0;k<4;k++)add(new THREE.IcosahedronGeometry((1.1+rand()*.5)*s,1),pick(leafs),[x+(rand()-.5)*1.4*s,y+(3+rand()*1.4)*s,z+(rand()-.5)*1.4*s]);};
  const streetFurniture=(b,{trees=false}={})=>{
    // Lamps along each side, trees between them; never at the corners.
    for(const [x0,z0,x1,z1,ox,oz] of [[b.x0,b.z0,b.x1,b.z0,0,-1],[b.x0,b.z1,b.x1,b.z1,0,1],[b.x0,b.z0,b.x0,b.z1,-1,0],[b.x1,b.z0,b.x1,b.z1,1,0]]){
      const len=Math.hypot(x1-x0,z1-z0),n=Math.floor((len-8)/14);
      for(let k=0;k<=n;k++){const t=(4+k*((len-8)/Math.max(1,n)))/len,x=x0+(x1-x0)*t-ox*.6,z=z0+(z1-z0)*t-oz*.6;lamp(x,z,ox,oz);
        if(trees&&k<n){const t2=t+7/len;tree(x0+(x1-x0)*t2-ox*1.4,z0+(z1-z0)*t2-oz*1.4,.8);}}
    }
  };

  // Building types: each returns its height. (x, z) is the centre, on the sidewalk.
  const storefront=(x,z,w,d)=>{const glass=mat('#2c3440',{roughness:.15,metalness:.4});box(w+.06,2.6,d+.06,x,top,z,glass);box(w+.3,.3,d+.3,x,top+2.6,z,cornice);};
  const T={
    walkup(x,z,w,d,h){storefront(x,z,w,d);box(w,h-2.9,d,x,top+2.9,z,pick(PAL.brick));box(w+.4,.6,d+.4,x,top+h,z,cornice);box(w,.4,d,x,top+h+.6,z,roofM);
      // Water tank on legs, and a fire escape down one side.
      const tx=x+(rand()-.5)*w*.4,tz=z+(rand()-.5)*d*.4,ty=top+h+.9;for(const [a,c] of [[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]])box(.15,1.6,.15,tx+a,ty,tz+c,wood);
      cyl(1.1,1.1,2.2,12,tx,ty+1.6,tz,wood);add(new THREE.ConeGeometry(1.25,.9,12).translate(0,.45,0),wood,[tx,ty+3.8,tz]);
      const fz=z+d/2+.45;for(let y=top+4.4;y<top+h-.5;y+=2.2){box(w*.45,.08,.9,x,y,fz,dark);box(w*.45,.6,.05,x,y+.08,fz+.42,dark);}
      return h+1.5;},
    office(x,z,w,d,h){storefront(x,z,w,d);box(w,h-2.9,d,x,top+2.9,z,pick(PAL.office));box(w+.2,.4,d+.2,x,top+h,z,roofM);box(w*.4,1.6,d*.4,x+w*.15,top+h+.4,z,metal);return h+2;},
    limestone(x,z,w,d,h){const m=pick(PAL.lime);const h1=h*.55,h2=h*.82;box(w,h1,d,x,top,z,m);box(w-3,h2-h1,d-3,x,top+h1,z,m);box(w-6,h-h2,d-6,x,top+h2,z,m);
      for(const [hh,ww,dd] of [[h1,w,d],[h2,w-3,d-3],[h,w-6,d-6]])box(ww+.3,.4,dd+.3,x,top+hh,z,cornice);return h+.4;},
    glass(x,z,w,d,h){const m=pick(PAL.glass);box(w,h,d,x,top,z,m);box(w+.2,.5,d+.2,x,top+h,z,metal);if(rand()<.5)box(w*.5,2.5,d*.5,x,top+h+.5,z,metal);return h+.5;},
    brownstone(x,z,w,d,h,front){box(w,h,d,x,top,z,pick(PAL.brown));box(w+.3,.5,d+.3,x,top+h,z,cornice);
      // A stoop up to the front door.
      const [fx,fz]=front;for(let k=0;k<5;k++)box(fz?1.6:.5,.3*(k+1),fz?.5:1.6,x+fx*(w/2+.25+k*.5)*(fx?1:0),top,z+fz*(d/2+.25+k*.5)*(fz?1:0),stone);
      return h+.5;},
  };
  // Fill a rectangle with buildings of a district: lots along its longer side.
  function fill(r,zone){
    const w=r.x1-r.x0,d=r.z1-r.z0,alongX=w>=d,len=alongX?w:d,depth=alongX?d:w,n=Math.max(1,Math.min(4,Math.round(len/(zone==='bkn'?6:13))));
    let at=alongX?r.x0:r.z0;
    for(let k=0;k<n;k++){
      const span=len/n,c=at+span/2;at+=span;
      const [bx,bz,bw,bd]=alongX?[c,(r.z0+r.z1)/2,span-.5,depth]:[(r.x0+r.x1)/2,c,depth,span-.5];
      let h,type;
      if(zone==='tall'){type=pick(['glass','glass','limestone','office']);h=type==='glass'?range(50,95):type==='limestone'?range(40,75):range(25,42);}
      else if(zone==='mid'){type=pick(['office','walkup','limestone','glass']);h=type==='walkup'?range(12,18):range(20,38);}
      else if(zone==='low'){type=pick(['walkup','walkup','office']);h=type==='walkup'?range(10,16):range(16,24);}
      else {type='brownstone';h=range(8,11);}
      const front=alongX?[0,1]:[1,0];
      const hh=T[type](bx,bz,bw,bd,h,front);occl(bx,bz,bw,bd,hh);
    }
  }

  // Landmarks (scaled to sit well with the car and the streets).
  const LM={};
  LM.empire=(b)=>{const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,m=PAL.lime[0];let y=top;
    for(const [w,h] of [[22,10],[18,34],[14,48],[10.5,18],[7.5,8],[5.2,5]]){box(w,h,w,x,y,z,m);box(w+.4,.5,w+.4,x,y+h,z,cornice);y+=h+.5;}
    cyl(1.6,2.6,7,12,x,y,z,metal);cyl(.3,.45,16,8,x,y+7,z,metal);occl(x,z,22,22,y-top+23);};
  LM.chrysler=(b)=>{const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,m=PAL.lime[1];let y=top;
    for(const [w,h] of [[22,12],[17,16],[13,54]]){box(w,h,w,x,y,z,m);box(w+.4,.5,w+.4,x,y+h,z,cornice);y+=h+.5;}
    const crown=[[7.6,0],[7.6,3],[6.2,3],[6.2,6.5],[4.8,6.5],[4.8,9.8],[3.3,9.8],[3.3,12.4],[1.8,12.4],[1.8,14],[.6,14]].map(([r,h])=>new THREE.Vector2(r,h));
    add(new THREE.LatheGeometry(crown,4).rotateY(Math.PI/4),mat('#d8dde3',{metalness:.85,roughness:.2,envMapIntensity:1.5}),[x,y,z]);
    add(new THREE.ConeGeometry(.9,14,8).translate(0,7,0),metal,[x,y+14,z]);occl(x,z,22,22,y-top+28);};
  LM.wtc=(b)=>{const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,gm=PAL.glass[3];box(18,9,18,x,top,z,gm);
    const h=118,g=new THREE.CylinderGeometry(6.5,12.2,h,4,1).translate(0,h/2,0),p=g.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getY(i)<.01){const a=Math.atan2(p.getX(i),p.getZ(i))+Math.PI/4,r=Math.hypot(p.getX(i),p.getZ(i));p.setXYZ(i,Math.sin(a)*r,p.getY(i),Math.cos(a)*r);}
    add(g.toNonIndexed(),gm,[x,top+9,z]);cyl(2.4,2.4,2,12,x,top+9+h,z,metal);cyl(.35,.6,28,8,x,top+11+h,z,metal);occl(x,z,18,18,h+40);};
  LM.dome=(b)=>{const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,m=PAL.lime[2];box(18,44,18,x,top,z,m);box(18.4,.6,18.4,x,top+44,z,cornice);
    cyl(5.5,5.5,4,16,x,top+44.6,z,m);add(new THREE.SphereGeometry(5.5,24,12,0,Math.PI*2,0,Math.PI/2),copper,[x,top+48.6,z]);cyl(.8,.8,2.4,10,x,top+54,z,copper);add(new THREE.ConeGeometry(.8,2.6,10).translate(0,1.3,0),copper,[x,top+56.4,z]);
    occl(x,z,18,18,59);};
  // Central Park: grass, paths, a pond, trees, a low stone wall.
  const park=(b,{pond=false}={})=>{const grass=mat('#5f8f3f',{map:FACADE.grass(),roughness:.95});grass.userData.uvSize=6;
    const ix0=b.x0+WALK,ix1=b.x1-WALK,iz0=b.z0+WALK,iz1=b.z1-WALK;box(ix1-ix0,.08,iz1-iz0,(ix0+ix1)/2,top,(iz0+iz1)/2,grass);
    for(const [x0,z0,x1,z1] of [[ix0,iz0,ix1,iz0],[ix0,iz1,ix1,iz1],[ix0,iz0,ix0,iz1],[ix1,iz0,ix1,iz1]])box(Math.abs(x1-x0)||.4,.6,Math.abs(z1-z0)||.4,(x0+x1)/2,top,(z0+z1)/2,stone);
    // A path across the park, corner to corner.
    const path=mat('#d8cdb6',{roughness:.95});add(new THREE.BoxGeometry(2.2,.1,Math.hypot(ix1-ix0,iz1-iz0)).rotateY(Math.atan2(ix1-ix0,iz1-iz0)),path,[(ix0+ix1)/2,top+.06,(iz0+iz1)/2]);
    if(pond){const p=new THREE.Mesh(new THREE.CircleGeometry(7,40).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:'#3b6f86',roughness:.1,metalness:.2}));p.position.set((ix0+ix1)/2+3,top+.1,(iz0+iz1)/2-2);root.add(p);}
    for(let k=0;k<26;k++){const x=range(ix0+2,ix1-2),z=range(iz0+2,iz1-2);if(pond&&Math.hypot(x-(ix0+ix1)/2-3,z-(iz0+iz1)/2+2)<9)continue;tree(x,z,range(.9,1.3),top+.08);}
    for(let k=0;k<4;k++){const x=range(ix0+3,ix1-3),z=range(iz0+3,iz1-3);box(1.8,.45,.6,x,top+.08,z,wood);}
  };
  const LANDMARK={'1,3':'empire','2,2':'chrysler','3,5':'wtc','3,1':'dome'};

  for(const b of blocks()){
    const key=b.i+','+b.j;if(reserved.has(key)){continue;}
    walkRect(b.x0,b.x1,b.z0,b.z1);
    const inner={x0:b.x0+WALK,x1:b.x1-WALK,z0:b.z0+WALK,z1:b.z1-WALK};
    loops.push({x0:b.x0+1,x1:b.x1-1,z0:b.z0+1,z1:b.z1-1,y:top});
    if(b.borough==='man'&&b.i<=1&&b.j<=1){park(b,{pond:b.i===0&&b.j===1});streetFurniture(b);continue;}
    streetFurniture(b,{trees:b.borough==='bkn'||b.i===0});
    if(LANDMARK[key]){LM[LANDMARK[key]](b);continue;}
    const zone=b.borough==='bkn'?'bkn':(b.i>=1&&b.i<=3&&b.j>=1&&b.j<=3)||(b.i>=2&&b.j>=4)?'tall':b.i===0?'low':'mid';
    fill(inner,zone);
  }
  for(const r of fills)fill(r,r.zone??'low');

  // --- Liberty Island, in the harbour south of the bridge -----------------------------
  {const x=68,z=104,grass=mat('#5f8f3f',{roughness:.95});
    const isl=new THREE.CylinderGeometry(11,12.5,2.2,40);add(isl,stone,[x,-1.6,z]);add(new THREE.CylinderGeometry(10.6,10.6,.2,40),grass,[x,-.45,z]);
    const star=new THREE.Shape();for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=i%2?5.4:7.6;star[i?'lineTo':'moveTo'](Math.sin(a)*r,Math.cos(a)*r);}
    add(new THREE.ExtrudeGeometry(star,{depth:1.6,bevelEnabled:false}).rotateX(-Math.PI/2),stone,[x,-.35,z]);
    let y=1.25;box(6.4,1.2,6.4,x,y,z,stone);y+=1.2;const ash=mat('#cbbd9c',{map:FACADE.ashlar(),roughness:.9});ash.userData.uvSize=3;box(4.8,7.6,4.8,x,y,z,ash);y+=7.6;box(5.6,.9,5.6,x,y,z,cornice);y+=.9;
    const s=2.6,P=(g,m,[px,py,pz],r=[0,0,0])=>add(g.scale(s,s,s),m,[x+px*s,y+py*s,z+pz*s],r);
    P(new THREE.LatheGeometry([[.7,0],[.62,1.2],[.5,2.6],[.42,3.4],[.3,3.8],[0,3.9]].map(([r,h])=>new THREE.Vector2(r,h)),16),copper,[0,0,0]);
    P(new THREE.SphereGeometry(.32,16,12),copper,[0,4.15,0]);
    P(new THREE.CylinderGeometry(.11,.13,1.7,8).translate(0,.85,0).rotateZ(-.18),copper,[.38,3.4,0]);
    P(new THREE.SphereGeometry(.17,12,8),mat('#ffb547',{emissive:'#ff9a2a',emissiveIntensity:1}),[.68,5.45,0]);
    for(let k=0;k<7;k++){const a=(k-3)*.42;P(new THREE.ConeGeometry(.06,.45,6).translate(0,.22,0).rotateX(Math.cos(a)*.9).rotateZ(-Math.sin(a)*.9),copper,[Math.sin(a)*.3,4.3,Math.cos(a)*.3]);}
    P(new THREE.BoxGeometry(.4,.55,.12).rotateZ(.3),copper,[-.48,2.9,.15]);
    occl(x,z,7,7,y+16,-1);}

  K.finish(root);
  root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});
  let lightTime=0;
  return {root,solids,occluders,loops,phase:()=>phase(lightTime),
    update(dt){lightTime+=dt;const ph=phase(lightTime);for(const a of ['z','x'])for(const c of ['r','y','g'])LIGHT[a][c].emissiveIntensity=ph[a]===c?2:.05;}};
}
