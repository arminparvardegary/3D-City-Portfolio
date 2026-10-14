import * as THREE from 'three';
import { seededRandom } from '../config.js';
import { TILE } from './units.js';
import { THEME } from './theme.js';
import { box, mesh, tint, mergeStatic } from '../geometry.js';
import { RIVER } from './terrain.js';
import { buildingMaterials, house, createForest } from './buildings.js';
import { asphaltMap, woodMap, pavingMap, worldUV } from './textures.js';

// The district: one loop road with timber bridges over the river, a calm park
// with a coworking pavilion, the creative campus, a waterfront boardwalk with
// docks and cafés, cabins on the foothills and a lighthouse on the east shore.
// Coordinates are world units; the map is 150 x 100 with tile (7, 4) at the origin.
const G=TILE.slab;

// Work experience: one studio each, newest first.
export const STUDIOS=[
  {id:'rush',name:'Rush Graphics',role:'Senior Design Engineer · Senior Frontend Developer',years:'2024 – 2026',place:'USA · remote',accent:'#ff6b5e'},
  {id:'hindra',name:'Hindra Studio',role:'Lead Designer · Frontend Developer',years:'2023 – 2024',place:'Turkey',accent:'#5ab4f0'},
  {id:'aaq',name:'AAQ Real Estate',role:'Design Engineer · Frontend Developer',years:'2021 – 2022',place:'United Kingdom',accent:'#3fb8a8'},
  {id:'bigup',name:'Big Uppetite',role:'Design Engineer · Junior Frontend Developer',years:'2019 – 2020',place:'Australia',accent:'#ffc93a'},
];

export const LOOP={x0:-40,x1:50,z0:-10,z1:30,half:2.2,walk:.9};

function materials(prep){
  const W=THEME.wood,B=THEME.buildings,R=THEME.road,P=THEME.park;
  const make=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,vertexColors:true,...extra});prep?.(m);return m;};
  return {
    asphalt:make(R.asphalt,{map:asphaltMap(),roughness:.92}),mark:make(R.mark),walk:make(R.walk,{map:pavingMap()}),deck:make(W.deck,{map:woodMap()}),deckDark:make(W.deckDark,{map:woodMap()}),post:make(W.post),
    gravel:make(P.gravel,{map:asphaltMap()}),paving:make(B.plaza,{map:pavingMap()}),water:make(THEME.water.river,{roughness:.06}),stone:make(P.stone),
    timber:make(B.timber,{map:woodMap()}),timberDark:make(B.timberDark,{map:woodMap()}),concrete:make(B.concrete,{roughness:.92}),glass:make(B.glass,{roughness:.06,metalness:.55}),
    greenRoof:make(B.greenRoof),frame:make(B.frame),iron:make(P.iron,{roughness:.55}),lamp:make(P.lamp,{emissive:P.lampGlow,emissiveIntensity:.7}),
    white:make('#ffffff'),red:make('#e9574f'),dark:make('#3a4255'),
    umbrella:B.awnings.map(c=>make(c)),cushion:make('#f6efe2'),
  };
}
// A plain box with no bevel (cheap), tinted for merging.
const blk=(p,m,[w,h,d],[x,y,z],ry=0)=>mesh(p,tint(new THREE.BoxGeometry(w,h,d)),m,[x,y,z],[0,ry,0]);

// A sign with crisp text, drawn once into a texture.
function signMaterial(text,accent,{w=1024,h=192,dark=false}={}){
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  x.fillStyle=dark?'#2f3650':'#ffffff';x.fillRect(0,0,w,h);x.fillStyle=accent;x.fillRect(0,h-16,w,16);
  x.fillStyle=dark?'#ffffff':'#2f3650';x.font=`700 ${Math.round(h*.46)}px "DM Sans", "Helvetica Neue", Arial, sans-serif`;x.textAlign='center';x.textBaseline='middle';
  x.fillText(text.toUpperCase(),w/2,h*.46);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  return new THREE.MeshStandardMaterial({map,roughness:.5});
}

