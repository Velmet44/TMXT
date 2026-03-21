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
        const magnetDist = CONFIG.XP_ORB.MAGNET_DIST;

        if (forceMagnet || distSq < magnetDist * magnetDist) {
            const dist = Math.sqrt(distSq);
            // Stronger pull for global magnet
            const pull = forceMagnet ? 15 : this.speed * (1 + (magnetDist - dist) / 50);
            
            if (dist > 0) {
                this.x += (dx / dist) * pull;
                this.y += (dy / dist) * pull;
            }
            
            if (dist < player.size / 2 + 10) { // Slightly larger pickup radius
                this.active = false;
                return true;
            }
        }
        this.shineTimer += 0.1;
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
        const currentSize = this.size + shine;

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

export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vx *= 0.95;
        this.vy *= 0.95;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        if (!keys.isMobile) ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(sx - this.size/2, sy - this.size/2, this.size, this.size);
        if (!keys.isMobile) ctx.globalAlpha = 1.0;
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

// PROCEDURAL SOUNDS USING WEB AUDIO API
class SoundManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    play(type) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        switch (type) {
            case 'shoot':
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'hit':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'xp':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880 + Math.random() * 440, now);
                osc.frequency.exponentialRampToValueAtTime(1760, now + 0.05);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
            case 'lvlup':
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, i) => {
                    const o = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    o.connect(g);
                    g.connect(this.ctx.destination);
                    o.frequency.setValueAtTime(freq, now + i * 0.1);
                    g.gain.setValueAtTime(0.1, now + i * 0.1);
                    g.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.3);
                    o.start(now + i * 0.1);
                    o.stop(now + i * 0.1 + 0.3);
                });
                break;
            case 'dash':
                osc.type = 'white' || 'triangle';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
        }
    }
}

export const SOUNDS = new SoundManager();
