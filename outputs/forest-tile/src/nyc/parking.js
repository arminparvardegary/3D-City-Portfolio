import * as THREE from 'three';
import { BRAND, imgTex, round } from '../stores/brand.ts';
import { EDGE, HALF } from './drive/layout.js';

// A parking bay in front of each of Armin's places (his four companies and Keel).
// Made to be found: a painted bay with a big P, an orange outline that glows and
// pulses brighter as the car comes near, a hand drawn "PARK HERE" label bobbing
// above it (and Keel's lit logo sign beside its bay). main.js shows
// "Enter" when the car stops inside a bay.
const HAND='"Amatic SC","Marker Felt",cursive',SANS='-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif';

// Keel's logo panel (square, high resolution).
function keelPanel(){
  const B=BRAND.keel,S=1024;
  return imgTex('panel-keel',S,S,[B.logo],(g,[im])=>{g.fillStyle='#ffffff';g.fillRect(0,0,S,S);round(g,im,S/2,S*.38,S*.26);
    g.font=`700 200px ${SANS}`;g.textBaseline='alphabetic';g.fillStyle='#1d1d1f';const w=g.measureText('Keel').width,d=g.measureText('.').width;
    g.textAlign='left';g.fillText('Keel',(S-w-d)/2,S*.9);g.fillStyle=B.color;g.fillText('.',(S-w-d)/2+w,S*.9);});
}

// The floating "PARK HERE" label: drawn at 2048 x 1024 so it stays crisp up close,
// with a dark outline instead of a blurry shadow, and drawn again once the hand
// font has loaded.
function parkLabel(name){
  const W=2048,H=1024,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;
  const text=(str,y,size,fill)=>{g.font=`700 ${size}px ${HAND}`;g.lineJoin='round';g.lineWidth=size*.12;g.strokeStyle='rgba(16,10,40,.85)';g.strokeText(str,W/2,y);g.fillStyle=fill;g.fillText(str,W/2,y);};
  const draw=()=>{g.clearRect(0,0,W,H);g.textAlign='center';g.textBaseline='middle';
    text('PARK HERE',290,380,'#ffffff');text(name,560,220,'#ffd08a');
    g.lineCap='round';g.lineJoin='round';
    for(const [w,col] of [[64,'rgba(16,10,40,.85)'],[38,'#ffffff']]){g.lineWidth=w;g.strokeStyle=col;g.beginPath();g.moveTo(W/2,700);g.lineTo(W/2,950);g.moveTo(W/2-110,850);g.lineTo(W/2,960);g.lineTo(W/2+110,850);g.stroke();}
    t.needsUpdate=true;};
  draw();document.fonts?.ready.then(draw);
  return t;
}