// --- Roads -----------------------------------------------------------------
function buildRoads(parent,M){
  const {x0,x1,z0,z1,half,walk}=LOOP,top=.135,wt=.17,mt=.139;
  const seg=(ax,a,b,c)=>{const L=b-a,mid=(a+b)/2;
    if(ax==='x'){blk(parent,M.asphalt,[L,top-G,2*half],[mid,(G+top)/2,c]);for(const s of [-1,1])blk(parent,M.walk,[L,wt-G,walk],[mid,(G+wt)/2,c+s*(half+walk/2)]);}
    else{blk(parent,M.asphalt,[2*half,top-G,L],[c,(G+top)/2,mid]);for(const s of [-1,1])blk(parent,M.walk,[walk,wt-G,L],[c+s*(half+walk/2),(G+wt)/2,mid]);}
    // Dashed centre line.
    for(let t=a+3.4;t<b-3.4;t+=1.6){if(ax==='x')blk(parent,M.mark,[.7,mt-top,.08],[t,(top+mt)/2,c]);else blk(parent,M.mark,[.08,mt-top,.7],[c,(top+mt)/2,t]);}
  };
  const o=half+walk;
  seg('x',x0-o,x1+o,z0);seg('x',x0-o,x1+o,z1);seg('z',z0+o,z1-o,x0);seg('z',z0+o,z1-o,x1);
  // Corners: an asphalt square (sidewalks already meet along the outer edges).
  for(const [x,z] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1]])blk(parent,M.asphalt,[2*half,top-G+.001,2*half],[x,(G+top)/2+.0005,z]);
  // Timber road bridges where the loop crosses the river.
  for(const z of [z0,z1]){
    const w=2*o+.4,cx=(RIVER.x0+RIVER.x1)/2,span=RIVER.x1-RIVER.x0+1.2;
    blk(parent,M.deckDark,[span,.4,w],[cx,G-.2,z]);
    for(const s of [-1,1]){blk(parent,M.post,[span+.4,.12,.12],[cx,wt+.45,z+s*(o+.05)]);
      for(let x=-span/2;x<=span/2+.01;x+=span/3)blk(parent,M.post,[.12,.5,.12],[cx+x,wt+.22,z+s*(o+.05)]);}
  }
}

