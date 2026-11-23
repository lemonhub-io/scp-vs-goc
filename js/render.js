'use strict';
/* Layered renderer: floor, decals, actors, light buffer, additive glow, walls, overlays */
G.renderer = (() => {
  const canvas = document.getElementById('arena');
  const radar = document.getElementById('radar');
  const ctx = canvas.getContext('2d', { alpha: false });
  const mini = radar.getContext('2d');
  const M = G.map, A = G.art, F = G.fx;
  const T = M.tile;
  const LS = 0.5;
  const lc = document.createElement('canvas');
  const lctx = lc.getContext('2d');
  const view = { w: 0, h: 0, dpr: 1, zoom: 1, x: M.start.x, y: M.start.y, sx: 0, sy: 0 };
  const FONT = '"Chakra Petch", "IBM Plex Mono", ui-monospace, monospace';
  let vignette = null;

  M.renderFloor();
  M.bakeLamps();
  F.reset();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => M.renderFloor());

  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    lc.width = Math.ceil(view.w * LS) + 2;
    lc.height = Math.ceil(view.h * LS) + 2;
    view.zoom = G.clamp(Math.min(view.w / 1120, view.h / 700), 0.56, 1.45);
    for (const l of M.lamps) l.grad = null;
    const g = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.3, view.w / 2, view.h / 2, Math.hypot(view.w, view.h) * 0.6);
    g.addColorStop(0, 'rgba(6,8,10,0)');
    g.addColorStop(1, 'rgba(6,8,10,0.78)');
    vignette = g;
  }

  function snap(p) { view.x = p.x; view.y = p.y; }
  function world(x, y) { return { x: view.x + (x - view.w / 2) / view.zoom, y: view.y + (y - view.h / 2) / view.zoom }; }
  function screen(x, y) { return { x: (x - view.x) * view.zoom + view.w / 2 + view.sx, y: (y - view.y) * view.zoom + view.h / 2 + view.sy }; }

  const dot = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, G.TAU); c.fill(); };
  const line = (c, x1, y1, x2, y2, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  function text(c, value, x, y, color, size = 12, align = 'center', weight = 600) {
    c.fillStyle = color;
    c.font = weight + ' ' + size + 'px ' + FONT;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillText(value, x, y);
  }

  function worldTransform(c, scale) {
    const z = view.zoom * scale;
    c.setTransform(z, 0, 0, z, (view.w / 2 + view.sx) * scale - view.x * z, (view.h / 2 + view.sy) * scale - view.y * z);
  }

  /* Static floor and decals, cropped to the visible rectangle */
  function drawGround(x0, y0, x1, y1) {
    const cx0 = Math.max(0, x0), cy0 = Math.max(0, y0), cx1 = Math.min(M.pw, x1), cy1 = Math.min(M.ph, y1);
    if (cx1 <= cx0 || cy1 <= cy0) return;
    const FS = M.FS;
    ctx.drawImage(M.floorCanvas, cx0 * FS, cy0 * FS, (cx1 - cx0) * FS, (cy1 - cy0) * FS, cx0, cy0, cx1 - cx0, cy1 - cy0);
    ctx.drawImage(F.canvas, cx0, cy0, cx1 - cx0, cy1 - cy0, cx0, cy0, cx1 - cx0, cy1 - cy0);
  }

  function drawDoors(cells, time) {
    for (const c of cells) {
      const x = c.door[0] * T, y = 34 * T, w = 2 * T;
      const open = M.doorOpen[c.index];
      if (open) {
        ctx.fillStyle = '#1a1e24';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y); ctx.lineTo(x + 6, y + 10); ctx.lineTo(x + 10, y + T); ctx.lineTo(x, y + T); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w - 9, y); ctx.lineTo(x + w - 4, y + 14); ctx.lineTo(x + w - 11, y + T); ctx.lineTo(x + w, y + T); ctx.fill();
        ctx.strokeStyle = '#ff7a3d'; ctx.globalAlpha = 0.5 + Math.sin(time * 4) * 0.2; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 6, y + 10); ctx.lineTo(x + 10, y + T); ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.fillStyle = '#0d0f12'; ctx.fillRect(x - 4, y, w + 8, T);
      ctx.fillStyle = '#323943'; ctx.fillRect(x, y + 3, w, T - 6);
      ctx.fillStyle = '#3d4550'; ctx.fillRect(x + 2, y + 5, w / 2 - 3, T - 10); ctx.fillRect(x + w / 2 + 1, y + 5, w / 2 - 3, T - 10);
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 2, y + 10, w - 4, 8); ctx.clip();
      ctx.fillStyle = '#17150f'; ctx.fillRect(x, y + 10, w, 8);
      ctx.fillStyle = 'rgba(214,164,52,0.85)';
      for (let i = -8; i < w + 8; i += 10) { ctx.beginPath(); ctx.moveTo(x + i, y + 18); ctx.lineTo(x + i + 5, y + 18); ctx.lineTo(x + i + 13, y + 10); ctx.lineTo(x + i + 8, y + 10); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#0d0f12'; ctx.fillRect(x + w / 2 - 1, y + 3, 2, T - 6);
      // integrity strip
      const seg = 8, lit = Math.ceil((c.hp / 100) * seg);
      for (let i = 0; i < seg; i++) {
        const col = c.charge ? (Math.sin(time * 12) > 0 ? '#ff4a3a' : '#5a1a14') : i < lit ? (c.hp > 50 ? '#7ee0a0' : '#f2b33d') : '#1c2126';
        ctx.fillStyle = col;
        ctx.fillRect(x + 6 + i * ((w - 12) / seg), y + 22, (w - 12) / seg - 1.5, 3);
      }
    }
  }

  function groundLayer(s, time) {
    // lockers
    for (const l of s.lockers || []) {
      const ready = !l.cd;
      dot(ctx, l.x + 13, l.y - 9, 2.2, ready ? '#7ee0a0' : '#c0813a');
    }
    // telegraph marks
    for (const m of s.marks || []) {
      const t = 1 - m.life / m.max;
      ctx.fillStyle = `rgba(255,70,50,${0.08 + t * 0.18})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, G.TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,90,60,${0.5 + t * 0.4})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, G.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * t, 0, G.TAU); ctx.stroke();
    }
    // charges
    for (const c of s.cells) {
      const b = c.charge;
      if (!b) continue;
      const f = b.fuse / b.max;
      ctx.strokeStyle = 'rgba(255,90,60,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, 20, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, 20, -Math.PI / 2, -Math.PI / 2 + G.TAU * f); ctx.stroke();
      ctx.fillStyle = '#20252b'; G.rr(ctx, b.x - 9, b.y - 6, 18, 12, 2); ctx.fill();
      ctx.fillStyle = '#c86a2c'; ctx.fillRect(b.x - 7, b.y - 4, 9, 8);
      dot(ctx, b.x + 5, b.y, 1.8, Math.sin(time * (f < 0.3 ? 30 : 12)) > 0 ? '#ff3b2a' : '#4a1410');
    }
    // drops
    for (const d of s.drops || []) {
      const color = d.kind === 'plate' ? '#8ec8ff' : d.kind === 'ammo' ? '#f2c66d' : '#7ee0a0';
      const bob = Math.sin(time * 4 + d.x) * 2;
      ctx.save();
      ctx.translate(d.x, d.y + bob);
      ctx.globalAlpha = d.life < 4 ? (Math.sin(time * 16) > 0 ? 1 : 0.35) : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-6, 5 - bob, 12, 3);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#151a1e'; ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = color; ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#151a1e';
      if (d.kind === 'med') { ctx.fillRect(-1.2, -3.5, 2.4, 7); ctx.fillRect(-3.5, -1.2, 7, 2.4); }
      else if (d.kind === 'ammo') { ctx.fillRect(-3, -3, 1.8, 6); ctx.fillRect(-0.4, -3, 1.8, 6); ctx.fillRect(2.2, -3, 1.8, 6); }
      else { ctx.fillRect(-3, -2, 6, 4); }
      ctx.restore();
    }
  }

  function actors(s, time) {
    for (const a of s.anomalies) A.anomaly(ctx, a, time);
    for (const d of s.devices || []) if (d.type === 'sentry') A.sentry(ctx, d, time);
    for (const e of s.enemies) if (e.type !== 'drone') A.enemy(ctx, e, time);
    const p = s.player;
    if (p && p.hp > 0) A.player(ctx, p, time);
    for (const d of s.devices || []) {
      if (d.type === 'frag') {
        dot(ctx, d.x + 1.5, d.y + 2.5, 5, 'rgba(0,0,0,0.35)');
        dot(ctx, d.x, d.y, 4.6, '#3d4a33');
        dot(ctx, d.x - 1, d.y - 1, 1.5, '#7d8a6a');
      } else if (d.type === 'scp018') {
        dot(ctx, d.x + 2, d.y + 3, 5, 'rgba(0,0,0,0.3)');
        dot(ctx, d.x, d.y, 5.2, '#d8262a');
        dot(ctx, d.x - 1.5, d.y - 1.5, 1.6, '#ff9a8a');
      }
    }
  }

  function projectiles(s) {
    ctx.lineCap = 'round';
    for (const b of s.projectiles) {
      if (b.homing) continue;
      const back = Math.min(b.len || 16, b.traveled + 4);
      const bx = b.x - Math.cos(b.angle) * back, by = b.y - Math.sin(b.angle) * back;
      line(ctx, bx, by, b.x, b.y, b.team === 'hostile' ? '#ffd2c2' : '#fff7dc', b.team === 'hostile' ? 2.4 : 1.6);
    }
  }

  function additive(s, time) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const b of s.projectiles) {
      if (b.homing) {
        F.drawGlow(ctx, b.x, b.y, b.blast ? 22 : 26, b.color, 0.85);
        dot(ctx, b.x, b.y, b.blast ? 2.6 : 3.6, '#ffffff');
        if (b.blast) line(ctx, b.x, b.y, b.x - Math.cos(b.angle) * 14, b.y - Math.sin(b.angle) * 14, b.color, 3);
      } else {
        const back = Math.min((b.len || 16) * 1.6, b.traveled + 4);
        ctx.globalAlpha = 0.55;
        line(ctx, b.x - Math.cos(b.angle) * back, b.y - Math.sin(b.angle) * back, b.x, b.y, b.color, b.team === 'hostile' ? 5 : 3.5);
        ctx.globalAlpha = 1;
        if (b.team === 'hostile') F.drawGlow(ctx, b.x, b.y, 12, '#ff5a3c', 0.6);
      }
    }
    for (const e of s.enemies) {
      if (e.lock > 0) {
        const len = 1000;
        const x2 = e.x + Math.cos(e.lockAngle) * len, y2 = e.y + Math.sin(e.lockAngle) * len;
        const t = M.trace(e.x, e.y, x2, y2);
        const ex = G.lerp(e.x, x2, t), ey = G.lerp(e.y, y2, t);
        const hot = e.lock <= 0.23;
        ctx.globalAlpha = hot ? 0.95 : 0.45;
        line(ctx, e.x, e.y, ex, ey, '#ff3d5a', hot ? 2.2 : 1.1);
        ctx.globalAlpha = 1;
        F.drawGlow(ctx, ex, ey, hot ? 14 : 8, '#ff3d5a', 0.9);
      }
      if (e.type === 'adept' || e.type === 'archon' || e.type === 'pylon') F.drawGlow(ctx, e.x, e.y, e.type === 'archon' ? 70 : 34, '#5ab8ff', 0.35);
      if (e.type === 'pylon') {
        const archon = s.enemies.find(o => o.type === 'archon');
        if (archon) {
          ctx.globalAlpha = 0.35 + Math.sin(time * 10) * 0.15;
          line(ctx, e.x, e.y, archon.x, archon.y, '#8ae6ff', 2);
          ctx.globalAlpha = 1;
        }
      }
      if (e.warded) {
        ctx.strokeStyle = `rgba(138,230,255,${0.45 + Math.sin(time * 6) * 0.15})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 14, 0, G.TAU); ctx.stroke();
      }
      if (e.type === 'exo') F.drawGlow(ctx, e.x - Math.cos(e.angle) * 30, e.y - Math.sin(e.angle) * 30, 34, '#ff8a3a', 0.55);
    }
    for (const l of M.leds) {
      if (l.x < view.bx0 || l.x > view.bx1 || l.y < view.by0 || l.y > view.by1) continue;
      if (Math.sin(time * (2 + l.ph) + l.ph * 7) > -0.4) F.drawGlow(ctx, l.x, l.y, 6, l.c ? '#ffb547' : '#7ee0a0', 0.9);
    }
    F.drawAdd(ctx, view.bx0, view.by0, view.bx1, view.by1);
    for (const f of s.effects) {
      const t = 1 - f.life / f.duration;
      const a = 1 - t;
      if (f.type === 'ring') {
        ctx.globalAlpha = a * (f.bright ? 1 : 0.8);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = (f.bright ? 5 : 2.5) * a + 0.5;
        ctx.beginPath(); ctx.arc(f.x, f.y, 4 + f.radius * G.easeOut(t), 0, G.TAU); ctx.stroke();
      } else if (f.type === 'beam') {
        ctx.globalAlpha = a;
        line(ctx, f.x, f.y, f.tx, f.ty, f.color, 14 * a + 2);
        line(ctx, f.x, f.y, f.tx, f.ty, '#ffffff', 2.5 * a + 0.5);
      } else if (f.type === 'arc') {
        ctx.globalAlpha = a;
        const rng = G.seeded(Math.floor(time * 30) + Math.floor(f.x));
        for (let k = 0; k < 2; k++) {
          ctx.strokeStyle = k ? '#ffffff' : f.color;
          ctx.lineWidth = k ? 1.2 : 3.5;
          ctx.beginPath(); ctx.moveTo(f.x, f.y);
          const n = Math.max(4, Math.round(G.dist(f.x, f.y, f.tx, f.ty) / 22));
          for (let i = 1; i < n; i++) ctx.lineTo(G.lerp(f.x, f.tx, i / n) + rng() * 16 - 8, G.lerp(f.y, f.ty, i / n) + rng() * 16 - 8);
          ctx.lineTo(f.tx, f.ty); ctx.stroke();
        }
      } else if (f.type === 'afterimage') {
        ctx.globalAlpha = a * 0.35;
        dot(ctx, f.x, f.y, 11, '#e9a23b');
      }
    }
    ctx.globalAlpha = 1;
    for (const d of s.devices || []) {
      if (d.type === 'scp018') F.drawGlow(ctx, d.x, d.y, 18 + Math.min(20, d.bounce * 3), '#ff3a3a', 0.6);
      if (d.type === 'frag' && Math.sin(d.life * 30) > 0) F.drawGlow(ctx, d.x, d.y, 10, '#ff5a3c', 0.9);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* Light buffer, multiplied over the scene */
  function lighting(s, time, attract) {
    const W = lc.width, H = lc.height;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    const alarm = s.alarm || 0;
    const pulse = alarm * (0.5 + 0.5 * Math.sin(time * 3.2));
    const base = attract ? [50, 53, 64] : [60, 64, 76];
    lctx.fillStyle = `rgb(${Math.round(base[0] + pulse * 24)},${Math.round(base[1] - pulse * 8)},${Math.round(base[2] - pulse * 10)})`;
    lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = 'lighter';
    worldTransform(lctx, LS);
    const { bx0, by0, bx1, by1 } = view;
    for (const l of M.lamps) {
      if (l.x + l.r < bx0 || l.x - l.r > bx1 || l.y + l.r < by0 || l.y - l.r > by1) continue;
      if (!l.grad) {
        const g = lctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        g.addColorStop(0, l.color); g.addColorStop(0.35, l.color + 'b0'); g.addColorStop(1, l.color + '00');
        l.grad = g;
      }
      let k = l.i * (1 - alarm * 0.18);
      if (l.flicker) {
        const n = Math.sin(time * 23 + l.x) * Math.sin(time * 7.1 + l.y);
        k *= n > 0.82 ? 0.15 : 0.85 + 0.15 * Math.sin(time * 40);
      }
      lctx.globalAlpha = k;
      lctx.fillStyle = l.grad;
      lctx.fill(l.path);
    }
    lctx.globalAlpha = 1;
    if (alarm > 0) {
      for (const [i, b] of M.beacons.entries()) {
        if (b.x + 260 < bx0 || b.x - 260 > bx1 || b.y + 260 < by0 || b.y - 260 > by1) continue;
        const a = time * 3.4 + i * 1.7;
        for (const off of [0, Math.PI]) {
          const g = lctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 250);
          g.addColorStop(0, `rgba(255,40,30,${0.6 * alarm})`); g.addColorStop(1, 'rgba(255,40,30,0)');
          lctx.fillStyle = g;
          lctx.beginPath(); lctx.moveTo(b.x, b.y); lctx.arc(b.x, b.y, 250, a + off - 0.32, a + off + 0.32); lctx.closePath(); lctx.fill();
        }
        F.drawGlow(lctx, b.x, b.y, 50, '#ff2a1e', 0.9 * alarm);
      }
    }
    const p = s.player;
    if (p && p.hp > 0) {
      const aura = M.visPoly(p.x, p.y, 210, 0, G.TAU, 96, false);
      const g = lctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 210);
      g.addColorStop(0, 'rgba(255,236,210,0.62)'); g.addColorStop(1, 'rgba(255,236,210,0)');
      fillPoly(lctx, aura, g);
      const fx = p.x + Math.cos(p.angle) * 10, fy = p.y + Math.sin(p.angle) * 10;
      const R = 620;
      const cone = M.visPoly(fx, fy, R, p.angle - 0.6, p.angle + 0.6, 84, true);
      const g2 = lctx.createRadialGradient(fx, fy, 0, fx, fy, R);
      g2.addColorStop(0, 'rgba(255,244,222,0.95)'); g2.addColorStop(0.45, 'rgba(255,240,214,0.6)'); g2.addColorStop(1, 'rgba(255,240,214,0)');
      lctx.globalAlpha = 0.45;
      fillPoly(lctx, cone, g2);
      const inner = M.visPoly(fx, fy, R, p.angle - 0.42, p.angle + 0.42, 64, true);
      lctx.globalAlpha = 0.75;
      fillPoly(lctx, inner, g2);
      lctx.globalAlpha = 1;
      if (p.cola > 0) F.drawGlow(lctx, p.x, p.y, 60, '#ff4a57', 0.3);
    }
    F.drawLights(lctx, bx0, by0, bx1, by1);
    for (const e of s.enemies) {
      if (e.type === 'drone') F.drawGlow(lctx, e.x, e.y, 46, e.armed > 0 ? '#ff3b2a' : '#5cc6ff', 0.5);
      else if (e.type === 'adept' || e.type === 'archon' || e.type === 'pylon') F.drawGlow(lctx, e.x, e.y, e.type === 'archon' ? 170 : 90, '#5ab8ff', 0.7);
      else if (e.type === 'exo') F.drawGlow(lctx, e.x, e.y, 120, '#ffa060', 0.4);
      else if (e.type !== 'zombie') F.drawGlow(lctx, e.x + Math.cos(e.angle) * 16, e.y + Math.sin(e.angle) * 16, 52, '#7ccfff', 0.42);
    }
    for (const b of s.projectiles) {
      if (b.homing) F.drawGlow(lctx, b.x, b.y, b.blast ? 70 : 80, b.color, 0.75);
      else if (b.team === 'hostile') F.drawGlow(lctx, b.x, b.y, 40, '#ff6a4a', 0.5);
    }
    for (const c of s.cells) {
      if (c.charge && Math.sin(time * 12) > 0) F.drawGlow(lctx, c.charge.x, c.charge.y, 110, '#ff3b2a', 0.8);
    }
    for (const l of s.lockers || []) F.drawGlow(lctx, l.x, l.y, 70, l.cd ? '#c0813a' : '#7ee0a0', 0.45);
    for (const d of s.drops || []) F.drawGlow(lctx, d.x, d.y, 42, d.kind === 'plate' ? '#8ec8ff' : d.kind === 'ammo' ? '#f2c66d' : '#7ee0a0', 0.55);
    for (const d of s.devices || []) {
      if (d.type === 'sentry') F.drawGlow(lctx, d.x, d.y, 60, '#e9a23b', 0.5);
      if (d.type === 'scp018') F.drawGlow(lctx, d.x, d.y, 60, '#ff3a3a', 0.6);
    }
    for (const f of s.effects) {
      const a = f.life / f.duration;
      if (f.type === 'beam') { lctx.globalAlpha = a; lctx.strokeStyle = f.color; lctx.lineWidth = 60; lctx.beginPath(); lctx.moveTo(f.x, f.y); lctx.lineTo(f.tx, f.ty); lctx.stroke(); lctx.globalAlpha = 1; }
      else if (f.type === 'arc') F.drawGlow(lctx, f.tx, f.ty, 90, '#9fe8ff', a);
    }
    lctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lc, 0, 0, W / LS, H / LS);
    ctx.globalCompositeOperation = 'source-over';
  }

  function fillPoly(c, pts, style) {
    c.fillStyle = style;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    c.fill();
  }

  function overlays(s, time) {
    for (const a of s.anomalies) {
      if (a.kind !== 'scp173' || a.dormant > 0 || !s.player) continue;
      ctx.strokeStyle = a.watched ? 'rgba(242,239,228,0.55)' : `rgba(255,70,50,${0.4 + Math.sin(time * 14) * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(a.watched ? [3, 5] : []);
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r + 9, 0, G.TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const e of s.enemies) {
      if (e.type === 'drone') { A.drone(ctx, e, time); }
      if (!e.boss && e.hp < e.max && e.type !== 'pylon') {
        const w = e.r * 2.2;
        ctx.fillStyle = 'rgba(8,10,12,0.75)'; ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w, 3.5);
        ctx.fillStyle = e.elite ? '#f2b33d' : '#ff6a4a'; ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w * Math.max(0, e.hp / e.max), 3.5);
      }
      if (e.type === 'pylon') {
        ctx.fillStyle = 'rgba(8,10,12,0.75)'; ctx.fillRect(e.x - 16, e.y - 28, 32, 3);
        ctx.fillStyle = '#8ae6ff'; ctx.fillRect(e.x - 16, e.y - 28, 32 * Math.max(0, e.hp / e.max), 3);
      }
      if (e.planting > 0) {
        ctx.fillStyle = 'rgba(8,10,12,0.8)'; ctx.fillRect(e.x - 14, e.y + e.r + 7, 28, 4);
        ctx.fillStyle = '#ff9a4a'; ctx.fillRect(e.x - 14, e.y + e.r + 7, 28 * Math.min(1, e.planting / 1.65), 4);
      }
    }
    for (const c of s.cells) {
      const b = c.charge;
      if (!b) continue;
      text(ctx, b.fuse.toFixed(1), b.x, b.y - 32, b.fuse < 4 ? '#ff6a4a' : '#ffd2a6', 15, 'center', 700);
      if (b.progress > 0) {
        ctx.strokeStyle = '#7ee0a0'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, 27, -Math.PI / 2, -Math.PI / 2 + G.TAU * Math.min(1, b.progress / 1.55)); ctx.stroke();
      }
    }
    for (const f of s.effects) {
      if (f.type !== 'number' && f.type !== 'text') continue;
      const t = 1 - f.life / f.duration;
      ctx.globalAlpha = Math.min(1, (1 - t) * 2);
      const size = f.type === 'text' ? 13 : f.big ? 17 : 13;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,12,0.8)';
      ctx.font = '700 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(f.text, f.x, f.y);
      text(ctx, f.text, f.x, f.y, f.color || '#ffe2a8', size, 'center', 700);
    }
    ctx.globalAlpha = 1;
  }

  function screenLayer(s, input, time) {
    const { w, h } = view;
    const p = s.player;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (!p) return;
    const lim = s.healthLimit || 100;
    const low = p.hp > 0 && p.hp < lim * 0.3 ? (0.5 + 0.5 * Math.sin(time * 6)) * (1 - p.hp / (lim * 0.3)) : 0;
    const hurt = Math.max(p.hit / 0.45 * 0.55, low * 0.6);
    if (hurt > 0.01) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.6);
      g.addColorStop(0, 'rgba(170,20,20,0)'); g.addColorStop(1, `rgba(170,20,20,${hurt})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    if (p.hit > 0 && p.hurtAngle !== undefined) {
      const c = screen(p.x, p.y);
      ctx.strokeStyle = `rgba(255,70,50,${p.hit / 0.45})`;
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(c.x, c.y, 64, p.hurtAngle - 0.45, p.hurtAngle + 0.45); ctx.stroke();
    }
    if (G.state !== 'play') return;
    // off-screen markers
    const marks = [];
    for (const c of s.cells) if (c.charge) marks.push({ x: c.charge.x, y: c.charge.y, color: '#ff5a3c', label: c.label + ' ' + c.charge.fuse.toFixed(0) });
    for (const e of s.enemies) {
      if (e.boss) marks.push({ x: e.x, y: e.y, color: '#ff9a4a', label: '!' });
      else if (e.planting > 0) marks.push({ x: e.x, y: e.y, color: '#ffb070', label: e.target ? e.target.label : '!' });
    }
    for (const a of s.anomalies) if (!(a.dormant > 0)) marks.push({ x: a.x, y: a.y, color: '#c38bff', label: a.cell.scp });
    for (const m of marks) {
      const sp = screen(m.x, m.y);
      const pad = 46;
      if (sp.x > pad && sp.x < w - pad && sp.y > 90 && sp.y < h - 120) continue;
      const cx = w / 2, cy = h / 2;
      const ang = Math.atan2(sp.y - cy, sp.x - cx);
      const k = Math.min((w / 2 - pad) / Math.abs(Math.cos(ang) || 1e-6), (h / 2 - 100) / Math.abs(Math.sin(ang) || 1e-6));
      const x = cx + Math.cos(ang) * k, y = cy + Math.sin(ang) * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(10,12,14,0.82)';
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, G.TAU); ctx.fill();
      ctx.rotate(ang);
      ctx.fillStyle = m.color;
      ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(17, -6); ctx.lineTo(17, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      text(ctx, m.label, x, y, m.color, 11, 'center', 700);
    }
    // crosshair
    const pad = input && input.padAim;
    if (!input || (!pad && !G.input.mouse.ready)) return;
    let x, y;
    if (pad) { const c = screen(p.x + Math.cos(p.angle) * 140, p.y + Math.sin(p.angle) * 140); x = c.x; y = c.y; }
    else { x = input.crossX; y = input.crossY; }
    const w2 = G.WEAPONS[p.weapon], arm = p.arms[p.weapon];
    const gap = 5 + (p.bloom || 0) * 60 + (w2.spread || 0) * 40;
    const hit = s.hitMarker > s.time;
    const col = '#f2efe4';
    ctx.lineCap = 'butt';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      line(ctx, x + dx * (gap + 1), y + dy * (gap + 1), x + dx * (gap + 8), y + dy * (gap + 8), 'rgba(0,0,0,0.6)', 3.5);
      line(ctx, x + dx * gap, y + dy * gap, x + dx * (gap + 7), y + dy * (gap + 7), col, 1.6);
    }
    dot(ctx, x, y, 1.4, col);
    if (hit) {
      const k = s.killMarker > s.time;
      const c2 = k ? '#ff5a3c' : '#ffffff';
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) line(ctx, x + dx * 6, y + dy * 6, x + dx * 13, y + dy * 13, c2, 2);
    }
    if (arm.reload) {
      const total = w2.reload * (1 - (s.up ? s.up.reload : 0) * 0.14);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 20, 0, G.TAU); ctx.stroke();
      ctx.strokeStyle = '#e9a23b'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + G.TAU * (1 - arm.reload / total)); ctx.stroke();
    } else if (!w2.regen && Number.isFinite(arm.reserve) && arm.mag <= w2.mag * 0.25) {
      text(ctx, arm.mag < 1 ? (arm.reserve ? 'R' : '0') : String(Math.floor(arm.mag)), x + 22, y + 18, '#ff8a5a', 11, 'left', 700);
    }
  }

  function minimap(s, time) {
    const w = radar.width, h = radar.height;
    mini.setTransform(1, 0, 0, 1, 0, 0);
    mini.clearRect(0, 0, w, h);
    const k = Math.min(w / M.pw, h / M.ph);
    const ox = (w - M.pw * k) / 2, oy = (h - M.ph * k) / 2;
    mini.drawImage(M.miniCanvas, ox, oy, M.pw * k, M.ph * k);
    mini.setTransform(k, 0, 0, k, ox, oy);
    for (const c of s.cells) {
      const col = c.charge ? (Math.sin(time * 10) > 0 ? '#ff5a3c' : '#5a1a14') : c.hp > 0 ? '#7ee0a0' : '#c38bff';
      mini.fillStyle = col;
      mini.fillRect(c.door[0] * T, 34 * T, 2 * T, T);
    }
    for (const l of s.lockers || []) { mini.fillStyle = '#7ee0a0'; mini.fillRect(l.x - 24, l.y - 24, 48, 48); }
    for (const e of s.enemies) {
      mini.fillStyle = e.type === 'pylon' ? '#8ae6ff' : e.type === 'sapper' ? '#ffb070' : '#ff5a4a';
      mini.beginPath(); mini.arc(e.x, e.y, e.boss ? 46 : 26, 0, G.TAU); mini.fill();
    }
    for (const a of s.anomalies) { mini.fillStyle = '#c38bff'; mini.beginPath(); mini.arc(a.x, a.y, 34, 0, G.TAU); mini.fill(); }
    const p = s.player;
    mini.fillStyle = '#ffd27a';
    mini.save(); mini.translate(p.x, p.y); mini.rotate(p.angle);
    mini.beginPath(); mini.moveTo(56, 0); mini.lineTo(-30, -34); mini.lineTo(-16, 0); mini.lineTo(-30, 34); mini.closePath(); mini.fill();
    mini.restore();
  }

  /* Main gameplay frame */
  let radarAt = -1;
  function frame(s, input, dt) {
    const p = s.player;
    const time = s.time;
    // camera with aim look-ahead
    let lx = 0, ly = 0;
    if (p.hp > 0 && input) {
      if (input.padAim) { lx = Math.cos(p.angle) * 90; ly = Math.sin(p.angle) * 90; }
      else { lx = G.clamp((input.aimX - p.x) * 0.2, -150, 150); ly = G.clamp((input.aimY - p.y) * 0.2, -110, 110); }
    }
    const ease = 1 - Math.pow(0.0025, dt || 0.016);
    view.x = G.lerp(view.x, p.x + lx, ease);
    view.y = G.lerp(view.y, p.y + ly, ease);
    const shake = G.state === 'play' || s.outro ? (s.shake * s.shake) * 26 * G.settings.shake : 0;
    view.sx = G.rand(-shake, shake) + (s.kickX || 0);
    view.sy = G.rand(-shake, shake) + (s.kickY || 0);
    render(s, time, input, false);
    if (time - radarAt > 0.1 || radarAt > time) { minimap(s, time); radarAt = time; }
  }

  function render(s, time, input, attract) {
    const { w, h, dpr, zoom } = view;
    const hw = w / 2 / zoom + 60, hh = h / 2 / zoom + 60;
    view.bx0 = view.x - hw; view.by0 = view.y - hh; view.bx1 = view.x + hw; view.by1 = view.y + hh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#07090b';
    ctx.fillRect(0, 0, w, h);
    worldTransform(ctx, dpr);
    drawGround(view.bx0, view.by0, view.bx1, view.by1);
    groundLayer(s, time);
    actors(s, time);
    projectiles(s);
    F.drawNormal(ctx, view.bx0, view.by0, view.bx1, view.by1);
    lighting(s, time, attract);
    worldTransform(ctx, dpr);
    additive(s, time);
    M.drawWalls(ctx, view.bx0, view.by0, view.bx1, view.by1);
    drawDoors(s.cells, time);
    overlays(s, time);
    screenLayer(s, input, time);
  }

  /* Menu backdrop: the live site under lockdown */
  const idle = {
    time: 0, alarm: 0.7, enemies: [], projectiles: [], effects: [], devices: [], drops: [], lockers: [],
    cells: M.cells.map(c => ({ ...c, hp: 100, charge: null })),
    anomalies: [
      { kind: 'scp173', x: 15 * T, y: 38.5 * T, r: 17, angle: -Math.PI / 2, cell: M.cells[0] },
      { kind: 'scp049', x: 33 * T, y: 39 * T, r: 17, angle: Math.PI * 0.8, cell: M.cells[1], step: 0 },
      { kind: 'scp106', x: 49 * T, y: 40 * T, r: 17, angle: -Math.PI / 2, cell: M.cells[2], dormant: 0 },
    ],
    player: null, shake: 0,
  };
  function attract(dt) {
    idle.time += dt;
    const t = idle.time;
    idle.alarm = 0.55 + Math.sin(t * 0.25) * 0.25;
    idle.anomalies[1].angle += Math.sin(t * 0.6) * dt * 0.4;
    view.x = 1100 + Math.sin(t * 0.045) * 520;
    view.y = 900 + Math.sin(t * 0.031 + 1) * 330;
    view.sx = view.sy = 0;
    const z = view.zoom;
    view.zoom = z * 1.08;
    render(idle, t, null, true);
    view.zoom = z;
  }

  resize();
  window.addEventListener('resize', resize);
  return { frame, attract, world, snap, screen, view };
})();