export function buildParking({places,top}){
  const root=new THREE.Group();root.name='parking';
  const bays=[],solids=[];
  const paint=new THREE.MeshStandardMaterial({color:'#ecebe6',roughness:.6});
  const post=new THREE.MeshStandardMaterial({color:'#24262b',roughness:.4,metalness:.6});
  const pTex=imgTex('park-p',256,256,[],g=>{g.fillStyle='#ecebe6';g.font=`900 220px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('P',128,138);});
  const add=(geo,mat,x,y,z,ry=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.y=ry;m.receiveShadow=true;root.add(m);return m;};
  for(const P of places){
    // A parallel bay in a parking lane, right in front of the place. Built in its
    // own frame (length along local x, the curb and the place toward local +z),
    // then turned: axis 'x' for streets, 'z' for avenues; side +1 / -1 says which
    // way the place is. The bay fills the lane exactly: white edge line to curb.
    const {id,name,x,z,side,axis='x',store}=P,LX=6.2,LZ=HALF-EDGE-.1,y=top-.25+.012;   // street level (top is the sidewalk)
    const G=new THREE.Group();G.position.set(x,0,z);G.rotation.y=axis==='x'?(side>0?0:Math.PI):(side>0?Math.PI/2:-Math.PI/2);root.add(G);
    const put=(geo,mat,lx,ly,lz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(lx,ly,lz);m.receiveShadow=true;G.add(m);return m;};
    for(const s2 of [-1,1])put(new THREE.BoxGeometry(.14,.02,LZ),paint,s2*LX/2,y,0);   // end marks; the edge line and the curb are the sides
    const p=put(new THREE.PlaneGeometry(1.4,1.4),new THREE.MeshStandardMaterial({map:pTex,transparent:true,roughness:.6}),0,y+.005,0);
    p.rotation.set(-Math.PI/2,0,Math.PI);
    // Glowing outline, its own material so it can pulse; inside the lane, never over the lines.
    const glow=new THREE.MeshStandardMaterial({color:'#ffb05a',emissive:'#ff9a3c',emissiveIntensity:1.2,transparent:true,opacity:.9,depthWrite:false});
    for(const s2 of [-1,1])put(new THREE.BoxGeometry(.08,.03,LZ-.2),glow,s2*(LX/2-.2),y+.004,0);
    for(const s2 of [-1,1])put(new THREE.BoxGeometry(LX-.32,.03,.08),glow,0,y+.004,s2*(LZ/2-.14));
    // "PARK HERE" above the bay, its colour just under the bloom so the edges stay sharp.
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:parkLabel(name),color:'#b8b2d0',transparent:true,depthWrite:false,fog:false}));
    label.scale.set(3.6,1.8,1);label.position.set(0,top+3.1,0);label.renderOrder=5;G.add(label);
    // A logo sign on the sidewalk only for Keel (the companies' stores carry their own logos).
    if(id==='keel'){
      const lx=LX/2-.4,lz=LZ/2+2.15;
      put(new THREE.CylinderGeometry(.09,.11,2.66,10),post,lx,top+1.33,lz).castShadow=true;   // ends under the panel, never across the logo
      const tex=keelPanel(),panel=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:'#ffffff',emissiveIntensity:.55,roughness:.5});
      put(new THREE.BoxGeometry(1.9,1.9,.14),[post,post,post,post,panel,panel],lx,top+3.6,lz).castShadow=true;
      G.updateMatrixWorld(true);const w=G.localToWorld(new THREE.Vector3(lx,0,lz));solids.push([w.x,w.z,.2,.2]);
    }
    // Heading for a car parked here: along the lane, the way traffic runs on that side.
    const h=axis==='x'?(side>0?Math.PI/2:-Math.PI/2):(side>0?Math.PI:0);
    bays.push({id,name,x,z,w:axis==='x'?LX:LZ+.6,d:axis==='x'?LZ+.6:LX,axis,h,store,glow,label,base:top+3.1,phase:Math.random()*6,near:0,fade:1});
  }
  let clock=0;
  return {root,bays,solids,
    // Slow and smooth, on its own clock in seconds: the outline breathes (about
    // 3.5 s a cycle) and eases brighter as the car comes near; the label floats
    // gently (about 4 s) and fades out once you are parked.
    update(dt,car){clock+=Math.min(dt,.1);
      for(const b of bays){const d=car?Math.hypot(car.x-b.x,car.z-b.z):99,nearGoal=THREE.MathUtils.clamp(1-(d-3)/22,0,1);
        b.near=THREE.MathUtils.damp(b.near,nearGoal,2.5,dt);
        const breathe=.5+.5*Math.sin(clock*1.8+b.phase);
        b.glow.emissiveIntensity=.9+b.near*1.8+breathe*(.25+b.near*.45);
        const show=d<2.2?0:1;b.fade=THREE.MathUtils.damp(b.fade,show,4,dt);
        b.label.material.opacity=b.fade;b.label.visible=b.fade>.01;
        b.label.position.y=b.base+Math.sin(clock*1.55+b.phase)*.12;}},
  };
}

// A smart board standing on the plaza at the start of the row: a glowing screen
// in a slim dark frame on a pedestal, "MY WORK EXPERIENCE", lit at night, with an
// arrow along the row. The screen is drawn again once the hand font loads.
export function experienceBoard({x,z,top,yaw=0,arrow=1}){
  const w=4.6,h=3.2,W=2048,H=Math.round(W*h/w),c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  const draw=()=>{const grd=g.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#1c1640');grd.addColorStop(1,'#0e0b24');g.fillStyle=grd;g.fillRect(0,0,W,H);
    g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#ff9a4a';g.font=`700 ${H*.13}px ${HAND}`;g.fillText('MY',W/2,H*.15);
    g.fillStyle='#ffffff';g.font=`700 ${H*.27}px ${HAND}`;g.fillText('WORK',W/2,H*.36);g.fillText('EXPERIENCE',W/2,H*.6);
    g.fillStyle='#b9b0ef';g.font=`700 ${H*.1}px ${HAND}`;g.fillText('4 companies  ·  2019 to 2026',W/2,H*.78);
    g.strokeStyle='#ff9a4a';g.lineWidth=H*.025;g.lineCap='round';g.lineJoin='round';const ay=H*.9,ax=W/2,len=W*.2,d=arrow;
    g.beginPath();g.moveTo(ax-d*len,ay);g.lineTo(ax+d*len,ay);g.moveTo(ax+d*len-d*H*.05,ay-H*.05);g.lineTo(ax+d*len,ay);g.lineTo(ax+d*len-d*H*.05,ay+H*.05);g.stroke();
    t.needsUpdate=true;};
  draw();document.fonts?.ready.then(draw);
  const root=new THREE.Group();root.position.set(x,top,z);root.rotation.y=yaw;
  const frame=new THREE.MeshStandardMaterial({color:'#15161a',roughness:.35,metalness:.6});
  const mesh=(geo,mat,px,py,pz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
  const sy=1.1+h/2;
  mesh(new THREE.BoxGeometry(w+.24,h+.24,.22),frame,0,sy,0);
  mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:'#ffffff',emissiveIntensity:.9,roughness:.25}),0,sy,.115);
  mesh(new THREE.BoxGeometry(.5,1.1,.32),frame,0,.55,0);                  // the stand
  mesh(new THREE.BoxGeometry(2.2,.12,1.1),frame,0,.06,0);                 // the foot
  // A soft glow on the ground in front of the screen.
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(w*.9,1.6),new THREE.MeshBasicMaterial({color:'#6a5cff',transparent:true,opacity:.18,depthWrite:false}));
  glow.rotation.x=-Math.PI/2;glow.position.set(0,.01,1);root.add(glow);
  const solid=[x,z,1.4,1.4];
  return {root,solid};
}
