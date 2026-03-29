import { CONFIG } from '../config.js';
import { soundManager } from '../SoundManager.js';
import { BaseCharacter } from './baseCharacter.js';

const profileCfg = CONFIG.CHARACTER_PROFILES.char_2;
const upgrades = CONFIG.UPGRADES[profileCfg.upgradeSet] || [];

const castAbility = (slot, player, cfg) => {
    if (slot === 1) {
        const dur = (cfg.DURATION || player.chargeupDurationBase) * (player.chargeupDurationMult || 1);
        player.isChargedUp = true;
        player.chargeUpEndTime = Date.now() + dur;
        player.pendingStunDuration = dur;
        if (!soundManager.playSFX('charge', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('crit');
        return true;
    }
    if (slot === 2) {
        const wellDur = (cfg.DURATION || player.invincibilityDurationBase) * (player.invincibilityDurationMult || 1);
        player.gravityWellActive = {
            center: { x: player.x, y: player.y },
            endTime: Date.now() + wellDur,
            radius: cfg.RADIUS || CONFIG.ENGINE.GRAVITY_WELL.DEFAULT_RADIUS,
            pull: cfg.PULL || CONFIG.ENGINE.GRAVITY_WELL.DEFAULT_PULL,
            damage: cfg.DAMAGE || player.getCurrentDamage() * CONFIG.ENGINE.GRAVITY_WELL.DEFAULT_DAMAGE_MULT
        };
        if (!soundManager.playSFX('invincible', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('magnet');
        return true;
    }
    if (slot === 3) {
        player.pendingShockwave = {
            radius: cfg.RADIUS,
            damage: cfg.DAMAGE,
            knockback: cfg.KNOCKBACK,
            vulnerableMult: cfg.VULNERABLE_MULT,
            vulnerableMs: cfg.VULNERABLE_MS,
            stunMs: cfg.STUN_MS,
            color: cfg.COLOR || '#e67e22',
            label: cfg.NAME || 'SHOCKWAVE'
        };
        if (!soundManager.playSFX('kick', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('crit');
        return true;
    }
    if (slot === 4) {
        player.citadelModeActive = {
            endTime: Date.now() + cfg.DURATION,
            rangeMult: cfg.RANGE_MULT,
            attackBonus: cfg.ATTACK_BONUS,
            atkCooldownMult: cfg.ATK_COOLDOWN_MULT
        };
        if (!soundManager.playSFX('invincible', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('nuke');
        return true;
    }
    return false;
};

const isAbilityActive = (slot, player) => {
    if (slot === 1) return player.isChargedUp;
    if (slot === 2) return !!player.gravityWellActive;
    if (slot === 4) return !!player.citadelModeActive;
    return false;
};

const getAbilityHudState = (slot, player, cfg, now) => {
    if (slot === 1 && player.isChargedUp) {
        const dur = (cfg.DURATION || player.chargeupDurationBase) * (player.chargeupDurationMult || 1);
        return { active: true, remaining: Math.max(0, (player.chargeUpEndTime - now) / dur) };
    }
    if (slot === 2 && player.gravityWellActive) {
        const dur = (cfg.DURATION || player.invincibilityDurationBase) * (player.invincibilityDurationMult || 1);
        return { active: true, remaining: Math.max(0, (player.gravityWellActive.endTime - now) / dur) };
    }
    if (slot === 4 && player.citadelModeActive) {
        return { active: true, remaining: Math.max(0, (player.citadelModeActive.endTime - now) / (cfg.DURATION || 1)) };
    }
    return { active: false, remaining: 0 };
};

export const char2Profile = {
    id: profileCfg.id,
    leveling: profileCfg.leveling,
    abilities: profileCfg.abilities,
    upgrades,
    castAbility,
    isAbilityActive,
    getAbilityHudState
};

export class Char2Character extends BaseCharacter {
    constructor(x, y) {
        super(x, y, 'char_2', char2Profile);
    }

    onSpawn() {}
    onUpdateStart() {}
    onUpdateEnd() {}
    onDeath() {}
}
