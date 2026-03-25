import { char1Profile } from './char1.js';
import { char2Profile } from './char2.js';

const characterProfiles = [char1Profile, char2Profile];

export const getCharacterProfileById = (id) => {
    return characterProfiles.find((c) => c.id === id) || characterProfiles[0];
};
