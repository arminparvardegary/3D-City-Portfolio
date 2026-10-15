import * as THREE from 'three';
import { createKit } from '../../diorama/kit.js';
import { FACADE, storyFacade, towerFacade,storyGlow,towerGlow } from './facades.js';
import { G,CURB,HALF,LANE,EDGE,PARK,WALK,MAN,BKN,NS,AV,BAV,ST,BRIDGE,DECK_HALF,WHARF,blocks,network,CORNER_R } from './layout.js';

// The city itself (world units): land and water, sidewalks with curbs, street
// markings and crosswalks, traffic lights, street lamps and trees, Central Park,
// the landmarks, and every other block filled with buildings that suit its
// district (midtown and downtown towers, brick walk-ups with water tanks,
// Brooklyn brownstones). Realistic materials, merged per material.
let seed=7;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647),pick=a=>a[Math.floor(rand()*a.length)],range=(a,b)=>a+rand()*(b-a);

export function buildCity({reserved=new Set(),pave=new Set(),fills=[]}={}){
  seed=7;
  const root=new THREE.Group(),K=createKit({flat:false}),{box,cyl,add,mat}=K;
  const solids=[],occluders=[],loops=[];
  // Sidewalks are not walls: the car can drive up the curb onto them. Each
  // walkable area is recorded here; walkHeight() gives the ground height there.
  const walks=[];
  const skin=(color,kind,size=2,extra={})=>{const m=mat(color,{map:FACADE[kind](),roughness:.8,...extra});m.userData.uvSize=size;return m;};
  const glassSkin=c=>skin(c,'glass',2,{metalness:.55,roughness:.12,envMapIntensity:1.3});
  // Animated film palette: candy coloured walls with painted windows, brick, and
  // pastel towers for the skyline. (Keys kept from the realistic set: brick,
  // office, lime, brown, glass.)
  // The painted facade doubles as its bump map: bricks, recesses and sills catch the light.
  const story=(c,kind)=>{const t=storyFacade(c,kind),m=mat('#ffffff',{map:t,bumpMap:t,bumpScale:1.4,roughness:.85,emissiveMap:storyGlow(kind==='brick'?'square':kind),emissive:'#ffffff',emissiveIntensity:1.1});m.userData.uvSize=2;return m;};
  const tower=c=>{const t=towerFacade(c),m=mat('#ffffff',{map:t,bumpMap:t,bumpScale:1,roughness:.55,metalness:.1,emissiveMap:towerGlow(),emissive:'#ffffff',emissiveIntensity:.8});m.userData.uvSize=2;return m;};
  const WALLS=['#e88fa2','#f0a07a','#7fc8b0','#5aa9a4','#f2cf74','#b7a3d9','#86b9e3','#f3b28c','#e6c9a4','#a8d08d'];
  const PAL={brick:WALLS.map(c=>story(c,'arch')),office:WALLS.map(c=>story(c,'square')),brown:['#c25b45','#b8664a','#a8523e','#c97a5a'].map(c=>story(c,'brick')),
    lime:['#f3dcc0','#f1d2b2','#e8d6c8'].map(tower),glass:['#cfe2f0','#d9cdea','#f6d9c4','#bfd9ee'].map(tower)};
  const AWN=[['#e8505b','#fff6ec'],['#3f9a96','#fff6ec'],['#f2b705','#fff6ec'],['#5a7fd6','#fff6ec'],['#8a5ad6','#fff6ec']].map(([a,b])=>[mat(a,{roughness:.7}),mat(b,{roughness:.7})]);
  const flowers=['#ff6b8a','#ffd166','#ff9f6b','#c58cff','#ffffff'].map(c=>mat(c,{roughness:.8})),planter=mat('#8a5a3c',{roughness:.8});
  const stone=mat('#cfc6b4',{roughness:.85}),cornice=mat('#e6dfd0',{roughness:.8}),roofM=mat('#6d7077',{roughness:.9}),dark=mat('#23262b',{roughness:.6}),
    metal=mat('#9aa0a8',{metalness:.7,roughness:.35}),wood=mat('#7b5a44',{roughness:.85}),greenM=mat('#4f7f3a',{roughness:.95}),copper=mat('#6fae98',{roughness:.5,metalness:.3});
  const occl=(x,z,w,d,h,y=G+CURB)=>occluders.push(new THREE.Box3(new THREE.Vector3(x-w/2,y,z-d/2),new THREE.Vector3(x+w/2,y+h,z+d/2)));
  const top=G+CURB;

  // --- Land, water, waterfront ------------------------------------------------------
  const asphaltTex=FACADE.asphalt(),asphalt=mat('#4b4d53',{map:asphaltTex,bumpMap:asphaltTex,bumpScale:.8,roughness:.92});asphalt.userData.uvSize=14;
  const land=(x0,x1)=>{box(x1-x0,1.4,NS.z1-NS.z0,(x0+x1)/2,G-1.4,0,asphalt);box(x1-x0+.02,1.2,NS.z1-NS.z0+.02,(x0+x1)/2,G-2.6,0,stone);};
  land(MAN.x0,MAN.x1);land(BKN.x0,BKN.x1);
  // The sea: wave trains of different lengths and directions move the surface and
  // its normals, so the sky and the sun break into moving highlights. A fine
  // grid round the city, a flat plane out to the horizon.
  const seaTime={value:0};
  {const mat=new THREE.MeshStandardMaterial({color:'#1f5a74',roughness:.04,metalness:.2,envMapIntensity:1.2});
    mat.customProgramCacheKey=()=>'sea';   // its own program (the shadow softener wraps this hook)
    mat.onBeforeCompile=sh=>{sh.uniforms.uTime=seaTime;
      sh.vertexShader='uniform float uTime;\nvarying float vWave;\n'+sh.vertexShader
        .replace('#include <beginnormal_vertex>',`
          vec2 P=position.xz;float h=0.,hx=0.,hz=0.;
          vec4 W[5];W[0]=vec4(1.,.3,.11,.16);W[1]=vec4(-.4,1.,.07,.22);W[2]=vec4(.7,-.6,.045,.37);W[3]=vec4(-.9,-.2,.03,.61);W[4]=vec4(.2,.95,.018,.93);
          for(int i=0;i<5;i++){vec2 d=normalize(W[i].xy);float k=W[i].w,a=W[i].z*mix(1.,.4,smoothstep(300.,700.,length(P)));
            float ph=dot(d,P)*k+uTime*sqrt(9.8*k);h+=a*sin(ph);hx+=a*k*d.x*cos(ph);hz+=a*k*d.y*cos(ph);}
          vec3 objectNormal=normalize(vec3(-hx*3.,1.,-hz*3.));
          #ifdef USE_TANGENT
          vec3 objectTangent=vec3(1.,0.,0.);
          #endif`)
        .replace('#include <begin_vertex>','vec3 transformed=vec3(position);transformed.y+=h*2.2;vWave=h/.3;');
      // Colour from the waves: deep blue troughs, lighter green blue crests, a little foam on the tops.
      sh.fragmentShader='varying float vWave;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float w=clamp(vWave*.5+.5,0.,1.);diffuseColor.rgb=mix(vec3(.02,.015,.09),vec3(.09,.07,.3),w);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.85,.92,.95),smoothstep(.9,1.,w)*.12);`);};
    const near=new THREE.Mesh(new THREE.PlaneGeometry(900,900,200,200).rotateX(-Math.PI/2),mat);
    near.position.set(6,-.9,0);near.receiveShadow=true;root.add(near);
    const far=new THREE.Mesh(new THREE.RingGeometry(440,3000,64,1).rotateX(-Math.PI/2),mat);far.position.set(6,-.96,0);root.add(far);}
  const paving=mat('#bcb8b1',{map:FACADE.paving(),roughness:.85});paving.userData.uvSize=4;
  // Promenades are walkable: the car can climb onto them.
  const walkRect=(x0,x1,z0,z1)=>{box(x1-x0,CURB,z1-z0,(x0+x1)/2,G,(z0+z1)/2,paving);walks.push({x0,x1,z0,z1});};
  // Promenades round the island and along the river (the boardwalk's railing is at the water).
  const rail=(x0,z0,x1,z1)=>{const len=Math.hypot(x1-x0,z1-z0),n=Math.ceil(len/2.5),ang=Math.atan2(x1-x0,z1-z0);
    add(new THREE.BoxGeometry(.12,.1,len).rotateY(ang),metal,[(x0+x1)/2,top+1.05,(z0+z1)/2]);
    for(let i=0;i<=n;i++){const t=i/n;box(.1,1.05,.1,x0+(x1-x0)*t,top,z0+(z1-z0)*t,metal);}};
  {const e=AV[0]-HALF;walkRect(MAN.x0,e,NS.z0,NS.z1);
    walkRect(e,MAN.x1,NS.z0,ST[0]-HALF);walkRect(e,MAN.x1,ST.at(-1)+HALF,NS.z1);
    walkRect(AV.at(-1)+HALF,MAN.x1,ST[0]-HALF,ST.at(-1)+HALF,true);
    walkRect(BKN.x0,BAV[0]-HALF,ST[0]-HALF,ST.at(-1)+HALF,true);
    walkRect(BKN.x0,BKN.x1,NS.z0,ST[0]-HALF);walkRect(BKN.x0,BKN.x1,ST.at(-1)+HALF,NS.z1);walkRect(BAV[1]+HALF,BKN.x1,ST[0]-HALF,ST.at(-1)+HALF);}

  // --- Street engineering: markings, crosswalks, stop bars, arrows, drainage, parking --
  // Per road segment: double yellow centre line (two 10 cm lines, 10 cm apart),
  // solid white edge lines between the travel and parking lanes. At each crossing:
  // continental crosswalks just past the curb return, a stop bar 1.2 m before
  // them on the lane coming in, lane arrows for the allowed moves, curb ramps with
  // yellow tactile pads, and storm drains at the curb. Manholes in the lanes.
  const {nodes,edges}=network();
  // Corners at the city's edge are a full curve: the centre line turns on a 12 unit
  // radius around C, the inside curb on 6, the outside on 18 (the corner fills in).
  const corners=nodes.filter(n=>n.corner),R=CORNER_R;
  const centre=n=>[n.x+R*n.s[0],n.z+R*n.s[1]];
  // Points on the quarter circle of radius r, from the first road's side to the second's.
  const arc=(n,r,N=24)=>{const [cx,cz]=centre(n);return Array.from({length:N+1},(_,k)=>{const t=k/N*Math.PI/2;return [cx-Math.sin(t)*n.s[0]*r,cz-Math.cos(t)*n.s[1]*r];});};
  // A flat painted line along that curve.
  const ribbon=(n,r,w)=>{const a=arc(n,r-w/2),b=arc(n,r+w/2),pos=[],idx=[];
    a.forEach((p,k)=>{pos.push(p[0],0,p[1],b[k][0],0,b[k][1]);if(k){const i=2*k-2;idx.push(i,i+1,i+2,i+1,i+3,i+2);}});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    if(g.attributes.normal.getY(0)<0){g.setIndex(idx.map((v,i)=>idx[i-i%3+2-i%3]));g.computeVertexNormals();}return g;};
  // Inside curb radius for a block corner at (x, z): 6 where it faces a curve, else 3.
  const cornerR=(x,z)=>corners.some(n=>Math.abs(x-(n.x+HALF*n.s[0]))<.01&&Math.abs(z-(n.z+HALF*n.s[1]))<.01)?R-HALF:3;
  const yellow=mat('#e3bd3a',{roughness:.6}),white=mat('#ecebe6',{roughness:.6}),iron=mat('#2b2d31',{roughness:.5,metalness:.6}),tactile=mat('#d9a92e',{roughness:.7});
  // The crosswalk starts where the curb's corner curve ends, so its tactile pads
  // sit on the straight sidewalk; the stop bar is just before it.
  const XW=HALF+4,BAR=HALF+5.6,parking=[];
  // Tactile pads only on a real sidewalk (not on Experience Row's street level lot).
  const BL=blocks(),onWalk=(x,z)=>{const b=BL.find(b=>x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1);return !b||!reserved.has(b.i+','+b.j)||pave.has(b.i+','+b.j);};
  const seen=new Set();
  for(const e of edges){
    if(e.kind!=='road')continue;const k=[e.a.k,e.b.k].sort().join('|');if(seen.has(k))continue;seen.add(k);
    const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,rx=-fz,rz=fx;
    const s0=e.a.degree>2?BAR+.6:e.a.corner?R:HALF+1,s1=len-(e.b.degree>2?BAR+.6:e.b.corner?R:HALF+1),inner=s1-s0;if(inner<=0)continue;
    const cx=e.a.x+fx*(s0+s1)/2,cz=e.a.z+fz*(s0+s1)/2,ang=Math.atan2(fx,fz);
    for(const o of [-.14,.14])add(new THREE.BoxGeometry(.12,.02,inner).rotateY(ang),yellow,[cx+rx*o,G+.005,cz+rz*o]);
    for(const sd of [-1,1])add(new THREE.BoxGeometry(.12,.02,inner).rotateY(ang),white,[cx+rx*sd*EDGE,G+.005,cz+rz*sd*EDGE]);
    // A manhole mid block in a travel lane (lane arrows stop well before the middle).
    for(let m=0;m<1;m++){const t=len/2+(rand()-.5)*1.5,sd=rand()<.5?-1:1;add(new THREE.CylinderGeometry(.45,.45,.03,20),iron,[e.a.x+fx*t+rx*sd*LANE*.9,G+.005,e.a.z+fz*t+rz*sd*LANE*.9]);}
    // Parking along both curbs (not on Armin's street, FDR Drive or the edge roads).
    const edgeRoad=Math.abs(dx)<1&&(e.a.x===AV[0]||e.a.x===AV.at(-1))||Math.abs(dz)<1&&(e.a.z===ST[0]||e.a.z===ST.at(-1));
    if(!(Math.abs(dz)<1&&e.a.z===ST[5])&&!edgeRoad)for(const sd of [-1,1])for(let t=s0+3;t<s1-3;t+=6.2)if(rand()<.55)
      parking.push({x:e.a.x+fx*t+rx*sd*PARK,z:e.a.z+fz*t+rz*sd*PARK,h:sd>0?ang:ang+Math.PI});
  }
  // The same lines round each corner.
  for(const n of corners){for(const o of [-.14,.14])add(ribbon(n,R+o,.12),yellow,[0,G+.005,0]);for(const sd of [-1,1])add(ribbon(n,R+sd*EDGE,.12),white,[0,G+.005,0]);}
  // Arrow shapes, pointing +z in their own frame: a stem and heads for straight, left, right.
  const tri=(w,l)=>{const sh=new THREE.Shape([new THREE.Vector2(-w/2,0),new THREE.Vector2(w/2,0),new THREE.Vector2(0,l)]);return new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2).rotateY(Math.PI);};
  const arrow=(moves)=>{const parts=[new THREE.BoxGeometry(.22,.02,1.6).translate(0,0,.8)];
    if(moves.s)parts.push(new THREE.BoxGeometry(.22,.02,.9).translate(0,0,2),tri(.75,.75).translate(0,.01,2.45));
    for(const [m,sd] of [['r',-1],['l',1]])if(moves[m]){parts.push(new THREE.BoxGeometry(.55,.02,.22).translate(sd*.275,0,1.5),tri(.7,.6).rotateY(sd*Math.PI/2).translate(sd*.55,.01,1.5));}
    return parts;};
  for(const n of nodes){if(n.degree<3)continue;
    for(const e of n.out){
      const dx=e.b.x-n.x,dz=e.b.z-n.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,rx=-fz,rz=fx,ang=Math.atan2(fx,fz);
      // Continental crosswalk across this road, just past the curb return.
      for(let k=-5;k<=5;k++)add(new THREE.BoxGeometry(.6,.02,2.4).rotateY(ang),white,[n.x+fx*XW+rx*k*1.1,G+.006,n.z+fz*XW+rz*k*1.1]);
      // Curb ramps with tactile pads at both ends of the crosswalk.
      for(const sd of [-1,1])if(onWalk(n.x+fx*XW+rx*sd*(HALF+.82),n.z+fz*XW+rz*sd*(HALF+.82)))add(new THREE.BoxGeometry(.9,.03,1.6).rotateY(ang),tactile,[n.x+fx*XW+rx*sd*(HALF+.82),G+CURB+.005,n.z+fz*XW+rz*sd*(HALF+.82)]);
      if(e.kind!=='road')continue;
      // Traffic coming in along this road drives toward the node (direction -f); its lane is on the -r side.
      add(new THREE.BoxGeometry(HALF-.4,.02,.45).rotateY(ang),white,[n.x+fx*BAR-rx*(HALF/2),G+.006,n.z+fz*BAR-rz*(HALF/2)]);
      // Lane arrows for the moves this approach allows.
      const d=[-fx,-fz],moves={s:false,l:false,r:false};
      for(const o of n.out){if(o===e)continue;const ox=o.b.x-n.x,oz=o.b.z-n.z,ol=Math.hypot(ox,oz),u=[ox/ol,oz/ol],dot=d[0]*u[0]+d[1]*u[1],cr=d[0]*u[1]-d[1]*u[0];
        if(dot>.9)moves.s=true;else if(cr>.5)moves.r=true;else if(cr<-.5)moves.l=true;}
      const head=Math.atan2(d[0],d[1]),ax=n.x+fx*(BAR+5.5)-rx*LANE,az=n.z+fz*(BAR+5.5)-rz*LANE;
      for(const g of arrow(moves))add(g.rotateY(head),white,[ax,G+.006,az]);
      // Storm drain at the curb, on the right of the incoming lane.
      add(new THREE.BoxGeometry(1.1,.03,.5).rotateY(ang+Math.PI/2),iron,[n.x+fx*(BAR+1.5)-rx*(HALF-.3),G+.004,n.z+fz*(BAR+1.5)-rz*(HALF-.3)]);
    }
  }

  // --- Traffic lights: at every crossing with three or more roads ---------------------
  // One head per road coming in, on the corner to its right, facing the traffic.
  // Roads along z and along x take turns: 20 s cycle.
  // Lenses are dark glass; only the light that is on glows.
  const LIGHT={z:{},x:{}};for(const a of ['z','x'])for(const [c,hex] of [['r','#ff2a1f'],['y','#ffb51f'],['g','#21e06e']])LIGHT[a][c]=new THREE.MeshStandardMaterial({color:'#1b1d20',emissive:hex,emissiveIntensity:0,roughness:.25});
  const lights=[];
  for(const n of nodes){if(n.degree<3)continue;lights.push(n);
    for(const e of n.out){
      const dx=e.b.x-n.x,dz=e.b.z-n.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,rx=-fz,rz=fx,axis=Math.abs(fx)>.5?'x':'z';
      // Traffic coming in along this road drives toward the node (direction -f); its right is -r.
      const px=n.x+fx*(HALF+1.2)-rx*(HALF+1.2),pz=n.z+fz*(HALF+1.2)-rz*(HALF+1.2);
      cyl(.1,.12,4.6,8,px,top,pz,dark);solids.push([px,pz,.16,.16]);
      const hx=px+rx*1.6,hz=pz+rz*1.6;add(new THREE.BoxGeometry(.1,.1,3.2).rotateY(Math.atan2(rx,rz)),dark,[px+rx*.8,top+4.4,pz+rz*.8]);
      add(new THREE.BoxGeometry(.5,1.3,.35).rotateY(Math.atan2(fx,fz)),dark,[hx,top+3.7,hz]);
      ['r','y','g'].forEach((c,k)=>add(new THREE.SphereGeometry(.14,10,8),LIGHT[axis][c],[hx+fx*.2,top+4.12-k*.4,hz+fz*.2]));
    }
  }
  const phase=t=>{const k=t%20;return {z:k<8?'g':k<10?'y':'r',x:k<10?'r':k<18?'g':'y'};};

  // --- Blocks ------------------------------------------------------------------------
  // Sidewalks with rounded curb returns (radius 3, about 4.5 m) and a granite curb.
  const granite=mat('#a7a49e',{roughness:.7});
  // A rounded rectangle (shape space x, -z). r: one radius, or four for the corners
  // (x1,z0), (x1,z1), (x0,z1), (x0,z0).
  const rounded=(x0,x1,z0,z1,r)=>{const [ra,rb,rc,rd]=[].concat(r).length===4?r:[r,r,r,r],sh=new THREE.Shape();
    sh.moveTo(x0+rd,-z0);sh.lineTo(x1-ra,-z0);sh.absarc(x1-ra,-z0-ra,ra,Math.PI/2,0,true);
    sh.lineTo(x1,-z1+rb);sh.absarc(x1-rb,-z1+rb,rb,0,-Math.PI/2,true);
    sh.lineTo(x0+rc,-z1);sh.absarc(x0+rc,-z1+rc,rc,-Math.PI/2,-Math.PI,true);
    sh.lineTo(x0,-z0-rd);sh.absarc(x0+rd,-z0-rd,rd,Math.PI,Math.PI/2,true);return sh;};
  function sidewalk(b,inner=true){   // inner: the area inside the sidewalk holds buildings (solid)
    const r=[[b.x1,b.z0],[b.x1,b.z1],[b.x0,b.z1],[b.x0,b.z0]].map(([x,z])=>cornerR(x,z)),ri=r.map(v=>v-.32);
    const top=rounded(b.x0+.32,b.x1-.32,b.z0+.32,b.z1-.32,ri);
    add(new THREE.ExtrudeGeometry(top,{depth:CURB,bevelEnabled:false,curveSegments:16}).rotateX(-Math.PI/2),paving,[0,G,0]);
    const ring=rounded(b.x0,b.x1,b.z0,b.z1,r);ring.holes.push(rounded(b.x0+.32,b.x1-.32,b.z0+.32,b.z1-.32,ri));
    add(new THREE.ExtrudeGeometry(ring,{depth:CURB+.01,bevelEnabled:false,curveSegments:16}).rotateX(-Math.PI/2),granite,[0,G,0]);
    walks.push({x0:b.x0,x1:b.x1,z0:b.z0,z1:b.z1,r});
    // Only what stands inside the sidewalk is solid.
    if(inner)solids.push([(b.x0+b.x1)/2,(b.z0+b.z1)/2,(b.x1-b.x0)/2-WALK,(b.z1-b.z0)/2-WALK]);
  }
  const lampHead=mat('#fff3d6',{emissive:'#ffb052',emissiveIntensity:4});
  const lamp=(x,z,ox,oz)=>{solids.push([x,z,.15,.15]);cyl(.09,.13,5.6,8,x,top,z,dark);add(new THREE.BoxGeometry(.08,.08,1.6).rotateY(Math.atan2(ox,oz)),dark,[x+ox*.8,top+5.5,z+oz*.8]);
    add(new THREE.BoxGeometry(.5,.16,.8).rotateY(Math.atan2(ox,oz)),dark,[x+ox*1.6,top+5.38,z+oz*1.6]);box(.4,.04,.6,x+ox*1.6,top+5.3,z+oz*1.6,lampHead);};
  // Painterly canopies (as on bruno-simon.com): a blotchy alpha map tears each leaf
  // ball into ragged dabs, so trees read as brush strokes, not spheres.
  const LEAF=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,128,128);
    let r=9;const rnd=()=>((r=(r*16807)%2147483647)/2147483647);g.fillStyle='#fff';
    for(let i=0;i<1300;i++){const x=rnd()*128,y=rnd()*128,s=2+rnd()*5;g.fillRect(x,y,s,s);}
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;return t;})();
  // Fluffy rounded trees: a tapered trunk and a soft cloud of leafy balls, lighter on top.
  const leafs=['#3f7a5a','#4a6fa8','#5a5ac8','#3c8a6a'].map(c=>mat(c,{roughness:.9,alphaMap:LEAF,alphaTest:.5,side:THREE.DoubleSide})),leafTop=mat('#7a7ae0',{roughness:.9,alphaMap:LEAF,alphaTest:.5,side:THREE.DoubleSide}),bark=mat('#7a5236',{roughness:.9});
  const tree=(x,z,s=1,y=top)=>{solids.push([x,z,.22*s,.22*s]);cyl(.13*s,.24*s,2.8*s,10,x,y,z,bark);
    for(let k=0;k<4;k++){const a=k/4*Math.PI*2+.4,rr=(1+rand()*.35)*s;add(new THREE.IcosahedronGeometry(rr,1),pick(leafs),[x+Math.cos(a)*.75*s,y+(3.1+rand()*.5)*s,z+Math.sin(a)*.75*s]);}
    add(new THREE.IcosahedronGeometry(1.05*s,1),leafTop,[x,y+4.2*s,z]);};
  const streetFurniture=(b,{trees=false}={})=>{
    // Lamps along each side, trees between them; never at the corners.
    for(const [x0,z0,x1,z1,ox,oz] of [[b.x0,b.z0,b.x1,b.z0,0,-1],[b.x0,b.z1,b.x1,b.z1,0,1],[b.x0,b.z0,b.x0,b.z1,-1,0],[b.x1,b.z0,b.x1,b.z1,1,0]]){
      const len=Math.hypot(x1-x0,z1-z0),n=Math.floor((len-8)/14);
      for(let k=0;k<=n;k++){const t=(4+k*((len-8)/Math.max(1,n)))/len,x=x0+(x1-x0)*t-ox*.6,z=z0+(z1-z0)*t-oz*.6;lamp(x,z,ox,oz);
        if(trees&&k<n){const t2=t+7/len;tree(x0+(x1-x0)*t2-ox*1.4,z0+(z1-z0)*t2-oz*1.4,.8);}}
    }
  };

  // Building types: each returns its height. (x, z) is the centre, on the sidewalk;
  // front: the street side ([0, 1]: +z and -z faces; [1, 0]: +x and -x faces).
  const shopFloor=(x,z,w,d,front)=>{const glass=mat('#2f4f5c',{roughness:.2,metalness:.2}),[fx,fz]=front,aw=pick(AWN);
    box(w,3,d,x,top,z,pick(PAL.office));
    for(const sd of [-1,1]){const ox=fx*sd,oz=fz*sd,len=fx?d:w,cx=x+ox*(w/2+.04),cz=z+oz*(d/2+.04);
      // Shop window and door, framed.
      add(new THREE.BoxGeometry(fz?len*.62:.08,1.9,fz?.08:len*.62),glass,[cx-(fz?len*.12:0),top+.5,cz-(fx?len*.12:0)]);
      add(new THREE.BoxGeometry(fz?1.1:.1,2.3,fz?.1:1.1),dark,[cx+(fz?len*.32:0),top,cz+(fx?len*.32:0)]);
      // A striped awning sloping out over the window.
      const n=Math.max(6,Math.round(len*.8/.55)),sw=len*.8/n,slope=.42;
      for(let k=0;k<n;k++){const t=-len*.4+sw*(k+.5),m=aw[k%2],px=cx+(fz?t:0)+ox*.65,pz=cz+(fx?t:0)+oz*.65;
        add(new THREE.BoxGeometry(fz?sw:1.4,.06,fz?1.4:sw).rotateX(fz?oz*slope:0).rotateZ(fx?-ox*slope:0),m,[px,top+2.65,pz]);
        add(new THREE.BoxGeometry(fz?sw:.05,.3,fz?.05:sw),m,[cx+(fz?t:0)+ox*1.3,top+2.25,cz+(fx?t:0)+oz*1.3]);}
    }};
  const corniceRow=(x,z,w,d,y,color)=>{box(w+.7,.55,d+.7,x,y,z,color);for(const sd of [-1,1]){for(let t=-w/2+.5;t<=w/2-.3;t+=1.8)box(.2,.38,.32,x+t,y-.3,z+sd*(d/2+.2),color);for(let t=-d/2+.5;t<=d/2-.3;t+=1.8)box(.32,.38,.2,x+sd*(w/2+.2),y-.3,z+t,color);}};
  const flowerBoxes=(x,z,w,d,front,y)=>{const [fx,fz]=front;for(const sd of [-1,1])for(let t=-(fz?w:d)/2+1;t<(fz?w:d)/2-.6;t+=4){
    const px=x+(fz?t:sd*(w/2+.2)),pz=z+(fx?t:sd*(d/2+.2));add(new THREE.BoxGeometry(fz?.9:.3,.25,fz?.3:.9),planter,[px,y,pz]);
    for(let k=0;k<3;k++)add(new THREE.IcosahedronGeometry(.16,0),k%2?pick(leafs):pick(flowers),[px+(fz?(k-1)*.3:0),y+.33,pz+(fx?(k-1)*.3:0)]);}};
  const waterTank=(tx,tz,ty)=>{for(const [a,c] of [[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]])box(.15,1.6,.15,tx+a,ty,tz+c,wood);
    cyl(1.1,1.1,2.2,14,tx,ty+1.6,tz,wood);add(new THREE.ConeGeometry(1.25,.9,14).translate(0,.45,0),wood,[tx,ty+3.8,tz]);};
  const T={
    walkup(x,z,w,d,h,front){shopFloor(x,z,w,d,front);const m=pick(PAL.brick),c=mat(pick(['#fbf3e4','#f6e7cf','#efe2cb']),{roughness:.8});
      box(w,h-3,d,x,top+3,z,m);corniceRow(x,z,w,d,top+h,c);box(w-.2,.35,d-.2,x,top+h+.55,z,roofM);flowerBoxes(x,z,w,d,front,top+5.2);
      if(rand()<.7)waterTank(x+(rand()-.5)*w*.4,z+(rand()-.5)*d*.4,top+h+.9);
      // Fire escape on one street face.
      const [fx,fz]=front,fe=fz?z+d/2+.45:x+w/2+.45;for(let y=top+5;y<top+h-.6;y+=2.2){if(fz){box(w*.42,.08,.9,x,y,fe,dark);box(w*.42,.6,.05,x,y+.08,fe+.42,dark);}else{box(.9,.08,d*.42,fe,y,z,dark);box(.05,.6,d*.42,fe+.42,y+.08,z,dark);}}
      return h+1.5;},
    office(x,z,w,d,h,front){shopFloor(x,z,w,d,front);const m=pick(PAL.office),c=mat('#fbf3e4',{roughness:.8});box(w,h-3,d,x,top+3,z,m);corniceRow(x,z,w,d,top+h,c);flowerBoxes(x,z,w,d,front,top+5.2);
      for(let k=0;k<2;k++)box(1.2,.7,.9,x+(k-.5)*w*.4,top+h+.55,z,metal);return h+1.3;},
    limestone(x,z,w,d,h){const m=pick(PAL.lime),c=mat('#fbf3e4',{roughness:.8});const h1=h*.55,h2=h*.82;box(w,h1,d,x,top,z,m);box(w-3,h2-h1,d-3,x,top+h1,z,m);box(w-6,h-h2,d-6,x,top+h2,z,m);
      for(const [hh,ww,dd] of [[h1,w,d],[h2,w-3,d-3],[h,w-6,d-6]])box(ww+.4,.5,dd+.4,x,top+hh,z,c);
      add(new THREE.SphereGeometry(Math.min(w,d)*.18,20,12,0,Math.PI*2,0,Math.PI/2),mat(pick(['#7fc8b0','#e8a24a','#e88fa2']),{roughness:.5,metalness:.2}),[x,top+h+.5,z]);return h+Math.min(w,d)*.18;},
    glass(x,z,w,d,h){const m=pick(PAL.glass);box(w,h,d,x,top,z,m);box(w+.3,.6,d+.3,x,top+h,z,mat('#fbf3e4',{roughness:.8}));if(rand()<.5)waterTank(x,z,top+h+.6);return h+1;},
    brownstone(x,z,w,d,h,front){box(w,h,d,x,top,z,pick(PAL.brown));corniceRow(x,z,w,d,top+h,mat('#fbf3e4',{roughness:.8}));flowerBoxes(x,z,w,d,front,top+2.6);
      // A stoop up to the front door.
      const [fx,fz]=front;for(let k=0;k<5;k++)box(fz?1.6:.5,.3*(k+1),fz?.5:1.6,x+fx*(w/2+.25+k*.5)*(fx?1:0),top,z+fz*(d/2+.25+k*.5)*(fz?1:0),stone);
      return h+.5;},
  };
  // Fill a rectangle with buildings of a district: lots along its longer side.
  function fill(r,zone){
    const w=r.x1-r.x0,d=r.z1-r.z0,alongX=w>=d,len=alongX?w:d,depth=alongX?d:w,n=Math.max(1,Math.min(4,Math.round(len/(zone==='bkn'?6:13))));
    let at=alongX?r.x0:r.z0;
    for(let k=0;k<n;k++){
      const span=len/n,c=at+span/2;at+=span;
      const [bx,bz,bw,bd]=alongX?[c,(r.z0+r.z1)/2,span-.5,depth]:[(r.x0+r.x1)/2,c,depth,span-.5];
      let h,type;
      if(zone==='tall'){type=pick(['glass','glass','limestone','office']);h=type==='glass'?range(50,95):type==='limestone'?range(40,75):range(25,42);}
      else if(zone==='mid'){type=pick(['office','walkup','limestone','glass']);h=type==='walkup'?range(12,18):range(20,38);}
      else if(zone==='low'){type=pick(['walkup','walkup','office']);h=type==='walkup'?range(10,16):range(16,24);}
      else {type='brownstone';h=range(8,11);}
      const front=alongX?[0,1]:[1,0];
      const hh=T[type](bx,bz,bw,bd,h,front);occl(bx,bz,bw,bd,hh);
    }
  }

  // Landmarks (scaled to sit well with the car and the streets).
  const LM={};
  LM.empire=(b)=>{const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,m=PAL.lime[0];let y=top;
    for(const [w,h] of [[20,10],[16.5,34],[13,48],[10,18],[7.2,8],[5,5]]){box(w,h,w,x,y,z,m);box(w+.4,.5,w+.4,x,y+h,z,cornice);y+=h+.5;}
    cyl(1.6,2.6,7,12,x,y,z,metal);cyl(.3,.45,16,8,x,y+7,z,metal);occl(x,z,20,20,y-top+23);};
  LM.chrysler=(b)=>{const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,m=PAL.lime[1];let y=top;
    for(const [w,h] of [[20,12],[16,16],[12.5,54]]){box(w,h,w,x,y,z,m);box(w+.4,.5,w+.4,x,y+h,z,cornice);y+=h+.5;}
    const crown=[[7.6,0],[7.6,3],[6.2,3],[6.2,6.5],[4.8,6.5],[4.8,9.8],[3.3,9.8],[3.3,12.4],[1.8,12.4],[1.8,14],[.6,14]].map(([r,h])=>new THREE.Vector2(r,h));
    add(new THREE.LatheGeometry(crown,4).rotateY(Math.PI/4),mat('#d8dde3',{metalness:.85,roughness:.2,envMapIntensity:1.5}),[x,y,z]);
    add(new THREE.ConeGeometry(.9,14,8).translate(0,7,0),metal,[x,y+14,z]);occl(x,z,20,20,y-top+28);};
  LM.wtc=(b)=>{const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,gm=PAL.glass[3];box(18,9,18,x,top,z,gm);
    const h=118,g=new THREE.CylinderGeometry(6.5,12.2,h,4,1).translate(0,h/2,0),p=g.attributes.position;
    for(let i=0;i<p.count;i++)if(p.getY(i)<.01){const a=Math.atan2(p.getX(i),p.getZ(i))+Math.PI/4,r=Math.hypot(p.getX(i),p.getZ(i));p.setXYZ(i,Math.sin(a)*r,p.getY(i),Math.cos(a)*r);}
    add(g.toNonIndexed(),gm,[x,top+9,z]);cyl(2.4,2.4,2,12,x,top+9+h,z,metal);cyl(.35,.6,28,8,x,top+11+h,z,metal);occl(x,z,18,18,h+40);};
  LM.dome=(b)=>{const x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,m=PAL.lime[2];box(18,44,18,x,top,z,m);box(18.4,.6,18.4,x,top+44,z,cornice);
    cyl(5.5,5.5,4,16,x,top+44.6,z,m);add(new THREE.SphereGeometry(5.5,24,12,0,Math.PI*2,0,Math.PI/2),copper,[x,top+48.6,z]);cyl(.8,.8,2.4,10,x,top+54,z,copper);add(new THREE.ConeGeometry(.8,2.6,10).translate(0,1.3,0),copper,[x,top+56.4,z]);
    occl(x,z,18,18,59);};
  // Central Park: grass, paths, a pond, trees, a low stone wall.
  const park=(b,{pond=false}={})=>{const grass=mat('#5f8f3f',{map:FACADE.grass(),roughness:.95});grass.userData.uvSize=6;
    const ix0=b.x0+WALK,ix1=b.x1-WALK,iz0=b.z0+WALK,iz1=b.z1-WALK;box(ix1-ix0,.08,iz1-iz0,(ix0+ix1)/2,top,(iz0+iz1)/2,grass);
    for(const [x0,z0,x1,z1] of [[ix0,iz0,ix1,iz0],[ix0,iz1,ix1,iz1],[ix0,iz0,ix0,iz1],[ix1,iz0,ix1,iz1]])box(Math.abs(x1-x0)||.4,.6,Math.abs(z1-z0)||.4,(x0+x1)/2,top,(z0+z1)/2,stone);
    // A path across the park, corner to corner.
    const path=mat('#d8cdb6',{roughness:.95});add(new THREE.BoxGeometry(2.2,.1,Math.hypot(ix1-ix0,iz1-iz0)).rotateY(Math.atan2(ix1-ix0,iz1-iz0)),path,[(ix0+ix1)/2,top+.06,(iz0+iz1)/2]);
    if(pond){const p=new THREE.Mesh(new THREE.CircleGeometry(7,40).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:'#3b6f86',roughness:.1,metalness:.2}));p.position.set((ix0+ix1)/2+3,top+.1,(iz0+iz1)/2-2);root.add(p);}
    for(let k=0;k<26;k++){const x=range(ix0+2,ix1-2),z=range(iz0+2,iz1-2);if(pond&&Math.hypot(x-(ix0+ix1)/2-3,z-(iz0+iz1)/2+2)<9)continue;tree(x,z,range(.9,1.3),top+.08);}
    for(let k=0;k<4;k++){const x=range(ix0+3,ix1-3),z=range(iz0+3,iz1-3);box(1.8,.45,.6,x,top+.08,z,wood);}
  };
  const LANDMARK={'1,3':'empire','2,2':'chrysler','3,5':'wtc','3,1':'dome'};

  // Outside each curve: the square corner of the roads becomes a small plaza with
  // a granite curb on the curve and a tree.
  for(const n of corners){const [sx,sz]=n.s,P=[n.x-HALF*sx,n.z-HALF*sz],ro=R+HALF;
    const pts=[P,...arc(n,ro,32)].map(([x,z])=>new THREE.Vector2(x,-z));
    add(new THREE.ExtrudeGeometry(new THREE.Shape(pts),{depth:CURB,bevelEnabled:false}).rotateX(-Math.PI/2),paving,[0,G,0]);
    const band=[...arc(n,ro,32),...arc(n,ro+.32,32).reverse()].map(([x,z])=>new THREE.Vector2(x,-z));
    add(new THREE.ExtrudeGeometry(new THREE.Shape(band),{depth:CURB+.01,bevelEnabled:false}).rotateX(-Math.PI/2),granite,[0,G,0]);
    walks.push({plaza:true,P,s:[sx,sz],C:centre(n),ro});
    tree(P[0]+sx*3.2,P[1]+sz*3.2,1.1);}

  for(const b of blocks()){
    // Armin's store blocks: an open plaza, the stores bring their own solids.
    const key=b.i+','+b.j;if(pave.has(key))sidewalk(b,false);if(reserved.has(key)){continue;}
    sidewalk(b);
    const inner={x0:b.x0+WALK,x1:b.x1-WALK,z0:b.z0+WALK,z1:b.z1-WALK};
    loops.push({x0:b.x0+1,x1:b.x1-1,z0:b.z0+1,z1:b.z1-1,y:top});
    if(b.borough==='man'&&b.i<=1&&b.j<=1){park(b,{pond:b.i===0&&b.j===1});streetFurniture(b);continue;}
    streetFurniture(b,{trees:b.borough==='bkn'||b.i===0});
    if(LANDMARK[key]){LM[LANDMARK[key]](b);continue;}
    const zone=b.borough==='bkn'?'bkn':(b.i>=1&&b.i<=3&&b.j>=1&&b.j<=3)||(b.i>=2&&b.j>=4)?'tall':b.i===0?'low':'mid';
    fill(inner,zone);
  }
  for(const r of fills)fill(r,r.zone??'low');

  // String lights with glowing bulbs across the streets of Armin's corner.
  {const bulb=mat('#fff3c4',{emissive:'#ffb347',emissiveIntensity:5,roughness:.4}),wire=mat('#2b2b2f');
    for(const [z,x0,x1] of [[ST[5],-106,-40],[ST[4],-106,-40]])for(let x=x0;x<=x1;x+=11){
      if(AV.some(a=>Math.abs(x-a)<HALF+1.5))continue;   // never over an avenue: the posts would stand in the road
      const pts=[];for(let k=0;k<=12;k++){const t=k/12,zz=z-HALF-1+t*(2*HALF+2),y=top+6.2-Math.sin(t*Math.PI)*1.1;pts.push(new THREE.Vector3(x,y,zz));}
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.03,4),wire);
      // Each wire hangs between two iron posts on the sidewalks (base, post, finial).
      for(const p of [pts[0],pts[12]]){solids.push([p.x,p.z,.18,.18]);cyl(.14,.16,.3,10,p.x,top,p.z,wire);cyl(.06,.07,p.y+.35-top,8,p.x,top,p.z,wire);
        add(new THREE.SphereGeometry(.1,8,6),wire,[p.x,p.y+.42,p.z]);}
      for(let k=1;k<12;k++){const p=pts[k];add(new THREE.SphereGeometry(.13,6,4),bulb,[p.x,p.y-.18,p.z]);}}}

  // --- New York street details ------------------------------------------------------
  // Fire hydrants and green trash bins near the corners; subway entrances with green
  // railings and globe lamps; steam stacks (orange and white) in a few parking spots.
  const hydrantRed=mat('#c13a2c',{roughness:.45}),cap=mat('#e6e0d2',{roughness:.5}),binGreen=mat('#2f5a3a',{roughness:.6}),
    subwayGreen=mat('#23573a',{roughness:.45,metalness:.3}),globe=mat('#b9f0c4',{emissive:'#5be07e',emissiveIntensity:.9}),orange=mat('#f06a1d',{roughness:.6});
  const hydrant=(x,z)=>{solids.push([x,z,.22,.22]);cyl(.15,.18,.5,12,x,top,z,hydrantRed);add(new THREE.SphereGeometry(.16,12,8,0,Math.PI*2,0,Math.PI/2),hydrantRed,[x,top+.5,z]);cyl(.05,.05,.08,8,x,top+.66,z,cap);
    for(const sd of [-1,1])add(new THREE.CylinderGeometry(.06,.06,.14,8).rotateZ(Math.PI/2),cap,[x+sd*.18,top+.34,z]);};
  const bin=(x,z)=>{solids.push([x,z,.28,.28]);cyl(.26,.21,.72,14,x,top,z,binGreen);cyl(.27,.27,.04,14,x,top+.72,z,dark);};
  const subway=(x,z)=>{   // along x, stairs going down toward -x, open at the -x end
    solids.push([x,z,1.7,.9]);box(3.2,.04,1.5,x,top-.01,z,dark);for(let k=0;k<6;k++)box(.05,.02,1.4,x-1.4+k*.5,top+.02,z,iron);
    for(const sd of [-1,1]){box(3.2,.07,.07,x,top+1.05,z+sd*.8,subwayGreen);for(let k=0;k<=4;k++)box(.07,1.05,.07,x-1.6+k*.8,top,z+sd*.8,subwayGreen);}
    box(.07,.07,1.6,x+1.6,top+1.05,z,subwayGreen);box(.07,1.05,.07,x+1.6,top,z,subwayGreen);
    for(const sd of [-1,1]){cyl(.05,.05,1.5,8,x-1.6,top,z+sd*.8,subwayGreen);add(new THREE.SphereGeometry(.17,14,10),globe,[x-1.6,top+1.62,z+sd*.8]);}};
  const SUBWAY=new Set(['1,2','2,3','3,4','2,0','3,2','2,5']);
  for(const b of blocks()){const key=b.i+','+b.j;if(reserved.has(key)||(b.borough==='man'&&b.i<=1&&b.j<=1))continue;
    // 2.2 in from the corner: on the sidewalk even at the big curved corners.
    const corners=[[b.x0+2.2,b.z0+2.2],[b.x1-2.2,b.z0+2.2],[b.x1-2.2,b.z1-2.2],[b.x0+2.2,b.z1-2.2]],c=(b.i+b.j)%4;
    hydrant(...corners[c]);bin(...corners[(c+2)%4]);
    if(SUBWAY.has(key))subway(b.x0+WALK+4,b.z1-1.3);
  }
  const steam=[];for(let k=0;k<3&&parking.length;k++){const p=parking.splice(Math.floor(rand()*parking.length),1)[0];steam.push(p);
    cyl(.32,.42,1.5,16,p.x,G,p.z,orange);for(const y of [.35,.9])cyl(.37-y*.06,.4-y*.06,.18,16,p.x,G+y,p.z,cap);}

  // --- Waterfront boardwalk ------------------------------------------------------------
  // Wooden planks on piles round every shore, WHARF wide. At the water a solid
  // railing (stone posts, an iron rail, a warm glow strip under it) keeps the car
  // out of the sea. Lamps lean over the boardwalk, benches face the water, flower
  // planters and trees in between. Nothing is built where the bridge leaves the shore.
  {const plankTex=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
      for(let i=0;i<8;i++){const v=140+Math.floor(rand()*40);g.fillStyle=`rgb(${v},${v*.74|0},${v*.52|0})`;g.fillRect(0,i*32,256,31);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,i*32+31,256,1);
        for(let k=0;k<3;k++){g.fillStyle='rgba(60,35,20,.25)';g.fillRect(rand()*256,i*32+4+rand()*22,30+rand()*60,1);}}
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;})();
    const plank=mat('#ffffff',{map:plankTex,roughness:.85});plank.userData.uvSize=4;
    const pile=mat('#4a3526',{roughness:.9}),post=mat('#b9b2a6',{roughness:.7}),iron=mat('#23252a',{roughness:.45,metalness:.6});
    const glow=mat('#ffd08a',{emissive:'#ffae4a',emissiveIntensity:3}),seat=mat('#8a5a3a',{roughness:.7});
    const blooms=['#ff7aa8','#ffd25a','#ff8a5c','#c9a2ff','#ffffff'].map(c=>mat(c,{roughness:.8,emissive:c,emissiveIntensity:.15}));
    const W=WHARF,band=(x,z)=>Math.abs(z-BRIDGE.z)<DECK_HALF+1.5&&x>BRIDGE.landM-2&&x<BRIDGE.landB+2;
    const strips=[];
    for(const L of [MAN,BKN]){
      strips.push({axis:'x',a0:L.x0-W,a1:L.x1+W,edge:NS.z0-W,s:1},{axis:'x',a0:L.x0-W,a1:L.x1+W,edge:NS.z1+W,s:-1},
        {axis:'z',a0:NS.z0-W,a1:NS.z1+W,edge:L.x0-W,s:1},{axis:'z',a0:NS.z0-W,a1:NS.z1+W,edge:L.x1+W,s:-1});
    }
    // A point d in from the water at distance a along the strip.
    const at=(S,a,d)=>S.axis==='x'?[a,S.edge+S.s*d]:[S.edge+S.s*d,a];
    for(const S of strips){
      // Deck and piles.
      const [p0x,p0z]=at(S,S.a0,0),[p1x,p1z]=at(S,S.a1,W),x0=Math.min(p0x,p1x),x1=Math.max(p0x,p1x),z0=Math.min(p0z,p1z),z1=Math.max(p0z,p1z);
      box(x1-x0,.35,z1-z0,(x0+x1)/2,top-.35,(z0+z1)/2,plank);walks.push({x0,x1,z0,z1});
      for(let a=S.a0+1;a<S.a1;a+=4){const [px,pz]=at(S,a,.4);cyl(.17,.2,2.6,8,px,-2.3,pz,pile);}
      // Railing at the water, in runs that stop at the bridge.
      let run=null;const flush=()=>{if(!run)return;const [ax,az]=at(S,run[0],.25),[bx,bz]=at(S,run[1],.25),len=run[1]-run[0];
        const g=S.axis==='x'?[len,.12,.12]:[.12,.12,len],h=S.axis==='x'?[len,.05,.05]:[.05,.05,len];
        add(new THREE.BoxGeometry(...g),iron,[(ax+bx)/2,top+1.05,(az+bz)/2]);add(new THREE.BoxGeometry(...h),glow,[(ax+bx)/2,top+.98,(az+bz)/2]);
        add(new THREE.BoxGeometry(...g),iron,[(ax+bx)/2,top+.5,(az+bz)/2]);
        solids.push([(ax+bx)/2,(az+bz)/2,S.axis==='x'?len/2:.2,S.axis==='x'?.2:len/2]);run=null;};
      for(let a=S.a0;a<=S.a1+1e-6;a+=2.5){const [px,pz]=at(S,a,.25);if(band(px,pz)){flush();continue;}
        box(.32,1.15,.32,px,top,pz,post);run?run[1]=a:run=[a,a];}
      flush();
      // Lamps, benches facing the sea, planters and trees along the inner side.
      for(let a=S.a0+6,k=0;a<S.a1-4;a+=12,k++){
        const [lx,lz]=at(S,a,.9);if(band(lx,lz))continue;
        const [ix,iz]=S.axis==='x'?[0,S.s]:[S.s,0];lamp(lx,lz,ix,iz);
        const [bx,bz]=at(S,a+6,1.6);if(!band(bx,bz)&&a+6<S.a1-3){
          const yaw=S.axis==='x'?0:Math.PI/2,bw=S.axis==='x'?[1.7,.1,.5]:[.5,.1,1.7];
          box(...bw,bx,top+.42,bz,seat);const [kx,kz]=at(S,a+6,1.95);box(...(S.axis==='x'?[1.7,.5,.1]:[.1,.5,1.7]),kx,top+.52,kz,seat);
          for(const o of [-.7,.7]){const [qx,qz]=S.axis==='x'?[bx+o,bz]:[bx,bz+o];box(.08,.42,.4,qx,top,qz,iron);}
          solids.push([bx,bz,S.axis==='x'?.9:.35,S.axis==='x'?.35:.9]);}
        const [fx,fz]=at(S,a+3,3.2);if(!band(fx,fz)&&k%2===0){box(1.4,.45,.7,fx,top,fz,post);solids.push([fx,fz,.75,.4]);
          for(let f=0;f<7;f++)add(new THREE.SphereGeometry(.13,8,6),blooms[(f+k)%blooms.length],[fx-.55+f*.18,top+.55+(f%2)*.05,fz+(f%3-1)*.15]);}
        const [tx,tz]=at(S,a+9,3.1);if(!band(tx,tz)&&k%2===1&&a+9<S.a1-2)tree(tx,tz,.85);
      }
    }
  }

  // --- Liberty Island, in the harbour south of the bridge -----------------------------
  // Out in the harbour, south of the bridge.
  {const x=68,z=150,grass=mat('#5f8f3f',{roughness:.95});
    const isl=new THREE.CylinderGeometry(11,12.5,2.2,40);add(isl,stone,[x,-1.6,z]);add(new THREE.CylinderGeometry(10.6,10.6,.2,40),grass,[x,-.45,z]);
    const star=new THREE.Shape();for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=i%2?5.4:7.6;star[i?'lineTo':'moveTo'](Math.sin(a)*r,Math.cos(a)*r);}
    add(new THREE.ExtrudeGeometry(star,{depth:1.6,bevelEnabled:false}).rotateX(-Math.PI/2),stone,[x,-.35,z]);
    let y=1.25;box(6.4,1.2,6.4,x,y,z,stone);y+=1.2;const ash=mat('#cbbd9c',{map:FACADE.ashlar(),roughness:.9});ash.userData.uvSize=3;box(4.8,7.6,4.8,x,y,z,ash);y+=7.6;box(5.6,.9,5.6,x,y,z,cornice);y+=.9;
    const s=2.6,P=(g,m,[px,py,pz],r=[0,0,0])=>add(g.scale(s,s,s),m,[x+px*s,y+py*s,z+pz*s],r);
    P(new THREE.LatheGeometry([[.7,0],[.62,1.2],[.5,2.6],[.42,3.4],[.3,3.8],[0,3.9]].map(([r,h])=>new THREE.Vector2(r,h)),16),copper,[0,0,0]);
    P(new THREE.SphereGeometry(.32,16,12),copper,[0,4.15,0]);
    P(new THREE.CylinderGeometry(.11,.13,1.7,8).translate(0,.85,0).rotateZ(-.18),copper,[.38,3.4,0]);
    P(new THREE.SphereGeometry(.17,12,8),mat('#ffb547',{emissive:'#ff9a2a',emissiveIntensity:1}),[.68,5.45,0]);
    for(let k=0;k<7;k++){const a=(k-3)*.42;P(new THREE.ConeGeometry(.06,.45,6).translate(0,.22,0).rotateX(Math.cos(a)*.9).rotateZ(-Math.sin(a)*.9),copper,[Math.sin(a)*.3,4.3,Math.cos(a)*.3]);}
    P(new THREE.BoxGeometry(.4,.55,.12).rotateZ(.3),copper,[-.48,2.9,.15]);
    occl(x,z,7,7,y+16,-1);}

  K.finish(root);
  root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});
  let lightTime=0;
  // Ground height at (x, z): the curb top on any sidewalk, promenade or plaza, else the street.
  const inWalk=(w,x,z)=>{
    if(w.plaza){const a=(x-w.P[0])*w.s[0],c=(z-w.P[1])*w.s[1];return a>=0&&c>=0&&a<=w.ro&&c<=w.ro&&Math.hypot(x-w.C[0],z-w.C[1])>=w.ro;}
    if(x<w.x0||x>w.x1||z<w.z0||z>w.z1)return false;if(!w.r)return true;
    const [ra,rb,rc,rd]=w.r,corner=(cx,cz,r)=>Math.hypot(x-cx,z-cz)<=r;
    if(x>w.x1-ra&&z<w.z0+ra)return corner(w.x1-ra,w.z0+ra,ra);if(x>w.x1-rb&&z>w.z1-rb)return corner(w.x1-rb,w.z1-rb,rb);
    if(x<w.x0+rc&&z>w.z1-rc)return corner(w.x0+rc,w.z1-rc,rc);if(x<w.x0+rd&&z<w.z0+rd)return corner(w.x0+rd,w.z0+rd,rd);return true;};
  const walkHeight=(x,z)=>walks.some(w=>inWalk(w,x,z))?CURB:0;
  return {root,solids,occluders,loops,parking,steam,sea:seaTime,walkHeight,phase:()=>phase(lightTime),
    update(dt){lightTime+=dt;const ph=phase(lightTime);for(const a of ['z','x'])for(const c of ['r','y','g'])LIGHT[a][c].emissiveIntensity=ph[a]===c?3.2:0;}};
}
