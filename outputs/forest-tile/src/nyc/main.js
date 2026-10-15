import { createStage } from '../diorama/stage.js';
import { buildCity } from './city.js';
import { showWeather } from './weather.js';

// New York on its own page: the diorama on the shared stage, the title with
// today's date and the live weather above it. Taxis drive and clouds float.
const city = buildCity();
window.nyc = createStage({
  view: document.getElementById('view'),
  content: city.root,
  fit: 84,
  look: [0, 11, 0],
  floor: -4,
  shadow: 62,
  sun: [-66, 90, 42],
  aoRadius: 1.6,
  update: dt => city.update(dt),
});
showWeather(document.querySelector('.city'));
