/* Generated browser script from src/art.ts. Edit the TypeScript source. */

namespace G {
  /* Procedural top-down sprites. Every draw call is centred on the entity */
  interface GunSprite { len: number; w: number; mag?: number; glow?: string }
  interface HumanSprite extends CollisionBody { angle: number; step: number; hit?: number; kick?: number; ward?: number; elite?: boolean; flash?: number }
  export interface AnomalySprite extends CollisionBody {
    kind: AnomalyId; cell: MapCell; angle: number; step?: number; dormant?: number; watched?: boolean;
  }

  export const art = (() => {
    const TAU = Math.PI * 2;

    const PAL = {
      player: { armor: '#363d45', vest: '#4a535c', dark: '#16191d', helmet: '#4f5862', visor: '#ffb547', accent: '#e9a23b', glove: '#22262b', gun: '#14171a', gunHi: '#5c636b' },
      trooper: { armor: '#c6cfd7', vest: '#98a5b1', dark: '#38424d', helmet: '#e6ebef', visor: '#5cc6ff', accent: '#2f7fd0', glove: '#3a434c', gun: '#1d2228', gunHi: '#6e7883' },
      breacher: { armor: '#a3afba', vest: '#7c8995', dark: '#2f3842', helmet: '#cdd5dc', visor: '#5cc6ff', accent: '#2f7fd0', glove: '#2f3842', gun: '#1d2228', gunHi: '#6e7883' },
      sapper: { armor: '#c6cfd7', vest: '#a99472', dark: '#38424d', helmet: '#e6ebef', visor: '#5cc6ff', accent: '#ff7a3d', glove: '#3a434c', gun: '#1d2228', gunHi: '#6e7883' },
      marksman: { armor: '#7b8794', vest: '#5d6874', dark: '#272e35', helmet: '#a8b3bd', visor: '#ff5b6e', accent: '#2f7fd0', glove: '#272e35', gun: '#15191d', gunHi: '#58626d' },
      shield: { armor: '#b2bdc7', vest: '#8996a2', dark: '#323b45', helmet: '#d8dfe5', visor: '#5cc6ff', accent: '#2f7fd0', glove: '#323b45', gun: '#1d2228', gunHi: '#6e7883' },
      adept: { armor: '#2b3a5c', vest: '#1d2844', dark: '#141b2e', helmet: '#e3e9f1', visor: '#8ae6ff', accent: '#8ae6ff', glove: '#1d2844', gun: '#1d2228', gunHi: '#6e7883' },
      zombie: { armor: '#7f8a78', vest: '#5d6858', dark: '#2c3329', helmet: '#9ba591', visor: '#d7e06a', accent: '#6d7a52', glove: '#4a5244', gun: '#1d2228', gunHi: '#6e7883' },
    };
    const HIT = { armor: '#fff1ea', vest: '#ffe1d6', dark: '#ffd2c4', helmet: '#ffffff', visor: '#ffffff', accent: '#ffffff', glove: '#ffe1d6', gun: '#ffd2c4', gunHi: '#ffffff' };
    const DEAD = { armor: '#4a4f55', vest: '#3c4146', dark: '#202326', helmet: '#5a5f64', visor: '#2a2e33', accent: '#3a3f44', glove: '#2a2e33', gun: '#1a1c1f', gunHi: '#2a2e33' };
    type PaletteKind = keyof typeof PAL;
    const hasPalette = (kind: EnemyType | 'player'): kind is PaletteKind => kind in PAL;

    const dot = (c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
    const line = (c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, w: number) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    const shadow = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.38) => { c.fillStyle = `rgba(0,0,0,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };

    /* Humanoid soldier. kind picks palette and gear */
    const human = function (c: CanvasRenderingContext2D, e: HumanSprite, kind: EnemyType | 'player', time: number, opts: { dead?: boolean; twist?: number; gun?: GunSprite } = {}) {
      const base = opts.dead ? DEAD : (hasPalette(kind) ? PAL[kind] : PAL.trooper);
      const p = !opts.dead && (e.hit ?? 0) > 0.05 ? HIT : base;
      const s = e.r / 13;
      c.save();
      c.translate(e.x, e.y);
      if (!opts.dead) shadow(c, 2.5 * s, 4 * s, e.r * 1.12, e.r * 0.9);
      if (!opts.dead && (e.elite || (e.ward ?? 0) > 0)) {
        c.strokeStyle = (e.ward ?? 0) > 0 ? `rgba(130,215,255,${0.45 + Math.sin(time * 9) * 0.2})` : 'rgba(242,179,61,0.55)';
        c.lineWidth = (e.ward ?? 0) > 0 ? 2 : 1.3;
        c.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * TAU + time * 0.8, r = e.r + 6;
          i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.stroke();
      }
      c.rotate(e.angle + (opts.twist || 0));
      c.scale(s, s);
      const moving = opts.dead ? 0 : 1;
      const st = Math.sin(e.step || 0) * 4 * moving;
      const kick = (e.kick || 0) * 4;
      // boots
      c.fillStyle = p.dark;
      G.rr(c, -6 + st, -9, 10, 6, 2.5); c.fill();
      G.rr(c, -6 - st, 3, 10, 6, 2.5); c.fill();
      // back gear
      if (kind === 'sapper') {
        c.fillStyle = '#5d4a32'; G.rr(c, -16, -8, 9, 16, 2); c.fill();
        c.fillStyle = p.accent; G.rr(c, -15, -6, 7, 12, 1.5); c.fill();
        if (!opts.dead && Math.sin(time * 10) > 0) dot(c, -11.5, 0, 1.4, '#ff3b2a');
      } else if (kind === 'adept') {
        c.fillStyle = p.vest;
        c.beginPath(); c.moveTo(-6, -11); c.lineTo(-17, -6); c.lineTo(-18, 6); c.lineTo(-6, 11); c.closePath(); c.fill();
      } else {
        c.fillStyle = p.dark; G.rr(c, -14, -6, 7, 12, 2); c.fill();
      }
      const bulk = kind === 'breacher' ? 1.14 : 1;
      // torso
      c.fillStyle = p.armor;
      c.beginPath(); c.ellipse(-1, 0, 8.6 * bulk, 12.4 * bulk, 0, 0, TAU); c.fill();
      c.fillStyle = p.vest;
      G.rr(c, -6.5, -7.5 * bulk, 10, 15 * bulk, 3); c.fill();
      if (kind === 'breacher') { c.fillStyle = p.dark; G.rr(c, -4, -6, 6, 12, 2); c.fill(); }
      // pouches
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(-5, -6, 3, 4); c.fillRect(-5, 2, 3, 4);
      // shoulder pads
      dot(c, 0, -10 * bulk, 4.2, p.armor);
      dot(c, 0, 10 * bulk, 4.2, p.armor);
      c.fillStyle = p.accent;
      c.fillRect(-2, -13.5 * bulk, 4, 2.2);
      // arms and weapon
      if (kind === 'zombie') {
        line(c, 0, -9, 13 + st * 0.4, -5, p.armor, 4.2);
        line(c, 0, 9, 13 - st * 0.4, 5, p.armor, 4.2);
        dot(c, 14 + st * 0.4, -5, 2.4, p.glove); dot(c, 14 - st * 0.4, 5, 2.4, p.glove);
      } else if (kind === 'adept') {
        const glow = 0.6 + Math.sin(time * 6) * 0.25;
        line(c, 0, -9, 9, -7, p.armor, 4);
        line(c, 0, 9, 9, 7, p.armor, 4);
        dot(c, 10, -7, 2.6, p.glove); dot(c, 10, 7, 2.6, p.glove);
        if (!opts.dead) {
          c.globalAlpha = glow;
          dot(c, 12, -7, 3, '#bff3ff'); dot(c, 12, 7, 3, '#bff3ff');
          c.globalAlpha = 1;
        }
      } else if (!opts.dead) {
        const gun = opts.gun || { len: 18, w: 3.4 };
        const gx = 3 - kick;
        if (kind === 'shield') {
          line(c, 0, 9, 7, 6, p.armor, 4);
          c.fillStyle = p.gun; G.rr(c, 5 - kick, 4.5, 10, 3, 1); c.fill();
          line(c, 0, -9, 9, -9, p.armor, 4);
          // ballistic shield
          c.fillStyle = '#262d35'; G.rr(c, 10, -15, 6, 30, 2.5); c.fill();
          c.fillStyle = '#3b4652'; G.rr(c, 11, -13, 3.5, 26, 1.5); c.fill();
          c.fillStyle = 'rgba(92,198,255,0.55)'; c.fillRect(14, -4, 1.6, 8);
        } else {
          // rear arm to grip, lead arm to foregrip
          line(c, 0, 9, gx + 3, 4.5, p.armor, 4);
          line(c, 0, -9, gx + gun.len * 0.55, 3, p.armor, 4);
          c.fillStyle = p.gun;
          G.rr(c, gx, 3 - gun.w / 2 + 0.5, gun.len, gun.w, 1.2); c.fill();
          c.fillStyle = p.gunHi;
          c.fillRect(gx + 2, 3 - gun.w / 2 + 0.6, gun.len - 4, 0.9);
          if (gun.mag) { c.fillStyle = p.gun; c.fillRect(gx + gun.len * 0.35, 3 + gun.w / 2, 3, gun.mag); }
          if (gun.glow) { c.fillStyle = gun.glow; c.fillRect(gx + gun.len - 5, 2, 4, 2); }
          dot(c, gx + 3, 4.5, 2.3, p.glove);
          dot(c, gx + gun.len * 0.55, 3, 2.3, p.glove);
        }
      }
      // helmet
      dot(c, 1, 0, 6.8, p.dark);
      dot(c, 1, 0, 6, p.helmet);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.beginPath(); c.arc(0, -1.5, 4, Math.PI * 1.1, Math.PI * 1.75); c.lineTo(0, -1.5); c.fill();
      if (kind === 'adept') {
        // porcelain mask with a single slit
        c.fillStyle = p.visor; c.fillRect(4.2, -2.4, 1.4, 4.8);
      } else {
        c.strokeStyle = p.visor; c.lineWidth = 2.4; c.lineCap = 'butt';
        c.beginPath(); c.arc(1, 0, 4.6, -0.85, 0.85); c.stroke();
      }
      c.restore();
    };

    const player = function (c: CanvasRenderingContext2D, p: Player, time: number) {
      const w = G.WEAPONS[p.weapon] || G.WEAPONS[1];
      const gun = {
        p9: { len: 11, w: 3 }, k17: { len: 19, w: 3.4, mag: 3 }, b12: { len: 18, w: 4.2 },
        lmg: { len: 22, w: 4.6, mag: 4 }, tesla: { len: 19, w: 4.4, glow: '#9fe8ff' }, lance: { len: 26, w: 3.8, glow: '#ffb36b' },
      }[w.id];
      if (p.cola > 0) {
        c.save(); c.globalAlpha = 0.25;
        dot(c, p.x, p.y, p.r + 7 + Math.sin(time * 14) * 1.5, '#ff4a57');
        c.restore();
      }
      A.human(c, { ...p, hit: p.hit > 0.36 ? 0.1 : 0 }, 'player', time, { gun });
    };

    const GUNS: Partial<Record<EnemyType, GunSprite>> = {
      trooper: { len: 18, w: 3.4, mag: 3 }, breacher: { len: 16, w: 4.4 }, sapper: { len: 12, w: 3.2, mag: 2 },
      marksman: { len: 28, w: 3, glow: '#ff5b6e' },
    };
    const enemy = function (c: CanvasRenderingContext2D, e: Enemy, time: number) {
      switch (e.type) {
        case 'drone': return A.drone(c, e, time);
        case 'exo': return A.exo(c, e, time);
        case 'archon': return A.archon(c, e, time);
        case 'pylon': return A.pylon(c, e, time);
        default: return A.human(c, e, e.type, time, { gun: GUNS[e.type] });
      }
    };

    const drone = function (c: CanvasRenderingContext2D, e: Enemy, time: number) {
      const s = e.r / 10;
      const hit = (e.hit ?? 0) > 0.05;
      c.save();
      c.translate(e.x, e.y);
      shadow(c, 9, 14, 11 * s, 8 * s, 0.25);
      c.rotate(e.angle);
      c.scale(s, s);
      c.strokeStyle = hit ? '#fff' : '#3b434c'; c.lineWidth = 2.4;
      for (const a of [0.78, 2.36, 3.93, 5.5]) {
        const x = Math.cos(a) * 9, y = Math.sin(a) * 9;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(x, y); c.stroke();
        c.fillStyle = 'rgba(160,180,200,0.16)';
        c.beginPath(); c.arc(x, y, 5.5, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(210,225,240,0.45)'; c.lineWidth = 1;
        const r = time * 40 + a;
        c.beginPath(); c.moveTo(x + Math.cos(r) * 5, y + Math.sin(r) * 5); c.lineTo(x - Math.cos(r) * 5, y - Math.sin(r) * 5); c.stroke();
        c.strokeStyle = hit ? '#fff' : '#3b434c'; c.lineWidth = 2.4;
      }
      c.fillStyle = hit ? '#fff' : '#2a3037';
      G.rr(c, -6, -5, 12, 10, 3); c.fill();
      c.fillStyle = hit ? '#fff' : '#d8dfe5';
      G.rr(c, -4, -3, 7, 6, 2); c.fill();
      const armed = e.armed > 0;
      dot(c, 5, 0, 1.8, armed ? (Math.sin(time * 30) > 0 ? '#ff3b2a' : '#5a1510') : '#5cc6ff');
      c.restore();
    };

    const exo = function (c: CanvasRenderingContext2D, e: Enemy, time: number) {
      const hit = (e.hit ?? 0) > 0.05;
      const W = hit ? '#ffffff' : '#d2dae1', P = hit ? '#ffe5dc' : '#8e9aa6', D = hit ? '#ffd6c8' : '#2b333c';
      c.save();
      c.translate(e.x, e.y);
      shadow(c, 5, 9, 44, 36, 0.42);
      c.rotate(e.angle);
      const st = Math.sin(e.step || 0) * 7;
      // feet
      c.fillStyle = D;
      G.rr(c, -12 + st, -30, 24, 12, 4); c.fill();
      G.rr(c, -12 - st, 18, 24, 12, 4); c.fill();
      c.fillStyle = P;
      G.rr(c, -8 + st, -28, 16, 8, 3); c.fill();
      G.rr(c, -8 - st, 20, 16, 8, 3); c.fill();
      // reactor (weak point, rear)
      const pulse = 0.65 + Math.sin(time * 7) * 0.3;
      c.fillStyle = D; G.rr(c, -36, -11, 14, 22, 4); c.fill();
      c.fillStyle = `rgba(255,${130 + pulse * 60},60,${pulse})`; G.rr(c, -34, -7, 9, 14, 3); c.fill();
      // hull
      c.fillStyle = D;
      c.beginPath();
      c.moveTo(22, -14); c.lineTo(10, -24); c.lineTo(-18, -24); c.lineTo(-26, -12); c.lineTo(-26, 12); c.lineTo(-18, 24); c.lineTo(10, 24); c.lineTo(22, 14);
      c.closePath(); c.fill();
      c.fillStyle = W;
      c.beginPath();
      c.moveTo(19, -12); c.lineTo(8, -21); c.lineTo(-16, -21); c.lineTo(-23, -11); c.lineTo(-23, 11); c.lineTo(-16, 21); c.lineTo(8, 21); c.lineTo(19, 12);
      c.closePath(); c.fill();
      c.fillStyle = P;
      G.rr(c, -14, -14, 20, 28, 4); c.fill();
      c.fillStyle = '#2f7fd0'; c.fillRect(-12, -18, 16, 2.5); c.fillRect(-12, 15.5, 16, 2.5);
      // sensor strip
      c.fillStyle = D; G.rr(c, 10, -9, 8, 18, 3); c.fill();
      c.fillStyle = '#5cc6ff'; c.fillRect(14, -7, 2.5, 14);
      // missile pod (left)
      c.fillStyle = D; G.rr(c, -10, -36, 26, 13, 3); c.fill();
      c.fillStyle = P; G.rr(c, -8, -34, 22, 9, 2); c.fill();
      for (let i = 0; i < 4; i++) dot(c, -4 + i * 5.5, -29.5, 1.8, e.podReady ? '#ffb070' : '#1a1f25');
      // rotary cannon (right)
      c.fillStyle = D; G.rr(c, -6, 22, 22, 13, 3); c.fill();
      const spin = (e.spin || 0);
      c.fillStyle = '#1a1f25'; G.rr(c, 12, 23.5, 30, 10, 3); c.fill();
      c.strokeStyle = '#59626c'; c.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const y = 28.5 + Math.sin(spin + i * 2.09) * 3.2;
        c.beginPath(); c.moveTo(16, y); c.lineTo(42, y); c.stroke();
      }
      c.restore();
    };

    const archon = function (c: CanvasRenderingContext2D, e: Enemy, time: number) {
      const hit = (e.hit ?? 0) > 0.05;
      c.save();
      c.translate(e.x, e.y);
      const bob = Math.sin(time * 2.2) * 2;
      shadow(c, 6, 14, 22, 16, 0.25);
      // rune rings
      c.save();
      for (const [r, sp, dash] of [[34, 0.6, [6, 9]], [42, -0.4, [2, 7]], [27, 1.1, [12, 5]]] as const) {
        c.rotate(time * sp);
        c.strokeStyle = `rgba(138,230,255,${e.warded ? 0.75 : 0.45})`;
        c.lineWidth = 1.6;
        c.setLineDash(dash);
        c.beginPath(); c.arc(0, bob, r, 0, TAU); c.stroke();
      }
      c.setLineDash([]);
      c.restore();
      c.translate(0, bob);
      c.rotate(e.angle);
      const robe = hit ? '#ffffff' : '#1e2a4a';
      const g = c.createRadialGradient(-4, 0, 2, 0, 0, 24);
      g.addColorStop(0, hit ? '#ffffff' : '#3b5288');
      g.addColorStop(1, robe);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(14, 0);
      for (let i = 1; i <= 12; i++) {
        const a = (i / 12) * TAU;
        const r = 20 + Math.sin(time * 5 + i * 1.7) * 2.2 + (Math.abs(Math.cos(a)) < 0.3 ? 2 : 0);
        c.lineTo(Math.cos(a) * r * (Math.cos(a) > 0 ? 0.75 : 1.05), Math.sin(a) * r);
      }
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(138,230,255,0.75)';
      c.fillRect(-8, -16, 2, 32);
      c.fillStyle = hit ? '#fff' : '#e9eef5';
      c.beginPath(); c.ellipse(4, 0, 7, 8, 0, 0, TAU); c.fill();
      c.fillStyle = '#8ae6ff';
      c.fillRect(9, -3, 1.6, 6);
      dot(c, 18, -9, 3, '#bff3ff'); dot(c, 18, 9, 3, '#bff3ff');
      c.restore();
    };

    const pylon = function (c: CanvasRenderingContext2D, e: Enemy, time: number) {
      const hit = (e.hit ?? 0) > 0.05;
      c.save();
      c.translate(e.x, e.y);
      shadow(c, 3, 6, 14, 10, 0.3);
      c.rotate(time * 0.8);
      c.fillStyle = hit ? '#ffffff' : '#25304f';
      c.beginPath(); c.moveTo(0, -18); c.lineTo(12, 0); c.lineTo(0, 18); c.lineTo(-12, 0); c.closePath(); c.fill();
      c.fillStyle = hit ? '#ffffff' : '#8ae6ff';
      c.beginPath(); c.moveTo(0, -12); c.lineTo(6, 0); c.lineTo(0, 12); c.lineTo(-6, 0); c.closePath(); c.fill();
      c.restore();
    };

    const scp173 = function (c: CanvasRenderingContext2D, a: AnomalySprite, time: number) {
      c.save();
      c.translate(a.x, a.y);
      shadow(c, 3, 5, 18, 14, 0.45);
      c.rotate(a.angle);
      c.fillStyle = '#8f8676';
      c.beginPath(); c.ellipse(-2, 0, 11, 15, 0, 0, TAU); c.fill();
      c.fillStyle = '#a89f8d';
      c.beginPath(); c.ellipse(-1, 0, 9, 13, 0, 0, TAU); c.fill();
      // rebar stubs and concrete pocks
      c.fillStyle = 'rgba(60,52,42,0.5)';
      for (const [x, y] of [[-5, -6], [-2, 7], [-7, 3], [1, -9]]) { c.beginPath(); c.arc(x, y, 1.3, 0, TAU); c.fill(); }
      line(c, -10, -3, -14, -5, '#5a4a3a', 1.6);
      // head with spray paint
      dot(c, 5, 0, 7.5, '#b8ae9a');
      c.fillStyle = 'rgba(150,40,30,0.85)';
      c.beginPath(); c.ellipse(9, -3, 1.6, 2.4, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(9, 3, 1.6, 2.4, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(70,120,60,0.8)'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(2, -6); c.quadraticCurveTo(10, -1, 3, 5); c.stroke();
      c.strokeStyle = 'rgba(150,40,30,0.7)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(11, -1); c.lineTo(11.5, 1.5); c.stroke();
      c.restore();
    };

    const scp049 = function (c: CanvasRenderingContext2D, a: AnomalySprite, time: number) {
      c.save();
      c.translate(a.x, a.y);
      shadow(c, 3, 5, 17, 14, 0.42);
      c.rotate(a.angle);
      const sway = Math.sin((a.step || 0)) * 1.5;
      c.fillStyle = '#1b1716';
      c.beginPath(); c.moveTo(8, -9); c.quadraticCurveTo(-18, -16 + sway, -19, 0); c.quadraticCurveTo(-18, 16 - sway, 8, 9); c.closePath(); c.fill();
      c.fillStyle = '#4a3322'; G.rr(c, -6, 11, 8, 5, 1.5); c.fill();
      line(c, 2, 9, 6, 6, '#1b1716', 3.5);
      // hat brim and crown
      dot(c, 0, 0, 11, '#0f0d0d');
      c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.stroke();
      dot(c, 0, 0, 6, '#1d1a19');
      // beak mask
      c.fillStyle = '#e4dcc5';
      c.beginPath(); c.moveTo(6, -4); c.lineTo(19, 0); c.lineTo(6, 4); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath(); c.moveTo(6, 0.5); c.lineTo(19, 0); c.lineTo(6, 4); c.closePath(); c.fill();
      c.restore();
    };

    const scp106 = function (c: CanvasRenderingContext2D, a: AnomalySprite, time: number) {
      c.save();
      c.translate(a.x, a.y);
      if ((a.dormant ?? 0) > 0) {
        const g = c.createRadialGradient(0, 0, 0, 0, 0, 26);
        g.addColorStop(0, 'rgba(8,5,3,0.85)'); g.addColorStop(1, 'rgba(20,12,8,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fill();
        c.restore();
        return;
      }
      c.rotate(a.angle);
      c.fillStyle = 'rgba(14,9,6,0.55)';
      c.beginPath();
      for (let i = 0; i <= 16; i++) {
        const ang = (i / 16) * TAU, r = 19 + Math.sin(time * 3 + i * 2.3) * 3;
        i ? c.lineTo(Math.cos(ang) * r, Math.sin(ang) * r) : c.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      c.fill();
      c.fillStyle = '#17100c';
      c.beginPath(); c.ellipse(-2, 0, 9, 13, 0, 0, TAU); c.fill();
      line(c, 0, -10, 12, -8 + Math.sin(time * 2) * 2, '#17100c', 4);
      line(c, 0, 10, 12, 8 - Math.sin(time * 2) * 2, '#17100c', 4);
      dot(c, 3, 0, 6.5, '#1d1410');
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.beginPath(); c.ellipse(1, -2, 2.5, 1.2, 0.4, 0, TAU); c.fill();
      c.fillStyle = 'rgba(220,200,170,0.35)';
      dot(c, 7, -2.2, 0.9, 'rgba(230,210,180,0.5)'); dot(c, 7, 2.2, 0.9, 'rgba(230,210,180,0.5)');
      c.restore();
    };

    const anomaly = function (c: CanvasRenderingContext2D, a: AnomalySprite, time: number) {
      if (a.kind === 'scp173') A.scp173(c, a, time);
      else if (a.kind === 'scp049') A.scp049(c, a, time);
      else A.scp106(c, a, time);
    };

    const sentry = function (c: CanvasRenderingContext2D, d: Turret, time: number) {
      c.save();
      c.translate(d.x, d.y);
      shadow(c, 2, 4, 15, 12, 0.35);
      c.strokeStyle = '#1b1f24'; c.lineWidth = 3; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + 0.5;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); c.stroke();
      }
      dot(c, 0, 0, 8, '#2c3238');
      c.rotate(d.angle);
      c.fillStyle = '#3b434b'; G.rr(c, -7, -6, 14, 12, 3); c.fill();
      c.fillStyle = '#16191c'; c.fillRect(5, -4, 14, 2.5); c.fillRect(5, 1.5, 14, 2.5);
      dot(c, -3, 0, 2, d.cd > 0.1 ? '#e9a23b' : '#ffd27a');
      c.restore();
      // remaining service time
      c.strokeStyle = 'rgba(233,162,59,0.6)'; c.lineWidth = 2;
      c.beginPath(); c.arc(d.x, d.y, 18, -Math.PI / 2, -Math.PI / 2 + TAU * (d.life / d.duration)); c.stroke();
    };

    /* Corpses are stamped into the decal layer */
    const corpse = function (c: CanvasRenderingContext2D, e: Enemy) {
      const kind = hasPalette(e.type) ? e.type : 'trooper';
      c.globalAlpha = 0.9;
      A.human(c, { x: e.x, y: e.y, r: e.r, angle: e.angle + G.rand(-0.6, 0.6), step: 0 }, kind, 0, { dead: true });
      c.globalAlpha = 1;
    };

    const A = { PAL, human, player, sentry, corpse, enemy, drone, exo, archon, pylon, scp173, scp049, scp106, anomaly };
    return A;
  })();
}
