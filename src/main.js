import { Engine } from './engine.js';
import { Player } from './player.js';

const canvas = document.getElementById('game-canvas');
const player = new Player(0, 0);
const engine = new Engine(canvas, player);

engine.loop();
