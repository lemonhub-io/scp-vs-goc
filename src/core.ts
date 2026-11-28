/* Generated browser script from src/core.ts. Edit the TypeScript source. */

namespace G {
  export const TAU = Math.PI * 2;
  export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
  export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  export const rand = (a = 1, b?: number) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  export const randi = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
  export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  export const chance = (p: number) => Math.random() < p;
  export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);
  export const dist2 = (ax: number, ay: number, bx: number, by: number) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  export const angDiff = (a: number, b: number) => {
    let d = (b - a) % G.TAU;
    if (d > Math.PI) d -= G.TAU;
    if (d < -Math.PI) d += G.TAU;
    return d;
  };
  export const turnTo = (a: number, target: number, maxStep: number) => {
    const d = G.angDiff(a, target);
    return a + G.clamp(d, -maxStep, maxStep);
  };
  export const approach = (v: number, t: number, d: number) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
  export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  export const easeIn = (t: number) => t * t * t;
  export const smooth = (t: number) => t * t * (3 - 2 * t);

  /* Deterministic RNG for map decoration */
  export const seeded = function (seed: number) {
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
  export const segCircle = function (x1: number, y1: number, x2: number, y2: number, cx: number, cy: number, r: number) {
    const dx = x2 - x1, dy = y2 - y1;
    const fx = x1 - cx, fy = y1 - cy;
    const a = dx * dx + dy * dy;
    if (a < 1e-9) return fx * fx + fy * fy <= r * r ? 0 : -1;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / (2 * a);
    if (t1 >= 0 && t1 <= 1) return t1;
    return -1;
  };

  /* Point-to-segment distance */
  export const pointSegDist = function (px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
    t = G.clamp(t, 0, 1);
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  };

  export function canvasContext(canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
    const context = canvas.getContext('2d', options);
    if (!context) throw new Error('Canvas 2D is unavailable');
    return context;
  }

  /* Rounded rect path helper */
  export const rr = function (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

  export const circle = function (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, G.TAU);
  };

  export const ellipse = function (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, G.TAU);
  };

  /* Persistence, always guarded */
  export const store = {
    get(k: string, def: unknown): unknown {
      try {
        const v = localStorage.getItem('s109_' + k);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set(k: string, v: unknown) {
      try {
        localStorage.setItem('s109_' + k, JSON.stringify(v));
      } catch (e) { /* storage unavailable */ }
    },
  };

  export interface Point { x: number; y: number }
  export type Language = 'en' | 'zh';
  export interface Settings {
    master: number;
    music: number;
    sfx: number;
    shake: number;
    dmgNums: boolean;
    lang: Language;
    difficulty: number;
    hints: boolean;
  }

  function loadSettings(): Settings {
    const lang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    const result: Settings = { master: 0.8, music: 0.55, sfx: 0.85, shake: 1, dmgNums: true, lang, difficulty: 1, hints: true };
    const stored = G.store.get('settings', null);
    if (!stored || typeof stored !== 'object') return result;
    const saved = stored as Record<string, unknown>;
    for (const key of ['master', 'music', 'sfx', 'shake', 'difficulty'] as const) {
      const value = saved[key];
      if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    }
    for (const key of ['dmgNums', 'hints'] as const) {
      const value = saved[key];
      if (typeof value === 'boolean') result[key] = value;
    }
    if (saved.lang === 'en' || saved.lang === 'zh') result.lang = saved.lang;
    return result;
  }

  export const settings = loadSettings();
  export const saveSettings = () => G.store.set('settings', G.settings);

  export const fmt = (n: number) => Math.floor(n).toLocaleString('en-US').replace(/,/g, ' ');
  export const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, '0');
  export const fmtTime = (s: number) => G.pad(s / 60) + ':' + G.pad(s % 60);
}
