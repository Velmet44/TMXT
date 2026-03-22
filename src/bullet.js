import { CONFIG } from './config.js';

export class Bullet {
    constructor(x, y, targetX, targetY, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.isEnemy = isEnemy;
        this.size = isEnemy ? 4 : CONFIG.BULLET.SIZE;
        this.speed = isEnemy ? CONFIG.ENEMY.SKELETON.PROJ_SPEED : CONFIG.BULLET.SPEED;
        this.damage = isEnemy ? CONFIG.ENEMY.SKELETON.DAMAGE : CONFIG.BULLET.DAMAGE;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Juice: Random variation in speed and spread
        const speedVar = isEnemy ? 1 : 0.8 + Math.random() * 0.4;
        this.vx = (dx / dist) * this.speed * speedVar;
        this.vy = (dy / dist) * this.speed * speedVar;
        
        if (!isEnemy) {
            this.size *= 0.8 + Math.random() * 0.4;
        }

        this.active = true;
        this.angle = Math.atan2(dy, dx);
        this.frame = Math.random() * 10;
        this.trail = [];
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.frame += 0.2;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // Draw trail in world space (no rotation) to avoid stray lines
        if (!this.isEnemy && this.trail.length > 1) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = CONFIG.COLORS.BULLET;
            ctx.lineWidth = Math.max(1, this.size / 2);
            ctx.beginPath();
            this.trail.forEach((p, i) => {
                const tx = p.x - camera.x;
                const ty = p.y - camera.y;
                if (i === 0) ctx.moveTo(tx, ty);
                else ctx.lineTo(tx, ty);
            });
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);

        if (this.isEnemy) {
            // Arrow
            ctx.fillStyle = CONFIG.COLORS.ARROW;
            ctx.fillRect(-10, -1, 20, 2);
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(5, -3);
            ctx.lineTo(5, 3);
            ctx.fill();
        } else {
            // Futuristic Energy Bolt
            const color = CONFIG.COLORS.BULLET;
            const pulse = Math.sin(this.frame) * 2;
            
            // Outer glow trail
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = color;
            ctx.fillRect(-this.size * 6, -this.size - pulse/2, this.size * 7, (this.size + pulse) * 2);
            
            // Inner core
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.size, -this.size / 2, this.size * 3, this.size);
        }

        ctx.restore();
    }
}
