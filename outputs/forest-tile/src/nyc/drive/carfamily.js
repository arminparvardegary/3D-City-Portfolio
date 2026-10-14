import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { curve, se, loft } from '../../realcar.js';

// A family of realistic cars for the traffic: one generator, many bodies. Each
// type has its own proportions (length, width, ride height, cabin and roof
// line), wheels and details (a taxi sign, a police light bar, a pickup bed),
// its own colours and its own driving speed. Parts are grouped by material:
// paint (tinted per car), glass, dark trim and tyres, bright metal, white and
// red lamps (and blue for the police). Every car of every type is drawn with one
// BatchedMesh per material: a handful of draw calls for all the traffic.
// Units are world units (the car is about 3.7 long); the nose points to +z.

// type: length, width, wheel radius, wheelbase, body height scale, lift,
// cabin [rear base, roof rear, roof front, windscreen base], roof height, speed, colours.
export const TYPES={
  // nose / tail: bumper heights; sq: how boxy the body is (2.5 round ... 10 square).
  sports:{L:3.9,W:1.72,r:.34,wb:2.5,hs:.86,lift:0,nose:.4,tail:.6,sq:3.4,cab:[-1.05,-.6,.05,.55],roof:1.12,speed:8.8,colors:['#c8102e','#f2c200','#1d1d1f','#e8e8e6']},
  coupe:{L:3.8,W:1.66,r:.33,wb:2.4,hs:.95,lift:0,nose:.5,sq:4,cab:[-1.0,-.55,.1,.6],roof:1.22,speed:8.2,colors:['#30343a','#8a9099','#2c4a7a','#eeeeec']},
  sedan:{L:4.2,W:1.72,r:.32,wb:2.65,hs:1,lift:0,sq:4.6,cab:[-1.4,-.9,.25,.8],roof:1.4,speed:6.8,colors:['#c9ccd1','#1d1f22','#e9e8e4','#3a4c66','#6b1d22','#7c7f84']},
  hatch:{L:3.4,W:1.66,r:.3,wb:2.2,hs:1,lift:0,sq:4.6,cab:[-1.58,-1.45,.1,.58],roof:1.45,speed:6.3,colors:['#b2001e','#e9e8e4','#2f5d8c','#8a9099']},
  city:{L:3.0,W:1.56,r:.28,wb:1.95,hs:1.02,lift:0,nose:.62,sq:5,cab:[-1.35,-1.22,.15,.5],roof:1.48,speed:5.6,colors:['#9fc9b8','#f0eee8','#d24b3e','#3f3f44']},
  wagon:{L:4.4,W:1.74,r:.32,wb:2.75,hs:1,lift:0,sq:5,cab:[-2.05,-1.92,.2,.8],roof:1.42,speed:6.3,colors:['#5c6b4f','#a7a39a','#26364d']},
  suv:{L:4.5,W:1.88,r:.4,wb:2.8,hs:1.15,lift:.16,nose:.7,tail:.75,sq:7,cab:[-2.1,-1.95,.45,.95],roof:1.9,speed:6.5,colors:['#1d1f22','#f0eee8','#5a6168','#2b3f5c','#7a2b25']},
  van:{L:4.8,W:1.9,r:.36,wb:3.1,hs:1.15,lift:.1,nose:.75,tail:.95,sq:9,cab:[-2.3,-2.2,1.15,1.7],roof:2.2,speed:5.2,colors:['#f2f2ef','#c9ccd1','#1f3a6b']},
  pickup:{L:5.0,W:1.92,r:.4,wb:3.2,hs:1.2,lift:.2,nose:.82,tail:.82,sq:8,cab:[-.5,-.35,.55,1.05],roof:1.95,speed:5.9,colors:['#a31621','#1d1f22','#c9ccd1','#3e5641'],bed:true},
  taxi:{L:4.2,W:1.72,r:.32,wb:2.65,hs:1,lift:0,sq:4.6,cab:[-1.4,-.9,.25,.8],roof:1.4,speed:6.9,colors:['#f5bf0a'],taxi:true},
  police:{L:4.4,W:1.86,r:.38,wb:2.75,hs:1.12,lift:.14,nose:.7,tail:.75,sq:7,cab:[-2.0,-1.85,.4,.9],roof:1.85,speed:7.4,colors:['#f6f6f4'],police:true},
  // Distinct silhouettes.
  bus:{L:8.8,W:2.2,r:.46,wb:5.4,hs:1.28,lift:.22,nose:.95,tail:.95,sq:11,cab:[-4.25,-4.15,4.1,4.35],roof:3.0,speed:4.6,colors:['#2a63b8','#f2f2ef'],bus:true},
  truck:{L:5.6,W:2.05,r:.43,wb:3.4,hs:1.22,lift:.2,nose:.85,tail:.85,sq:9,cab:[1.1,1.2,1.85,2.4],roof:2.25,speed:4.8,colors:['#f2f2ef','#a31621','#1f3a6b'],box:[-2.7,1.0,3.0]},
  convertible:{L:4.3,W:1.74,r:.34,wb:2.65,hs:.92,lift:0,nose:.45,tail:.62,sq:3.8,cab:[-.85,-.55,.2,.75],roof:1.2,speed:7.8,colors:['#8f0f1e','#efe6cf','#123a5c'],open:true},
  jeep:{L:3.9,W:1.82,r:.43,wb:2.4,hs:1.22,lift:.24,nose:.9,tail:.9,sq:12,cab:[-1.72,-1.62,.45,.72],roof:2.0,speed:6.0,colors:['#4f5a35','#c8b48a','#26282b'],spare:true},
  beetle:{L:3.6,W:1.64,r:.31,wb:2.35,hs:.98,lift:0,nose:.5,tail:.5,sq:2.6,cab:[-1.1,-.6,-.05,.45],roof:1.5,speed:5.4,colors:['#7fb7d6','#e8c547','#c9473b','#9fbf8f']},
  muscle:{L:4.7,W:1.84,r:.37,wb:2.85,hs:.98,lift:0,nose:.62,tail:.72,sq:6.5,cab:[-1.5,-1.05,-.3,.2],roof:1.27,speed:8.4,colors:['#15161a','#e09b00','#1b4d8f','#8f1320']},
};
const PARTS=['paint','glass','dark','metal','lampW','lampR','lampB','sign','white','contact'];

