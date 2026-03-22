import { CONFIG } from './config.js';
import { keys } from './input.js';
import { soundManager } from './SoundManager.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PLAYER.SIZE;

        // Base Stats
        this.speed = CONFIG.PLAYER.SPEED;
        this.maxHp = CONFIG.PLAYER.MAX_HP;
        this.hp = this.maxHp;
        this.regen = CONFIG.PLAYER.REGEN;
        this.damage = CONFIG.PLAYER.DAMAGE;
        this.atkCooldown = CONFIG.PLAYER.ATTACK_COOLDOWN;
        this.atkRange = CONFIG.PLAYER.ATTACK_RANGE;
        this.projCount = CONFIG.PLAYER.PROJ_COUNT;
        
        // Progression
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 10;
        this.totalXp = 0;

        // Energy
        this.maxEnergy = CONFIG.PLAYER.MAX_ENERGY;
        this.energy = this.maxEnergy;
        this.energyRegenMult = 1.0;

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

        // Item Effects
        this.itemEffects = {
            magnetEndTime: 0,
            speedEndTime: 0,
            rapidEndTime: 0
        };

        // Visual Juice
        this.gunRecoil = 0;
        this.rotation = 0;
        this.tilt = 0;
        this.walkTimer = 0;

        // Sprite
        this.sprite = new Image();
        this.spriteLoaded = false;
        this.sprite.onload = () => { this.spriteLoaded = true; };
        this.sprite.src = 'assets/char_1.svg';
    }

    setCharacter(index) {
        this.characterIndex = index;
        if (index) {
            const imgPath = `assets/char_${index}.svg`;
            if (this.sprite.src !== imgPath) {
                this.spriteLoaded = false;
                this.sprite = new Image();
                this.sprite.onload = () => { this.spriteLoaded = true; };
                this.sprite.src = imgPath;
            }
        }
        // Optional: Character-specific base stat adjustments
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
        this.xpToNext = Math.floor(this.xpToNext * CONFIG.LEVELING.XP_GROWTH_MULT) + CONFIG.LEVELING.XP_GROWTH_BASE;

        const lv = CONFIG.LEVELING;
        this.maxHp += lv.HP_PER_LEVEL;
        this.hp = Math.min(this.maxHp, this.hp + lv.HP_PER_LEVEL);
        this.damage += lv.DMG_PER_LEVEL;
        this.atkCooldown *= lv.ATK_COOLDOWN_MULT;
        this.speed += lv.SPD_PER_LEVEL;
        if (lv.PROJ_INTERVAL > 0 && this.level % lv.PROJ_INTERVAL === 0) {
            this.projCount += lv.PROJ_PER_INTERVAL;
        }

        if (this.godMode) {
            this.hp = this.maxHp;
        }
    }

    getCurrentSpeed() {
        let currentSpeed = this.speed;
        if (this.isDashing) return CONFIG.PLAYER.DASH_SPEED;
        
        if (this.isInvincible) {
            currentSpeed *= CONFIG.PLAYER.INVINCIBILITY_SPEED_MULT;
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
        if (this.isInvincible) dmg *= 2.0; // Invincibility also gives dmg boost
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

        // Input
        let mx = 0;
        let my = 0;

        if (keys.w) my -= 1;
        if (keys.s) my += 1;
        if (keys.a) mx -= 1;
        if (keys.d) mx += 1;

        // Mobile
        if (keys.mobileX !== 0 || keys.mobileY !== 0) {
            mx = keys.mobileX;
            my = keys.mobileY;
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
            
            // Energy Regen while walking
            this.energy = Math.min(this.maxEnergy, this.energy + CONFIG.PLAYER.ENERGY_REGEN_WALK * this.energyRegenMult);
        } else {
            this.tilt *= 0.9;
            // Energy Regen while idle (faster)
            this.energy = Math.min(this.maxEnergy, this.energy + CONFIG.PLAYER.ENERGY_REGEN_IDLE * this.energyRegenMult);
        }

        // Dash Logic
        if (keys.shift && !this.isDashing && this.energy >= CONFIG.PLAYER.DASH_COST) {
            this.isDashing = true;
            this.dashEndTime = Date.now() + CONFIG.PLAYER.DASH_DURATION;
            this.energy -= CONFIG.PLAYER.DASH_COST;
        }

        if (this.isDashing && Date.now() > this.dashEndTime) {
            this.isDashing = false;
        }

        // Ability 1 Logic (ChargeUp)
        if (keys.z && !this.isChargedUp && this.level >= CONFIG.ABILITIES.CHARGE.MIN_LEVEL && this.energy >= CONFIG.PLAYER.ABILITY_COST) {
            this.isChargedUp = true;
            this.chargeUpEndTime = Date.now() + CONFIG.PLAYER.CHARGEUP_DURATION;
            this.energy -= CONFIG.PLAYER.ABILITY_COST;
            if (!soundManager.playSFX('charge', 0.05)) soundManager.playSynth('crit');
        }

        if (this.isChargedUp && Date.now() > this.chargeUpEndTime) {
            this.isChargedUp = false;
        }

        // Ability 2 Logic (Invincibility)
        if (keys.x && !this.isInvincible && this.level >= CONFIG.ABILITIES.INVINCIBLE.MIN_LEVEL && this.energy >= CONFIG.PLAYER.ABILITY_2_COST) {
            this.isInvincible = true;
            this.invincibilityEndTime = Date.now() + CONFIG.PLAYER.INVINCIBILITY_DURATION;
            this.energy -= CONFIG.PLAYER.ABILITY_2_COST;
            if (!soundManager.playSFX('invincible', 0.05)) soundManager.playSynth('magnet');
        }

        if (this.isInvincible && Date.now() > this.invincibilityEndTime) {
            this.isInvincible = false;
        }

        // Passive Regen
        if (Date.now() - this.lastRegen > 1000) {
            this.hp = Math.min(this.maxHp, this.hp + this.regen);
            this.lastRegen = Date.now();
        }

        if (this.gunRecoil > 0) this.gunRecoil *= 0.8;
    }

    attack(tx, ty) {
        this.lastAttack = Date.now();
    }

    draw(ctx, camera) {
        const px = this.x - camera.x;
        const py = this.y - camera.y;

        ctx.save();
        ctx.translate(px, py);
        
        // Walk Wobble
        const walkY = Math.sin(this.walkTimer) * 3;
        const walkAngle = Math.cos(this.walkTimer) * 0.1;
        ctx.rotate(walkAngle);
        ctx.translate(0, walkY);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.size/2, this.size/2, this.size/4, 0, 0, Math.PI*2);
        ctx.fill();

        // Invincibility Glow
        if (this.isInvincible) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
            ctx.fill();
        }

        // Body
        if (this.spriteLoaded) {
            const scale = this.isInvincible ? 1.12 : (this.isChargedUp ? 1.05 : 1);
            const size = this.size * scale;
            ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);
            // overlay tint for states
            if (this.isInvincible || this.isChargedUp) {
                ctx.fillStyle = this.isInvincible ? 'rgba(241,196,15,0.35)' : 'rgba(155,89,182,0.35)';
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }
        } else {
            ctx.save();
            // Body color based on state
            if (this.isInvincible) ctx.fillStyle = '#f1c40f';
            else if (this.isChargedUp) ctx.fillStyle = '#9b59b6';
            else ctx.fillStyle = '#3498db';
            
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            
            // Eyes
            ctx.fillStyle = '#fff';
            const eyeSize = this.size * 0.2;
            ctx.fillRect(-this.size/2 + 4, -this.size/4, eyeSize, eyeSize);
            ctx.fillRect(this.size/2 - 4 - eyeSize, -this.size/4, eyeSize, eyeSize);
            
            // Energy Light
            ctx.fillStyle = this.isChargedUp ? '#e74c3c' : '#3498db';
            ctx.fillRect(4, -1.5, 8, 2);

            ctx.restore();
        }

        ctx.restore();
    }
}
