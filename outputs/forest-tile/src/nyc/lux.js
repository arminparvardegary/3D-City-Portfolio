import * as THREE from 'three';
import { createKit } from '../diorama/kit.js';
import { BRAND, imgTex, contain, url } from '../stores/brand.ts';

// Brooklyn's luxury boutiques: one tall floor, big footprint, standing on the
// ground. Glass on every side with slim gold mullions and a glowing gold line at
// the roof, a warm marble interior with pedestals and pendant lights you see
// through the glass, a black entrance canopy with a gold band (no branding), uplights on
// the facade and a roof terrace. The front faces `facing` (+1 / -1 along x).
// No names, no logos: each is told apart only by its gold and its glass tint.
export const LUX=[
  {gold:'#d4af6a',tint:'#1d2433'},{gold:'#e2b98a',tint:'#2a2230'},{gold:'#e8cf8f',tint:'#1b2a2e'},
  {gold:'#c9a45c',tint:'#20202a'},{gold:'#f0c560',tint:'#2a2418'},{gold:'#d9a7a0',tint:'#2b1e28'},
];

const marble=(()=>{let tex=null;return()=>{if(tex)return tex;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  g.fillStyle='#efe9df';g.fillRect(0,0,256,256);let r=3;const rnd=()=>((r=(r*16807)%2147483647)/2147483647);
  for(let i=0;i<14;i++){g.strokeStyle=`rgba(150,140,128,${.15+rnd()*.2})`;g.lineWidth=1+rnd()*2;g.beginPath();let x=rnd()*256,y=0;g.moveTo(x,y);while(y<256){x+=(rnd()-.5)*30;y+=12+rnd()*16;g.lineTo(x,y);}g.stroke();}
  g.strokeStyle='rgba(120,110,100,.35)';for(let i=0;i<=256;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,256);g.moveTo(0,i);g.lineTo(256,i);g.stroke();}
  tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;};})();

