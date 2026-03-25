const upgradesShared = [
    { id: 'hp', name: 'Vitality', desc: '+20 Max HP', rarity: 'common', icon: '\u2764', apply: (p) => { p.maxHp += 20; p.hp += 20; } },
    { id: 'regen', name: 'Recovery', desc: '+0.05 HP/sec Regen', rarity: 'common', icon: '\uD83E\uDDEA', apply: (p) => { p.regen += 0.05; } },
    { id: 'speed', name: 'Haste', desc: '+10% Move Speed', rarity: 'common', icon: '\uD83D\uDC7C', apply: (p) => { p.speed += 0.4; } },
    { id: 'max_energy', name: 'Battery', desc: '+50 Max Energy', rarity: 'uncommon', icon: '\uD83D\uDD0B', apply: (p) => { p.maxEnergy += 50; } },
    { id: 'energy_regen', name: 'Zen', desc: '+50% Energy Regen', rarity: 'uncommon', icon: '\uD83E\uDDD8', apply: (p) => { p.energyRegenMult += 0.5; } },
    { id: 'damage', name: 'Might', desc: '+5 Attack Damage', rarity: 'uncommon', icon: '\u2694', apply: (p) => { p.damage += 5; } },
    { id: 'atk_speed', name: 'Frenzy', desc: '-15% Attack Cooldown', rarity: 'uncommon', icon: '\u26A1', apply: (p) => { p.atkCooldown *= 0.85; } },
    { id: 'proj_count', name: 'Volley', desc: 'Attack +1 Additional Target', rarity: 'rare', icon: '\uD83C\uDFF9', apply: (p) => { p.projCount += 1; } },
    { id: 'lifesteal', name: 'Vampirism', desc: '+5% Lifesteal', rarity: 'rare', icon: '\uD83E\uDDDB', apply: (p) => { p.lifesteal += 0.05; } },
    { id: 'range', name: 'Eagle Eye', desc: '+20% Attack Range', rarity: 'uncommon', icon: '\uD83C\uDFF9', apply: (p) => { p.atkRange *= 1.2; } },
    { id: 'multi_shot', name: 'Double Strike', desc: '10% Chance to fire twice', rarity: 'rare', icon: '\uD83D\uDD25', apply: (p) => { p.multiShotChance = (p.multiShotChance || 0) + 0.1; } },
    { id: 'armor', name: 'Steel Skin', desc: 'Take 10% less damage', rarity: 'uncommon', icon: '\uD83D\uDEE1', apply: (p) => { p.armor = (p.armor || 0) + 0.1; } },
    { id: 'crit', name: 'Critical Hit', desc: '+10% Crit Chance (x2 dmg)', rarity: 'rare', icon: '\uD83C\uDFC7', apply: (p) => { p.critChance = (p.critChance || 0) + 0.1; } },
    { id: 'god_mode', name: 'Divine Shield', desc: 'Regen full HP every level', rarity: 'legendary', icon: '\uD83D\uDD31', apply: (p) => { p.godMode = true; } },
    { id: 'bullet_size', name: 'Heavy Slugs', desc: '+50% Bullet Size', rarity: 'legendary', icon: '\uD83C\uDF11', apply: (p) => { p.bulletSizeMult = (p.bulletSizeMult || 1) + 0.5; } }
];

