import * as THREE from 'three';

// The Tesla Model Y is the supplied studio render, shown exactly as drawn: the
// pixels are never re-lit, tone mapped or resampled by the 3D scene. It is a
// DOM layer above the canvas, pinned to the 3D car's position on the tile.
// The render is one view (front, left side), so its mirror gives the view for a
// car heading the other way; the scene limits steering to those two views.
const IMG={w:1446,h:762};
// Where the car touches the ground, in image pixels, and how many image pixels
// make one world unit at 100%.
const ANCHOR={x:880,y:585},PX_PER_UNIT=415;
const SHADOW={x:-224,y:349};
const v=new THREE.Vector3();

export function createCarSprite(viewport,camera,pose){
  const box=document.createElement('div');box.id='car-sprite';
  Object.assign(box.style,{position:'absolute',left:0,top:0,width:IMG.w+'px',height:IMG.h+'px',transformOrigin:'0 0',pointerEvents:'none',willChange:'transform',zIndex:1});
  const shadow=new Image();shadow.src='/car/model-y-shadow.png';shadow.alt='';
  Object.assign(shadow.style,{position:'absolute',left:SHADOW.x+'px',top:SHADOW.y+'px',mixBlendMode:'multiply'});
  const car=new Image();car.src='/car/model-y.png';car.alt='Tesla Model Y';car.draggable=false;
  Object.assign(car.style,{position:'absolute',left:0,top:0,width:IMG.w+'px',height:IMG.h+'px'});
  box.append(shadow,car);viewport.appendChild(box);
  return function update(){
    const {width,height}=viewport.getBoundingClientRect();
    const p=pose();
    v.set(p.x,.15,p.z).project(camera);
    const sx=(v.x*.5+.5)*width,sy=(1-(v.y*.5+.5))*height;
    const k=width*camera.zoom/(camera.right-camera.left)/PX_PER_UNIT;
    const flip=p.h>Math.PI/4?-1:1;
    box.style.transform=`translate(${sx}px,${sy}px) scale(${flip*k},${k}) translate(${-ANCHOR.x}px,${-ANCHOR.y}px)`;
  };
}