export function buildLux({x,z,top,w=9,d=15,h=5,facing=-1,style=0,palette=null,band=true,showroom=false}){
  const S=palette||LUX[style%LUX.length],K=createKit({flat:false}),{box,cyl,add,mat}=K,root=new THREE.Group(),f=facing;
  const gold=mat(S.gold,{metalness:.95,roughness:.25,envMapIntensity:1.6});
  const goldGlow=mat(S.gold,{emissive:S.gold,emissiveIntensity:2.2,roughness:.4});
  const black=mat('#111114',{roughness:.35,metalness:.4});
  const glass=new THREE.MeshPhysicalMaterial({color:S.tint,metalness:.15,roughness:.04,transparent:true,opacity:.38,envMapIntensity:1.8,clearcoat:1,depthWrite:false,side:THREE.DoubleSide});
  const floorM=mat('#ffffff',{map:marble(),roughness:.3,emissive:'#ffdcae',emissiveIntensity:.42});floorM.userData.uvSize=3;
  const warm=mat('#fff1d6',{emissive:'#ffcf8a',emissiveIntensity:2.5});
  const plinth=mat('#d9d2c5',{roughness:.5});
  const hw=w/2,hd=d/2;
  // Floor, roof slab, the gold glow line and edge.
  box(w+.4,.25,d+.4,x,top,z,plinth);box(w-.2,.02,d-.2,x,top+.25,z,floorM);
  box(w+.5,.4,d+.5,x,top+h,z,black);box(w+.56,.08,d+.56,x,top+h+.14,z,goldGlow);
  // Glass on all four sides with gold mullions and gold sills.
  const wall=(cx,cz,len,alongX)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(len,h-.25),glass);m.position.set(cx,top+.25+(h-.25)/2,cz);if(!alongX)m.rotation.y=Math.PI/2;m.renderOrder=2;root.add(m);
    const n=Math.round(len/1.6);for(let i=0;i<=n;i++){const t=-len/2+i*len/n;alongX?box(.08,h-.25,.08,cx+t,top+.25,cz,gold):box(.08,h-.25,.08,cx,top+.25,cz+t,gold);}
    alongX?box(len,.08,.12,cx,top+.25,cz,gold):box(.12,.08,len,cx,top+.25,cz,gold);};
  wall(x,z-hd,w,true);wall(x,z+hd,w,true);wall(x-hw,z,d,false);wall(x+hw,z,d,false);
  // Inside, very luxurious: a glowing coffered ceiling, two crystal chandeliers,
  // gold inlay in the marble floor and a round rug, a curved velvet lounge round a
  // marble and gold table, armchairs, gold framed glass vitrines with lit pieces,
  // backlit gold slat walls at both ends, a gold ring sculpture, olive trees.
  const velvet=mat(S.velvet||['#4a1626','#1f2d4a','#23402f','#3d2a4f','#4a3216','#4a1f3a'][style%6],{roughness:.9,emissive:'#3a2418',emissiveIntensity:.35});
  const crystal=mat('#fff6e6',{emissive:'#ffd9a0',emissiveIntensity:3.2,roughness:.1,metalness:.2});
  const rug=mat('#2a1f1a',{roughness:1});const ceilGlow=mat('#fff0d8',{emissive:'#ffdcae',emissiveIntensity:1.3});
  const inner=(lx,lz)=>[x-f*lx,z+lz];   // lx measured from the centre toward the back wall
  // Ceiling: a warm glowing panel with a gold coffer grid.
  box(w-.3,.04,d-.3,x,top+h-.24,z,ceilGlow);
  for(let t=-hd+2;t<hd-1;t+=2.4)box(w-.3,.08,.06,x,top+h-.3,z+t,gold);
  for(let t=-hw+1.5;t<hw-1;t+=1.5)box(.06,.08,d-.3,x+t,top+h-.3,z,gold);
  // Floor: gold inlay lines and a round rug.
  for(let t=-hd+1;t<hd;t+=2.5)box(w-.4,.012,.05,x,top+.26,z+t,goldGlow);
  if(!showroom){add(new THREE.CylinderGeometry(2.3,2.3,.02,48),rug,[x,top+.27,z]);add(new THREE.TorusGeometry(2.3,.03,6,64).rotateX(Math.PI/2),gold,[x,top+.28,z]);}
  // Two crystal chandeliers.
  for(const cz of [-hd*.45,hd*.45]){cyl(.02,.02,1.2,6,x,top+h-1.5,z+cz,gold);
    for(const [r,n,y] of [[.75,14,h-1.6],[.5,10,h-1.85],[.25,6,h-2.1]])for(let i=0;i<n;i++){const a=i/n*Math.PI*2;add(new THREE.OctahedronGeometry(.07,0),crystal,[x+Math.cos(a)*r,top+y,z+cz+Math.sin(a)*r]);}
    add(new THREE.TorusGeometry(.75,.025,6,40).rotateX(Math.PI/2),gold,[x,top+h-1.55,z+cz]);add(new THREE.OctahedronGeometry(.14,0),crystal,[x,top+h-2.35,z+cz]);}
  // The lounge: a curved velvet sofa open toward the doors, a marble and gold table, two armchairs.
  if(!showroom){const sofa=new THREE.TorusGeometry(1.55,.32,10,28,Math.PI).rotateX(Math.PI/2).rotateY(f>0?-Math.PI/2:Math.PI/2).scale(1,.75,1);add(sofa,velvet,[x,top+.55,z]);
    cyl(.6,.6,.08,32,x,top+.72,z,floorM);add(new THREE.TorusGeometry(.6,.03,6,40).rotateX(Math.PI/2),gold,[x,top+.76,z]);cyl(.08,.14,.45,10,x,top+.27,z,gold);
    for(const s2 of [-1,1]){const [ax,az]=inner(-1.9,s2*1.1);box(.8,.42,.8,ax,top+.27,az,velvet);box(.8,.5,.16,ax-f*.32,top+.6,az,velvet);}}
  // Glass vitrines on gold frames along the walls, each with a lit piece.
  if(!showroom)for(const _ of [0]){const vglass=new THREE.MeshPhysicalMaterial({color:'#ffffff',transparent:true,opacity:.18,roughness:.02,metalness:0,envMapIntensity:2,depthWrite:false});
  for(const lz of [-hd+2.6,hd-2.6])for(const lx of [-1.6,1.6]){const [vx,vz]=inner(lx,lz);
    box(.8,.85,.8,vx,top+.27,vz,black);box(.84,.04,.84,vx,top+1.12,vz,gold);
    const g2=new THREE.Mesh(new THREE.BoxGeometry(.78,.7,.78),vglass);g2.position.set(vx,top+1.5,vz);g2.renderOrder=3;root.add(g2);
    add(new THREE.IcosahedronGeometry(.16,1),crystal,[vx,top+1.36,vz]);}}
  // Backlit gold slats on both end walls.
  for(const sz of [-1,1]){const wz=z+sz*(hd-.12);box(w-.6,h-1.2,.04,x,top+.6,wz,ceilGlow);
    for(let t=-hw+.6;t<=hw-.6;t+=.36)box(.08,h-1.2,.1,x+t,top+.6,wz-sz*.06,gold);}
  // A gold ring sculpture on a black plinth, toward the back.
  if(!showroom){const [sx,sz]=inner(2.6,-hd*.25);box(.7,.6,.7,sx,top+.27,sz,black);add(new THREE.TorusGeometry(.75,.07,12,48).rotateY(Math.PI/2),gold,[sx,top+1.7,sz]);}
  // Olive trees in black planters, in the back corners.
  for(const lz of [-hd+1,hd-1]){const [tx,tz]=inner(hw-.9,lz);cyl(.38,.3,.6,12,tx,top+.27,tz,black);cyl(.05,.07,1.6,6,tx,top+.85,tz,mat('#6a4a33'));
    for(const [ox,oy,oz] of [[0,2.6,0],[.3,2.3,.2],[-.3,2.4,-.2]])add(new THREE.SphereGeometry(.45,10,8),mat('#7d9466',{roughness:.9}),[tx+ox,top+oy,tz+oz]);}
  // Entrance: a black canopy over the doors with gold light under it, a gold band
  // above, a runner and two gold-lit planters.
  const ex=x+f*(hw+.01);
  box(.9,.18,4.6,x+f*(hw+.45),top+h-1.1,z,black);box(.86,.04,4.4,x+f*(hw+.45),top+h-1.12,z,warm);
  if(band)box(.1,.5,4.4,ex+f*.05,top+h-.45,z,goldGlow);   // a plain gold band over the doors
  box(1.8,.02,2.2,x+f*(hw+.9),top+.25,z,mat('#5a1a22',{roughness:.9}));
  for(const s of [-1,1]){box(.8,.7,.8,x+f*(hw+.7),top+.25,z+s*1.8,black);add(new THREE.SphereGeometry(.45,12,10),mat('#3f7a4f',{roughness:.9}),[x+f*(hw+.7),top+1.35,z+s*1.8]);
    box(.82,.04,.82,x+f*(hw+.7),top+.95,z+s*1.8,goldGlow);}
  // Uplights along the facade.
  for(let t=-hd+1;t<=hd-1;t+=2.2){box(.25,.06,.25,x+f*(hw+.25),top+.25,z+t,warm);}
  // Roof terrace: a glass parapet, potted trees and loungers.
  for(const s of [-1,1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(d,.7),glass);m.position.set(x+s*(hw-.1),top+h+.6,z);m.rotation.y=Math.PI/2;m.renderOrder=2;root.add(m);
    const m2=new THREE.Mesh(new THREE.PlaneGeometry(w,.7),glass);m2.position.set(x,top+h+.6,z+s*(hd-.1));m2.renderOrder=2;root.add(m2);}
  for(const [px,pz] of [[-2.6,-5.5],[2.6,5.5]]){cyl(.4,.3,.6,12,x+px,top+h+.2,z+pz,black);cyl(.07,.08,1.2,6,x+px,top+h+.8,z+pz,mat('#6a4a33'));add(new THREE.SphereGeometry(.8,12,10),mat('#4c8a5a',{roughness:.9}),[x+px,top+h+2.3,z+pz]);}
  for(const pz of [-1.4,1.4])box(1.6,.3,.7,x,top+h+.2,z+pz,mat('#f2ece2',{roughness:.8}));
  K.finish(root);
  root.traverse(o=>{if(o.isMesh&&o.material!==glass){o.castShadow=o.receiveShadow=true;}});
  return {root,solid:[x,z,hw+.3,hd+.3],mat};
}

