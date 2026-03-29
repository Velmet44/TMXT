import { CONFIG } from '../../config.js';

const setTextIfChanged = (el, text) => {
    if (!el) return;
    if (el.innerText !== text) el.innerText = text;
};

const setWidthIfChanged = (el, widthText) => {
    if (!el) return;
    if (el.style.width !== widthText) el.style.width = widthText;
};

const setHeightIfChanged = (el, heightText) => {
    if (!el) return;
    if (el.style.height !== heightText) el.style.height = heightText;
};

export const updateStatsGridSystem = (engine, containerId) => {
    const p = engine.player;
    const diffLabel = engine.difficulty ? engine.difficulty.label : 'NORMAL';
    const stats = [
        { label: 'Difficulty', value: diffLabel },
        { label: 'Level', value: p.level },
        { label: 'HP', value: `${Math.ceil(p.hp)} / ${p.maxHp}` },
        { label: 'Damage', value: Math.round(p.getCurrentDamage()) },
        { label: 'Atk Speed', value: (CONFIG.ENGINE.STATS.ATK_SPEED_FACTOR / p.getCurrentAtkCooldown()).toFixed(1) + '/s' },
        { label: 'Targets', value: p.projCount },
        { label: 'Move Speed', value: p.getCurrentSpeed().toFixed(1) },
        { label: 'Regen', value: p.regen.toFixed(3) + '/s' },
        { label: 'E-Regen', value: (p.energyRegenMult * 100).toFixed(0) + '%' },
        { label: 'Lifesteal', value: (p.lifesteal * 100).toFixed(0) + '%' },
        { label: 'Crit Chance', value: ((p.critChance || 0) * 100).toFixed(0) + '%' },
        { label: 'Armor', value: ((p.armor || 0) * 100).toFixed(0) + '%' }
    ];
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = stats.map((s) => `<div class="stat-item"><span class="stat-label">${s.label}</span><span class="stat-value">${s.value}</span></div>`).join('');
};

export const updateHUDSystemCore = (engine) => {
    const p = engine.player;
    const now = Date.now();

    const hpPerc = `${(p.hp / p.maxHp) * 100}%`;
    const enPerc = `${(p.energy / p.maxEnergy) * 100}%`;
    const xpPerc = `${(p.xp / p.xpToNext) * 100}%`;
    setWidthIfChanged(document.getElementById('hp-bar'), hpPerc);
    setWidthIfChanged(document.getElementById('energy-bar'), enPerc);
    setWidthIfChanged(document.getElementById('xp-bar'), xpPerc);
    setTextIfChanged(document.getElementById('lvl-text'), String(p.level));
    setTextIfChanged(document.getElementById('xp-val-text'), String(Math.floor(p.xp)));
    setTextIfChanged(document.getElementById('xp-needed-text'), String(p.xpToNext));
    setTextIfChanged(document.getElementById('hp-text'), `HP: ${Math.ceil(p.hp)} / ${p.maxHp}`);
    setTextIfChanged(document.getElementById('energy-text'), `ENERGY: ${Math.floor(p.energy)} / ${p.maxEnergy}`);

    const fullEnergyReady = p.energy >= p.maxEnergy;
    for (let slot = 1; slot <= 4; slot++) {
        const cfg = p.getAbilityConfig?.(slot) || {};
        const slotEl = document.getElementById(`ability-${slot}`);
        const cooldownEl = document.getElementById(`ability-cooldown-${slot}`);
        if (!slotEl || !cooldownEl) continue;

        const minLevel = p.getAbilityMinLevel?.(slot) || CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL;
        const unlocked = p.level >= minLevel;
        const color = cfg.COLOR || '#9b59b6';
        const name = p.getAbilityName?.(slot) || `ABILITY ${slot}`;
        const hasRequiredNukeCharge = cfg.EFFECT === 'nuke' ? (p.nukeCharges || 0) > 0 : true;
        const abilityNameEl = slotEl.querySelector('.ability-name');
        setTextIfChanged(abilityNameEl, name);
        slotEl.classList.remove('empty');

        if (!unlocked) {
            slotEl.classList.add('locked');
            slotEl.style.borderColor = '#555';
            setHeightIfChanged(cooldownEl, '100%');
            continue;
        }

        slotEl.classList.remove('locked');
        const hudState = p.getAbilityHudState?.(slot, now) || { active: false, remaining: 0 };
        const active = !!hudState.active;
        const remaining = Math.max(0, Math.min(1, hudState.remaining || 0));

        if (active) {
            setHeightIfChanged(cooldownEl, `${(1 - remaining) * 100}%`);
            slotEl.style.borderColor = '#e74c3c';
        } else {
            setHeightIfChanged(cooldownEl, '0%');
            slotEl.style.borderColor = (fullEnergyReady && hasRequiredNukeCharge) ? color : '#555';
        }
    }

    for (let slot = 1; slot <= 4; slot++) {
        const btn = document.getElementById(`btn-ability-${slot}`);
        if (!btn) continue;
        const cfg = p.getAbilityConfig?.(slot) || {};
        const minLevel = p.getAbilityMinLevel?.(slot) || CONFIG.PLAYER_RUNTIME.ABILITY_MIN_LEVEL;
        const name = p.getAbilityName?.(slot) || `ABILITY ${slot}`;
        const hasRequiredNukeCharge = cfg.EFFECT === 'nuke' ? (p.nukeCharges || 0) > 0 : true;
        setTextIfChanged(btn, name);
        const active = p.isAbilityActive?.(slot) || false;
        btn.disabled = p.level < minLevel || !fullEnergyReady || active || !hasRequiredNukeCharge;
        if (!cfg.NAME) btn.disabled = true;
    }

    const abilityErrorEl = document.getElementById('ability-error-msg');
    if (!abilityErrorEl) return;
    if (p.abilityErrorText && now < (p.abilityErrorUntil || 0)) {
        setTextIfChanged(abilityErrorEl, p.abilityErrorText);
        abilityErrorEl.classList.remove('hidden');
    } else {
        abilityErrorEl.classList.add('hidden');
    }
};

export const updateHUDWithTimerSystem = (engine, elapsedTime = null) => {
    updateHUDSystemCore(engine);
    if (elapsedTime === null) return;
    const seconds = Math.floor(elapsedTime % CONFIG.ENGINE.TIME.SEC_PER_MIN);
    const minutes = Math.floor(elapsedTime / CONFIG.ENGINE.TIME.SEC_PER_MIN);
    setTextIfChanged(document.getElementById('timer'), `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
};
