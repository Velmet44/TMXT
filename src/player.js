import { CONFIG } from './config.js';
import { keys } from './input.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PLAYER.SIZE;
        
        // Base Stats
        this.maxHp = CONFIG.PLAYER.MAX_HP;
        this.hp = CONFIG.PLAYER.MAX_HP;
        this.speed = CONFIG.PLAYER.SPEED;
        this.regen = CONFIG.PLAYER.REGEN;
        this.damage = CONFIG.PLAYER.DAMAGE;
        this.atkRange = CONFIG.PLAYER.ATTACK_RANGE;
        this.atkCooldown = CONFIG.PLAYER.ATTACK_COOLDOWN;
        this.lifesteal = CONFIG.PLAYER.LIFESTEAL;
        this.projCount = CONFIG.PLAYER.PROJ_COUNT;
        
        // Energy Stats
        this.maxEnergy = CONFIG.PLAYER.MAX_ENERGY;
        this.energy = this.maxEnergy;
        this.energyRegenMult = 1.0;
        this.isDashing = false;
        this.dashStartTime = 0;
        this.dashDir = { x: 0, y: 0 };
        
        // Ability State
        this.isChargedUp = false;
        this.chargeUpEndTime = 0;
        
        // Leveling
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 10;
        
        // Animation & State
        this.state = 'idle'; 
        this.frame = 0;
        this.facing = 1;
        this.isAttacking = false;
        this.lastAttack = 0;
        this.isDead = false;
        
        // Gun Stats
        this.gunRecoil = 0;
        
        // Sprite Selection
        this.sprite = new Image();
        this.sprite.src = 'assets/char_1.svg';
    }

    setCharacter(index) {
        this.sprite.src = `assets/char_${index}.svg`;
    }

    update() {
        if (this.isDead) return;

        const now = Date.now();

        // 1. Passive Regen (HP & Energy)
        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.regen);
        }

        // Energy Regen (Idle vs Walk)
        let eRegen = (this.state === 'idle') ? CONFIG.PLAYER.ENERGY_REGEN_IDLE : CONFIG.PLAYER.ENERGY_REGEN_WALK;
        this.energy = Math.min(this.maxEnergy, this.energy + eRegen * this.energyRegenMult);

        // 2. Dash Handling
        if (keys.control && !this.isDashing && this.energy >= CONFIG.PLAYER.DASH_COST) {
            this.startDash();
        }

        if (this.isDashing) {
            if (now - this.dashStartTime < CONFIG.PLAYER.DASH_DURATION) {
                this.x += this.dashDir.x * CONFIG.PLAYER.DASH_SPEED;
                this.y += this.dashDir.y * CONFIG.PLAYER.DASH_SPEED;
                return; // Lock other movement during dash
            } else {
                this.isDashing = false;
            }
        }

        // 3. Ability Handling (Needs Level 5 and 100 energy)
        // Remapped to 'z' and added slots for x, c, v
        if (keys.z && this.level >= 5 && !this.isChargedUp && this.energy >= CONFIG.PLAYER.ABILITY_COST) {
            this.activateChargeUp();
        }
        
        // Placeholder for future abilities
        if (keys.x) { /* Slot 2 */ }
        if (keys.c) { /* Slot 3 */ }
        if (keys.v) { /* Slot 4 */ }

        if (this.isChargedUp && now > this.chargeUpEndTime) {
            this.isChargedUp = false;
        }

        // 4. Movement
        let moveX = 0;
        let moveY = 0;

        // Support both keyboard and mobile joystick
        if (keys.isMobile) {
            moveX = keys.mobileX;
            moveY = keys.mobileY;
        } else {
            if (keys.w) moveY -= 1;
            if (keys.s) moveY += 1;
            if (keys.a) moveX -= 1;
            if (keys.d) moveX += 1;
        }

        if (moveX !== 0 || moveY !== 0) {
            const mag = Math.sqrt(moveX * moveX + moveY * moveY);
            // Normalize keyboard input but keep joystick's analog value
            const speedMult = keys.isMobile ? mag : 1;
            moveX = (moveX / (mag || 1)) * this.getCurrentSpeed() * speedMult;
            moveY = (moveY / (mag || 1)) * this.getCurrentSpeed() * speedMult;
            this.state = 'walking';
            if (moveX !== 0) this.facing = Math.sign(moveX);
            this.dashDir = { x: moveX / (this.getCurrentSpeed() * speedMult || 1), y: moveY / (this.getCurrentSpeed() * speedMult || 1) };
        } else {
            this.state = 'idle';
        }

        this.x += moveX;
        this.y += moveY;

        const animSpeed = this.state === 'walking' ? 0.15 : 0.05;
        this.frame += animSpeed;

        if (this.isAttacking && now - this.lastAttack > 200) {
            this.isAttacking = false;
        }

        // Recoil recovery
        this.gunRecoil *= 0.8;

        if (this.hp <= 0) {
            this.isDead = true;
            this.hp = 0;
        }
    }

    getCurrentSpeed() {
        return this.isChargedUp ? this.speed * 1.5 : this.speed;
    }

    getCurrentDamage() {
        return this.isChargedUp ? this.damage * 2 : this.damage;
    }

    getCurrentAtkCooldown() {
        return this.isChargedUp ? this.atkCooldown * 0.5 : this.atkCooldown;
    }

    startDash() {
        if (this.dashDir.x === 0 && this.dashDir.y === 0) {
            this.dashDir = { x: this.facing, y: 0 };
        }
        this.energy -= CONFIG.PLAYER.DASH_COST;
        this.isDashing = true;
        this.dashStartTime = Date.now();
    }

    activateChargeUp() {
        this.energy -= CONFIG.PLAYER.ABILITY_COST;
        this.isChargedUp = true;
        this.chargeUpEndTime = Date.now() + CONFIG.PLAYER.CHARGEUP_DURATION;
    }

    addXP(amount) {
        const xpGain = this.difficulty ? amount * this.difficulty.xpMult : amount;
        this.xp += xpGain;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.round(this.xpToNext * 2);
            
            // PASSIVE STAT GROWTH
            this.maxHp += 5;
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1);
            this.damage += 1;
            this.regen += 0.005;
            this.speed += 0.05;
            this.atkRange += 5;
            
            // Energy Growth
            this.maxEnergy += 10;
            this.energyRegenMult += 0.05;

            if (this.level % 2 === 1 && this.level > 1) {
                this.projCount += 1;
            }

            return true;
        }
        return false;
    }

    attack(targetX, targetY) {
        this.isAttacking = true;
        this.lastAttack = Date.now();
        this.facing = targetX > this.x ? 1 : -1;
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();
        ctx.translate(screenX, screenY);
        
        if (this.isDead) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.restore();
            return;
        }

        // Dash trail effect (Simple)
        if (this.isDashing) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = CONFIG.COLORS.ENERGY;
            ctx.fillRect(-this.size/2 - 20 * this.dashDir.x, -this.size/2 - 20 * this.dashDir.y, this.size, this.size);
            ctx.globalAlpha = 1.0;
        }

        // Chargeup Glow
        if (this.isChargedUp && !keys.isMobile) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#e74c3c';
        }

        ctx.scale(this.facing, 1);

        const idleBob = Math.sin(this.frame) * 2;
        const walkBounce = Math.abs(Math.sin(this.frame * 2)) * 6;
        const walkTilt = Math.sin(this.frame * 2) * 0.1;
        
        const currentBounce = this.state === 'walking' ? -walkBounce : -idleBob;
        if (this.state === 'walking') ctx.rotate(walkTilt);

        // Shadow
        if (!keys.isMobile) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(0, this.size/2, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // New Character Sprite
        ctx.drawImage(this.sprite, -this.size/2 - 4, -this.size/2 - 12 + currentBounce, this.size + 8, this.size + 16);

        // Futuristic Gun (Blaster)
        ctx.save();
        const gunX = 15 - this.gunRecoil;
        const gunY = -2 + currentBounce;
        ctx.translate(gunX, gunY);
        
        if (this.isAttacking) {
            ctx.rotate(-0.2); // Recoil tilt
            
            // Muzzle Flash
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(22, 0, 8 + Math.random() * 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(22, 0, 5 + Math.random() * 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Gun Body
        ctx.fillStyle = '#34495e';
        ctx.fillRect(0, -3, 18, 6); // Frame
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-2, -1, 5, 8); // Grip
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(16, -4, 8, 4); // Barrel
        
        // Energy Light
        ctx.fillStyle = this.isChargedUp ? '#e74c3c' : '#3498db';
        ctx.fillRect(4, -1.5, 8, 2);
        
        ctx.restore();

        ctx.restore();
    }
}