// Keel's flagship in Brooklyn: the same glass boutique in Keel's colours (white
// pearl frames, Keel blue glass and glow), a lit "Keel." sign on the roof, the
// Meet Keel. display wall and the character inside, iMessage style bubbles
// floating slowly above, a glowing reflecting pool at the door, blue uplights.
const SANS='-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif';
export function buildKeelBoutique({x,z,top,w=9,d=18,h=5.4,facing=-1}){
  const B=BRAND.keel,f=facing;
  const base=buildLux({x,z,top,w,d,h,facing,band:false,palette:{gold:'#eef2fa',tint:'#16305e',velvet:'#1d3f8a'}});
  const root=base.root,hw=w/2,hd=d/2;
  const blue=new THREE.MeshStandardMaterial({color:B.color,emissive:B.color,emissiveIntensity:2.4,roughness:.4});
  const add=(geo,m,px,py,pz,ry=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.rotation.y=ry;root.add(o);return o;};
  const face=f>0?Math.PI/2:-Math.PI/2;
  // A Keel blue glow line round the roof and the base.
  add(new THREE.BoxGeometry(w+.62,.1,d+.62),blue,x,top+h+.16,z);add(new THREE.BoxGeometry(w+.5,.05,d+.5),blue,x,top+.27,z);
  // "Keel." on the roof, lit, facing the river.
  const sign=imgTex('keel-roof',2048,600,[],g=>{g.clearRect(0,0,2048,600);g.font=`700 460px ${SANS}`;g.textBaseline='alphabetic';const t='Keel',tw=g.measureText(t).width,dw=g.measureText('.').width,x0=(2048-tw-dw)/2;
    g.fillStyle='#ffffff';g.fillText(t,x0,500);g.fillStyle=B.color;g.fillText('.',x0+tw,500);});
  const sm=new THREE.MeshStandardMaterial({map:sign,emissiveMap:sign,emissive:'#ffffff',emissiveIntensity:1.1,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  add(new THREE.PlaneGeometry(9,2.64),sm,x+f*(hw-.6),top+h+1.9,z,face);
  // The Meet Keel. display wall inside, on the back wall, facing the doors.
  const banner=imgTex('keel-flagship-banner',1600,900,[B.banner],(g,[pose])=>{const grd=g.createLinearGradient(0,0,0,900);grd.addColorStop(0,'#ffffff');grd.addColorStop(1,'#e6eeff');g.fillStyle=grd;g.fillRect(0,0,1600,900);
    g.fillStyle='#1d1d1f';g.font=`700 190px ${SANS}`;g.textAlign='left';g.fillText('Meet',80,280);g.fillStyle=B.color;g.fillText('Keel.',80,470);
    g.fillStyle='#6e6e73';g.font=`500 56px ${SANS}`;g.fillText('The AI assistant you text like a friend.',84,590);
    g.fillStyle=B.color;g.beginPath();g.roundRect(80,660,600,110,55);g.fill();g.fillStyle='#fff';g.font=`600 50px ${SANS}`;g.fillText('Text Keel on iMessage ›',120,732);
    contain(g,pose,900,20,680,880);});
  add(new THREE.PlaneGeometry(7,3.94),new THREE.MeshStandardMaterial({map:banner,emissiveMap:banner,emissive:'#ffffff',emissiveIntensity:.75,roughness:.4}),x-f*(hw-.12),top+.4+2.2,z,face);
  // The character, life size, inside by the glass.
  const pose=new THREE.TextureLoader().load(url('keel/pose-win.webp'));pose.colorSpace=THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(1.75,3.55),new THREE.MeshStandardMaterial({map:pose,transparent:true,alphaTest:.4,side:THREE.DoubleSide,emissive:'#ffffff',emissiveMap:pose,emissiveIntensity:.25}),x+f*(hw-1.4),top+.25+1.78,z-hd*.45,face);
  // Two reflecting pools either side of the door, glowing blue, white stone rims.
  for(const sgn of [-1,1]){const pz=z+sgn*(2.9+(hd-3.6)/2),len=hd-3.6;
    add(new THREE.BoxGeometry(1.9,.16,len+.3),new THREE.MeshStandardMaterial({color:'#f2f0ec',roughness:.4}),x+f*(hw+1.35),top+.0,pz);
    const pool=new THREE.Mesh(new THREE.BoxGeometry(1.5,.06,len),new THREE.MeshStandardMaterial({color:'#0e2c66',emissive:B.color,emissiveIntensity:.9,roughness:.05,metalness:.3}));
    pool.position.set(x+f*(hw+1.35),top+.1,pz);root.add(pool);}
  // Blue uplights round the whole building.
  const up=new THREE.MeshStandardMaterial({color:'#dfe8ff',emissive:B.color,emissiveIntensity:3});
  for(let t=-hd+1;t<=hd-1;t+=1.8)for(const s of [-1,1])add(new THREE.BoxGeometry(.22,.06,.22),up,x+s*(hw+.3),top+.27,z+t);
  // Chat bubbles floating slowly above the roof, as on keeltwin.com.
  const bubble=(text,me,i)=>{const t=imgTex('keel-bubble-'+i,1024,256,[],g=>{g.clearRect(0,0,1024,256);g.font=`600 84px ${SANS}`;const tw=Math.min(940,g.measureText(text).width+90);
      const bx=me?1024-tw-10:10;g.fillStyle=me?B.color:'#ffffff';g.beginPath();g.roundRect(bx,40,tw,170,85);g.fill();g.fillStyle=me?'#ffffff':'#1d1d1f';g.textBaseline='middle';g.textAlign='left';g.fillText(text,bx+45,128);});
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false,color:'#c9c9d6'}));sp.scale.set(5.2,1.3,1);root.add(sp);return sp;};
  const bubbles=[['Remind me in 3 minutes',true],['Done. Set for 4:32 PM ✓',false],['Plan my day',true]].map(([t,me],i)=>({sp:bubble(t,me,i),y:top+h+4+i*1.6,ph:i*2.1}));
  let clock=0;
  return {root,solid:base.solid,update(dt){clock+=Math.min(dt,.1);
    bubbles.forEach((b,i)=>{b.sp.position.set(x+f*(hw-1.5)+Math.sin(clock*.5+b.ph)*.4,b.y+Math.sin(clock*1.1+b.ph)*.18,z+(i-1)*3.2);b.sp.material.opacity=.85+.15*Math.sin(clock*1.3+b.ph);});
    blue.emissiveIntensity=2.1+Math.sin(clock*1.2)*.4;}};
}

