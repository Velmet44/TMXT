import { soundManager } from '../SoundManager.js';
import { CONFIG } from '../config.js';

const profileCfg = CONFIG.CHARACTER_PROFILES.char_2;
const upgrades = CONFIG.UPGRADES[profileCfg.upgradeSet] || [];

export const char2Profile = {
    id: profileCfg.id,
    leveling: profileCfg.leveling,
    abilities: profileCfg.abilities,
    upgrades,
    castAbility1(player) {
        const chargeCfg = this.abilities.CHARGE;
        const dur = (chargeCfg.DURATION || player.chargeupDurationBase) * (player.chargeupDurationMult || 1);
        player.isChargedUp = true;
        player.chargeUpEndTime = Date.now() + dur;
        player.pendingStunDuration = dur;
        if (!soundManager.playSFX('charge', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('crit');
    },
    castAbility2(player) {
        const invCfg = this.abilities.INVINCIBLE;
        const invDur = (invCfg.DURATION || player.invincibilityDurationBase) * (player.invincibilityDurationMult || 1);
        player.gravityWellActive = {
            center: { x: player.x, y: player.y },
            endTime: Date.now() + invDur,
            radius: invCfg.RADIUS || CONFIG.ENGINE.GRAVITY_WELL.DEFAULT_RADIUS,
            pull: invCfg.PULL || CONFIG.ENGINE.GRAVITY_WELL.DEFAULT_PULL,
            damage: invCfg.DAMAGE || player.getCurrentDamage() * CONFIG.ENGINE.GRAVITY_WELL.DEFAULT_DAMAGE_MULT,
            exploded: false
        };
        if (!soundManager.playSFX('gravity', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('magnet');
    }
};
