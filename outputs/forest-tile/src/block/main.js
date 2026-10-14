import { createStage } from '../diorama/stage.js';
import { buildDiorama } from './diorama.js';

// One block on its own page (see diorama/stage.js for the view and light).
window.block=createStage({view:document.getElementById('view'),content:buildDiorama()});
