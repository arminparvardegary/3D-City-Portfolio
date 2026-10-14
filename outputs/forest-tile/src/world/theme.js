// The design system: every colour, light and surface in the world comes from
// these tokens, so each new tile shares the same storybook look automatically.
//
// Storybook: an original style in the spirit of classic animated films. Lush,
// saturated but soft greens; warm golden sunlight; cool sky-blue light filling
// the shadows; cream walls and coral roofs; rounded, friendly forms; a soft sky
// with drifting clouds. Shadows are tinted, never black.
export const THEME=Object.freeze({
  name:'storybook',
  sky:{top:'#bfe3ff',horizon:'#fff4e2'},                 // page background behind the world
  palette:{
    grass:'#8ccf63',grassLight:'#a6dc7c',
    leaves:'#56b850',leafLight:'#8fd66a',pine:'#2f8a5e',bark:'#8a5a3a',
    soil:'#a8c97a',plaster:'#fff3dd',timber:'#fffaf0',
    roof:'#ff6b5e',roofLight:'#ff8a78',roofDark:'#9a4a3a',glass:'#62c6e3',door:'#5f9fc4',
    path:'#f4e4c4',stone:'#d9cbb0',parking:'#ece2d0',trim:'#fffaf0',
    water:'#5fd0f0',gold:'#f2c14e',
    blank:'#dddad4',blankNumber:'#9a958c',tileNumber:'#4f8a3c',
  },
  road:{asphalt:'#4b5068',mark:'#fffbe8',walk:'#f1e7d6',curb:'#e2d6c2',driveway:'#ece2d0',pole:'#3f4a63',housing:'#2f3650',
    red:'#ff4b45',yellow:'#ffc93a',green:'#3fe07a'},
  park:{gravel:'#f4e2bf',stone:'#e9dcc4',water:'#5fd0f0',wood:'#c9824e',iron:'#3f4a63',lamp:'#fff1c9',lampGlow:'#ffd98a'},
  clouds:{color:'#ffffff',shade:.86},
  // Light: golden sun, sky-blue fill from the opposite side, warm bounce from the ground.
  light:{
    sun:{color:'#ffe6bf',intensity:3.15,azimuth:-32,elevation:48,softness:24},
    sky:{color:'#cfe6ff',ground:'#d9c48e',intensity:1.55},
    fill:{color:'#a9cdff',intensity:.75},
    env:.18,exposure:1.04,toneMapping:'aces',
    fog:{enabled:false,color:'#fff4e2',near:150,far:320},
    ao:{intensity:2.1,radius:.5,falloff:.4,color:'#3b2f5c'},   // soft violet contact shade, never black
  },
});
