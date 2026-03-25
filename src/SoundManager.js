import { CONFIG } from './config.js';

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.bgm = null;
        this.currentBgmName = null;
        this.sounds = {}; // AudioBuffers for SFX
        this.isMuted = false;
        this.bgmVolume = CONFIG.AUDIO.DEFAULT_BGM_VOLUME;
        this.sfxVolume = CONFIG.AUDIO.DEFAULT_SFX_VOLUME;
        this.wasPlayingBeforeHide = false;
        
        this.sfxFiles = ['shoot', 'hit', 'xp', 'lvlup', 'dash', 'kick', 'hurt', 'pickup', 'death', 'start', 'crit', 'magnet', 'nuke', 'charge', 'invincible'];

        // Auto-pause when tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.bgm && !this.bgm.paused) {
                    this.wasPlayingBeforeHide = true;
                    this.bgm.pause();
                }
            } else {
                if (this.wasPlayingBeforeHide && this.bgm) {
                    this.bgm.play().catch(() => {});
                    this.wasPlayingBeforeHide = false;
                }
            }
        });
    }

    async init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load SFX
            for (const name of this.sfxFiles) {
                try {
                    const response = await fetch(`assets/${name}.wav`);
                    const arrayBuffer = await response.arrayBuffer();
                    this.sounds[name] = await this.ctx.decodeAudioData(arrayBuffer);
                } catch (e) {
                    console.warn(`Failed to load SFX: ${name}`, e);
                }
            }
        } catch (e) {
            console.error("Failed to initialize AudioContext", e);
        }

        // Resume context on any interaction
        const resume = () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            if (this.bgm && this.bgm.paused && this.currentBgmName) {
                this.bgm.play().catch(() => {});
            }
        };
        window.addEventListener('click', resume, { once: false });
        window.addEventListener('touchstart', resume, { once: false });
        window.addEventListener('keydown', resume, { once: false });
    }

    playSFX(name, pitchVar = CONFIG.AUDIO.SFX_DEFAULT_PITCH_VAR) {
        if (!this.ctx || !this.sounds[name]) return false;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds[name];
        
        // Pitch variation for juice
        if (pitchVar > 0) {
            source.playbackRate.value = 1 + (Math.random() - 0.5) * pitchVar;
        }

        const gain = this.ctx.createGain();
        gain.gain.value = this.sfxVolume;
        
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return true;
    }

    // Lightweight synthesized blips for events without wav assets
    playSynth(name) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;
        const tones = CONFIG.AUDIO.SYNTH_TONES;
        osc.frequency.value = tones[name] || tones.default;
        gain.gain.setValueAtTime(this.sfxVolume * CONFIG.AUDIO.DEFAULT_SYNTH_GAIN_MULT, now);
        gain.gain.exponentialRampToValueAtTime(CONFIG.AUDIO.SYNTH_RAMP_END, now + CONFIG.AUDIO.SYNTH_RAMP_TIME);
        osc.type = name === 'nuke' ? 'sawtooth' : 'triangle';
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + CONFIG.AUDIO.SYNTH_STOP_TIME);
    }

    async playBGM(name) {
        if (this.currentBgmName === name) return;
        this.init();
        
        // Stop current BGM
        if (this.bgm) {
            this.bgm.pause();
            this.bgm = null;
        }

        const fileName = name === 'menu' ? 'menue_bgm1.mp3' : 'game_bgm1.mp3';
        this.bgm = new Audio(`assets/${fileName}`);
        this.bgm.loop = true;
        this.bgm.volume = this.bgmVolume;
        this.currentBgmName = name;

        try {
            await this.bgm.play();
        } catch (e) {
            // This is expected if no interaction has happened yet
            console.log("BGM queued for first interaction.");
        }
    }

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm = null;
            this.currentBgmName = null;
        }
    }

    setVolume(type, value) {
        if (type === 'bgm') {
            this.bgmVolume = value;
            if (this.bgm) this.bgm.volume = value;
        } else {
            this.sfxVolume = value;
        }
    }
}

export const soundManager = new SoundManager();
window.soundManager = soundManager;
