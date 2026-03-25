import { CONFIG } from './config.js';
import { keys } from './input.js';

export class XPOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.size = CONFIG.XP_ORB.SIZE;
        this.active = true;
        this.speed = CONFIG.XP_ORB.SPEED;
        this.spawnTime = Date.now();
        
        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * CONFIG.XP_ORB.EXPLOSION_FORCE;
        this.vx = Math.cos(angle) * force;
        this.vy = Math.sin(angle) * force;
        this.friction = CONFIG.XP_ORB.RUNTIME.FRICTION;
        this.shineTimer = Math.random() * CONFIG.XP_ORB.RUNTIME.SHINE_INIT_MAX;
        this.sizePop = 0;
    }

    update(player, forceMagnet = false) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= this.friction;
        this.vy *= this.friction;

        const now = Date.now();
        if (now - this.spawnTime < CONFIG.XP_ORB.PICKUP_DELAY) return false;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx * dx + dy * dy;
        
        // Pickup range (using squared distance for performance)
        const pickupRangeSq = (player.size / 2 + CONFIG.XP_ORB.RUNTIME.PICKUP_RADIUS_PAD) ** 2;
        if (distSq < pickupRangeSq) {
            this.active = false;
            return true;
        }

        const magnetDist = CONFIG.XP_ORB.MAGNET_DIST;
        if (forceMagnet || distSq < magnetDist * magnetDist) {
            const dist = Math.sqrt(distSq);
            // Stronger pull for global magnet
            const pull = forceMagnet ? CONFIG.XP_ORB.RUNTIME.GLOBAL_PULL_SPEED : this.speed * (1 + (magnetDist - dist) / CONFIG.XP_ORB.RUNTIME.LOCAL_PULL_DIVISOR);
            
            this.x += (dx / dist) * pull;
            this.y += (dy / dist) * pull;
        }
        this.shineTimer += CONFIG.XP_ORB.RUNTIME.SHINE_STEP;
        
        if (this.sizePop > 0) {
            this.sizePop *= CONFIG.XP_ORB.RUNTIME.SIZE_POP_DAMP;
        }

        return false;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        if (keys.isMobile) {
            ctx.fillStyle = CONFIG.COLORS.XP;
            ctx.beginPath();
            ctx.arc(sx, sy, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const shine = Math.sin(this.shineTimer) * CONFIG.XP_ORB.RUNTIME.SHINE_AMPLITUDE;
        const currentSize = this.size + shine + this.sizePop;

        // Optimized Glow (Fast)
        ctx.fillStyle = CONFIG.COLORS.XP;
        ctx.globalAlpha = CONFIG.XP_ORB.RUNTIME.GLOW_ALPHA;
        ctx.beginPath();
        ctx.arc(sx, sy, currentSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.beginPath();
        ctx.arc(sx, sy, currentSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - CONFIG.XP_ORB.RUNTIME.HIGHLIGHT_OFFSET, sy - CONFIG.XP_ORB.RUNTIME.HIGHLIGHT_OFFSET, CONFIG.XP_ORB.RUNTIME.HIGHLIGHT_SIZE, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class SlashParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = Math.random() * Math.PI * 2;
        this.length = Math.random() * CONFIG.EFFECTS.SLASH.LENGTH_RANGE + CONFIG.EFFECTS.SLASH.LENGTH_MIN;
        this.width = Math.random() * CONFIG.EFFECTS.SLASH.WIDTH_RANGE + CONFIG.EFFECTS.SLASH.WIDTH_MIN;
        this.speed = Math.random() * CONFIG.EFFECTS.SLASH.SPEED_RANGE + CONFIG.EFFECTS.SLASH.SPEED_MIN;
        this.life = CONFIG.EFFECTS.SLASH.LIFE;
        this.decay = CONFIG.EFFECTS.SLASH.DECAY;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.beginPath();
        ctx.moveTo(sx - Math.cos(this.angle) * this.length/2, sy - Math.sin(this.angle) * this.length/2);
        ctx.lineTo(sx + Math.cos(this.angle) * this.length/2, sy + Math.sin(this.angle) * this.length/2);
        ctx.stroke();
        ctx.restore();
    }
}

export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * CONFIG.EFFECTS.PARTICLE.BASE_SPEED_RANGE + CONFIG.EFFECTS.PARTICLE.BASE_SPEED_MIN;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = CONFIG.EFFECTS.SLASH.LIFE;
        this.decay = Math.random() * CONFIG.EFFECTS.PARTICLE.BASE_DECAY_RANGE + CONFIG.EFFECTS.PARTICLE.BASE_DECAY_MIN;
        this.size = Math.random() * CONFIG.EFFECTS.PARTICLE.BASE_SIZE_RANGE + CONFIG.EFFECTS.PARTICLE.BASE_SIZE_MIN;
        this.gravity = CONFIG.EFFECTS.PARTICLE.BASE_GRAVITY;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * CONFIG.EFFECTS.PARTICLE.BASE_ROT_SPEED;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= CONFIG.EFFECTS.PARTICLE.BASE_VEL_DAMP;
        this.vy *= CONFIG.EFFECTS.PARTICLE.BASE_VEL_DAMP;
        this.life -= this.decay;
        this.rotation += this.rotSpeed;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.rotation);
        if (!keys.isMobile) ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        const s = this.size * this.life;
        ctx.fillRect(-s/2, -s/2, s, s);
        ctx.restore();
    }
}

