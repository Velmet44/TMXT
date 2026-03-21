import { CONFIG, UPGRADES } from './config.js';
import { Bullet } from './bullet.js';
import { XPOrb, Particle, DamageNumber } from './utils.js';
import { Enemy } from './enemy.js';
import { keys } from './input.js';

export class Engine {
    constructor(canvas, player) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.player = player;
        this.camera = { x: 0, y: 0 };
        this.enemies = [];
        this.bullets = [];
        this.xpOrbs = [];
        this.particles = [];
        this.damageNumbers = [];
        this.startTime = Date.now();
        this.lastSpawn = 0;
        this.isPaused = false;
        this.isStarted = false;
        this.difficulty = null;
        this.wasEscapeDown = false;
        this.screenShake = 0;
        
        // Optimization: Larger tiles on mobile to reduce draw calls
        this.tileSize = keys.isMobile ? CONFIG.TILE_SIZE * 2 : CONFIG.TILE_SIZE;

        this.resize();
        this.updateHUD();
        this.initUI();
        window.addEventListener('resize', () => this.resize());
    }

    initUI() {
        document.getElementById('resume-btn').onclick = () => this.togglePause();
        
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.isStarted = true;
                this.startTime = Date.now();
                this.lastSpawn = Date.now();
                
                // Set difficulty from keys
                const diffKey = keys.currentDifficulty || 'NORMAL';
                this.difficulty = CONFIG.DIFFICULTIES[diffKey];
                this.player.difficulty = this.difficulty;
                this.player.setCharacter(keys.selectedCharIndex || 1);
                
                // Adjust Player HP
                this.player.maxHp = Math.round(this.player.maxHp * this.difficulty.hpMult);
                this.player.hp = this.player.maxHp;

                // Auto Fullscreen on mobile
                if (keys.isMobile && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            });
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const menu = document.getElementById('escape-menu');
        if (this.isPaused) {
            menu.classList.remove('hidden');
            this.updateStatsGrid('pause-stats');
        } else {
            menu.classList.add('hidden');
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.zoom = keys.isMobile ? CONFIG.CAMERA.ZOOM_MOBILE : CONFIG.CAMERA.ZOOM_PC;
    }

    update() {
        if (!this.isStarted) return;
        
        if (keys.escape && !this.wasEscapeDown && !this.player.isDead && !document.getElementById('level-up-screen').offsetParent) {
            this.togglePause();
        }
        this.wasEscapeDown = keys.escape;

        if (this.isPaused || this.player.isDead) {
            if (this.player.isDead) {
                const screen = document.getElementById('death-screen');
                if (screen.classList.contains('hidden')) {
                    screen.classList.remove('hidden');
                    const timerText = document.getElementById('timer').innerText;
                    document.getElementById('final-time').innerText = timerText;
                    this.updateStatsGrid('death-stats');
                }
            }
            return;
        }

        this.player.update();
        if (this.player.isDashing) this.screenShake = Math.max(this.screenShake, 5);
        if (this.player.isChargedUp && Math.random() < 0.1) this.screenShake = Math.max(this.screenShake, 2);

        this.updateHUD();

        // Smoother camera with zoom consideration
        const targetCamX = this.player.x - (this.canvas.width / 2) / this.zoom;
        const targetCamY = this.player.y - (this.canvas.height / 2) / this.zoom;
        this.camera.x += (targetCamX - this.camera.x) * CONFIG.PLAYER.LERP;
        this.camera.y += (targetCamY - this.camera.y) * CONFIG.PLAYER.LERP;

        if (this.screenShake > 0) {
            this.screenShake *= 0.9;
            if (this.screenShake < 0.1) this.screenShake = 0;
        }

        const now = Date.now();
        const elapsedTime = (now - this.startTime) / 1000;
        
        // Ramp difficulty every full minute using config multiplier
        const minutesElapsed = Math.floor(elapsedTime / 60);
        const diffMultiplier = Math.pow(CONFIG.SPAWN_SCALING.PER_MINUTE_MULT, minutesElapsed);

        const globalDifficulty = Math.min(CONFIG.ENEMY.DEFAULT.MAX_LEVEL, Math.floor(1 + elapsedTime / 30)); 
        const spawnRate = Math.max(
            CONFIG.SPAWN_SCALING.MIN_SPAWN_INTERVAL,
            (CONFIG.ENEMY.ZOMBIE.SPAWN_RATE / diffMultiplier) * (this.difficulty?.spawnRateMult || 1)
        );

        if (now - this.lastSpawn > spawnRate) {
            // Data-driven enemy selection based on weight and time
            const availableTypes = [];
            for (const [type, cfg] of Object.entries(CONFIG.ENEMY)) {
                if (type === 'DEFAULT') continue;
                if (elapsedTime >= cfg.SPAWN_TIME) {
                    availableTypes.push({ type: type.toLowerCase(), weight: cfg.SPAWN_WEIGHT });
                }
            }

            const totalWeight = availableTypes.reduce((sum, t) => sum + t.weight, 0);
            let roll = Math.random() * totalWeight;
            let selectedType = 'zombie';
            
            for (const t of availableTypes) {
                if (roll < t.weight) {
                    selectedType = t.type;
                    break;
                }
                roll -= t.weight;
            }

            this.spawnEnemy(globalDifficulty, selectedType);
            this.lastSpawn = now;
        }

        this.bullets.forEach(b => {
            b.update();
            if (b.isEnemy && b.active) {
                const dx = b.x - this.player.x;
                const dy = b.y - this.player.y;
                const distSq = dx * dx + dy * dy;
                const colDist = this.player.size / 2 + b.size;
                if (distSq < colDist * colDist) {
                    let dmg = b.damage;
                    if (this.player.armor) dmg *= (1 - this.player.armor);
                    this.player.hp -= dmg;
                    this.screenShake = Math.max(this.screenShake, 8);
                    b.active = false;
                    this.spawnHitParticles(b.x, b.y, '#e74c3c');
                }
            }
        });
        this.bullets = this.bullets.filter(b => b.active);

        this.enemies.forEach(enemy => {
            enemy.update(this.player, this.camera, this.canvas, (skel, target) => {
                if (skel.type === 'exploder') {
                    // Exploder explosion damage
                    const dx = target.x - skel.x;
                    const dy = target.y - skel.y;
                    const distSq = dx * dx + dy * dy;
                    const range = 80; // Explosion radius
                    if (distSq < range * range) {
                        let dmg = skel.damage;
                        if (this.player.armor) dmg *= (1 - this.player.armor);
                        this.player.hp -= dmg;
                        this.screenShake = Math.max(this.screenShake, 15);
                        this.spawnHitParticles(skel.x, skel.y, '#e67e22', 20);
                    }
                } else {
                    this.bullets.push(new Bullet(skel.x, skel.y, target.x, target.y, true));
                }
            });
            
            if (!enemy.isDead) {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distSq = dx * dx + dy * dy;
                const colDist = (this.player.size + enemy.size) / 2;
                
                if (distSq < colDist * colDist) {
                    if (enemy.canAttack()) {
                        let dmg = enemy.damage;
                        if (this.player.armor) dmg *= (1 - this.player.armor);
                        this.player.hp -= dmg;
                        enemy.resetAttackCooldown();
                        this.screenShake = Math.max(this.screenShake, 4);
                    }
                }

                this.bullets.forEach(bullet => {
                    if (bullet.active && !bullet.isEnemy) {
                        const bdx = bullet.x - enemy.x;
                        const bdy = bullet.y - enemy.y;
                        const bdistSq = bdx * bdx + bdy * bdy;
                        const bcolDist = enemy.size / 2 + bullet.size;
                        if (bdistSq < bcolDist * bcolDist) {
                            let damage = this.player.getCurrentDamage();
                            const isCrit = this.player.critChance && Math.random() < this.player.critChance;
                            if (isCrit) damage *= 2;
                            
                            enemy.takeDamage(damage);
                            this.damageNumbers.push(new DamageNumber(enemy.x, enemy.y, damage, isCrit));
                            this.spawnHitParticles(bullet.x, bullet.y, isCrit ? '#f1c40f' : '#fff');
                            
                            bullet.active = false;
                            if (this.player.lifesteal) {
                                this.player.hp = Math.min(this.player.maxHp, this.player.hp + damage * this.player.lifesteal);
                            }
                        }
                    }
                });
            }
        });

        // XP Optimization: Process orbs with standard for loop (faster than forEach)
        for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
            const orb = this.xpOrbs[i];
            if (orb.update(this.player)) {
                if (this.player.addXP(orb.value)) {
                    this.triggerLevelUp();
                }
            }
            if (!orb.active) {
                this.xpOrbs.splice(i, 1);
            }
        }

        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        this.damageNumbers.forEach(d => d.update());
        this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);

        this.enemies.forEach(e => {
            if (e.isDead && e.deathTimer === 0.05) {
                this.screenShake = Math.max(this.screenShake, 3);
                this.spawnHitParticles(e.x, e.y, CONFIG.COLORS.ZOMBIE, 10);
                
                const cfg = CONFIG.ENEMY[e.type.toUpperCase()] || CONFIG.ENEMY.ZOMBIE;
                this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + cfg.ENERGY_DROP);

                const xpRange = cfg.XP_MAX - cfg.XP_BASE;
                const totalXP = Math.floor(cfg.XP_BASE + (e.level - 1) * (xpRange / 7));
                
                // XP OPTIMIZATION: Spawn fewer orbs with higher values if total XP is high
                const maxOrbsPerKill = 10;
                const orbValue = Math.max(1, Math.ceil(totalXP / maxOrbsPerKill));
                const orbCount = Math.ceil(totalXP / orbValue);

                if (this.xpOrbs.length < CONFIG.XP_ORB.MAX_ORBS) {
                    for (let i = 0; i < orbCount; i++) {
                        this.xpOrbs.push(new XPOrb(e.x, e.y, orbValue));
                    }
                }
            }
        });
        this.enemies = this.enemies.filter(e => e.hp !== -999 && (!e.isDead || e.deathTimer < 1));

        if (now - this.player.lastAttack > this.player.getCurrentAtkCooldown()) {
            let targets = this.enemies
                .filter(e => !e.isDead)
                .map(e => ({
                    enemy: e,
                    distSq: (this.player.x - e.x) ** 2 + (this.player.y - e.y) ** 2
                }))
                .filter(t => t.distSq < this.player.atkRange * this.player.atkRange)
                .sort((a, b) => a.distSq - b.distSq)
                .slice(0, this.player.projCount);

            if (targets.length > 0) {
                const shots = (this.player.multiShotChance && Math.random() < this.player.multiShotChance) ? 2 : 1;
                for(let i=0; i<shots; i++) {
                    setTimeout(() => {
                        this.player.attack(targets[0].enemy.x, targets[0].enemy.y);
                        this.player.gunRecoil = 10;
                        targets.forEach(t => {
                            const b = new Bullet(this.player.x, this.player.y, t.enemy.x, t.enemy.y);
                            if (this.player.bulletSizeMult) b.size *= this.player.bulletSizeMult;
                            this.bullets.push(b);
                        });
                    }, i * 100);
                }
            }
        }

        const seconds = Math.floor(elapsedTime % 60);
        const minutes = Math.floor(elapsedTime / 60);
        document.getElementById('timer').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    spawnHitParticles(x, y, color, count = 5) {
        const finalCount = keys.isMobile ? Math.ceil(count / 2) : count;
        for(let i=0; i<finalCount; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    triggerLevelUp() {
        this.isPaused = true;
        this.screenShake = 15;
        if (this.player.godMode) this.player.hp = this.player.maxHp;
        const screen = document.getElementById('level-up-screen');
        const list = document.getElementById('upgrade-list');
        list.innerHTML = '';
        const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        selected.forEach(upg => {
            const card = document.createElement('div');
            card.className = `upgrade-card ${upg.rarity}`;
            card.innerHTML = `
                <div class="upgrade-icon">${upg.icon}</div>
                <div class="upgrade-name">${upg.name}</div>
                <div class="upgrade-rarity">${upg.rarity}</div>
                <div class="upgrade-desc">${upg.desc}</div>
            `;
            card.onclick = () => {
                upg.apply(this.player);
                this.isPaused = false;
                screen.classList.add('hidden');
            };
            list.appendChild(card);
        });
        screen.classList.remove('hidden');
    }

    updateStatsGrid(containerId) {
        const p = this.player;
        const diffLabel = this.difficulty ? this.difficulty.label : 'NORMAL';
        const stats = [
            { label: 'Difficulty', value: diffLabel },
            { label: 'Level', value: p.level },
            { label: 'HP', value: `${Math.ceil(p.hp)} / ${p.maxHp}` },
            { label: 'Damage', value: Math.round(p.getCurrentDamage()) },
            { label: 'Atk Speed', value: (1000/p.getCurrentAtkCooldown()).toFixed(1) + '/s' },
            { label: 'Targets', value: p.projCount },
            { label: 'Move Speed', value: p.getCurrentSpeed().toFixed(1) },
            { label: 'Regen', value: p.regen.toFixed(3) + '/s' },
            { label: 'E-Regen', value: (p.energyRegenMult * 100).toFixed(0) + '%' },
            { label: 'Lifesteal', value: (p.lifesteal * 100).toFixed(0) + '%' },
            { label: 'Crit Chance', value: ((p.critChance || 0) * 100).toFixed(0) + '%' },
            { label: 'Armor', value: ((p.armor || 0) * 100).toFixed(0) + '%' }
        ];
        const container = document.getElementById(containerId);
        container.innerHTML = stats.map(s => `
            <div class="stat-item">
                <span class="stat-label">${s.label}</span>
                <span class="stat-value">${s.value}</span>
            </div>
        `).join('');
    }

    updateHUD() {
        const p = this.player;
        const hpPerc = (p.hp / p.maxHp) * 100;
        const enPerc = (p.energy / p.maxEnergy) * 100;
        const xpPerc = (p.xp / p.xpToNext) * 100;
        
        document.getElementById('hp-bar').style.width = `${hpPerc}%`;
        document.getElementById('energy-bar').style.width = `${enPerc}%`;
        document.getElementById('xp-bar').style.width = `${xpPerc}%`;
        
        document.getElementById('lvl-text').innerText = p.level;
        document.getElementById('xp-val-text').innerText = Math.floor(p.xp);
        document.getElementById('xp-needed-text').innerText = p.xpToNext;
        
        document.getElementById('hp-text').innerText = `HP: ${Math.ceil(p.hp)} / ${p.maxHp}`;
        document.getElementById('energy-text').innerText = `ENERGY: ${Math.floor(p.energy)} / ${p.maxEnergy}`;

        // Ability Slots UI
        const slot1 = document.getElementById('ability-1');
        const cooldown1 = document.getElementById('ability-cooldown-1');
        
        if (p.level >= 5) {
            slot1.classList.remove('locked');
            if (p.isChargedUp) {
                const remaining = (p.chargeUpEndTime - Date.now()) / CONFIG.PLAYER.CHARGEUP_DURATION;
                cooldown1.style.height = `${(1 - remaining) * 100}%`;
                slot1.style.borderColor = '#e74c3c';
            } else {
                cooldown1.style.height = '0%';
                slot1.style.borderColor = p.energy >= CONFIG.PLAYER.ABILITY_COST ? '#9b59b6' : '#555';
            }
        } else {
            slot1.classList.add('locked');
            cooldown1.style.height = '100%';
        }

        // Empty slots (future expansion)
        [2, 3, 4].forEach(i => {
            document.getElementById(`ability-${i}`).classList.add('locked');
            document.getElementById(`ability-cooldown-${i}`).style.height = '100%';
        });
    }

    spawnEnemy(difficulty, type = 'zombie') {
        const angle = Math.random() * Math.PI * 2;
        const dist = CONFIG.ENEMY.DEFAULT.SPAWN_DISTANCE;
        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;
        this.enemies.push(new Enemy(x, y, difficulty, type, this.difficulty));
    }

    draw() {
        this.ctx.save();
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(sx, sy);
        }
        this.ctx.clearRect(-50, -50, this.canvas.width + 100, this.canvas.height + 100);
        
        // Apply Zoom
        this.ctx.scale(this.zoom, this.zoom);

        this.drawBackground();
        this.xpOrbs.forEach(o => o.draw(this.ctx, this.camera));
        this.bullets.forEach(b => b.draw(this.ctx, this.camera));
        this.enemies.forEach(enemy => enemy.draw(this.ctx, this.camera));
        this.player.draw(this.ctx, this.camera);
        this.particles.forEach(p => p.draw(this.ctx, this.camera));
        this.damageNumbers.forEach(d => d.draw(this.ctx, this.camera));
        this.ctx.restore();
    }

    drawBackground() {
        const startX = Math.floor(this.camera.x / this.tileSize) - 1;
        const startY = Math.floor(this.camera.y / this.tileSize) - 1;
        const endX = startX + Math.ceil((this.canvas.width / this.zoom) / this.tileSize) + 2;
        const endY = startY + Math.ceil((this.canvas.height / this.zoom) / this.tileSize) + 2;
        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                this.drawTile(x, y);
            }
        }
    }

    drawTile(tx, ty) {
        const x = tx * this.tileSize - this.camera.x;
        const y = ty * this.tileSize - this.camera.y;
        const hash = (Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
        const val = Math.abs(hash);
        let color = CONFIG.COLORS.GRASS_1;
        if (val > 0.8) color = CONFIG.COLORS.GRASS_2;
        if (val > 0.95) color = CONFIG.COLORS.GRASS_3;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), this.tileSize + 1, this.tileSize + 1);
        if (val < 0.05) {
            this.ctx.fillStyle = CONFIG.COLORS.BLOCK;
            const size = Math.floor(this.tileSize * 0.125); // 8px for 64, 16px for 128
            const offset = Math.floor(this.tileSize * 0.3125); // 20px for 64
            this.ctx.fillRect(x + offset, y + offset, size, size);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}
