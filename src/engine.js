import { CONFIG, UPGRADES } from './config.js';
import { Bullet } from './bullet.js';
import { XPOrb, Particle, DamageNumber, SlashParticle, BloodParticle, ItemLabel } from './utils.js';
import { Item } from './item.js';
import { Enemy } from './enemy.js';
import { keys } from './input.js';
import { login, signUp, logout, getSession, supabase, signInWithGoogle } from './auth.js';
import { soundManager } from './SoundManager.js';

export class Engine {
    constructor(canvas, player) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.player = player;
        this.camera = { x: 0, y: 0 };
        this.enemies = [];
        this.bullets = [];
        this.xpOrbs = [];
        this.items = []; 
        this.particles = [];
        this.damageNumbers = [];
        this.itemLabels = [];
        this.startTime = Date.now();
        this.elapsedTime = 0; 
        this.pauseStartTime = 0;
        this.lastSpawn = 0;
        this.isPaused = false;
        this.isStarted = false;
        this.difficulty = null;
        this.wasEscapeDown = false;
        this.wasAbility3Down = false;
        this.screenShake = 0;
        this.nukeFlash = 0;
        this.hitStop = 0;
        this.playerHitFlash = 0;
        this.zoomPulse = 0;
        this.particleMult = keys.isMobile ? CONFIG.PARTICLES.MOBILE_MULT : CONFIG.PARTICLES.PC_MULT;
        this.wasDashing = false;
        this.dashHitSet = new Set();
        
        soundManager.playBGM('menu');
        this.tileSize = keys.isMobile ? CONFIG.TILE_SIZE * 2 : CONFIG.TILE_SIZE;

