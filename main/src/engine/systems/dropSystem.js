import { CONFIG } from '../../config.js';
import { XPOrb, BloodParticle, ItemLabel } from '../../utils.js';
import { Item } from '../../item.js';

export const updateDropSystemCore = (engine) => {
    const magnetActive = engine.player.itemEffects.magnetEndTime > Date.now();
    for (let i = engine.items.length - 1; i >= 0; i--) {
        const item = engine.items[i];
        if (item.update(engine.player, magnetActive)) {
            engine.soundManager.playSFX('pickup');
            const type = item.type;
            let labelText = '';
            switch (type.id) {
                case 'magnet':
                    engine.player.itemEffects.magnetEndTime = Date.now() + type.duration;
                    if (!engine.soundManager.playSFX('magnet', CONFIG.ENGINE.STUN.SFX_VOL)) engine.soundManager.playSynth('magnet');
                    labelText = 'MAGNET';
                    break;
                case 'health':
                    engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + type.value);
                    labelText = '+HP';
                    break;
                case 'nuke':
                    engine.player.energy = engine.player.maxEnergy;
                    if (engine.player.hasNukeAbility?.()) {
                        const maxCharges = Math.max(1, CONFIG.ENGINE.NUKE.DEFAULT_MAX_CHARGES || 1);
                        const currentCharges = engine.player.nukeCharges || 0;
                        engine.player.nukeCharges = Math.min(maxCharges, currentCharges + 1);
                        labelText = `NUKE +1 (${engine.player.nukeCharges})`;
                    } else {
                        labelText = 'OVERCHARGE';
                    }
                    break;
                case 'speed':
                    engine.player.itemEffects.speedEndTime = Date.now() + type.duration;
                    labelText = '+SPEED';
                    break;
                case 'rapid':
                    engine.player.itemEffects.rapidEndTime = Date.now() + type.duration;
                    labelText = 'RAPID FIRE';
                    break;
            }
            engine.itemLabels.push(new ItemLabel(engine.player.x, engine.player.y - CONFIG.ENGINE.ITEM_LABEL_OFFSET_Y, labelText, type.color));
            engine.items.splice(i, 1);
        } else if (!item.active) {
            engine.items.splice(i, 1);
        }
    }

    for (let i = engine.xpOrbs.length - 1; i >= 0; i--) {
        const orb = engine.xpOrbs[i];
        if (orb.update(engine.player, magnetActive)) {
            orb.sizePop = CONFIG.ENGINE.XP_ORB_POP;
            engine.soundManager.playSFX('xp');
            let gain = orb.value;
            if (engine.player.totalXp > CONFIG.ENGINE.XP.ENDGAME_THRESHOLD) gain *= CONFIG.ENGINE.XP.ENDGAME_MULT;
            if (engine.player.addXP(gain)) engine.triggerLevelUp();
        }
        if (!orb.active) engine.xpOrbs.splice(i, 1);
    }

    engine.particles.forEach((p) => p.update());
    engine.particles = engine.particles.filter((p) => p.life > 0);
    engine.damageNumbers.forEach((d) => d.update());
    engine.damageNumbers = engine.damageNumbers.filter((d) => d.life > 0);
    engine.itemLabels.forEach((l) => l.update());
    engine.itemLabels = engine.itemLabels.filter((l) => l.life > 0);

    engine.enemies.forEach((e) => {
        if (!e.isDead || e.dropsSpawned) return;
        e.dropsSpawned = true;
        engine.player.killCount += 1;
        engine.screenShake = Math.max(engine.screenShake, CONFIG.ENGINE.ENEMY_DEATH.SHAKE);
        engine.hitStop = CONFIG.ENGINE.ENEMY_DEATH.HITSTOP;
        engine.soundManager.playSFX('kick');
        const blood = Math.max(1, Math.ceil(CONFIG.ENGINE.ENEMY_DEATH.BLOOD * engine.particleMult));
        for (let i = 0; i < blood; i++) engine.particles.push(new BloodParticle(e.x, e.y));
        const cfg = CONFIG.ENEMY[e.type.toUpperCase()] || CONFIG.ENEMY.ZOMBIE;
        engine.player.energy = Math.min(engine.player.maxEnergy, engine.player.energy + cfg.ENERGY_DROP);

        if (Math.random() < CONFIG.ITEMS.DROP_CHANCE) {
            const visibleTypes = new Set();
            engine.items.forEach((existingItem) => {
                const screenX = existingItem.x - engine.camera.x;
                const screenY = existingItem.y - engine.camera.y;
                const onScreen = screenX > -CONFIG.ENGINE.ITEM_SCREEN_MARGIN
                    && screenX < engine.canvas.width + CONFIG.ENGINE.ITEM_SCREEN_MARGIN
                    && screenY > -CONFIG.ENGINE.ITEM_SCREEN_MARGIN
                    && screenY < engine.canvas.height + CONFIG.ENGINE.ITEM_SCREEN_MARGIN;
                if (onScreen) visibleTypes.add(existingItem.type.id);
            });

            const types = CONFIG.ITEMS.TYPES;
            const isRanger = (engine.player.characterId === 1);
            const candidateTypes = Object.values(types).filter((type) => {
                if (type.id === 'nuke' && !isRanger) return false;
                return true;
            });
            const totalChance = candidateTypes.reduce((sum, type) => sum + (type.chance || 0), 0);
            let selectedType = null;
            if (totalChance > 0) {
                let roll = Math.random() * totalChance;
                for (const type of candidateTypes) {
                    if (roll < type.chance) {
                        selectedType = type;
                        break;
                    }
                    roll -= type.chance;
                }
            }
            if (selectedType && !visibleTypes.has(selectedType.id)) {
                engine.items.push(new Item(e.x, e.y, selectedType));
            }
        }

        const xpRange = cfg.XP_MAX - cfg.XP_BASE;
        let totalXP = Math.floor(cfg.XP_BASE + (e.level - 1) * (xpRange / CONFIG.ENGINE.XP.LEVEL_SCALING_DIVISOR));
        if (engine.player.totalXp > CONFIG.ENGINE.XP.ENDGAME_THRESHOLD) totalXP *= CONFIG.ENGINE.XP.ENDGAME_MULT;
        const orbValue = Math.max(1, Math.ceil(totalXP / CONFIG.ENGINE.XP.ORB_SPLIT_DIVISOR));
        const orbCount = Math.ceil(totalXP / orbValue);
        if (engine.xpOrbs.length < CONFIG.XP_ORB.MAX_ORBS) {
            for (let i = 0; i < orbCount; i++) engine.xpOrbs.push(new XPOrb(e.x, e.y, orbValue));
        }
    });

    engine.enemies = engine.enemies.filter((e) => e.hp !== -999 && (!e.isDead || e.deathTimer < 1));
};
