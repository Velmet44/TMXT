import { CONFIG } from '../config.js';
import { keys } from '../input.js';
import { soundManager } from '../SoundManager.js';

const abilityIdBySlot = {
    1: 'ABILITY_1',
    2: 'ABILITY_2',
    3: 'ABILITY_3',
    4: 'ABILITY_4'
};

export class BaseCharacter {
    constructor(x, y, charKey, characterProfile) {
        this.x = x;
        this.y = y;
        this.characterProfile = characterProfile;

        const rt = CONFIG.PLAYER_RUNTIME;
        const charCfg = CONFIG.CHARACTERS[charKey];
        const m = charCfg.modifiers || {};

        this.characterId = charCfg.id;
        this.baseStats = { ...charCfg.base };
        this.leveling = characterProfile.leveling;
        this.abilitiesCfg = characterProfile.abilities;
        this.upgrades = characterProfile.upgrades || [];
        this.size = charCfg.base.SIZE;

        // Progression
        this.level = rt.INITIAL_LEVEL;
        this.xp = rt.INITIAL_XP;
        this.xpToNext = rt.INITIAL_XP_TO_NEXT;
        this.totalXp = rt.INITIAL_TOTAL_XP;
        this.killCount = rt.INITIAL_KILLS;

        // Core stats
        this.speed = charCfg.base.SPEED * (m.speed || 1);
        this.maxHp = Math.round(charCfg.base.MAX_HP * (m.hp || 1));
        this.hp = this.maxHp;
        this.regen = charCfg.base.REGEN * (m.regen || 1);
        this.damage = charCfg.base.DAMAGE * (m.damage || 1);
        this.atkCooldown = charCfg.base.ATTACK_COOLDOWN * (m.atkCooldown || 1);
        this.atkRange = charCfg.base.ATTACK_RANGE * (m.atkRange || 1);
        this.projCount = Math.max(0, Math.round(charCfg.base.PROJ_COUNT * (m.projCount ?? 1)));
        this.maxEnergy = charCfg.base.MAX_ENERGY * (m.maxEnergy || 1);
        this.energy = this.maxEnergy;

        // Modifiers and systems
        this.lifesteal = (charCfg.base.LIFESTEAL || 0) * (m.lifesteal || 1);
        this.energyRegenIdleBase = charCfg.base.ENERGY_REGEN_IDLE;
        this.energyRegenWalkBase = charCfg.base.ENERGY_REGEN_WALK;
        this.energyRegenMult = rt.ENERGY_REGEN_MULT * (m.energyIdle || 1);
        this.energyRegenWalkMult = m.energyWalk || 1;
        this.dashCostBase = charCfg.base.DASH_COST;
        this.dashSpeedBase = charCfg.base.DASH_SPEED;
        this.dashDurationBase = charCfg.base.DASH_DURATION;
        this.chargeupDurationBase = charCfg.base.CHARGEUP_DURATION;
        this.invincibilityDurationBase = charCfg.base.INVINCIBILITY_DURATION;
        this.invincibilitySpeedBase = charCfg.base.INVINCIBILITY_SPEED_MULT;
        this.dashCostMult = m.dashCost || 1;
        this.dashSpeedMult = m.dashSpeed || 1;
        this.dashDurationMult = m.dashDuration || 1;
        this.chargeupDurationMult = m.chargeupDuration || 1;
        this.invincibilityDurationMult = m.invincibilityDuration || 1;
        this.invincibilitySpeedMultBonus = m.invincibilitySpeedMult || 1;
        this.armor = m.armor || 0;
        this.dashDamageMult = m.dashDamageMult || 0;
        this.dashRangeMult = m.dashRangeMult || 1;
        this.dashParticle = m.dashParticle || '#f39c12';
        this.canShoot = m.canShoot !== false;
        if (!this.canShoot) {
            this.projCount = Math.max(1, this.projCount || 1);
            this.atkRange = Math.max(this.atkRange, CONFIG.PLAYER_RUNTIME.MIN_MELEE_RANGE);
        }

        // Combat state
        this.pendingStunDuration = 0;
        this.gravityWellActive = null;
        this.pendingNuke = null;
        this.pendingShockwave = null;
        this.zeroFrameActive = null;
        this.citadelModeActive = null;
        this.graveTrailActive = null;
        this.soulVortexActive = null;
        this.pendingMeteorRain = null;
        this.meteorStrikes = [];
        this.lichAscendanceActive = null;
        this.extraPierce = 0;
        this.extraSplashRadius = 0;

        // Runtime state
        this.isDead = false;
        this.lastAttack = 0;
        this.isDashing = false;
        this.dashEndTime = 0;
        this.isChargedUp = false;
        this.chargeUpEndTime = 0;
        this.isInvincible = false;
        this.invincibilityEndTime = 0;
        this.lastRegen = Date.now();
        this.lastXp = 0;
        this.difficulty = null;
        this.lastDashTrail = 0;
        this.godMode = false;
        this.multiShotChance = 0;
        this.critChance = 0;
        this.bulletSizeMult = 1;
        this.abilityErrorText = '';
        this.abilityErrorUntil = 0;
        this.nukeCharges = 0;
        this.prevAbilityInput = { z: false, x: false, c: false, v: false };

        // Item effects
        this.itemEffects = { magnetEndTime: 0, speedEndTime: 0, rapidEndTime: 0 };

        // Visual
        this.gunRecoil = 0;
        this.rotation = 0;
        this.tilt = 0;
        this.walkTimer = 0;

        this.sprite = new Image();
        this.spriteLoaded = false;
        this.sprite.onload = () => { this.spriteLoaded = true; };
        this.sprite.src = charCfg.sprite || 'assets/char_1.svg';

        if (this.onSpawn) this.onSpawn();
    }

