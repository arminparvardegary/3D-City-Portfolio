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
    // A logo sign on the sidewalk only for Keel (the four companies' stores carry their own logos).
    if(id==='keel'){
    const sx=x+LX/2-.4,sz=z+side*(LZ/2+1.25+.9);
    add(new THREE.CylinderGeometry(.09,.11,2.66,10),post,sx,top+1.33,sz).castShadow=true;   // ends under the panel, never across the logo
    const tex=keelPanel(),panel=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:'#ffffff',emissiveIntensity:.55,roughness:.5});
    const sign=add(new THREE.BoxGeometry(1.9,1.9,.14),[post,post,post,post,panel,panel],sx,top+3.6,sz);sign.castShadow=true;
    solids.push([sx,sz,.2,.2]);
    }
    bays.push({id,name,x,z,w:LX,d:LZ+.6,glow,label,base:top+3.1,phase:Math.random()*6,near:0,fade:1});
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