export const CONFIG = {
    TILE_SIZE: 64,
    ENEMY: {
        DEFAULT: { SPAWN_DISTANCE: 700, DESPAWN_DISTANCE: 1200, MAX_LEVEL: 8, SCALING: { HP: 1.4, SPEED: 1.15, DAMAGE: 1.3 } },
        ZOMBIE:   { SPEED: 1.8, HP: 30, SIZE: 28, DAMAGE: 12, RANGE: 5, ATTACK_COOLDOWN: 400, XP_BASE: 5, XP_MAX: 200, ENERGY_DROP: 5, LEVEL_UP_TIME: 8000, SPAWN_TIME: 0, SPAWN_WEIGHT: 1.0, SPAWN_RATE: 1500 },
        SKELETON: { SPEED: 1.2, HP: 20, SIZE: 26, DAMAGE: 15, PROJ_SPEED: 8, RANGE: 300, ATTACK_COOLDOWN: 2000, XP_BASE: 15, XP_MAX: 300, ENERGY_DROP: 10, LEVEL_UP_TIME: 12000, SPAWN_TIME: 60, SPAWN_WEIGHT: 0.4 },
        EXPLODER: { SPEED: 8, HP: 25, SIZE: 18, DAMAGE: 40, RANGE: 40, ATTACK_COOLDOWN: 500, XP_BASE: 20, XP_MAX: 400, ENERGY_DROP: 15, LEVEL_UP_TIME: 10000, SPAWN_TIME: 120, SPAWN_WEIGHT: 0.2 }
    },
    SPAWN_SCALING: { PER_MINUTE_MULT: 3, MIN_SPAWN_INTERVAL: 40 },
    XP_ORB: { SIZE: 6, MAGNET_DIST: 250, SPEED: 10, EXPLOSION_FORCE: 6, PICKUP_DELAY: 500, MAX_ORBS: 500 },
    DIFFICULTIES: {
        EASY:        { label: 'EASY', hpMult: 1.5, enemyHp: 0.7, enemySpeed: 0.8, enemyDmg: 0.6, xpMult: 1.2, spawnRateMult: 1.2 },
        NORMAL:      { label: 'NORMAL', hpMult: 1.0, enemyHp: 1.0, enemySpeed: 1.0, enemyDmg: 1.0, xpMult: 1.0, spawnRateMult: 1.0 },
        HARD:        { label: 'HARD', hpMult: 0.8, enemyHp: 1.5, enemySpeed: 1.2, enemyDmg: 1.4, xpMult: 0.8, spawnRateMult: 0.8 },
        IMPOSSIBLE:  { label: 'IMPOSSIBLE', hpMult: 0.5, enemyHp: 3.0, enemySpeed: 1.5, enemyDmg: 2.5, xpMult: 0.5, spawnRateMult: 0.5 }
    },
    PARTICLES: { MOBILE_MULT: 0.5, PC_MULT: 1.0 },
    CAMERA: { ZOOM_MOBILE: 0.7, ZOOM_PC: 1.0 },
    BULLET: { SPEED: 14, SIZE: 5, DAMAGE: 10 },
    ITEMS: {
        DROP_CHANCE: 0.05,
        DESPAWN_TIME: 30000,
        TYPES: {
            MAGNET: { id: 'magnet', color: '#9b59b6', duration: 8000, label: '\uD83E\uDDF2', chance: 0.15 },
            HEALTH: { id: 'health', color: '#e74c3c', value: 30, label: '\u2764', chance: 0.20 },
            NUKE:   { id: 'nuke', color: '#f1c40f', label: '\u2622', chance: 0.15 },
            SPEED:  { id: 'speed', color: '#2ecc71', duration: 10000, value: 1.5, label: '\u26A1', chance: 0.30 },
            RAPID:  { id: 'rapid', color: '#e67e22', duration: 8000, value: 0.4, label: '\uD83C\uDFF9', chance: 0.20 }
        }
    },
    COLORS: {
        GRASS_1: '#2d5a27', GRASS_2: '#356a2e', GRASS_3: '#3b7533', BLOCK: '#4a4a4a', ZOMBIE: '#5d8a5a', ZOMBIE_CLOTHES: '#3e513c', SKELETON: '#ecf0f1', LADYBUG: '#e74c3c', XP: '#3498db', ENERGY: '#9b59b6', BULLET: '#f39c12', ARROW: '#bdc3c7', COMMON: '#bdc3c7', UNCOMMON: '#2ecc71', RARE: '#3498db', LEGENDARY: '#f1c40f'
    },
    CHARACTERS: {
        char_1: {
            id: 1,
            name: 'RANGER-01',
            sprite: 'assets/char_1.svg',
            base: {
                SIZE: 32, LERP: 0.1,
                SPEED: 4, MAX_HP: 100, REGEN: 0.01, DAMAGE: 10, LIFESTEAL: 0,
                ATTACK_RANGE: 400, ATTACK_COOLDOWN: 400, PROJ_COUNT: 1,
                MAX_ENERGY: 100, ENERGY_REGEN_IDLE: 0.1, ENERGY_REGEN_WALK: 0.02,
                DASH_COST: 30, DASH_SPEED: 25, DASH_DURATION: 150,
                ABILITY_COST: 100, CHARGEUP_DURATION: 10000,
                ABILITY_2_COST: 160, INVINCIBILITY_DURATION: 6000, INVINCIBILITY_SPEED_MULT: 2.5
            },
            leveling: { HP_PER_LEVEL: 5, DMG_PER_LEVEL: 1, SPD_PER_LEVEL: 0.05, ATK_COOLDOWN_MULT: 0.98, PROJ_INTERVAL: 1, PROJ_PER_INTERVAL: 1, XP_GROWTH_MULT: 1.3, XP_GROWTH_BASE: 10, ENERGY_PER_LEVEL: 5 },
            abilities: {
                CHARGE: { MIN_LEVEL: 3, COST: 100, DURATION: 10000, EFFECT: 'self_charge' },
                INVINCIBLE: { MIN_LEVEL: 3, COST: 160, DURATION: 6000, SPEED_MULT: 2.5 },
                NUKE: { MIN_LEVEL: 10, MAX_CHARGES: 3, DAMAGE: 9999, SCREEN_SHAKE: 50, FLASH_ALPHA: 1.0 }
            },
            upgrades: upgradesShared,
            modifiers: { hp: 1.0, damage: 1.0, speed: 1.0, regen: 1.0, lifesteal: 1.0, projCount: 1.0, atkRange: 1.0, atkCooldown: 1.0, maxEnergy: 1.0, energyIdle: 1.0, energyWalk: 1.0, dashCost: 1.0, dashSpeed: 1.0, dashDuration: 1.0, abilityCost: 1.0, ability2Cost: 1.0, chargeupDuration: 1.0, invincibilityDuration: 1.0, invincibilitySpeedMult: 1.0, armor: 0.0, dashDamageMult: 0, dashParticle: '#f39c12', canShoot: true }
        },
        char_2: {
            id: 2,
            name: 'BULWARK-02',
            sprite: 'assets/char_2.svg',
            base: {
                SIZE: 36, LERP: 0.1,
                SPEED: 3.2, MAX_HP: 140, REGEN: 0.012, DAMAGE: 15, LIFESTEAL: 0,
                ATTACK_RANGE: 120, ATTACK_COOLDOWN: 450, PROJ_COUNT: 0,
                MAX_ENERGY: 150, ENERGY_REGEN_IDLE: 0.18, ENERGY_REGEN_WALK: 0.18,
                DASH_COST: 24, DASH_SPEED: 30, DASH_DURATION: 180,
                ABILITY_COST: 100, CHARGEUP_DURATION: 10000,
                ABILITY_2_COST: 160, INVINCIBILITY_DURATION: 6000, INVINCIBILITY_SPEED_MULT: 2.5
            },
            leveling: { HP_PER_LEVEL: 7, DMG_PER_LEVEL: 1.5, SPD_PER_LEVEL: 0.04, ATK_COOLDOWN_MULT: 0.99, PROJ_INTERVAL: 2, PROJ_PER_INTERVAL: 0, XP_GROWTH_MULT: 1.3, XP_GROWTH_BASE: 10, ENERGY_PER_LEVEL: 6 },
            abilities: {
                CHARGE: { MIN_LEVEL: 3, COST: 100, DURATION: 10000, EFFECT: 'stun_all' },
                INVINCIBLE: { MIN_LEVEL: 3, COST: 160, DURATION: 2800, EFFECT: 'gravity_well', RADIUS: 260, PULL: 1.2, DAMAGE: 320 },
                NUKE: { MIN_LEVEL: 10, MAX_CHARGES: 3, DAMAGE: 9999, SCREEN_SHAKE: 50, FLASH_ALPHA: 1.0 }
            },
            upgrades: upgradesShared,
            modifiers: { hp: 1.8, damage: 1.5, speed: 0.8, regen: 1.2, lifesteal: 1.0, projCount: 0.0, atkRange: 0.8, atkCooldown: 1.1, maxEnergy: 1.2, energyIdle: 1.8, energyWalk: 1.8, dashCost: 0.8, dashSpeed: 1.5, dashDuration: 1.2, abilityCost: 1.0, ability2Cost: 1.0, chargeupDuration: 1.0, invincibilityDuration: 1.0, invincibilitySpeedMult: 1.2, armor: 0.2, dashDamageMult: 10, dashParticle: '#e74c3c', canShoot: false }
        }
    }
};