        this.resize();
        this.updateHUD();
        this.initUI();
        this.initAuthUI();
        window.addEventListener('resize', () => this.resize());
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isStarted && !this.isPaused && !this.player.isDead) {
                this.togglePause();
            }
        });
    }

    initUI() {
        document.getElementById('resume-btn').onclick = () => this.togglePause();
        const bgmSlider = document.getElementById('bgm-volume');
        const sfxSlider = document.getElementById('sfx-volume');
        bgmSlider.oninput = (e) => soundManager.setVolume('bgm', parseFloat(e.target.value));
        sfxSlider.oninput = (e) => soundManager.setVolume('sfx', parseFloat(e.target.value));
        
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.isStarted = true;
                this.startTime = Date.now();
                this.lastSpawn = Date.now();
                const diffKey = keys.currentDifficulty || 'NORMAL';
                this.difficulty = CONFIG.DIFFICULTIES[diffKey];
                this.player.difficulty = this.difficulty;
                this.player.setCharacter(keys.selectedCharIndex || 1);
                soundManager.playBGM('game');
                soundManager.playSFX('start');
                this.player.maxHp = Math.round(this.player.maxHp * this.difficulty.hpMult);
                this.player.hp = this.player.maxHp;
                if (keys.isMobile && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            });
        }
    }

    async initAuthUI() {
        const authNavBtn = document.getElementById('auth-nav-btn');
        const authModal = document.getElementById('auth-modal');
        const closeAuthBtn = document.getElementById('close-auth-btn');
        const googleBtn = document.getElementById('google-login-btn');
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const emailInput = document.getElementById('auth-email');
        const passInput = document.getElementById('auth-password');
        const msgDiv = document.getElementById('auth-message');

        const updateMessage = (text, isError = false) => {
            msgDiv.innerText = text;
            msgDiv.style.color = isError ? '#e74c3c' : '#2ecc71';
        };

        authNavBtn.onclick = () => authModal.classList.remove('hidden');
        closeAuthBtn.onclick = () => {
            authModal.classList.add('hidden');
            updateMessage('');
        };

        googleBtn.onclick = async () => {
            updateMessage('Redirecting to Google...');
            const { error } = await signInWithGoogle();
            if (error) updateMessage(error.message, true);
        };

        loginBtn.onclick = async () => {
            const email = emailInput.value;
            const pass = passInput.value;
            if (!email || !pass) return updateMessage('Enter email and password', true);
            updateMessage('Logging in...');
            const { data, error } = await login(email, pass);
            if (error) updateMessage(error.message, true);
            else {
                updateMessage('Login successful!');
                setTimeout(() => authModal.classList.add('hidden'), 1000);
            }
        };

        signupBtn.onclick = async () => {
            const email = emailInput.value;
            const pass = passInput.value;
            if (!email || !pass) return updateMessage('Enter email and password', true);
            updateMessage('Signing up...');
            const { data, error } = await signUp(email, pass);
            if (error) updateMessage(error.message, true);
            else updateMessage('Signup successful! Check your email.');
        };

        logoutBtn.onclick = async () => {
            updateMessage('Logging out...');
            const { error } = await logout();
            if (error) updateMessage(error.message, true);
            else {
                updateMessage('Logged out.');
                setTimeout(() => authModal.classList.add('hidden'), 1000);
            }
        };

        supabase.auth.onAuthStateChange((event, session) => this.updateAuthUI(session));
        const session = await getSession();
        this.updateAuthUI(session);
    }

    updateAuthUI(session) {
        const authNavBtn = document.getElementById('auth-nav-btn');
        const loggedOutView = document.getElementById('auth-logged-out');
        const loggedInView = document.getElementById('auth-logged-in');
        const userEmailSpan = document.getElementById('user-email');

        if (session && session.user) {
            authNavBtn.innerText = 'PROFILE';
            loggedOutView.classList.add('hidden');
            loggedInView.classList.remove('hidden');
            userEmailSpan.innerText = session.user.email;
        } else {
            authNavBtn.innerText = 'LOGIN / SIGNUP';
            loggedOutView.classList.remove('hidden');
            loggedInView.classList.add('hidden');
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const menu = document.getElementById('escape-menu');
        const pauseTitle = menu.querySelector('h1');
        
        if (this.isPaused) {
            this.pauseStartTime = Date.now();
            menu.classList.remove('hidden');
            this.updateStatsGrid('pause-stats');
            const seconds = Math.floor(this.elapsedTime % 60);
            const minutes = Math.floor(this.elapsedTime / 60);
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            pauseTitle.innerText = `PAUSED - ${timeStr}`;
        } else {
            if (this.pauseStartTime > 0) {
                this.startTime += (Date.now() - this.pauseStartTime);
                this.pauseStartTime = 0;
            }
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
        if (this.hitStop > 0) {
            this.hitStop--;
            return;
        }

        if (keys.escape && !this.wasEscapeDown && !this.player.isDead && !document.getElementById('level-up-screen').offsetParent) {
            this.togglePause();
        }
        this.wasEscapeDown = keys.escape;
        this.wasAbility3Down = keys.c;

        if (this.isPaused || this.player.isDead) {
            if (this.player.isDead) {
                const screen = document.getElementById('death-screen');
                if (screen.classList.contains('hidden')) {
                    soundManager.playSFX('death');
                    screen.classList.remove('hidden');
                    const timerText = document.getElementById('timer').innerText;
                    document.getElementById('final-time').innerText = timerText;
                    this.updateStatsGrid('death-stats');
                    this.finalTimeStr = timerText;
                }
            }
            return;
        }

        const wasDashingBefore = this.player.isDashing;
        this.player.update();
        if (this.player.isDashing && !wasDashingBefore) this.dashHitSet.clear();
        if (this.player.isDashing) this.screenShake = Math.max(this.screenShake, 5);
        if (this.player.isChargedUp && Math.random() < 0.1) this.screenShake = Math.max(this.screenShake, 2);
        if (this.player.isInvincible) this.screenShake = Math.max(this.screenShake, 3);
        if (this.player.isDashing) {
            this.enemies.forEach(enemy => {
                if (enemy.isDead) return;
                if (this.dashHitSet.has(enemy)) return;
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distSq = dx*dx + dy*dy;
                const hitRange = (this.player.size + enemy.size) ** 2;
                if (distSq < hitRange) {
                    const dmg = this.player.getCurrentDamage() * (this.player.dashDamageMult || 0);
                    if (dmg > 0) {
                        enemy.takeDamage(dmg);
                        this.spawnHitParticles(enemy.x, enemy.y, this.player.dashParticle || '#fff', 6);
                        this.damageNumbers.push(new DamageNumber(enemy.x, enemy.y, dmg, true));
                        this.dashHitSet.add(enemy);
                    }
                }
            });
        }
        // Ability 3 (Nuke) activation: level gate 10 and requires stored charge
        if (keys.c && !this.wasAbility3Down && this.player.level >= CONFIG.ABILITIES.NUKE.MIN_LEVEL && this.player.nukeCharges > 0) {
            this.activateNuke();
        }
        this.wasAbility3Down = keys.c;

        this.updateHUD();

        const targetCamX = this.player.x - (this.canvas.width / 2) / this.zoom;
        const targetCamY = this.player.y - (this.canvas.height / 2) / this.zoom;
        this.camera.x += (targetCamX - this.camera.x) * CONFIG.PLAYER.LERP;
        this.camera.y += (targetCamY - this.camera.y) * CONFIG.PLAYER.LERP;

        if (this.screenShake > 0) {
            this.screenShake *= 0.9;
            if (this.screenShake < 0.1) this.screenShake = 0;
        }
        if (this.zoomPulse > 0) this.zoomPulse *= 0.9;

        if (this.nukeFlash > 0) this.nukeFlash -= 0.05;

        const now = Date.now();
        if (!this.isPaused) this.elapsedTime = (now - this.startTime) / 1000;
        const elapsedTime = this.elapsedTime;
        
        const minutesElapsed = Math.floor(elapsedTime / 60);
        const diffMultiplier = Math.pow(CONFIG.SPAWN_SCALING.PER_MINUTE_MULT, minutesElapsed);
        const globalDifficulty = Math.min(CONFIG.ENEMY.DEFAULT.MAX_LEVEL, Math.floor(1 + elapsedTime / 30)); 
        const spawnRate = Math.max(
            CONFIG.SPAWN_SCALING.MIN_SPAWN_INTERVAL,
            (CONFIG.ENEMY.ZOMBIE.SPAWN_RATE / diffMultiplier) * (this.difficulty?.spawnRateMult || 1)
        );

        if (now - this.lastSpawn > spawnRate) {
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
                if (dx * dx + dy * dy < (this.player.size / 2 + b.size) ** 2) {
                    if (this.player.takeDamage(b.damage)) {
                        this.screenShake = Math.max(this.screenShake, 15);
                        this.playerHitFlash = 1.0;
                        soundManager.playSFX('hurt');
                        const hits = Math.max(1, Math.ceil(8 * this.particleMult));
                        for(let i=0; i<hits; i++) this.particles.push(new BloodParticle(this.player.x, this.player.y));
                    }
                    b.active = false;
                }
            }
        });
        this.bullets = this.bullets.filter(b => b.active);

        this.enemies.forEach(enemy => {
            enemy.update(this.player, this.camera, this.canvas, (skel, target) => {
                if (skel.type === 'exploder') {
                    const dx = target.x - skel.x;
                    const dy = target.y - skel.y;
                    if (dx * dx + dy * dy < 80 * 80) {
                        if (this.player.takeDamage(skel.damage)) {
                            this.screenShake = Math.max(this.screenShake, 25);
                            this.playerHitFlash = 1.0;
                            this.hitStop = 5;
                            const hits = Math.max(1, Math.ceil(15 * this.particleMult));
                            for(let i=0; i<hits; i++) this.particles.push(new BloodParticle(this.player.x, this.player.y));
                        }
                    }
                } else {
                    this.bullets.push(new Bullet(skel.x, skel.y, target.x, target.y, true));
                }
            });
            
            if (!enemy.isDead) {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                if (dx * dx + dy * dy < ((this.player.size + enemy.size) / 2) ** 2) {
                    if (enemy.canAttack()) {
                        if (this.player.takeDamage(enemy.damage)) {
                            enemy.resetAttackCooldown();
                            this.screenShake = Math.max(this.screenShake, 10);
                            this.playerHitFlash = 1.0;
                            this.hitStop = 2;
                            for(let i=0; i<5; i++) this.particles.push(new BloodParticle(this.player.x, this.player.y));
                        }
                    }
                }

                this.bullets.forEach(bullet => {
                    if (bullet.active && !bullet.isEnemy) {
                        const bdx = bullet.x - enemy.x;
                        const bdy = bullet.y - enemy.y;
                        if (bdx * bdx + bdy * bdy < (enemy.size / 2 + bullet.size) ** 2) {
                            let damage = this.player.getCurrentDamage();
                            const isCrit = this.player.critChance && Math.random() < this.player.critChance;
                            if (isCrit) damage *= 2;
                            if (isCrit) {
                                this.hitStop = 2;
                                this.screenShake = Math.max(this.screenShake, 15);
                                if (!soundManager.playSFX('crit', 0.05)) soundManager.playSynth('crit');
                                soundManager.playSFX('hit', 0.15);
                                this.zoomPulse = Math.min(0.2, this.zoomPulse + 0.05);
                            } else {
                                soundManager.playSFX('hit', 0.05);
                            }
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

        const magnetActive = this.player.itemEffects.magnetEndTime > Date.now();
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item.update(this.player, magnetActive)) {
                soundManager.playSFX('pickup');
                const type = item.type;
                let labelText = '';
                switch(type.id) {
                    case 'magnet':
                        this.player.itemEffects.magnetEndTime = Date.now() + type.duration;
                        if (!soundManager.playSFX('magnet', 0.05)) soundManager.playSynth('magnet');
                        labelText = 'MAGNET'; break;
                    case 'health':
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + type.value);
                        labelText = '+HP'; break;
                    case 'nuke':
        this.player.nukeCharges = Math.min(CONFIG.ABILITIES.NUKE.MAX_CHARGES, (this.player.nukeCharges || 0) + 1);
                        labelText = 'NUKE READY'; 
                        break;
                    case 'speed':
                        this.player.itemEffects.speedEndTime = Date.now() + type.duration;
                        labelText = '+SPEED'; break;
                    case 'rapid':
                        this.player.itemEffects.rapidEndTime = Date.now() + type.duration;
                        labelText = 'RAPID FIRE'; break;
                }
                this.itemLabels.push(new ItemLabel(this.player.x, this.player.y - 40, labelText, type.color));
                this.items.splice(i, 1);
            } else if (!item.active) this.items.splice(i, 1);
        }

        for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
            const orb = this.xpOrbs[i];
            if (orb.update(this.player, magnetActive)) {
                orb.sizePop = 15;
                soundManager.playSFX('xp');
                let gain = orb.value;
                if (this.player.totalXp > 10000) gain *= 10;
                if (this.player.addXP(gain)) this.triggerLevelUp();
            }
            if (!orb.active) this.xpOrbs.splice(i, 1);
        }

        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);
        this.damageNumbers.forEach(d => d.update());
        this.damageNumbers = this.damageNumbers.filter(d => d.life > 0);
        this.itemLabels.forEach(l => l.update());
        this.itemLabels = this.itemLabels.filter(l => l.life > 0);

        this.enemies.forEach(e => {
            if (e.isDead && !e.dropsSpawned) {
                e.dropsSpawned = true;
                this.player.killCount += 1;
                this.screenShake = Math.max(this.screenShake, 5);
                this.hitStop = 1;
                soundManager.playSFX('kick');
                const blood = Math.max(1, Math.ceil(10 * this.particleMult));
                for(let i=0; i<blood; i++) this.particles.push(new BloodParticle(e.x, e.y));
                const cfg = CONFIG.ENEMY[e.type.toUpperCase()] || CONFIG.ENEMY.ZOMBIE;
                this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + cfg.ENERGY_DROP);

                if (Math.random() < CONFIG.ITEMS.DROP_CHANCE) {
                    const visibleTypes = new Set();
                    this.items.forEach(item => {
                        const screenX = item.x - this.camera.x;
                        const screenY = item.y - this.camera.y;
                        const onScreen = screenX > -100 && screenX < this.canvas.width + 100 && screenY > -100 && screenY < this.canvas.height + 100;
                        if (onScreen) visibleTypes.add(item.type.id);
                    });
                    {
                        const types = CONFIG.ITEMS.TYPES;
                        let roll = Math.random();
                        let selectedType = null;
                        for (const key in types) {
                            const type = types[key];
                            if (roll < type.chance) { selectedType = type; break; }
                            roll -= type.chance;
                        }
                        if (selectedType) {
                            if (selectedType.id === 'nuke' && this.player.level < CONFIG.ABILITIES.NUKE.MIN_LEVEL) selectedType = null;
                            if (selectedType && !visibleTypes.has(selectedType.id)) {
                                this.items.push(new Item(e.x, e.y, selectedType));
                            }
                        }
                    }
                }
                const xpRange = cfg.XP_MAX - cfg.XP_BASE;
                let totalXP = Math.floor(cfg.XP_BASE + (e.level - 1) * (xpRange / 7));
                if (this.player.totalXp > 10000) totalXP *= 10;
                const orbValue = Math.max(1, Math.ceil(totalXP / 10));
                const orbCount = Math.ceil(totalXP / orbValue);
                if (this.xpOrbs.length < CONFIG.XP_ORB.MAX_ORBS) {
                    for (let i = 0; i < orbCount; i++) this.xpOrbs.push(new XPOrb(e.x, e.y, orbValue));
                }
            }
        });
        this.enemies = this.enemies.filter(e => e.hp !== -999 && (!e.isDead || e.deathTimer < 1));

        if (this.player.canShoot !== false && now - this.player.lastAttack > this.player.getCurrentAtkCooldown()) {
            let targets = this.enemies.filter(e => !e.isDead).map(e => ({
                enemy: e, distSq: (this.player.x - e.x) ** 2 + (this.player.y - e.y) ** 2
            })).filter(t => t.distSq < this.player.atkRange * this.player.atkRange).sort((a, b) => a.distSq - b.distSq).slice(0, this.player.projCount);

            if (targets.length > 0) {
                const shots = (this.player.multiShotChance && Math.random() < this.player.multiShotChance) ? 2 : 1;
                for(let i=0; i<shots; i++) {
                    setTimeout(() => {
                        this.player.attack(targets[0].enemy.x, targets[0].enemy.y);
                        soundManager.playSFX('shoot', 0.1);
                        this.spawnHitParticles(this.player.x, this.player.y, CONFIG.COLORS.BULLET, 2);
                        this.player.gunRecoil = 10;
                        targets.forEach(t => {
                            const b = new Bullet(this.player.x, this.player.y, t.enemy.x, t.enemy.y);
                            if (this.player.bulletSizeMult) b.size *= this.player.bulletSizeMult;
                            this.bullets.push(b);
                        });
                    }, i * 100);
                }
            }
        } else if (this.player.canShoot === false && now - this.player.lastAttack > this.player.getCurrentAtkCooldown()) {
            const targets = this.enemies.filter(e => !e.isDead).map(e => ({
                enemy: e, distSq: (this.player.x - e.x) ** 2 + (this.player.y - e.y) ** 2
            })).filter(t => t.distSq < this.player.atkRange * this.player.atkRange).sort((a, b) => a.distSq - b.distSq);
            if (targets.length > 0) {
                const swing = targets[0].enemy;
                this.player.lastAttack = now;
                const dmg = this.player.getCurrentDamage();
                swing.takeDamage(dmg);
                this.damageNumbers.push(new DamageNumber(swing.x, swing.y, dmg, true));
                this.spawnHitParticles(swing.x, swing.y, '#e74c3c', 8);
                this.hitStop = 3;
                soundManager.playSFX('hit', 0.2);
            }
        }
        const seconds = Math.floor(elapsedTime % 60);
        const minutes = Math.floor(elapsedTime / 60);
        document.getElementById('timer').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    spawnHitParticles(x, y, color, count = 5) {
        const finalCount = Math.max(1, Math.ceil(count * this.particleMult));
        for(let i=0; i<finalCount; i++) this.particles.push(new Particle(x, y, color));
    }

    triggerLevelUp() {
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        this.screenShake = 15;
        this.zoomPulse = Math.min(0.2, this.zoomPulse + 0.08);
        this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - 60, 'LEVEL UP!', true));
        soundManager.playSFX('lvlup');
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
                if (this.pauseStartTime > 0) {
                    this.startTime += (Date.now() - this.pauseStartTime);
                    this.pauseStartTime = 0;
                }
                screen.classList.add('hidden');
            };
            list.appendChild(card);
        });
        screen.classList.remove('hidden');
    }

    activateNuke() {
        this.player.nukeCharges -= 1;
        this.screenShake = CONFIG.ABILITIES.NUKE.SCREEN_SHAKE;
        this.nukeFlash = CONFIG.ABILITIES.NUKE.FLASH_ALPHA;
        if (!soundManager.playSFX('nuke', 0.05)) soundManager.playSynth('nuke');
        this.enemies.forEach(e => {
            if (!e.isDead) {
                e.takeDamage(CONFIG.ABILITIES.NUKE.DAMAGE);
                for(let j=0; j<3; j++) this.particles.push(new SlashParticle(e.x, e.y, '#fff'));
                this.damageNumbers.push(new DamageNumber(e.x, e.y, 'NUKE', true));
            }
        });
    }

    shareRunSummary() {
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        // Background
        const grd = ctx.createLinearGradient(0,0,720,720);
        grd.addColorStop(0, '#0f2027');
        grd.addColorStop(1, '#203a43');
        ctx.fillStyle = grd;
        ctx.fillRect(0,0,720,720);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('TMXT RUN SUMMARY', 360, 80);

        const statFont = keys.isMobile ? 24 : 28;
        ctx.font = `bold ${statFont}px Segoe UI`;
        const stats = [
            `Time: ${this.finalTimeStr || document.getElementById('timer').innerText}`,
            `Level: ${this.player.level}`,
            `Kills: ${this.player.killCount}`,
            `Total XP: ${Math.floor(this.player.totalXp)}`,
            `Damage: ${Math.round(this.player.getCurrentDamage())}`,
            `Projectiles: ${this.player.projCount}`
        ];
        stats.forEach((s, i) => ctx.fillText(s, 360, 160 + i * 50));

        const link = document.createElement('a');
        link.download = `tmxt-run-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
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
            <div class="stat-item"><span class="stat-label">${s.label}</span><span class="stat-value">${s.value}</span></div>
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

        const slot2 = document.getElementById('ability-2');
        const cooldown2 = document.getElementById('ability-cooldown-2');
        // Always visible; unlocks at level 8
        slot2.classList.remove('empty');
        slot2.querySelector('.ability-name').innerText = p.level >= 8 ? 'INVICTUS' : 'INVICTUS (LVL 8)';
        if (p.level >= 8) {
            slot2.classList.remove('locked');
            if (p.isInvincible) {
                const remaining = (p.invincibilityEndTime - Date.now()) / CONFIG.PLAYER.INVINCIBILITY_DURATION;
                cooldown2.style.height = `${(1 - remaining) * 100}%`;
                slot2.style.borderColor = '#f1c40f';
            } else {
                cooldown2.style.height = '0%';
                slot2.style.borderColor = p.energy >= CONFIG.PLAYER.ABILITY_2_COST ? '#f1c40f' : '#555';
            }
        } else {
            slot2.classList.add('locked');
            cooldown2.style.height = '100%';
            slot2.style.borderColor = '#555';
        }

        // Ability 3 (NUKE) appears at lvl threshold, requires charge
        const slot3 = document.getElementById('ability-3');
        const cooldown3 = document.getElementById('ability-cooldown-3');
        slot3.classList.remove('empty');
        slot3.querySelector('.ability-name').innerText = 'NUKE';
        if (p.level >= CONFIG.ABILITIES.NUKE.MIN_LEVEL) {
            slot3.classList.remove('locked');
            const ready = p.nukeCharges > 0;
            slot3.style.borderColor = ready ? '#f1c40f' : '#555';
            cooldown3.style.height = ready ? '0%' : '100%';
            if (ready) slot3.querySelector('.ability-name').innerText = `NUKE (${p.nukeCharges})`;
        } else {
            slot3.classList.add('locked');
            slot3.style.borderColor = '#555';
            cooldown3.style.height = '100%';
        }

        // Ability 4 remains placeholder
        document.getElementById(`ability-4`).classList.add('locked');
        document.getElementById(`ability-cooldown-4`).style.height = '100%';

        // Mobile buttons labels/state
        const mobileBtn1 = document.getElementById('btn-ability-1');
        const mobileBtn2 = document.getElementById('btn-ability-2');
        const mobileBtn3 = document.getElementById('btn-ability-3');
        if (mobileBtn1) mobileBtn1.innerText = 'CHARGE';
        if (mobileBtn2) {
            mobileBtn2.innerText = 'INVICTUS';
            mobileBtn2.disabled = p.level < CONFIG.ABILITIES.INVINCIBLE.MIN_LEVEL;
        }
        if (mobileBtn3) {
            mobileBtn3.innerText = p.nukeCharges > 0 ? `NUKE (${p.nukeCharges})` : 'NUKE';
            mobileBtn3.disabled = !(p.level >= CONFIG.ABILITIES.NUKE.MIN_LEVEL && p.nukeCharges > 0);
        }

        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) shareBtn.onclick = () => this.shareRunSummary();
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
        const zoomScale = this.zoom * (1 + this.zoomPulse);
        this.ctx.scale(zoomScale, zoomScale);
        this.drawBackground();
        this.xpOrbs.forEach(o => o.draw(this.ctx, this.camera));
        this.items.forEach(i => i.draw(this.ctx, this.camera));
        this.bullets.forEach(b => b.draw(this.ctx, this.camera));
        this.enemies.forEach(enemy => enemy.draw(this.ctx, this.camera));
        this.player.draw(this.ctx, this.camera);
        this.particles.forEach(p => p.draw(this.ctx, this.camera));
        this.damageNumbers.forEach(d => d.draw(this.ctx, this.camera));
        this.itemLabels.forEach(l => l.draw(this.ctx, this.camera));
        this.ctx.restore();

        if (this.playerHitFlash > 0) {
            this.ctx.fillStyle = `rgba(231, 76, 60, ${this.playerHitFlash * 0.3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.playerHitFlash *= 0.9;
        }
        if (this.nukeFlash > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.nukeFlash})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawBackground() {
        const startX = Math.floor(this.camera.x / this.tileSize) - 1;
        const startY = Math.floor(this.camera.y / this.tileSize) - 1;
        const endX = startX + Math.ceil((this.canvas.width / this.zoom) / this.tileSize) + 2;
        const endY = startY + Math.ceil((this.canvas.height / this.zoom) / this.tileSize) + 2;
        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) this.drawTile(x, y);
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
            const size = Math.floor(this.tileSize * 0.125); 
            const offset = Math.floor(this.tileSize * 0.3125); 
            this.ctx.fillRect(x + offset, y + offset, size, size);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}
