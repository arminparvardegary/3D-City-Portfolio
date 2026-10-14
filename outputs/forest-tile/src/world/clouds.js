import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seededRandom } from '../config.js';
import { THEME } from './theme.js';

// Puffy faceted clouds drifting slowly over the map, lighter on top and softly
// shaded underneath. They cast no shadows and never touch the ground.
function cloudGeometry(rand){
  const puffs=[],n=4+Math.floor(rand()*3);
  for(let i=0;i<n;i++){
    const g=new THREE.IcosahedronGeometry(.7+rand()*.55,1).toNonIndexed();
    g.scale(1,.78,1).translate((i-(n-1)/2)*.95+(rand()-.5)*.3,(rand()-.3)*.35,(rand()-.5)*.8);puffs.push(g);
  }
  const g=mergeGeometries(puffs);g.computeVertexNormals();
  const p=g.attributes.position,col=[],{shade}=THEME.clouds;let lo=Infinity,hi=-Infinity;
  for(let i=0;i<p.count;i++){lo=Math.min(lo,p.getY(i));hi=Math.max(hi,p.getY(i));}
  for(let i=0;i<p.count;i+=3){const y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3,k=shade+(1-shade)*(y-lo)/(hi-lo);for(let j=0;j<3;j++)col.push(k,k,Math.min(1,k*1.02));}
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  return g;
}

export function createClouds({bounds,count=9,seed=5,prep}){
  const rand=seededRandom(seed),group=new THREE.Group();group.name='clouds';
  const mat=new THREE.MeshStandardMaterial({color:THEME.clouds.color,vertexColors:true,roughness:1,flatShading:true});prep?.(mat);
  const w=bounds.x1-bounds.x0,clouds=[];
  for(let i=0;i<count;i++){
    const m=new THREE.Mesh(cloudGeometry(rand),mat);m.castShadow=false;m.receiveShadow=false;
    const s=.8+rand()*.7;m.scale.setScalar(s);
    m.position.set(bounds.x0+rand()*w,10+rand()*3,bounds.z0+rand()*(bounds.z1-bounds.z0));
    m.userData.speed=.25+rand()*.3;group.add(m);clouds.push(m);
  }
  return {
    group,
    update(dt){for(const c of clouds){c.position.x+=c.userData.speed*dt;if(c.position.x>bounds.x1+8)c.position.x=bounds.x0-8;}},
  };
}
