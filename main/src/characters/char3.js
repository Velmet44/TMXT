import { CONFIG } from '../config.js';
import { soundManager } from '../SoundManager.js';
import { BaseCharacter } from './baseCharacter.js';

const profileCfg = CONFIG.CHARACTER_PROFILES.char_3;
const upgrades = CONFIG.UPGRADES[profileCfg.upgradeSet] || [];

const castAbility = (slot, player, cfg) => {
    if (slot === 1) {
        const dirX = Math.cos(player.rotation || 0);
        const dirY = Math.sin(player.rotation || 0);
        const distance = cfg.DISTANCE || 200;
        const startX = player.x;
        const startY = player.y;
        player.x += dirX * distance;
        player.y += dirY * distance;
        player.graveTrailActive = {
            x: (startX + player.x) / 2,
            y: (startY + player.y) / 2,
            radius: Math.max(cfg.TRAIL_RADIUS || 48, distance * 0.28),
            damage: cfg.TRAIL_DAMAGE || 50,
            endTime: Date.now() + (cfg.TRAIL_DURATION || 1600),
            lastTick: 0
        };
        if (!soundManager.playSFX('dash', 0.05)) soundManager.playSynth('necro');
        return true;
    }
    if (slot === 2) {
        player.soulVortexActive = {
            center: { x: player.x, y: player.y },
            endTime: Date.now() + (cfg.DURATION || 3000),
            radius: cfg.RADIUS || 220,
            pull: cfg.PULL || 1.8,
            damage: cfg.DAMAGE || 99999,
            lastTick: 0
        };
        if (!soundManager.playSFX('magnet', 0.06)) soundManager.playSynth('necro');
        return true;
    }
    if (slot === 3) {
        player.pendingMeteorRain = {
            count: cfg.METEOR_COUNT || CONFIG.ENGINE.NECROMANCER.METEOR_COUNT_DEFAULT,
            damage: cfg.DAMAGE || 320,
            radius: cfg.RADIUS || CONFIG.ENGINE.NECROMANCER.METEOR_RADIUS,
            impactDelay: cfg.IMPACT_DELAY || CONFIG.ENGINE.NECROMANCER.METEOR_IMPACT_DELAY_MS,
            stagger: cfg.STAGGER || CONFIG.ENGINE.NECROMANCER.METEOR_STAGGER_MS
        };
        if (!soundManager.playSFX('nuke', 0.04)) soundManager.playSynth('necro');
        return true;
    }
    if (slot === 4) {
        player.lichAscendanceActive = {
            endTime: Date.now() + (cfg.DURATION || 7000),
            damageMult: cfg.DAMAGE_MULT || 1.35,
            pierce: cfg.PIERCE || 2,
            lifestealBonus: cfg.LIFESTEAL_BONUS || 0.1,
            splashRadius: cfg.SPLASH_RADIUS || 65
        };
        if (!soundManager.playSFX('invincible', 0.06)) soundManager.playSynth('necro');
        return true;
    }
    return false;
};

const isAbilityActive = (slot, player) => {
    if (slot === 1) return !!player.graveTrailActive;
    if (slot === 2) return !!player.soulVortexActive;
    if (slot === 4) return !!player.lichAscendanceActive;
    return false;
};

const getAbilityHudState = (slot, player, cfg, now) => {
    if (slot === 1 && player.graveTrailActive) {
        const dur = cfg.TRAIL_DURATION || 1;
        return { active: true, remaining: Math.max(0, (player.graveTrailActive.endTime - now) / dur) };
    }
    if (slot === 2 && player.soulVortexActive) {
        const dur = cfg.DURATION || 1;
        return { active: true, remaining: Math.max(0, (player.soulVortexActive.endTime - now) / dur) };
    }
    if (slot === 4 && player.lichAscendanceActive) {
        const dur = cfg.DURATION || 1;
        return { active: true, remaining: Math.max(0, (player.lichAscendanceActive.endTime - now) / dur) };
    }
    return { active: false, remaining: 0 };
};

export const char3Profile = {
    id: profileCfg.id,
    leveling: profileCfg.leveling,
    abilities: profileCfg.abilities,
    upgrades,
    castAbility,
    isAbilityActive,
    getAbilityHudState
};

export class Char3Character extends BaseCharacter {
    constructor(x, y) {
        super(x, y, 'char_3', char3Profile);
    }

    onSpawn() {}
    onUpdateStart() {}
    onUpdateEnd() {}
    onDeath() {}
}