    addXP(amount) {
        const gain = amount * (this.difficulty?.xpMult || 1);
        this.xp += gain;
        this.totalXp += gain;
        if (this.xp >= this.xpToNext) {
            this.levelUp();
            return true;
        }
        return false;
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpToNext;
        const lv = this.leveling;
        this.xpToNext = Math.floor(this.xpToNext * lv.XP_GROWTH_MULT);
        if (lv.XP_GROWTH_BASE) this.xpToNext += lv.XP_GROWTH_BASE;

        this.maxHp += lv.HP_PER_LEVEL;
        this.hp = Math.min(this.maxHp, this.hp + lv.HP_PER_LEVEL);
        this.damage += lv.DMG_PER_LEVEL;
        this.atkCooldown *= lv.ATK_COOLDOWN_MULT;
        this.speed += lv.SPD_PER_LEVEL;
        this.maxEnergy += lv.ENERGY_PER_LEVEL;
        this.energy = Math.min(this.maxEnergy, this.energy + lv.ENERGY_PER_LEVEL);
        if (lv.PROJ_INTERVAL > 0 && this.level % lv.PROJ_INTERVAL === 0) {
            this.projCount += lv.PROJ_PER_INTERVAL;
        }
        if (this.godMode) this.hp = this.maxHp;
    }

    getCurrentSpeed() {
        let currentSpeed = this.speed;
        if (this.citadelModeActive) return 0;
        if (this.isDashing) return this.dashSpeedBase * (this.dashSpeedMult || 1);
        if (this.isInvincible) {
            currentSpeed *= this.invincibilitySpeedBase * (this.invincibilitySpeedMultBonus || 1);
        } else {
            if (this.itemEffects.speedEndTime > Date.now()) currentSpeed *= CONFIG.PLAYER_RUNTIME.SPEED_MULT_ITEM;
            if (this.isChargedUp) currentSpeed *= CONFIG.PLAYER_RUNTIME.SPEED_MULT_CHARGE;
        }
        return currentSpeed;
    }

    getCurrentAtkCooldown() {
        let cd = this.atkCooldown;
        if (this.itemEffects.rapidEndTime > Date.now()) cd *= CONFIG.PLAYER_RUNTIME.ATK_CD_MULT_RAPID;
        if (this.isChargedUp) cd *= CONFIG.PLAYER_RUNTIME.ATK_CD_MULT_CHARGE;
        if (this.citadelModeActive) cd *= this.citadelModeActive.atkCooldownMult || 1;
        return cd;
    }

    getCurrentAtkRange() {
        let range = this.atkRange;
        if (this.citadelModeActive) range *= this.citadelModeActive.rangeMult || 1;
        return range;
    }

    getCurrentProjCount() {
        let count = this.projCount;
        if (this.citadelModeActive) count += this.citadelModeActive.attackBonus || 0;
        return Math.max(1, Math.round(count));
    }

    getCurrentDamage() {
        let dmg = this.damage;
        if (this.isChargedUp) dmg *= CONFIG.PLAYER_RUNTIME.DAMAGE_MULT_CHARGE;
        if (this.isInvincible) dmg *= CONFIG.PLAYER_RUNTIME.DAMAGE_MULT_INVINCIBLE;
        if (this.lichAscendanceActive) dmg *= this.lichAscendanceActive.damageMult || 1;
        return dmg;
    }

    getCurrentLifesteal() {
        return (this.lifesteal || 0) + (this.lichAscendanceActive?.lifestealBonus || 0);
    }

