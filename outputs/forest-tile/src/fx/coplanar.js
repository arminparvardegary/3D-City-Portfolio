import * as THREE from 'three';

// Faces of two different colours lying in exactly the same plane (a sign on a
// wall, trim on a panel, a curb under a sidewalk) fight over which is in front,
// and the winner flips as the camera moves: they flicker. This finds every such
// pair once, after the world is built (a few milliseconds per frame, so the
// game never stutters), and ranks the materials so the smaller one, the detail,
// is always drawn over the larger one (polygon offset). Nothing moves; only the
// draw order of touching faces is fixed.
export function settleCoplanar(root,{eps=.004,minArea=.0025,budgetMs=6,onDone,now=false}={}){
  const meshes=[];root.updateMatrixWorld(true);
  root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.isBatchedMesh&&!o.isSkinnedMesh&&o.geometry?.attributes?.position)meshes.push(o);});
  const buckets=new Map(),area=new Map(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),n=new THREE.Vector3(),e1=new THREE.Vector3(),e2=new THREE.Vector3(),tmp=new THREE.Color();
  const lookOf=(mat,col,i)=>{const base=mat.color?tmp.copy(mat.color):tmp.set(1,1,1);if(col)base.multiply(new THREE.Color(col.getX(i),col.getY(i),col.getZ(i)));return base.getHexString()+(mat.map?'t':'')+(mat.emissiveMap||mat.emissiveIntensity>0&&mat.emissive?.getHex()?'e':'');};
  let mi=0,ti=0;
  function scanSome(){const end=performance.now()+budgetMs;
    while(mi<meshes.length&&performance.now()<end){const o=meshes[mi],g=o.geometry,p=g.attributes.position,col=g.attributes.color,idx=g.index,mats=[].concat(o.material);
      const groups=g.groups.length?g.groups:[{start:0,count:idx?idx.count:p.count,materialIndex:0}];
      for(const gr of groups){const mat=mats[gr.materialIndex]??mats[0];if(!mat||mat.transparent&&!mat.depthWrite)continue;
        for(let i=gr.start;i+2<gr.start+gr.count;i+=3){
          const ia=idx?idx.getX(i):i,ib=idx?idx.getX(i+1):i+1,ic=idx?idx.getX(i+2):i+2;
          a.fromBufferAttribute(p,ia).applyMatrix4(o.matrixWorld);b.fromBufferAttribute(p,ib).applyMatrix4(o.matrixWorld);c.fromBufferAttribute(p,ic).applyMatrix4(o.matrixWorld);
          n.crossVectors(e1.subVectors(b,a),e2.subVectors(c,a));const ar=n.length()/2;if(ar<minArea)continue;n.normalize();
          area.set(mat,(area.get(mat)??0)+ar);
          const ax=Math.abs(n.x)>.999?0:Math.abs(n.y)>.999?1:Math.abs(n.z)>.999?2:-1;if(ax<0)continue;
          const sign=Math.sign(n.getComponent(ax)),plane=a.getComponent(ax),u=(ax+1)%3,v=(ax+2)%3;
          const k=ax+'|'+sign+'|'+Math.floor(plane/eps);let list=buckets.get(k);if(!list)buckets.set(k,list=[]);
          list.push({mat,look:lookOf(mat,col,ia),plane,u0:Math.min(a.getComponent(u),b.getComponent(u),c.getComponent(u)),u1:Math.max(a.getComponent(u),b.getComponent(u),c.getComponent(u)),
            v0:Math.min(a.getComponent(v),b.getComponent(v),c.getComponent(v)),v1:Math.max(a.getComponent(v),b.getComponent(v),c.getComponent(v))});}}
      mi++;}
    if(mi<meshes.length)return now?scanSome():setTimeout(scanSome,0);
    pairUp();}
  // Pairs: same plane (this bucket and the next, so nothing straddles a boundary), overlapping, different looks.
  const beats=new Map();   // mat -> set of mats it must be drawn over
  let keys=null;
  function pairUp(){keys??=[...buckets.keys()];const end=performance.now()+budgetMs;
    while(ti<keys.length&&performance.now()<end){const k=keys[ti++],[ax,sign,q]=k.split('|'),next=buckets.get(ax+'|'+sign+'|'+(+q+1));
      const L=next?buckets.get(k).concat(next):buckets.get(k);if(L.length<2)continue;
      L.sort((p,r)=>p.u0-r.u0);   // sweep along one axis: only faces that overlap there are compared
      for(let i=0;i<L.length;i++){const p=L[i];
        for(let j=i+1;j<L.length&&L[j].u0<p.u1-.01;j++){const r=L[j];if(p.mat===r.mat||p.look===r.look||Math.abs(p.plane-r.plane)>eps)continue;
          if(Math.min(p.u1,r.u1)-Math.max(p.u0,r.u0)>.01&&Math.min(p.v1,r.v1)-Math.max(p.v0,r.v0)>.01){
            const [small,big]=(area.get(p.mat)??0)<=(area.get(r.mat)??0)?[p.mat,r.mat]:[r.mat,p.mat];(beats.get(small)??beats.set(small,new Set()).get(small)).add(big);}}}}
    if(ti<keys.length)return now?pairUp():setTimeout(pairUp,0);
    apply();}
  // Rank: a material is drawn over everything it beats (deepest chain first), a step of one depth unit each.
  function apply(){const rank=new Map(),visiting=new Set();
    const depth=m=>{if(rank.has(m))return rank.get(m);if(visiting.has(m))return 0;visiting.add(m);let d=0;for(const under of beats.get(m)??[])d=Math.max(d,depth(under)+1);visiting.delete(m);rank.set(m,d);return d;};
    for(const m of beats.keys())depth(m);
    // Every pair strictly ordered (a tie would still flicker): raise the detail until it is above.
    for(let pass=0;pass<8;pass++){let moved=false;for(const [small,set] of beats)for(const big of set){const rs=rank.get(small)??0,rb=rank.get(big)??0;if(rs<=rb){rank.set(small,rb+1);moved=true;}}if(!moved)break;}
    let changed=0;for(const m of beats.keys()){const d=rank.get(m)??0;if(d>0){m.polygonOffset=true;m.polygonOffsetFactor=0;m.polygonOffsetUnits=-2*d;m.needsUpdate=true;changed++;}}
    onDone?.({materials:changed,pairs:[...beats.values()].reduce((s,v)=>s+v.size,0)});}
  if(now)scanSome();else setTimeout(scanSome,0);
}
