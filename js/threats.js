'use strict';

Object.assign(G.Operation.prototype, {
  spawn(type, point, options = {}) {
    const def = G.ENEMY[type];
    const max = (def?.hp || 55) * this.diff.hp * (this.def.hpMul || 1) * (options.elite ? 1.5 : 1);
    const e = { ...point, type, hp: max, max, r: def?.r || 12, speed: def?.speed || 132,
      boss: !!def?.boss, wards: 0, angle: Math.PI / 2, cd: G.rand(0.4, 1.2), grace: 0.53,
      ward: 0, hit: 0, step: 0, swing: G.pick([-1, 1]), ...options };
    if (type !== 'drone' && type !== 'pylon') {
      const fixed = G.map.collide(e.x, e.y, e.r);
      e.x = fixed.x; e.y = fixed.y;
    }
    this.enemies.push(e);
    this.fx('ring', e.x, e.y, { radius: e.r * 2.3, color: e.boss ? '#ff9a4a' : '#5cc6ff', duration: 0.6 });
    if (e.boss) {
      G.audio.play('rise', e);
      this.shake = Math.max(this.shake, 0.6);
    } else if (type !== 'pylon' && type !== 'zombie' && G.chance(0.25)) G.audio.play('ding', { x: e.x, y: e.y, vol: 0.5 });
    return e;
  },

  steer(e, angle, dt, speed = 1, flying = false) {
    let dx = Math.cos(angle), dy = Math.sin(angle);
    for (const o of this.enemies) {
      if (o === e || o.dead) continue;
      const x = e.x - o.x, y = e.y - o.y, d = Math.hypot(x, y), gap = e.r + o.r + 5;
      if (d > 0.1 && d < gap) {
        const force = 0.75 * (1 - d / gap);
        dx += x / d * force;
        dy += y / d * force;
      }
    }
    const pace = e.speed * speed * (e.elite ? 1.12 : 1);
    G.map.move(e, dx * pace * dt, dy * pace * dt, flying);
    e.step += dt * pace * 0.055;
  },

  volley(e, angle, count, spread, speed, damage, sound, options) {
    const r = e.r * 0.84;
    for (let i = 0; i < count; i++) {
      const a = angle + (count > 1 ? (i / (count - 1) - 0.5) * spread : G.rand(-spread, spread));
      this.bullet(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, a, speed, damage * (e.elite ? 1.2 : 1), 'hostile', options);
    }
    e.flash = 0.085;
    e.kick = 1;
    if (!options || !options.homing) G.fx.muzzle(e.x + Math.cos(angle) * (e.r + 8), e.y + Math.sin(angle) * (e.r + 8), angle, '#ff9a6a', e.boss ? 1.2 : 0.75);
    G.audio.play(sound, e);
  },

  updateEnemy(e, dt) {
    e.hit = Math.max(0, e.hit - dt);
    e.kick = Math.max(0, (e.kick || 0) - dt * 8);
    e.ward = Math.max(0, e.ward - dt);
    e.flash = Math.max(0, (e.flash || 0) - dt);
    if ((e.grace -= dt) > 0 || e.type === 'pylon' || this.phase !== 'combat') return;
    const p = this.player;
    const distance = G.dist(e.x, e.y, p.x, p.y), angle = Math.atan2(p.y - e.y, p.x - e.x);
    const sight = G.map.trace(e.x, e.y, p.x, p.y) === 1;
    e.cd -= dt;
    if (e.type === 'drone') {
      e.angle = G.turnTo(e.angle, angle, dt * 9);
      if (distance < 70 || e.armed > 0) {
        if (!e.armed) G.audio.play('beep', e);
        e.armed = (e.armed || 0) + dt;
        this.steer(e, e.angle, dt, 0.45, true);
        if (e.armed > 0.42) {
          e.dead = true;
          this.explode(e.x, e.y, 64, 26, 'hostile');
        }
      } else this.steer(e, e.angle + Math.sin(this.time * 3 + e.swing) * 0.5, dt, 1, true);
      return;
    }
    if (e.type === 'zombie') {
      const target = this.enemies.filter(o => o !== e && !o.dead && o.type !== 'zombie' && o.type !== 'pylon')
        .reduce((nearest, o) => G.dist2(e.x, e.y, o.x, o.y) < G.dist2(e.x, e.y, nearest.x, nearest.y) ? o : nearest, p);
      e.angle = G.map.direction(e, target.x, target.y);
      e.step += dt * 4;
      if (G.dist(e.x, e.y, target.x, target.y) > e.r + target.r + 6) this.steer(e, e.angle, dt);
      else if (e.cd <= 0) {
        e.cd = 0.8;
        if (target === p) this.damage(20, e.x, e.y);
        else this.strike(target, 33, e.x, e.y, true);
      }
      return;
    }
    if (e.type === 'sapper' && this.sapper(e, dt)) return;
    if (e.type === 'archon' && !e.warded && e.wards < 2 && e.hp / e.max < (e.wards ? 0.33 : 0.68)) this.castWard(e);
    if (e.type === 'exo' && this.exoSpecial(e, dt, distance, angle, sight)) return;
    const ranges = { trooper: 270, breacher: 145, sapper: 220, marksman: 470, shield: 200, adept: 330, exo: 355, archon: 300 };
    const range = ranges[e.type];
    e.angle = G.turnTo(e.angle, sight ? angle : G.map.direction(e, p.x, p.y), dt * (e.type === 'exo' ? 1.75 : 7));

    if (e.lock > 0) {
      e.lock -= dt;
      if (e.lock <= 0) {
        if (sight) this.volley(e, e.lockAngle, 1, 0, 1860, 46, 'sniper', { len: 45, color: '#ff5973' });
        e.cd = 2.25;
      } else if (e.lock > 0.23) e.lockAngle = angle;
      return;
    }
    if (!sight || distance > range * 1.05) this.steer(e, G.map.direction(e, p.x, p.y), dt);
    else if (distance < range * 0.57 && e.type !== 'shield' && e.type !== 'exo') this.steer(e, angle + Math.PI, dt, 0.55);
    else if (e.type !== 'exo' && e.type !== 'archon') this.steer(e, angle + e.swing * Math.PI / 2, dt, 0.34);
    if (!sight || distance > range * 1.45 || e.cd > 0 || Math.abs(G.angDiff(e.angle, angle)) > 0.38) return;

    switch (e.type) {
      case 'breacher':
        this.volley(e, angle, 6, 0.56, 600, 8, 'eshotgun', { life: 0.62 });
        e.cd = 1.52;
        break;
      case 'marksman':
        e.lock = 0.86;
        e.lockAngle = angle;
        G.audio.play('beep', e);
        break;
      case 'adept':
        if (distance < 155 && this.blink(e, p, 160)) { e.cd = 0.7; break; }
        this.volley(e, angle, 1, 0.12, 223, 25, 'orb', { life: 3, homing: 1.35, color: '#8ae6ff' });
        for (const o of this.enemies) if (o !== e && !o.dead && G.dist(e.x, e.y, o.x, o.y) < 175) o.ward = 2.6;
        e.cd = 1.7;
        break;
      case 'archon':
        if (distance < 155 && this.blink(e, p, 170)) { e.cd = 0.7; break; }
        e.casts = (e.casts || 0) + 1;
        if (e.casts % 4 === 0) {
          // radial nova with a rotating gap pattern
          const n = e.hp / e.max < 0.5 ? 22 : 16, off = G.rand(G.TAU);
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * G.TAU;
            this.bullet(e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, a, 210, 18 * (e.elite ? 1.2 : 1), 'hostile', { life: 4, homing: 0.0001, color: '#8ae6ff' });
          }
          G.fx.light(e.x, e.y, 260, '#8ae6ff', 0.4, 1.2);
          this.fx('ring', e.x, e.y, { radius: 90, color: '#8ae6ff', duration: 0.5, bright: true });
          G.audio.play('wardon', e);
          e.cd = 1.4;
        } else {
          this.volley(e, angle, e.warded ? 3 : 5, e.warded ? 0.7 : 1.1, 275, 24, 'orb',
            { life: 3.15, homing: 0.82, color: '#8ae6ff' });
          e.cd = e.warded ? 1.44 : 1.03;
        }
        break;
      case 'exo':
        e.burst = (e.burst || 0) + 1;
        if (e.burst >= 9) {
          this.volley(e, angle, 3, 0.52, 435, 38, 'missile', { life: 1.75, homing: 0.8, blast: 64, color: '#ffc17d' });
          e.burst = 0;
          e.cd = 1.12;
        } else {
          this.volley(e, angle, 1, 0.17, 890, 10, 'minigun');
          e.spin = (e.spin || 0) + 1.3;
          e.cd = 0.115;
        }
        break;
      default:
        e.burst = (e.burst || 0) + 1;
        this.volley(e, angle, 1, 0.1, 670, e.type === 'shield' ? 13 : 11, 'enemy');
        if (e.burst < 3 && e.type === 'trooper') e.cd = 0.16;
        else { e.burst = 0; e.cd = G.rand(0.98, 1.45); }
    }
  },

  sapper(e, dt) {
    const options = this.cells.filter(c => c.hp > 0 && !c.charge);
    if (!options.length) return false;
    if (!options.includes(e.target)) {
      e.planting = 0;
      e.target = options.reduce((best, c) => {
        const priority = a => G.dist2(e.x, e.y, a.x, a.padY) + this.enemies.filter(o => o !== e && o.target === a && !o.dead).length * 42000;
        return priority(c) < priority(best) ? c : best;
      });
    }
    const c = e.target, angle = G.map.direction(e, c.x, c.padY);
    e.angle = G.turnTo(e.angle, angle, dt * 8);
    if (G.dist(e.x, e.y, c.x, c.padY) > 26) {
      this.steer(e, angle, dt);
      return true;
    }
    if (!e.planting) G.audio.play('alert', { x: e.x, y: e.y });
    e.planting = (e.planting || 0) + dt;
    if (e.planting >= 1.65) {
      c.charge = { x: c.x, y: c.padY, fuse: this.diff.fuse, max: this.diff.fuse, progress: 0, nextBeep: this.time + 0.5 };
      this.notify('alert_charge', { c: c.label }, 'danger');
      this.radio('c_site', 'com_charge', { c: c.label });
      G.audio.play('plant', e);
      e.type = 'trooper';
      e.speed = G.ENEMY.trooper.speed;
      e.target = null;
      e.planting = 0;
      e.cd = 0.45;
    }
    return true;
  },

  blink(e, p, distance) {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    for (const offset of [0, 0.8, -0.8, 1.55, -1.55]) {
      const x = e.x + Math.cos(a + offset) * distance, y = e.y + Math.sin(a + offset) * distance;
      if (!G.map.open(x, y, e.r + 4)) continue;
      this.fx('ring', e.x, e.y, { radius: 58, color: '#8ae6ff', duration: 0.48, bright: true });
      G.fx.light(e.x, e.y, 140, '#8ae6ff', 0.3, 1);
      e.x = x;
      e.y = y;
      this.fx('ring', x, y, { radius: 58, color: '#8ae6ff', duration: 0.48, bright: true });
      G.audio.play('blink', e);
      return true;
    }
    return false;
  },

  castWard(e) {
    e.wards++;
    const positions = [];
    for (const radius of [132, 200, 92]) {
      for (let i = 0; i < 8 && positions.length < 2; i++) {
        const angle = e.angle + i * Math.PI / 4;
        const x = e.x + Math.cos(angle) * radius, y = e.y + Math.sin(angle) * radius;
        if (!G.map.open(x, y, 25) || G.map.trace(e.x, e.y, x, y) !== 1 ||
          positions.some(p => G.dist(p.x, p.y, x, y) < 135)) continue;
        positions.push({ x, y });
      }
    }
    for (const position of positions) this.spawn('pylon', position);
    e.warded = positions.length > 0;
    e.cd = 0.7;
    G.audio.play('wardon', e);
  },

  updateAnomaly(a, dt) {
    const p = this.player;
    a.cd -= dt;
    if (a.dormant > 0) {
      a.dormant -= dt;
      if (a.dormant <= 0 && a.kind === 'scp106') {
        // resurface near the operative from a corrosion pool
        const spot = G.map.randomFloorNear(p.x, p.y, 160, 260) || { x: a.x, y: a.y };
        a.x = spot.x; a.y = spot.y;
        G.fx.corrosion(a.x, a.y, 46);
        G.audio.play('growl', a);
      }
      return;
    }
    if (this.phase !== 'combat') return;
    const alive = p.hp > 0;
    const prey = this.enemies.filter(e => !e.dead && !e.boss && e.type !== 'pylon' && e.type !== 'zombie' && e.type !== 'drone')
      .reduce((nearest, e) => !nearest || G.dist2(a.x, a.y, e.x, e.y) < G.dist2(a.x, a.y, nearest.x, nearest.y) ? e : nearest, alive ? p : null);
    if (!prey) return;
    const watched = alive && G.dist(a.x, a.y, p.x, p.y) < 620 &&
      Math.abs(G.angDiff(p.angle, Math.atan2(a.y - p.y, a.x - p.x))) < 0.55 && G.map.trace(p.x, p.y, a.x, a.y) === 1;
    a.watched = watched;
    if (a.kind === 'scp173' && watched) { a.hop = 0; return; }
    const reach = G.dist(a.x, a.y, prey.x, prey.y) <= a.r + prey.r + 7 && G.map.trace(a.x, a.y, prey.x, prey.y) === 1;
    if (!reach) {
      if (a.kind === 'scp173') {
        // moves in abrupt hops while nobody is looking
        a.hop -= dt;
        if (a.hop <= 0) {
          a.hop = 0.12;
          a.angle = G.map.direction(a, prey.x, prey.y);
          G.map.move(a, Math.cos(a.angle) * 46, Math.sin(a.angle) * 46);
          G.fx.dust(a.x, a.y, 1, '#8f8676');
          G.audio.play('scrape', { x: a.x, y: a.y, vol: 0.7 });
        }
        return;
      }
      a.angle = a.kind === 'scp106' ? Math.atan2(prey.y - a.y, prey.x - a.x) : G.map.direction(a, prey.x, prey.y);
      const speed = { scp049: 99, scp106: 80 }[a.kind];
      G.map.move(a, Math.cos(a.angle) * speed * dt, Math.sin(a.angle) * speed * dt, a.kind === 'scp106');
      a.step += dt * 5;
      if (a.kind === 'scp106' && Math.random() < dt * 3) G.fx.corrosion(a.x + G.rand(-8, 8), a.y + G.rand(-8, 8), G.rand(10, 20));
      return;
    }
    if (a.cd > 0) return;
    a.angle = Math.atan2(prey.y - a.y, prey.x - a.x);
    if (a.kind === 'scp106') {
      a.cd = 0.86;
      if (prey === p) this.damage(40, a.x, a.y);
      else this.strike(prey, 88, a.x, a.y, true);
      G.fx.corrosion(prey.x, prey.y, 26);
      G.audio.play('growl', a);
    } else {
      a.cd = a.kind === 'scp173' ? 1.6 : 1.1;
      if (prey === p) {
        this.damage(a.kind === 'scp173' ? 72 : 45, a.x, a.y);
        const k = Math.atan2(p.y - a.y, p.x - a.x);
        G.map.move(p, Math.cos(k) * 30, Math.sin(k) * 30);
      } else {
        this.kill(prey, Math.atan2(prey.y - a.y, prey.x - a.x));
        if (a.kind === 'scp049') this.spawn('zombie', { x: prey.x, y: prey.y }, { from: a.cell.index, grace: 1.6 });
      }
      G.audio.play(a.kind === 'scp173' ? 'snap' : 'zombie', a);
    }
  },

  /* Atlas specials: ground-pound when crowded, saturation salvo on marked ground */
  exoSpecial(e, dt, distance, angle, sight) {
    const p = this.player;
    if (e.stomp > 0) {
      e.stomp -= dt;
      if (e.stomp <= 0) {
        this.fx('ring', e.x, e.y, { radius: 170, color: '#ffb070', duration: 0.5, bright: true });
        G.fx.dust(e.x, e.y, 16, '#6d7278');
        G.audio.play('servo', e);
        this.shake = Math.max(this.shake, 0.7);
        if (distance < 165) {
          this.damage(32, e.x, e.y);
          G.map.move(p, Math.cos(angle) * 60, Math.sin(angle) * 60);
        }
        e.special = 2.2;
      }
      return true;
    }
    e.special = (e.special ?? 4) - dt;
    if (e.special > 0 || !sight) return false;
    if (distance < 150) {
      e.stomp = 0.65;
      this.marks.push({ x: e.x, y: e.y, r: 165, life: 0.65, max: 0.65 });
      G.audio.play('spin', e);
      return true;
    }
    const n = e.hp / e.max < 0.5 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const spot = i === 0 ? { x: p.x, y: p.y } : { x: p.x + G.rand(-150, 150), y: p.y + G.rand(-150, 150) };
      const delay = 1.0 + i * 0.12;
      const sx = e.x + Math.cos(e.angle - Math.PI / 2) * 30, sy = e.y + Math.sin(e.angle - Math.PI / 2) * 30;
      const d = G.dist(sx, sy, spot.x, spot.y);
      const a = Math.atan2(spot.y - sy, spot.x - sx);
      this.marks.push({ x: spot.x, y: spot.y, r: 62, life: delay, max: delay });
      this.bullet(sx, sy, a, d / delay, 30, 'hostile', { life: delay, blast: 62, color: '#ffb070', len: 20, homing: 0.0001, lob: true });
    }
    G.audio.play('missile', e);
    e.podReady = false;
    e.special = e.hp / e.max < 0.5 ? 5 : 7;
    if (!e.drones && e.hp / e.max < 0.5) {
      e.drones = true;
      for (let i = 0; i < 4; i++) this.spawn('drone', { x: e.x + G.rand(-30, 30), y: e.y + G.rand(-30, 30) });
    }
    return false;
  },
});
