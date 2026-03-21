export class SoundManager {
    constructor() {
        this.ctx = null;
        this.bgm = null;
        this.currentBgmName = null;
        this.sounds = {}; // AudioBuffers for SFX
        this.isMuted = false;
        this.bgmVolume = 0.4;
        this.sfxVolume = 0.5;
        this.wasPlayingBeforeHide = false;
        
        this.sfxFiles = ['shoot', 'hit', 'xp', 'lvlup', 'dash', 'kick', 'hurt'];

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

    playSFX(name, pitchVar = 0.1) {
        if (!this.ctx || !this.sounds[name]) return;
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
