// Single source of truth for gameplay tuning.
// Main build canonical configuration file.
// Shared level-up options used by every character unless overridden in CHARACTER_PROFILES.
const sharedUpgrades = [
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

const bulwarkUpgrades = [
    { id: 'bw_hp', name: 'Aegis Core', desc: '+30 Max HP', rarity: 'common', icon: '\u2764', apply: (p) => { p.maxHp += 30; p.hp += 30; } },
    { id: 'bw_regen', name: 'Nanoweave Repair', desc: '+0.06 HP/sec Regen', rarity: 'common', icon: '\uD83E\uDDEA', apply: (p) => { p.regen += 0.06; } },
    { id: 'bw_energy', name: 'Reactor Overpack', desc: '+45 Max Energy', rarity: 'uncommon', icon: '\uD83D\uDD0B', apply: (p) => { p.maxEnergy += 45; p.energy += 45; } },
    { id: 'bw_energy_regen', name: 'Flux Loop', desc: '+45% Energy Regen', rarity: 'uncommon', icon: '\u267E', apply: (p) => { p.energyRegenMult += 0.45; } },
    { id: 'bw_range', name: 'Siege Reach', desc: '+22% Attack Range', rarity: 'uncommon', icon: '\uD83D\uDCCD', apply: (p) => { p.atkRange *= 1.22; } },
    { id: 'bw_attacks', name: 'Dual Impact', desc: '+1 Attack per swing', rarity: 'rare', icon: '\uD83D\uDCA5', apply: (p) => { p.projCount += 1; } },
    { id: 'bw_damage', name: 'Titan Knuckles', desc: '+6 Attack Damage', rarity: 'uncommon', icon: '\uD83D\uDCAA', apply: (p) => { p.damage += 6; } },
    { id: 'bw_atk_speed', name: 'Servo Overclock', desc: '-12% Attack Cooldown', rarity: 'rare', icon: '\u26A1', apply: (p) => { p.atkCooldown *= 0.88; } },
    { id: 'bw_dash_dmg', name: 'Ramming Field', desc: '+3 Dash Damage Mult', rarity: 'rare', icon: '\uD83D\uDE80', apply: (p) => { p.dashDamageMult = (p.dashDamageMult || 0) + 3; } },
    { id: 'bw_dash_range', name: 'Breach Vector', desc: '+35% Dash Attack Range', rarity: 'rare', icon: '\uD83D\uDCE1', apply: (p) => { p.dashRangeMult = (p.dashRangeMult || 1) + 0.35; } }
];

const necromancerUpgrades = [
    { id: 'nc_hp', name: 'Bone Ward', desc: '+22 Max HP', rarity: 'common', icon: '\u2620', apply: (p) => { p.maxHp += 22; p.hp += 22; } },
    { id: 'nc_regen', name: 'Soul Stitch', desc: '+0.05 HP/sec Regen', rarity: 'common', icon: '\u2697', apply: (p) => { p.regen += 0.05; } },
    { id: 'nc_energy', name: 'Hex Battery', desc: '+55 Max Energy', rarity: 'uncommon', icon: '\uD83D\uDD0B', apply: (p) => { p.maxEnergy += 55; p.energy += 55; } },
    { id: 'nc_energy_regen', name: 'Dark Focus', desc: '+55% Energy Regen', rarity: 'uncommon', icon: '\uD83C\uDF19', apply: (p) => { p.energyRegenMult += 0.55; } },
    { id: 'nc_damage', name: 'Witchfire Amp', desc: '+6 Attack Damage', rarity: 'uncommon', icon: '\uD83D\uDD25', apply: (p) => { p.damage += 6; } },
    { id: 'nc_range', name: 'Eldritch Reach', desc: '+25% Attack Range', rarity: 'rare', icon: '\u2728', apply: (p) => { p.atkRange *= 1.25; } },
    { id: 'nc_atk_speed', name: 'Ritual Haste', desc: '-14% Attack Cooldown', rarity: 'rare', icon: '\u26A1', apply: (p) => { p.atkCooldown *= 0.86; } },
    { id: 'nc_pierce', name: 'Spectral Thread', desc: '+1 Projectile Pierce', rarity: 'rare', icon: '\uD83E\uDEA1', apply: (p) => { p.extraPierce = (p.extraPierce || 0) + 1; } },
    { id: 'nc_lifesteal', name: 'Soul Leech', desc: '+6% Lifesteal', rarity: 'rare', icon: '\uD83D\uDD2E', apply: (p) => { p.lifesteal += 0.06; } },
    { id: 'nc_splash', name: 'Blight Nova', desc: '+20 Fireball Splash Radius', rarity: 'legendary', icon: '\uD83C\uDF11', apply: (p) => { p.extraSplashRadius = (p.extraSplashRadius || 0) + 20; } }
];

export const CONFIG = {
    // Global world/camera tuning.
    WORLD: {
        TILE_SIZE: 32,
        TILE_SIZE_MOBILE_MULT: 2,
        CAMERA: { ZOOM_MOBILE: 0.7, ZOOM_PC: 1.0 },
        PARTICLES: { MOBILE_MULT: 0.5, PC_MULT: 1.0 }
    },
    // Runtime knobs for movement, regen, baseline ability gates, and player visuals.
    PLAYER_RUNTIME: {
        DEFAULT_CHARACTER_ID: 1,
        INITIAL_LEVEL: 1,
        INITIAL_XP: 0,
        INITIAL_XP_TO_NEXT: 10,
        INITIAL_TOTAL_XP: 0,
        INITIAL_KILLS: 0,
        ENERGY_REGEN_MULT: 1.0,
        INPUT_STEP: 1,
        INPUT_DEADZONE: 0.1,
        WALK_TIMER_STEP: 0.2,
        TILT_TARGET: 0.1,
        TILT_LERP: 0.1,
        TILT_IDLE_DAMP: 0.9,
        SPEED_MULT_ITEM: 1.5,
        SPEED_MULT_CHARGE: 1.2,
        ATK_CD_MULT_RAPID: 0.4,
        ATK_CD_MULT_CHARGE: 0.5,
        DAMAGE_MULT_CHARGE: 1.5,
        DAMAGE_MULT_INVINCIBLE: 2.0,
        REGEN_TICK_MS: 1000,
        GUN_RECOIL_DAMP: 0.8,
        MIN_MELEE_RANGE: 80,
        ABILITY_MIN_LEVEL: 3,
        DASH_SFX_VOL: 0.05,
        VISUAL: {
            WALK_BOB_AMPLITUDE: 3,
            WALK_ANGLE_AMPLITUDE: 0.1,
            SHADOW_ALPHA: 0.3,
            SHADOW_RY_RATIO: 0.5,
            INV_RING_SIZE_MULT: 0.8,
            INV_RING_WIDTH: 4,
            INV_FILL: 'rgba(241, 196, 15, 0.2)',
            INV_SPRITE_SCALE: 1.12,
            CHARGE_SPRITE_SCALE: 1.05,
            SPRITE_BUFF_INV: 'rgba(241,196,15,0.35)',
            SPRITE_BUFF_CHARGE: 'rgba(155,89,182,0.35)',
            FALLBACK_EYE_SIZE_MULT: 0.2,
            FALLBACK_EYE_PAD: 4,
            FALLBACK_MOUTH_X: 4,
            FALLBACK_MOUTH_Y: -1.5,
            FALLBACK_MOUTH_W: 8,
            FALLBACK_MOUTH_H: 2
        }
    },
    // Input tuning for both keyboard and touch controls.
    INPUT: {
        MOBILE_MAX_SIZE: 1024,
        JOYSTICK_RADIUS: 60,
        MENU_SCALE_MOBILE: 0.9
    },
    // Audio defaults and synth fallback tones.
    AUDIO: {
        DEFAULT_BGM_VOLUME: 0.4,
        DEFAULT_SFX_VOLUME: 0.5,
        DEFAULT_SYNTH_GAIN_MULT: 0.6,
        SYNTH_RAMP_END: 0.0001,
        SYNTH_RAMP_TIME: 0.25,
        SYNTH_STOP_TIME: 0.3,
        SFX_DEFAULT_PITCH_VAR: 0.1,
        SYNTH_TONES: { crit: 880, magnet: 660, leech: 520, necro: 420, nuke: 120, default: 500 }
    },
    // Bullet travel and rendering values.
    BULLET: {
        SPEED: 14,
        SIZE: 5,
        DAMAGE: 10,
        ENEMY_SIZE: 4,
        PLAYER_SIZE_VAR_MIN: 0.8,
        PLAYER_SIZE_VAR_RANGE: 0.4,
        PLAYER_SPEED_VAR_MIN: 0.8,
        PLAYER_SPEED_VAR_RANGE: 0.4,
        FRAME_STEP: 0.2,
        TRAIL_LENGTH: 5,
        TRAIL_ALPHA: 0.35,
        RUNTIME: {
            MIN_AIM_DIST: 0.0001
        },
        ENEMY_ARROW: { BODY_W: 20, BODY_H: 2, BODY_X: -10, BODY_Y: -1, TIP_X: 10, WING_X: 5, WING_Y: 3 },
        PLAYER_VISUAL: { PULSE_AMPLITUDE: 2, OUTER_ALPHA: 0.4, OUTER_LEN_MULT: 6, OUTER_WIDTH_MULT: 7, CORE_LEN_MULT: 3 },
        TRAIL_MIN_WIDTH: 1
    },
    // Enemy archetype stats plus global enemy runtime/visual tuning.
    ENEMY: {
        DEFAULT: { SPAWN_DISTANCE: 700, DESPAWN_DISTANCE: 1200, MAX_LEVEL: 8, SCALING: { HP: 1.4, SPEED: 1.15, DAMAGE: 1.3, ATTACK_CD: 0.95 } },
        ZOMBIE: { SPEED: 1.8, HP: 30, SIZE: 28, DAMAGE: 12, RANGE: 5, ATTACK_COOLDOWN: 400, XP_BASE: 5, XP_MAX: 200, ENERGY_DROP: 5, LEVEL_UP_TIME: 8000, SPAWN_TIME: 0, SPAWN_WEIGHT: 1.0, SPAWN_RATE: 1500 },
        SKELETON: { SPEED: 1.2, HP: 20, SIZE: 26, DAMAGE: 15, PROJ_SPEED: 8, RANGE: 300, ATTACK_COOLDOWN: 2000, XP_BASE: 15, XP_MAX: 300, ENERGY_DROP: 10, LEVEL_UP_TIME: 12000, SPAWN_TIME: 60, SPAWN_WEIGHT: 0.4 },
        EXPLODER: { SPEED: 8, HP: 25, SIZE: 18, DAMAGE: 40, RANGE: 40, ATTACK_COOLDOWN: 500, XP_BASE: 20, XP_MAX: 400, ENERGY_DROP: 15, LEVEL_UP_TIME: 10000, SPAWN_TIME: 120, SPAWN_WEIGHT: 0.2 },
        LEECHLING: { SPEED: 2.6, HP: 18, SIZE: 20, DAMAGE: 8, RANGE: 5, ATTACK_COOLDOWN: 650, XP_BASE: 10, XP_MAX: 240, ENERGY_DROP: 7, LEVEL_UP_TIME: 11000, SPAWN_TIME: 180, SPAWN_WEIGHT: 0.25 },
        RUNTIME: {
            SPEED_RAND_BASE: 0.9,
            SPEED_RAND_RANGE: 0.2,
            DEATH_TIMER_STEP: 0.05,
            STUN_FRAME_STEP: 0.05,
            FRAME_STEP: 0.1,
            HIT_FLASH_TICKS: 10,
            SCALE_POP_DECAY: 0.8,
            SCALE_POP_MIN: 0.01,
            LEVEL_TICKS_PER_SECOND: 60,
            MIN_MOVE_DIST: 1,
            FACING_THRESHOLD: 0,
            MOVE_STOP_DIST: 5,
            SKELETON_RETREAT_GAP: 50,
            SKELETON_ATTACK_BUFFER: 50,
            LEECH_ENERGY_DRAIN: 15,
            LEECH_HEAL_PER_ENERGY: 0.5
        },
        VISUAL: {
            DEATH_SCALE_X_GROWTH: 1.0,
            DEATH_SCALE_Y_SHRINK: 0.5,
            STUN_ALPHA_MULT: 0.7,
            STUN_ALPHA_MIN: 0.4,
            LEVEL_SCALE_PER_LEVEL: 0.1,
            EXPLODER_FLASH_FREQ: 0.02,
            EXPLODER_SCALE_MULT: 1.2,
            LIMB_LIMP_FREQ: 0.5,
            LIMB_LIMP_AMPLITUDE: 4,
            LIMB_SWAY_AMPLITUDE: 3,
            SHADOW: { RX: 10, RY: 5, ALPHA: 0.15 },
            ZOMBIE: { HEAD_PAD: 2, ARM_W: 12, ARM_H: 6, ARM_X: 0, ARM_Y: -5 },
            SKELETON: { BODY_INSET_X: 4, BODY_INSET_Y: 8, HEAD_Y: 10, HEAD_H: 12, BOW_W: 10, BOW_X: 5, BOW_LINE: 2 },
            EXPLODER: { SPOT_R: 2, SPOT_A: -2, SPOT_B: 3, SPOT_C: -6 },
            LEECHLING: { BODY_R_X: 0.55, BODY_R_Y: 0.45, CORE_R: 0.22, FANG_Y: 0.05, FANG_W: 0.18, FANG_H: 0.25 },
            EYES: { Y: -8, SIZE: 4, L_X: -3, R_X: 4, RED_X: 5, RED_Y: -7, RED_SIZE: 2 },
            HEALTH_BAR: { H: 5, OFFSET_Y: 20, LEVEL_TEXT_OFFSET_Y: 25, LEVEL_FONT_BASE: 10 },
            STUN_ORB: { OFFSET_Y_MULT: 0.8, SIZE_MULT: 0.3 }
        }
    },
    // Difficulty scaling over run-time.
    SPAWN_SCALING: { PER_MINUTE_MULT: 3, MIN_SPAWN_INTERVAL: 40, HP_MULT_PER_MINUTE: 2 },
    // XP orb motion, pickup behavior, and rendering.
    XP_ORB: {
        SIZE: 7,
        MAGNET_DIST: 250,
        SPEED: 10,
        EXPLOSION_FORCE: 6,
        PICKUP_DELAY: 500,
        MAX_ORBS: 500,
        RUNTIME: {
            FRICTION: 0.95,
            SHINE_INIT_MAX: 10,
            PICKUP_RADIUS_PAD: 10,
            MIN_PULL_DIST: 1,
            GLOBAL_PULL_SPEED: 15,
            LOCAL_PULL_DIVISOR: 50,
            SHINE_STEP: 0.1,
            SIZE_POP_DAMP: 0.9,
            SHINE_AMPLITUDE: 2,
            GLOW_ALPHA: 0.3,
            HIGHLIGHT_OFFSET: 1,
            HIGHLIGHT_SIZE: 1
        }
    },
    // World item drops and per-item effect payloads.
    ITEMS: {
        DROP_CHANCE: 0.1,
        DESPAWN_TIME: 30000,
        TYPES: {
            MAGNET: { id: 'magnet', color: '#9b59b6', duration: 8000, label: '\uD83E\uDDF2', chance: 0.15 },
            HEALTH: { id: 'health', color: '#e74c3c', value: 30, label: '\u2764', chance: 0.20 },
            NUKE: { id: 'nuke', color: '#f1c40f', label: '\u2622', chance: 0.20 },
            SPEED: { id: 'speed', color: '#2ecc71', duration: 10000, value: 1.5, label: '\u26A1', chance: 0.25 },
            RAPID: { id: 'rapid', color: '#e67e22', duration: 8000, value: 0.4, label: '\uD83C\uDFF9', chance: 0.20 }
        },
        RUNTIME: {
            SIZE: 12,
            LIFE_TICK: 16,
            MAGNET_PULL_SPEED: 12,
            MIN_PULL_DIST: 1,
            OFFSCREEN_MARGIN: 100,
            BOB_DIVISOR: 200,
            BOB_AMPLITUDE: 3,
            GLOW_BLUR: 10,
            LABEL_FONT: '12px Arial',
            LABEL_Y_OFFSET: 1
        }
    },
    // Generic visual effects (particles/slashes/floating texts).
    EFFECTS: {
        PARTICLE: {
            BASE_SPEED_MIN: 2,
            BASE_SPEED_RANGE: 6,
            BASE_DECAY_MIN: 0.01,
            BASE_DECAY_RANGE: 0.03,
            BASE_SIZE_MIN: 2,
            BASE_SIZE_RANGE: 6,
            BASE_GRAVITY: 0.15,
            BASE_VEL_DAMP: 0.96,
            BASE_ROT_SPEED: 0.2,
            BLOOD_DECAY_MIN: 0.005,
            BLOOD_DECAY_RANGE: 0.02,
            BLOOD_SIZE_MIN: 4,
            BLOOD_SIZE_RANGE: 8,
            BLOOD_GRAVITY: 0.25,
            BLOOD_SPEED_MIN: 4,
            BLOOD_SPEED_RANGE: 8
        },
        SLASH: {
            LENGTH_MIN: 50,
            LENGTH_RANGE: 100,
            WIDTH_MIN: 1,
            WIDTH_RANGE: 2,
            SPEED_MIN: 10,
            SPEED_RANGE: 15,
            LIFE: 1.0,
            DECAY: 0.05
        },
        FLOATING_TEXT: {
            DAMAGE_VY: -2,
            DAMAGE_DECAY: 0.02,
            DAMAGE_VY_DAMP: 0.95,
            ITEM_LABEL_VY: -1.5,
            ITEM_LABEL_DECAY: 0.02,
            ITEM_LABEL_VY_DAMP: 0.96,
            FONT: { CRIT_MOBILE: 18, CRIT_PC: 24, BASE_MOBILE: 12, BASE_PC: 16 }
        }
    },
    // Core combat/runtime behavior used by engine.js.
    ENGINE: {
        ABILITY_ERROR_DURATION_MS: 1200,
        CAMERA_LERP_FALLBACK: 0.1,
        SHAKE: { DASH: 5, CHARGED_CHANCE: 0.1, CHARGED_VALUE: 2, INVINCIBLE: 3, DAMP: 0.9, MIN: 0.1 },
        DASH_TRAIL_INTERVAL_MS: 40,
        STUN: {
            SHAKE: 10,
            HIT_STOP: 4,
            FLASH_ALPHA: 0.35,
            RING_SLASH_COUNT: 12,
            RING_DIST_BASE: 40,
            RING_DIST_RAND: 30,
            SCREEN_MARGIN: 100,
            PARTICLES: 8,
            LABEL_OFFSET_Y: 50,
            SFX_VOL: 0.05
        },
        GRAVITY_WELL: {
            SHAKE: 6,
            FLASH_ALPHA: 0.25,
            AFFECT_RADIUS_MULT: 1.4,
            DEFAULT_RADIUS: 240,
            DEFAULT_PULL: 1.0,
            DEFAULT_DAMAGE_MULT: 4,
            DIST_MIN: 1,
            SOFT_STUN_MS: 80,
            SPARK_CHANCE: 0.05,
            EXPLOSION_SHAKE: 16,
            EXPLOSION_SLASH_COUNT: 20,
            EXPLOSION_PARTICLES: 8,
            KILL_RADIUS_MULT: 0.18,
            PULL_CURVE_POWER: 1.35,
            SCREEN_FLASH_WHILE_ACTIVE: 0.07
        },
        NECROMANCER: {
            GRAVE_STEP_SHAKE: 10,
            GRAVE_TRAIL_TICK_MS: 220,
            METEOR_COUNT_DEFAULT: 5,
            METEOR_IMPACT_DELAY_MS: 550,
            METEOR_STAGGER_MS: 180,
            METEOR_RADIUS: 90,
            METEOR_PARTICLES: 18,
            VORTEX_CORE_RADIUS_MULT: 0.2,
            VORTEX_TICK_MS: 180,
            VORTEX_DRAIN_MULT: 0.12,
            VORTEX_PARTICLES: 10,
            LICH_AURA_FLASH: 0.09
        },
        DASH_HIT: { PARTICLES: 6, SHAKE: 12, SFX_VOL: 0.1 },
        NukeActivation: { DEFAULT_MIN_LEVEL: 3 },
        NUKE: { DEFAULT_DAMAGE: 9999, DEFAULT_SHAKE: 50, DEFAULT_FLASH: 1.0, DEFAULT_MAX_CHARGES: 3, SFX_VOL: 0.05, ENEMY_SLASHES: 3 },
        TIME: { SEC_PER_MIN: 60, MS_TO_SEC: 1000, GLOBAL_LEVEL_BASE: 1, GLOBAL_LEVEL_SECONDS: 30 },
        PLAYER_BULLET_HIT: { SHAKE: 15, FLASH: 1.0, BLOOD_COUNT: 8 },
        EXPLODER_HIT: { RANGE: 80, SHAKE: 25, FLASH: 1.0, HITSTOP: 5, BLOOD_COUNT: 15 },
        CONTACT_HIT: { SHAKE: 10, FLASH: 1.0, HITSTOP: 2, BLOOD_COUNT: 5 },
        LEECH_HIT: {
            PARTICLES: 8,
            SPAWN_PARTICLES: 6,
            SFX_VOL: 0.06,
            LABEL_COLOR: '#9b59b6',
            LABEL_OFFSET_Y: 26,
            PARTICLE_COLOR: '#7bed9f',
            BURST_COLOR: '#9b59b6'
        },
        CRIT: {
            DAMAGE_MULT: 2,
            HITSTOP: 2,
            SHAKE: 15,
            SFX_CRIT_VOL: 0.05,
            SFX_HIT_VOL: 0.15,
            PULSE_INTENSITY: 1,
            PULSE_DECAY: 0.04,
            PULSE_COLOR: '#f1c40f',
            PULSE_RADIUS_MULT: 1.6
        },
        HIT_SFX_VOL: 0.05,
        ITEM_LABEL_OFFSET_Y: 40,
        XP: { ENDGAME_THRESHOLD: 10000, ENDGAME_MULT: 10, ORB_SPLIT_DIVISOR: 10, LEVEL_SCALING_DIVISOR: 7 },
        ENEMY_DEATH: { SHAKE: 5, HITSTOP: 1, BLOOD: 10, KICK_SFX_VOL: 1.0 },
        ITEM_SCREEN_MARGIN: 100,
        XP_ORB_POP: 15,
        NORMAL_SHOT: { MULTI_SHOT_COUNT: 2, MULTI_DELAY_MS: 100, SFX_VOL: 0.1, MUZZLE_PARTICLES: 2, RECOIL: 10 },
        MELEE_SHOT: { HIT_PARTICLES_PRIMARY: 10, HIT_PARTICLES_SECONDARY: 4, HITSTOP: 3, SHAKE: 8, SFX_VOL: 0.2 },
        PARTICLE_SPAWN_DEFAULT: 5,
        TIMER_PAD: 2,
        SUMMARY: { SIZE: 720, TITLE_X: 360, TITLE_Y: 80, STATS_Y: 160, STAT_LINE_GAP: 50, MOBILE_FONT: 24, PC_FONT: 28 },
        STATS: { ATK_SPEED_FACTOR: 1000 },
        LEVELUP: { SHAKE: 15, LABEL_OFFSET_Y: 60, OPTIONS: 3 },
        SCREEN_FLASH: { PLAYER_HIT_ALPHA_MULT: 0.3, PLAYER_HIT_DAMP: 0.9, STUN_DAMP: 0.85, GRAVITY_DAMP: 0.85, NUKE_DAMP: 0.05 },
        RENDER: { CLEAR_MARGIN: 50, TILE_PAD_START: 1, TILE_PAD_END: 2, TILE_SEED_A: 12.9898, TILE_SEED_B: 78.233, TILE_SEED_MUL: 43758.5453, TILE_BLEND_1: 0.8, TILE_BLEND_2: 0.95, BLOCK_CHANCE: 0.05, BLOCK_SIZE_MULT: 0.125, BLOCK_OFFSET_MULT: 0.3125 }
    },
    // Difficulty presets visible in menus.
    DIFFICULTIES: {
        EASY: { label: 'EASY', hpMult: 1.5, enemyHp: 0.7, enemySpeed: 0.8, enemyDmg: 0.6, xpMult: 1.2, spawnRateMult: 1.2 },
        NORMAL: { label: 'NORMAL', hpMult: 1.0, enemyHp: 1.0, enemySpeed: 1.0, enemyDmg: 1.0, xpMult: 1.0, spawnRateMult: 1.0 },
        HARD: { label: 'HARD', hpMult: 0.8, enemyHp: 1.5, enemySpeed: 1.2, enemyDmg: 1.4, xpMult: 0.8, spawnRateMult: 0.8 },
        IMPOSSIBLE: { label: 'IMPOSSIBLE', hpMult: 0.5, enemyHp: 3.0, enemySpeed: 1.5, enemyDmg: 2.5, xpMult: 0.5, spawnRateMult: 0.5 }
    },
    // Shared palette.
    COLORS: {
        GRASS_1: '#2d5a27',
        GRASS_2: '#356a2e',
        GRASS_3: '#3b7533',
        BLOCK: '#4a4a4a',
        ZOMBIE: '#5d8a5a',
        ZOMBIE_CLOTHES: '#3e513c',
        SKELETON: '#ecf0f1',
        LADYBUG: '#e74c3c',
        LEECHLING: '#7bed9f',
        NECRO: '#6c5ce7',
        XP: '#3498db',
        ENERGY: '#9b59b6',
        BULLET: '#f39c12',
        ARROW: '#bdc3c7',
        COMMON: '#bdc3c7',
        UNCOMMON: '#2ecc71',
        RARE: '#3498db',
        LEGENDARY: '#f1c40f'
    },
    // Upgrade pools; character profiles reference these by key.
    UPGRADES: {
        SHARED: sharedUpgrades,
        BULWARK: bulwarkUpgrades,
        NECROMANCER: necromancerUpgrades
    },
    // Character-specific level scaling + ability definitions.
    CHARACTER_PROFILES: {
        char_1: {
            id: 1,
            upgradeSet: 'SHARED',
            leveling: { HP_PER_LEVEL: 5, DMG_PER_LEVEL: 1, SPD_PER_LEVEL: 0.05, ATK_COOLDOWN_MULT: 0.98, PROJ_INTERVAL: 1, PROJ_PER_INTERVAL: 1, XP_GROWTH_MULT: 2.0, XP_GROWTH_BASE: 0, ENERGY_PER_LEVEL: 5 },
            abilities: {
                ABILITY_1: { NAME: 'CHARGE', ICON: '\u26A1', COLOR: '#9b59b6', MIN_LEVEL: 3, DURATION: 10000, EFFECT: 'self_charge' },
                ABILITY_2: { NAME: 'INVICTUS', ICON: '\uD83D\uDEE1', COLOR: '#f1c40f', MIN_LEVEL: 3, DURATION: 6000, SPEED_MULT: 2.5, EFFECT: 'invincible' },
                ABILITY_3: { NAME: 'NUKE', ICON: '\u2622', COLOR: '#f1c40f', MIN_LEVEL: 3, DAMAGE: 9999, SCREEN_SHAKE: 50, FLASH_ALPHA: 1.0, EFFECT: 'nuke' },
                ABILITY_4: { NAME: 'ZERO FRAME', ICON: '\uD83C\uDF00', COLOR: '#00d1ff', MIN_LEVEL: 3, DURATION: 5000, RADIUS: 260, ENEMY_SPEED_MULT: 0.45, ENEMY_PROJ_SPEED_MULT: 0.5, PLAYER_PROJ_SPEED_MULT: 1.8, EFFECT: 'zero_frame' }
            }
        },
        char_2: {
            id: 2,
            upgradeSet: 'BULWARK',
            leveling: { HP_PER_LEVEL: 7, DMG_PER_LEVEL: 1.5, SPD_PER_LEVEL: 0.04, ATK_COOLDOWN_MULT: 0.99, PROJ_INTERVAL: 2, PROJ_PER_INTERVAL: 0, XP_GROWTH_MULT: 2.0, XP_GROWTH_BASE: 0, ENERGY_PER_LEVEL: 6 },
            abilities: {
                ABILITY_1: { NAME: 'STUN SURGE', ICON: '\u26A1', COLOR: '#9b59b6', MIN_LEVEL: 3, DURATION: 10000, EFFECT: 'stun_all' },
                ABILITY_2: { NAME: 'BLACKHOLE CORE', ICON: '\uD83D\uDEE1', COLOR: '#1f2430', MIN_LEVEL: 3, DURATION: 2800, EFFECT: 'gravity_well', RADIUS: 220, PULL: 2.1, DAMAGE: 99999, TARGET_VISIBLE: false },
                ABILITY_3: { NAME: 'SHOCKWAVE SLAM', ICON: '\uD83D\uDCA5', COLOR: '#e67e22', MIN_LEVEL: 3, EFFECT: 'shockwave', DAMAGE: 360, RADIUS: 320, KNOCKBACK: 140, VULNERABLE_MULT: 1.35, VULNERABLE_MS: 5000, STUN_MS: 400 },
                ABILITY_4: { NAME: 'CITADEL MODE', ICON: '\uD83E\uDDF1', COLOR: '#95a5a6', MIN_LEVEL: 3, EFFECT: 'citadel', DURATION: 7000, RANGE_MULT: 2.4, ATTACK_BONUS: 3, ATK_COOLDOWN_MULT: 0.75 }
            }
        },
        char_3: {
            id: 3,
            upgradeSet: 'NECROMANCER',
            leveling: { HP_PER_LEVEL: 4, DMG_PER_LEVEL: 1.4, SPD_PER_LEVEL: 0.05, ATK_COOLDOWN_MULT: 0.985, PROJ_INTERVAL: 2, PROJ_PER_INTERVAL: 1, XP_GROWTH_MULT: 2.0, XP_GROWTH_BASE: 0, ENERGY_PER_LEVEL: 7 },
            abilities: {
                ABILITY_1: { NAME: 'GRAVE STEP', ICON: '\uD83D\uDD2E', COLOR: '#6c5ce7', MIN_LEVEL: 3, EFFECT: 'grave_step', DISTANCE: 220, TRAIL_DURATION: 1800, TRAIL_RADIUS: 52, TRAIL_DAMAGE: 60 },
                ABILITY_2: { NAME: 'SOUL VORTEX', ICON: '\uD83C\uDF19', COLOR: '#2d1b69', MIN_LEVEL: 3, EFFECT: 'soul_vortex', DURATION: 3200, RADIUS: 230, PULL: 1.9, DAMAGE: 99999 },
                ABILITY_3: { NAME: 'METEOR RAIN', ICON: '\u2604', COLOR: '#e67e22', MIN_LEVEL: 3, EFFECT: 'meteor_rain', METEOR_COUNT: 5, DAMAGE: 360, RADIUS: 90, IMPACT_DELAY: 550, STAGGER: 180 },
                ABILITY_4: { NAME: 'LICH ASCENDANCE', ICON: '\u2620', COLOR: '#8e44ad', MIN_LEVEL: 3, EFFECT: 'lich_form', DURATION: 7000, DAMAGE_MULT: 1.4, PIERCE: 2, LIFESTEAL_BONUS: 0.12, SPLASH_RADIUS: 70 }
            }
        }
    },
    // Base stat templates + per-character multipliers.
    CHARACTERS: {
        char_1: {
            id: 1,
            name: 'RANGER-01',
            sprite: 'assets/char_1.svg',
            base: {
                SIZE: 42,
                LERP: 0.1,
                SPEED: 4,
                MAX_HP: 100,
                REGEN: 0.01,
                DAMAGE: 10,
                LIFESTEAL: 0,
                ATTACK_RANGE: 400,
                ATTACK_COOLDOWN: 400,
                PROJ_COUNT: 1,
                MAX_ENERGY: 100,
                ENERGY_REGEN_IDLE: 0.1,
                ENERGY_REGEN_WALK: 0.02,
                DASH_COST: 30,
                DASH_SPEED: 25,
                DASH_DURATION: 150,
                CHARGEUP_DURATION: 10000,
                INVINCIBILITY_DURATION: 6000,
                INVINCIBILITY_SPEED_MULT: 2.5
            },
            modifiers: { hp: 1.0, damage: 1.0, speed: 1.0, regen: 1.0, lifesteal: 1.0, projCount: 1.0, atkRange: 1.0, atkCooldown: 1.0, maxEnergy: 1.0, energyIdle: 1.0, energyWalk: 1.0, dashCost: 1.0, dashSpeed: 1.0, dashDuration: 1.0, chargeupDuration: 1.0, invincibilityDuration: 1.0, invincibilitySpeedMult: 1.0, armor: 0.0, dashDamageMult: 0, dashParticle: '#f39c12', canShoot: true }
        },
        char_2: {
            id: 2,
            name: 'BULWARK-02',
            sprite: 'assets/char_2.svg',
            base: {
                SIZE: 42,
                LERP: 0.1,
                SPEED: 10,
                MAX_HP: 140,
                REGEN: 0.012,
                DAMAGE: 15,
                LIFESTEAL: 0,
                ATTACK_RANGE: 120,
                ATTACK_COOLDOWN: 450,
                PROJ_COUNT: 0,
                MAX_ENERGY: 150,
                ENERGY_REGEN_IDLE: 0.18,
                ENERGY_REGEN_WALK: 0.18,
                DASH_COST: 24,
                DASH_SPEED: 30,
                DASH_DURATION: 180,
                CHARGEUP_DURATION: 10000,
                INVINCIBILITY_DURATION: 6000,
                INVINCIBILITY_SPEED_MULT: 2.5
            },
            modifiers: { hp: 1.8, damage: 1.5, speed: 0.8, regen: 1.2, lifesteal: 1.0, projCount: 0.0, atkRange: 0.8, atkCooldown: 1.1, maxEnergy: 1.2, energyIdle: 1.8, energyWalk: 1.8, dashCost: 0.8, dashSpeed: 1.5, dashDuration: 1.2, chargeupDuration: 1.0, invincibilityDuration: 1.0, invincibilitySpeedMult: 1.2, armor: 0.2, dashDamageMult: 10, dashParticle: '#e74c3c', canShoot: false }
        },
        char_3: {
            id: 3,
            name: 'Necromancer-03',
            sprite: 'assets/char_3.svg',
            base: {
                SIZE: 42,
                LERP: 0.1,
                SPEED: 4.6,
                MAX_HP: 95,
                REGEN: 0.011,
                DAMAGE: 12,
                LIFESTEAL: 0.02,
                ATTACK_RANGE: 430,
                ATTACK_COOLDOWN: 360,
                PROJ_COUNT: 1,
                MAX_ENERGY: 130,
                ENERGY_REGEN_IDLE: 0.16,
                ENERGY_REGEN_WALK: 0.08,
                DASH_COST: 22,
                DASH_SPEED: 28,
                DASH_DURATION: 160,
                CHARGEUP_DURATION: 9000,
                INVINCIBILITY_DURATION: 5000,
                INVINCIBILITY_SPEED_MULT: 2.0
            },
            modifiers: { hp: 1.0, damage: 1.0, speed: 1.0, regen: 1.0, lifesteal: 1.0, projCount: 1.0, atkRange: 1.0, atkCooldown: 1.0, maxEnergy: 1.0, energyIdle: 1.0, energyWalk: 1.0, dashCost: 0.9, dashSpeed: 1.1, dashDuration: 1.0, chargeupDuration: 1.0, invincibilityDuration: 1.0, invincibilitySpeedMult: 1.0, armor: 0.0, dashDamageMult: 0, dashParticle: '#6c5ce7', canShoot: true }
        }
    },
    // Legacy aliases kept so older modules can keep reading while refactor is in progress.
    TILE_SIZE: 32,
    PARTICLES: { MOBILE_MULT: 0.5, PC_MULT: 0.7 },
    CAMERA: { ZOOM_MOBILE: 0.6, ZOOM_PC: 1.0 }
};
