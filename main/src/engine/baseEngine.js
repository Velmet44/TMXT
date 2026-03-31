import { CONFIG } from '../config.js';
import { Bullet } from '../bullet.js';
import { Particle, DamageNumber, SlashParticle, BloodParticle, ItemLabel } from '../utils.js';
import { keys } from '../input.js';
import { soundManager } from '../SoundManager.js';
import { createPlayerById } from '../player.js';
import { ENGINE_STATE } from './state.js';
import { updateHUDSystemCore, updateHUDWithTimerSystem, updateStatsGridSystem } from './systems/hudSystem.js';
import { spawnEnemySystem, updateSpawnSystemCore } from './systems/spawnSystem.js';
import { updateDropSystemCore } from './systems/dropSystem.js';
import { drawBackgroundSystem, drawTileSystem } from './systems/renderSystem.js';
import { buildRunSnapshotSystem, shareRunSummarySystem } from './systems/runSummarySystem.js';
import { createEngineUiRefs } from './uiRefs.js';

export class BaseEngine {
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
        this.gameState = ENGINE_STATE.MENU;
        this.difficulty = null;
        this.wasEscapeDown = false;
        this.screenShake = 0;
        this.nukeFlash = 0;
        this.stunFlash = 0;
        this.gravityFlash = 0;
        this.hitStop = 0;
        this.playerHitFlash = 0;
        this.critPulse = 0;
        this.particleMult = keys.isMobile ? CONFIG.WORLD.PARTICLES.MOBILE_MULT : CONFIG.WORLD.PARTICLES.PC_MULT;
        this.wasDashing = false;
        this.dashHitSet = new Set();
        this.lastDashTrail = 0;
        this.soundManager = soundManager;
        
        soundManager.playBGM(ENGINE_STATE.MENU);
        this.tileSize = keys.isMobile ? CONFIG.WORLD.TILE_SIZE * CONFIG.WORLD.TILE_SIZE_MOBILE_MULT : CONFIG.WORLD.TILE_SIZE;