    getAbilityConfig(slot) {
        const key = abilityIdBySlot[slot];
        return this.abilitiesCfg?.[key] || null;
    }

    getAbilityMinLevel(slot) {
        const cfg = this.getAbilityConfig(slot) || {};
        return Math.max(CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL, cfg.MIN_LEVEL ?? CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL);
    }

    getAbilityName(slot) {
        const cfg = this.getAbilityConfig(slot) || {};
        return cfg.NAME || `ABILITY ${slot}`;
    }

    getAbilityIcon(slot) {
        const cfg = this.getAbilityConfig(slot) || {};
        return cfg.ICON || '';
    }

    getAbilityHudState(slot, now = Date.now()) {
        if (this.characterProfile?.getAbilityHudState) {
            const cfg = this.getAbilityConfig(slot) || {};
            return this.characterProfile.getAbilityHudState(slot, this, cfg, now) || { active: false, remaining: 0 };
        }
        return { active: false, remaining: 0 };
    }

    tryCastAbility(slot) {
        const cfg = this.getAbilityConfig(slot);
        if (!cfg) return false;

        if (this.level < this.getAbilityMinLevel(slot)) {
            this.setAbilityError('You must be at least level 3 to use an ability');
            return false;
        }
        if (cfg.EFFECT === 'nuke' && this.nukeCharges <= 0) {
            this.setAbilityError('Pick up a nuke before using this ability');
            return false;
        }
        if (this.energy < this.maxEnergy) {
            this.setAbilityError('You need max energy to activate this ability');
            return false;
        }
        if (this.isAbilityActive(slot)) return false;
        if (!this.castAbility(slot, cfg)) return false;
        if (cfg.EFFECT === 'nuke') {
            this.nukeCharges = Math.max(0, this.nukeCharges - 1);
        }
        this.energy = 0;
        return true;
    }

    hasNukeAbility() {
        return Object.values(this.abilitiesCfg || {}).some((cfg) => cfg?.EFFECT === 'nuke');
    }

    isAbilityActive(slot) {
        if (this.characterProfile?.isAbilityActive) {
            return !!this.characterProfile.isAbilityActive(slot, this);
        }
        return false;
    }

    setAbilityError(message) {
        this.abilityErrorText = message;
        this.abilityErrorUntil = Date.now() + CONFIG.ENGINE.ABILITY_ERROR_DURATION_MS;
    }

    castAbility(slot, cfg) {
        if (this.characterProfile?.castAbility) {
            return this.characterProfile.castAbility(slot, this, cfg) === true;
        }
        return false;
    }

