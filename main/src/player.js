import { CONFIG } from './config.js';
import { createCharacterById } from './characters/index.js';

export const createPlayerById = (id, x = 0, y = 0) => {
    return createCharacterById(id, x, y);
};

export class Player {
    constructor(x, y, id = CONFIG.PLAYER_RUNTIME.DEFAULT_CHARACTER_ID) {
        return createPlayerById(id, x, y);
    }
}
