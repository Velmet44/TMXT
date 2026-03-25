import { CONFIG } from './config.js';
import { keys } from './input.js';

export class Enemy {
    constructor(x, y, maxLevel = 1, type = 'zombie', difficulty = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.difficulty = difficulty || { enemyHp: 1, enemySpeed: 1, enemyDmg: 1 };
        
        const cfg = CONFIG.ENEMY[this.type.toUpperCase()] || CONFIG.ENEMY.ZOMBIE;
        const def = CONFIG.ENEMY.DEFAULT;

        this.maxLevel = Math.min(maxLevel, def.MAX_LEVEL);
        this.level = 1;
        this.levelUpTime = cfg.LEVEL_UP_TIME;
        
        this.baseSpeed = cfg.SPEED * (0.9 + Math.random() * 0.2) * this.difficulty.enemySpeed;
        this.baseHp = cfg.HP * this.difficulty.enemyHp;
        this.baseDamage = cfg.DAMAGE * this.difficulty.enemyDmg;
        this.baseAttackCooldown = cfg.ATTACK_COOLDOWN;
        this.range = cfg.RANGE;
        
        this.updateStats();
        
        this.hp = this.maxHp;
        this.size = cfg.SIZE;
        this.frame = Math.random() * 10;
        this.isHit = false;
        this.hitTimer = 0;
        this.isDead = false;
        this.deathTimer = 0;
        this.facing = Math.random() > 0.5 ? 1 : -1;
        this.levelTickCounter = 0;

        this.lastAttackTime = 0;
        
        // Exploder specific
        this.isExploding = false;
        this.fuseTimer = 0;
        this.dropsSpawned = false;
        this.scalePop = 0;
    }

    updateStats() {
        const def = CONFIG.ENEMY.DEFAULT;
        const scaling = def.SCALING;
        const multiplier = Math.pow(scaling.HP, this.level - 1);
        const prevMaxHp = this.maxHp || this.baseHp;
        
        this.maxHp = this.baseHp * multiplier;
        this.speed = this.baseSpeed * Math.pow(scaling.SPEED, this.level - 1);
        this.damage = this.baseDamage * Math.pow(scaling.DAMAGE, this.level - 1);
        
        // Attack Cooldown decreases with level (faster attacks)
        this.attackCooldown = this.baseAttackCooldown * Math.pow(0.95, this.level - 1);
        
        if (this.hp !== undefined) {
            this.hp = (this.hp / prevMaxHp) * this.maxHp;
        }
    }

    update(player, camera, canvas, onAttack) {
        // Early exit for death while still letting death timer advance
        if (this.isDead) {
            this.deathTimer += 0.05;
            return;
        }

        // Enemies should still die even when stunned; handle health before stun return
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            this.deathTimer = 0;
            return;
        }

        if (this.stunUntil && Date.now() < this.stunUntil) {
            this.frame += 0.05;
            return;
        }

        // Level up logic based on time since spawn
        this.levelTickCounter++;
        const ticksPerLevel = 60 * (this.levelUpTime / 1000);
        if (this.levelTickCounter >= ticksPerLevel) {
            if (this.level < this.maxLevel) {
                this.level++;
                this.updateStats();
            }
            this.levelTickCounter = 0;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx * dx + dy * dy;

        const def = CONFIG.ENEMY.DEFAULT;
        if (distSq > def.DESPAWN_DISTANCE * def.DESPAWN_DISTANCE) {
            this.hp = -999;
            return;
        }

        const dist = Math.sqrt(distSq);
        this.facing = dx > 0 ? 1 : -1;

        if (this.type === 'zombie' || this.type === 'exploder') {
            if (dist > 5) {
                // Exploder moves faster but stops when exploding
                const currentSpeed = (this.type === 'exploder' && this.isExploding) ? 0 : this.speed;
                this.x += (dx / dist) * currentSpeed;
                this.y += (dy / dist) * currentSpeed;
            }
            
            if (this.type === 'exploder') {
                if (dist < this.range && !this.isExploding) {
                    this.isExploding = true;
                    this.fuseTimer = Date.now();
                }
                
                if (this.isExploding && Date.now() - this.fuseTimer > this.baseAttackCooldown) { // Using baseAttackCooldown as fuse time
                    this.hp = 0; // Trigger death/explosion
                    if (onAttack) onAttack(this, player); // Explosion damage is handled via onAttack
                }
            }
        } else if (this.type === 'skeleton') {
            const range = this.range;
            if (dist > range) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            } else if (dist < range - 50) {
                this.x -= (dx / dist) * this.speed;
                this.y -= (dy / dist) * this.speed;
            }

            const now = Date.now();
            if (dist < range + 50 && now - this.lastAttackTime > this.attackCooldown) {
                this.lastAttackTime = now;
                if (onAttack) onAttack(this, player);
            }
        }

        this.frame += 0.1;
        if (this.isHit) this.hitTimer++;
        if (this.hitTimer > 10) { // Increased for better flash visibility
            this.isHit = false;
            this.hitTimer = 0;
        }

