import * as THREE from 'three';

// Keel HQ: Armin's company, the tallest thing on his corner. A white tower with
// glass bands, a giant "Keel." sign on the roof, the "Meet Keel." banner from
// keeltwin.com on its face and the character's poses as posters at street level.
// Everything faces south (+z), toward the start of the drive.
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
  const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2+1,W=Math.min(18,b.x1-b.x0-6),D=Math.min(15,b.z1-b.z0-7),H=46,front=cz+D/2;
  const white=new THREE.MeshStandardMaterial({color:'#f4f5f7',roughness:.35,metalness:.05});
  const glass=new THREE.MeshStandardMaterial({color:'#24324a',roughness:.08,metalness:.6,envMapIntensity:1.6});
  const blue=new THREE.MeshStandardMaterial({color:BLUE,roughness:.4});
  const mesh=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
  // Podium, tower, glass bands (one merged mesh), a blue crown line.
  mesh(new THREE.BoxGeometry(W+4,5,D+4),white,cx,top+2.5,cz);
  mesh(new THREE.BoxGeometry(W,H-5,D),white,cx,top+5+(H-5)/2,cz);
  const bands=[];for(let y=top+7;y<top+H-2;y+=3.2)bands.push(new THREE.BoxGeometry(W+.1,1.6,D+.1).translate(cx,y,cz));
  for(const g of bands)mesh(g,glass,0,0,0);
  mesh(new THREE.BoxGeometry(W+.4,.6,D+.4),blue,cx,top+H,cz);
  // The giant roof sign: "Keel." in black with a blue dot, on a white board with a frame.
  const signW=W+8,signH=signW*.3,signY=top+H+.6+signH/2+1.2;
  const signTex=canvasTexture(2048,614,g=>{
    g.fillStyle='#ffffff';g.fillRect(0,0,2048,614);
    g.font=`700 470px ${FONT}`;g.textBaseline='alphabetic';const t='Keel',w=g.measureText(t).width,dot=g.measureText('.').width,x=(2048-w-dot)/2;
    g.fillStyle=INK;g.fillText(t,x,500);g.fillStyle=BLUE;g.fillText('.',x+w,500);});
  const sign=new THREE.MeshStandardMaterial({map:signTex,emissiveMap:signTex,emissive:'#ffffff',emissiveIntensity:.35,roughness:.6});
  mesh(new THREE.BoxGeometry(signW,signH,.4),[white,white,white,white,sign,white],cx,signY,cz+D/2-1.5);
  for(const s of [-1,1])mesh(new THREE.BoxGeometry(.4,1.6,.4),white,cx+s*signW*.35,top+H+1.1,cz+D/2-1.5);
  // The banner from the landing page: the character, "Meet Keel." and the line under it.
  const banW=W-2,banH=banW*.62;
  const banTex=canvasTexture(1600,992,(g,[pose])=>{
    const grd=g.createLinearGradient(0,0,0,992);grd.addColorStop(0,'#ffffff');grd.addColorStop(1,'#eaf0ff');g.fillStyle=grd;g.fillRect(0,0,1600,992);
    g.fillStyle=INK;g.font=`700 200px ${FONT}`;g.fillText('Meet',70,300);g.fillStyle=BLUE;g.fillText('Keel.',70,510);
    g.fillStyle='#6e6e73';g.font=`500 64px ${FONT}`;g.fillText('The AI assistant',74,650);g.fillText('you text like a friend.',74,730);
    g.fillStyle=BLUE;g.beginPath();g.roundRect(70,800,560,120,60);g.fill();g.fillStyle='#fff';g.font=`600 52px ${FONT}`;g.fillText('keeltwin.com',148,878);
    contain(g,pose,760,40,820,952);},['pose-chat.webp']);
  const ban=new THREE.MeshStandardMaterial({map:banTex,emissiveMap:banTex,emissive:'#ffffff',emissiveIntensity:.25,roughness:.7});
  mesh(new THREE.PlaneGeometry(banW,banH),ban,cx,top+7+banH/2,front+.08);
  // Street posters on the podium: three of Keel's poses.
  const poses=['pose-remind.webp','pose-money.webp','pose-plan.webp'],pw=(W+2)/3-.8,ph=3.6;
  poses.forEach((p,i)=>{const tex=canvasTexture(512,576,(g,[im])=>{g.fillStyle='#eef3ff';g.fillRect(0,0,512,576);contain(g,im,16,16,480,560);},[p]);
    mesh(new THREE.PlaneGeometry(pw,ph),new THREE.MeshStandardMaterial({map:tex,roughness:.7}),cx-(W+2)/2+pw/2+.4+i*(pw+.8),top+.6+ph/2,cz+D/2+2.06);});
  solids.push([cx,cz,(W+4)/2,(D+4)/2]);
  occluders.push(new THREE.Box3(new THREE.Vector3(cx-W/2,top,cz-D/2),new THREE.Vector3(cx+W/2,top+H,cz+D/2)));
  return {root,solids,occluders,place:{x:cx,z:cz,y:top+H*.62,dist:62}};
}
