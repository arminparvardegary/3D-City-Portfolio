import * as THREE from 'three';
import { G,HALF,LANE,network,bridgeHeight,CORNER_R } from './layout.js';
import { TYPES, createFleet } from './carfamily.js';
import { dampAngle } from '../../motion.js';

// Traffic that lives on the road network: about twenty cars of every type
// (sports cars, coupes, saloons, hatchbacks, city cars, estates, SUVs, vans,
// pickups, taxis, a police car), each with its own colour and cruising speed.
// Every car drives its lane on the right, chooses its way a little before each
// crossing, slows for the turn and follows a smooth curve through it, waits at
// red lights and keeps its distance from the car ahead (yours too). Cars never
// appear or vanish.
const STOP=HALF+6.1,ACCEL=3,BRAKE=7.5,TURN_SPEED=3.6;
const MIX=['sedan','sedan','taxi','taxi','taxi','suv','suv','hatch','hatch','city','wagon','van','pickup','pickup','coupe','sports','police','sedan','suv','taxi'];

export function createTraffic({phase,player,prep,count=MIX.length,parked=[],seed=3}){
  const {edges}=network();
  let r=seed;const rand=()=>((r=(r*16807)%2147483647)/2147483647);
  const cars=Array.from({length:count},(_,i)=>{const type=MIX[i%MIX.length],T=TYPES[type];return {type,color:T.colors[Math.floor(rand()*T.colors.length)],cruise:T.speed*(.9+rand()*.2),len:T.L};});
  // Parked cars along the curbs: the same family, drawn in the same batches, never moving.
  const PARKED=['sedan','suv','hatch','city','wagon','coupe','van','pickup','sedan','taxi','suv'];
  const still=parked.map((p,i)=>{const type=PARKED[Math.floor(rand()*PARKED.length)],T=TYPES[type];return {...p,type,color:T.colors[Math.floor(rand()*T.colors.length)],len:T.L};});
  const fleet=createFleet({cars:[...cars,...still],prep});
  still.forEach((p,i)=>fleet.set(count+i,p.x,G,p.z,p.h));
  const height=e=>e.kind==='bridge'?bridgeHeight:()=>0;
  // A lane: from just after the start crossing to just before the end one.
  function lane(e){const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z,len=Math.hypot(dx,dz),fx=dx/len,fz=dz/len,rx=-fz,rz=fx;
    const s0=e.a.degree>2?STOP:e.a.corner?CORNER_R:HALF+1,s1=len-(e.b.degree>2?STOP:e.b.corner?CORNER_R:HALF+1);
    return {e,fx,fz,len:s1-s0,x0:e.a.x+fx*s0+rx*LANE,z0:e.a.z+fz*s0+rz*LANE,axis:Math.abs(fx)>.5?'x':'z',light:e.b.degree>2};}
  // The way through a crossing: a quadratic curve from the end of one lane to the start of the next.
  function turn(L1,L2){const p0=[L1.x0+L1.fx*L1.len,L1.z0+L1.fz*L1.len],p2=[L2.x0,L2.z0],n=L1.e.b;
    const straight=Math.abs(L1.fx*L2.fx+L1.fz*L2.fz)>.9,c=straight?[(p0[0]+p2[0])/2,(p0[1]+p2[1])/2]:[n.x-L1.fz*LANE-L2.fz*LANE,n.z+L1.fx*LANE+L2.fx*LANE];
    const pts=[];for(let i=0;i<=32;i++){const t=i/32,a=(1-t)*(1-t),b=2*(1-t)*t,d=t*t;pts.push([a*p0[0]+b*c[0]+d*p2[0],a*p0[1]+b*c[1]+d*p2[1]]);}
    const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
    return {pts,cum,len:cum.at(-1),straight};}
  const pickNext=e=>{const opts=e.b.out.filter(o=>o.b!==e.a);return opts.length?opts[Math.floor(rand()*opts.length)]:e.b.out[0];};
  // Start each car on its own lane, spread out.
  const roads=edges.filter(e=>e.kind==='road'),state=[];
  for(let i=0;i<count;i++){let e;do{e=roads[Math.floor(rand()*roads.length)];}while(state.some(t=>t.L.e===e));
    const L=lane(e);state.push({...cars[i],id:i,wait:0,L,s:L.len*(.15+rand()*.6),v:cars[i].cruise*.5,turn:null,ts:0,nextE:null,x:0,y:G,z:0,h:0,hr:null});}
  // Point and heading at distance d along the current piece (lane or turn).
  function pointAt(t,d,out){
    if(t.turn){const {pts,cum,len}=t.turn,dd=Math.min(Math.max(d,0),len-1e-4);let i=1;while(cum[i]<dd)i++;const f=(dd-cum[i-1])/(cum[i]-cum[i-1]),a=pts[i-1],b=pts[i];out[0]=a[0]+(b[0]-a[0])*f;out[1]=a[1]+(b[1]-a[1])*f;out[2]=G;return;}
    const L=t.L;out[0]=L.x0+L.fx*d;out[1]=L.z0+L.fz*d;out[2]=G+height(L.e)(out[0]);
  }
  const p=[0,0,0],ahead=[0,0,0];
  function place(t,dt){
    const d=t.turn?t.ts:t.s;pointAt(t,d,p);t.x=p[0];t.z=p[1];t.y=p[2];
    // Heading: toward a point a little ahead on the path, so turns rotate smoothly.
    const look=1.4,lim=t.turn?t.turn.len:t.L.len;
    if(d+look<=lim)pointAt(t,d+look,ahead);else if(t.turn){const L2=lane(t.nextE);ahead[0]=L2.x0+L2.fx*(d+look-lim);ahead[1]=L2.z0+L2.fz*(d+look-lim);}
    else if(t.nextE){const L2=lane(t.nextE),tr=t.pendingTurn??(t.pendingTurn=turn(t.L,L2));const k=Math.min(d+look-lim,tr.len-1e-4);let i=1;while(tr.cum[i]<k)i++;const f=(k-tr.cum[i-1])/(tr.cum[i]-tr.cum[i-1]);ahead[0]=tr.pts[i-1][0]+(tr.pts[i][0]-tr.pts[i-1][0])*f;ahead[1]=tr.pts[i-1][1]+(tr.pts[i][1]-tr.pts[i-1][1])*f;}
    else{ahead[0]=t.x+t.L.fx;ahead[1]=t.z+t.L.fz;}
    const want=Math.atan2(ahead[0]-t.x,ahead[1]-t.z);t.hr=t.hr===null?want:dampAngle(t.hr,want,14,dt||1);t.h=t.hr;
  }
  state.forEach(t=>place(t,0));
  // Free road ahead: other cars (and yours) in front, close to this car's line.
  function gapAhead(t){
    const fx=Math.sin(t.h),fz=Math.cos(t.h);let gap=Infinity;
    const check=(x,z,y,len)=>{const dx=x-t.x,dz=z-t.z,along=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);if(along>0&&along<18&&side<1.6&&Math.abs(y-t.y)<2)gap=Math.min(gap,along-(len+t.len)/2-1.2);};
    for(const o of state)if(o!==t)check(o.x,o.z,o.y,o.len);
    const pl=player();if(pl)check(pl.x,pl.z,pl.y??G,3.7);return gap;
  }
  // A point d ahead along this car's own path: its lane, then the turn, then the next lane.
  const fp=[0,0,0];
  function futurePoint(t,d){
    const lim=t.turn?t.turn.len:t.L.len,cur=t.turn?t.ts:t.s;
    if(cur+d<=lim){pointAt(t,cur+d,fp);return fp;}
    let k=cur+d-lim;
    const tr=t.turn?null:(t.pendingTurn??(t.nextE?t.pendingTurn=turn(t.L,lane(t.nextE)):null));
    if(tr&&k<tr.len){let i=1;while(tr.cum[i]<k)i++;const f=(k-tr.cum[i-1])/(tr.cum[i]-tr.cum[i-1]);fp[0]=tr.pts[i-1][0]+(tr.pts[i][0]-tr.pts[i-1][0])*f;fp[1]=tr.pts[i-1][1]+(tr.pts[i][1]-tr.pts[i-1][1])*f;fp[2]=G;return fp;}
    if(tr)k-=tr.len;const L2=t.nextE?lane(t.nextE):t.L;fp[0]=L2.x0+L2.fx*k;fp[1]=L2.z0+L2.fz*k;fp[2]=t.y;return fp;
  }
  // Is something on this car's path in the next few metres? Your car always has
  // way; between two traffic cars that would meet, the one already ahead goes,
  // and a car that has waited long creeps on, so they never lock each other.
  function pathBlock(t){
    let near=Infinity;
    const others=[];const pl=player();if(pl)others.push({x:pl.x,z:pl.z,y:pl.y??G,len:3.7,h:pl.h??0,you:true});
    for(const o of state)if(o!==t)others.push(o);
    for(let d=1.5;d<=8;d+=1.3){const P=futurePoint(t,d);
      for(const o of others){if(Math.abs((o.y??G)-P[2])>2)continue;
        const ox=Math.sin(o.h),oz=Math.cos(o.h);
        for(const k of [-.3,0,.3]){const cx=o.x+ox*k*o.len,cz=o.z+oz*k*o.len;if(Math.hypot(P[0]-cx,P[1]-cz)<1.7){
          if(!o.you){const fx=Math.sin(t.h),fz=Math.cos(t.h),ahead=(o.x-t.x)*fx+(o.z-t.z)*fz;
            const mutual=(t.x-o.x)*ox+(t.z-o.z)*oz>0;if(mutual&&ahead<2&&t.id<o.id)continue;if(t.wait>5)continue;}
          near=Math.min(near,d);break;}}}
      if(near<Infinity)break;}
    return near;
  }
  function update(dt){
    const ph=phase();
    for(const t of state){
      let want=t.cruise;
      const blockAt=pathBlock(t);if(blockAt<Infinity)want=Math.min(want,Math.max(0,(blockAt-2.4)*.9));
      if(!t.turn){const left=t.L.len-t.s;
        // Choose the way ahead early, and slow down for a turn.
        if(left<16&&!t.nextE){t.nextE=pickNext(t.L.e);t.pendingTurn=turn(t.L,lane(t.nextE));}
        if(t.pendingTurn&&!t.pendingTurn.straight&&left<14)want=Math.min(want,TURN_SPEED+left*.3);
        // Red or yellow: stop at the line.
        if(t.L.light&&ph[t.L.axis]!=='g'&&left>-.2&&left<16)want=Math.min(want,Math.max(0,(left-.5)*.8));}
      else if(!t.turn.straight)want=Math.min(want,TURN_SPEED);
      const gap=gapAhead(t);if(gap<16)want=Math.min(want,Math.max(0,gap*.75));
      t.v+=THREE.MathUtils.clamp(want-t.v,-BRAKE*dt,ACCEL*dt);t.v=Math.max(0,t.v);
      // Waiting (not at a red light) counts up; moving resets it.
      t.wait=t.v<.15?(t.wait??0)+dt:0;
      const step=t.v*dt;
      if(t.turn){t.ts+=step;if(t.ts>=t.turn.len){const over=t.ts-t.turn.len;t.L=lane(t.nextE);t.s=over;t.turn=null;t.nextE=null;t.pendingTurn=null;}}
      else{t.s+=step;if(t.s>=t.L.len){if(!t.nextE){t.nextE=pickNext(t.L.e);t.pendingTurn=turn(t.L,lane(t.nextE));}t.turn=t.pendingTurn;t.ts=t.s-t.L.len;}}
      place(t,dt);
    }
    state.forEach((t,i)=>fleet.set(i,t.x,t.y,t.z,t.h));
  }
  update(0);
  // Circles your car bumps into (world units), with the height of each car.
  // Parked cars are two circles each (front and back), at street level.
  // Each moving car is three circles as wide as the car, nose to tail, so a
  // near miss is a miss and a bumper hit is a hit.
  const half=t=>(TYPES[t.type]?.W??1.66)/2,circles=[...state.flatMap(()=>[[0,0,1,0],[0,0,1,0],[0,0,1,0]]),...still.flatMap(p=>[-1,1].map(k=>[p.x+Math.sin(p.h)*k*1.1,p.z+Math.cos(p.h)*k*1.1,.9,0]))];
  return {root:fleet.root,update,cars:state,obstacles(){state.forEach((t,i)=>{const r=half(t),k=Math.max(0,(t.len??4)/2-r),fx=Math.sin(t.h),fz=Math.cos(t.h);for(let j=0;j<3;j++){const c=circles[i*3+j],o=(j-1)*k;c[0]=t.x+fx*o;c[1]=t.z+fz*o;c[2]=r;c[3]=t.y-G;}});return circles;}};
}
