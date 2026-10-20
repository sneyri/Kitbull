'use strict';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* Безопасная работа с localStorage (в приватном режиме он может быть недоступен) */
const store = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ничего страшного */ }
    },
};

const mouse = { x: -9999, y: -9999 };
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });

/* =========================================================
   1. Фон: тлеющие искры и лапки по клику
   ========================================================= */
const canvas = $('#particles');
const ctx = canvas.getContext('2d');
const EMBER_COLORS = ['240,169,62', '242,129,58', '229,143,176', '150,120,200'];
const BURST_SYMBOLS = ['🐾', '♥', '🐟', '✦'];

let width = 0;
let height = 0;
let embers = [];
let bursts = [];

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(60, Math.max(20, (width * height) / 28000)));
    embers = Array.from({ length: count }, createEmber);
}

function createEmber() {
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.1 - Math.random() * 0.3, // искры медленно поднимаются вверх
        r: 1 + Math.random() * 2,
        color: EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.02,
    };
}

function updateEmber(p) {
    p.phase += p.speed;
    p.vx += Math.cos(p.phase * 1.3) * 0.003;

    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 130 && dist > 0) {
        const force = (130 - dist) / 130;
        p.vx += (dx / dist) * force * 0.5;
        p.vy += (dy / dist) * force * 0.5;
    }

    p.vx *= 0.98;
    p.vy = p.vy * 0.98 + (-0.18 - p.vy) * 0.005;
    p.x += p.vx;
    p.y += p.vy;

    if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
}

