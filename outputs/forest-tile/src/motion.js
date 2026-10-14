// Shared motion helpers and the feel constants. Every smoothing in the project
// uses damp(), so it behaves the same at any frame rate; every simulation runs
// on a fixed step. FEEL is read live, so the dev panel can tune it while driving.
export const lerp=(a,b,t)=>a+(b-a)*t;
export const damp=(a,b,lambda,dt)=>lerp(a,b,1-Math.exp(-lambda*dt));
export const dampAngle=(a,b,lambda,dt)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*(1-Math.exp(-lambda*dt));
export const lerpAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

export const STEP=1/120,MAX_FRAME=.1;

// A fixed timestep clock: advance(dt, fn) runs fn(STEP) as many times as the
// elapsed time allows; alpha is how far the display sits between the last two
// states. reset() drops any backlog (after the tab was hidden), so nothing jumps.
export function fixedClock(step=STEP){
  let acc=0;
  return {
    advance(dt,fn){acc+=Math.min(Math.max(dt,0),MAX_FRAME);let n=0;while(acc>=step){fn(step);acc-=step;n++;}return n;},
    get alpha(){return acc/step;},
    reset(){acc=0;},
  };
}

// A critically damped spring that is exact for any dt (no overshoot, never
// unstable): moves `s.x` toward `goal` with velocity `s.v` over about `time` s.
export function spring(s,goal,time,dt){
  const w=2/Math.max(time,1e-4),x=w*dt,e=1/(1+x+.48*x*x+.235*x*x*x);
  const d=s.x-goal,t=(s.v+w*d)*dt;s.v=(s.v-w*t)*e;s.x=goal+(d+t)*e;return s.x;
}

export const FEEL={
  car:{maxSpeed:9.6,maxReverse:3,engine:8.4,brake:12,coast:1.4,drag:.03,grip:12,steerIn:4.2,steerOut:6.5,handGrip:.35,handSwing:1.6},
  // Body on springs: stiffness (1/s²) and damping (1/s). Damping under 2·√stiffness
  // gives a small, weighty overshoot.
  suspension:{stiffness:85,damping:10,pitch:.0065,roll:.005,maxPitch:.055,maxRoll:.065,bump:.06},
  drift:{slip:.55,markLife:7,markWidth:.2,dust:.6},
  camera:{follow:.32,lookAhead:.42,speedZoomOut:.16,panGlide:3.2,zoomGlide:5,shake:.35,shakeDecay:2.6},
  props:{restDelay:4,resetTime:1.6},
  // Chase camera (New York): distance behind, height above, how far ahead it looks,
  // how quickly it swings round after the car, pull back per unit of speed,
  // smoothing time, field of view and how much it widens at top speed.
  chase:{distance:7.5,height:3,lookAhead:4,turnLag:3.6,speedPull:.22,follow:.14,fov:58,fovBoost:12},
};