// Geometries of one type, grouped by part, in car space (ground at y = 0).
function typeGeometry(T){
  const out=Object.fromEntries(PARTS.map(p=>[p,[]])),add=(p,g,[x=0,y=0,z=0]=[],[rx=0,ry=0,rz=0]=[])=>{g=g.index?g.toNonIndexed():g;if(p!=='sign'&&p!=='contact')g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));out[p].push(g);};
  const {L,W,r,wb,hs,lift}=T,zr=-L/2,zf=L/2,az=[wb/2,-wb/2],R=r+.07,k=L/3.7;
  const nose=T.nose??.56,tail=T.tail??.66,box=(T.sq??4.2)>7;   // boxy bodies keep their height to the ends
  const shoulder=curve([[zr,tail*hs+lift],[zr+.18*k,(box?.86:.82)*hs+lift],[zr+.6*k,.88*hs+lift],[.25*k,.88*hs+lift],[.62*k,.87*hs+lift],[zf-.45*k,(box?(nose+.88)/2:.76)*hs+lift],[zf-.08*k,(nose+.08)*hs+lift],[zf,nose*hs+lift]]);
  const half=curve([[zr,W*.37],[zr+.25*k,W*.47],[zr+.8*k,W*.5],[0,W/2],[zf-.7*k,W*.49],[zf-.2*k,W*.44],[zf,W*.35]]);
  const floor=z=>{let y=.2+lift;for(const a of az){const d=Math.abs(z-a);if(d<R)y=Math.max(y,r+Math.sqrt(R*R-d*d)-.02);}return y;};
  // Body.
  const rings=[];for(let i=0;i<=22;i++){const z=zr+(zf-zr)*i/22,yb=floor(z),yt=Math.max(yb+.1,shoulder(z)),hw=half(z),yc=(yb+yt)/2,hh=(yt-yb)/2,pts=[];
    for(let j=0;j<16;j++){const [sx,sy]=se(j/16*Math.PI*2,T.sq??4.2);pts.push([sx*hw,yc+sy*hh]);}rings.push({z,pts});}
  add('paint',loft(rings));
  // Cabin glass and painted roof.
  const [c0,rr,rf,c1]=T.cab,base0=shoulder(c0)-.05,base1=shoulder(c1)-.05;
  const roofY=curve([[c0,base0],[rr,T.roof+lift*.5],[(rr+rf)/2,T.roof+lift*.5+.02],[rf,T.roof+lift*.5],[c1,base1]]);
  const cab=[],roofRings=[];for(let i=0;i<=12;i++){const z=c0+(c1-c0)*i/12,base=shoulder(z)-.05,top=Math.max(base+.02,roofY(z)),wb2=half(z)-(box?.03:.11),wt=wb2-(box?.05:.17),yc=(base+top)/2,hh=(top-base)/2,pts=[],rp=[];
    for(let j=0;j<14;j++){const [sx,sy]=se(j/14*Math.PI*2,box?10:3.6),y=yc+sy*hh,v=Math.max(0,(y-base)/(top-base)),x=sx*(wb2+(wt-wb2)*v);pts.push([x,y]);rp.push([x*1.012,y+.008]);}
    cab.push({z,pts});roofRings.push({z,pts:rp});}
  if(T.open){add('glass',new THREE.BoxGeometry(W*.78,.36,.04),[0,shoulder(c1)+.15,c1-.12],[-.55,0,0]);for(const sx of [-.36,.36])add('dark',new THREE.BoxGeometry(.5,.55,.45),[sx,shoulder(-.4)-.05,-.45]);}
  else add('glass',loft(cab));
  if(!T.open){const keep=j=>{const a=j/14*Math.PI*2;return a>Math.PI*.2&&a<Math.PI*.8;};add('paint',loft(roofRings.slice(2,11).map(rg=>({z:rg.z,pts:rg.pts.filter((_,j)=>keep(j))})),{caps:false,closed:false}));}
  // Lamps, grille, bumpers.
  const fy=shoulder(zf-.2)-.12,ry=shoulder(zr+.15)-.08;
  for(const s of [-1,1]){add('lampW',new THREE.BoxGeometry(.36,.09,.12),[s*W*.3,fy,zf-.14],[-.2,s*.3,0]);add('lampR',new THREE.BoxGeometry(.32,.1,.1),[s*W*.3,ry,zr+.1]);}
  add('lampR',new THREE.BoxGeometry(W*.55,.04,.04),[0,ry+.02,zr+.1]);
  add('dark',new THREE.BoxGeometry(W*.38,.16+lift*.5,.1),[0,.48+lift,zf-.02]);
  add('dark',new THREE.BoxGeometry(W*.75,.14,.14),[0,.28+lift,zr+.06]);add('dark',new THREE.BoxGeometry(W*.75,.05,.14),[0,.24+lift,zf-.02]);
  // Mirrors and sills.
  for(const s of [-1,1]){add('paint',new THREE.BoxGeometry(.18,.1,.12),[s*(half(c1-.15)+.1),shoulder(c1-.15)+.1,c1-.18]);add('dark',new THREE.BoxGeometry(.04,.08,wb-.9),[s*(half(0)-.02),.24+lift,0]);}
  // Wheels: rounded tyres and a bright rim face.
  const tyre=new THREE.CylinderGeometry(r,r,.26,12).rotateZ(Math.PI/2),rim=new THREE.CylinderGeometry(r*.64,r*.6,.03,12).rotateZ(Math.PI/2),hub=new THREE.CylinderGeometry(r*.14,r*.14,.04,6).rotateZ(Math.PI/2);
  const track=W/2-.17;for(const z of az)for(const s of [-1,1]){add('dark',tyre.clone(),[s*track,r,z]);add('metal',rim.clone(),[s*(track+.12),r,z]);add('dark',hub.clone(),[s*(track+.135),r,z]);}
  // Extras.
  if(T.bed){const bz0=zr+.1,bz1=c0-.06,by=shoulder(-1)+.02;for(const s of [-1,1])add('paint',new THREE.BoxGeometry(.08,.42,bz1-bz0),[s*(W/2-.06),by+.1,(bz0+bz1)/2]);add('paint',new THREE.BoxGeometry(W-.1,.42,.08),[0,by+.1,bz0]);add('dark',new THREE.BoxGeometry(W-.16,.04,bz1-bz0),[0,by-.08,(bz0+bz1)/2]);}
  if(T.box){const [b0,b1,bh]=T.box,yb=.5+lift;add('white',new THREE.BoxGeometry(W+.06,bh-yb,b1-b0),[0,(yb+bh)/2,(b0+b1)/2]);add('dark',new THREE.BoxGeometry(W*.9,.06,.06),[0,yb+.6,b0-.02]);}
  if(T.spare)add('dark',new THREE.CylinderGeometry(r,r,.24,14).rotateX(Math.PI/2),[0,.95+lift,zr-.12]);
  if(T.bus){add('lampW',new THREE.BoxGeometry(W*.6,.22,.04),[0,T.roof-.3,zf+.01]);add('white',new THREE.BoxGeometry(W+.02,.35,L-.4),[0,.95+lift,0]);
    for(const s2 of [-1,1])add('dark',new THREE.BoxGeometry(.02,1.3,.9),[s2*(W/2+.01),1.2+lift,zf-1.3]);}
  if(T.taxi){add('sign',new THREE.BoxGeometry(.56,.17,.24),[0,T.roof+.08,-.15]);for(const s of [-1,1])for(let i=0;i<14;i++){const z=-1+i*.1;if(i%2)add('dark',new THREE.BoxGeometry(.006,.05,.1),[s*(half(z)+.004),.64,z]);}}
  if(T.police){add('dark',new THREE.BoxGeometry(.9,.09,.24),[0,T.roof+.04,-.15]);add('lampR',new THREE.BoxGeometry(.38,.08,.2),[-.22,T.roof+.12,-.15]);add('lampB',new THREE.BoxGeometry(.38,.08,.2),[.22,T.roof+.12,-.15]);
    for(const s of [-1,1])add('dark',new THREE.BoxGeometry(.01,.36,1.6),[s*(half(-.3)+.005),.6,-.3]);}
  // A soft contact shadow under the car, so it sits on the road.
  add('contact',new THREE.PlaneGeometry(W*1.25,L*1.12).rotateX(-Math.PI/2),[0,.035,0]);
  const merged={};for(const p of PARTS)if(out[p].length)merged[p]=mergeVertices(mergeGeometries(out[p],false));
  return merged;
}

