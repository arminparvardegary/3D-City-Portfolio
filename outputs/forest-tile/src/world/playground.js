import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import fontData from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { TILE } from './units.js';
import { THEME } from './theme.js';
import { FEEL, STEP, fixedClock } from '../motion.js';
import { gridMap } from './textures.js';

// A driving playground on the white campus: the car pushes real physics objects
// (Rapier). Big white 3D letters spell the name on the start plaza; a row of
// blocks, bowling pins with a ball, cones and crates are there to knock over, and street furniture
// (benches, lamps, bins) topples when hit and then floats slowly back into
// place. The meshes are drawn at once; the physics engine (WASM) loads in the
// background and takes over a moment later. Bodies sleep until touched, so a
// still scene costs almost nothing. Physics runs on the same fixed 1/120 s step
// as the car and is drawn interpolated between the last two steps.
const G=TILE.slab;
const font=new FontLoader().parse(fontData);

// Text faces the fixed isometric camera and reads left to right on screen.
const VIEW_YAW=Math.PI/4,RIGHT=new THREE.Vector3(Math.cos(VIEW_YAW),0,-Math.sin(VIEW_YAW));
const yawQ=y=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),y);

export function createPlayground({scene,prep,car,bounds,solids=[],solidTop=.47}){
  const fw=bounds.x1-bounds.x0,fd=bounds.z1-bounds.z0,fx=(bounds.x0+bounds.x1)/2,fz=(bounds.z0+bounds.z1)/2;
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.55,...extra});prep?.(m);return m;};
  // The floor: one warm slab the size of the map. Things pushed over its edge
  // fall, then come back to where they started.
  const grid=gridMap().clone();grid.needsUpdate=true;grid.repeat.set(fw/10,fd/10);grid.offset.set(.5,.5);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(fw,fd).rotateX(-Math.PI/2),mat(THEME.palette.floor,{roughness:.95,map:grid}));floor.position.set(fx,G,fz);floor.receiveShadow=true;scene.add(floor);

  // Every movable thing: where it is drawn, its colliders, mass and home pose.
  // views: meshes, or [instancedMesh, index] pairs, all drawn with one transform.
  const things=[];
  function add(views,colliders,mass,pos,quat,{furniture=false}={}){
    things.push({views,colliders,mass,home:{p:pos.clone(),q:quat.clone()},furniture,body:null,
      prev:{p:pos.clone(),q:quat.clone()},cur:{p:pos.clone(),q:quat.clone()},active:false,drawn:true,rest:0,away:0,reset:null,
      // Round things lying down would roll forever: give them rolling resistance.
      spin:furniture?3:colliders.some(c=>c.shape!=='cuboid'&&c.shape!=='ball')?1.2:.25});
  }

  // --- 3D letters -----------------------------------------------------------
  const glyphs=new Map();
  function glyph(ch,size,depth){
    const key=ch+size;if(glyphs.has(key))return glyphs.get(key);
    const g=new TextGeometry(ch,{font,size,depth,curveSegments:6,bevelEnabled:true,bevelThickness:depth*.12,bevelSize:size*.025,bevelSegments:2});
    g.computeBoundingBox();const c=new THREE.Vector3();g.boundingBox.getCenter(c);g.translate(-c.x,-c.y,-c.z);g.computeBoundingBox();
    const out={g,half:g.boundingBox.max.clone()};glyphs.set(key,out);return out;
  }
  function word(text,[x,z],{size=2.2,depth=.7,color=THEME.palette.letters,mass=1.4,gap=.18}={}){
    const m=mat(color),chars=[...text],letters=chars.map(ch=>ch===' '?null:glyph(ch,size,depth));
    const widths=chars.map((ch,i)=>ch===' '?size*.45:letters[i].half.x*2);
    let offset=-(widths.reduce((a,b)=>a+b,0)+gap*(chars.length-1))/2;
    chars.forEach((ch,i)=>{
      const w=widths[i];offset+=w/2;
      if(letters[i]){
        const {g,half}=letters[i],mesh=new THREE.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
        const p=new THREE.Vector3(x+RIGHT.x*offset,G+half.y+.01,z+RIGHT.z*offset),q=yawQ(VIEW_YAW);
        mesh.position.copy(p);mesh.quaternion.copy(q);
        add([mesh],[{shape:'cuboid',args:[half.x,half.y,half.z]}],mass,p,q);
      }
      offset+=w/2+gap;
    });
  }

  // --- Instanced props: many identical bodies, one draw call per material ----
  // parts: [[geometry, material], ...] sharing one transform per instance.
  function props(parts,list,colliders,mass,opts){
    const ims=parts.map(([g,m])=>{const im=new THREE.InstancedMesh(g,m,list.length);im.castShadow=im.receiveShadow=true;im.frustumCulled=false;scene.add(im);return im;});
    const m4=new THREE.Matrix4(),one=new THREE.Vector3(1,1,1);
    list.forEach(([x,y,z,yaw=0],i)=>{
      const p=new THREE.Vector3(x,y,z),q=yawQ(yaw);m4.compose(p,q,one);ims.forEach(im=>im.setMatrixAt(i,m4));
      add(ims.map(im=>[im,i]),colliders,mass,p,q,opts);
    });
  }
  const brickW=.9,brickH=.42,brickD=.45;
  function wall([cx,cz],yaw,cols=8,rows=6){
    const along=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),list=[];
    for(let r=0;r<rows;r++)for(let c=0;c<cols-(r%2);c++){const t=(c-(cols-1)/2+(r%2)*.5)*(brickW+.02);list.push([cx+along.x*t,G+brickH/2+r*(brickH+.005),cz+along.z*t,yaw]);}
    props([[new THREE.BoxGeometry(brickW,brickH,brickD),mat(THEME.palette.prop,{roughness:.85})]],list,[{shape:'cuboid',args:[brickW/2,brickH/2,brickD/2]}],.35);
  }
  function bowling([cx,cz]){
    const pts=[[0,0],[.16,.02],[.2,.25],[.13,.55],[.1,.75],[.14,.92],[.1,1.08],[0,1.12]].map(([r,y])=>new THREE.Vector2(r,y));
    const list=[];for(let row=0;row<4;row++)for(let k=0;k<=row;k++)list.push([cx-row*.62,G+.57,cz+(k-row/2)*.62]);
    props([[new THREE.LatheGeometry(pts,16).translate(0,-.56,0),mat('#fffaf2',{roughness:.35})]],list,[{shape:'cylinder',args:[.56,.17]}],.18);
    // The ball: push it into the pins.
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.55,28,20),mat(THEME.campus.blue,{roughness:.25,metalness:.1}));ball.castShadow=true;scene.add(ball);
    const p=new THREE.Vector3(cx+7,G+.55,cz);ball.position.copy(p);add([ball],[{shape:'ball',args:[.55]}],2.5,p,new THREE.Quaternion());
  }
  function cones(points){
    props([[new THREE.ConeGeometry(.28,.75,16),mat(THEME.palette.prop,{roughness:.6})]],points.map(([x,z])=>[x,G+.375,z]),[{shape:'cone',args:[.375,.28]}],.12);
  }
  function crates(points){
    props([[new THREE.BoxGeometry(.8,.8,.8),mat(THEME.palette.prop,{roughness:.8})]],points.map(([x,z,y=0])=>[x,G+.4+y*.81,z,.2*x]),[{shape:'cuboid',args:[.4,.4,.4]}],.6);
  }
  // Street furniture: heavier, topples when hit, then floats back to its place.
  const box=(w,h,d,x,y,z)=>new THREE.BoxGeometry(w,h,d).translate(x,y,z);
  const metal=mat(THEME.palette.metal,{roughness:.4,metalness:.5});
  function benches(list){
    const seat=mergeGeometries([box(1.8,.08,.5,0,.45,0),box(1.8,.36,.06,0,.78,-.24)]);
    const legs=mergeGeometries([box(.08,.45,.46,-.75,.225,0),box(.08,.45,.46,.75,.225,0),box(.08,.4,.06,-.75,.75,-.24),box(.08,.4,.06,.75,.75,-.24)]);
    props([[seat,mat(THEME.palette.bench,{roughness:.7})],[legs,metal]],list.map(([x,z,yaw])=>[x,G,z,yaw]),
      [{shape:'cuboid',args:[.9,.04,.25],at:[0,.45,0]},{shape:'cuboid',args:[.9,.18,.03],at:[0,.78,-.24]},{shape:'cuboid',args:[.04,.22,.23],at:[-.75,.22,0]},{shape:'cuboid',args:[.04,.22,.23],at:[.75,.22,0]}],6,{furniture:true});
  }
  function lamps(list){
    const pole=mergeGeometries([new THREE.CylinderGeometry(.18,.22,.2,16).translate(0,.1,0),new THREE.CylinderGeometry(.05,.07,2.7,12).translate(0,1.45,0),new THREE.CylinderGeometry(.22,.12,.12,16).translate(0,2.82,0)]);
    const glow=new THREE.SphereGeometry(.2,16,12).translate(0,2.98,0);
    props([[pole,metal],[glow,mat(THEME.palette.lamp,{emissive:THEME.campus.blueLight,emissiveIntensity:.35,roughness:.3})]],list.map(([x,z])=>[x,G,z]),
      [{shape:'cylinder',args:[.1,.2],at:[0,.1,0]},{shape:'cylinder',args:[1.35,.07],at:[0,1.45,0]},{shape:'ball',args:[.22],at:[0,2.95,0]}],3,{furniture:true});
  }
  function bins(list){
    const can=new THREE.CylinderGeometry(.3,.27,.78,20).translate(0,.39,0),lid=new THREE.CylinderGeometry(.33,.33,.06,20).translate(0,.81,0);
    props([[can,mat(THEME.palette.bin,{roughness:.6})],[lid,metal]],list.map(([x,z])=>[x,G,z]),
      [{shape:'cylinder',args:[.42,.31],at:[0,.42,0]}],1.2,{furniture:true});
  }

  // --- Layout: the name on the plaza, toys along the roads ---------------------
  word('ARMIN',[-4.5,-4.2],{size:2.4,depth:.9,mass:2});
  wall([0,-27.8],0,10,4);                                   // white blocks across the Work road
  bowling([8,4.5]);
  cones([[-30,-1.6],[-26,1.6],[-22,-1.6],[-18,1.6],[22,-1.6],[26,1.6],[30,-1.6],[34,1.6]]);
  crates([[16,-8],[16,-7],[16.5,-7.5,1],[13.6,10],[14.6,10],[14.1,10,1],[14.1,10,2]]);
  // Street furniture along the plaza and the main road.
  lamps([[-10.5,-7.5],[10.5,-7.5],[-10.5,7.5],[10.5,7.5],[-26,-3.9],[26,3.9],[-38,3.9],[38,-3.9]]);
  benches([[-6,7.6,Math.PI],[5,-7.6,0]]);
  bins([[-8,7.6],[3,-7.6]]);

  // --- Physics (loaded in the background) -----------------------------------
  let R=null,world=null,events=null,carBody=null,carCol=null;
  const byHandle=new Map(),clock=fixedClock(STEP);
  import('@dimforge/rapier3d-compat').then(async mod=>{
    R=mod.default??mod;await R.init();
    const w=new R.World({x:0,y:-24,z:0});w.timestep=STEP;events=new R.EventQueue(true);
    w.createCollider(R.ColliderDesc.cuboid(fw/2,1,fd/2).setTranslation(fx,G-1,fz).setFriction(.8),w.createRigidBody(R.RigidBodyDesc.fixed()));
    // Plinths: solid blocks the props bounce off.
    for(const [x,z,hw,hd] of solids)w.createCollider(R.ColliderDesc.cuboid(hw,(solidTop+1)/2,hd).setTranslation(x,(solidTop-1)/2,z),w.createRigidBody(R.RigidBodyDesc.fixed()));
    for(const t of things){
      const {p,q}=t.home;
      t.body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x,p.y,p.z).setRotation(q).setLinearDamping(t.furniture?.4:.15).setAngularDamping(t.spin).setCanSleep(true));
      for(const c of t.colliders){const d=R.ColliderDesc[c.shape](...c.args).setMass(t.mass/t.colliders.length).setFriction(.55).setRestitution(.15);if(c.at)d.setTranslation(...c.at);
        byHandle.set(w.createCollider(d,t.body).handle,t);}
      t.body.sleep();
    }
    const pose=car.pose();
    carBody=w.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(pose.x,G+.6,pose.z));
    carCol=w.createCollider(R.ColliderDesc.cuboid(pose.width/2,.55,pose.length/2).setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),carBody);
    world=w;clock.reset();
  }).catch(e=>console.warn('Physics could not start; the playground stays still.',e));

  const carQ=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),m4=new THREE.Matrix4(),pp=new THREE.Vector3(),pq=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1);
  const ZERO={x:0,y:0,z:0},dirty=new Set();
  const ease=k=>k*k*(3-2*k);
  const displaced=t=>t.cur.p.distanceToSquared(t.home.p)>.04||t.cur.q.angleTo(t.home.q)>.15;
  // Start floating a piece of furniture back to its spot.
  function startReset(t){t.reset={k:0,p:t.cur.p.clone(),q:t.cur.q.clone()};t.body.setBodyType(R.RigidBodyType.KinematicPositionBased,true);t.active=true;t.rest=t.away=0;}

  function step(dt){
    const pose=car.pose();
    carBody.setNextKinematicTranslation({x:pose.x,y:G+.6,z:pose.z});carBody.setNextKinematicRotation(carQ.setFromAxisAngle(up,pose.h));
    for(const t of things)if(t.active){t.prev.p.copy(t.cur.p);t.prev.q.copy(t.cur.q);}
    // Furniture being put back follows a gentle arc home.
    for(const t of things)if(t.reset){
      const r=t.reset;r.k=Math.min(1,r.k+dt/FEEL.props.resetTime);const k=ease(r.k);
      pp.lerpVectors(r.p,t.home.p,k);pp.y+=Math.sin(Math.PI*k)*.5;pq.slerpQuaternions(r.q,t.home.q,k);
      t.body.setNextKinematicTranslation(pp);t.body.setNextKinematicRotation(pq);
    }
    world.step(events);
    // Bumping something takes a little speed off the car (more for heavier
    // things); a hard knock jolts the body and the camera.
    events.drainCollisionEvents((h1,h2,started)=>{
      if(!started)return;const other=h1===carCol.handle?h2:h2===carCol.handle?h1:null;const t=other==null?null:byHandle.get(other);
      if(!t||t.reset)return;car.slow(1-Math.min(.3,t.mass*.08));car.hit(Math.abs(pose.v)/FEEL.car.maxSpeed*Math.min(1,t.mass/2.5));
    });
    for(const t of things){
      const b=t.body,sleeping=b.isSleeping();
      if(sleeping&&!t.active&&!t.reset){
        // Toppled furniture asleep off its spot: wait, then float back.
        if(t.furniture&&displaced(t)&&(t.rest+=dt)>FEEL.props.restDelay)startReset(t);
        continue;
      }
      const tr=b.translation(),ro=b.rotation();t.cur.p.set(tr.x,tr.y,tr.z);t.cur.q.set(ro.x,ro.y,ro.z,ro.w);
      if(!t.active){t.prev.p.copy(t.cur.p);t.prev.q.copy(t.cur.q);}
      t.active=!sleeping||!!t.reset;
      // Fell off the map: back to where it started.
      if(tr.y<-15){b.setTranslation(t.home.p,true);b.setRotation(t.home.q,true);b.setLinvel(ZERO,true);b.setAngvel(ZERO,true);t.cur.p.copy(t.home.p);t.cur.q.copy(t.home.q);t.prev.p.copy(t.home.p);t.prev.q.copy(t.home.q);}
      if(t.reset){
        if(t.reset.k>=1){t.reset=null;b.setBodyType(R.RigidBodyType.Dynamic,true);b.setLinvel(ZERO,true);b.setAngvel(ZERO,true);b.sleep();t.active=false;t.drawn=false;}
        continue;
      }
      if(t.furniture){
        // Rests a moment once still; anything off its spot for long goes back anyway.
        const lv=b.linvel(),still=lv.x*lv.x+lv.y*lv.y+lv.z*lv.z<.09,off=displaced(t);
        t.rest=still&&off?t.rest+dt:0;t.away=off?t.away+dt:0;
        if(t.rest>FEEL.props.restDelay||t.away>FEEL.props.restDelay*2)startReset(t);
      }
    }
  }

  return {
    get world(){return world;},
    get ready(){return !!world;},
    things,
    resync(){clock.reset();},
    // dt in seconds. Returns true while anything is moving (so shadows refresh).
    update(dt){
      if(!world)return false;
      clock.advance(dt,step);
      const a=clock.alpha;let moving=false;
      for(const t of things){
        if(!t.active&&t.drawn)continue;
        moving=moving||t.active;t.drawn=!t.active;
        const k=t.active?a:1;pp.lerpVectors(t.prev.p,t.cur.p,k);pq.slerpQuaternions(t.prev.q,t.cur.q,k);
        for(const v of t.views){if(v.isMesh){v.position.copy(pp);v.quaternion.copy(pq);}else{v[0].setMatrixAt(v[1],m4.compose(pp,pq,one));dirty.add(v[0]);}}
      }
      for(const im of dirty)im.instanceMatrix.needsUpdate=true;dirty.clear();
      return moving;
    },
  };
}
