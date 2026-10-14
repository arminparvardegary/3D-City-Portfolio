import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontData from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { TILE } from './units.js';
import { THEME } from './theme.js';

// A driving playground: the car pushes real physics objects. Big 3D letters
// spell the name and the section titles; a brick wall, bowling pins with a
// ball, cones and crates are there to knock over. Everything sleeps until it is
// touched, so a still scene costs almost nothing.
const G=TILE.slab;
const font=new FontLoader().parse(fontData);

// Text faces the fixed isometric camera and reads left to right on screen.
const VIEW_YAW=Math.PI/4,RIGHT=new THREE.Vector3(Math.cos(VIEW_YAW),0,-Math.sin(VIEW_YAW));

export function createPlayground({scene,prep,car,player,bounds}){
  const world=new CANNON.World({gravity:new CANNON.Vec3(0,-24,0),allowSleep:true});
  world.broadphase=new CANNON.SAPBroadphase(world);world.solver.iterations=8;
  world.defaultContactMaterial.friction=.38;world.defaultContactMaterial.restitution=.12;
  // The floor: one warm slab the size of the map. Things pushed over its edge
  // fall, then come back to where they started.
  const fw=bounds.x1-bounds.x0,fd=bounds.z1-bounds.z0,fx=(bounds.x0+bounds.x1)/2,fz=(bounds.z0+bounds.z1)/2;
  const ground=new CANNON.Body({type:CANNON.Body.STATIC,shape:new CANNON.Box(new CANNON.Vec3(fw/2,1,fd/2))});ground.position.set(fx,G-1,fz);world.addBody(ground);

  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.55,...extra});prep?.(m);return m;};
  const floor=new THREE.Mesh(new THREE.BoxGeometry(fw,G+2,fd).translate(fx,G/2-1,fz),mat(THEME.palette.floor,{roughness:.95}));floor.receiveShadow=true;scene.add(floor);
  const things=[];   // {body, mesh | {im, i}}
  const home=b=>({p:b.position.clone(),q:b.quaternion.clone()});
  const sleepy=b=>{b.allowSleep=true;b.sleepSpeedLimit=.15;b.sleepTimeLimit=.6;b.linearDamping=.15;b.angularDamping=.2;return b;};

  // --- 3D letters -----------------------------------------------------------
  const glyphs=new Map();
  function glyph(ch,size,depth){
    const key=ch+size;if(glyphs.has(key))return glyphs.get(key);
    const g=new TextGeometry(ch,{font,size,depth,curveSegments:6,bevelEnabled:true,bevelThickness:depth*.12,bevelSize:size*.025,bevelSegments:2});
    g.computeBoundingBox();const b=g.boundingBox,c=new THREE.Vector3();b.getCenter(c);g.translate(-c.x,-c.y,-c.z);g.computeBoundingBox();
    const out={g,half:g.boundingBox.max.clone()};glyphs.set(key,out);return out;
  }
  function word(text,[x,z],{size=2.2,depth=.7,color='#fff4e6',mass=1.4,gap=.18}={}){
    const m=mat(color),letters=[...text].map(ch=>ch===' '?null:glyph(ch,size,depth));
    const widths=[...text].map((ch,i)=>ch===' '?size*.45:letters[i].half.x*2);
    let offset=-(widths.reduce((a,b)=>a+b,0)+gap*(text.length-1))/2;
    [...text].forEach((ch,i)=>{
      const w=widths[i];offset+=w/2;
      if(letters[i]){
        const {g,half}=letters[i],mesh=new THREE.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
        const body=sleepy(new CANNON.Body({mass,shape:new CANNON.Box(new CANNON.Vec3(half.x,half.y,half.z))}));
        body.position.set(x+RIGHT.x*offset,G+half.y+.01,z+RIGHT.z*offset);body.quaternion.setFromEuler(0,VIEW_YAW,0);
        world.addBody(body);body.sleep();things.push({body,mesh,home:home(body)});
      }
      offset+=w/2+gap;
    });
  }

  // --- Instanced props: many identical bodies, one draw call each ----------
  function props(geometry,material,list,shapeFor,mass){
    const im=new THREE.InstancedMesh(geometry,material,list.length);im.castShadow=im.receiveShadow=true;im.frustumCulled=false;scene.add(im);
    list.forEach(([x,y,z,yaw=0],i)=>{const body=sleepy(new CANNON.Body({mass,shape:shapeFor()}));body.position.set(x,y,z);body.quaternion.setFromEuler(0,yaw,0);
      world.addBody(body);body.sleep();things.push({body,im,i,home:home(body)});});
    return im;
  }
  const brickW=.9,brickH=.42,brickD=.45;
  function wall([cx,cz],yaw,cols=8,rows=6){
    const along=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),list=[];
    for(let r=0;r<rows;r++)for(let c=0;c<cols-(r%2);c++){const t=(c-(cols-1)/2+(r%2)*.5)*(brickW+.02);list.push([cx+along.x*t,G+brickH/2+r*(brickH+.005),cz+along.z*t,yaw]);}
    props(new THREE.BoxGeometry(brickW,brickH,brickD),mat('#d9774e',{roughness:.85}),list,()=>new CANNON.Box(new CANNON.Vec3(brickW/2,brickH/2,brickD/2)),.35);
  }
  function bowling([cx,cz]){
    const pts=[[0,0],[.16,.02],[.2,.25],[.13,.55],[.1,.75],[.14,.92],[.1,1.08],[0,1.12]].map(([r,y])=>new THREE.Vector2(r,y));
    const geo=new THREE.LatheGeometry(pts,16).translate(0,-.56,0),list=[];
    for(let row=0;row<4;row++)for(let k=0;k<=row;k++)list.push([cx-row*.62,G+.57,cz+(k-row/2)*.62]);
    props(geo,mat('#fffaf2',{roughness:.35}),list,()=>new CANNON.Cylinder(.14,.18,1.1,10),.18);
    // The ball: push it into the pins.
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.55,28,20),mat('#2f3650',{roughness:.25,metalness:.2}));ball.castShadow=true;scene.add(ball);
    const body=sleepy(new CANNON.Body({mass:2.5,shape:new CANNON.Sphere(.55)}));body.position.set(cx+7,G+.55,cz);world.addBody(body);body.sleep();things.push({body,mesh:ball,home:home(body)});
  }
  function cones(points){
    const geo=new THREE.ConeGeometry(.28,.75,16).translate(0,0,0);
    props(geo,mat('#ff7a3d',{roughness:.6}),points.map(([x,z])=>[x,G+.375,z]),()=>new CANNON.Cylinder(.04,.28,.75,8),.12);
  }
  function crates(points){
    props(new THREE.BoxGeometry(.8,.8,.8),mat('#c99466',{roughness:.8}),points.map(([x,z,y=0])=>[x,G+.4+y*.81,z,.2*x]),()=>new CANNON.Box(new CANNON.Vec3(.4,.4,.4)),.6);
  }

  // --- Layout: the name at the start, sections around it ---------------------
  word('ARMIN',[-2,-9],{size:3,depth:1,mass:2.2});
  word('WORK',[30,4],{color:'#ff8a6b'});
  word('PROJECTS',[-32,6],{color:'#5fc8d6'});
  word('CONTACT',[2,30],{color:'#ffcf5a'});
  wall([18,-16],VIEW_YAW);
  bowling([-18,-18]);
  cones([[6,6],[10,9],[14,6],[18,9],[22,6],[26,9],[-8,14],[-11,17],[-14,14]]);
  crates([[36,12],[37,12],[36.5,12,1],[40,10],[34,-4],[35,-4],[34.5,-4,1],[34.5,-4,2]]);

  // --- The car: a kinematic box that follows the driven car and shoves things.
  const carBody=new CANNON.Body({type:CANNON.Body.KINEMATIC,shape:new CANNON.Box(new CANNON.Vec3(.8,.6,1.6))});world.addBody(carBody);
  // Bumping something slows the car a little, more for heavier things.
  world.addEventListener('beginContact',({bodyA,bodyB})=>{const o=bodyA===carBody?bodyB:bodyB===carBody?bodyA:null;if(o&&o.mass>0)car.slow(1-Math.min(.3,o.mass*.08));});
  let carHalf=null;

  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),dirty=new Set();
  let acc=0;const STEP=1/60;
  return {
    world,
    // dt in seconds. Returns true while anything is moving (so shadows refresh).
    update(dt){
      const pose=player();
      if(!carHalf||carHalf.l!==pose.length){carHalf={l:pose.length,w:pose.width};carBody.shapes[0].halfExtents.set(pose.width/2,.6,pose.length/2);carBody.shapes[0].updateConvexPolyhedronRepresentation();carBody.updateBoundingRadius();}
      carBody.position.set(pose.x,G+.6,pose.z);carBody.quaternion.setFromEuler(0,pose.h,0);
      carBody.velocity.set(Math.sin(pose.h)*pose.v,0,Math.cos(pose.h)*pose.v);
      acc+=Math.min(dt,.1);let stepped=false;
      while(acc>=STEP){world.step(STEP);acc-=STEP;stepped=true;}
      let moving=false;
      if(stepped)for(const t of things){
        const b=t.body;if(b.sleepState===CANNON.Body.SLEEPING&&t.placed)continue;t.placed=true;moving=moving||b.sleepState!==CANNON.Body.SLEEPING;
        // A thing that falls off the map edge comes back to where it started.
        if(b.position.y<-15){b.position.copy(t.home.p);b.position.y+=3;b.quaternion.copy(t.home.q);b.velocity.setZero();b.angularVelocity.setZero();}
        p.set(b.position.x,b.position.y,b.position.z);q.set(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
        if(t.mesh){t.mesh.position.copy(p);t.mesh.quaternion.copy(q);}
        else{m4.compose(p,q,one);t.im.setMatrixAt(t.i,m4);dirty.add(t.im);}
      }
      for(const im of dirty)im.instanceMatrix.needsUpdate=true;dirty.clear();
      return moving;
    },
  };
}