// A soft dark oval, darkest at the middle.
let shadowTex=null;
export function contactShadow(){
  if(shadowTex)return shadowTex;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const grd=g.createRadialGradient(64,64,10,64,64,64);grd.addColorStop(0,'rgba(0,0,0,.75)');grd.addColorStop(.55,'rgba(0,0,0,.45)');grd.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=grd;g.fillRect(0,0,128,128);shadowTex=new THREE.CanvasTexture(c);return shadowTex;
}

// Materials shared by every car (paint is white: each car gets its own colour).
export function familyMaterials(prep){
  const P=m=>{prep?.(m);return m;};
  const sign=(()=>{const c=document.createElement('canvas');c.width=256;c.height=96;const g=c.getContext('2d');g.fillStyle='#fff8d6';g.fillRect(0,0,256,96);g.fillStyle='#1d1d1f';g.font='800 56px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('TAXI',128,52);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
  return {
    paint:P(new THREE.MeshPhysicalMaterial({color:'#ffffff',metalness:.45,roughness:.32,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.2})),   // metallic paint under clear coat
    white:P(new THREE.MeshStandardMaterial({color:'#e9e8e3',roughness:.55})),
    contact:new THREE.MeshBasicMaterial({map:contactShadow(),transparent:true,depthWrite:false,color:'#000000',polygonOffset:true,polygonOffsetFactor:-2}),
    glass:P(new THREE.MeshPhysicalMaterial({color:'#0c1218',metalness:.2,roughness:.05,clearcoat:1,envMapIntensity:1.6})),
    dark:P(new THREE.MeshStandardMaterial({color:'#15171a',roughness:.6})),metal:P(new THREE.MeshStandardMaterial({color:'#c4c8ce',metalness:.9,roughness:.25,envMapIntensity:1.4})),
    lampW:new THREE.MeshBasicMaterial({color:'#f2f6ff'}),lampR:new THREE.MeshBasicMaterial({color:'#e8261c'}),lampB:new THREE.MeshBasicMaterial({color:'#2a6cff'}),
    sign:P(new THREE.MeshStandardMaterial({map:sign,emissive:'#fff2b0',emissiveIntensity:.3,emissiveMap:sign})),
  };
}

// One BatchedMesh per material holding every type; add(type, colour) places a car.
export function createFleet({cars,prep}){
  const mats=familyMaterials(prep),geos={};for(const [name,T] of Object.entries(TYPES))geos[name]=typeGeometry(T);
  const root=new THREE.Group(),batches={},ids={};
  for(const p of PARTS){
    const used=cars.filter(c=>geos[c.type][p]);if(!used.length)continue;
    let verts=0,idx=0;const types=[...new Set(used.map(c=>c.type))];for(const t of types){const g=geos[t][p];verts+=g.attributes.position.count;idx+=g.index.count;}
    const bm=new THREE.BatchedMesh(used.length,verts,idx,mats[p]);bm.castShadow=bm.receiveShadow=p!=='lampW'&&p!=='lampR'&&p!=='lampB'&&p!=='contact';
    const gid={};for(const t of types)gid[t]=bm.addGeometry(geos[t][p]);
    ids[p]=cars.map(c=>geos[c.type][p]?bm.addInstance(gid[c.type]):null);
    if(p==='paint')cars.forEach((c,i)=>bm.setColorAt(ids[p][i],new THREE.Color(c.color)));
    batches[p]=bm;root.add(bm);
  }
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0);
  return {root,
    // Place car i at (x, y, z) facing heading h.
    set(i,x,y,z,h){m4.compose(v.set(x,y,z),q.setFromAxisAngle(up,h),one);for(const p in batches){const id=ids[p][i];if(id!==null)batches[p].setMatrixAt(id,m4);}},
  };
}