// --- Studios (work experience) --------------------------------------------
function entrance(g,M,x,z,yaw,accent){
  const e=new THREE.Group();e.position.set(x,0,z);e.rotation.y=yaw;g.add(e);
  blk(e,M.dark,[1.3,1.5,.08],[0,G+.75,0]);blk(e,M.white,[2.2,.1,1.3],[0,G+1.65,.55]);
  const pad=new THREE.Mesh(new THREE.RingGeometry(.55,.75,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.85,toneMapped:false}));
  pad.position.set(0,G+.03,1.8);pad.userData.pulse=true;pad.userData.keep=true;e.add(pad);
  return pad;
}
function roofSign(g,studio,y,w){
  const s=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.19),signMaterial(studio.name,studio.accent));
  s.position.set(0,y+w*.1+.1,0);s.rotation.y=Math.PI/4;s.castShadow=true;s.userData.keep=true;g.add(s);
  blk(g,new THREE.MeshStandardMaterial({color:'#3a4255'}),[.08,w*.12,.08],[0,y+.05,0]);
  return s;
}
// Rush Graphics: a glass base with a cantilevered timber volume above, green roof.
function studioRush(parent,M,S,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  blk(g,M.glass,[11,2.2,7],[0,G+1.1,0]);for(let i=-5;i<=5;i+=1.1)blk(g,M.frame,[.08,2.2,7.06],[i,G+1.1,0]);
  blk(g,M.concrete,[11.4,.25,7.4],[0,G+2.3,0]);
  blk(g,M.timber,[9,2,6.2],[1.6,G+3.45,-.6]);for(let i=-2.6;i<=6;i+=.55)blk(g,M.timberDark,[.07,2,6.26],[i,G+3.45,-.6]);
  blk(g,M.glass,[9.06,.9,6.26],[1.6,G+3.5,-.6]);blk(g,M.greenRoof,[9.3,.2,6.5],[1.6,G+4.55,-.6]);
  const pad=entrance(g,M,-2,3.55,0,S.accent);const sign=roofSign(g,S,G+4.65,6.5);
  return {group:g,box:[x+.4,z-.3,5.9,3.9],pad,sign,front:[x-2,z+5.5]};
}
// Hindra Studio: a long artist's pavilion with a sawtooth roof of north lights.
function studioHindra(parent,M,S,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  blk(g,M.concrete,[10,2.4,6],[0,G+1.2,0]);blk(g,M.glass,[8.6,1.5,.06],[0,G+1.05,3.02]);
  for(let i=0;i<5;i++){const sx=-4+i*2;
    const s=new THREE.Shape();s.moveTo(-1,0);s.lineTo(1,0);s.lineTo(1,1.1);s.closePath();
    mesh(g,tint(new THREE.ExtrudeGeometry(s,{depth:6.2,bevelEnabled:false})),M.timber,[sx,G+2.4,-3.1]);
    blk(g,M.glass,[.06,1.05,6.2],[sx+.98,G+2.95,0]);}
  const pad=entrance(g,M,0,3.05,0,S.accent);const sign=roofSign(g,S,G+3.6,5.5);
  return {group:g,box:[x,z,5.2,3.2],pad,sign,front:[x,z+5]};
}
// AAQ: a glass waterfront office with deep timber terraces on each floor.
function studioAAQ(parent,M,S,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  for(let f=0;f<3;f++){const y=G+f*1.25;blk(g,M.glass,[7-f*.6,1.2,5.4-f*.4],[0,y+.6,-f*.2]);blk(g,M.concrete,[8.2-f*.6,.12,6.4-f*.4],[0,y+1.26,f*.1]);
    blk(g,M.deck,[8-f*.6,.04,1.1],[0,y+1.34,2.55-f*.1]);for(const s of [-1,1])blk(g,M.frame,[.06,1.2,5.4-f*.4],[s*(3.5-f*.3),y+.6,-f*.2]);}
  blk(g,M.greenRoof,[6,.18,4.4],[0,G+3.85,-.4]);
  const pad=entrance(g,M,-1.6,2.75,0,S.accent);const sign=roofSign(g,S,G+3.95,5.2);
  return {group:g,box:[x,z,4.2,3.3],pad,sign,front:[x-1.6,z+4.6]};
}
// Big Uppetite: playful stacked volumes in warm colours.
function studioBigUp(parent,M,S,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);const C=M.umbrella;
  blk(g,M.concrete,[7.4,1.9,5.6],[0,G+.95,0]);blk(g,M.glass,[6.4,1.2,.06],[0,G+.85,2.82]);
  blk(g,C[1],[4.2,1.6,4.2],[-1.4,G+2.7,-.4]);blk(g,C[0],[3.4,1.3,3.6],[1.9,G+2.55,.3]);blk(g,C[2],[2.6,1.1,2.6],[-.9,G+4.05,-.6]);
  for(const [w,d,px,y,pz] of [[4.2,4.2,-1.4,G+3.5,-.4],[3.4,3.6,1.9,G+3.2,.3]])blk(g,M.white,[w+.1,.1,d+.1],[px,y+.01,pz]);
  const pad=entrance(g,M,1.4,2.85,0,S.accent);const sign=roofSign(g,S,G+4.7,4.8);
  return {group:g,box:[x,z,3.9,3],pad,sign,front:[x+1.4,z+4.7]};
}

