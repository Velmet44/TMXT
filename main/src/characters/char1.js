import { CONFIG } from '../config.js';
import { soundManager } from '../SoundManager.js';
import { BaseCharacter } from './baseCharacter.js';

const profileCfg = CONFIG.CHARACTER_PROFILES.char_1;
const upgrades = CONFIG.UPGRADES[profileCfg.upgradeSet] || [];

const castAbility = (slot, player, cfg) => {
    if (slot === 1) {
        const dur = (cfg.DURATION || player.chargeupDurationBase) * (player.chargeupDurationMult || 1);
        player.isChargedUp = true;
        player.chargeUpEndTime = Date.now() + dur;
        if (!soundManager.playSFX('charge', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('crit');
        return true;
    }
    if (slot === 2) {
        const invDur = (cfg.DURATION || player.invincibilityDurationBase) * (player.invincibilityDurationMult || 1);
        player.isInvincible = true;
        player.invincibilityEndTime = Date.now() + invDur;
        if (!soundManager.playSFX('invincible', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('magnet');
        return true;
    }
    if (slot === 3) {
        player.pendingNuke = {
            damage: cfg.DAMAGE ?? CONFIG.ENGINE.NUKE.DEFAULT_DAMAGE,
            shake: cfg.SCREEN_SHAKE ?? CONFIG.ENGINE.NUKE.DEFAULT_SHAKE,
            flash: cfg.FLASH_ALPHA ?? CONFIG.ENGINE.NUKE.DEFAULT_FLASH
        };
        return true;
    }
    if (slot === 4) {
        const now = Date.now();
        player.zeroFrameActive = {
            endTime: now + cfg.DURATION,
            radius: cfg.RADIUS,
            enemySpeedMult: cfg.ENEMY_SPEED_MULT,
            enemyProjSpeedMult: cfg.ENEMY_PROJ_SPEED_MULT,
            playerProjSpeedMult: cfg.PLAYER_PROJ_SPEED_MULT
        };
        if (!soundManager.playSFX('magnet', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('magnet');
        return true;
    }
    return false;
};

const isAbilityActive = (slot, player) => {
    if (slot === 1) return player.isChargedUp;
    if (slot === 2) return player.isInvincible;
    if (slot === 4) return !!player.zeroFrameActive;
    return false;
};

const getAbilityHudState = (slot, player, cfg, now) => {
    if (slot === 1 && player.isChargedUp) {
        const dur = (cfg.DURATION || player.chargeupDurationBase) * (player.chargeupDurationMult || 1);
        return { active: true, remaining: Math.max(0, (player.chargeUpEndTime - now) / dur) };
    }
    if (slot === 2 && player.isInvincible) {
        const dur = (cfg.DURATION || player.invincibilityDurationBase) * (player.invincibilityDurationMult || 1);
        return { active: true, remaining: Math.max(0, (player.invincibilityEndTime - now) / dur) };
    }
    if (slot === 4 && player.zeroFrameActive) {
        return { active: true, remaining: Math.max(0, (player.zeroFrameActive.endTime - now) / (cfg.DURATION || 1)) };
    }
    return { active: false, remaining: 0 };
};

export const char1Profile = {
    id: profileCfg.id,
    leveling: profileCfg.leveling,
    abilities: profileCfg.abilities,
    upgrades,
    castAbility,
    isAbilityActive,
    getAbilityHudState
};

export class Char1Character extends BaseCharacter {
    constructor(x, y) {
        super(x, y, 'char_1', char1Profile);
    }

    onSpawn() {}
    onUpdateStart() {}
    onUpdateEnd() {}
    onDeath() {}
}
