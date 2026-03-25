import { soundManager } from '../SoundManager.js';
import { CONFIG } from '../config.js';

const profileCfg = CONFIG.CHARACTER_PROFILES.char_1;
const upgrades = CONFIG.UPGRADES[profileCfg.upgradeSet] || [];

export const char1Profile = {
    id: profileCfg.id,
    leveling: profileCfg.leveling,
    abilities: profileCfg.abilities,
    upgrades,
    castAbility1(player) {
        const chargeCfg = this.abilities.CHARGE;
        const dur = (chargeCfg.DURATION || player.chargeupDurationBase) * (player.chargeupDurationMult || 1);
        player.isChargedUp = true;
        player.chargeUpEndTime = Date.now() + dur;
        if (!soundManager.playSFX('charge', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('crit');
    },
    castAbility2(player) {
        const invCfg = this.abilities.INVINCIBLE;
        const invDur = (invCfg.DURATION || player.invincibilityDurationBase) * (player.invincibilityDurationMult || 1);
        player.isInvincible = true;
        player.invincibilityEndTime = Date.now() + invDur;
        if (!soundManager.playSFX('invincible', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('magnet');
    }
};
