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
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
              (window.innerWidth <= 850 && window.innerHeight <= 500) || 
              (window.innerWidth <= 500 && window.innerHeight <= 850)
};

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
    // Attempt to force landscape if supported
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => {
            console.warn(`Error attempting to lock orientation: ${err.message}`);
        });
    }

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

let currentCharIndex = 1;
const totalChars = 10;

function updateCharPreview() {
    if (charPreview) charPreview.src = `assets/char_${currentCharIndex}.svg`;
    if (charNameDisp) charNameDisp.innerText = `UNIT ${currentCharIndex.toString().padStart(2, '0')}`;
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        currentCharIndex = currentCharIndex > 1 ? currentCharIndex - 1 : totalChars;
        updateCharPreview();
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        currentCharIndex = currentCharIndex < totalChars ? currentCharIndex + 1 : 1;
        updateCharPreview();
    });
}

keys.currentDifficulty = 'NORMAL';
keys.selectedCharIndex = 1;

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
        // Check if we should show mobile controls
        const isActuallyMobile = keys.isMobile || ('ontouchstart' in window);
        if (isActuallyMobile) {
            requestMobileOptimizations();
            const mobileControls = document.getElementById('mobile-controls');
            if (mobileControls) mobileControls.classList.remove('hidden');
        }
        
        if (mainMenu) mainMenu.classList.add('hidden');
        if (cgMenu) cgMenu.classList.add('hidden');
    });
}

// Initialize Mobile Controls if they exist and we are on mobile
const isActuallyMobile = keys.isMobile || ('ontouchstart' in window);
if (isActuallyMobile) {
    const mobileControls = document.getElementById('mobile-controls');
    // Don't show immediately if menu is present, wait for start
    
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

    const triggerOptimizations = () => {
        if ((mainMenu && !mainMenu.classList.contains('hidden')) || (cgMenu && !cgMenu.classList.contains('hidden'))) {
            requestMobileOptimizations();
        }
    };
    document.addEventListener('touchstart', triggerOptimizations, { once: true });
    document.addEventListener('mousedown', triggerOptimizations, { once: true });
}
