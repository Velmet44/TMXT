import { Char1Character } from './char1.js';
import { Char2Character } from './char2.js';

const characterCtorById = {
    1: Char1Character,
    2: Char2Character
};

export const createCharacterById = (id, x, y) => {
    const Ctor = characterCtorById[id] || Char1Character;
    return new Ctor(x, y);
};
