export const CONFIG = {
    TILE_SIZE: 64,
    PLAYER: {
        SPEED: 4,
        MAX_HP: 100,
        HP: 100,
        REGEN: 0.01,
        SIZE: 32,
        LERP: 0.1,
        ATTACK_RANGE: 400,
        ATTACK_COOLDOWN: 400,
        DAMAGE: 10,
        LIFESTEAL: 0,
        PROJ_COUNT: 1,
        // Energy Stats
        MAX_ENERGY: 100,
        ENERGY_REGEN_IDLE: 0.1,
        ENERGY_REGEN_WALK: 0.02,
        DASH_COST: 30,
        DASH_SPEED: 25,
        DASH_DURATION: 150, // ms
        ABILITY_COST: 100,
        CHARGEUP_DURATION: 10000 // 10s
    },
    ENEMY: {
        DEFAULT: {
            SPAWN_DISTANCE: 700,
            DESPAWN_DISTANCE: 1200,
            MAX_LEVEL: 8,
            SCALING: { HP: 1.4, SPEED: 1.15, DAMAGE: 1.3 }
        },
        ZOMBIE: {
            SPEED: 1.8,
            HP: 30,
            SIZE: 28,
            DAMAGE: 12,
            RANGE: 5,
            ATTACK_COOLDOWN: 400,
            XP_BASE: 5,
            XP_MAX: 200,
            ENERGY_DROP: 5,
            LEVEL_UP_TIME: 8000,
            SPAWN_TIME: 0,
            SPAWN_WEIGHT: 1.0,
            SPAWN_RATE: 1500
        },
        SKELETON: {
            SPEED: 1.2,
            HP: 20,
            SIZE: 26,
            DAMAGE: 15,
            RANGE: 300,
            ATTACK_COOLDOWN: 2000,
            XP_BASE: 15,
            XP_MAX: 300,
            ENERGY_DROP: 10,
            LEVEL_UP_TIME: 12000,
            SPAWN_TIME: 60,
            SPAWN_WEIGHT: 0.4
        },
        EXPLODER: {
            SPEED: 8,
            HP: 25,
            SIZE: 18,
            DAMAGE: 40,
            RANGE: 40,
            ATTACK_COOLDOWN: 500, // Fuse time equivalent
            XP_BASE: 20,
            XP_MAX: 400,
            ENERGY_DROP: 15,
            LEVEL_UP_TIME: 10000,
            SPAWN_TIME: 120,
            SPAWN_WEIGHT: 0.2
        }
    },
    SPAWN_SCALING: {
        PER_MINUTE_MULT: 3,
        MIN_SPAWN_INTERVAL: 40
    },
    XP_ORB: {
        SIZE: 6,
        MAGNET_DIST: 250,
        SPEED: 10,
        EXPLOSION_FORCE: 6,
        PICKUP_DELAY: 500,
        MAX_ORBS: 500 // Lag prevention limit
    },
    DIFFICULTIES: {
        EASY: { label: 'EASY', hpMult: 1.5, enemyHp: 0.7, enemySpeed: 0.8, enemyDmg: 0.6, xpMult: 1.2, spawnRateMult: 1.2 },
        NORMAL: { label: 'NORMAL', hpMult: 1.0, enemyHp: 1.0, enemySpeed: 1.0, enemyDmg: 1.0, xpMult: 1.0, spawnRateMult: 1.0 },
        HARD: { label: 'HARD', hpMult: 0.8, enemyHp: 1.5, enemySpeed: 1.2, enemyDmg: 1.4, xpMult: 0.8, spawnRateMult: 0.8 },
        IMPOSSIBLE: { label: 'IMPOSSIBLE', hpMult: 0.5, enemyHp: 3.0, enemySpeed: 1.5, enemyDmg: 2.5, xpMult: 0.5, spawnRateMult: 0.5 }
    },
    CAMERA: {
        ZOOM_MOBILE: 0.7,
        ZOOM_PC: 1.0
    },
    BULLET: {
        SPEED: 14,
        SIZE: 5
    },
    ITEMS: {
        DROP_CHANCE: 0.2, 
        DESPAWN_TIME: 30000, // 30s
        TYPES: {
            MAGNET: { id: 'magnet', color: '#9b59b6', duration: 8000, label: '🧲', chance: 0.15 },
            HEALTH: { id: 'health', color: '#e74c3c', value: 30, label: '❤️', chance: 0.20 },
            NUKE: { id: 'nuke', color: '#f1c40f', label: '☢️', chance: 0.15 },
            SPEED: { id: 'speed', color: '#2ecc71', duration: 10000, value: 1.5, label: '⚡', chance: 0.30 },
            RAPID: { id: 'rapid', color: '#e67e22', duration: 8000, value: 0.4, label: '🔫', chance: 0.20 }
        }
    },
    COLORS: {
        GRASS_1: '#2d5a27',
        GRASS_2: '#356a2e',
        GRASS_3: '#3b7533',
        BLOCK: '#4a4a4a',
        ZOMBIE: '#5d8a5a',
        SKELETON: '#ecf0f1',
        LADYBUG: '#e74c3c',
        XP: '#3498db',
        ENERGY: '#9b59b6', 
        BULLET: '#f39c12',
        ARROW: '#bdc3c7',
        COMMON: '#bdc3c7',
        UNCOMMON: '#2ecc71',
        RARE: '#3498db',
        LEGENDARY: '#f1c40f'
    }
};

