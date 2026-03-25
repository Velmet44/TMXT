import { CONFIG } from './config.js';
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
        this.stunFlash = 0;
        this.gravityFlash = 0;
        this.hitStop = 0;
        this.playerHitFlash = 0;
        this.particleMult = keys.isMobile ? CONFIG.WORLD.PARTICLES.MOBILE_MULT : CONFIG.WORLD.PARTICLES.PC_MULT;
        this.wasDashing = false;
        this.dashHitSet = new Set();
        this.lastDashTrail = 0;
        
        soundManager.playBGM('menu');
        this.tileSize = keys.isMobile ? CONFIG.WORLD.TILE_SIZE * CONFIG.WORLD.TILE_SIZE_MOBILE_MULT : CONFIG.WORLD.TILE_SIZE;

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
                this.player.setCharacter(keys.selectedCharIndex || CONFIG.PLAYER_RUNTIME.DEFAULT_CHARACTER_ID);
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
                setTimeout(() => authModal.classList.add('hidden'), CONFIG.ENGINE.AUTH_MODAL_CLOSE_DELAY_MS);
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
                setTimeout(() => authModal.classList.add('hidden'), CONFIG.ENGINE.AUTH_MODAL_CLOSE_DELAY_MS);
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
            const seconds = Math.floor(this.elapsedTime % CONFIG.ENGINE.TIME.SEC_PER_MIN);
            const minutes = Math.floor(this.elapsedTime / CONFIG.ENGINE.TIME.SEC_PER_MIN);
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
        this.zoom = keys.isMobile ? CONFIG.WORLD.CAMERA.ZOOM_MOBILE : CONFIG.WORLD.CAMERA.ZOOM_PC;
    }

    update() {
        if (!this.isStarted) return;
        if (this.hitStop > 0) {
            this.hitStop--;
            return;
        }

        const wasAbility3DownPrev = this.wasAbility3Down;

        if (keys.escape && !this.wasEscapeDown && !this.player.isDead && !document.getElementById('level-up-screen').offsetParent) {
            this.togglePause();
        }
        this.wasEscapeDown = keys.escape;

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
        if (this.player.isDashing) this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.SHAKE.DASH);
        if (this.player.isChargedUp && Math.random() < CONFIG.ENGINE.SHAKE.CHARGED_CHANCE) this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.SHAKE.CHARGED_VALUE);
        if (this.player.isInvincible) this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.SHAKE.INVINCIBLE);
        if (this.player.isDashing && this.player.canShoot === false) {
            const trailNow = Date.now();
            if (trailNow - (this.lastDashTrail || 0) > CONFIG.ENGINE.DASH_TRAIL_INTERVAL_MS) {
                this.particles.push(new Particle(this.player.x, this.player.y, this.player.dashParticle || '#fff'));
                this.lastDashTrail = trailNow;
            }
        }
        if (this.player.pendingStunDuration) {
            const now = Date.now();
            const dur = this.player.pendingStunDuration;
            const viewW = this.canvas.width / this.zoom;
            const viewH = this.canvas.height / this.zoom;
            this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.STUN.SHAKE);
            this.hitStop = Math.max(this.hitStop, CONFIG.ENGINE.STUN.HIT_STOP);
            this.stunFlash = CONFIG.ENGINE.STUN.FLASH_ALPHA;
            for (let i = 0; i < CONFIG.ENGINE.STUN.RING_SLASH_COUNT; i++) {
                const angle = (Math.PI * 2 * i) / CONFIG.ENGINE.STUN.RING_SLASH_COUNT;
                const dist = CONFIG.ENGINE.STUN.RING_DIST_BASE + Math.random() * CONFIG.ENGINE.STUN.RING_DIST_RAND;
                const x = this.player.x + Math.cos(angle) * dist;
                const y = this.player.y + Math.sin(angle) * dist;
                this.particles.push(new SlashParticle(x, y, '#9b59b6'));
            }
            this.enemies.forEach(e => {
                if (e.isDead) return;
                if (e.x < this.camera.x - CONFIG.ENGINE.STUN.SCREEN_MARGIN || e.x > this.camera.x + viewW + CONFIG.ENGINE.STUN.SCREEN_MARGIN) return;
                if (e.y < this.camera.y - CONFIG.ENGINE.STUN.SCREEN_MARGIN || e.y > this.camera.y + viewH + CONFIG.ENGINE.STUN.SCREEN_MARGIN) return;
                e.stunUntil = Math.max(e.stunUntil || 0, now + dur);
                this.spawnHitParticles(e.x, e.y, '#9b59b6', CONFIG.ENGINE.STUN.PARTICLES);
            });
            this.itemLabels.push(new ItemLabel(this.player.x, this.player.y - CONFIG.ENGINE.STUN.LABEL_OFFSET_Y, 'STUN!', '#9b59b6'));
            soundManager.playSFX('charge', CONFIG.ENGINE.STUN.SFX_VOL);
            this.player.pendingStunDuration = 0;
        }

        // Gravity Well (Bulwark ability 2)
        if (this.player.gravityWellActive) {
            const gw = this.player.gravityWellActive;
            const now = Date.now();
            const radiusSq = gw.radius * gw.radius;
            this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.GRAVITY_WELL.SHAKE);
            this.gravityFlash = Math.max(this.gravityFlash, CONFIG.ENGINE.GRAVITY_WELL.FLASH_ALPHA);
            this.enemies.forEach(e => {
                if (e.isDead) return;
                const dx = gw.center.x - e.x;
                const dy = gw.center.y - e.y;
                const distSq = dx*dx + dy*dy;
                if (distSq < radiusSq * CONFIG.ENGINE.GRAVITY_WELL.AFFECT_RADIUS_MULT) {
                    const dist = Math.sqrt(Math.max(CONFIG.ENGINE.GRAVITY_WELL.DIST_MIN, distSq));
                    const pull = gw.pull * (1 + (gw.radius - dist) / gw.radius);
                    e.x += (dx / dist) * pull;
                    e.y += (dy / dist) * pull;
                    // Apply a soft stun/slow while in well
                    e.stunUntil = Math.max(e.stunUntil || 0, now + CONFIG.ENGINE.GRAVITY_WELL.SOFT_STUN_MS);
                    if (Math.random() < CONFIG.ENGINE.GRAVITY_WELL.SPARK_CHANCE) this.particles.push(new SlashParticle(e.x, e.y, '#8e44ad'));
                }
            });
            if (!gw.exploded && now >= gw.endTime) {
                gw.exploded = true;
                this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.GRAVITY_WELL.EXPLOSION_SHAKE);
                for (let i = 0; i < CONFIG.ENGINE.GRAVITY_WELL.EXPLOSION_SLASH_COUNT; i++) this.particles.push(new SlashParticle(gw.center.x, gw.center.y, '#f1c40f'));
                this.enemies.forEach(e => {
                    if (e.isDead) return;
                    const dx = gw.center.x - e.x;
                    const dy = gw.center.y - e.y;
                    if (dx*dx + dy*dy <= radiusSq) {
                        e.takeDamage(gw.damage);
                        this.damageNumbers.push(new DamageNumber(e.x, e.y, Math.round(gw.damage), true));
                        this.spawnHitParticles(e.x, e.y, '#f1c40f', CONFIG.ENGINE.GRAVITY_WELL.EXPLOSION_PARTICLES);
                    }
                });
            }
        }
        if (this.player.isDashing) {
            this.enemies.forEach(enemy => {
                if (enemy.isDead) return;
                if (this.dashHitSet.has(enemy)) return;
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const distSq = dx*dx + dy*dy;
                const dashRangeMult = this.player.dashRangeMult || 1;
                const hitRange = ((this.player.size * dashRangeMult) + enemy.size) ** 2;
                if (distSq < hitRange) {
                    const dmg = this.player.getCurrentDamage() * (this.player.dashDamageMult || 0);
                    if (dmg > 0) {
                        enemy.takeDamage(dmg);
                        this.spawnHitParticles(enemy.x, enemy.y, this.player.dashParticle || '#fff', CONFIG.ENGINE.DASH_HIT.PARTICLES);
                        this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.DASH_HIT.SHAKE);
                        soundManager.playSFX('dash', CONFIG.ENGINE.DASH_HIT.SFX_VOL);
                        this.damageNumbers.push(new DamageNumber(enemy.x, enemy.y, dmg, true));
                        this.dashHitSet.add(enemy);
                    }
                }
            });
        }
        const nukeMin = this.player.abilitiesCfg?.NUKE?.MIN_LEVEL ?? CONFIG.ENGINE.NukeActivation.DEFAULT_MIN_LEVEL;
        if (keys.c && !wasAbility3DownPrev && this.player.level >= nukeMin && this.player.nukeCharges > 0) {
            this.activateNuke();
        }
        this.wasAbility3Down = keys.c;

        this.updateHUD();

        const targetCamX = this.player.x - (this.canvas.width / 2) / this.zoom;
        const targetCamY = this.player.y - (this.canvas.height / 2) / this.zoom;
        const lerp = this.player.baseStats?.LERP || CONFIG.ENGINE.CAMERA_LERP_FALLBACK;
        this.camera.x += (targetCamX - this.camera.x) * lerp;
        this.camera.y += (targetCamY - this.camera.y) * lerp;

        if (this.screenShake > 0) {
            this.screenShake *= CONFIG.ENGINE.SHAKE.DAMP;
            if (this.screenShake < CONFIG.ENGINE.SHAKE.MIN) this.screenShake = 0;
        }
        if (this.nukeFlash > 0) this.nukeFlash -= CONFIG.ENGINE.SCREEN_FLASH.NUKE_DAMP;

        const now = Date.now();
        if (!this.isPaused) this.elapsedTime = (now - this.startTime) / CONFIG.ENGINE.TIME.MS_TO_SEC;
        const elapsedTime = this.elapsedTime;
        
        const minutesElapsed = Math.floor(elapsedTime / CONFIG.ENGINE.TIME.SEC_PER_MIN);
        const diffMultiplier = Math.pow(CONFIG.SPAWN_SCALING.PER_MINUTE_MULT, minutesElapsed);
        const globalDifficulty = Math.min(CONFIG.ENEMY.DEFAULT.MAX_LEVEL, Math.floor(CONFIG.ENGINE.TIME.GLOBAL_LEVEL_BASE + elapsedTime / CONFIG.ENGINE.TIME.GLOBAL_LEVEL_SECONDS));
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
                        this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.PLAYER_BULLET_HIT.SHAKE);
                        this.playerHitFlash = CONFIG.ENGINE.PLAYER_BULLET_HIT.FLASH;
                        soundManager.playSFX('hurt');
                        const hits = Math.max(1, Math.ceil(CONFIG.ENGINE.PLAYER_BULLET_HIT.BLOOD_COUNT * this.particleMult));
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
                    if (dx * dx + dy * dy < CONFIG.ENGINE.EXPLODER_HIT.RANGE * CONFIG.ENGINE.EXPLODER_HIT.RANGE) {
                        if (this.player.takeDamage(skel.damage)) {
                            this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.EXPLODER_HIT.SHAKE);
                            this.playerHitFlash = CONFIG.ENGINE.EXPLODER_HIT.FLASH;
                            this.hitStop = CONFIG.ENGINE.EXPLODER_HIT.HITSTOP;
                            const hits = Math.max(1, Math.ceil(CONFIG.ENGINE.EXPLODER_HIT.BLOOD_COUNT * this.particleMult));
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
                            this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.CONTACT_HIT.SHAKE);
                            this.playerHitFlash = CONFIG.ENGINE.CONTACT_HIT.FLASH;
                            this.hitStop = CONFIG.ENGINE.CONTACT_HIT.HITSTOP;
                            for(let i=0; i<CONFIG.ENGINE.CONTACT_HIT.BLOOD_COUNT; i++) this.particles.push(new BloodParticle(this.player.x, this.player.y));
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
                            if (isCrit) damage *= CONFIG.ENGINE.CRIT.DAMAGE_MULT;
                            if (isCrit) {
                                this.hitStop = CONFIG.ENGINE.CRIT.HITSTOP;
                                this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.CRIT.SHAKE);
                                if (!soundManager.playSFX('crit', CONFIG.ENGINE.CRIT.SFX_CRIT_VOL)) soundManager.playSynth('crit');
                                soundManager.playSFX('hit', CONFIG.ENGINE.CRIT.SFX_HIT_VOL);
                            } else {
                                soundManager.playSFX('hit', CONFIG.ENGINE.HIT_SFX_VOL);
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
                        if (!soundManager.playSFX('magnet', CONFIG.ENGINE.STUN.SFX_VOL)) soundManager.playSynth('magnet');
                        labelText = 'MAGNET'; break;
                    case 'health':
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + type.value);
                        labelText = '+HP'; break;
                    case 'nuke': {
                        const nukeCfg = this.player.abilitiesCfg?.NUKE || {};
                        if (this.player.level >= (nukeCfg.MIN_LEVEL ?? CONFIG.ENGINE.NukeActivation.DEFAULT_MIN_LEVEL)) {
                            const maxNuke = nukeCfg.MAX_CHARGES ?? this.player.abilitiesCfg?.NUKE?.MAX_CHARGES ?? CONFIG.ENGINE.NUKE.DEFAULT_MAX_CHARGES;
                            this.player.nukeCharges = Math.min(maxNuke, (this.player.nukeCharges || 0) + 1);
                            labelText = 'NUKE READY';
                        }
                        break;
                    }
                    case 'speed':
                        this.player.itemEffects.speedEndTime = Date.now() + type.duration;
                        labelText = '+SPEED'; break;
                    case 'rapid':
                        this.player.itemEffects.rapidEndTime = Date.now() + type.duration;
                        labelText = 'RAPID FIRE'; break;
                }
                this.itemLabels.push(new ItemLabel(this.player.x, this.player.y - CONFIG.ENGINE.ITEM_LABEL_OFFSET_Y, labelText, type.color));
                this.items.splice(i, 1);
            } else if (!item.active) this.items.splice(i, 1);
        }

        for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
            const orb = this.xpOrbs[i];
            if (orb.update(this.player, magnetActive)) {
                orb.sizePop = CONFIG.ENGINE.XP_ORB_POP;
                soundManager.playSFX('xp');
                let gain = orb.value;
                if (this.player.totalXp > CONFIG.ENGINE.XP.ENDGAME_THRESHOLD) gain *= CONFIG.ENGINE.XP.ENDGAME_MULT;
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
                this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.ENEMY_DEATH.SHAKE);
                this.hitStop = CONFIG.ENGINE.ENEMY_DEATH.HITSTOP;
                soundManager.playSFX('kick');
                const blood = Math.max(1, Math.ceil(CONFIG.ENGINE.ENEMY_DEATH.BLOOD * this.particleMult));
                for(let i=0; i<blood; i++) this.particles.push(new BloodParticle(e.x, e.y));
                const cfg = CONFIG.ENEMY[e.type.toUpperCase()] || CONFIG.ENEMY.ZOMBIE;
                this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + cfg.ENERGY_DROP);

                if (Math.random() < CONFIG.ITEMS.DROP_CHANCE) {
                    const visibleTypes = new Set();
                    this.items.forEach(item => {
                        const screenX = item.x - this.camera.x;
                        const screenY = item.y - this.camera.y;
                        const onScreen = screenX > -CONFIG.ENGINE.ITEM_SCREEN_MARGIN && screenX < this.canvas.width + CONFIG.ENGINE.ITEM_SCREEN_MARGIN && screenY > -CONFIG.ENGINE.ITEM_SCREEN_MARGIN && screenY < this.canvas.height + CONFIG.ENGINE.ITEM_SCREEN_MARGIN;
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
                            const nukeMin = this.player.abilitiesCfg?.NUKE?.MIN_LEVEL ?? CONFIG.ENGINE.NukeActivation.DEFAULT_MIN_LEVEL;
                            if (selectedType.id === 'nuke' && this.player.level < nukeMin) selectedType = null;
                            if (selectedType && !visibleTypes.has(selectedType.id)) {
                                this.items.push(new Item(e.x, e.y, selectedType));
                            }
                        }
                    }
                }
                const xpRange = cfg.XP_MAX - cfg.XP_BASE;
                let totalXP = Math.floor(cfg.XP_BASE + (e.level - 1) * (xpRange / CONFIG.ENGINE.XP.LEVEL_SCALING_DIVISOR));
                if (this.player.totalXp > CONFIG.ENGINE.XP.ENDGAME_THRESHOLD) totalXP *= CONFIG.ENGINE.XP.ENDGAME_MULT;
                const orbValue = Math.max(1, Math.ceil(totalXP / CONFIG.ENGINE.XP.ORB_SPLIT_DIVISOR));
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
                const shots = (this.player.multiShotChance && Math.random() < this.player.multiShotChance) ? CONFIG.ENGINE.NORMAL_SHOT.MULTI_SHOT_COUNT : 1;
                for(let i=0; i<shots; i++) {
                    setTimeout(() => {
                        this.player.attack(targets[0].enemy.x, targets[0].enemy.y);
                        soundManager.playSFX('shoot', CONFIG.ENGINE.NORMAL_SHOT.SFX_VOL);
                        this.spawnHitParticles(this.player.x, this.player.y, CONFIG.COLORS.BULLET, CONFIG.ENGINE.NORMAL_SHOT.MUZZLE_PARTICLES);
                        this.player.gunRecoil = CONFIG.ENGINE.NORMAL_SHOT.RECOIL;
                        targets.forEach(t => {
                            const b = new Bullet(this.player.x, this.player.y, t.enemy.x, t.enemy.y);
                            if (this.player.bulletSizeMult) b.size *= this.player.bulletSizeMult;
                            this.bullets.push(b);
                        });
                    }, i * CONFIG.ENGINE.NORMAL_SHOT.MULTI_DELAY_MS);
                }
            }
        } else if (this.player.canShoot === false && now - this.player.lastAttack > this.player.getCurrentAtkCooldown()) {
            const targets = this.enemies.filter(e => !e.isDead).map(e => ({
                enemy: e, distSq: (this.player.x - e.x) ** 2 + (this.player.y - e.y) ** 2
            })).filter(t => t.distSq < this.player.atkRange * this.player.atkRange).sort((a, b) => a.distSq - b.distSq);
            if (targets.length > 0) {
                this.player.lastAttack = now;
                const swingCount = Math.max(1, this.player.projCount || 1);
                const swings = targets.slice(0, swingCount);
                swings.forEach((entry) => {
                    const swing = entry.enemy;
                    const dmg = this.player.getCurrentDamage();
                    swing.takeDamage(dmg);
                    this.damageNumbers.push(new DamageNumber(swing.x, swing.y, dmg, true));
                    this.spawnHitParticles(swing.x, swing.y, '#e74c3c', CONFIG.ENGINE.MELEE_SHOT.HIT_PARTICLES_PRIMARY);
                    this.spawnHitParticles(swing.x, swing.y, '#fff', CONFIG.ENGINE.MELEE_SHOT.HIT_PARTICLES_SECONDARY);
                    if (this.player.lifesteal) this.player.hp = Math.min(this.player.maxHp, this.player.hp + dmg * this.player.lifesteal);
                });
                this.hitStop = CONFIG.ENGINE.MELEE_SHOT.HITSTOP;
                this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.MELEE_SHOT.SHAKE);
                soundManager.playSFX('hit', CONFIG.ENGINE.MELEE_SHOT.SFX_VOL);
            }
        }
        const seconds = Math.floor(elapsedTime % CONFIG.ENGINE.TIME.SEC_PER_MIN);
        const minutes = Math.floor(elapsedTime / CONFIG.ENGINE.TIME.SEC_PER_MIN);
        document.getElementById('timer').innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    spawnHitParticles(x, y, color, count = CONFIG.ENGINE.PARTICLE_SPAWN_DEFAULT) {
        const finalCount = Math.max(1, Math.ceil(count * this.particleMult));
        for(let i=0; i<finalCount; i++) this.particles.push(new Particle(x, y, color));
    }

    triggerLevelUp() {
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        this.screenShake = CONFIG.ENGINE.LEVELUP.SHAKE;
        this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - CONFIG.ENGINE.LEVELUP.LABEL_OFFSET_Y, 'LEVEL UP!', true));
        soundManager.playSFX('lvlup');
        if (this.player.godMode) this.player.hp = this.player.maxHp;
        const screen = document.getElementById('level-up-screen');
        const list = document.getElementById('upgrade-list');
        list.innerHTML = '';
        const pool = this.player.upgrades || [];
        if (!pool.length) {
            this.isPaused = false;
            screen.classList.add('hidden');
            return;
        }
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(CONFIG.ENGINE.LEVELUP.OPTIONS, shuffled.length));
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
        const nukeCfg = this.player.abilitiesCfg?.NUKE || {};
        this.player.nukeCharges -= 1;
        this.screenShake = nukeCfg.SCREEN_SHAKE ?? CONFIG.ENGINE.NUKE.DEFAULT_SHAKE;
        this.nukeFlash = nukeCfg.FLASH_ALPHA ?? CONFIG.ENGINE.NUKE.DEFAULT_FLASH;
        if (!soundManager.playSFX('nuke', CONFIG.ENGINE.NUKE.SFX_VOL)) soundManager.playSynth('nuke');
        const nukeDmg = nukeCfg.DAMAGE ?? CONFIG.ENGINE.NUKE.DEFAULT_DAMAGE;
        this.enemies.forEach(e => {
            if (!e.isDead) {
                e.takeDamage(nukeDmg);
                for(let j=0; j<CONFIG.ENGINE.NUKE.ENEMY_SLASHES; j++) this.particles.push(new SlashParticle(e.x, e.y, '#fff'));
                this.damageNumbers.push(new DamageNumber(e.x, e.y, 'NUKE', true));
            }
        });
    }

    shareRunSummary() {
        const canvas = document.createElement('canvas');
        canvas.width = CONFIG.ENGINE.SUMMARY.SIZE;
        canvas.height = CONFIG.ENGINE.SUMMARY.SIZE;
        const ctx = canvas.getContext('2d');
        // Background
        const grd = ctx.createLinearGradient(0, 0, CONFIG.ENGINE.SUMMARY.SIZE, CONFIG.ENGINE.SUMMARY.SIZE);
        grd.addColorStop(0, '#0f2027');
        grd.addColorStop(1, '#203a43');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CONFIG.ENGINE.SUMMARY.SIZE, CONFIG.ENGINE.SUMMARY.SIZE);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('TMXT RUN SUMMARY', CONFIG.ENGINE.SUMMARY.TITLE_X, CONFIG.ENGINE.SUMMARY.TITLE_Y);

        const statFont = keys.isMobile ? CONFIG.ENGINE.SUMMARY.MOBILE_FONT : CONFIG.ENGINE.SUMMARY.PC_FONT;
        ctx.font = `bold ${statFont}px Segoe UI`;
        const stats = [
            `Time: ${this.finalTimeStr || document.getElementById('timer').innerText}`,
            `Level: ${this.player.level}`,
            `Kills: ${this.player.killCount}`,
            `Total XP: ${Math.floor(this.player.totalXp)}`,
            `Damage: ${Math.round(this.player.getCurrentDamage())}`,
            `Projectiles: ${this.player.projCount}`
        ];
        stats.forEach((s, i) => ctx.fillText(s, CONFIG.ENGINE.SUMMARY.TITLE_X, CONFIG.ENGINE.SUMMARY.STATS_Y + i * CONFIG.ENGINE.SUMMARY.STAT_LINE_GAP));

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
            { label: 'Atk Speed', value: (CONFIG.ENGINE.STATS.ATK_SPEED_FACTOR/p.getCurrentAtkCooldown()).toFixed(1) + '/s' },
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

        const abilities = p.abilitiesCfg || {};
        const chargeCfg = abilities.CHARGE || {};
        const invCfg = abilities.INVINCIBLE || {};
        const nukeCfg = abilities.NUKE || {};
        const chargeDur = (chargeCfg.DURATION || p.chargeupDurationBase) * (p.chargeupDurationMult || 1);
        const chargeCost = p.maxEnergy;
        const invDur = (invCfg.DURATION || p.invincibilityDurationBase) * (p.invincibilityDurationMult || 1);
        const invCost = p.maxEnergy;
        const chargeName = chargeCfg.EFFECT === 'stun_all' ? 'STUN' : 'CHARGE';
        const invName = invCfg.EFFECT === 'gravity_well' ? 'GRAV WELL' : 'INVICTUS';

        const slot1 = document.getElementById('ability-1');
        const cooldown1 = document.getElementById('ability-cooldown-1');
        if (slot1 && cooldown1) {
            slot1.querySelector('.ability-name').innerText = chargeName;
            if (p.level >= Math.max(CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL, chargeCfg.MIN_LEVEL ?? CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL)) {
                slot1.classList.remove('locked');
                if (p.isChargedUp) {
                    const remaining = (p.chargeUpEndTime - Date.now()) / chargeDur;
                    cooldown1.style.height = `${(1 - remaining) * 100}%`;
                    slot1.style.borderColor = '#e74c3c';
                } else {
                cooldown1.style.height = '0%';
                slot1.style.borderColor = p.energy >= chargeCost ? '#9b59b6' : '#555';
            }
        } else {
            slot1.classList.add('locked');
                cooldown1.style.height = '100%';
            }
        }

        const slot2 = document.getElementById('ability-2');
        const cooldown2 = document.getElementById('ability-cooldown-2');
        if (slot2 && cooldown2) {
            slot2.classList.remove('empty');
            slot2.querySelector('.ability-name').innerText = invName;
            if (p.level >= Math.max(CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL, invCfg.MIN_LEVEL ?? CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL)) {
                slot2.classList.remove('locked');
                const activeGravity = invCfg.EFFECT === 'gravity_well' && p.gravityWellActive;
                if (p.isInvincible || activeGravity) {
                    const remaining = activeGravity ? (p.gravityWellActive.endTime - Date.now()) / invDur : (p.invincibilityEndTime - Date.now()) / invDur;
                    cooldown2.style.height = `${(1 - remaining) * 100}%`;
                    slot2.style.borderColor = invCfg.EFFECT === 'gravity_well' ? '#8e44ad' : '#f1c40f';
                } else {
                    cooldown2.style.height = '0%';
                    slot2.style.borderColor = p.energy >= invCost ? (invCfg.EFFECT === 'gravity_well' ? '#8e44ad' : '#f1c40f') : '#555';
                }
            } else {
                slot2.classList.add('locked');
                cooldown2.style.height = '100%';
                slot2.style.borderColor = '#555';
            }
        }

        const slot3 = document.getElementById('ability-3');
        const cooldown3 = document.getElementById('ability-cooldown-3');
        if (slot3 && cooldown3) {
            slot3.classList.remove('empty');
            slot3.querySelector('.ability-name').innerText = 'NUKE';
            if (p.level >= (nukeCfg.MIN_LEVEL ?? CONFIG.ENGINE.NukeActivation.DEFAULT_MIN_LEVEL)) {
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
        }

        // Ability 4 remains placeholder
        document.getElementById(`ability-4`).classList.add('locked');
        document.getElementById(`ability-cooldown-4`).style.height = '100%';

        // Mobile buttons labels/state
        const mobileBtn1 = document.getElementById('btn-ability-1');
        const mobileBtn2 = document.getElementById('btn-ability-2');
        const mobileBtn3 = document.getElementById('btn-ability-3');
        if (mobileBtn1) mobileBtn1.innerText = chargeName;
        if (mobileBtn2) {
            mobileBtn2.innerText = invName;
            mobileBtn2.disabled = p.level < Math.max(CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL, (invCfg.MIN_LEVEL ?? CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL));
        }
        if (mobileBtn3) {
            mobileBtn3.innerText = p.nukeCharges > 0 ? `NUKE (${p.nukeCharges})` : 'NUKE';
            mobileBtn3.disabled = !(p.level >= (nukeCfg.MIN_LEVEL ?? CONFIG.ENGINE.NukeActivation.DEFAULT_MIN_LEVEL) && p.nukeCharges > 0);
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
        this.ctx.clearRect(-CONFIG.ENGINE.RENDER.CLEAR_MARGIN, -CONFIG.ENGINE.RENDER.CLEAR_MARGIN, this.canvas.width + CONFIG.ENGINE.RENDER.CLEAR_MARGIN * 2, this.canvas.height + CONFIG.ENGINE.RENDER.CLEAR_MARGIN * 2);
        this.ctx.scale(this.zoom, this.zoom);
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
            this.ctx.fillStyle = `rgba(231, 76, 60, ${this.playerHitFlash * CONFIG.ENGINE.SCREEN_FLASH.PLAYER_HIT_ALPHA_MULT})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.playerHitFlash *= CONFIG.ENGINE.SCREEN_FLASH.PLAYER_HIT_DAMP;
        }
        if (this.stunFlash > 0) {
            this.ctx.fillStyle = `rgba(155, 89, 182, ${this.stunFlash})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.stunFlash *= CONFIG.ENGINE.SCREEN_FLASH.STUN_DAMP;
        }
        if (this.gravityFlash > 0) {
            this.ctx.fillStyle = `rgba(142, 68, 173, ${this.gravityFlash})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.gravityFlash *= CONFIG.ENGINE.SCREEN_FLASH.GRAVITY_DAMP;
        }
        if (this.nukeFlash > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.nukeFlash})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawBackground() {
        const startX = Math.floor(this.camera.x / this.tileSize) - CONFIG.ENGINE.RENDER.TILE_PAD_START;
        const startY = Math.floor(this.camera.y / this.tileSize) - CONFIG.ENGINE.RENDER.TILE_PAD_START;
        const endX = startX + Math.ceil((this.canvas.width / this.zoom) / this.tileSize) + CONFIG.ENGINE.RENDER.TILE_PAD_END;
        const endY = startY + Math.ceil((this.canvas.height / this.zoom) / this.tileSize) + CONFIG.ENGINE.RENDER.TILE_PAD_END;
        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) this.drawTile(x, y);
        }
    }

    drawTile(tx, ty) {
        const x = tx * this.tileSize - this.camera.x;
        const y = ty * this.tileSize - this.camera.y;
        const hash = (Math.sin(tx * CONFIG.ENGINE.RENDER.TILE_SEED_A + ty * CONFIG.ENGINE.RENDER.TILE_SEED_B) * CONFIG.ENGINE.RENDER.TILE_SEED_MUL) % 1;
        const val = Math.abs(hash);
        let color = CONFIG.COLORS.GRASS_1;
        if (val > CONFIG.ENGINE.RENDER.TILE_BLEND_1) color = CONFIG.COLORS.GRASS_2;
        if (val > CONFIG.ENGINE.RENDER.TILE_BLEND_2) color = CONFIG.COLORS.GRASS_3;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), this.tileSize + 1, this.tileSize + 1);
        if (val < CONFIG.ENGINE.RENDER.BLOCK_CHANCE) {
            this.ctx.fillStyle = CONFIG.COLORS.BLOCK;
            const size = Math.floor(this.tileSize * CONFIG.ENGINE.RENDER.BLOCK_SIZE_MULT); 
            const offset = Math.floor(this.tileSize * CONFIG.ENGINE.RENDER.BLOCK_OFFSET_MULT); 
            this.ctx.fillRect(x + offset, y + offset, size, size);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}
