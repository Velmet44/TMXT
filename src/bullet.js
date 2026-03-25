import { CONFIG } from './config.js';

export class Bullet {
    constructor(x, y, targetX, targetY, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.isEnemy = isEnemy;
        this.size = isEnemy ? CONFIG.BULLET.ENEMY_SIZE : CONFIG.BULLET.SIZE;
        this.speed = isEnemy ? CONFIG.ENEMY.SKELETON.PROJ_SPEED : CONFIG.BULLET.SPEED;
        this.damage = isEnemy ? CONFIG.ENEMY.SKELETON.DAMAGE : CONFIG.BULLET.DAMAGE;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Juice: Random variation in speed and spread
        const speedVar = isEnemy ? 1 : CONFIG.BULLET.PLAYER_SPEED_VAR_MIN + Math.random() * CONFIG.BULLET.PLAYER_SPEED_VAR_RANGE;
        this.vx = (dx / dist) * this.speed * speedVar;
        this.vy = (dy / dist) * this.speed * speedVar;
        
        if (!isEnemy) {
            this.size *= CONFIG.BULLET.PLAYER_SIZE_VAR_MIN + Math.random() * CONFIG.BULLET.PLAYER_SIZE_VAR_RANGE;
        }

        this.active = true;
        this.angle = Math.atan2(dy, dx);
        this.frame = Math.random() * CONFIG.XP_ORB.RUNTIME.SHINE_INIT_MAX;
        this.trail = [];
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > CONFIG.BULLET.TRAIL_LENGTH) this.trail.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.frame += CONFIG.BULLET.FRAME_STEP;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // Draw trail in world space (no rotation) to avoid stray lines
        if (!this.isEnemy && this.trail.length > 1) {
            ctx.save();
            ctx.globalAlpha = CONFIG.BULLET.TRAIL_ALPHA;
            ctx.strokeStyle = CONFIG.COLORS.BULLET;
            ctx.lineWidth = Math.max(CONFIG.BULLET.TRAIL_MIN_WIDTH, this.size / 2);
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
            ctx.fillRect(CONFIG.BULLET.ENEMY_ARROW.BODY_X, CONFIG.BULLET.ENEMY_ARROW.BODY_Y, CONFIG.BULLET.ENEMY_ARROW.BODY_W, CONFIG.BULLET.ENEMY_ARROW.BODY_H);
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.moveTo(CONFIG.BULLET.ENEMY_ARROW.TIP_X, 0);
            ctx.lineTo(CONFIG.BULLET.ENEMY_ARROW.WING_X, -CONFIG.BULLET.ENEMY_ARROW.WING_Y);
            ctx.lineTo(CONFIG.BULLET.ENEMY_ARROW.WING_X, CONFIG.BULLET.ENEMY_ARROW.WING_Y);
            ctx.fill();
        } else {
            // Futuristic Energy Bolt
            const color = CONFIG.COLORS.BULLET;
            const pulse = Math.sin(this.frame) * CONFIG.BULLET.PLAYER_VISUAL.PULSE_AMPLITUDE;
            
            // Outer glow trail
            ctx.globalAlpha = CONFIG.BULLET.PLAYER_VISUAL.OUTER_ALPHA;
            ctx.fillStyle = color;
            ctx.fillRect(-this.size * CONFIG.BULLET.PLAYER_VISUAL.OUTER_LEN_MULT, -this.size - pulse/2, this.size * CONFIG.BULLET.PLAYER_VISUAL.OUTER_WIDTH_MULT, (this.size + pulse) * 2);
            
            // Inner core
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.size, -this.size / 2, this.size * CONFIG.BULLET.PLAYER_VISUAL.CORE_LEN_MULT, this.size);
        }

        ctx.restore();
    }
}
