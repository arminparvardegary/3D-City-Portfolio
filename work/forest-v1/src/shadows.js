import { ShaderChunk } from 'three';

// A fixed 32-tap disk gives soft daylight without temporal noise or a costly
// blocker-search pass. Radius remains adjustable on the directional light.
export function softenShadows(material) {
  material.onBeforeCompile=shader=>{
    const source=ShaderChunk.shadowmap_pars_fragment;
    const start=source.indexOf('#if defined( SHADOWMAP_TYPE_PCF )');
    const end=source.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )',start);
    if(start<0||end<0)return;
    const filter=`#if defined( SHADOWMAP_TYPE_PCF )
      vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
      shadow = 0.0;
      for ( int i = 0; i < 32; i ++ ) {
        float fi = float( i ) + 0.5;
        float angle = fi * 2.39996323;
        float radius = sqrt( fi / 32.0 ) * shadowRadius;
        vec2 offset = vec2( cos( angle ), sin( angle ) ) * radius * texelSize;
        shadow += texture2DCompare( shadowMap, shadowCoord.xy + offset, shadowCoord.z );
      }
      shadow /= 32.0;
    `;
    shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',source.slice(0,start)+filter+source.slice(end));
  };
  material.customProgramCacheKey=()=> 'soft-daylight-32-v1';
}
