import { CONFIG } from './config.js';

export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // Object from CONFIG.ITEMS.TYPES
        this.size = 12;
        this.active = true;
        this.life = CONFIG.ITEMS.DESPAWN_TIME;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.vx = 0;
        this.vy = 0;
    }

    update(player, isMagnetActive) {
        if (!this.active) return false;

        this.life -= 16; // Approx 60fps
        if (this.life <= 0) {
            this.active = false;
            return false;
        }

        // Magnet Pull (Attracts everything EXCEPT other magnets)
        if (isMagnetActive && this.type.id !== 'magnet') {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < 30 * 30) { // Pickup range
                return true; // Picked up
            }

            // Move towards player
            const dist = Math.sqrt(distSq);
            const speed = 12;
            this.vx = (dx / dist) * speed;
            this.vy = (dy / dist) * speed;
            this.x += this.vx;
            this.y += this.vy;
        } else {
            // Normal collision check (or if it's a magnet, it only picks up when player is on top)
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distSq = dx * dx + dy * dy;
            const colDist = this.size + player.size / 2;
            if (distSq < colDist * colDist) {
                return true; // Picked up
            }
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
        if (screenX < -100 || screenX > canvasW + 100 || 
            screenY < -100 || screenY > canvasH + 100) return;

        const bob = Math.sin(Date.now() / 200 + this.bobOffset) * 3;

        ctx.save();
        ctx.translate(screenX, screenY + bob);
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.type.color;

        // Background Circle
        ctx.fillStyle = this.type.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Icon/Label
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.label, 0, 1);

        ctx.restore();
    }
}
