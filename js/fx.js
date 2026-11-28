"use strict";
/* Generated browser script from src/fx.ts. Edit the TypeScript source. */
var G;
(function (G) {
    /* Particles, persistent floor decals and short-lived dynamic lights */
    G.fx = (() => {
        const parts = [], lights = [];
        let F;
        const MAX = 1400;
        let decal = null, dctx = null;
        /* Cached radial glow sprites per colour, used for additive glows and lights */
        const glowCache = new Map();
        function fade(hex, a) {
            const n = parseInt(hex.slice(1, 7), 16);
            return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
        }
        const glow = function (color) {
            let c = glowCache.get(color);
            if (c)
                return c;
            c = document.createElement('canvas');
            c.width = c.height = 128;
            const g = G.canvasContext(c);
            const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            // quadratic-ish falloff so stacked glows read as light, not discs
            gr.addColorStop(0, color);
            gr.addColorStop(0.18, color);
            g.fillStyle = gr;
            gr.addColorStop(0.55, fade(color, 0.32));
            gr.addColorStop(1, fade(color, 0));
            g.fillRect(0, 0, 128, 128);
            glowCache.set(color, c);
            return c;
        };
        const drawGlow = function (ctx, x, y, r, color, alpha = 1) {
            if (r <= 0 || alpha <= 0)
                return;
            ctx.globalAlpha = alpha;
            ctx.drawImage(F.glow(color), x - r, y - r, r * 2, r * 2);
            ctx.globalAlpha = 1;
        };
        const reset = function () {
            parts.length = 0;
            lights.length = 0;
            const M = G.map;
            if (!decal) {
                decal = document.createElement('canvas');
                decal.width = M.pw;
                decal.height = M.ph;
                dctx = G.canvasContext(decal);
            }
            if (!dctx)
                return;
            dctx.clearRect(0, 0, decal.width, decal.height);
            F.canvas = decal;
            F.ctx = dctx;
        };
        const add = function (p) {
            if (parts.length >= MAX)
                parts.splice(0, 64);
            const particle = { vx: 0, vy: 0, rot: 0, a: 1, ...p, max: p.life };
            parts.push(particle);
            return particle;
        };
        const light = function (x, y, r, color, life, intensity = 1) {
            if (lights.length > 90)
                lights.shift();
            lights.push({ x, y, r, color, life, max: life, i: intensity });
        };
        /* presets */
        const sparks = function (x, y, color, n = 6, speed = 260, angle, spread = Math.PI) {
            for (let i = 0; i < n; i++) {
                const a = angle === undefined ? Math.random() * G.TAU : angle + G.rand(-spread, spread);
                const v = G.rand(speed * 0.3, speed);
                F.add({ t: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: G.rand(0.12, 0.38), color, size: G.rand(1, 2), drag: 5 });
            }
        };
        const muzzle = function (x, y, angle, color, scale = 1) {
            F.add({ t: 'flash', x, y, rot: angle, life: 0.055, size: 16 * scale, color });
            F.light(x, y, 150 * scale, color, 0.07, 0.9);
            for (let i = 0; i < 2; i++) {
                const a = angle + G.rand(-0.4, 0.4), v = G.rand(30, 70);
                F.add({ t: 'smoke', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: G.rand(0.35, 0.6), size: G.rand(3, 5), grow: 18, drag: 3, a: 0.16, color: '#9aa0a6' });
            }
        };
        const casing = function (x, y, angle, big) {
            const a = angle + Math.PI / 2 + G.rand(-0.35, 0.35), v = G.rand(90, 150);
            F.add({ t: 'casing', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: G.rand(0.35, 0.55), rot: Math.random() * 6, vr: G.rand(-20, 20), drag: 6, size: big ? 1.3 : 0.85, bake: Math.random() < 0.6, color: big ? '#8a3a34' : '#a8833f' });
        };
        const blood = function (x, y, angle, n = 8, color = '#8e1f1c', speed = 180) {
            for (let i = 0; i < n; i++) {
                const a = angle + G.rand(-0.7, 0.7), v = G.rand(speed * 0.25, speed);
                F.add({ t: 'drop', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: G.rand(0.15, 0.35), size: G.rand(1.2, 2.8), drag: 6, bake: true, color });
            }
        };
        const dust = function (x, y, n = 4, color = '#8d939a') {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * G.TAU, v = G.rand(10, 60);
                F.add({ t: 'smoke', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: G.rand(0.4, 0.9), size: G.rand(3, 6), grow: 14, drag: 2.5, a: 0.18, color });
            }
        };
        const debris = function (x, y, n = 8, color = '#5a5f66', speed = 260) {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * G.TAU, v = G.rand(speed * 0.3, speed);
                F.add({ t: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: G.rand(0.3, 0.7), rot: Math.random() * 6, vr: G.rand(-14, 14), size: G.rand(1.5, 3.5), drag: 4, bake: true, color });
            }
        };
        const explosion = function (x, y, r) {
            F.light(x, y, r * 3.2, '#ffb070', 0.5, 1.4);
            F.add({ t: 'flare', x, y, life: 0.22, size: r * 1.4, color: '#fff1d0' });
            const n = Math.round(10 + r / 6);
            for (let i = 0; i < n; i++) {
                const a = Math.random() * G.TAU, v = G.rand(r * 0.6, r * 2.6);
                F.add({ t: 'fire', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: G.rand(0.25, 0.55), size: G.rand(r * 0.18, r * 0.36), drag: 5, color: G.pick(['#ffcf7a', '#ff9a4a', '#ff7038']) });
            }
            for (let i = 0; i < n; i++) {
                const a = Math.random() * G.TAU, v = G.rand(r * 0.3, r * 1.4);
                F.add({ t: 'smoke', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: G.rand(0.9, 1.8), size: G.rand(r * 0.15, r * 0.3), grow: r * 0.5, drag: 3, a: 0.32, color: '#3b3d41' });
            }
            F.sparks(x, y, '#ffc27a', Math.round(n * 1.2), r * 5);
            F.debris(x, y, Math.round(n * 0.6), '#2b2d31', r * 3);
            F.scorch(x, y, r * 0.9);
        };
        const update = function (dt) {
            let w = 0;
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i];
                p.life -= dt;
                const k = Math.exp(-(p.drag || 0) * dt);
                p.vx = (p.vx || 0) * k;
                p.vy = (p.vy || 0) * k;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.vr)
                    p.rot += p.vr * dt * k;
                if (p.grow)
                    p.size += p.grow * dt;
                if (p.life <= 0) {
                    if (p.bake && dctx)
                        bakePart(dctx, p);
                    continue;
                }
                parts[w++] = p;
            }
            parts.length = w;
            let lw = 0;
            for (let i = 0; i < lights.length; i++) {
                const l = lights[i];
                l.life -= dt;
                if (l.life > 0)
                    lights[lw++] = l;
            }
            lights.length = lw;
        };
        function bakePart(dctx, p) {
            if (G.map.solidAt(p.x, p.y))
                return;
            dctx.save();
            dctx.translate(p.x, p.y);
            if (p.t === 'casing') {
                dctx.rotate(p.rot);
                dctx.fillStyle = p.color;
                dctx.globalAlpha = 0.42;
                dctx.fillRect(-2 * p.size, -0.8 * p.size, 4 * p.size, 1.6 * p.size);
            }
            else if (p.t === 'drop') {
                dctx.fillStyle = p.color;
                dctx.globalAlpha = 0.7;
                dctx.beginPath();
                dctx.arc(0, 0, p.size, 0, G.TAU);
                dctx.fill();
            }
            else if (p.t === 'chunk') {
                dctx.rotate(p.rot);
                dctx.fillStyle = p.color;
                dctx.globalAlpha = 0.8;
                dctx.fillRect(-p.size, -p.size * 0.7, p.size * 2, p.size * 1.4);
            }
            dctx.restore();
        }
        const drawNormal = function (ctx, x0, y0, x1, y1) {
            for (const p of parts) {
                if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1)
                    continue;
                const t = p.life / p.max;
                if (p.t === 'smoke') {
                    ctx.globalAlpha = p.a * t;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, G.TAU);
                    ctx.fill();
                }
                else if (p.t === 'casing') {
                    ctx.globalAlpha = 1;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-2.5 * p.size, -1 * p.size, 5 * p.size, 2 * p.size);
                    ctx.restore();
                }
                else if (p.t === 'drop') {
                    ctx.globalAlpha = 0.9;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, G.TAU);
                    ctx.fill();
                }
                else if (p.t === 'chunk') {
                    ctx.globalAlpha = 1;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size, -p.size * 0.7, p.size * 2, p.size * 1.4);
                    ctx.restore();
                }
            }
            ctx.globalAlpha = 1;
        };
        const drawAdd = function (ctx, x0, y0, x1, y1) {
            for (const p of parts) {
                if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1)
                    continue;
                const t = p.life / p.max;
                if (p.t === 'spark') {
                    ctx.globalAlpha = Math.min(1, t * 1.6);
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = p.size;
                    ctx.beginPath();
                    ctx.moveTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                }
                else if (p.t === 'fire') {
                    F.drawGlow(ctx, p.x, p.y, p.size * (0.6 + t * 0.8), p.color, t);
                }
                else if (p.t === 'flare') {
                    F.drawGlow(ctx, p.x, p.y, p.size * (1.3 - t * 0.3), p.color, t);
                }
                else if (p.t === 'ember') {
                    F.drawGlow(ctx, p.x, p.y, p.size * 3, p.color, t);
                }
                else if (p.t === 'flash') {
                    ctx.globalAlpha = 1;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.fillStyle = p.color;
                    const s = p.size * (0.7 + Math.random() * 0.5);
                    ctx.beginPath();
                    ctx.moveTo(s * 1.6, 0);
                    ctx.lineTo(s * 0.25, s * 0.3);
                    ctx.lineTo(0, s * 0.7);
                    ctx.lineTo(-s * 0.2, 0);
                    ctx.lineTo(0, -s * 0.7);
                    ctx.lineTo(s * 0.25, -s * 0.3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = '#fffbe8';
                    ctx.beginPath();
                    ctx.arc(s * 0.2, 0, s * 0.28, 0, G.TAU);
                    ctx.fill();
                    ctx.restore();
                    F.drawGlow(ctx, p.x, p.y, p.size * 2.4, p.color, 0.7);
                }
            }
            ctx.globalAlpha = 1;
        };
        const drawLights = function (lctx, x0, y0, x1, y1) {
            for (const l of lights) {
                if (l.x + l.r < x0 || l.x - l.r > x1 || l.y + l.r < y0 || l.y - l.r > y1)
                    continue;
                F.drawGlow(lctx, l.x, l.y, l.r, l.color, Math.min(1, l.i * (l.life / l.max)));
            }
        };
        /* decals */
        const scorch = function (x, y, r) {
            if (!dctx)
                return;
            const g = dctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(8,8,8,0.75)');
            g.addColorStop(0.6, 'rgba(14,12,10,0.45)');
            g.addColorStop(1, 'rgba(14,12,10,0)');
            dctx.fillStyle = g;
            dctx.beginPath();
            dctx.arc(x, y, r, 0, G.TAU);
            dctx.fill();
        };
        const pool = function (x, y, r, color = 'rgba(92,16,16,0.55)') {
            if (!dctx)
                return;
            dctx.fillStyle = color;
            for (let i = 0; i < 5; i++) {
                const a = Math.random() * G.TAU, d = Math.random() * r * 0.5;
                dctx.beginPath();
                dctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r * G.rand(0.4, 0.75), r * G.rand(0.3, 0.6), Math.random() * 3, 0, G.TAU);
                dctx.fill();
            }
        };
        const hole = function (x, y) {
            if (!dctx)
                return;
            dctx.fillStyle = 'rgba(0,0,0,0.5)';
            dctx.beginPath();
            dctx.arc(x, y, 1.6, 0, G.TAU);
            dctx.fill();
            dctx.fillStyle = 'rgba(0,0,0,0.12)';
            dctx.beginPath();
            dctx.arc(x, y, 4, 0, G.TAU);
            dctx.fill();
        };
        const corrosion = function (x, y, r) {
            if (!dctx)
                return;
            const g = dctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(10,6,4,0.5)');
            g.addColorStop(1, 'rgba(24,14,8,0)');
            dctx.fillStyle = g;
            dctx.beginPath();
            dctx.arc(x, y, r, 0, G.TAU);
            dctx.fill();
        };
        const stamp = function (fn) {
            if (!dctx)
                return;
            dctx.save();
            fn(dctx);
            dctx.restore();
        };
        F = { parts, lights, canvas: null, ctx: null,
            glow, drawGlow, reset, add, light, sparks, muzzle, casing, blood, dust, debris,
            explosion, update, drawNormal, drawAdd, drawLights, scorch, pool, hole, corrosion, stamp };
        return F;
    })();
})(G || (G = {}));
