import * as THREE from 'three';
import { TILE } from './units.js';
import { THEME } from './theme.js';

// The world map: GRID.cols x GRID.rows tiles of 100 x 100 design pixels, numbered
// 1..N row by row from the north-west corner (row 1 is the northernmost, -z).
// The house tile sits at GRID.home and keeps its own content; every other tile
// is a plain grey block showing its number, ready to be given its own content.
export const GRID=Object.freeze({cols:9,rows:9,home:{col:4,row:4}});   // a square map, 81 tiles

export const tileNumber=(col,row)=>row*GRID.cols+col+1;
export const tileCell=n=>({col:(n-1)%GRID.cols,row:Math.floor((n-1)/GRID.cols)});
// World centre of a tile; the house tile is at the origin.
export const tileCenter=(col,row)=>[(col-GRID.home.col)*TILE.size,0,(row-GRID.home.row)*TILE.size];
export const HOME_NUMBER=tileNumber(GRID.home.col,GRID.home.row);

// `occupied` lists tile numbers that have their own content: they get no grey
// slab, only a small number in their corner (like the house tile).
export function buildGrid(prep,{occupied=[]}={}){
  const group=new THREE.Group();group.name='tile-grid';
  const {cols,rows}=GRID,n=cols*rows,gap=.12,s=TILE.size;
  const taken=new Set([HOME_NUMBER,...occupied]);

  // Every blank tile is the same grey slab: one instanced draw call for all of them.
  const slabMat=new THREE.MeshStandardMaterial({color:THEME.palette.blank,roughness:.92});prep?.(slabMat);
  const slabs=new THREE.InstancedMesh(new THREE.BoxGeometry(s-gap,TILE.slab,s-gap).translate(0,TILE.slab/2,0),slabMat,n-taken.size);
  const o=new THREE.Object3D();let k=0;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    if(taken.has(tileNumber(c,r)))continue;
    o.position.set(...tileCenter(c,r));o.updateMatrix();slabs.setMatrixAt(k++,o.matrix);
  }
  slabs.receiveShadow=true;slabs.computeBoundingSphere();group.add(slabs);

  // Numbers: one texture over the whole grid, drawn once. The house tile's number
  // sits small in its free south-west corner so it never covers the house.
  const px=128,canvas=document.createElement('canvas');canvas.width=cols*px;canvas.height=rows*px;
  const ctx=canvas.getContext('2d');ctx.textAlign='center';ctx.textBaseline='middle';
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const home=taken.has(tileNumber(c,r));
    ctx.fillStyle=home?THEME.palette.tileNumber:THEME.palette.blankNumber;ctx.font=`600 ${home?18:46}px "DM Sans", Arial, sans-serif`;
    const x=(c+(home?.08:.5))*px,y=(r+(home?.92:.5))*px;
    ctx.fillText(String(tileNumber(c,r)),x+(home?6:0),y);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const labels=new THREE.Mesh(new THREE.PlaneGeometry(cols*s,rows*s).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:false}));
  const [x0,,z0]=tileCenter(0,0),[x1,,z1]=tileCenter(cols-1,rows-1);
  labels.position.set((x0+x1)/2,TILE.slab+.001,(z0+z1)/2);labels.renderOrder=2;group.add(labels);

  const bounds={x0:x0-s/2,x1:x1+s/2,z0:z0-s/2,z1:z1+s/2};
  return {group,bounds,materials:[slabMat]};
}
