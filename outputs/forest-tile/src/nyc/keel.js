import * as THREE from 'three';

// Keel HQ: Armin's project, a one floor pavilion with a giant "Keel." sign on
// the roof, the "Meet Keel." banner from keeltwin.com on its face and the
// character's poses along its side. The front faces south (+z), onto the street
// where the drive starts.
const BLUE='#2f6bff',INK='#1d1d1f';
const IMG=name=>`${import.meta.env.BASE_URL}keel/${name}`;
const FONT='-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif';

// A canvas texture that redraws when its images arrive.
function canvasTexture(w,h,draw,images=[]){
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const imgs=images.map(src=>{const im=new Image();im.src=IMG(src);return im;});
  const paint=()=>{g.clearRect(0,0,w,h);draw(g,imgs.map(im=>im.complete&&im.naturalWidth?im:null));tex.needsUpdate=true;};
  paint();imgs.forEach(im=>im.addEventListener('load',paint));
  return tex;
}
// Draw an image to fill a box (cover).
const cover=(g,im,x,y,w,h)=>{if(!im)return;const s=Math.max(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*s,ih=im.naturalHeight*s;
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih);g.restore();};
const contain=(g,im,x,y,w,h)=>{if(!im)return;const s=Math.min(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*s,ih=im.naturalHeight*s;g.drawImage(im,x+(w-iw)/2,y+(h-ih),iw,ih);};

export function buildKeel({block:b,top}){
  const root=new THREE.Group();root.name='keel-hq';
  const solids=[],occluders=[];
  // One floor: a white pavilion with a glass storefront, the "Meet Keel." banner
  // on its face, the poses along the side, and the giant name on the roof.
  const cx=(b.x0+b.x1)/2,W=Math.min(20,b.x1-b.x0-6),D=10,H=5,cz=b.z1-2.6-2-D/2,front=cz+D/2;
  const white=new THREE.MeshStandardMaterial({color:'#f4f5f7',roughness:.35,metalness:.05});
  const glass=new THREE.MeshStandardMaterial({color:'#24324a',roughness:.08,metalness:.6,envMapIntensity:1.6,emissive:'#ffb15c',emissiveIntensity:.35});
  const blue=new THREE.MeshStandardMaterial({color:BLUE,roughness:.4,emissive:BLUE,emissiveIntensity:.6});
  const mesh=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
  mesh(new THREE.BoxGeometry(W,H,D),white,cx,top+H/2,cz);
  mesh(new THREE.BoxGeometry(W+.8,.5,D+.8),white,cx,top+H+.25,cz);                 // roof slab
  mesh(new THREE.BoxGeometry(W+.84,.16,D+.84),blue,cx,top+H+.08,cz);               // a glowing blue line under it
  // Banner on the left of the front, storefront glass on the right.
  const banW=W*.42,banH=Math.min(H-.7,banW*.62);
  const banTex=canvasTexture(1600,992,(g,[pose])=>{
    const grd=g.createLinearGradient(0,0,0,992);grd.addColorStop(0,'#ffffff');grd.addColorStop(1,'#eaf0ff');g.fillStyle=grd;g.fillRect(0,0,1600,992);
    g.fillStyle=INK;g.font=`700 200px ${FONT}`;g.fillText('Meet',70,300);g.fillStyle=BLUE;g.fillText('Keel.',70,510);
    g.fillStyle='#6e6e73';g.font=`500 64px ${FONT}`;g.fillText('The AI assistant',74,650);g.fillText('you text like a friend.',74,730);
    g.fillStyle=BLUE;g.beginPath();g.roundRect(70,800,560,120,60);g.fill();g.fillStyle='#fff';g.font=`600 52px ${FONT}`;g.fillText('keeltwin.com',148,878);
    contain(g,pose,760,40,820,952);},['pose-chat.webp']);
  const ban=new THREE.MeshStandardMaterial({map:banTex,emissiveMap:banTex,emissive:'#ffffff',emissiveIntensity:.6,roughness:.7});
  const bx=cx-W/2+.6+banW/2;mesh(new THREE.PlaneGeometry(banW,banH),ban,bx,top+.35+banH/2,front+.03);
  const gw=W-banW-1.8,gx=cx+W/2-.6-gw/2;mesh(new THREE.BoxGeometry(gw,H-1,.12),glass,gx,top+(H-1)/2+.15,front+.02);
  for(let k=1;k<4;k++)mesh(new THREE.BoxGeometry(.12,H-1,.16),white,gx-gw/2+k*gw/4,top+(H-1)/2+.15,front+.04);
  // The giant name on the roof: "Keel." in black with a blue dot, glowing at night.
  const signW=W+4,signH=signW*.3,signY=top+H+.5+1.2+signH/2;
  const signTex=canvasTexture(2048,614,g=>{
    g.fillStyle='#ffffff';g.fillRect(0,0,2048,614);
    g.font=`700 470px ${FONT}`;g.textBaseline='alphabetic';const t='Keel',w=g.measureText(t).width,dot=g.measureText('.').width,x=(2048-w-dot)/2;
    g.fillStyle=INK;g.fillText(t,x,500);g.fillStyle=BLUE;g.fillText('.',x+w,500);});
  const sign=new THREE.MeshStandardMaterial({map:signTex,emissiveMap:signTex,emissive:'#ffffff',emissiveIntensity:.42,roughness:.6});
  mesh(new THREE.BoxGeometry(signW,signH,.4),[white,white,white,white,sign,white],cx,signY,cz+1);
  for(const s of [-1,1])mesh(new THREE.BoxGeometry(.4,1.4,.4),white,cx+s*signW*.35,top+H+.5+.7,cz+1);
  // Keel's poses along the east side, facing the avenue you arrive on.
  const poses=['pose-remind.webp','pose-money.webp','pose-plan.webp'],pw=(D-1.6)/3-.4,ph=Math.min(H-1,pw*1.12);
  poses.forEach((p,i)=>{const tex=canvasTexture(512,576,(g,[im])=>{g.fillStyle='#eef3ff';g.fillRect(0,0,512,576);contain(g,im,16,16,480,560);},[p]);
    const o=mesh(new THREE.PlaneGeometry(pw,ph),new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:'#ffffff',emissiveIntensity:.45,roughness:.7}),cx+W/2+.03,top+.5+ph/2,cz-D/2+1+pw/2+i*(pw+.4));o.rotation.y=Math.PI/2;});
  solids.push([cx,cz,W/2+.4,D/2+.4]);
  occluders.push(new THREE.Box3(new THREE.Vector3(cx-W/2,top,cz-D/2),new THREE.Vector3(cx+W/2,top+H+signH+2,cz+D/2)));
  return {root,solids,occluders,place:{x:cx,z:cz,y:top+4,dist:28}};
}

