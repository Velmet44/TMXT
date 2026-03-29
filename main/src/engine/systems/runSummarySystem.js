import { CONFIG } from '../../config.js';
import { keys } from '../../input.js';

export const buildRunSnapshotSystem = (engine, timerText) => {
    const p = engine.player;
    const difficultyLabel = engine.difficulty?.label || 'NORMAL';
    const charId = p.characterId || keys.selectedCharIndex || CONFIG.PLAYER_RUNTIME.DEFAULT_CHARACTER_ID;
    const charEntry = Object.values(CONFIG.CHARACTERS).find((item) => item.id === charId);
    return {
        recordedAt: new Date().toISOString(),
        durationLabel: timerText,
        durationSeconds: Math.max(0, Math.floor(engine.elapsedTime || 0)),
        difficulty: difficultyLabel,
        characterId: charId,
        characterName: charEntry?.name || `CHAR-${charId}`,
        level: p.level,
        xp: Math.floor(p.xp),
        xpToNext: p.xpToNext,
        totalXp: Math.floor(p.totalXp),
        kills: p.killCount,
        hp: Math.ceil(p.hp),
        maxHp: p.maxHp,
        energy: Math.floor(p.energy),
        maxEnergy: p.maxEnergy,
        damage: Math.round(p.getCurrentDamage()),
        attackCooldownMs: Number(p.getCurrentAtkCooldown().toFixed(2)),
        projectiles: p.projCount,
        range: Math.round(p.atkRange),
        moveSpeed: Number(p.getCurrentSpeed().toFixed(2)),
        regenPerSec: Number(p.regen.toFixed(3)),
        energyRegenMult: Number(p.energyRegenMult.toFixed(2)),
        lifesteal: Number(((p.lifesteal || 0) * 100).toFixed(1)),
        critChance: Number(((p.critChance || 0) * 100).toFixed(1)),
        armor: Number(((p.armor || 0) * 100).toFixed(1))
    };
};

export const shareRunSummarySystem = (engine) => {
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.ENGINE.SUMMARY.SIZE;
    canvas.height = CONFIG.ENGINE.SUMMARY.SIZE;
    const ctx = canvas.getContext('2d');

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
        `Time: ${engine.finalTimeStr || document.getElementById('timer').innerText}`,
        `Level: ${engine.player.level}`,
        `Kills: ${engine.player.killCount}`,
        `Total XP: ${Math.floor(engine.player.totalXp)}`,
        `Damage: ${Math.round(engine.player.getCurrentDamage())}`,
        `Projectiles: ${engine.player.projCount}`
    ];
    stats.forEach((s, i) => ctx.fillText(s, CONFIG.ENGINE.SUMMARY.TITLE_X, CONFIG.ENGINE.SUMMARY.STATS_Y + i * CONFIG.ENGINE.SUMMARY.STAT_LINE_GAP));

    const link = document.createElement('a');
    link.download = `tmxt-run-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
};