// Original movie covers (made up films, painted here, no real posters): a scene,
// a bold title, a tagline and a credits block, like a real one sheet.
const FILMS=[
  {t:'ORBIT',tag:'Some journeys never land',sky:['#05061a','#1b1f5e'],scene:'planet'},
  {t:'NIGHT CITY',tag:'Everyone has a price',sky:['#0b0d1e','#3a2a5e'],scene:'city'},
  {t:'DUNES',tag:'The sand remembers',sky:['#ff8a3d','#ffd27a'],scene:'dunes'},
  {t:'THE DEEP',tag:'Hold your breath',sky:['#02142a','#0e5f86'],scene:'wave'},
  {t:'AURORA',tag:'Light finds a way',sky:['#020814','#0b2a3a'],scene:'aurora'},
  {t:'PINES',tag:'Do not leave the path',sky:['#9fb3b0','#dfe6e1'],scene:'forest'},
  {t:'NEON 84',tag:'Drive all night',sky:['#120424','#5a0f6e'],scene:'grid'},
  {t:'THE LAST RUN',tag:'One more mile',sky:['#ff5e3a','#ffb36b'],scene:'runner'},
];
function paintCover(g,F,x,y,w,h){
  g.save();g.beginPath();g.roundRect(x,y,w,h,12);g.clip();
  const sky=g.createLinearGradient(0,y,0,y+h);sky.addColorStop(0,F.sky[0]);sky.addColorStop(1,F.sky[1]);g.fillStyle=sky;g.fillRect(x,y,w,h);
  let r=F.t.length*97;const rnd=()=>((r=(r*16807)%2147483647)/2147483647);
  const X=v=>x+v*w,Y=v=>y+v*h;
  if(F.scene==='planet'){for(let i=0;i<60;i++){g.fillStyle=`rgba(255,255,255,${rnd()})`;g.fillRect(X(rnd()),Y(rnd()*.7),2,2);}
    const p=g.createRadialGradient(X(.6),Y(.42),2,X(.5),Y(.5),w*.45);p.addColorStop(0,'#ffd08a');p.addColorStop(.5,'#c2552f');p.addColorStop(1,'#2a0e1a');g.fillStyle=p;g.beginPath();g.arc(X(.5),Y(.5),w*.34,0,7);g.fill();
    g.strokeStyle='rgba(255,210,150,.7)';g.lineWidth=3;g.beginPath();g.ellipse(X(.5),Y(.5),w*.5,w*.1,-.3,0,7);g.stroke();}
  if(F.scene==='city'){g.fillStyle='#f5e7c0';g.beginPath();g.arc(X(.72),Y(.22),w*.1,0,7);g.fill();
    for(let i=0;i<9;i++){const bw=w*(.08+rnd()*.08),bh=h*(.25+rnd()*.35),bx=X(i/9);g.fillStyle='#06070f';g.fillRect(bx,Y(.78)-bh,bw,bh);g.fillStyle='rgba(255,200,110,.8)';for(let k=0;k<6;k++)g.fillRect(bx+4+rnd()*(bw-8),Y(.78)-bh+8+rnd()*(bh-16),3,4);}}
  if(F.scene==='dunes'){g.fillStyle='#fff3c4';g.beginPath();g.arc(X(.5),Y(.4),w*.14,0,7);g.fill();
    for(const [k,c] of [[.55,'#d9853b'],[.65,'#b8642a'],[.76,'#8a4420']]){g.fillStyle=c;g.beginPath();g.moveTo(x,Y(k+.05));g.quadraticCurveTo(X(.35),Y(k-.08),X(.7),Y(k+.02));g.quadraticCurveTo(X(.9),Y(k+.06),x+w,Y(k-.02));g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.fill();}}
  if(F.scene==='wave'){g.fillStyle='rgba(180,230,255,.25)';for(let i=0;i<5;i++){g.beginPath();g.ellipse(X(.5),Y(.2+i*.12),w*.6,h*.03,0,0,7);g.fill();}
    g.fillStyle='#0a3a5c';g.beginPath();g.moveTo(x,Y(.62));g.bezierCurveTo(X(.3),Y(.3),X(.7),Y(.35),X(.62),Y(.55));g.bezierCurveTo(X(.55),Y(.68),X(.85),Y(.6),x+w,Y(.58));g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.fill();
    g.strokeStyle='rgba(220,245,255,.8)';g.lineWidth=3;g.beginPath();g.moveTo(X(.1),Y(.55));g.bezierCurveTo(X(.3),Y(.32),X(.68),Y(.36),X(.62),Y(.55));g.stroke();}
  if(F.scene==='aurora'){for(let k=0;k<3;k++){const a=g.createLinearGradient(0,Y(.1),0,Y(.55));a.addColorStop(0,'rgba(80,255,190,0)');a.addColorStop(.5,['rgba(80,255,190,.55)','rgba(120,180,255,.45)','rgba(190,120,255,.4)'][k]);a.addColorStop(1,'rgba(80,255,190,0)');
      g.fillStyle=a;g.beginPath();g.moveTo(X(-.1),Y(.5));g.bezierCurveTo(X(.3),Y(.1+k*.08),X(.6),Y(.45),X(1.1),Y(.15+k*.1));g.lineTo(X(1.1),Y(.3+k*.1));g.bezierCurveTo(X(.6),Y(.6),X(.3),Y(.25+k*.08),X(-.1),Y(.65));g.fill();}
    g.fillStyle='#04101a';g.beginPath();g.moveTo(x,Y(.8));g.lineTo(X(.25),Y(.55));g.lineTo(X(.45),Y(.72));g.lineTo(X(.7),Y(.5));g.lineTo(x+w,Y(.78));g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.fill();}
  if(F.scene==='forest'){for(let k=0;k<3;k++){g.fillStyle=['rgba(70,95,90,.5)','rgba(40,60,58,.75)','#16231f'][k];for(let i=0;i<7;i++){const tx=X((i+rnd()*.5)/7),ty=Y(.45+k*.12),th=h*(.3+k*.08);g.beginPath();g.moveTo(tx,ty-th*.6);g.lineTo(tx+w*.07,ty+th*.4);g.lineTo(tx-w*.07,ty+th*.4);g.fill();}}}
  if(F.scene==='grid'){const sun=g.createLinearGradient(0,Y(.2),0,Y(.55));sun.addColorStop(0,'#ffd23f');sun.addColorStop(1,'#ff2d95');g.fillStyle=sun;g.beginPath();g.arc(X(.5),Y(.5),w*.26,Math.PI,0);g.fill();
    g.fillStyle=F.sky[1];for(let i=0;i<5;i++)g.fillRect(x,Y(.36+i*.03),w,3+i);g.strokeStyle='#ff3fd2';g.lineWidth=2;
    for(let i=0;i<=10;i++){g.beginPath();g.moveTo(X(.5),Y(.5));g.lineTo(X(i/10*2-.5),y+h);g.stroke();}for(let i=0;i<6;i++){const yy=Y(.5+Math.pow(i/6,1.8)*.5);g.beginPath();g.moveTo(x,yy);g.lineTo(x+w,yy);g.stroke();}}
  if(F.scene==='runner'){g.fillStyle='#ffe1a8';g.beginPath();g.arc(X(.5),Y(.62),w*.22,0,7);g.fill();g.fillStyle='#3a1410';g.fillRect(x,Y(.7),w,h*.3);
    g.fillStyle='#1a0806';g.save();g.translate(X(.5),Y(.58));g.beginPath();g.arc(0,-h*.12,w*.035,0,7);g.fill();g.lineWidth=w*.03;g.strokeStyle='#1a0806';g.lineCap='round';
    g.beginPath();g.moveTo(0,-h*.09);g.lineTo(0,h*.0);g.moveTo(0,0);g.lineTo(-w*.06,h*.1);g.moveTo(0,0);g.lineTo(w*.07,h*.08);g.moveTo(0,-h*.06);g.lineTo(-w*.07,-h*.02);g.moveTo(0,-h*.06);g.lineTo(w*.07,-h*.1);g.stroke();g.restore();}
  // Title, tagline, credits, as on a one sheet.
  const shade=g.createLinearGradient(0,Y(.62),0,y+h);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.85)');g.fillStyle=shade;g.fillRect(x,Y(.6),w,h*.4);
  g.fillStyle='rgba(255,255,255,.75)';g.font=`600 ${w*.055}px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText(F.tag.toUpperCase(),X(.5),Y(.08));
  g.fillStyle='#ffffff';let fs=w*.2;g.font=`900 ${fs}px ${SANS}`;while(g.measureText(F.t).width>w*.9&&fs>10){fs-=2;g.font=`900 ${fs}px ${SANS}`;}g.fillText(F.t,X(.5),Y(.82));
  g.fillStyle='rgba(255,255,255,.45)';for(let i=0;i<2;i++)g.fillRect(X(.12),Y(.9+i*.03),w*.76,2);
  g.restore();
}

// Rankd's boutique: a cinema in Rankd's colours (near black glass, amber glow),
// the RANKD wordmark lit on the roof, the ticket logo glowing by the door, a wall
// of ranked poster tiles (#01 to #12, drawn, not real posters) and a "Which is
// better?" duel screen inside, rank badges floating slowly above.
export function buildRankdBoutique({x,z,top,w=9,d=17,h=5.2,facing=-1}){
  const AMBER='#f5a623',INKD='#0a0a10',f=facing;
  const base=buildLux({x,z,top,w,d,h,facing,band:false,palette:{gold:AMBER,tint:'#14121e',velvet:'#3a0f16'}});
  const root=base.root,hw=w/2,hd=d/2,face=f>0?Math.PI/2:-Math.PI/2;
  const amber=new THREE.MeshStandardMaterial({color:AMBER,emissive:AMBER,emissiveIntensity:2.2,roughness:.4});
  const add=(geo,m,px,py,pz,ry=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.rotation.y=ry;root.add(o);return o;};
  const lit=(tex,k=1)=>new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:'#ffffff',emissiveIntensity:k,roughness:.4,transparent:true});
  add(new THREE.BoxGeometry(w+.62,.1,d+.62),amber,x,top+h+.16,z);
  // RANKD on the roof: white letters, the A in amber.
  const word=imgTex('rankd-roof',2048,560,[],g=>{g.clearRect(0,0,2048,560);g.font=`700 400px ${SANS}`;g.textBaseline='alphabetic';g.textAlign='left';
    const parts=[['R','#ffffff'],['A',AMBER],['NKD','#ffffff']];let total=0;for(const [t] of parts)total+=g.measureText(t).width+28;let cx=(2048-total)/2;
    for(const [t,c] of parts){g.fillStyle=c;g.fillText(t,cx,440);cx+=g.measureText(t).width+28;}});
  add(new THREE.PlaneGeometry(8.6,2.35),Object.assign(lit(word,1.1),{depthWrite:false,side:THREE.DoubleSide}),x+f*(hw-.6),top+h+1.75,z,face);
  // The ticket logo, big and glowing, standing by the door.
  const ticket=new THREE.TextureLoader().load(url('logos/rankd.svg'));ticket.colorSpace=THREE.SRGBColorSpace;
  add(new THREE.BoxGeometry(.2,2.4,2.4),new THREE.MeshStandardMaterial({color:INKD,roughness:.4}),x+f*(hw+1.2),top+1.45,z-hd+2.4);
  add(new THREE.PlaneGeometry(2.3,2.3),lit(ticket,.8),x+f*(hw+1.31),top+1.45,z-hd+2.4,face);
  // Inside: a wall of ranked poster tiles on the back wall.
  const WW=d-3,WH=h-1.4,TH=Math.round(2048*WH/WW);
  const wall=imgTex('rankd-wall',2048,TH,[],g=>{g.fillStyle=INKD;g.fillRect(0,0,2048,TH);const cols=['#2b3a67','#6a2c3f','#2f5a4a','#7a4b1e','#3c2a63','#1f4f6e','#5c2a2a','#2a5d5d'];
    const n=8,gap=26,w2=(2048-gap*(n+1))/n,h2=Math.min(TH-60,w2*1.5),y0=(TH-h2)/2;
    for(let i=0;i<n;i++){const cx=gap+i*(w2+gap);paintCover(g,FILMS[i],cx,y0,w2,h2);
      g.fillStyle=i===0?AMBER:'#ffffff';g.beginPath();g.roundRect(cx+14,y0+14,100,62,31);g.fill();g.fillStyle=INKD;g.font=`900 42px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('#'+String(i+1).padStart(2,'0'),cx+64,y0+46);}});
  add(new THREE.PlaneGeometry(WW,WH),lit(wall,.7),x-f*(hw-.12),top+.3+WH/2+.3,z,face);
  // The duel screen: which is better?
  const duel=imgTex('rankd-duel',1600,900,[],g=>{g.fillStyle=INKD;g.fillRect(0,0,1600,900);g.fillStyle='#ffffff';g.font=`700 110px ${SANS}`;g.textAlign='center';g.fillText('Which is better?',800,150);
    paintCover(g,FILMS[0],420-230,240,460,600);paintCover(g,FILMS[6],1180-230,240,460,600);
    g.fillStyle=AMBER;g.beginPath();g.arc(800,530,90,0,7);g.fill();g.fillStyle=INKD;g.font=`900 70px ${SANS}`;g.textBaseline='middle';g.fillText('VS',800,534);});
  add(new THREE.BoxGeometry(.25,2.1,3.6),new THREE.MeshStandardMaterial({color:INKD,roughness:.3}),x,top+.25+1.6,z+hd*.45);
  add(new THREE.PlaneGeometry(3.4,1.9),lit(duel,.8),x+f*.14,top+.25+1.6,z+hd*.45,face);
  // Rank badges floating above the roof.
  const badge=(n,i)=>{const t=imgTex('rankd-badge-'+n,512,256,[],g=>{g.clearRect(0,0,512,256);g.fillStyle=i===0?AMBER:'#ffffff';g.beginPath();g.roundRect(16,40,480,176,88);g.fill();
      g.fillStyle=INKD;g.font=`900 120px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('#'+n,256,132);});
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false,color:'#c9c9d6'}));sp.scale.set(2.4,1.2,1);root.add(sp);return sp;};
  const badges=['01','02','03'].map((n,i)=>({sp:badge(n,i),y:top+h+4.2+i*.9,ph:i*1.7}));
  let clock=0;
  return {root,solid:base.solid,update(dt){clock+=Math.min(dt,.1);
    badges.forEach((b,i)=>{b.sp.position.set(x+f*(hw-1.5)+Math.sin(clock*.45+b.ph)*.5,b.y+Math.sin(clock*1+b.ph)*.2,z+(i-1)*3.4);});
    amber.emissiveIntensity=1.9+Math.sin(clock*1.1)*.4;}};
}

// The Lux Garage: a glass car showroom in platinum and dark glass, LUX GARAGE lit
// on the roof, two glowing turntables slowly turning display cars. Park in its bay
// and press Enter to change your own car. `makeCar(i)` builds a display car.
export function buildGarage({x,z,top,w=9,d=17,h=5.2,facing=-1,makeCar}){
  const PLAT='#d6dbe2',f=facing;
  const base=buildLux({x,z,top,w,d,h,facing,band:false,showroom:true,palette:{gold:PLAT,tint:'#10151c',velvet:'#26272c'}});
  const root=base.root,hw=w/2,hd=d/2,face=f>0?Math.PI/2:-Math.PI/2;
  const white=new THREE.MeshStandardMaterial({color:'#eef4ff',emissive:'#cfe0ff',emissiveIntensity:2.2,roughness:.4});
  const add=(geo,m,px,py,pz,ry=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.rotation.y=ry;root.add(o);return o;};
  add(new THREE.BoxGeometry(w+.62,.1,d+.62),white,x,top+h+.16,z);
  const word=imgTex('garage-roof',2048,460,[],g=>{g.clearRect(0,0,2048,460);g.font=`300 230px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ffffff';
    g.fillText('L U X   G A R A G E',1024,230);});
  const wm=new THREE.MeshStandardMaterial({map:word,emissiveMap:word,emissive:'#ffffff',emissiveIntensity:1.1,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  add(new THREE.PlaneGeometry(8.8,1.98),wm,x+f*(hw-.6),top+h+1.3,z,face);
  // Turntables with display cars, slowly turning, each under a ring of light.
  const tables=[];
  for(const [k,tz] of [[0,-hd*.42],[1,hd*.42]]){
    add(new THREE.CylinderGeometry(2.7,2.8,.18,48),new THREE.MeshStandardMaterial({color:'#1a1c22',roughness:.15,metalness:.6}),x,top+.34,z+tz);
    add(new THREE.TorusGeometry(2.75,.05,8,72).rotateX(Math.PI/2),white,x,top+.44,z+tz);
    add(new THREE.TorusGeometry(2.2,.04,8,64).rotateX(Math.PI/2),white,x,top+h-.6,z+tz);
    const spin=new THREE.Group();spin.position.set(x,top+.43,z+tz);root.add(spin);
    try{makeCar?.(k?2:1,spin);}catch(e){console.warn(e);}   // Roadster and Muscle on the turntables
    tables.push(spin);}
  let clock=0;
  return {root,solid:base.solid,update(dt){clock+=Math.min(dt,.1);tables.forEach((t,i)=>{t.rotation.y=clock*.25*(i?-1:1);});white.emissiveIntensity=2+Math.sin(clock*1.2)*.3;}};
}