    takeDamage(amount) {
        if (this.isInvincible || this.isDead) return false;
        let dmg = amount;
        if (this.armor) dmg *= (1 - this.armor);
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            if (this.onDeath) this.onDeath();
        }
        return true;
    }

    update() {
        if (this.onUpdateStart) this.onUpdateStart();
        if (this.isDead) return;
        const now = Date.now();
        let mx = 0, my = 0;
        if (keys.w) my -= CONFIG.PLAYER_RUNTIME.INPUT_STEP;
        if (keys.s) my += CONFIG.PLAYER_RUNTIME.INPUT_STEP;
        if (keys.a) mx -= CONFIG.PLAYER_RUNTIME.INPUT_STEP;
        if (keys.d) mx += CONFIG.PLAYER_RUNTIME.INPUT_STEP;
        if (keys.mobileX !== 0 || keys.mobileY !== 0) {
            mx = keys.mobileX;
            my = keys.mobileY;
        }

        const dist = Math.sqrt(mx * mx + my * my);
        if (dist > CONFIG.PLAYER_RUNTIME.INPUT_DEADZONE) {
            const speed = this.getCurrentSpeed();
            const moveX = (mx / dist) * speed;
            const moveY = (my / dist) * speed;
            this.x += moveX;
            this.y += moveY;
            this.rotation = Math.atan2(moveY, moveX);
            this.walkTimer += CONFIG.PLAYER_RUNTIME.WALK_TIMER_STEP;
            this.tilt += (CONFIG.PLAYER_RUNTIME.TILT_TARGET - this.tilt) * CONFIG.PLAYER_RUNTIME.TILT_LERP;
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenWalkBase * this.energyRegenMult * (this.energyRegenWalkMult || 1));
        } else {
            this.tilt *= CONFIG.PLAYER_RUNTIME.TILT_IDLE_DAMP;
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenIdleBase * this.energyRegenMult);
        }

        const dashCost = this.dashCostBase * (this.dashCostMult || 1);
        if (keys.shift && !this.isDashing && this.energy >= dashCost) {
            this.isDashing = true;
            this.dashEndTime = now + this.dashDurationBase * (this.dashDurationMult || 1);
            this.energy -= dashCost;
            this.lastDashTrail = now;
            soundManager.playSFX('dash', CONFIG.PLAYER_RUNTIME.DASH_SFX_VOL);
        }
        if (this.isDashing && now > this.dashEndTime) this.isDashing = false;

        const abilityInput = {
            z: !!keys.z,
            x: !!keys.x,
            c: !!keys.c,
            v: !!keys.v
        };
        if (abilityInput.z && !this.prevAbilityInput.z) this.tryCastAbility(1);
        if (abilityInput.x && !this.prevAbilityInput.x) this.tryCastAbility(2);
        if (abilityInput.c && !this.prevAbilityInput.c) this.tryCastAbility(3);
        if (abilityInput.v && !this.prevAbilityInput.v) this.tryCastAbility(4);
        this.prevAbilityInput = abilityInput;

        if (this.isChargedUp && now > this.chargeUpEndTime) this.isChargedUp = false;
        if (this.isInvincible && now > this.invincibilityEndTime) this.isInvincible = false;
        if (this.gravityWellActive && now > this.gravityWellActive.endTime) this.gravityWellActive = null;
        if (this.zeroFrameActive && now > this.zeroFrameActive.endTime) this.zeroFrameActive = null;
        if (this.citadelModeActive && now > this.citadelModeActive.endTime) this.citadelModeActive = null;
        if (this.graveTrailActive && now > this.graveTrailActive.endTime) this.graveTrailActive = null;
        if (this.soulVortexActive && now > this.soulVortexActive.endTime) this.soulVortexActive = null;
        if (this.lichAscendanceActive && now > this.lichAscendanceActive.endTime) this.lichAscendanceActive = null;

        if (now - this.lastRegen > CONFIG.PLAYER_RUNTIME.REGEN_TICK_MS) {
            this.hp = Math.min(this.maxHp, this.hp + this.regen);
            this.lastRegen = now;
        }
        if (this.gunRecoil > 0) this.gunRecoil *= CONFIG.PLAYER_RUNTIME.GUN_RECOIL_DAMP;
        if (this.onUpdateEnd) this.onUpdateEnd();
    }

    attack(tx, ty) {
        this.lastAttack = Date.now();
    }

    draw(ctx, camera) {
        const px = this.x - camera.x;
        const py = this.y - camera.y;
        const vis = CONFIG.PLAYER_RUNTIME.VISUAL;
        ctx.save();
        ctx.translate(px, py);
        const walkY = Math.sin(this.walkTimer) * vis.WALK_BOB_AMPLITUDE;
        const walkAngle = Math.cos(this.walkTimer) * vis.WALK_ANGLE_AMPLITUDE;
        ctx.rotate(walkAngle);
        ctx.translate(0, walkY);
        ctx.fillStyle = `rgba(0,0,0,${vis.SHADOW_ALPHA})`;
        ctx.beginPath();
        ctx.ellipse(0, this.size / 2, this.size / 2, this.size * vis.SHADOW_RY_RATIO / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (this.isInvincible) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = vis.INV_RING_WIDTH;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * vis.INV_RING_SIZE_MULT, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = vis.INV_FILL;
            ctx.fill();
        }

        if (this.spriteLoaded) {
            const scale = this.isInvincible ? vis.INV_SPRITE_SCALE : (this.isChargedUp ? vis.CHARGE_SPRITE_SCALE : 1);
            const size = this.size * scale;
            ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);
            if (this.isInvincible || this.isChargedUp) {
                ctx.fillStyle = this.isInvincible ? vis.SPRITE_BUFF_INV : vis.SPRITE_BUFF_CHARGE;
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }
        } else {
            ctx.save();
            if (this.isInvincible) ctx.fillStyle = '#f1c40f';
            else if (this.isChargedUp) ctx.fillStyle = '#9b59b6';
            else ctx.fillStyle = '#3498db';
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.fillStyle = '#fff';
            const eyeSize = this.size * vis.FALLBACK_EYE_SIZE_MULT;
            ctx.fillRect(-this.size / 2 + vis.FALLBACK_EYE_PAD, -this.size / 4, eyeSize, eyeSize);
            ctx.fillRect(this.size / 2 - vis.FALLBACK_EYE_PAD - eyeSize, -this.size / 4, eyeSize, eyeSize);
            ctx.fillStyle = this.isChargedUp ? '#e74c3c' : '#3498db';
            ctx.fillRect(vis.FALLBACK_MOUTH_X, vis.FALLBACK_MOUTH_Y, vis.FALLBACK_MOUTH_W, vis.FALLBACK_MOUTH_H);
            ctx.restore();
        }
        ctx.restore();
    }
}
