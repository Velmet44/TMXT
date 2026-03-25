import { CONFIG } from './config.js';
import { soundManager } from './SoundManager.js';

export const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    escape: false,
    shift: false,
    z: false,
    x: false,
    c: false,
    v: false,
    // Mobile virtual keys
    mobileX: 0,
    mobileY: 0,
    isMobile: false // Will be determined on start/init
};

// Robust mobile detection
function checkIsMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window) || 
           (window.innerWidth <= 1024 && window.innerHeight <= 1024);
}

keys.isMobile = checkIsMobile();

class Joystick {
    constructor() {
        this.base = document.getElementById('joystick-base');
        this.stick = document.getElementById('joystick-stick');
        this.container = document.getElementById('joystick-container');
        this.active = false;
        this.touchId = null;
        this.startPos = { x: 0, y: 0 };
        this.currentPos = { x: 0, y: 0 };
        this.maxRadius = 60;

        if (this.container) {
            this.init();
        }
    }

    init() {
        this.container.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.handleEnd(e));
        window.addEventListener('touchcancel', (e) => this.handleEnd(e));
    }

    handleStart(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.active = true;
        this.touchId = touch.identifier;
        if (this.base) {
            const rect = this.base.getBoundingClientRect();
            this.startPos = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }
    }

    handleMove(e) {
        if (!this.active) return;

        let touch = null;
        for (let t of e.changedTouches) {
            if (t.identifier === this.touchId) {
                touch = t;
                break;
            }
        }
        if (!touch) return;
        e.preventDefault();

        const dx = touch.clientX - this.startPos.x;
        const dy = touch.clientY - this.startPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const moveDist = Math.min(dist, this.maxRadius);
        const targetX = Math.cos(angle) * moveDist;
        const targetY = Math.sin(angle) * moveDist;

        if (this.stick) {
            this.stick.style.transform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px))`;
        }

        keys.mobileX = targetX / this.maxRadius;
        keys.mobileY = targetY / this.maxRadius;
    }

    handleEnd(e) {
        for (let t of e.changedTouches) {
            if (t.identifier === this.touchId) {
                this.active = false;
                this.touchId = null;
                if (this.stick) {
                    this.stick.style.transform = 'translate(-50%, -50%)';
                }
                keys.mobileX = 0;
                keys.mobileY = 0;
                break;
            }
        }
    }
}

// Keyboard Handling
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    if (key === ' ' || key === 'spacebar') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    if (key === 'escape') keys.escape = true;
    else if (key === 'shift') {
        if (!keys.shift) soundManager.playSFX('dash');
        keys.shift = true;
    }
    else if (key in keys) keys[key] = true;
}, { capture: true, passive: false });

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'escape') keys.escape = false;
    else if (key === 'shift') keys.shift = false;
    else if (key in keys) keys[key] = false;
}, { capture: true, passive: false });

window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('blur', () => {
    for (let k in keys) {
        if (typeof keys[k] === 'boolean') keys[k] = false;
    }
}, { capture: true });

function requestMobileOptimizations() {
    // We don't force landscape anymore to allow portrait
    const doc = window.document;
    const docEl = doc.documentElement;
    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    if (requestFullScreen) {
        requestFullScreen.call(docEl).catch(err => {
            console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
}

// Mobile Initialization & Button Handling
const mainMenu = document.getElementById('main-menu');
const cgMenu = document.getElementById('cg-menu');
const startBtn = document.getElementById('start-btn');
const diffBtns = document.querySelectorAll('.diff-btn');

// Character Selection
const charPreview = document.getElementById('char-preview-img');
const charNameDisp = document.getElementById('char-name');
const prevBtn = document.getElementById('prev-char');
const nextBtn = document.getElementById('next-char');

const charList = Object.values(CONFIG.CHARACTERS || {});
let currentCharIndex = charList[0]?.id || 1;
const totalChars = charList.length || 1;

function updateCharPreview() {
    const idx = charList.findIndex(c => c.id === currentCharIndex);
    const entry = idx >= 0 ? charList[idx] : charList[0];
    if (!entry) return;
    if (charPreview) charPreview.src = entry.sprite || `assets/char_${entry.id}.svg`;
    if (charNameDisp) charNameDisp.innerText = entry.name || `UNIT ${entry.id.toString().padStart(2, '0')}`;
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        const idx = charList.findIndex(c => c.id === currentCharIndex);
        const newIdx = idx > 0 ? idx - 1 : charList.length - 1;
        currentCharIndex = charList[newIdx]?.id || currentCharIndex;
        updateCharPreview();
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const idx = charList.findIndex(c => c.id === currentCharIndex);
        const newIdx = idx < charList.length - 1 ? idx + 1 : 0;
        currentCharIndex = charList[newIdx]?.id || currentCharIndex;
        updateCharPreview();
    });
}

keys.currentDifficulty = 'NORMAL';
keys.selectedCharIndex = currentCharIndex;

updateCharPreview();

if (diffBtns) {
    diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            diffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            keys.currentDifficulty = btn.dataset.diff;
        });
    });
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        keys.selectedCharIndex = currentCharIndex;
        // Update isMobile check on start to be sure
        keys.isMobile = checkIsMobile();
        if (keys.isMobile && mainMenu) {
            mainMenu.style.transform = 'scale(0.9)';
            mainMenu.style.transformOrigin = 'top center';
        }
        
        if (keys.isMobile) {
            requestMobileOptimizations();
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) mobileControls.classList.remove('hidden');
        }
        
        if (mainMenu) mainMenu.classList.add('hidden');
        if (cgMenu) cgMenu.classList.add('hidden');
    });
}

// Always try to init Joystick if elements exist
new Joystick();

// Mobile Action Buttons
const dashBtn = document.getElementById('btn-dash');
if (dashBtn) {
    dashBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!keys.shift) soundManager.playSFX('dash');
        keys.shift = true;
    }, { passive: false });
    dashBtn.addEventListener('touchend', (e) => {
        keys.shift = false;
    });
}

const abilityKeys = ['z', 'x', 'c', 'v'];
abilityKeys.forEach((key, index) => {
    const btn = document.getElementById(`btn-ability-${index + 1}`);
    if (btn) {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[key] = true;
        }, { passive: false });
        btn.addEventListener('touchend', (e) => {
            keys[key] = false;
        });
    }
});

// Orientation change handling
window.addEventListener('resize', () => {
    keys.isMobile = checkIsMobile();
    const mobileControls = document.getElementById('mobile-controls');
    if (keys.isMobile && mainMenu && mainMenu.classList.contains('hidden') && cgMenu && cgMenu.classList.contains('hidden')) {
        if (mobileControls) mobileControls.classList.remove('hidden');
    }
});
