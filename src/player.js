import { CONFIG } from './config.js';
import { keys } from './input.js';
import { soundManager } from './SoundManager.js';

const getCharById = (id) => {
    const list = Object.values(CONFIG.CHARACTERS || {});
    return list.find(c => c.id === id) || list[0];
};

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const defChar = getCharById(1);
        this.applyBase(defChar);

        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 10;
        this.totalXp = 0;
        this.killCount = 0;

        // Energy
        this.energy = this.maxEnergy;
        this.energyRegenMult = 1.0;
        this.pendingStunDuration = 0;
        this.gravityWellActive = null;

        // State
        this.isDead = false;
        this.lastAttack = 0;
        this.isDashing = false;
        this.dashEndTime = 0;
        this.isChargedUp = false;
        this.chargeUpEndTime = 0;
        this.isInvincible = false;
        this.invincibilityEndTime = 0;
        this.nukeCharges = 0;
        this.lastRegen = Date.now();
        this.lastXp = 0;
        this.difficulty = null;
        this.lastDashTrail = 0;

        // Item Effects
        this.itemEffects = { magnetEndTime: 0, speedEndTime: 0, rapidEndTime: 0 };

        // Visual
        this.gunRecoil = 0;
        this.rotation = 0;
        this.tilt = 0;
        this.walkTimer = 0;

        // Sprite
        this.sprite = new Image();
        this.spriteLoaded = false;
        this.sprite.onload = () => { this.spriteLoaded = true; };
        this.sprite.src = defChar.sprite || 'assets/char_1.svg';
    }

    applyBase(charCfg) {
        this.characterId = charCfg.id;
        this.charKey = Object.entries(CONFIG.CHARACTERS).find(([_, c]) => c === charCfg)?.[0];
        this.baseStats = { ...charCfg.base };
        this.leveling = charCfg.leveling;
        this.abilitiesCfg = charCfg.abilities;
        this.upgrades = charCfg.upgrades || [];
        this.size = charCfg.base.SIZE;

        this.speed = charCfg.base.SPEED;
        this.maxHp = charCfg.base.MAX_HP;
        this.hp = this.maxHp;
        this.regen = charCfg.base.REGEN;
        this.damage = charCfg.base.DAMAGE;
        this.atkCooldown = charCfg.base.ATTACK_COOLDOWN;
        this.atkRange = charCfg.base.ATTACK_RANGE;
        this.projCount = charCfg.base.PROJ_COUNT;
        this.maxEnergy = charCfg.base.MAX_ENERGY;

        // modifiers defaults
        this.lifesteal = charCfg.base.LIFESTEAL || 0;
        this.energyRegenIdleBase = charCfg.base.ENERGY_REGEN_IDLE;
        this.energyRegenWalkBase = charCfg.base.ENERGY_REGEN_WALK;
        this.dashCostBase = charCfg.base.DASH_COST;
        this.dashSpeedBase = charCfg.base.DASH_SPEED;
        this.dashDurationBase = charCfg.base.DASH_DURATION;
        this.abilityCostBase = charCfg.base.ABILITY_COST;
        this.chargeupDurationBase = charCfg.base.CHARGEUP_DURATION;
        this.ability2CostBase = charCfg.base.ABILITY_2_COST;
        this.invincibilityDurationBase = charCfg.base.INVINCIBILITY_DURATION;
        this.invincibilitySpeedBase = charCfg.base.INVINCIBILITY_SPEED_MULT;

        this.dashDamageMult = 0;
        this.armor = 0;
        this.dashParticle = '#f39c12';
        this.canShoot = true;
    }

    setCharacter(id) {
        const entry = getCharById(id);
        if (!entry) return;
        this.applyBase(entry);

        if (entry.sprite && this.sprite.src !== entry.sprite) {
            this.spriteLoaded = false;
            this.sprite = new Image();
            this.sprite.onload = () => { this.spriteLoaded = true; };
            this.sprite.src = entry.sprite;
        }
        const m = entry.modifiers || {};
        this.maxHp = Math.round(this.maxHp * (m.hp || 1));
        this.hp = this.maxHp;
        this.damage *= (m.damage || 1);
        this.speed *= (m.speed || 1);
        this.atkCooldown *= (m.atkCooldown || 1);
        this.atkRange *= (m.atkRange || 1);
        this.projCount = Math.max(0, Math.round(this.projCount * (m.projCount ?? 1)));
        this.maxEnergy *= (m.maxEnergy || 1);
        this.energy = this.maxEnergy;
        this.armor = m.armor || 0;
        this.dashDamageMult = m.dashDamageMult || 0;
        this.dashParticle = m.dashParticle || '#f39c12';
        this.canShoot = m.canShoot !== false;
        this.regen *= (m.regen || 1);
        this.lifesteal *= (m.lifesteal || 1);
        this.energyRegenMult = 1.0 * (m.energyIdle || 1);
        this.energyRegenWalkMult = m.energyWalk || 1;
        this.dashCostMult = m.dashCost || 1;
        this.dashSpeedMult = m.dashSpeed || 1;
        this.dashDurationMult = m.dashDuration || 1;
        this.abilityCostMult = m.abilityCost || 1;
        this.ability2CostMult = m.ability2Cost || 1;
        this.chargeupDurationMult = m.chargeupDuration || 1;
        this.invincibilityDurationMult = m.invincibilityDuration || 1;
        this.invincibilitySpeedMultBonus = m.invincibilitySpeedMult || 1;

        if (!this.canShoot) {
            this.projCount = 0;
            this.atkRange = Math.max(this.atkRange, 80);
        }
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
        this.xpToNext = Math.floor(this.xpToNext * lv.XP_GROWTH_MULT) + lv.XP_GROWTH_BASE;

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
        if (this.isDashing) return this.dashSpeedBase * (this.dashSpeedMult || 1);
        if (this.isInvincible) {
            currentSpeed *= this.invincibilitySpeedBase * (this.invincibilitySpeedMultBonus || 1);
        } else {
            if (this.itemEffects.speedEndTime > Date.now()) currentSpeed *= 1.5;
            if (this.isChargedUp) currentSpeed *= 1.2;
        }
        return currentSpeed;
    }

    getCurrentAtkCooldown() {
        let cd = this.atkCooldown;
        if (this.itemEffects.rapidEndTime > Date.now()) cd *= 0.4;
        if (this.isChargedUp) cd *= 0.5;
        return cd;
    }

    getCurrentDamage() {
        let dmg = this.damage;
        if (this.isChargedUp) dmg *= 1.5;
        if (this.isInvincible) dmg *= 2.0;
        return dmg;
    }

    takeDamage(amount) {
        if (this.isInvincible || this.isDead) return false;
        let dmg = amount;
        if (this.armor) dmg *= (1 - this.armor);
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
        }
        return true;
    }

    update() {
        if (this.isDead) return;
        let mx = 0, my = 0;
        if (keys.w) my -= 1;
        if (keys.s) my += 1;
        if (keys.a) mx -= 1;
        if (keys.d) mx += 1;
        if (keys.mobileX !== 0 || keys.mobileY !== 0) {
            mx = keys.mobileX; my = keys.mobileY;
        }
        const dist = Math.sqrt(mx * mx + my * my);
        if (dist > 0.1) {
            const speed = this.getCurrentSpeed();
            const moveX = (mx / dist) * speed;
            const moveY = (my / dist) * speed;
            this.x += moveX;
            this.y += moveY;
            this.rotation = Math.atan2(moveY, moveX);
            this.walkTimer += 0.2;
            this.tilt += (0.1 - this.tilt) * 0.1;
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenWalkBase * this.energyRegenMult * (this.energyRegenWalkMult || 1));
        } else {
            this.tilt *= 0.9;
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenIdleBase * this.energyRegenMult);
        }

        const dashCost = this.dashCostBase * (this.dashCostMult || 1);
        if (keys.shift && !this.isDashing && this.energy >= dashCost) {
            this.isDashing = true;
            this.dashEndTime = Date.now() + this.dashDurationBase * (this.dashDurationMult || 1);
            this.energy -= dashCost;
            this.lastDashTrail = Date.now();
            soundManager.playSFX('dash', 0.05);
        }
        if (this.isDashing && Date.now() > this.dashEndTime) this.isDashing = false;

        // Ability 1
        const chargeCfg = this.abilitiesCfg.CHARGE;
        const fullEnergyCost = this.maxEnergy; // Abilities spend full bar
        const chargeMinLevel = Math.max(3, chargeCfg.MIN_LEVEL || 3);
        if (keys.z && !this.isChargedUp && this.level >= chargeMinLevel && this.energy >= fullEnergyCost) {
            this.energy -= fullEnergyCost;
            const dur = (chargeCfg.DURATION || this.chargeupDurationBase) * (this.chargeupDurationMult || 1);
            this.isChargedUp = true;
            this.chargeUpEndTime = Date.now() + dur;
            if (chargeCfg.EFFECT === 'stun_all') {
                this.pendingStunDuration = dur;
            }
            if (!soundManager.playSFX('charge', 0.05)) soundManager.playSynth('crit');
        }
        if (this.isChargedUp && Date.now() > this.chargeUpEndTime) this.isChargedUp = false;

        // Ability 2
        const invCfg = this.abilitiesCfg.INVINCIBLE;
        const invMinLevel = Math.max(3, invCfg.MIN_LEVEL || 3);
        if (keys.x && this.level >= invMinLevel && this.energy >= fullEnergyCost) {
            this.energy -= fullEnergyCost;
            const invDur = (invCfg.DURATION || this.invincibilityDurationBase) * (this.invincibilityDurationMult || 1);
            if (invCfg.EFFECT === 'gravity_well') {
                this.gravityWellActive = {
                    center: { x: this.x, y: this.y },
                    endTime: Date.now() + invDur,
                    radius: invCfg.RADIUS || 240,
                    pull: invCfg.PULL || 1.0,
                    damage: invCfg.DAMAGE || this.getCurrentDamage() * 4,
                    exploded: false
                };
                if (!soundManager.playSFX('gravity', 0.05)) soundManager.playSynth('magnet');
            } else {
                this.isInvincible = true;
                this.invincibilityEndTime = Date.now() + invDur;
                if (!soundManager.playSFX('invincible', 0.05)) soundManager.playSynth('magnet');
            }
        }
        if (this.isInvincible && Date.now() > this.invincibilityEndTime) this.isInvincible = false;
        if (this.gravityWellActive && Date.now() > this.gravityWellActive.endTime && this.gravityWellActive.exploded) {
            this.gravityWellActive = null;
        }

        // Passive Regen
        if (Date.now() - this.lastRegen > 1000) {
            this.hp = Math.min(this.maxHp, this.hp + this.regen);
            this.lastRegen = Date.now();
        }
        if (this.gunRecoil > 0) this.gunRecoil *= 0.8;
    }

    attack(tx, ty) { this.lastAttack = Date.now(); }

    draw(ctx, camera) {
        const px = this.x - camera.x;
        const py = this.y - camera.y;
        ctx.save();
        ctx.translate(px, py);
        const walkY = Math.sin(this.walkTimer) * 3;
        const walkAngle = Math.cos(this.walkTimer) * 0.1;
        ctx.rotate(walkAngle);
        ctx.translate(0, walkY);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.size/2, this.size/2, this.size/4, 0, 0, Math.PI*2);
        ctx.fill();
        if (this.isInvincible) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
            ctx.fill();
        }
        if (this.spriteLoaded) {
            const scale = this.isInvincible ? 1.12 : (this.isChargedUp ? 1.05 : 1);
            const size = this.size * scale;
            ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);
            if (this.isInvincible || this.isChargedUp) {
                ctx.fillStyle = this.isInvincible ? 'rgba(241,196,15,0.35)' : 'rgba(155,89,182,0.35)';
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }
        } else {
            ctx.save();
            if (this.isInvincible) ctx.fillStyle = '#f1c40f';
            else if (this.isChargedUp) ctx.fillStyle = '#9b59b6';
            else ctx.fillStyle = '#3498db';
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.fillStyle = '#fff';
            const eyeSize = this.size * 0.2;
            ctx.fillRect(-this.size/2 + 4, -this.size/4, eyeSize, eyeSize);
            ctx.fillRect(this.size/2 - 4 - eyeSize, -this.size/4, eyeSize, eyeSize);
            ctx.fillStyle = this.isChargedUp ? '#e74c3c' : '#3498db';
            ctx.fillRect(4, -1.5, 8, 2);
            ctx.restore();
        }
        ctx.restore();
    }
}
