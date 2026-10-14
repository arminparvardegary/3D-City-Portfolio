// One place for everything that trades looks for speed. A preset is chosen
// automatically from the device, can be forced with ?quality=high|balanced|performance
// (or from the developer panel), and the render scale adapts within a preset.

// Measured on the full harbour district at 1280 x 800 (Apple M4, GPU bound):
// High ~14 ms (70 fps), Balanced ~8 ms (120 fps), Performance ~4 ms.
export const PRESETS={
  high:{label:'High',maxDpr:1.5,minScale:.75,msaa:4,shadowMap:2048,shadowTaps:16,
    ao:{enabled:true,halfRes:true,aoSamples:12,denoiseSamples:6,denoiseIterations:1},decor:1},
  balanced:{label:'Balanced',maxDpr:1.25,minScale:.7,msaa:2,shadowMap:2048,shadowTaps:12,
    ao:{enabled:true,halfRes:true,aoSamples:8,denoiseSamples:4,denoiseIterations:1},decor:.65},
  performance:{label:'Performance',maxDpr:1,minScale:.65,msaa:0,shadowMap:1024,shadowTaps:8,
    ao:{enabled:false,halfRes:true,aoSamples:8,denoiseSamples:4,denoiseIterations:1},decor:.3},
};
export const ORDER=['high','balanced','performance'];

// A first guess from what the device reports. Integrated mobile GPUs, few CPU
// cores or reduced data start lower; the frame monitor refines it at runtime.
export function detectQuality(renderer){
  const forced=new URLSearchParams(location.search).get('quality');
  if(forced&&PRESETS[forced])return {preset:forced,reason:'url'};
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const gpu=(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'')||'';
  const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||navigator.maxTouchPoints>1&&/Mac/.test(navigator.platform);
  const cores=navigator.hardwareConcurrency||4,saveData=navigator.connection?.saveData;
  const weakGpu=/Mali|Adreno [1-5]\d\d|PowerVR|Intel\(R\) (HD|UHD) Graphics [1-6]\d\d|SwiftShader|llvmpipe/i.test(gpu);
  const strongGpu=/Apple M\d|NVIDIA|GeForce|RTX|Radeon (RX|Pro)|Intel\(R\) Arc/i.test(gpu);
  let preset='balanced';
  if(saveData||weakGpu||cores<=2)preset='performance';
  else if(strongGpu&&!mobile)preset='high';
  else if(mobile)preset=cores>=6?'balanced':'performance';
  return {preset,reason:'auto',gpu};
}

// Watches real frame intervals while the scene is animating. Render scale steps
// down in small increments when frames are slow, back up when there is headroom,
// with a cool-down so the image never pumps. If the lowest scale is still slow,
// the preset steps down once (never automatically up, to avoid flip-flopping).
export class FrameMonitor{
  constructor({onScale,onPreset}){
    this.onScale=onScale;this.onPreset=onPreset;this.scale=1;this.minScale=.7;
    this.samples=[];this.last=0;this.cooldownUntil=0;this.slowWindows=0;this.fastWindows=0;this.auto=true;
  }
  reset(minScale){this.minScale=minScale;this.scale=1;this.samples=[];this.slowWindows=this.fastWindows=0;this.cooldownUntil=performance.now()+2000;}
  // Call once per rendered frame with the rAF timestamp; `animating` is false for
  // on-demand frames, which are not representative of sustained load.
  frame(time,animating){
    const dt=time-this.last;this.last=time;
    if(!animating||dt>250){this.samples.length=0;return;}
    this.samples.push(dt);
    if(this.samples.length<90||time<this.cooldownUntil)return;
    const sorted=[...this.samples].sort((a,b)=>a-b),median=sorted[sorted.length>>1];this.samples.length=0;
    if(median>19.5){this.slowWindows++;this.fastWindows=0;}else if(median<15){this.fastWindows++;this.slowWindows=0;}else{this.slowWindows=this.fastWindows=0;}
    if(this.slowWindows>=2){
      this.slowWindows=0;this.cooldownUntil=time+3000;
      if(this.scale>this.minScale+1e-3){this.scale=Math.max(this.minScale,+(this.scale-.1).toFixed(2));this.onScale(this.scale);}
      else if(this.auto)this.onPreset();
    }else if(this.fastWindows>=4&&this.scale<1){
      this.fastWindows=0;this.cooldownUntil=time+5000;this.scale=Math.min(1,+(this.scale+.05).toFixed(2));this.onScale(this.scale);
    }
  }
}
