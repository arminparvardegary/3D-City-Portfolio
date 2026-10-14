// The design system: every colour, light and surface in the world comes from
// these tokens, so the whole map reads as one place with one visual language.
//
// Harbour district: a modern creative village between mountains and the sea,
// rendered close to real: rich natural greens, true grey-brown rock with snow,
// deep blue sea turning turquoise in the shallows, timber, pale concrete and
// reflective glass, bright sun with crisp natural shadows and a real sky for
// reflections. Calm, spacious, premium.
export const THEME=Object.freeze({
  name:'harbour',
  sky:{top:'#a9d8f5',horizon:'#f6f1e7'},
  palette:{
    grass:'#5f9c3b',grassLight:'#78b04e',
    leaves:'#3f8c30',leafLight:'#6eae48',pine:'#1d5a3a',bark:'#6e4a32',
    soil:'#a8c97a',plaster:'#f7f2e8',timber:'#fffaf0',
    roof:'#f0816e',roofLight:'#ff9a86',roofDark:'#8f4a3e',glass:'#8fd2e6',door:'#4f8fb0',
    path:'#efe4cf',stone:'#cfc6b6',parking:'#e8e0d2',trim:'#fffaf0',
    water:'#6fc3e6',gold:'#f2c14e',
    blank:'#dddad4',blankNumber:'#9a958c',tileNumber:'#4f8a3c',
  },
  terrain:{sand:'#ecd6a2',rock:'#8f8981',rockDark:'#6b655e',rockLight:'#bdb6ab',snow:'#ffffff',meadow:'#5c963b',cliff:'#7d776f'},
  water:{deep:'#13679f',shallow:'#2fc3d8',foam:'#ffffff',river:'#3aa6cf',fall:'#eaf7ff'},
  road:{asphalt:'#4a4f58',mark:'#fffbe8',walk:'#ece4d6',curb:'#d8cdbb',driveway:'#e8e0d2',pole:'#3f4a63',housing:'#2f3650',
    red:'#ff4b45',yellow:'#ffc93a',green:'#3fe07a'},
  park:{gravel:'#eee0c2',stone:'#e2d8c6',water:'#6fc3e6',wood:'#c08a5a',iron:'#3f4a5a',lamp:'#fff1c9',lampGlow:'#ffd98a'},
  buildings:{
    glass:'#7cc7dc',frame:'#f6f4ef',roof:'#9aa1a8',ac:'#f7f7f4',wall:'#f3f1ec',window:'#3f8fa8',cream:'#f7ecd8',coral:'#f0816e',door:'#4f8fb0',
    shopWall:'#fff6e8',shopGlass:'#4f9fb8',awnings:['#ff6b5e','#ffc93a','#5ab4f0','#5fcf87'],
    hospital:'#ffffff',cross:'#ff4b45',helipad:'#3b82e0',court:'#ff9f43',courtEdge:'#3aa07a',hoop:'#3f4a5a',rimColor:'#ff6b3d',
    cup:'#7a5340',lid:'#f2ebe0',sleeve:'#f0c27a',plaza:'#ece6dc',
    timber:'#c99466',timberDark:'#9a6a46',concrete:'#ece8e1',greenRoof:'#8fc46c',accent:'#ff8a5c',
  },
  wood:{deck:'#c99a6b',deckDark:'#a77a52',post:'#8a6242'},
  clouds:{color:'#ffffff',shade:.86},
  people:{skin:['#f3d2b8','#e2b48f','#c58c63','#9a6440','#6b4430','#4a2e22'],
    clothes:['#ff6b5e','#4f9fd8','#ffc93a','#5fcf87','#a77be0','#f2f2f2','#2f3650','#ff9f6b','#3fb8a8','#e86fa0']},
  light:{
    sun:{color:'#fff1dc',intensity:3.5,azimuth:-34,elevation:46,softness:13},
    sky:{color:'#bfe0ff',ground:'#9fb57a',intensity:.9},
    fill:{color:'#a9cdff',intensity:.3},
    env:.6,exposure:.96,toneMapping:'aces',
    fog:{enabled:false,color:'#f6f1e7',near:150,far:320},
    ao:{intensity:2.8,radius:.6,falloff:.4,color:'#1f2430'},
    grade:{saturation:.16},
  },
});
