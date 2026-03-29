import { Engine } from './engine.js';
import { Player } from './player.js';

const init = () => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    const player = new Player(0, 0);
    const engine = new Engine(canvas, player);
    engine.loop();
};

init();
