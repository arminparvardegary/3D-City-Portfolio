import * as THREE from 'three';
import { VEHICLES, buildVehicle, disposeVehicle } from '../vehicles.js';

// Bot traffic on the road lanes. Each car follows its lane, keeps a safe gap to
// the car ahead (including the visitor's car), and obeys the lights: it stops
// behind the line on red, stops on yellow when it comfortably can, and pulls
// away on green. Cars leaving the end of the road re-enter at the start.
// Intelligent Driver Model: smooth, collision free following and stopping.
const CRUISE=[2.6,3.4],ACCEL=2.2,COMFORT=3.0,HARD=9,MIN_GAP=1.0,LINE_GAP=.15,HEADWAY=.9,STEP=1/60;
const FLEET=['Hatchback','Taxi','SUV','Box truck','Sedan','Minivan','Coupe','Wagon','Ambulance','Dump truck'];

export function createTraffic({parent,m,prep,lanes,setLights,player,perLane=4,edge}){
  const cars=[];let clock=0,acc=0,state=setLights(0);
  // Brake lights are per car, so each bot gets its own lamp materials.
  const own=()=>{const t=m.tailLight.clone(),h=m.headlight.clone();prep?.(t);prep?.(h);return {...m,tailLight:t,headlight:h};};
  lanes.forEach((lane,li)=>{
    const span=lane.to-lane.from;
    for(let i=0;i<perLane;i++){
      const name=FLEET[(li*perLane+i)%FLEET.length],mats=own();
      const parts=buildVehicle(VEHICLES.findIndex(v=>v.name===name),parent,mats,prep);
      parts.rig.rotation.y=lane.dir>0?Math.PI/2:-Math.PI/2;
      cars.push({lane,parts,mats,s:lane.from+span*(i+.15+li*.12)/perLane,v:0,len:parts.length,
        cruise:CRUISE[0]+((i*7+li*3)%5)/4*(CRUISE[1]-CRUISE[0]),pitch:0,tail:.45});
    }
  });
  // Nearest car ahead in the same lane: its gap and speed.
  const ahead=(c)=>{let gap=Infinity,v=0;for(const o of cars)if(o!==c&&o.lane===c.lane&&o.s>c.s){const g=o.s-o.len/2-(c.s+c.len/2);if(g<gap){gap=g;v=o.v;}}return {gap,v};};
  // IDM acceleration toward an obstacle `gap` ahead moving at `vLead` (Infinity gap = free road).
  const idm=(c,gap,vLead,s0)=>{
    const free=1-(c.v/c.cruise)**4;if(!isFinite(gap))return ACCEL*free;
    const want=s0+Math.max(0,c.v*HEADWAY+c.v*(c.v-vLead)/(2*Math.sqrt(ACCEL*COMFORT)));
    return ACCEL*(free-(want/Math.max(gap,.01))**2);
  };
  function step(dt){
    const p=player();
    for(const c of cars){
      const L=c.lane,front=c.s+c.len/2;
      const lead=ahead(c);let a=idm(c,lead.gap,lead.v,MIN_GAP),gap=lead.gap;
      // The visitor's car, when it is in this lane ahead of us (treated as stopped, to be safe).
      const ps=L.dir*p.x;
      if(Math.abs(p.z-L.z)<1.7&&ps>c.s-.5){const g=ps-front-p.len/2;gap=Math.min(gap,g);a=Math.min(a,idm(c,g,0,MIN_GAP));}
      // Lights: red always stops at the line; yellow stops only if that is comfortable.
      // A car whose nose is already well over the line keeps going through the junction.
      const toLine=L.stop-front;
      if(toLine>-.3){
        const mustStop=state.road==='red'||state.road==='yellow'&&toLine>c.v*c.v/(2*COMFORT)+.2;
        if(mustStop){gap=Math.min(gap,toLine);a=Math.min(a,idm(c,Math.max(toLine,.01),0,LINE_GAP));}
      }
      a=THREE.MathUtils.clamp(a,-HARD,ACCEL);
      c.v=Math.max(0,c.v+a*dt);c.s+=c.v*dt;c.a=a;
      // Past the end of the road: re-enter at the start when there is room.
      if(c.s>L.to){
        const last=Math.min(...cars.filter(o=>o.lane===L&&o!==c).map(o=>o.s-o.len/2));
        if(last-L.from>c.len+3){c.s=L.from;c.v=c.cruise*.8;}else c.s=L.to;
      }
      for(const w of c.parts.wheels)w.rotation.x+=c.v*dt/c.parts.wheelR;
      c.pitch+=(-THREE.MathUtils.clamp(a*.008,-.035,.035)-c.pitch)*(1-Math.exp(-dt*7));
      c.tail+=((a<-1.2||c.v<.05&&gap<3?1.9:.45)-c.tail)*(1-Math.exp(-dt*12));
    }
  }
  function place(){
    for(const c of cars){
      const L=c.lane,x=L.dir*c.s;
      // Cars grow in and shrink out at the very ends of the road, so they never pop.
      const k=THREE.MathUtils.clamp(Math.min(c.s-L.from,L.to-c.s)/1.2,0,1);
      c.parts.rig.position.set(x,.135,L.z);c.parts.rig.scale.setScalar(Math.max(k,1e-3));c.parts.rig.visible=k>0;
      c.parts.car.rotation.x=c.pitch;c.mats.tailLight.emissiveIntensity=c.tail;c.mats.headlight.emissiveIntensity=.9;
    }
  }
  return {
    update(dt){
      clock+=dt;state=setLights(clock);acc+=Math.min(dt,.1);
      while(acc>=STEP){step(STEP);acc-=STEP;}
      place();return true;
    },
    // Circles along each bot, for the visitor's car to collide with.
    obstacles(){
      const out=[];
      for(const c of cars){if(!c.parts.rig.visible)continue;const x=c.lane.dir*c.s,r=c.parts.width/2+.05,k=Math.max(0,c.len/2-r);
        for(const o of [-k,0,k])out.push([x+c.lane.dir*o,c.lane.z,r]);}
      return out;
    },
    get state(){return state;},
    get cars(){return cars;},
    dispose(){for(const c of cars)disposeVehicle(c.parts,c.mats);},
  };
}
