'use strict';

G.renderer = (() => {
  const canvas = document.getElementById('arena');
  const radar = document.getElementById('radar');
  const ctx = canvas.getContext('2d', { alpha: false });
  const mini = radar.getContext('2d');
  const M = G.map;
  const view = { w: 0, h: 0, dpr: 1, zoom: 1, x: M.start.x, y: M.start.y };
  const floor = document.createElement('canvas');
  floor.width = M.width;
  floor.height = M.height;

  const palette = {
    trooper: ['#795957', '#f29070'], breacher: ['#916b50', '#ffb269'], sapper: ['#805b45', '#ffd178'],
    marksman: ['#674f60', '#ff7292'], shield: ['#685761', '#ff805e'], adept: ['#635575', '#ce98ff'],
    drone: ['#494b53', '#fa6d57'], exo: ['#583f3e', '#ff9b68'], archon: ['#63496f', '#d9a4ff'],
    pylon: ['#604979', '#c38bff'], zombie: ['#5a624a', '#c0bf77'],
    scp173: ['#aca18d', '#faf0ca'], scp049: ['#474052', '#dad2b7'], scp106: ['#3a3040', '#ad8193'],
  };

  function dot(c, x, y, radius, color) {
    c.fillStyle = color;
    G.circle(c, x, y, radius);
    c.fill();
  }

  function stroke(c, x, y, tx, ty, color, width = 1) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(tx, ty);
    c.stroke();
  }

  function label(c, value, x, y, color, size = 12, align = 'center') {
    c.fillStyle = color;
    c.font = '600 ' + size + 'px ui-monospace, monospace';
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillText(value, x, y);
  }

  function glow(c, x, y, radius, color) {
    const g = c.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    c.fillStyle = g;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function hatch(c, x, y, w, h, color) {
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    for (let i = -h; i < w + h; i += 16) stroke(c, x + i, y + h, x + i + h, y, color, 7);
    c.restore();
  }

  function paintFloor() {
    const c = floor.getContext('2d');
    const rng = G.seeded(192109);
    c.fillStyle = '#161e21';
    c.fillRect(0, 0, M.width, M.height);
    for (let y = 0; y < M.height; y += M.tile) {
      for (let x = 0; x < M.width; x += M.tile) {
        const n = 24 + Math.floor(rng() * 8);
        c.fillStyle = 'rgb(' + n + ',' + (n + 7) + ',' + (n + 9) + ')';
        c.fillRect(x + 1, y + 1, M.tile - 1, M.tile - 1);
        for (let i = 0; i < 5; i++) {
          c.fillStyle = i % 2 ? '#ffffff0a' : '#0000002a';
          c.fillRect(x + rng() * M.tile, y + rng() * M.tile, rng() * 12 + 1, 1);
        }
      }
    }
    c.strokeStyle = '#80816e56';
    c.lineWidth = 2;
    c.setLineDash([11, 12]);
    c.strokeRect(379, 709, 922, 182);
    c.strokeRect(698, 130, 282, 365);
    c.setLineDash([]);
    for (const [value, x, y] of [['SECURITY TRANSIT', 840, 716], ['NORTH LIFT',840,151],
      ['WEST ACCESS', 160, 463], ['EAST ACCESS', 1520, 463], ['CONTAINMENT WING', 840, 1141]]) {
      label(c, value, x, y, '#abb3ab53', 21);
    }
    for (const [key, spawns] of Object.entries(M.entries)) {
      const a = spawns[1];
      const isNorth = key === 'N';
      const x = a.x - (isNorth ? 119 : 22), y = a.y - (isNorth ? 18 : 94);
      hatch(c, x, y, isNorth ? 238 : 17, isNorth ? 12 : 188, '#da9a4e66');
      glow(c, a.x, a.y, 140, '#ce523d36');
    }
    for (const w of M.walls) {
      c.fillStyle = '#090e12a6';
      c.fillRect(w.x + 5, w.y + 9, w.w + 7, w.h + 12);
      const g = c.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      g.addColorStop(0, '#454e50');
      g.addColorStop(1, '#252d30');
      c.fillStyle = g;
      c.fillRect(w.x, w.y, w.w, w.h);
      c.fillStyle = '#0e1619';
      c.fillRect(w.x, w.y + w.h - 8, w.w, 8);
      c.fillStyle = '#8d99956b';
      c.fillRect(w.x + 1, w.y + 1, w.w - 2, 2);
      c.fillStyle = '#323d40';
      c.fillRect(w.x + 5, w.y + 6, w.w - 10, 4);
      for (let x = w.x + 13; x < w.x + w.w - 8; x += 24) {
        dot(c, x, w.y + 13, 1.7, '#141f21');
        c.fillStyle = '#0c131629';
        c.fillRect(x, w.y + 17, 1, Math.max(5, w.h - 34));
      }
      if (w.w >= 84 && w.h >= 42 && w.y > M.tile && w.y < 1000) {
        c.fillStyle = '#161e20';
        c.fillRect(w.x + 12, w.y + w.h - 25, w.w - 24, 9);
        for (let x = w.x + 15; x < w.x + w.w - 14; x += 6) {
          stroke(c, x, w.y + w.h - 24, x, w.y + w.h - 18, '#85908b57');
        }
      }
    }
    for (const c0 of M.cells) {
      const { x, y } = c0;
      hatch(c, x - 70, y - 12, 140, 8, '#c39b5b90');
      c.fillStyle = '#171d20';
      c.fillRect(x - 68, y + 2, 136, 43);
      c.fillStyle = '#555956';
      c.fillRect(x - 62, y + 6, 124, 4);
      c.fillStyle = '#282d2f';
      c.fillRect(x - 59, y + 11, 118, 31);
      stroke(c, x, y + 11, x, y + 42, '#15181a', 3);
      label(c, 'SCP ' + c0.scp, x, y + 95, '#8c9492', 19);
      label(c, 'CELL ' + c0.label, x, y + 122, '#798381', 11);
    }
    for (const l of M.lockers) {
      c.fillStyle = '#142427';
      c.fillRect(l.x - 22, l.y - 14, 44, 28);
      c.fillStyle = '#42676a';
      c.fillRect(l.x - 19, l.y - 12, 38, 22);
      c.fillStyle = '#203739';
      c.fillRect(l.x - 15, l.y - 6, 30, 12);
      label(c, '+', l.x, l.y, '#bcdddd', 18);
    }
  }

  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    view.zoom = G.clamp(Math.min(view.w / 1060, view.h / 710), 0.61, 1.26);
  }

  function snap(p) {
    view.x = p.x;
    view.y = p.y;
  }

  function world(x, y) {
    return { x: view.x + (x - view.w / 2) / view.zoom, y: view.y + (y - view.h / 2) / view.zoom };
  }

  function light(p) {
    const radius = 580;
    const cone = 0.54;
    const g = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, radius);
    g.addColorStop(0, '#eaf0c835');
    g.addColorStop(0.4, '#eaf0c81c');
    g.addColorStop(1, '#eaf0c800');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (let i = 0; i <= 28; i++) {
      const a = p.angle - cone + i * cone / 14;
      const x = p.x + Math.cos(a) * radius, y = p.y + Math.sin(a) * radius;
      const t = M.trace(p.x, p.y, x, y);
      ctx.lineTo(G.lerp(p.x, x, t), G.lerp(p.y, y, t));
    }
    ctx.closePath();
    ctx.fill();
  }

  function cells(s) {
    for (const c of s.cells) {
      const color = c.charge ? '#ff7350' : c.hp <= 0 ? '#b26cdd' : c.hp < 65 ? '#e7a569' : '#a2d6ae';
      const visual = c.charge ? 0.7 + Math.sin(s.time * 11) * 0.3 : 0.8;
      ctx.globalAlpha = visual;
      glow(ctx, c.x, c.y - 3, 83, color + '48');
      ctx.fillStyle = color;
      ctx.fillRect(c.x - 39, c.y - 2, 78, 3);
      label(ctx, c.label, c.x, c.y + 25, color, 20);
      ctx.globalAlpha = 1;
      const b = c.charge;
      if (!b) continue;
      ctx.strokeStyle = '#fc805a99';
      ctx.lineWidth = 1.4;
      G.circle(ctx, b.x, b.y, 14 + Math.sin(s.time * 6) * 4);
      ctx.stroke();
      dot(ctx, b.x, b.y, 5, '#ffb277');
      label(ctx, b.fuse.toFixed(1), b.x, b.y - 22, '#ffd0a6', 16);
    }
    for (const l of s.lockers) {
      glow(ctx, l.x, l.y, 55, l.cd ? '#68796b24' : '#6cd5ba55');
      dot(ctx, l.x + 15, l.y - 8, 2.3, l.cd ? '#bb936a' : '#a3f1c1');
    }
  }

  function actor(e, type, isPlayer = false) {
    const [body, accent] = palette[type] || ['#628883', '#c5ffe4'];
    const size = e.r / 13;
    ctx.save();
    ctx.translate(e.x, e.y);
    G.ellipse(ctx, 3, 5, e.r + 5, e.r * 0.83);
    ctx.fillStyle = '#04080ac0';
    ctx.fill();
    if (e.ward || e.warded || e.elite || isPlayer && e.cola) {
      ctx.strokeStyle = e.warded ? '#d4a1ff' : e.ward ? '#bb8ae0aa' : e.elite ? '#f1ad5a9c' : '#9afedccc';
      ctx.lineWidth = e.warded ? 2.8 : 1.3;
      G.circle(ctx, 0, 0, e.r + 7);
      ctx.stroke();
    }
    ctx.rotate(e.angle);
    ctx.scale(size, size);
    const paint = e.hit ? '#f9bdad' : body;
    const step = Math.sin(e.step || 0) * 2.5;
    if (type === 'drone' || type === 'pylon') {
      ctx.rotate(type === 'pylon' ? Math.PI * 0.25 : 0);
      ctx.fillStyle = paint;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = '#171b22';
      ctx.fillRect(-6, -6, 12, 12);
      dot(ctx, 0, 0, 4, accent);
      for (const y of [-11, 11]) {
        if (type === 'drone') {
          G.ellipse(ctx, -2, y, 8, 3.6);
          ctx.fillStyle = '#3c4046';
          ctx.fill();
          stroke(ctx, -6, y, 6, y, accent, 1.3);
        }
      }
    } else if (type && type.startsWith('scp')) {
      ctx.fillStyle = paint;
      G.ellipse(ctx, -3, 0, 12, 11);
      ctx.fill();
      ctx.fillStyle = '#252930';
      G.ellipse(ctx, 0, 0, 8, 9);
      ctx.fill();
      if (type === 'scp049') {
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(2, -5); ctx.lineTo(2, 5); ctx.fill();
      } else {
        dot(ctx, 3, 0, 5, paint);
        dot(ctx, 6, -2, 1.2, accent);
        dot(ctx, 6, 2, 1.2, accent);
      }
    } else {
      ctx.fillStyle = '#171e24';
      ctx.fillRect(-11 + step, -9, 13, 6);
      ctx.fillRect(-11 - step, 3, 13, 6);
      ctx.fillStyle = paint;
      G.rr(ctx, -9, -11, 17, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#20262b';
      ctx.fillRect(-11, -8, 5, 16);
      ctx.fillStyle = body;
      ctx.fillRect(-3, -12, 8, 4);
      ctx.fillRect(-3, 8, 8, 4);
      dot(ctx, 2, 0, 7.1, '#192327');
      dot(ctx, 2, 0, 5.8, paint);
      stroke(ctx, 5.5, -3.2, 5.5, 3.2, accent, 2.5);
      if (type === 'shield') {
        ctx.fillStyle = '#2d343a';
        G.rr(ctx, 8, -13, 6, 26, 2);
        ctx.fill();
        stroke(ctx, 13, -10, 13, 10, '#ae7d70', 1.8);
      } else if (type === 'exo') {
        ctx.fillStyle = '#282428';
        ctx.fillRect(-12, -13, 11, 6);
        ctx.fillRect(-12, 7, 11, 6);
        dot(ctx, -10, 0, 3.1, '#ff6b57');
        stroke(ctx, 3, 7, 17, 7, '#14171b', 4);
      } else {
        const weapon = isPlayer ? G.WEAPONS[e.weapon] : null;
        const len = weapon?.len || 19;
        stroke(ctx, 5, 4, len, 4, '#11191b', 4.6);
        stroke(ctx, 7, 3, len - 1, 3, '#858e8a', 1.3);
        if (e.flash) {
          const color = weapon?.color || accent;
          glow(ctx, len + 4, 4, 28, color + '9c');
          stroke(ctx, len, 4, len + 10, 4, color, 3);
        }
      }
    }
    ctx.restore();
    if (!isPlayer && !type?.startsWith('scp') && (e.hp < e.max || e.boss)) {
      ctx.fillStyle = '#100e13d9';
      ctx.fillRect(e.x - e.r, e.y - e.r - 9, e.r * 2, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(e.x - e.r, e.y - e.r - 9, e.r * 2 * Math.max(0, e.hp / e.max), 3);
    }
    if (e.lock > 0) {
      const x = e.x + Math.cos(e.lockAngle) * 940, y = e.y + Math.sin(e.lockAngle) * 940;
      const t = M.trace(e.x, e.y, x, y);
      stroke(ctx, e.x, e.y, G.lerp(e.x, x, t), G.lerp(e.y, y, t), e.lock > 0.23 ? '#ff648369' : '#ff829c', 1.6);
    }
    if (e.planting > 0) {
      ctx.fillStyle = '#24201f';
      ctx.fillRect(e.x - 11, e.y + 20, 22, 3);
      ctx.fillStyle = '#ffb573';
      ctx.fillRect(e.x - 11, e.y + 20, 22 * e.planting / 1.65, 3);
    }
  }

  function effects(s) {
    for (const d of s.drops) {
      const color = d.kind === 'plate' ? '#a5c9f8' : d.kind === 'ammo' ? '#f1c782' : '#a9efb6';
      glow(ctx, d.x, d.y, 25, color + '40');
      ctx.save();
      ctx.translate(d.x, d.y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#142221';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.strokeStyle = color;
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.restore();
    }
    for (const d of s.devices) {
      if (d.type === 'sentry') {
        dot(ctx, d.x, d.y, 12, '#263b3b');
        stroke(ctx, d.x, d.y, d.x + Math.cos(d.angle) * 20, d.y + Math.sin(d.angle) * 20, '#a8cfc3', 4);
        dot(ctx, d.x, d.y, 4, '#b1efb9');
      } else {
        if (d.type === 'frag') glow(ctx, d.x, d.y, 18, '#ff986b67');
        dot(ctx, d.x, d.y, 5, d.type === 'frag' ? '#f5b36c' : '#ff504e');
      }
    }
    for (const b of s.projectiles) {
      if (b.homing) {
        glow(ctx, b.x, b.y, b.blast ? 18 : 22, b.color + '8c');
        dot(ctx, b.x, b.y, b.blast ? 2.5 : 4, b.color);
      }
      const back = Math.min(b.len, b.traveled);
      stroke(ctx, b.x - Math.cos(b.angle) * back, b.y - Math.sin(b.angle) * back, b.x, b.y, b.color, b.team === 'hostile' ? 2.1 : 1.6);
    }
    for (const f of s.effects) {
      const t = 1 - f.life / f.duration;
      ctx.globalAlpha = 1 - t;
      if (f.type === 'spark') {
        stroke(ctx, f.x - f.vx * 0.017, f.y - f.vy * 0.017, f.x, f.y, f.color, 1.8);
      } else if (f.type === 'ring') {
        if (f.bright) glow(ctx, f.x, f.y, f.radius, f.color + 'b0');
        ctx.strokeStyle = f.color;
        ctx.lineWidth = f.bright ? 4 : 2;
        G.circle(ctx, f.x, f.y, 4 + f.radius * G.easeOut(t));
        ctx.stroke();
      } else if (f.type === 'number') label(ctx, f.text, f.x, f.y, '#ffdc9d', 14);
      else if (f.type === 'afterimage') {
        ctx.globalAlpha *= 0.45;
        dot(ctx, f.x, f.y, 10, '#a5d9c6');
      } else if (f.type === 'beam') {
        stroke(ctx, f.x, f.y, f.tx, f.ty, f.color + '55', 12);
        stroke(ctx, f.x, f.y, f.tx, f.ty, f.color, 3.7);
      } else if (f.type === 'arc') {
        const rng = G.seeded(Math.floor(f.duration * 10000 * t));
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        for (let i = 1; i < 8; i++) ctx.lineTo(G.lerp(f.x, f.tx, i / 8) + rng() * 14 - 7, G.lerp(f.y, f.ty, i / 8) + rng() * 14 - 7);
        ctx.lineTo(f.tx, f.ty);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function minimap(s) {
    const w = radar.width, h = radar.height;
    mini.fillStyle = '#101718';
    mini.fillRect(0, 0, w, h);
    mini.save();
    mini.scale(w / M.width, h / M.height);
    mini.fillStyle = '#323d3e';
    for (const wall of M.walls) mini.fillRect(wall.x, wall.y, wall.w, wall.h);
    for (const c of s.cells) {
      const color = c.charge ? '#ff805c' : c.hp ? '#b5d7a9' : '#ba83e0';
      dot(mini, c.x, c.padY, c.charge ? 50 : 32, color);
    }
    for (const e of s.enemies) dot(mini, e.x, e.y, e.boss ? 35 : 14, e.type === 'pylon' ? '#c699fc' : '#d76f5c');
    const { player: p } = s;
    dot(mini, p.x, p.y, 36, '#d4f5e5');
    stroke(mini, p.x, p.y, p.x + Math.cos(p.angle) * 81, p.y + Math.sin(p.angle) * 81, '#d4f5e5', 17);
    mini.restore();
  }

  let lastRadar = -1;
  function frame(s, input, dt) {
    const p = s.player;
    const ease = 1 - 0.001 ** dt;
    view.x = G.lerp(view.x, p.x, ease);
    view.y = G.lerp(view.y, p.y, ease);
    const { w, h, zoom, dpr } = view;
    const shake = G.state === 'play' ? s.shake * 22 * G.settings.shake : 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#11181b';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + G.rand(-shake, shake), h / 2 + G.rand(-shake, shake));
    ctx.scale(zoom, zoom);
    ctx.translate(-view.x, -view.y);
    ctx.drawImage(floor, 0, 0);
    for (const d of s.decals) {
      ctx.save();
      ctx.translate(d.x, d.y); ctx.rotate(d.angle);
      G.ellipse(ctx, 0, 0, d.r, d.r * 0.68);
      ctx.fillStyle = '#2c1419a3';
      ctx.fill();
      ctx.restore();
    }
    light(p);
    cells(s);
    for (const a of s.anomalies) {
      if (a.dormant > 0) glow(ctx, a.x, a.y, 38, '#67415255');
      else actor(a, a.kind);
    }
    for (const e of s.enemies) {
      if (e.type === 'pylon') {
        const archon = s.enemies.find(o => o.type === 'archon');
        if (archon) stroke(ctx, e.x, e.y, archon.x, archon.y, '#bf8cff76', 2);
      }
      actor(e, e.type);
    }
    if (p.hp > 0) actor(p, '', true);
    effects(s);
    ctx.restore();
    const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.27, w / 2, h / 2, Math.hypot(w, h) * 0.57);
    vignette.addColorStop(0, '#090e1000');
    vignette.addColorStop(1, p.hit ? '#a8313680' : '#090e10d3');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    if (G.state === 'play') {
      const x = input.padAim ? (p.x + Math.cos(p.angle) * 115 - view.x) * zoom + w / 2 : input.crossX;
      const y = input.padAim ? (p.y + Math.sin(p.angle) * 115 - view.y) * zoom + h / 2 : input.crossY;
      const hit = s.hitMarker > s.time;
      const cross = hit ? '#ff9979' : '#e1e8d6';
      if (input.padAim || G.input.mouse.ready) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          stroke(ctx, x + dx * 5, y + dy * 5, x + dx * 11, y + dy * 11, cross, 1.4);
        }
        dot(ctx, x, y, 1.35, cross);
      }
      for (const c of s.cells) {
        if (!c.charge) continue;
        const tx = (c.x - view.x) * zoom + w / 2, ty = (c.padY - view.y) * zoom + h / 2;
        const sx = G.clamp(tx, 30, w - 30), sy = G.clamp(ty, 124, h - 128);
        if (sx === tx && sy === ty) continue;
        dot(ctx, sx, sy, 15, '#502f26');
        label(ctx, c.label, sx, sy, '#ffc097', 14);
      }
    }
    if (lastRadar > s.time || s.time - lastRadar > 0.12 || dt === 0) {
      minimap(s);
      lastRadar = s.time;
    }
  }

  paintFloor();
  resize();
  window.addEventListener('resize', resize);
  return { frame, world, snap };
})();