        this.resize();
        this.ui = createEngineUiRefs();
        this.updateHUD();
        this.initUI();
        window.addEventListener('resize', () => this.resize());
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isStarted && !this.isPaused && !this.player.isDead) {
                this.togglePause();
            }
        });
    }

    initUI() {
        const { resumeBtn, bgmSlider, sfxSlider, shareBtn, returnHomeBtn, startBtn } = this.ui;
        if (resumeBtn) resumeBtn.onclick = () => this.togglePause();
        if (bgmSlider) bgmSlider.oninput = (e) => soundManager.setVolume('bgm', parseFloat(e.target.value));
        if (sfxSlider) sfxSlider.oninput = (e) => soundManager.setVolume('sfx', parseFloat(e.target.value));
        if (shareBtn) shareBtn.onclick = () => this.shareRunSummary();
        if (returnHomeBtn) returnHomeBtn.onclick = () => location.reload();

        if (startBtn) {
            startBtn.addEventListener('click', () => this.start());
        }
    }

    startRunNow() {
        this.isStarted = true;
        this.gameState = ENGINE_STATE.RUNNING;
        this.startTime = Date.now();
        this.lastSpawn = Date.now();
        const diffKey = keys.currentDifficulty || 'NORMAL';
        this.difficulty = CONFIG.DIFFICULTIES[diffKey];
        const selectedId = keys.selectedCharIndex || CONFIG.PLAYER_RUNTIME.DEFAULT_CHARACTER_ID;
        this.player = createPlayerById(selectedId, this.player.x, this.player.y);
        this.player.difficulty = this.difficulty;
        soundManager.playBGM('game');
        soundManager.playSFX('start');
        this.player.maxHp = Math.round(this.player.maxHp * this.difficulty.hpMult);
        this.player.hp = this.player.maxHp;
        if (keys.isMobile && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
        this.onRunStarted();
    }

    start() {
        this.startRunNow();
    }

    togglePause() {
        const menu = this.ui.escapeMenu;
        if (!menu) return;
        this.isPaused = !this.isPaused;
        const pauseTitle = menu.querySelector('h1');
        
        if (this.isPaused) {
            this.gameState = ENGINE_STATE.PAUSED;
            this.pauseStartTime = Date.now();
            menu.classList.remove('hidden');
            this.updateStatsGrid('pause-stats');
            const seconds = Math.floor(this.elapsedTime % CONFIG.ENGINE.TIME.SEC_PER_MIN);
            const minutes = Math.floor(this.elapsedTime / CONFIG.ENGINE.TIME.SEC_PER_MIN);
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            pauseTitle.innerText = `PAUSED - ${timeStr}`;
            this.onPauseStateChanged(true);
        } else {
            if (this.pauseStartTime > 0) {
                this.startTime += (Date.now() - this.pauseStartTime);
                this.pauseStartTime = 0;
            }
            menu.classList.add('hidden');
            if (!this.player.isDead) this.gameState = ENGINE_STATE.RUNNING;
            this.onPauseStateChanged(false);
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.zoom = keys.isMobile ? CONFIG.WORLD.CAMERA.ZOOM_MOBILE : CONFIG.WORLD.CAMERA.ZOOM_PC;
    }

    update() {
        this.updateCombatSystem();
    }

    updateCombatSystem() {
        if (!this.isStarted) return;
        if (this.critPulse > 0) {
            this.critPulse = Math.max(0, this.critPulse - CONFIG.ENGINE.CRIT.PULSE_DECAY);
        }
        if (this.hitStop > 0) {
            this.hitStop--;
            return;
        }

        if (keys.escape && !this.wasEscapeDown && !this.player.isDead && !this.ui.levelUpScreen?.offsetParent) {
            this.togglePause();
        }
        this.wasEscapeDown = keys.escape;

        if (this.isPaused || this.player.isDead) {
            if (this.player.isDead) {
                const screen = this.ui.deathScreen;
                if (!screen) return;
                if (screen.classList.contains('hidden')) {
                    soundManager.playSFX('death');
                    screen.classList.remove('hidden');
                    this.gameState = ENGINE_STATE.DEAD;
                    const timerText = this.ui.timer?.innerText || '00:00';
                    if (this.ui.finalTime) this.ui.finalTime.innerText = timerText;
                    this.updateStatsGrid('death-stats');
                    this.finalTimeStr = timerText;
                    this.onDeathScreenShown(timerText);
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

        if (this.player.pendingShockwave) {
            const sw = this.player.pendingShockwave;
            this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.STUN.SHAKE);
            this.hitStop = Math.max(this.hitStop, CONFIG.ENGINE.STUN.HIT_STOP);
            for (let i = 0; i < CONFIG.ENGINE.STUN.RING_SLASH_COUNT; i++) {
                const angle = (Math.PI * 2 * i) / CONFIG.ENGINE.STUN.RING_SLASH_COUNT;
                const x = this.player.x + Math.cos(angle) * sw.radius;
                const y = this.player.y + Math.sin(angle) * sw.radius;
                this.particles.push(new SlashParticle(x, y, sw.color));
            }
            this.enemies.forEach(e => {
                if (e.isDead) return;
                const dx = e.x - this.player.x;
                const dy = e.y - this.player.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > sw.radius * sw.radius) return;
                const dist = Math.sqrt(Math.max(CONFIG.ENGINE.GRAVITY_WELL.DIST_MIN, distSq));
                e.takeDamage(sw.damage);
                e.x += (dx / dist) * sw.knockback;
                e.y += (dy / dist) * sw.knockback;
                e.vulnerableUntil = Date.now() + sw.vulnerableMs;
                e.vulnerableMult = sw.vulnerableMult;
                e.stunUntil = Math.max(e.stunUntil || 0, Date.now() + sw.stunMs);
                this.damageNumbers.push(new DamageNumber(e.x, e.y, Math.round(sw.damage), true));
                this.spawnHitParticles(e.x, e.y, sw.color, CONFIG.ENGINE.STUN.PARTICLES);
            });
            this.itemLabels.push(new ItemLabel(this.player.x, this.player.y - CONFIG.ENGINE.STUN.LABEL_OFFSET_Y, `${sw.label}!`, sw.color));
            this.player.pendingShockwave = null;
        }

        if (this.player.pendingNuke) {
            this.activateNuke(this.player.pendingNuke);
            this.player.pendingNuke = null;
        }
        if (this.player.pendingMeteorRain) {
            this.queueMeteorRain(this.player.pendingMeteorRain);
            this.player.pendingMeteorRain = null;
        }
        this.processMeteorRain();

        if (this.player.graveTrailActive) {
            const trail = this.player.graveTrailActive;
            const now = Date.now();
            if (now - (trail.lastTick || 0) >= CONFIG.ENGINE.NECROMANCER.GRAVE_TRAIL_TICK_MS) {
                this.enemies.forEach((e) => {
                    if (e.isDead) return;
                    const dx = e.x - trail.x;
                    const dy = e.y - trail.y;
                    if (dx * dx + dy * dy > trail.radius * trail.radius) return;
                    e.takeDamage(trail.damage);
                    this.damageNumbers.push(new DamageNumber(e.x, e.y, Math.round(trail.damage), false));
                    this.spawnHitParticles(e.x, e.y, CONFIG.COLORS.NECRO, 5);
                });
                trail.lastTick = now;
            }
        }

        if (this.player.soulVortexActive) {
            const vortex = this.player.soulVortexActive;
            const now = Date.now();
            const radiusSq = vortex.radius * vortex.radius;
            const coreRadius = Math.max(10, vortex.radius * CONFIG.ENGINE.NECROMANCER.VORTEX_CORE_RADIUS_MULT);
            this.gravityFlash = Math.max(this.gravityFlash, CONFIG.ENGINE.NECROMANCER.LICH_AURA_FLASH);
            this.enemies.forEach((e) => {
                if (e.isDead) return;
                const dx = vortex.center.x - e.x;
                const dy = vortex.center.y - e.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > radiusSq) return;
                const dist = Math.sqrt(Math.max(CONFIG.ENGINE.GRAVITY_WELL.DIST_MIN, distSq));
                const norm = Math.max(0, 1 - dist / vortex.radius);
                const pull = vortex.pull * (1 + norm * 3.2);
                e.x += (dx / dist) * pull;
                e.y += (dy / dist) * pull;
                e.stunUntil = Math.max(e.stunUntil || 0, now + CONFIG.ENGINE.GRAVITY_WELL.SOFT_STUN_MS);
                if (dist <= coreRadius) {
                    e.takeDamage(vortex.damage || CONFIG.ENGINE.NUKE.DEFAULT_DAMAGE);
                    this.damageNumbers.push(new DamageNumber(e.x, e.y, 'SOUL', true));
                    this.spawnHitParticles(e.x, e.y, '#1f2430', CONFIG.ENGINE.NECROMANCER.VORTEX_PARTICLES);
                    this.spawnHitParticles(e.x, e.y, CONFIG.COLORS.NECRO, CONFIG.ENGINE.NECROMANCER.VORTEX_PARTICLES);
                } else if (now - (vortex.lastTick || 0) >= CONFIG.ENGINE.NECROMANCER.VORTEX_TICK_MS) {
                    const drainDmg = Math.max(1, this.player.getCurrentDamage() * CONFIG.ENGINE.NECROMANCER.VORTEX_DRAIN_MULT);
                    e.takeDamage(drainDmg);
                    this.damageNumbers.push(new DamageNumber(e.x, e.y, Math.round(drainDmg), false));
                    this.spawnHitParticles(e.x, e.y, '#8e44ad', 3);
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + drainDmg * 0.05);
                }
            });
            if (now - (vortex.lastTick || 0) >= CONFIG.ENGINE.NECROMANCER.VORTEX_TICK_MS) {
                vortex.lastTick = now;
            }
        }

        // Gravity Well (Bulwark ability 2)
        if (this.player.gravityWellActive) {
            const gw = this.player.gravityWellActive;
            const now = Date.now();
            const radiusSq = gw.radius * gw.radius;
            const killRadius = Math.max(10, gw.radius * CONFIG.ENGINE.GRAVITY_WELL.KILL_RADIUS_MULT);
            this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.GRAVITY_WELL.SHAKE);
            this.gravityFlash = Math.max(this.gravityFlash, CONFIG.ENGINE.GRAVITY_WELL.SCREEN_FLASH_WHILE_ACTIVE);
            this.enemies.forEach(e => {
                if (e.isDead) return;
                const dx = gw.center.x - e.x;
                const dy = gw.center.y - e.y;
                const distSq = dx*dx + dy*dy;
                if (distSq < radiusSq) {
                    const dist = Math.sqrt(Math.max(CONFIG.ENGINE.GRAVITY_WELL.DIST_MIN, distSq));
                    const norm = Math.max(0, 1 - (dist / gw.radius));
                    const pull = gw.pull * (1 + Math.pow(norm, CONFIG.ENGINE.GRAVITY_WELL.PULL_CURVE_POWER) * 3);
                    e.x += (dx / dist) * pull;
                    e.y += (dy / dist) * pull;
                    e.stunUntil = Math.max(e.stunUntil || 0, now + CONFIG.ENGINE.GRAVITY_WELL.SOFT_STUN_MS);
                    if (Math.random() < CONFIG.ENGINE.GRAVITY_WELL.SPARK_CHANCE) this.particles.push(new SlashParticle(e.x, e.y, '#8e44ad'));

                    if (dist <= killRadius) {
                        e.takeDamage(gw.damage || CONFIG.ENGINE.NUKE.DEFAULT_DAMAGE);
                        this.damageNumbers.push(new DamageNumber(e.x, e.y, 'VOID', true));
                        this.spawnHitParticles(e.x, e.y, '#111', CONFIG.ENGINE.GRAVITY_WELL.EXPLOSION_PARTICLES);
                        this.spawnHitParticles(e.x, e.y, '#8e44ad', CONFIG.ENGINE.GRAVITY_WELL.EXPLOSION_PARTICLES);
                    }
                }
            });
            if (now >= gw.endTime) {
                this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.GRAVITY_WELL.EXPLOSION_SHAKE);
                for (let i = 0; i < CONFIG.ENGINE.GRAVITY_WELL.EXPLOSION_SLASH_COUNT; i++) {
                    this.particles.push(new SlashParticle(gw.center.x, gw.center.y, '#1f2430'));
                }
                this.player.gravityWellActive = null;
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
        this.updateHUDSystem();

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
        
        this.updateSpawnSystem(now, elapsedTime);

        const zeroFrame = this.player.zeroFrameActive && Date.now() < this.player.zeroFrameActive.endTime
            ? this.player.zeroFrameActive
            : null;

        this.bullets.forEach(b => {
            b.timeScale = 1;
            if (zeroFrame) {
                const dxBubble = b.x - this.player.x;
                const dyBubble = b.y - this.player.y;
                const inBubble = (dxBubble * dxBubble + dyBubble * dyBubble) <= (zeroFrame.radius * zeroFrame.radius);
                if (!b.isEnemy) b.timeScale = zeroFrame.playerProjSpeedMult;
                else if (inBubble) b.timeScale = zeroFrame.enemyProjSpeedMult;
            }
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
            enemy.timeSlowMult = 1;
            if (zeroFrame) {
                const dxBubble = enemy.x - this.player.x;
                const dyBubble = enemy.y - this.player.y;
                if (dxBubble * dxBubble + dyBubble * dyBubble <= zeroFrame.radius * zeroFrame.radius) {
                    enemy.timeSlowMult = zeroFrame.enemySpeedMult;
                }
            }
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
                            if (enemy.type === 'leechling') {
                                const drainCap = CONFIG.ENEMY.RUNTIME.LEECH_ENERGY_DRAIN;
                                const drainedEnergy = Math.min(this.player.energy, drainCap);
                                if (drainedEnergy > 0) {
                                    const leechFx = CONFIG.ENGINE.LEECH_HIT;
                                    this.player.energy = Math.max(0, this.player.energy - drainedEnergy);
                                    const leechHeal = drainedEnergy * CONFIG.ENEMY.RUNTIME.LEECH_HEAL_PER_ENERGY;
                                    enemy.hp = Math.min(enemy.maxHp, enemy.hp + leechHeal);
                                    this.spawnHitParticles(enemy.x, enemy.y, leechFx.PARTICLE_COLOR, leechFx.PARTICLES);
                                    this.spawnHitParticles(enemy.x, enemy.y, leechFx.BURST_COLOR, Math.max(2, Math.floor(leechFx.PARTICLES / 2)));
                                    this.itemLabels.push(new ItemLabel(enemy.x, enemy.y - leechFx.LABEL_OFFSET_Y, `DRAIN -${Math.round(drainedEnergy)}`, leechFx.LABEL_COLOR));
                                    if (!soundManager.playSFX('magnet', leechFx.SFX_VOL)) soundManager.playSynth('leech');
                                }
                            }
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
                            let damage = bullet.damageOverride ?? this.player.getCurrentDamage();
                            const isCrit = this.player.critChance && Math.random() < this.player.critChance;
                            if (isCrit) damage *= CONFIG.ENGINE.CRIT.DAMAGE_MULT;
                            if (isCrit) {
                                this.hitStop = CONFIG.ENGINE.CRIT.HITSTOP;
                                this.screenShake = Math.max(this.screenShake, CONFIG.ENGINE.CRIT.SHAKE);
                                if (!soundManager.playSFX('crit', CONFIG.ENGINE.CRIT.SFX_CRIT_VOL)) soundManager.playSynth('crit');
                                soundManager.playSFX('hit', CONFIG.ENGINE.CRIT.SFX_HIT_VOL);
                                this.critPulse = CONFIG.ENGINE.CRIT.PULSE_INTENSITY;
                            } else {
                                soundManager.playSFX('hit', CONFIG.ENGINE.HIT_SFX_VOL);
                            }
                            enemy.takeDamage(damage);
                            this.damageNumbers.push(new DamageNumber(enemy.x, enemy.y, damage, isCrit));
                            this.spawnHitParticles(bullet.x, bullet.y, isCrit ? '#f1c40f' : '#fff');
                            if (bullet.splashRadius && bullet.splashRadius > 0) {
                                this.applyBulletSplash(enemy, bullet.splashRadius, damage * 0.45);
                            }
                            if ((bullet.pierceRemaining || 0) > 0) {
                                bullet.pierceRemaining--;
                            } else {
                                bullet.active = false;
                            }
                            const lifesteal = this.player.getCurrentLifesteal ? this.player.getCurrentLifesteal() : (this.player.lifesteal || 0);
                            if (lifesteal > 0) {
                                this.player.hp = Math.min(this.player.maxHp, this.player.hp + damage * lifesteal);
                            }
                        }
                    }
                });
            }
        });

        this.updateDropSystem();

        const currentAtkRange = this.player.getCurrentAtkRange ? this.player.getCurrentAtkRange() : this.player.atkRange;
        const currentProjCount = this.player.getCurrentProjCount ? this.player.getCurrentProjCount() : this.player.projCount;

        if (this.player.canShoot !== false && now - this.player.lastAttack > this.player.getCurrentAtkCooldown()) {
            let targets = this.enemies.filter(e => !e.isDead).map(e => ({
                enemy: e, distSq: (this.player.x - e.x) ** 2 + (this.player.y - e.y) ** 2
            })).filter(t => t.distSq < currentAtkRange * currentAtkRange).sort((a, b) => a.distSq - b.distSq).slice(0, currentProjCount);

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
                            if (zeroFrame) b.timeScale = zeroFrame.playerProjSpeedMult;
                            b.damageOverride = this.player.getCurrentDamage();
                            b.pierceRemaining = Math.max(0, (this.player.extraPierce || 0) + (this.player.lichAscendanceActive?.pierce || 0));
                            b.splashRadius = (this.player.extraSplashRadius || 0) + (this.player.lichAscendanceActive?.splashRadius || 0);
                            this.bullets.push(b);
                        });
                    }, i * CONFIG.ENGINE.NORMAL_SHOT.MULTI_DELAY_MS);
                }
            }
        } else if (this.player.canShoot === false && now - this.player.lastAttack > this.player.getCurrentAtkCooldown()) {
            const targets = this.enemies.filter(e => !e.isDead).map(e => ({
                enemy: e, distSq: (this.player.x - e.x) ** 2 + (this.player.y - e.y) ** 2
            })).filter(t => t.distSq < currentAtkRange * currentAtkRange).sort((a, b) => a.distSq - b.distSq);
            if (targets.length > 0) {
                this.player.lastAttack = now;
                const swingCount = Math.max(1, currentProjCount || 1);
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
        this.updateHUDSystem(elapsedTime);
    }

    updateSpawnSystem(now, elapsedTime) {
        updateSpawnSystemCore(this, now, elapsedTime);
    }

    updateDropSystem() {
        updateDropSystemCore(this);
    }

    updateHUDSystem(elapsedTime = null) {
        updateHUDWithTimerSystem(this, elapsedTime);
    }

    spawnHitParticles(x, y, color, count = CONFIG.ENGINE.PARTICLE_SPAWN_DEFAULT) {
        const finalCount = Math.max(1, Math.ceil(count * this.particleMult));
        for(let i=0; i<finalCount; i++) this.particles.push(new Particle(x, y, color));
    }

    applyBulletSplash(centerEnemy, radius, damage) {
        const radiusSq = radius * radius;
        this.enemies.forEach((e) => {
            if (e.isDead || e === centerEnemy) return;
            const dx = e.x - centerEnemy.x;
            const dy = e.y - centerEnemy.y;
            if (dx * dx + dy * dy > radiusSq) return;
            e.takeDamage(damage);
            this.damageNumbers.push(new DamageNumber(e.x, e.y, Math.round(damage), false));
            this.spawnHitParticles(e.x, e.y, '#ff9f43', 4);
        });
    }

    queueMeteorRain(cfg) {
        const now = Date.now();
        const aliveEnemies = this.enemies.filter((e) => !e.isDead);
        if (!aliveEnemies.length) return;
        this.player.meteorStrikes = [];
        for (let i = 0; i < cfg.count; i++) {
            const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            const spread = cfg.radius * 0.6;
            const tx = target.x + (Math.random() - 0.5) * spread;
            const ty = target.y + (Math.random() - 0.5) * spread;
            this.player.meteorStrikes.push({
                x: tx,
                y: ty,
                radius: cfg.radius,
                damage: cfg.damage,
                impactAt: now + cfg.impactDelay + (i * cfg.stagger),
                impacted: false
            });
        }
    }

    processMeteorRain() {
        if (!this.player.meteorStrikes?.length) return;
        const now = Date.now();
        this.player.meteorStrikes.forEach((strike) => {
            if (strike.impacted || now < strike.impactAt) return;
            strike.impacted = true;
            this.spawnHitParticles(strike.x, strike.y, '#e67e22', CONFIG.ENGINE.NECROMANCER.METEOR_PARTICLES);
            this.spawnHitParticles(strike.x, strike.y, '#f1c40f', CONFIG.ENGINE.NECROMANCER.METEOR_PARTICLES);
            this.enemies.forEach((e) => {
                if (e.isDead) return;
                const dx = e.x - strike.x;
                const dy = e.y - strike.y;
                if (dx * dx + dy * dy > strike.radius * strike.radius) return;
                e.takeDamage(strike.damage);
                this.damageNumbers.push(new DamageNumber(e.x, e.y, Math.round(strike.damage), true));
            });
            soundManager.playSFX('nuke', 0.03);
        });
        this.player.meteorStrikes = this.player.meteorStrikes.filter((strike) => !strike.impacted || (now - strike.impactAt) < 200);
    }

    triggerLevelUp() {
        this.isPaused = true;
        this.gameState = ENGINE_STATE.LEVELUP;
        this.pauseStartTime = Date.now();
        this.screenShake = CONFIG.ENGINE.LEVELUP.SHAKE;
        this.onLevelUpStateChanged(true);
        this.damageNumbers.push(new DamageNumber(this.player.x, this.player.y - CONFIG.ENGINE.LEVELUP.LABEL_OFFSET_Y, 'LEVEL UP!', true));
        soundManager.playSFX('lvlup');
        if (this.player.godMode) this.player.hp = this.player.maxHp;
        const screen = this.ui.levelUpScreen;
        const list = this.ui.upgradeList;
        if (!screen || !list) return;
        list.innerHTML = '';
        const pool = this.player.upgrades || [];
        if (!pool.length) {
            this.isPaused = false;
            screen.classList.add('hidden');
            this.onLevelUpStateChanged(false);
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
                this.gameState = ENGINE_STATE.RUNNING;
                if (this.pauseStartTime > 0) {
                    this.startTime += (Date.now() - this.pauseStartTime);
                    this.pauseStartTime = 0;
                }
                screen.classList.add('hidden');
                this.onLevelUpStateChanged(false);
            };
            list.appendChild(card);
        });
        screen.classList.remove('hidden');
    }

    activateNuke(overrideCfg = null) {
        const nukeCfg = overrideCfg || this.player.getAbilityConfig?.(3) || {};
        this.screenShake = nukeCfg.shake ?? nukeCfg.SCREEN_SHAKE ?? CONFIG.ENGINE.NUKE.DEFAULT_SHAKE;
        this.nukeFlash = nukeCfg.flash ?? nukeCfg.FLASH_ALPHA ?? CONFIG.ENGINE.NUKE.DEFAULT_FLASH;
        if (!soundManager.playSFX('nuke', CONFIG.ENGINE.NUKE.SFX_VOL)) soundManager.playSynth('nuke');
        const nukeDmg = nukeCfg.damage ?? nukeCfg.DAMAGE ?? CONFIG.ENGINE.NUKE.DEFAULT_DAMAGE;
        this.enemies.forEach(e => {
            if (!e.isDead) {
                e.takeDamage(nukeDmg);
                for(let j=0; j<CONFIG.ENGINE.NUKE.ENEMY_SLASHES; j++) this.particles.push(new SlashParticle(e.x, e.y, '#fff'));
                this.damageNumbers.push(new DamageNumber(e.x, e.y, 'NUKE', true));
            }
        });
    }

    buildRunSnapshot(timerText) {
        return buildRunSnapshotSystem(this, timerText);
    }

    shareRunSummary() {
        shareRunSummarySystem(this);
    }

    updateStatsGrid(containerId) {
        updateStatsGridSystem(this, containerId);
    }

    updateHUD() {
        updateHUDSystemCore(this);
    }

    spawnEnemy(difficulty, type = 'zombie', hpTimeMult = 1) {
        spawnEnemySystem(this, difficulty, type, hpTimeMult);
    }

    onRunStarted() {}

    onPauseStateChanged(_isPaused) {}

    onDeathScreenShown(_timerText) {}

    onLevelUpStateChanged(_isActive) {}

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
        if (this.player.zeroFrameActive) {
            const r = this.player.zeroFrameActive.radius;
            const sx = this.player.x - this.camera.x;
            const sy = this.player.y - this.camera.y;
            const zeroCfg = this.player.getAbilityConfig?.(4) || {};
            const bubbleColor = zeroCfg.COLOR || '#00d1ff';
            this.ctx.save();
            this.ctx.strokeStyle = bubbleColor;
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = 0.12;
            this.ctx.fillStyle = bubbleColor;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
            this.ctx.stroke();
            this.ctx.restore();
        }
        if (this.player.graveTrailActive) {
            const gt = this.player.graveTrailActive;
            const gx = gt.x - this.camera.x;
            const gy = gt.y - this.camera.y;
            this.ctx.save();
            this.ctx.globalAlpha = 0.2;
            this.ctx.fillStyle = CONFIG.COLORS.NECRO;
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, gt.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        if (this.player.soulVortexActive) {
            const sv = this.player.soulVortexActive;
            const vx = sv.center.x - this.camera.x;
            const vy = sv.center.y - this.camera.y;
            const coreR = Math.max(8, sv.radius * CONFIG.ENGINE.NECROMANCER.VORTEX_CORE_RADIUS_MULT);
            this.ctx.save();
            this.ctx.globalAlpha = 0.2;
            this.ctx.fillStyle = '#2d1b69';
            this.ctx.beginPath();
            this.ctx.arc(vx, vy, sv.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 0.9;
            this.ctx.fillStyle = '#09060f';
            this.ctx.beginPath();
            this.ctx.arc(vx, vy, coreR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        if (this.player.meteorStrikes?.length) {
            const now = Date.now();
            this.player.meteorStrikes.forEach((strike) => {
                if (strike.impacted) return;
                const sx = strike.x - this.camera.x;
                const sy = strike.y - this.camera.y;
                const t = Math.max(0, (strike.impactAt - now) / Math.max(1, CONFIG.ENGINE.NECROMANCER.METEOR_IMPACT_DELAY_MS));
                this.ctx.save();
                this.ctx.strokeStyle = '#e67e22';
                this.ctx.globalAlpha = 0.35 + (1 - t) * 0.45;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(sx, sy, strike.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            });
        }
        if (this.player.gravityWellActive) {
            const gw = this.player.gravityWellActive;
            const gx = gw.center.x - this.camera.x;
            const gy = gw.center.y - this.camera.y;
            const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.08;
            const outerR = gw.radius * pulse;
            const coreR = Math.max(8, gw.radius * CONFIG.ENGINE.GRAVITY_WELL.KILL_RADIUS_MULT);
            this.ctx.save();
            this.ctx.globalAlpha = 0.22;
            this.ctx.fillStyle = '#8e44ad';
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, outerR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 0.95;
            this.ctx.fillStyle = '#06070a';
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, coreR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#d6b3ff';
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, coreR * 1.5, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
        this.player.draw(this.ctx, this.camera);
        if (this.player.lichAscendanceActive) {
            const sx = this.player.x - this.camera.x;
            const sy = this.player.y - this.camera.y;
            this.ctx.save();
            this.ctx.globalAlpha = 0.25;
            this.ctx.strokeStyle = '#8e44ad';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, this.player.size * 0.9, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
        if (this.critPulse > 0) {
            const sx = this.player.x - this.camera.x;
            const sy = this.player.y - this.camera.y;
            const radiusBase = this.player.size * CONFIG.ENGINE.CRIT.PULSE_RADIUS_MULT;
            const radius = radiusBase + this.critPulse * 12;
            this.ctx.save();
            this.ctx.globalAlpha = Math.min(1, this.critPulse * 0.5);
            this.ctx.strokeStyle = CONFIG.ENGINE.CRIT.PULSE_COLOR;
            this.ctx.lineWidth = 3 + this.critPulse * 4;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
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
        drawBackgroundSystem(this);
    }

    drawTile(tx, ty) {
        drawTileSystem(this, tx, ty);
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}