// --- Small architecture ------------------------------------------------------
function cafe(parent,M,x,z,yaw,seed){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;parent.add(g);
  blk(g,M.timber,[4,1.6,3],[0,G+.8,0]);blk(g,M.glass,[3.4,1,.06],[0,G+.75,1.52]);blk(g,M.white,[4.6,.14,3.8],[0,G+1.68,.3]);
  for(let i=0;i<3;i++){const tx=-1.4+i*1.4,tz=2.8+(i%2)*.4;
    mesh(g,new THREE.CylinderGeometry(.3,.3,.05,12),M.white,[tx,G+.55,tz]);mesh(g,new THREE.CylinderGeometry(.04,.04,.55,6),M.iron,[tx,G+.27,tz]);
    mesh(g,new THREE.CylinderGeometry(.03,.03,1.5,6),M.iron,[tx,G+.95,tz]);mesh(g,new THREE.ConeGeometry(.75,.35,8),M.umbrella[(seed+i)%4],[tx,G+1.75,tz]);
    for(const s of [-1,1])blk(g,M.cushion,[.32,.32,.32],[tx+s*.45,G+.18,tz]);}
  return [x,z,2.5,2.4];
}
function coworking(parent,M,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  blk(g,M.paving,[8,.06,6],[0,G+.03,0]);blk(g,M.glass,[6,1.8,4],[0,G+.96,0]);
  blk(g,M.white,[8,.18,6],[0,G+1.95,0]);for(const [px,pz] of [[-3.7,-2.7],[3.7,-2.7],[-3.7,2.7],[3.7,2.7]])blk(g,M.white,[.14,1.85,.14],[px,G+.96,pz]);
  for(let i=0;i<3;i++)blk(g,M.timber,[1.6,.5,.8],[-1.8+i*1.8,G+.3,0]);
  return [x,z,4,3];
}
function cabin(parent,M,x,z,yaw){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;parent.add(g);
  const s=new THREE.Shape();s.moveTo(-1.5,0);s.lineTo(0,2.6);s.lineTo(1.5,0);s.closePath();
  mesh(g,tint(new THREE.ExtrudeGeometry(s,{depth:3,bevelEnabled:false})),M.timber,[0,G,-1.5]);
  const r=new THREE.Shape();r.moveTo(-1.75,-.05);r.lineTo(0,2.75);r.lineTo(1.75,-.05);r.lineTo(1.55,-.05);r.lineTo(0,2.45);r.lineTo(-1.55,-.05);r.closePath();
  mesh(g,tint(new THREE.ExtrudeGeometry(r,{depth:3.3,bevelEnabled:false})),M.dark,[0,G,-1.65]);
  const gl=new THREE.Shape();gl.moveTo(-.9,.1);gl.lineTo(0,1.6);gl.lineTo(.9,.1);gl.closePath();
  mesh(g,tint(new THREE.ShapeGeometry(gl)),M.glass,[0,G,1.52]);
  blk(g,M.deck,[3.2,.1,1.4],[0,G+.05,2.2]);
  return [x,z,1.9,2.2];
}
function lighthouse(parent,M,x,z){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  mesh(g,new THREE.CylinderGeometry(1.4,1.6,.5,16),M.stone,[0,G+.25,0]);
  for(let i=0;i<5;i++)mesh(g,new THREE.CylinderGeometry(.85-i*.08,.9-i*.08,1.2,16),i%2?M.red:M.white,[0,G+1.1+i*1.2,0]);
  mesh(g,new THREE.CylinderGeometry(.62,.62,.7,12),M.lamp,[0,G+7.25,0]);mesh(g,new THREE.ConeGeometry(.8,.8,12),M.red,[0,G+8,0]);
  return [x,z,1.6,1.6];
}
function bench(parent,M,x,z,yaw){
  const g=new THREE.Group();g.position.set(x,G,z);g.rotation.y=yaw;parent.add(g);
  blk(g,M.deck,[.95,.06,.32],[0,.3,0]);blk(g,M.deck,[.95,.24,.05],[0,.47,-.15]);for(const s of [-1,1])blk(g,M.iron,[.05,.3,.3],[s*.4,.15,0]);
}
function lampPost(parent,M,x,z){mesh(parent,new THREE.CylinderGeometry(.03,.04,1.4,8),M.iron,[x,G+.7,z]);mesh(parent,new THREE.SphereGeometry(.1,12,8),M.lamp,[x,G+1.46,z]);}
function footbridge(parent,M,x0,x1,z){
  const n=7,L=x1-x0;
  for(let i=0;i<n;i++){const t=(i+.5)/n,y=G+.12+Math.sin(t*Math.PI)*.55;blk(parent,M.deck,[L/n+.04,.12,1.7],[x0+L*t,y,z]);
    for(const s of [-1,1]){blk(parent,M.post,[.08,.55,.08],[x0+L*t,y+.32,z+s*.82]);blk(parent,M.post,[L/n+.04,.06,.06],[x0+L*t,y+.6,z+s*.82]);}}
}

