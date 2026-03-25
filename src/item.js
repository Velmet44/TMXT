import { CONFIG } from './config.js';

export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // Object from CONFIG.ITEMS.TYPES
        this.size = CONFIG.ITEMS.RUNTIME.SIZE;
        this.active = true;
        this.life = CONFIG.ITEMS.DESPAWN_TIME;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.vx = 0;
        this.vy = 0;
    }

    update(player, isMagnetActive) {
        if (!this.active) return false;

        this.life -= CONFIG.ITEMS.RUNTIME.LIFE_TICK;
        if (this.life <= 0) {
            this.active = false;
            return false;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distSq = dx * dx + dy * dy;

        // Pickup range (using squared distance for performance)
        const pickupRangeSq = (this.size + player.size / 2) ** 2;
        if (distSq < pickupRangeSq) {
            return true; // Picked up
        }

        // Magnet Pull (Attracts everything EXCEPT other magnets)
        if (isMagnetActive && this.type.id !== 'magnet') {
            // Move towards player
            const dist = Math.sqrt(distSq);
            const speed = CONFIG.ITEMS.RUNTIME.MAGNET_PULL_SPEED;
            this.vx = (dx / dist) * speed;
            this.vy = (dy / dist) * speed;
            this.x += this.vx;
            this.y += this.vy;
        }
        
        return false;
    }

    draw(ctx, camera) {
        if (!this.active) return;
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Don't draw if off-screen (accounting for zoom)
        const zoom = ctx.canvas.width / (ctx.canvas.getBoundingClientRect().width || ctx.canvas.width);
        // Better: just check against the scaled canvas bounds
        // Since we already scaled the context, we check against the unscaled bounds divided by zoom
        // But the Engine class doesn't pass zoom here easily. 
        // Let's use a simpler safe check or just remove the check if it's causing issues.
        // Given the scale is applied, drawing coordinates are in world space.
        
        const canvasW = ctx.canvas.width;
        const canvasH = ctx.canvas.height;
        // If zoom is 0.5, we see more of the world.
        // We can just use large enough bounds to be safe, or pass zoom.
        // Let's assume a reasonable zoom range.
        const margin = CONFIG.ITEMS.RUNTIME.OFFSCREEN_MARGIN;
        if (screenX < -margin || screenX > canvasW + margin || 
            screenY < -margin || screenY > canvasH + margin) return;

        const bob = Math.sin(Date.now() / CONFIG.ITEMS.RUNTIME.BOB_DIVISOR + this.bobOffset) * CONFIG.ITEMS.RUNTIME.BOB_AMPLITUDE;

        ctx.save();
        ctx.translate(screenX, screenY + bob);
        
        // Glow
        ctx.shadowBlur = CONFIG.ITEMS.RUNTIME.GLOW_BLUR;
        ctx.shadowColor = this.type.color;

        // Background Circle
        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Icon/Label
        ctx.fillStyle = '#fff';
        ctx.font = CONFIG.ITEMS.RUNTIME.LABEL_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.label, 0, CONFIG.ITEMS.RUNTIME.LABEL_Y_OFFSET);

        ctx.restore();
    }
}
