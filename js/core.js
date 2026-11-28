"use strict";
/* Generated browser script from src/core.ts. Edit the TypeScript source. */
var G;
(function (G) {
    G.TAU = Math.PI * 2;
    G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    G.lerp = (a, b, t) => a + (b - a) * t;
    G.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
    G.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
    G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    G.chance = (p) => Math.random() < p;
    G.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
    G.dist2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
    G.angDiff = (a, b) => {
        let d = (b - a) % G.TAU;
        if (d > Math.PI)
            d -= G.TAU;
        if (d < -Math.PI)
            d += G.TAU;
        return d;
    };
    G.turnTo = (a, target, maxStep) => {
        const d = G.angDiff(a, target);
        return a + G.clamp(d, -maxStep, maxStep);
    };
    G.approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
    G.easeOut = (t) => 1 - Math.pow(1 - t, 3);
    G.easeIn = (t) => t * t * t;
    G.smooth = (t) => t * t * (3 - 2 * t);
    /* Deterministic RNG for map decoration */
    G.seeded = function (seed) {
        let s = seed >>> 0;
        return function () {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };
    /* Segment vs circle: returns t in [0,1] of first contact or -1 */
    G.segCircle = function (x1, y1, x2, y2, cx, cy, r) {
        const dx = x2 - x1, dy = y2 - y1;
        const fx = x1 - cx, fy = y1 - cy;
        const a = dx * dx + dy * dy;
        if (a < 1e-9)
            return fx * fx + fy * fy <= r * r ? 0 : -1;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;
        if (c <= 0)
            return 0;
        const disc = b * b - 4 * a * c;
        if (disc < 0)
            return -1;
        const sq = Math.sqrt(disc);
        const t1 = (-b - sq) / (2 * a);
        if (t1 >= 0 && t1 <= 1)
            return t1;
        return -1;
    };
    /* Point-to-segment distance */
    G.pointSegDist = function (px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const l2 = dx * dx + dy * dy;
        let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
        t = G.clamp(t, 0, 1);
        return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
    };
    function canvasContext(canvas, options) {
        const context = canvas.getContext('2d', options);
        if (!context)
            throw new Error('Canvas 2D is unavailable');
        return context;
    }
    G.canvasContext = canvasContext;
    /* Rounded rect path helper */
    G.rr = function (ctx, x, y, w, h, r) {
        r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };
    G.circle = function (ctx, x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, G.TAU);
    };
    G.ellipse = function (ctx, x, y, rx, ry, rot = 0) {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, rot, 0, G.TAU);
    };
    /* Persistence, always guarded */
    G.store = {
        get(k, def) {
            try {
                const v = localStorage.getItem('s109_' + k);
                return v == null ? def : JSON.parse(v);
            }
            catch (e) {
                return def;
            }
        },
        set(k, v) {
            try {
                localStorage.setItem('s109_' + k, JSON.stringify(v));
            }
            catch (e) { /* storage unavailable */ }
        },
    };
    function loadSettings() {
        const lang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
        const result = { master: 0.8, music: 0.55, sfx: 0.85, shake: 1, dmgNums: true, lang, difficulty: 1, hints: true };
        const stored = G.store.get('settings', null);
        if (!stored || typeof stored !== 'object')
            return result;
        const saved = stored;
        for (const key of ['master', 'music', 'sfx', 'shake', 'difficulty']) {
            const value = saved[key];
            if (typeof value === 'number' && Number.isFinite(value))
                result[key] = value;
        }
        for (const key of ['dmgNums', 'hints']) {
            const value = saved[key];
            if (typeof value === 'boolean')
                result[key] = value;
        }
        if (saved.lang === 'en' || saved.lang === 'zh')
            result.lang = saved.lang;
        return result;
    }
    G.settings = loadSettings();
    G.saveSettings = () => G.store.set('settings', G.settings);
    G.fmt = (n) => Math.floor(n).toLocaleString('en-US').replace(/,/g, ' ');
    G.pad = (n, l = 2) => String(Math.floor(n)).padStart(l, '0');
    G.fmtTime = (s) => G.pad(s / 60) + ':' + G.pad(s % 60);
})(G || (G = {}));
