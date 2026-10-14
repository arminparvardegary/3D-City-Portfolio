import { ShaderChunk } from 'three';

// Soft daylight shadows: a fixed Vogel disk of N taps (set by the quality
// preset) gives soft edges without temporal noise or a blocker search. The
// radius stays adjustable on the directional light.
let taps=32;
const patched=new Set();
export function setShadowTaps(n){
  if(n===taps)return;taps=n;
  for(const m of patched)m.needsUpdate=true;   // recompiles once, on preset change only
}

function filter(){
  return `#if defined( SHADOWMAP_TYPE_PCF )
      vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
      shadow = 0.0;
      for ( int i = 0; i < ${taps}; i ++ ) {
        float fi = float( i ) + 0.5;
        float angle = fi * 2.39996323;
        float radius = sqrt( fi / ${taps}.0 ) * shadowRadius;
        vec2 offset = vec2( cos( angle ), sin( angle ) ) * radius * texelSize;
        shadow += texture2DCompare( shadowMap, shadowCoord.xy + offset, shadowCoord.z );
      }
      shadow /= ${taps}.0;
    `;
}

// Adds the soft filter to a material, keeping any shader hook it already has
// (for example the grass wind), so the two compose instead of replacing each other.
export function softenShadows(material){
  if(patched.has(material))return;patched.add(material);
  const previous=material.onBeforeCompile?.bind(material),prevKey=material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
    previous?.(shader,renderer);
    const source=ShaderChunk.shadowmap_pars_fragment;
    const start=source.indexOf('#if defined( SHADOWMAP_TYPE_PCF )');
    const end=source.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )',start);
    if(start<0||end<0)return;
    shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',source.slice(0,start)+filter()+source.slice(end));
  };
  material.customProgramCacheKey=()=>`soft-${taps}|${prevKey?prevKey():''}`;
}