        // Juice: Scale Pop decay
        if (this.scalePop > 0) {
            this.scalePop *= 0.8;
            if (this.scalePop < 0.01) this.scalePop = 0;
        }

        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            this.deathTimer = 0;
        }
    }

    canAttack() {
        if (this.type === 'exploder') return false; // Exploder damage handled by fusion
        return Date.now() - this.lastAttackTime > this.attackCooldown;
    }

    resetAttackCooldown() {
        this.lastAttackTime = Date.now();
    }

    takeDamage(amount) {
        if (this.type === 'exploder' && this.isExploding) return; // Invincible once fuse starts
        this.hp -= amount;
        this.isHit = true;
        this.hitTimer = 0;
        // Visual 'pop' when hit
        this.scalePop = 0.2;

        // Allow death immediately while stunned so loot/xp can spawn
        if (this.hp <= 0 && !this.isDead) {
            this.hp = 0;
            this.isDead = true;
            this.deathTimer = 0;
        }
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        ctx.save();
        ctx.translate(sx, sy);

        if (this.isDead) {
            const alpha = Math.max(0, 1 - this.deathTimer);
            ctx.globalAlpha = alpha;
            ctx.scale(1 + this.deathTimer, 1 - this.deathTimer * 0.5);
        }

        if (this.stunUntil && Date.now() < this.stunUntil) {
            ctx.globalAlpha = Math.max(0.4, ctx.globalAlpha * 0.7);
        }

        let mainColor = this.type === 'zombie' ? CONFIG.COLORS.ZOMBIE : (this.type === 'skeleton' ? CONFIG.COLORS.SKELETON : CONFIG.COLORS.LADYBUG);
        let scale = (1 + (this.level - 1) * 0.1) * (1 + this.scalePop);
        
        // Exploder flashing
        if (this.isExploding) {
            const flash = Math.sin(Date.now() * 0.02) > 0;
            if (flash) mainColor = '#fff';
            scale *= 1.2;
        }

        ctx.scale(this.facing * scale, scale);

        const limp = Math.cos(this.frame * 0.5) * 4;
        const sway = Math.sin(this.frame) * 3;

        if (!keys.isMobile) {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(0, this.size/2, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.type === 'zombie') {
            ctx.fillStyle = (this.level >= 7) ? '#1a1a1a' : CONFIG.COLORS.ZOMBIE_CLOTHES;
            ctx.fillRect(-this.size/2, 0, this.size, this.size/2);
            ctx.fillStyle = this.isHit ? '#fff' : mainColor;
            ctx.fillRect(-this.size/2 - 2, -this.size/2 + limp, this.size + 4, this.size/2 + 2);
            ctx.fillRect(this.size/2, -5 + sway + limp, 12, 6);
        } else if (this.type === 'skeleton') {
            ctx.fillStyle = this.isHit ? '#fff' : mainColor;
            ctx.fillRect(-this.size/2 + 4, -this.size/2 + limp, this.size - 8, this.size);
            ctx.fillRect(-this.size/2 + 2, -this.size/2 - 10 + limp, this.size - 4, 12);
            ctx.strokeStyle = '#8e44ad';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.size/2 + 5, limp, 10, -Math.PI/2, Math.PI/2);
            ctx.stroke();
        } else if (this.type === 'exploder') {
            // Ladybug design
            ctx.fillStyle = this.isHit ? '#fff' : mainColor;
            ctx.beginPath();
            ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Black head
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.size/3, 0, this.size/4, 0, Math.PI * 2);
            ctx.fill();
            
            // Spots
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.arc(-2, -3, 2, 0, Math.PI * 2);
            ctx.arc(-2, 3, 2, 0, Math.PI * 2);
            ctx.arc(-6, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.type !== 'exploder') {
            ctx.fillStyle = '#000';
            ctx.fillRect(4, -8 + limp, 4, 4);
            ctx.fillRect(-3, -8 + limp, 4, 4);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(5, -7 + limp, 2, 2);
        }

        ctx.scale(1/(this.facing * scale), 1/scale);
        if (this.hp < this.maxHp && !this.isDead && this.type !== 'exploder') {
            const barW = this.size * scale;
            const barH = 5;
            ctx.fillStyle = '#000';
            ctx.fillRect(-barW/2, - (this.size * scale) / 2 - 20, barW, barH);
            ctx.fillStyle = (this.level >= 8) ? '#f1c40f' : '#2ecc71';
            ctx.fillRect(-barW/2, - (this.size * scale) / 2 - 20, barW * (this.hp / this.maxHp), barH);
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${10 + this.level}px Segoe UI`;
            ctx.textAlign = 'center';
            ctx.fillText(`Lv.${this.level}`, 0, - (this.size * scale) / 2 - 25);
        }

        if (this.stunUntil && Date.now() < this.stunUntil) {
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.8, this.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
