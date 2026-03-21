export const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    escape: false,
    control: false,
    z: false,
    x: false,
    c: false,
    v: false,
    // Mobile virtual keys
    mobileX: 0,
    mobileY: 0,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768)
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

        if (keys.isMobile) {
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
        const rect = this.base.getBoundingClientRect();
        this.startPos = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
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

        this.stick.style.transform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px))`;

        keys.mobileX = targetX / this.maxRadius;
        keys.mobileY = targetY / this.maxRadius;
    }

    handleEnd(e) {
        for (let t of e.changedTouches) {
            if (t.identifier === this.touchId) {
                this.active = false;
                this.touchId = null;
                this.stick.style.transform = 'translate(-50%, -50%)';
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

    // Prevent default browser actions for game controls (e.g., Ctrl+S, Ctrl+W)
    if (e.ctrlKey || e.metaKey) {
        if (['w', 'a', 's', 'd', 'z', 'x', 'c', 'v'].includes(key)) {
            e.preventDefault();
        }
    }

    if (key === 'escape') keys.escape = true;
    else if (key === 'control') keys.control = true;
    else if (key in keys) keys[key] = true;
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'escape') keys.escape = false;
    else if (key === 'control') keys.control = false;
    else if (key in keys) keys[key] = false;
});

// Mobile Optimization: Fullscreen & Landscape
function requestMobileOptimizations() {
    if (!keys.isMobile) return;

    const doc = window.document;
    const docEl = doc.documentElement;

    // 1. Fullscreen
    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    if (requestFullScreen) {
        requestFullScreen.call(docEl).catch(err => {
            console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }

    // 2. Orientation (Landscape)
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => {
            console.warn(`Error attempting to lock orientation: ${err.message}`);
        });
    }
}

// Mobile Initialization & Button Handling
const mainMenu = document.getElementById('main-menu');
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
    charPreview.src = `assets/char_${currentCharIndex}.svg`;
    charNameDisp.innerText = `UNIT ${currentCharIndex.toString().padStart(2, '0')}`;
}

prevBtn.addEventListener('click', () => {
    currentCharIndex = currentCharIndex > 1 ? currentCharIndex - 1 : totalChars;
    updateCharPreview();
});

nextBtn.addEventListener('click', () => {
    currentCharIndex = currentCharIndex < totalChars ? currentCharIndex + 1 : 1;
    updateCharPreview();
});

keys.currentDifficulty = 'NORMAL';
keys.selectedCharIndex = 1;

diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        keys.currentDifficulty = btn.dataset.diff;
    });
});

startBtn.addEventListener('click', () => {
    keys.selectedCharIndex = currentCharIndex;
    if (keys.isMobile) {
        requestMobileOptimizations();
    }
    mainMenu.classList.add('hidden');
});

if (keys.isMobile) {
    document.getElementById('mobile-controls').classList.remove('hidden');
    new Joystick();

    // Mobile Action Buttons
    const dashBtn = document.getElementById('btn-dash');
    dashBtn.addEventListener('touchstart', (e) => { 
        e.preventDefault(); 
        keys.control = true; 
    }, { passive: false });
    dashBtn.addEventListener('touchend', (e) => { 
        keys.control = false; 
    });

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

    // Request orientations early on any user interaction in the menu to ensure lock works
    document.addEventListener('touchstart', () => {
        if (mainMenu.offsetParent) requestMobileOptimizations();
    }, { once: true });
}