export const UPGRADES = [
    { id: 'hp', name: 'Vitality', desc: '+20 Max HP', rarity: 'common', icon: '❤️', apply: (p) => { p.maxHp += 20; p.hp += 20; } },
    { id: 'regen', name: 'Recovery', desc: '+0.05 HP/sec Regen', rarity: 'common', icon: '🧪', apply: (p) => { p.regen += 0.05; } },
    { id: 'speed', name: 'Haste', desc: '+10% Move Speed', rarity: 'common', icon: '👟', apply: (p) => { p.speed += 0.4; } },
    { id: 'max_energy', name: 'Battery', desc: '+50 Max Energy', rarity: 'uncommon', icon: '🔋', apply: (p) => { p.maxEnergy += 50; } },
    { id: 'energy_regen', name: 'Zen', desc: '+50% Energy Regen', rarity: 'uncommon', icon: '🧘', apply: (p) => { p.energyRegenMult += 0.5; } },
    { id: 'damage', name: 'Might', desc: '+5 Attack Damage', rarity: 'uncommon', icon: '⚔️', apply: (p) => { p.damage += 5; } },
    { id: 'atk_speed', name: 'Frenzy', desc: '-15% Attack Cooldown', rarity: 'uncommon', icon: '⚡', apply: (p) => { p.atkCooldown *= 0.85; } },
    { id: 'proj_count', name: 'Volley', desc: 'Attack +1 Additional Target', rarity: 'rare', icon: '🏹', apply: (p) => { p.projCount += 1; } },
    { id: 'lifesteal', name: 'Vampirism', desc: '+5% Lifesteal', rarity: 'rare', icon: '🧛', apply: (p) => { p.lifesteal += 0.05; } },
    { id: 'range', name: 'Eagle Eye', desc: '+20% Attack Range', rarity: 'uncommon', icon: '🏹', apply: (p) => { p.atkRange *= 1.2; } },
    { id: 'multi_shot', name: 'Double Strike', desc: '10% Chance to fire twice', rarity: 'rare', icon: '🔥', apply: (p) => { p.multiShotChance = (p.multiShotChance || 0) + 0.1; } },
    { id: 'armor', name: 'Steel Skin', desc: 'Take 10% less damage', rarity: 'uncommon', icon: '🛡️', apply: (p) => { p.armor = (p.armor || 0) + 0.1; } },
    { id: 'crit', name: 'Critical Hit', desc: '+10% Crit Chance (x2 dmg)', rarity: 'rare', icon: '🎯', apply: (p) => { p.critChance = (p.critChance || 0) + 0.1; } },
    { id: 'god_mode', name: 'Divine Shield', desc: 'Regen full HP every level', rarity: 'legendary', icon: '👑', apply: (p) => { p.godMode = true; } },
    { id: 'bullet_size', name: 'Heavy Slugs', desc: '+50% Bullet Size', rarity: 'legendary', icon: '🌑', apply: (p) => { p.bulletSizeMult = (p.bulletSizeMult || 1) + 0.5; } }
];