// Just the giant "Keel." name on two posts, for the roof of Keel's store.
export function buildKeelSign({x,z,y,width}){
  const root=new THREE.Group();root.name='keel-sign';
  const white=new THREE.MeshStandardMaterial({color:'#f4f5f7',roughness:.35,metalness:.05});
  const signTex=canvasTexture(2048,614,g=>{
    g.fillStyle='#ffffff';g.fillRect(0,0,2048,614);
    g.font=`700 470px ${FONT}`;g.textBaseline='alphabetic';const t='Keel',w=g.measureText(t).width,dot=g.measureText('.').width,x0=(2048-w-dot)/2;
    g.fillStyle=INK;g.fillText(t,x0,500);g.fillStyle=BLUE;g.fillText('.',x0+w,500);});
  const sign=new THREE.MeshStandardMaterial({map:signTex,emissiveMap:signTex,emissive:'#ffffff',emissiveIntensity:.42,roughness:.6});
  const h=width*.3,board=new THREE.Mesh(new THREE.BoxGeometry(width,h,.4),[white,white,white,white,sign,white]);
  board.position.set(x,y+1.4+h/2,z);board.castShadow=true;root.add(board);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.4,1.5,.4),white);p.position.set(x+s*width*.35,y+.75,z);p.castShadow=true;root.add(p);}
  return root;
}
