import {Game} from "./game.js";
import {level1} from "./levels/level1.js";
import {level2} from "./levels/level2.js";
import {level3} from "./levels/level3.js";
import {level4} from "./levels/level4.js";
import {level5} from "./levels/level5.js";
import {level6} from "./levels/level6.js";
import {level7} from "./levels/level7.js";
import {level8} from "./levels/level8.js";
import {level9} from "./levels/level9.js";
import {level10} from "./levels/level10.js";

const canvas = document.getElementsByTagName('canvas')[0];

const levels = [
    level1,
    level2,
    level3,
    level4,
    level5,
    level6,
    level7,
    level8,
    level9,
    level10,
];

const controls = {
    'left': ['arrowLeft', 'keyA'],
    'right': ['arrowRight', 'keyD'],
    'up': ['arrowUp', 'keyW'],
    'down': ['arrowDown', 'S'],
    'pause': ['space', 'enter'],
};

new Game(canvas, levels, controls);
