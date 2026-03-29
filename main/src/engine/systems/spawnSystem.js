import { CONFIG } from '../../config.js';
import { Enemy } from '../../enemy.js';

export const spawnEnemySystem = (engine, difficulty, type = 'zombie', hpTimeMult = 1) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = CONFIG.ENEMY.DEFAULT.SPAWN_DISTANCE;
    const x = engine.player.x + Math.cos(angle) * dist;
    const y = engine.player.y + Math.sin(angle) * dist;
    const runtimeDifficulty = {
        ...(engine.difficulty || {}),
        enemyHp: (engine.difficulty?.enemyHp || 1) * hpTimeMult
    };
    engine.enemies.push(new Enemy(x, y, difficulty, type, runtimeDifficulty));
    if (type === 'leechling') {
        const leechFx = CONFIG.ENGINE.LEECH_HIT;
        if (typeof engine.spawnHitParticles === 'function') {
            engine.spawnHitParticles(x, y, leechFx.PARTICLE_COLOR, leechFx.SPAWN_PARTICLES);
            engine.spawnHitParticles(x, y, leechFx.BURST_COLOR, Math.max(2, Math.floor(leechFx.SPAWN_PARTICLES / 2)));
        }
        if (!engine.soundManager?.playSFX?.('magnet', 0.03)) {
            engine.soundManager?.playSynth?.('leech');
        }
    }
};

export const updateSpawnSystemCore = (engine, now, elapsedTime) => {
    const minutesElapsed = Math.floor(elapsedTime / CONFIG.ENGINE.TIME.SEC_PER_MIN);
    const diffMultiplier = Math.pow(CONFIG.SPAWN_SCALING.PER_MINUTE_MULT, minutesElapsed);
    const hpTimeMult = Math.pow(CONFIG.SPAWN_SCALING.HP_MULT_PER_MINUTE, minutesElapsed);
    const globalDifficulty = Math.min(
        CONFIG.ENEMY.DEFAULT.MAX_LEVEL,
        Math.floor(CONFIG.ENGINE.TIME.GLOBAL_LEVEL_BASE + elapsedTime / CONFIG.ENGINE.TIME.GLOBAL_LEVEL_SECONDS)
    );
    const spawnRate = Math.max(
        CONFIG.SPAWN_SCALING.MIN_SPAWN_INTERVAL,
        (CONFIG.ENEMY.ZOMBIE.SPAWN_RATE / diffMultiplier) * (engine.difficulty?.spawnRateMult || 1)
    );

    if (now - engine.lastSpawn <= spawnRate) return;
    const availableTypes = [];
    for (const [type, cfg] of Object.entries(CONFIG.ENEMY)) {
        if (type === 'DEFAULT') continue;
        if (elapsedTime >= cfg.SPAWN_TIME) availableTypes.push({ type: type.toLowerCase(), weight: cfg.SPAWN_WEIGHT });
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
    spawnEnemySystem(engine, globalDifficulty, selectedType, hpTimeMult);
    engine.lastSpawn = now;
};
