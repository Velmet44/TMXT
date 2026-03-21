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
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
        this.active = true;
        this.angle = Math.atan2(dy, dx);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

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
            
            // Outer glow trail (Fast)
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = color;
            ctx.fillRect(-this.size * 4, -this.size, this.size * 5, this.size * 2);
            
            // Inner core
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.size, -this.size / 2, this.size * 2.5, this.size);
        }

        ctx.restore();
    }
}
