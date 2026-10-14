import * as THREE from 'three';
import { createKit, facade } from '../diorama/kit.js';
import { JOBS, SHOPS } from '../data/profile.js';
import { NYC } from './city.js';

// Armin's own streets inside New York, built at full size around the car (world
// units, not the city's scaled ones):
// - Experience Row: his four companies side by side, oldest to newest, taller as
//   the career grows, each with its name and years on the front. In front is a
//   street level parking lot with one bay per company; parking there starts the
//   experience story (see main.js).
// - Skills Street: twelve small places named after his tools and skills, with
//   striped awnings and a sign on the roof ("Figma Café", "Behance Restaurant").
export function buildDistrict({row:R,shops:SH,top}){
  const root=new THREE.Group(),K=createKit(),{box,cyl,add,mat}=K;
  const solids=[],signs=[];
  const sign=(text,sub,accent,w,h,{x,y,z,yaw=0})=>{
    const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const g=c.getContext('2d'),H=c.height;
    g.fillStyle='#ffffff';g.beginPath();g.roundRect(4,4,504,H-8,Math.min(28,H*.2));g.fill();g.strokeStyle=accent;g.lineWidth=8;g.stroke();
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#2f3440';const f='-apple-system, "SF Pro Display", Arial, sans-serif';
    let size=Math.min(H*.4,96);g.font=`700 ${size}px ${f}`;while(g.measureText(text).width>470&&size>20){size-=2;g.font=`700 ${size}px ${f}`;}
    g.fillText(text,256,sub?H*.4:H/2);if(sub){g.fillStyle=accent;g.font=`600 ${Math.min(H*.3,64)}px ${f}`;g.fillText(sub,256,H*.76);}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
    // A white backing (merged with the rest) and one textured face: one draw call per sign.
    add(new THREE.BoxGeometry(w,h,.15).rotateY(yaw),'#ffffff',[x,y,z]);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.6}));
    m.position.set(x+Math.sin(yaw)*.08,y,z+Math.cos(yaw)*.08);m.rotation.y=yaw;m.receiveShadow=true;root.add(m);signs.push(m);return m;
  };
  const tint=(hex,k=.55)=>'#'+new THREE.Color(hex).lerp(new THREE.Color('#ffffff'),k).getHexString();

  // --- Experience Row -----------------------------------------------------------
  const {x0,x1,z0,z1}=R,slabD=16,front=z0+slabD;
  box(x1-x0,top-.12,slabD,(x0+x1)/2,.12,z0+slabD/2,NYC.walk);solids.push([(x0+x1)/2,z0+slabD/2,(x1-x0)/2,slabD/2]);
  const slot=(x1-x0)/JOBS.length,heights=[10,13,16,21],row=[],bays=[];
  const lot={x0,x1,z0:front,z1,bayZ:[front+1.8,front+9.8],bays};
  [...JOBS].reverse().forEach((j,i)=>{
    const x=x0+slot*(i+.5),w=slot-1.7,d=11,z=front-1.4-d/2,h=heights[i],wall=mat(tint(j.accent),{map:facade(i===3?'glass':'stone')});wall.userData.uvSize=1.1;
    box(w,h,d,x,top,z,wall);box(w+.3,.35,d+.3,x,top+h,z,NYC.white);box(w*.45,.6,d*.3,x-w*.15,top+h+.35,z,NYC.white);
    box(w*.36,2.6,.12,x,top,z+d/2+.06,[NYC.glassDark,{roughness:.3}]);                                        // entrance
    box(w*.6,.22,1.6,x,top+2.9,z+d/2+.8,j.accent);for(const s of [-1,1])cyl(.07,.07,2.9,6,x+s*w*.27,top,z+d/2+1.45,NYC.white);   // canopy
    sign(j.name,`${j.start[0]} – ${j.end[0]}`,j.accent,w*.86,w*.86*.36,{x,y:top+5.2,z:z+d/2+.1});
    row.push({id:j.id,x,z,top:top+h+.35,w,front:z+d/2});
    // Bay: white lines, the company colour painted at its head.
    const bx0=x-slot/2,bx1=x+slot/2;
    box(.16,.02,8,bx0+.08,.12,front+5.8,NYC.line);if(i===JOBS.length-1)box(.16,.02,8,bx1-.08,.12,front+5.8,NYC.line);
    box(slot-.8,.02,.6,x,.12,front+2.1,j.accent);
    bays.push({id:j.id,x,x0:bx0+.3,x1:bx1-.3});
  });
  // The lot's name on the ground, and a P sign at its corner.
  {const c=document.createElement('canvas');c.width=1024;c.height=128;const g=c.getContext('2d');g.fillStyle='#ffffff';g.font='700 76px -apple-system, "SF Pro Display", Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.fillText('P   EXPERIENCE PARKING',512,68);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
    const decal=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0-4,(x1-x0-4)/8).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.9,depthWrite:false}));
    // At the lot's street edge, clear of the story timeline.
    decal.position.set((x0+x1)/2,.135,z1-.6-(x1-x0-4)/16);decal.receiveShadow=true;root.add(decal);lot.decal=decal;}
  cyl(.12,.12,3.4,6,x1-1.2,.12,z1-1.2,NYC.dark);box(1.6,1.6,.15,x1-1.2,3.5,z1-1.2,'#3d7bff');
  {const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#3d7bff';g.fillRect(0,0,128,128);g.fillStyle='#fff';g.font='800 96px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('P',64,70);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.4),new THREE.MeshBasicMaterial({map:t}));p.position.set(x1-1.2,4.3,z1-1.2+.08);root.add(p);}

  // --- Skills Street ------------------------------------------------------------
  const walls=['#f6d6c8','#cfe6d8','#d9e4f6','#f7e7b8','#e9d5f0','#f3d0d6'],accents=['#ff6b5e','#5ab4f0','#3fb8a8','#f2b705','#a77be0','#ff8a4c'];
  // A shop with its front facing +z (yaw 0) or +x (yaw π/2), sitting on y.
  function shop(cx,cz,yaw,y,w,d,[name,kind],i){
    const h=4.4,acc=accents[i%6],wall=walls[i%6],fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const at=(a,f)=>[cx+rx*a+fx*f,cz+rz*a+fz*f];   // a: across the front, f: out from the centre
    const [bx,bz]=at(0,0);box(yaw?d:w,h,yaw?w:d,bx,y,bz,wall);box((yaw?d:w)+.3,.3,(yaw?w:d)+.3,bx,y+h,bz,NYC.white);
    const [gx,gz]=at(-w*.12,d/2+.05);box(yaw?.12:w*.6,1.8,yaw?w*.6:.12,gx,y+.55,gz,[NYC.flame,{emissive:'#ff9a3c',emissiveIntensity:.6}]);
    const [dx,dz]=at(w*.33,d/2+.06);box(yaw?.14:1.1,2.4,yaw?1.1:.14,dx,y,dz,NYC.dark);
    // Striped awning.
    const n=Math.max(5,Math.round(w*.85/.5)),sw=w*.85/n,dep=1.4,drop=.55,slope=Math.atan2(drop,dep),hyp=Math.hypot(dep,drop);
    for(let k=0;k<n;k++){const a=-w*.425+sw*(k+.5),[sx,sz]=at(a,d/2+dep/2),col=k%2?acc:'#ffffff';
      add(new THREE.BoxGeometry(sw,.08,hyp).rotateX(slope).rotateY(yaw),col,[sx,y+2.95-drop/2,sz]);
      const [vx,vz]=at(a,d/2+dep);box(yaw?.06:sw,.32,yaw?sw:.06,vx,y+2.95-drop-.3,vz,col);}
    // Roof sign, facing the street.
    const sw2=w*.98,sh=sw2*.5,[sx,sz]=at(0,d/2-.5);sign(name,kind,acc,sw2,sh,{x:sx,y:y+h+.3+sh/2+.3,z:sz,yaw});
    // A table and two stools outside.
    const [tx,tz]=at(-w*.25,d/2+2.4);cyl(.5,.5,.08,10,tx,y+.9,tz,NYC.dark);cyl(.07,.07,.9,6,tx,y,tz,NYC.dark);
    for(const s of [-1,1]){const [ux,uz]=at(-w*.25+s*.85,d/2+2.4);cyl(.26,.26,.55,8,ux,y,uz,acc);}
  }
  let si=0;
  for(const S of SH){
    if(S.slab){box(S.x1-S.x0,top-.12,S.z1-S.z0,(S.x0+S.x1)/2,.12,(S.z0+S.z1)/2,NYC.walk);solids.push([(S.x0+S.x1)/2,(S.z0+S.z1)/2,(S.x1-S.x0)/2,(S.z1-S.z0)/2]);}
    const along=S.yaw?S.z1-S.z0:S.x1-S.x0,w=along/S.count;
    for(let k=0;k<S.count;k++,si++){
      const a=(S.yaw?S.z0:S.x0)+w*(k+.5),d=6.4,c=S.front-3.8-d/2;   // S.front: the sidewalk edge the shops face
      shop(S.yaw?c:a,S.yaw?a:c,S.yaw,top,w-1,d,SHOPS[si],si);
    }
  }
  K.finish(root);
  return {root,solids,row,lot};
}
