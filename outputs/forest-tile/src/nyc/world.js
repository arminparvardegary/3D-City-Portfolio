import * as THREE from 'three';
import { THEME } from '../world/theme.js';
import { buildDistrict } from './district.js';
import { createPeople } from './people.js';
import { buildCity } from './drive/build.js';
import { buildBridge } from './drive/bridge.js';
import { createTraffic } from './drive/traffic.js';
import { G,CURB,HALF,LANE,ST,AV,MAN,BKN,NS,BRIDGE,blocks,bridgeHeight,onBridgeBand,onLand } from './drive/layout.js';

// New York as the world you drive (world units, about 1.5 m each). The plan is
// in drive/layout.js: Manhattan, the East River, a strip of Brooklyn, water all
// round. Armin's Experience Row and its parking lot face Skills Street across
// street z = 78. Returns what main.js needs: the scene group, solids, the road
// height (surface), the start, places for the Experience list, the parking lot,
// tall buildings for the camera, and a per frame update.
export function buildNYCWorld({prep,materials,player}){
  const group=new THREE.Group();group.name='new-york';
  const bl=blocks(),find=(i,j)=>bl.find(b=>b.i===i&&b.j===j);
  // Armin's blocks: Experience Row (0, 4); Skills Street shops in front of (0, 5) and (1, 5).
  const exp=find(0,4),sk1=find(0,5),sk2=find(1,5),top=G+CURB;
  const city=buildCity({reserved:new Set(['0,4','0,5','1,5']),pave:new Set(['0,5','1,5']),fills:[
    {x0:sk1.x0+2.6,x1:sk1.x1-2.6,z0:sk1.z0+12.5,z1:sk1.z1-2.6,zone:'low'},{x0:sk2.x0+2.6,x1:sk2.x1-2.6,z0:sk2.z0+12.5,z1:sk2.z1-2.6,zone:'low'}]});
  group.add(city.root);
  const district=buildDistrict({top,row:{x0:exp.x0,x1:exp.x1,z0:exp.z0,z1:exp.z1},shops:[
    {x0:sk1.x0,x1:sk1.x1,z0:sk1.z0,z1:sk1.z1,front:sk1.z0,yaw:Math.PI,count:6,slab:false},
    {x0:sk2.x0,x1:sk2.x1,z0:sk2.z0,z1:sk2.z1,front:sk2.z0,yaw:Math.PI,count:6,slab:false},
  ]});
  group.add(district.root);
  const bridge=buildBridge({prep});group.add(bridge.root);
  for(const o of [city.root,district.root])o.traverse(m=>{if(m.isMesh)[].concat(m.material).forEach(x=>prep?.(x));});
  // Traffic: about twenty cars of every type, each with its own speed.
  const traffic=createTraffic({phase:city.phase,player,prep,parked:city.parking});group.add(traffic.root);
  // People on every sidewalk loop, including Armin's blocks.
  const people=createPeople({loops:[...city.loops,...district.solids.map(([cx,cz,hw,hd])=>({x0:cx-hw+1,x1:cx+hw-1,z0:cz-hd+1,z1:cz+hd-1,y:top}))],perLoop:2});
  group.add(people.root);
  // Sky: a physically based sky dome (it follows the camera), clouds drifting high
  // over the city, and steam rising from the street stacks.
  // Sky dome: deep blue overhead fading to a light horizon, a warm glow round the sun.
  const sunDir=(()=>{const L=THEME.nyc.light.sun,a=THREE.MathUtils.degToRad(L.azimuth),e=THREE.MathUtils.degToRad(L.elevation);return new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));})();
  const sky=new THREE.Mesh(new THREE.SphereGeometry(600,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{zenith:{value:new THREE.Color('#1f73d6')},horizon:{value:new THREE.Color('#b9e1f6')},ground:{value:new THREE.Color('#9fb3c2')},sun:{value:sunDir},glow:{value:new THREE.Color('#fff1d6')}},
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
  const clouds=[];{let r=5;const rnd=()=>((r=(r*16807)%2147483647)/2147483647);
    for(let i=0;i<26;i++){const m=new THREE.SpriteMaterial({map:cloudTex[i%3],transparent:true,depthWrite:false,fog:false,opacity:1,color:'#ffffff'});const sp=new THREE.Sprite(m);
      const w=120+rnd()*160;sp.scale.set(w,w*.55,1);sp.position.set(-480+rnd()*960,120+rnd()*80,-480+rnd()*960);sp.renderOrder=-1;group.add(sp);clouds.push(sp);}}
  const steamMat=new THREE.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false,opacity:.5,color:'#f2f3f5'});
  const steam=city.steam.flatMap(p=>Array.from({length:7},(_,i)=>{const sp=new THREE.Sprite(steamMat.clone());sp.userData={x:p.x,z:p.z,age:i/7*3};group.add(sp);return sp;}));
  const solids=[...city.solids,...district.solids];
  const occluders=[...city.occluders,...district.occluders,...bridge.occluders];
  const places={};for(const b of district.row)places[b.id]={x:b.x,z:b.z,y:b.top*.45};
  // Where the car can drive and how high: the streets on land (not under the
  // low parts of the bridge ramps, which stand on a solid viaduct), and the bridge.
  const viaduct=(x,z)=>onBridgeBand(x,z)&&((x>BRIDGE.landM+.5&&x<39.6)||(x>96.4&&x<BRIDGE.landB-.5));
  function surface(x,z,y=0){
    const ground=onLand(x,z)&&!viaduct(x,z)?0:null,deck=onBridgeBand(x,z)?bridgeHeight(x):null;
    if(ground===null)return deck;if(deck===null)return ground;
    return Math.abs(deck-y)<Math.abs(ground-y)?deck:ground;
  }
  return {
    group,solids,places,labels:[],row:district.row,lot:district.lot,occluders,surface,trafficCars:traffic.cars,
    obstacles:()=>traffic.obstacles(),circles:bridge.circles,
    bounds:{x0:MAN.x0-1,x1:BKN.x1+1,z0:NS.z0-1,z1:NS.z1+1},
    // Start on Skills Street, Experience Row on the right, the shops on the left.
    start:{x:-58,z:ST[5]-LANE,h:-Math.PI/2},
    vehicle:'Sport',carColor:'#b5121b',zoom:.62,fixedZoom:true,
    placeAt(x,z){for(const b of district.row)if(Math.abs(x-b.x)<b.w/2&&z>district.lot.z0-16&&z<district.lot.z0)return b.id;return null;},
    update(t,dt,camera){city.update(dt);traffic.update(dt);people.update(dt);
      if(camera)sky.position.copy(camera.position);
      for(const c of clouds){c.position.x+=dt*1.6;if(c.position.x>500)c.position.x-=1000;}
      for(const sp of steam){const u=sp.userData;u.age=(u.age+dt)%3;const k=u.age/3;sp.position.set(u.x+k*1.2,G+1.6+k*6,u.z);sp.scale.setScalar(.8+k*4);sp.material.opacity=.45*(1-k)*Math.min(1,k*6);}
      return 2;},
  };
}
