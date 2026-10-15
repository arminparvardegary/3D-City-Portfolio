import * as THREE from 'three';
import { THEME } from '../world/theme.js';
import { buildKeelSign } from './keel.js';
import { mountStores } from '../stores/mount.tsx';
import AppleBlock from '../stores/AppleBlock.tsx';
import NikeBlock from '../stores/NikeBlock.tsx';
import MiBlock from '../stores/MiBlock.tsx';
import GoogleBlock from '../stores/GoogleBlock.tsx';
import McDonaldsBlock from '../stores/McDonaldsBlock.tsx';
import { createPeople } from './people.js';
import { buildCity } from './drive/build.js';
import { buildBridge } from './drive/bridge.js';
import { createTraffic } from './drive/traffic.js';
import { G,CURB,HALF,LANE,ST,AV,MAN,BKN,NS,BRIDGE,blocks,bridgeHeight,onBridgeBand,onLand } from './drive/layout.js';

// New York as the world you drive (world units, about 1.5 m each). The plan is
// in drive/layout.js: Manhattan, the East River, a strip of Brooklyn, water all
// round. Keel HQ, Armin's project, stands on street z = 78. Returns what main.js
// needs: the scene group, solids, the road height (surface), the start, places
// the camera can visit, tall buildings for the camera, and a per frame update.
export function buildNYCWorld({prep,materials,player}){
  const group=new THREE.Group();group.name='new-york';
  const bl=blocks(),find=(i,j)=>bl.find(b=>b.i===i&&b.j===j);
  // Armin's blocks: Keel's store at (1, 4); his four companies' stores across the
  // street at (0, 5) and (1, 5).
  const top=G+CURB;
  const city=buildCity({reserved:new Set(['1,4','0,5','1,5']),pave:new Set(['1,4','0,5','1,5'])});
  group.add(city.root);
  // Keel's store (one floor, glass front, the "Meet Keel." banner inside), with
  // the giant name on its roof.
  const kb=find(1,4),KS=2,kx=(kb.x0+kb.x1)/2,kz=(kb.z0+kb.z1)/2;
  const keel={solids:[[kx,kz,3.2*KS,3.2*KS]],occluders:[],place:{x:kx,z:kz,y:top+4,dist:30}};
  group.add(buildKeelSign({x:kx,z:kz,y:top+.55*KS+2.25*KS,width:12}));
  // Work experience stores across the street, facing Keel (north); a block's origin is the top of its 0.55 high platform.
  const S=1.7,PW=6.4*S,row=(b,i)=>({x:(b.x0+b.x1)/2+(i?1:-1)*(PW/2+.3),z:(b.z0+b.z1)/2});
  const b15=find(1,5),b05=find(0,5),spots=[row(b15,0),row(b15,1),row(b05,0),row(b05,1)];
  const stores=mountStores(group,[...[NikeBlock,MiBlock,GoogleBlock,McDonaldsBlock].map((C,i)=>({C,x:spots[i].x,y:top+.55*S,z:spots[i].z,rot:Math.PI,scale:S})),{C:AppleBlock,x:kx,y:top+.55*KS,z:kz,rot:0,scale:KS}]);
  const storeSolids=spots.map(p=>[p.x,p.z,PW/2,PW/2]);
  const bridge=buildBridge({prep});group.add(bridge.root);
  for(const o of [city.root])o.traverse(m=>{if(m.isMesh)[].concat(m.material).forEach(x=>prep?.(x));});
  // Traffic: about twenty cars of every type, each with its own speed.
  const traffic=createTraffic({phase:city.phase,player,prep,parked:city.parking});group.add(traffic.root);
  // People on every sidewalk loop.
  const people=createPeople({loops:city.loops,perLoop:2});
  group.add(people.root);
  // Sky: a physically based sky dome (it follows the camera), clouds drifting high
  // over the city, and steam rising from the street stacks.
  // Sky dome: deep blue overhead fading to a light horizon, a warm glow round the sun.
  const sunDir=(()=>{const L=THEME.nyc.light.sun,a=THREE.MathUtils.degToRad(L.azimuth),e=THREE.MathUtils.degToRad(L.elevation);return new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));})();
  const sky=new THREE.Mesh(new THREE.SphereGeometry(600,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{zenith:{value:new THREE.Color('#0a0826')},horizon:{value:new THREE.Color('#3b2a8f')},ground:{value:new THREE.Color('#140f38')},sun:{value:sunDir},glow:{value:new THREE.Color('#6d5cff')}},
    vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;}',
    fragmentShader:'uniform vec3 zenith,horizon,ground,glow,sun;varying vec3 vDir;void main(){float h=vDir.y;vec3 c=h>0.?mix(horizon,zenith,pow(clamp(h,0.,1.),.55)):mix(horizon,ground,clamp(-h*3.,0.,1.));float s=max(dot(vDir,normalize(sun)),0.);c+=glow*(pow(s,48.)*.6+pow(s,6.)*.12);gl_FragColor=vec4(c,1.);}'}));
  sky.renderOrder=-2;
  sky.frustumCulled=false;group.add(sky);
  const puffTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,62);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.55,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
  const cloudTex=[0,1,2].map(v=>{const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d');let r=17+v*31;const rnd=()=>((r=(r*16807)%2147483647)/2147483647);
    for(let i=0;i<70;i++){const x=60+rnd()*392,y=165-Math.sin((x-60)/392*Math.PI)*95+rnd()*35,rad=34+rnd()*60,gr=g.createRadialGradient(x,y,0,x,y,rad);
      gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.6,'rgba(246,248,252,.6)');gr.addColorStop(1,'rgba(235,240,248,0)');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
    const shade=g.createLinearGradient(0,90,0,256);shade.addColorStop(0,'rgba(255,255,255,0)');shade.addColorStop(1,'rgba(196,206,222,.25)');g.globalCompositeOperation='source-atop';g.fillStyle=shade;g.fillRect(0,0,512,256);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;});
  // Stars: a few hundred points on the dome, twinkle-free and cheap.
  {const N=700,pos=new Float32Array(N*3);let r=11;const rnd=()=>((r=(r*16807)%2147483647)/2147483647);
    for(let i=0;i<N;i++){const u=rnd()*Math.PI*2,v=.08+rnd()*.9,R=560;pos.set([Math.cos(u)*Math.cos(v)*R,Math.sin(v)*R,Math.sin(u)*Math.cos(v)*R],i*3);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const stars=new THREE.Points(g,new THREE.PointsMaterial({color:'#d8d4ff',size:1.6,sizeAttenuation:false,fog:false,transparent:true,opacity:.85,depthWrite:false}));stars.renderOrder=-2;stars.frustumCulled=false;sky.add(stars);}
  const clouds=[];{let r=5;const rnd=()=>((r=(r*16807)%2147483647)/2147483647);
    for(let i=0;i<26;i++){const m=new THREE.SpriteMaterial({map:cloudTex[i%3],transparent:true,depthWrite:false,fog:false,opacity:.35,color:'#7b6cff'});const sp=new THREE.Sprite(m);
      const w=120+rnd()*160;sp.scale.set(w,w*.55,1);sp.position.set(-480+rnd()*960,120+rnd()*80,-480+rnd()*960);sp.renderOrder=-1;group.add(sp);clouds.push(sp);}}
  const steamMat=new THREE.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false,opacity:.5,color:'#f2f3f5'});
  const steam=city.steam.flatMap(p=>Array.from({length:7},(_,i)=>{const sp=new THREE.Sprite(steamMat.clone());sp.userData={x:p.x,z:p.z,age:i/7*3};group.add(sp);return sp;}));
  const solids=[...city.solids,...keel.solids,...storeSolids,...bridge.solids];
  const occluders=[...city.occluders,...bridge.occluders,...keel.occluders];
  const places={keel:keel.place};
  // Where the car can drive and how high: the streets and sidewalks on land, and
  // the bridge deck (over the river, so wherever the deck is the closer surface wins).
  function surface(x,z,y=0){
    const ground=onLand(x,z)?city.walkHeight(x,z):null,deck=onBridgeBand(x,z)?bridgeHeight(x):null;
    if(ground===null)return deck;if(deck===null)return ground;
    return Math.abs(deck-y)<Math.abs(ground-y)?deck:ground;
  }
  return {
    group,solids,places,labels:[],row:null,lot:null,occluders,surface,trafficCars:traffic.cars,
    obstacles:()=>traffic.obstacles(),circles:bridge.circles,
    bounds:{x0:MAN.x0-1,x1:BKN.x1+1,z0:NS.z0-1,z1:NS.z1+1},
    // Start on the street in front of Keel HQ, heading west: Keel on the right.
    start:{x:AV[2]+12,z:ST[5]-LANE,h:-Math.PI/2},
    vehicle:'Sport',carColor:'#b5121b',zoom:.62,fixedZoom:true,
    placeAt(){return null;},
    update(t,dt,camera){city.update(dt);stores.update(dt);city.sea.value+=dt;traffic.update(dt);people.update(dt);
      if(camera)sky.position.copy(camera.position);
      for(const c of clouds){c.position.x+=dt*1.6;if(c.position.x>500)c.position.x-=1000;}
      for(const sp of steam){const u=sp.userData;u.age=(u.age+dt)%3;const k=u.age/3;sp.position.set(u.x+k*1.2,G+1.6+k*6,u.z);sp.scale.setScalar(.8+k*4);sp.material.opacity=.45*(1-k)*Math.min(1,k*6);}
      return 2;},
  };
}
