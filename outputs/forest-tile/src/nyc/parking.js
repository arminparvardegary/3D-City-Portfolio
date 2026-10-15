import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BRAND, imgTex, contain, round, url } from '../stores/brand.ts';
import { EDGE, HALF } from './drive/layout.js';

// A parking bay in front of each of Armin's places (his four companies and Keel).
// Made to be found: a painted bay with a big P, an orange outline that glows and
// pulses brighter as the car comes near, a hand drawn "PARK HERE" label bobbing
// above it, and a tall lit sign with the company's logo beside it. main.js shows
// "Enter" when the car stops inside a bay.
const HAND='"Amatic SC","Marker Felt",cursive',SANS='-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif';

// The big logo panel for each place (square, high resolution).
function logoPanel(id){
  const B=BRAND[id],S=1024;
  if(id==='rush')return imgTex('panel-rush',S,S,[],g=>{g.fillStyle='#141416';g.fillRect(0,0,S,S);
    g.fillStyle='#fff';g.font=`italic 900 300px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('RUSH',S/2,S*.45);
    g.fillStyle=B.color;g.font=`800 110px ${SANS}`;g.fillText('GRAPHICS',S/2,S*.7);g.fillRect(S*.2,S*.8,S*.6,18);});
  if(id==='hindra')return imgTex('panel-hindra',S,S,[B.logo],(g,[im])=>{g.fillStyle='#ffffff';g.fillRect(0,0,S,S);round(g,im,S/2,S*.42,S*.3);
    g.fillStyle='#111';g.font=`700 120px ${SANS}`;g.textAlign='center';g.textBaseline='alphabetic';g.fillText('Hindra',S/2,S*.9);});
  if(id==='aaq')return imgTex('panel-aaq',S,S,[B.logo],(g,[im])=>{g.fillStyle='#ffffff';g.fillRect(0,0,S,S);contain(g,im,40,60,S-80,S-120);});
  if(id==='bigup')return imgTex('panel-bigup',S,S,[B.logo],(g,[im])=>{g.fillStyle='#ffffff';g.fillRect(0,0,S,S);
    g.fillStyle=B.color;g.beginPath();g.arc(S/2,S*.38,S*.27,0,Math.PI*2);g.fill();
    if(im){const sw=336,sh=337,k=S*.36/sh;g.drawImage(im,0,0,sw,sh,S/2-sw*k/2,S*.38-sh*k/2,sw*k,sh*k);}
    contain(g,im,60,S*.7,S-120,S*.2);});
  return imgTex('panel-keel',S,S,[B.logo],(g,[im])=>{g.fillStyle='#ffffff';g.fillRect(0,0,S,S);round(g,im,S/2,S*.38,S*.26);
    g.font=`700 200px ${SANS}`;g.textAlign='center';g.textBaseline='alphabetic';g.fillStyle='#1d1d1f';const w=g.measureText('Keel').width,d=g.measureText('.').width;
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
    // A parallel bay in the street's parking lane, right in front of the place.
    // side: +1 the curb (and the place) is toward +z, -1 toward -z.
    // The bay fills the parking lane exactly: from the white edge line to the curb.
    const {id,name,x,z,side}=P,LX=6.2,LZ=HALF-EDGE-.1,y=top-.25+.012;   // street level (top is the sidewalk)
    // Paint: T marks at both ends and the outer lane line, a big P.
    for(const s2 of [-1,1])add(new THREE.BoxGeometry(.14,.02,LZ),paint,x+s2*LX/2,y,z);   // end marks; the edge line and the curb are the sides
    const p=add(new THREE.PlaneGeometry(1.4,1.4),new THREE.MeshStandardMaterial({map:pTex,transparent:true,roughness:.6}),x,y+.005,z);
    p.rotation.set(-Math.PI/2,0,side>0?Math.PI:0);
    // Glowing outline, its own material so it can pulse.
    const glow=new THREE.MeshStandardMaterial({color:'#ffb05a',emissive:'#ff9a3c',emissiveIntensity:1.2,transparent:true,opacity:.9,depthWrite:false});
    for(const s2 of [-1,1])add(new THREE.BoxGeometry(.08,.03,LZ-.2),glow,x+s2*(LX/2-.2),y+.004,z);
    for(const s2 of [-1,1])add(new THREE.BoxGeometry(LX-.32,.03,.08),glow,x,y+.004,z+s2*(LZ/2-.14));   // inside the lane, never over the lines
    // "PARK HERE" above the bay.
    // Colour just under the bloom threshold: the label glows softly but its edges stay sharp.
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:parkLabel(name),color:'#b8b2d0',transparent:true,depthWrite:false,fog:false}));
    label.scale.set(3.6,1.8,1);label.position.set(x,top+3.1,z);label.renderOrder=5;root.add(label);
    // The logo sign on the sidewalk at the end of the bay: a post and a lit square panel, both faces.
    const sx=x+LX/2-.4,sz=z+side*(LZ/2+1.25+.9);
    add(new THREE.CylinderGeometry(.09,.11,3.2,10),post,sx,top+1.6,sz).castShadow=true;
    const tex=logoPanel(id),panel=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:'#ffffff',emissiveIntensity:.55,roughness:.5});
    const sign=add(new THREE.BoxGeometry(1.9,1.9,.14),[post,post,post,post,panel,panel],sx,top+3.6,sz);sign.castShadow=true;
    solids.push([sx,sz,.2,.2]);
    if(id==='rush'){   // the real 3D Rush logo on top of its sign
      new GLTFLoader().load(url('logos/rush.glb'),gl=>{const o=gl.scene,box=new THREE.Box3().setFromObject(o),s3=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3()),k=1.1/Math.max(s3.x,s3.y,s3.z);
        o.scale.setScalar(k);o.position.set(sx-c.x*k,top+4.65-box.min.y*k,sz-c.z*k);
        const m=new THREE.MeshStandardMaterial({color:BRAND.rush.color,emissive:BRAND.rush.color,emissiveIntensity:1});o.traverse(n=>{if(n.isMesh){n.material=m;n.castShadow=true;}});root.add(o);});
    }
    bays.push({id,name,x,z,w:LX,d:LZ+.6,glow,label,base:top+3.1,phase:Math.random()*6});
  }
  return {root,bays,solids,
    // Pulse each bay, brighter as the car comes near; the label bobs and hides once parked.
    update(t,car){for(const b of bays){const d=car?Math.hypot(car.x-b.x,car.z-b.z):99,near=THREE.MathUtils.clamp(1-(d-3)/22,0,1);
      b.glow.emissiveIntensity=.8+near*2.2+Math.sin(t*3+b.phase)*(.3+near*.6);
      const inside=d<2.2;b.label.visible=!inside;b.label.position.y=b.base+Math.sin(t*2+b.phase)*.15;}},
  };
}