function drawEmber(p) {
    const glow = 0.5 + 0.5 * Math.sin(p.phase * 3);
    const radius = p.r * (3 + glow * 2.5);
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    gradient.addColorStop(0, `rgba(${p.color},${0.25 + glow * 0.45})`);
    gradient.addColorStop(1, `rgba(${p.color},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function spawnBurst(x, y) {
    const count = 8;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 2 + Math.random() * 3;
        bursts.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1,
            size: 16 + Math.random() * 14,
            rot: (Math.random() - 0.5) * 0.8,
            symbol: BURST_SYMBOLS[Math.floor(Math.random() * BURST_SYMBOLS.length)],
        });
    }
}

function drawBursts() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    bursts = bursts.filter((b) => b.life > 0);
    for (const b of bursts) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.12;
        b.vx *= 0.99;
        b.life -= 0.016;
        ctx.save();
        ctx.globalAlpha = Math.max(b.life, 0);
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot * (1 - b.life) * 6);
        ctx.font = `${b.size}px sans-serif`;
        ctx.fillStyle = b.symbol === '♥' ? '#e58fb0' : b.symbol === '✦' ? '#f0a93e' : '#fff';
        ctx.fillText(b.symbol, 0, 0);
        ctx.restore();
    }
}

let pageVisible = true;
function backgroundFrame() {
    if (pageVisible) {
        ctx.clearRect(0, 0, width, height);
        embers.forEach((p) => { updateEmber(p); drawEmber(p); });
        drawBursts();
    }
    requestAnimationFrame(backgroundFrame);
}

document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

if (reduceMotion) {
    canvas.hidden = true;
} else {
    resizeCanvas();
    requestAnimationFrame(backgroundFrame);
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('click', (e) => spawnBurst(e.clientX, e.clientY));
}

/* =========================================================
   2. Сфера из символов в шапке (лапки, рыбки, глаза...)
   ========================================================= */
const GLYPHS = {
    paw(c, s) {
        c.beginPath();
        c.ellipse(0, s * 0.3, s * 0.52, s * 0.4, 0, 0, Math.PI * 2);
        [[-0.62, -0.22], [-0.21, -0.62], [0.21, -0.62], [0.62, -0.22]].forEach(([x, y]) => {
            c.moveTo(x * s + s * 0.22, y * s);
            c.arc(x * s, y * s, s * 0.22, 0, Math.PI * 2);
        });
        c.fill();
    },
    heart(c, s) {
        c.beginPath();
        c.moveTo(0, s * 0.7);
        c.bezierCurveTo(-s * 1.1, -s * 0.05, -s * 0.55, -s * 0.85, 0, -s * 0.3);
        c.bezierCurveTo(s * 0.55, -s * 0.85, s * 1.1, -s * 0.05, 0, s * 0.7);
        c.fill();
    },
    fish(c, s) {
        c.beginPath();
        c.ellipse(-s * 0.1, 0, s * 0.62, s * 0.36, 0, 0, Math.PI * 2);
        c.moveTo(s * 0.45, 0);
        c.lineTo(s * 0.95, -s * 0.4);
        c.lineTo(s * 0.95, s * 0.4);
        c.closePath();
        c.fill();
    },
    star(c, s) {
        c.beginPath();
        c.moveTo(0, -s);
        c.quadraticCurveTo(0, 0, s, 0);
        c.quadraticCurveTo(0, 0, 0, s);
        c.quadraticCurveTo(0, 0, -s, 0);
        c.quadraticCurveTo(0, 0, 0, -s);
        c.fill();
    },
    eye(c, s) {
        // белый глаз с чёрным зрачком, как у котёнка
        c.beginPath();
        c.arc(0, 0, s * 0.62, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.fillStyle = '#0a090d';
        c.beginPath();
        c.arc(0, 0, s * 0.4, 0, Math.PI * 2);
        c.fill();
        c.restore();
    },
};

function initSphere(sphereCanvas) {
    const sctx = sphereCanvas.getContext('2d');
    const drawGlyph = GLYPHS[sphereCanvas.dataset.glyph] || GLYPHS.paw;
    const small = window.innerWidth < 700;
    const total = small ? 200 : 320;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const PALETTE = ['240,169,62', '240,169,62', '242,129,58', '229,143,176', '165,135,210'];

    const points = Array.from({ length: total }, (_, i) => {
        const y = 1 - (2 * (i + 0.5)) / total;
        const r = Math.sqrt(1 - y * y);
        const theta = i * golden;
        return {
            x: Math.cos(theta) * r,
            y,
            z: Math.sin(theta) * r,
            color: PALETTE[i % PALETTE.length],
            offX: 0, offY: 0, // смещение от курсора
        };
    });

    let w = 0, h = 0;
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = sphereCanvas.clientWidth;
        h = sphereCanvas.clientHeight;
        sphereCanvas.width = w * dpr;
        sphereCanvas.height = h * dpr;
        sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let rotY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let onScreen = true;
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(sphereCanvas);

    function render() {
        sctx.clearRect(0, 0, w, h);
        const rect = sphereCanvas.getBoundingClientRect();
        const cx = w / 2;
        const cy = h / 2;
        const R = Math.min(w, h) * 0.4;

        // сфера слегка поворачивается в сторону курсора
        const targetX = mouse.x > -9000 ? ((mouse.y - (rect.top + cy)) / window.innerHeight) * 0.6 : 0;
        const targetY = mouse.x > -9000 ? ((mouse.x - (rect.left + cx)) / window.innerWidth) * 0.8 : 0;
        tiltX += (targetX - tiltX) * 0.05;
        tiltY += (targetY - tiltY) * 0.05;
        rotY += 0.004;

        const cosY = Math.cos(rotY + tiltY), sinY = Math.sin(rotY + tiltY);
        const cosX = Math.cos(tiltX - 0.25), sinX = Math.sin(tiltX - 0.25);

        const projected = points.map((p) => {
            const x1 = p.x * cosY + p.z * sinY;
            const z1 = -p.x * sinY + p.z * cosY;
            const y2 = p.y * cosX - z1 * sinX;
            const z2 = p.y * sinX + z1 * cosX;
            const persp = 1 / (1 - z2 * 0.28);
            let sx = cx + x1 * R * persp;
            let sy = cy + y2 * R * persp;

            // курсор «раздвигает» символы
            const mx = mouse.x - rect.left;
            const my = mouse.y - rect.top;
            const dx = sx - mx;
            const dy = sy - my;
            const dist = Math.hypot(dx, dy);
            let pushX = 0, pushY = 0;
            if (dist < 90 && dist > 0) {
                const f = (90 - dist) / 90;
                pushX = (dx / dist) * f * 34;
                pushY = (dy / dist) * f * 34;
            }
            p.offX += (pushX - p.offX) * 0.12;
            p.offY += (pushY - p.offY) * 0.12;
            return { p, sx: sx + p.offX, sy: sy + p.offY, z: z2, persp };
        }).sort((a, b) => a.z - b.z);

        for (const { p, sx, sy, z, persp } of projected) {
            const facing = Math.abs(z);
            const depth = (z + 1) / 2; // 0 — сзади, 1 — спереди
            const size = R * 0.066 * persp * (0.55 + depth * 0.7);
            const alpha = 0.06 + Math.pow(depth, 1.6) * 0.94;
            const angle = Math.atan2(sy - cy, sx - cx) + Math.PI / 2;

            sctx.save();
            sctx.translate(sx, sy);
            sctx.rotate(angle);
            sctx.scale(1, 0.35 + facing * 0.65); // у края сферы символ «ложится» на поверхность
            sctx.fillStyle = `rgba(${p.color},${alpha})`;
            drawGlyph(sctx, size);
            sctx.restore();
        }
    }

    function loop() {
        if (pageVisible && onScreen) render();
        requestAnimationFrame(loop);
    }

    if (reduceMotion) render();
    else requestAnimationFrame(loop);
}

const sphereCanvas = $('#sphere');
if (sphereCanvas) initSphere(sphereCanvas);

/* =========================================================
   3. Котёнок в подвале следит глазами за курсором
   ========================================================= */
const kitten = $('#kitten');
if (kitten) {
    const pupils = $$('.kitten__pupil', kitten);
    const lookAt = (x, y) => {
        const box = kitten.getBoundingClientRect();
        const scale = box.width / 200; // 200 — ширина viewBox
        pupils.forEach((pupil) => {
            const cx = box.left + Number(pupil.getAttribute('cx')) * scale;
            const cy = box.top + Number(pupil.getAttribute('cy')) * scale;
            const angle = Math.atan2(y - cy, x - cx);
            const dist = Math.min(8, Math.hypot(x - cx, y - cy) / 25);
            pupil.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
        });
    };
    window.addEventListener('mousemove', (e) => lookAt(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => lookAt(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
}

/* =========================================================
   4. Меню и полоса прокрутки
   ========================================================= */
const nav = $('#nav');
const progress = $('#progress');
const burger = $('#burger');
const navList = $('#navList');

function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    nav.classList.toggle('nav--solid', window.scrollY > 40);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

burger.addEventListener('click', () => {
    const open = navList.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
});
navList.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
        navList.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
    }
});

/* =========================================================
   5. Появление блоков, счётчики, шкалы, звёзды
   ========================================================= */
const starsBox = $('#stars');
if (starsBox) {
    for (let i = 0; i < 5; i++) {
        const star = document.createElement('span');
        star.textContent = '★';
        star.style.transitionDelay = `${i * 120}ms`;
        starsBox.append(star);
    }
}

function countUp(el) {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const duration = 1500;
    const start = performance.now();
    (function step(now) {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(step);
    })(start);
}

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        activate(entry.target);
        revealObserver.unobserve(entry.target);
    });
}, { threshold: 0.15 });

function activate(el) {
    el.classList.add('is-visible');
    $$('[data-count]', el).forEach(countUp);
    $$('[data-w]', el).forEach((bar) => { bar.style.width = `${bar.dataset.w}%`; });
    if (starsBox && el.contains(starsBox)) starsBox.classList.add('is-on');
}

function watchReveals(root = document) {
    $$('.reveal', root).forEach((el, i) => {
        el.style.transitionDelay = `${(i % 3) * 80}ms`;
        revealObserver.observe(el);
    });
}
watchReveals();

/* =========================================================
   6. «Читать дальше»
   ========================================================= */
const moreBtn = $('#moreBtn');
if (moreBtn) {
    const more = $('#more');
    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = more.hidden;
        more.hidden = !open;
        moreBtn.textContent = open ? 'Свернуть' : 'Читать дальше';
        moreBtn.setAttribute('aria-expanded', String(open));
    });
}

/* =========================================================
   7. Наклон карточек героев под курсором
   ========================================================= */
if (!reduceMotion) {
    $$('.card').forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const box = card.getBoundingClientRect();
            const x = (e.clientX - box.left) / box.width - 0.5;
            const y = (e.clientY - box.top) / box.height - 0.5;
            card.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-6px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
}

/* =========================================================
   8. Лайк «Мне тоже понравилось» (работает на всех страницах)
   ========================================================= */
const BASE_LIKES = 47;
let liked = store.get('kitbull-liked', false) === true || store.get('kitbull-liked', false) === 1;
const likeButtons = $$('[data-like]');

function renderLikes() {
    likeButtons.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(liked));
        $('[data-like-count]', btn).textContent = BASE_LIKES + (liked ? 1 : 0);
    });
}
renderLikes();

likeButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        liked = !liked;
        store.set('kitbull-liked', liked);
        renderLikes();
        btn.classList.remove('pop');
        void btn.offsetWidth; // перезапуск анимации
        btn.classList.add('pop');
        if (liked && !reduceMotion) {
            const box = btn.getBoundingClientRect();
            spawnBurst(box.left + 36, box.top + box.height / 2);
        }
    });
});

/* =========================================================
   9. Лайтбокс для кадров (со стрелками)
   ========================================================= */
const lightbox = $('#lightbox');
if (lightbox) {
    const items = $$('.gallery__item');
    const img = $('#lightboxImg');
    const caption = $('#lbCaption');
    let index = 0;

    const show = (i) => {
        index = (i + items.length) % items.length;
        const item = items[index];
        img.src = item.dataset.full;
        img.alt = $('img', item).alt;
        caption.textContent = `${index + 1} / ${items.length} · ${$('.gallery__cap', item).textContent}`;
    };
    const close = () => { lightbox.hidden = true; };

    items.forEach((item, i) => item.addEventListener('click', (e) => {
        e.stopPropagation();
        show(i);
        lightbox.hidden = false;
    }));
    $('#lbPrev').addEventListener('click', (e) => { e.stopPropagation(); show(index - 1); });
    $('#lbNext').addEventListener('click', (e) => { e.stopPropagation(); show(index + 1); });
    lightbox.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    document.addEventListener('keydown', (e) => {
        if (lightbox.hidden) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(index - 1);
        if (e.key === 'ArrowRight') show(index + 1);
    });
}
