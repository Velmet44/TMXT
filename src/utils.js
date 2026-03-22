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
        this.friction = 0.95;
        this.shineTimer = Math.random() * 10;
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
        const pickupRangeSq = (player.size / 2 + 10) ** 2;
        if (distSq < pickupRangeSq) {
            this.active = false;
            return true;
        }

        const magnetDist = CONFIG.XP_ORB.MAGNET_DIST;
        if (forceMagnet || distSq < magnetDist * magnetDist) {
            const dist = Math.sqrt(distSq);
            // Stronger pull for global magnet
            const pull = forceMagnet ? 15 : this.speed * (1 + (magnetDist - dist) / 50);
            
            this.x += (dx / dist) * pull;
            this.y += (dy / dist) * pull;
        }
        this.shineTimer += 0.1;
        
        if (this.sizePop > 0) {
            this.sizePop *= 0.9;
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

        const shine = Math.sin(this.shineTimer) * 2;
        const currentSize = this.size + shine + this.sizePop;

        // Optimized Glow (Fast)
        ctx.fillStyle = CONFIG.COLORS.XP;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, currentSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.beginPath();
        ctx.arc(sx, sy, currentSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx - 1, sy - 1, 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class SlashParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = Math.random() * Math.PI * 2;
        this.length = Math.random() * 100 + 50;
        this.width = Math.random() * 2 + 1;
        this.speed = Math.random() * 15 + 10;
        this.life = 1.0;
        this.decay = 0.05;
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
        const speed = Math.random() * 6 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.01;
        this.size = Math.random() * 6 + 2;
        this.gravity = 0.15;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.96;
        this.vy *= 0.96;
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
        this.decay = Math.random() * 0.02 + 0.005;
        this.size = Math.random() * 8 + 4;
        this.gravity = 0.25;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 4;
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
        this.vy = -2;
        this.life = 1.0;
        this.decay = 0.02;
    }

    update() {
        this.y += this.vy;
        this.vy *= 0.95;
        this.life -= this.decay;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (!keys.isMobile) ctx.globalAlpha = this.life;
        ctx.fillStyle = this.isCrit ? '#f1c40f' : '#fff';
        ctx.font = `bold ${this.isCrit ? (keys.isMobile ? 18 : 24) : (keys.isMobile ? 12 : 16)}px Segoe UI`;
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
        this.vy = -1.5;
        this.life = 1.0;
        this.decay = 0.02;
    }

    update() {
        this.y += this.vy;
        this.vy *= 0.96;
        this.life -= this.decay;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        ctx.save();
        if (!keys.isMobile) ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = `bold ${keys.isMobile ? 12 : 16}px Segoe UI`;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, sx, sy);
        if (!keys.isMobile) ctx.globalAlpha = 1.0;
        ctx.restore();
    }
}
