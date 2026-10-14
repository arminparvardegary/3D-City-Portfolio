import * as THREE from 'three';
import { mesh, branch, tint, blobGeometry, mergeStatic } from './geometry.js';
import { groundHeight } from './config.js';

// A subtly cupped elliptical leaf. Shared shape, batched vertex data: the
// crown is real foliage with air between leaves, not opaque ball geometry.
function makeLeafGeometry() {
  const p=[0,.07,0],uv=[.5,.5],index=[];
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    p.push(Math.cos(a)*.48,Math.sin(a)*.045,Math.sin(a));
    uv.push(.5+Math.cos(a)*.5,.5+Math.sin(a)*.5);
  }
  for(let i=0;i<10;i++)index.push(0,1+(i+1)%10,1+i);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g.toNonIndexed();
}
const leafShape=makeLeafGeometry();

export function buildTree(parent, m, rand, {x, z, height, radius, birch = false, lean = 0.12}) {
  const tree = new THREE.Group(); parent.add(tree); tree.position.set(x, groundHeight(x,z), z);
  const trunk = new THREE.Group(); tree.add(trunk);
  const trunkMat = birch ? m.birch : m.bark;
  const h = height;
  const p = [[0,0,0],[0.02,h*.22,0.02],[lean,h*.44,0],[lean*1.2,h*.65,-.04],[lean*.8,h*.83,0.02]];
  for(let i=0;i<4;i++) branch(trunk,p[i],p[i+1],(birch?.083:.14)*(1-i*.2),(birch?.083:.14)*(1-(i+1)*.2),trunkMat,1,12);
  for(let i=0;i<5;i++){
    const a=i*1.257+.3;branch(trunk,[0,.19,0],[Math.cos(a)*.27,.015,Math.sin(a)*.27],birch?.045:.075,.009,trunkMat,0.92,8);
  }
  const canopy = new THREE.Group(); tree.add(canopy); canopy.position.set(lean, h*.51, 0);
  const centers = [];
  const clusters = birch ? 11 : 15;
  for(let i=0;i<clusters;i++){
    const a=i*2.39996+.24;
    const level=i/(clusters-1);
    const ring=Math.sin(Math.PI*(.14+level*.79));
    const reach=radius*(.49+rand()*.25)*ring;
    const cx=Math.cos(a)*reach, cz=Math.sin(a)*reach;
    const cy=h*(-.025+level*.35)+(rand()-.5)*.12;
    const r=radius*(birch?.36:.39)*(0.8+rand()*.3);
    const c=[cx,cy,cz];centers.push({c,r,level});
    const split=[lean+cx*.58,h*.51+cy*.48-.08,cz*.5];
    branch(trunk,[lean*.7,h*(.38+level*.16),0],split,birch?.035:.05,.026,trunkMat,.9+rand()*.12,9);
    branch(trunk,split,[lean+cx,h*.51+cy,cz],.027,.007,trunkMat,1,8);
    for(let j=0;j<3;j++){
      const aa=a+j*1.9;
      branch(canopy,c,[cx+Math.cos(aa)*r*.7,cy+r*.3,cz+Math.sin(aa)*r*.7],.013,.002,trunkMat,1,6);
    }
  }
  const positions=[],normals=[],colors=[],uvs=[];
  const srcP=leafShape.attributes.position,srcN=leafShape.attributes.normal,srcUV=leafShape.attributes.uv;
  const transform=new THREE.Matrix4(),normalTransform=new THREE.Matrix3(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),n=new THREE.Vector3();
  for(const {c,r,level} of centers){
    const count=birch?310:420;
    for(let i=0;i<count;i++){
      const a=rand()*Math.PI*2,vertical=rand()*2-1,rr=Math.sqrt(1-vertical*vertical),dist=Math.cbrt(rand());
      const center=new THREE.Vector3(c[0]+Math.cos(a)*rr*r*dist,c[1]+vertical*r*dist*(birch?1.18:1),c[2]+Math.sin(a)*rr*r*dist);
      // More upright leaflets at the fringes, slightly varied horizontal
      // sprays within the crown. No flat triangular canopy shading.
      e.set((rand()-.5)*1.8,rand()*Math.PI*2,(rand()-.5)*1.8);q.setFromEuler(e);
      const size=(birch?.063:.074)+rand()*.036;
      transform.compose(center,q,new THREE.Vector3(size,size,size));normalTransform.getNormalMatrix(transform);
      const shade=.75+rand()*.36+level*.09;
      const warmth=rand();
      for(let k=0;k<srcP.count;k++){
        v.fromBufferAttribute(srcP,k).applyMatrix4(transform);n.fromBufferAttribute(srcN,k).applyMatrix3(normalTransform).normalize();
        positions.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);uvs.push(srcUV.getX(k),srcUV.getY(k));
        colors.push(shade*(.96+warmth*.12),shade,shade*(.8+warmth*.12));
      }
    }
  }
  const foliage=new THREE.BufferGeometry();foliage.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));foliage.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));foliage.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));foliage.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  mesh(canopy,foliage,m.leaves);
  if(birch){
    for(let i=0;i<12;i++){
      const y=.15+i*h*.055, a=i*2.4;
      branch(trunk,[Math.cos(a)*.078,y,Math.sin(a)*.078],[Math.cos(a+.55)*.078,y+.015,Math.sin(a+.55)*.078],.012,.008,m.birchMark,1,5);
    }
  }
  mergeStatic(trunk);mergeStatic(canopy);
  canopy.userData.phase=rand()*Math.PI*2;
  canopy.userData.initial=canopy.scale.clone();
  tree.name=birch?'silver-birch':'broadleaf-tree';
  return canopy;
}

export function bush(parent,m,rand,x,z,size=.45) {
  const y=groundHeight(x,z);
  for(let i=0;i<5;i++){
    const a=i*2.4, r=size*(.55+rand()*.2), reach=i===0?0:size*.42;
    mesh(parent,tint(blobGeometry(i*1.2+x,2,.1),.78+rand()*.25),m.leaves,[x+Math.cos(a)*reach,y+r*.6,z+Math.sin(a)*reach],[0,rand()*6,0],[r,r*.85,r]);
  }
}

export function fern(parent,m,x,z,size,angle=0) {
  const y=groundHeight(x,z);
  for(let i=0;i<7;i++){
    const a=angle+i*Math.PI*2/7;
    const end=[x+Math.cos(a)*size,y+size*.46,z+Math.sin(a)*size];
    branch(parent,[x,y,z],end,.012,.002,m.leaves,.92,4);
    for(let j=1;j<6;j++){
      const t=j/6, width=size*.23*Math.sin(t*Math.PI);
      for(const side of [-1,1]){
        const center=[x+Math.cos(a)*size*t+Math.cos(a+Math.PI/2)*width*.45*side,y+size*.46*t+.02,z+Math.sin(a)*size*t+Math.sin(a+Math.PI/2)*width*.45*side];
        mesh(parent,tint(new THREE.SphereGeometry(1,5,3),.85+t*.25),m.leafTips,center,[0,-a+side*.6,side*.2],[width,.012,width*.35]);
      }
    }
  }
}