export function buildDistrict({bounds,m,prep}){
  const M=materials(prep),BM=buildingMaterials(prep),forest=createForest(prep,m),rand=seededRandom(77);
  const root=new THREE.Group();root.name='district';
  const zones={};const zone=n=>{if(!zones[n]){zones[n]=new THREE.Group();zones[n].name=n;root.add(zones[n]);}return zones[n];};
  const boxes=[],circles=[],benches=[],studios=[];
  const solid=(b)=>{if(b)boxes.push(b);};
  const tree=(x,z,kind,h)=>{forest.add(x,z,{kind,h});circles.push([x,z,kind==='pine'?.25:.22]);};

  buildRoads(zone('roads'),M);

  // Park (west of the river, inside the loop): open lawn, an oval path, a pond, a
  // fountain plaza, a straight walk to the footbridge and a glass coworking pavilion.
  const park=zone('park'),pc=[-16,10];
  const ring=new THREE.Shape();ring.absellipse(0,0,14,9,0,Math.PI*2,false);const hole=new THREE.Path();hole.absellipse(0,0,13.1,8.1,0,Math.PI*2,true);ring.holes.push(hole);
  mesh(park,tint(new THREE.ExtrudeGeometry(ring,{depth:.016,bevelEnabled:false,curveSegments:64}).rotateX(-Math.PI/2)),M.gravel,[pc[0],G,pc[1]]);
  blk(park,M.gravel,[RIVER.x0-(LOOP.x0+3.1),.012,1],[(LOOP.x0+3.1+RIVER.x0)/2,G+.006,pc[1]]);
  mesh(park,new THREE.CylinderGeometry(2.4,2.4,.03,40),M.paving,[pc[0],G+.015,pc[1]]);
  mesh(park,new THREE.CylinderGeometry(1,1.08,.32,32),M.stone,[pc[0],G+.16,pc[1]]);mesh(park,new THREE.CylinderGeometry(.85,.85,.02,32),M.water,[pc[0],G+.3,pc[1]]);
  mesh(park,new THREE.CylinderGeometry(.1,.13,.6,12),M.stone,[pc[0],G+.55,pc[1]]);circles.push([pc[0],pc[1],1.15]);
  const pond=new THREE.Shape();pond.absellipse(0,0,5.5,3.4,0,Math.PI*2,false);
  mesh(park,tint(new THREE.ShapeGeometry(pond,48).rotateX(-Math.PI/2)),M.water,[-27,G+.012,0]);circles.push([-27,0,3.6],[-24,1,2.8],[-30,-1,2.8]);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;mesh(park,new THREE.DodecahedronGeometry(.32+rand()*.18,0),M.stone,[-27+Math.cos(a)*5.7,G+.1,Math.sin(a)*3.6]);}
  solid(coworking(park,M,-1,20));
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.3;const bx=pc[0]+Math.cos(a)*14.9,bz=pc[1]+Math.sin(a)*9.9;bench(park,M,bx,bz,Math.atan2(pc[0]-bx,pc[1]-bz));benches.push([bx,bz,Math.atan2(pc[0]-bx,pc[1]-bz)]);circles.push([bx,bz,.45]);}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;lampPost(park,M,pc[0]+Math.cos(a)*12.5,pc[1]+Math.sin(a)*7.6);}
  // Trees cluster at the park's edges, leaving the middle open.
  for(let i=0;i<46;i++){const a=rand()*Math.PI*2,r=1.05+rand()*.25,x=pc[0]+Math.cos(a)*16.5*r,z=pc[1]+Math.sin(a)*11.5*r;
    if(x<LOOP.x0+4||x>RIVER.x0-1.5||z<LOOP.z0+4||z>LOOP.z1-4)continue;if(Math.hypot(x+1,z-20)<5.5)continue;tree(x,z,rand()<.35?'pine':'round',1.9+rand()*.9);}

  // Campus (east of the river): Rush Graphics, Hindra Studio, a paved courtyard and a riverside café.
  const campus=zone('campus');
  blk(campus,M.paving,[20,.02,10],[30,G+.01,13.5]);
  const rush=studioRush(campus,M,STUDIOS[0],24,2),hindra=studioHindra(campus,M,STUDIOS[1],40,17);
  studios.push({...STUDIOS[0],...rush},{...STUDIOS[1],...hindra});solid(rush.box);solid(hindra.box);
  solid(cafe(campus,M,16,22,-Math.PI/2,1));
  for(const [x,z] of [[22,14],[26,17],[31,12],[34,18],[45,4],[46,10],[15,-4],[15,9],[18,-5],[44,24]])tree(x,z,'round',2+rand()*.6);
  for(const [x,z,y] of [[24,16,0],[29,15,Math.PI],[33,15,0]]){bench(campus,M,x,z,y);benches.push([x,z,y]);}
  footbridge(zone('bridges'),M,RIVER.x0-1.2,RIVER.x1+1.2,10);footbridge(zone('bridges'),M,RIVER.x0-1.2,RIVER.x1+1.2,20);

  // Waterfront: a timber boardwalk along the south coast, docks into the sea,
  // cafés with umbrellas, the AAQ and Big Uppetite studios, benches facing the water.
  const front=zone('waterfront'),bz=51.2,{x0,x1,z1}=bounds;
  blk(front,M.deck,[x1-x0-10,.1,3.4],[(x0+x1)/2,G+.05,bz]);
  for(let x=x0+5.5;x<x1-5;x+=1.2)blk(front,M.deckDark,[.04,.012,3.4],[x,G+.106,bz]);
  const moorings=[];
  for(const dx of [-44,-18,6,14,30,50]){
    blk(front,M.deck,[1.8,.12,11],[dx,G-.02,z1+3.6]);for(const s of [-1,1])for(let k=0;k<4;k++)mesh(front,new THREE.CylinderGeometry(.09,.09,1.4,6),M.post,[dx+s*.95,-.35,z1-.6+k*2.8]);
    moorings.push([dx+2.4,z1+5,Math.PI/2+(dx%3)*.02],[dx-2.4,z1+8,Math.PI/2]);
  }
  const aaq=studioAAQ(front,M,STUDIOS[2],32,41),bigup=studioBigUp(front,M,STUDIOS[3],-26,41);
  studios.push({...STUDIOS[2],...aaq},{...STUDIOS[3],...bigup});solid(aaq.box);solid(bigup.box);
  solid(cafe(front,M,-6,44,0,2));solid(cafe(front,M,52,43,0,0));
  for(let x=x0+9;x<x1-6;x+=8.5){if(Math.abs(x-10)<4)continue;bench(front,M,x,bz+1.2,0);benches.push([x,bz+1.2,0]);lampPost(front,M,x+4,bz-1.5);}
  for(const [x,z] of [[-40,40],[-14,40],[0,39],[14,40],[20,44],[42,40],[60,40],[-50,44],[66,46]])tree(x,z,'round',2+rand()*.5);

  // Foothills and forests: pines along the mountains, cabins on the north-east and west slopes.
  const hills=zone('hills');
  for(const [x,z,y] of [[34,-19,.3],[45,-21,-.2],[57,-18,.5],[-62,16,1.2],[-60,30,1.4],[-64,42,1.8]])solid(cabin(hills,M,x,z,y));
  for(let i=0;i<120;i++){
    const north=i<80,x=north?x0+14+rand()*(x1-x0-22):x0+5+rand()*15,z=north?bounds.z0+19+rand()*12:bounds.z0+28+rand()*58;
    if(north&&Math.abs(x-10)<6)continue;if(!north&&z>45)continue;if(boxes.some(b=>Math.abs(x-b[0])<b[2]+.8&&Math.abs(z-b[1])<b[3]+.8))continue;
    if(z>LOOP.z0-4&&z<LOOP.z1+4&&x>LOOP.x0-4&&x<LOOP.x1+4)continue;
    tree(x,z,rand()<.75?'pine':'round',2+rand()*1.3);
  }
  // East shore: a lighthouse and a few quiet houses among trees.
  const east=zone('east');solid(lighthouse(east,M,69,1));
  for(const [x,z,y] of [[62,16,-Math.PI/2],[63,26,-Math.PI/2],[61,-4,-Math.PI/2]])solid(house(east,{x,z,yaw:y}));
  for(const [x,z] of [[66,9],[60,21],[67,31],[58,8],[66,-8]])tree(x,z,'round',2.2);

  root.add(forest.build());
  for(const z of Object.values(zones))mergeStatic(z);
  // Grain at a consistent world scale: planks, asphalt, paving.
  const scale=new Map([[M.asphalt,4],[M.walk,1.6],[M.deck,1.6],[M.deckDark,1.6],[M.gravel,3],[M.paving,2.4],[M.timber,1.4],[M.timberDark,1.4]]);
  root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&scale.has(o.material))worldUV(o.geometry,scale.get(o.material));});
  // River: the car must cross on the road bridges, not through the water.
  const rx=(RIVER.x0+RIVER.x1)/2,rh=(RIVER.x1-RIVER.x0)/2+.1,o=LOOP.half+LOOP.walk+.2;
  for(const [a,b] of [[RIVER.zStart,LOOP.z0-o],[LOOP.z0+o,LOOP.z1-o],[LOOP.z1+o,z1+2]])boxes.push([rx,(a+b)/2,rh,(b-a)/2]);
  circles.push([10,-20.6,3.6]);
  // Mountains: the north ridge and west slopes are not drivable.
  boxes.push([(x0+x1)/2,bounds.z0+8,(x1-x0)/2,9],[x0+6.5,bounds.z0+27,6.5,22]);
  return {group:root,studios,boxes,circles,benches,moorings,materials:[...Object.values(M).filter(v=>v.isMaterial),...M.umbrella]};
}