export class BloodParticle extends Particle {
    constructor(x, y) {
        super(x, y, '#e74c3c');
        this.decay = Math.random() * CONFIG.EFFECTS.PARTICLE.BLOOD_DECAY_RANGE + CONFIG.EFFECTS.PARTICLE.BLOOD_DECAY_MIN;
        this.size = Math.random() * CONFIG.EFFECTS.PARTICLE.BLOOD_SIZE_RANGE + CONFIG.EFFECTS.PARTICLE.BLOOD_SIZE_MIN;
        this.gravity = CONFIG.EFFECTS.PARTICLE.BLOOD_GRAVITY;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * CONFIG.EFFECTS.PARTICLE.BLOOD_SPEED_RANGE + CONFIG.EFFECTS.PARTICLE.BLOOD_SPEED_MIN;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        if (!keys.isMobile) ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        // Blood is more like droplets
        ctx.beginPath();
        ctx.arc(sx, sy, this.size * this.life / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class DamageNumber {
    constructor(x, y, amount, isCrit = false) {
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.isCrit = isCrit;
        this.vy = CONFIG.EFFECTS.FLOATING_TEXT.DAMAGE_VY;
        this.life = CONFIG.EFFECTS.SLASH.LIFE;
        this.decay = CONFIG.EFFECTS.FLOATING_TEXT.DAMAGE_DECAY;
    }

    update() {
        this.y += this.vy;
        this.vy *= CONFIG.EFFECTS.FLOATING_TEXT.DAMAGE_VY_DAMP;
        this.life -= this.decay;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (!keys.isMobile) ctx.globalAlpha = this.life;
        ctx.fillStyle = this.isCrit ? '#f1c40f' : '#fff';
        const fontCfg = CONFIG.EFFECTS.FLOATING_TEXT.FONT;
        ctx.font = `bold ${this.isCrit ? (keys.isMobile ? fontCfg.CRIT_MOBILE : fontCfg.CRIT_PC) : (keys.isMobile ? fontCfg.BASE_MOBILE : fontCfg.BASE_PC)}px Segoe UI`;
        ctx.textAlign = 'center';
        
        const text = typeof this.amount === 'number' ? Math.round(this.amount) : this.amount;
        ctx.fillText(text, sx, sy);
        
        if (this.isCrit && !keys.isMobile) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeText(text, sx, sy);
        }
        if (!keys.isMobile) ctx.globalAlpha = 1.0;
    }
}

// Floating label shown when items are picked up
export class ItemLabel {
    constructor(x, y, text, color = '#fff') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.vy = CONFIG.EFFECTS.FLOATING_TEXT.ITEM_LABEL_VY;
        this.life = CONFIG.EFFECTS.SLASH.LIFE;
        this.decay = CONFIG.EFFECTS.FLOATING_TEXT.ITEM_LABEL_DECAY;
    }

    update() {
        this.y += this.vy;
        this.vy *= CONFIG.EFFECTS.FLOATING_TEXT.ITEM_LABEL_VY_DAMP;
        this.life -= this.decay;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        if (!keys.isMobile) ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        const fontCfg = CONFIG.EFFECTS.FLOATING_TEXT.FONT;
        ctx.font = `bold ${keys.isMobile ? fontCfg.BASE_MOBILE : fontCfg.BASE_PC}px Segoe UI`;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, sx, sy);
        if (!keys.isMobile) ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}
