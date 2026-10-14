// Google Analytics 4 and Google Tag Manager. Each loads only when its ID is set
// in .env (VITE_GA_ID = G-..., VITE_GTM_ID = GTM-...), so local work and forks
// send nothing. track() sends one event to whichever is on.
const GA=import.meta.env.VITE_GA_ID,GTM=import.meta.env.VITE_GTM_ID;
const load=src=>{const s=document.createElement('script');s.async=true;s.src=src;document.head.append(s);};

export function startAnalytics(){
  window.dataLayer=window.dataLayer||[];
  if(GTM){window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});load(`https://www.googletagmanager.com/gtm.js?id=${GTM}`);}
  if(GA){window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config',GA,{anonymize_ip:true});load(`https://www.googletagmanager.com/gtag/js?id=${GA}`);}
}

export function track(name,params={}){
  if(GA)window.gtag?.('event',name,params);
  if(GTM)window.dataLayer?.push({event:name,...params});
}
