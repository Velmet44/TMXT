export class SoundManager {
    constructor() {
        this.ctx = null;
        this.bgm = null;
        this.currentBgmName = null;
        this.sounds = {};
        this.isMuted = false;
        this.bgmVolume = 0.5;
        this.sfxVolume = 0.7;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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
            console.warn("BGM autoplay prevented. Waiting for user interaction.");
            // Browser might block autoplay until interaction
            const startPlay = () => {
                this.bgm.play();
                document.removeEventListener('click', startPlay);
                document.removeEventListener('touchstart', startPlay);
            };
            document.addEventListener('click', startPlay);
            document.addEventListener('touchstart', startPlay);
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
