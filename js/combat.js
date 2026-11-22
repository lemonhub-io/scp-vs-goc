'use strict';

Object.assign(G.Operation.prototype, {
  mark(shot) {
    if (shot && !shot.hit) { shot.hit = true; this.hits++; }
    if (shot) this.hitMarker = this.time + 0.16;
  },

  strike(e, damage, x, y, piercing = false, knock = 0) {
    if (e.dead) return false;
    if (e.kind === 'scp106') {
      if (e.dormant) return false;
      e.health -= damage;
      if (e.health <= 0) {
        e.dormant = 12;
        e.health = 530;
        this.fx('ring', e.x, e.y, { radius: 104, color: '#88677b', duration: 0.8 });
        G.audio.play('growl', e);
      }
      return true;
    }
    const relative = Math.abs(G.angDiff(e.angle, Math.atan2(y - e.y, x - e.x)));
    if (e.warded || (e.type === 'shield' && !piercing && relative < 1.13)) {
      this.sparks(e.x, e.y, '#81ddff', 5);
      G.audio.play('shield', e);
      return false;
    }
    if (e.type === 'exo' && relative > 2.28) damage *= 2;
    if (e.ward > 0 && !piercing) damage *= 0.55;
    e.hp -= damage;
    e.hit = 0.13;
    const angle = Math.atan2(e.y - y, e.x - x);
    if (knock && !e.boss) G.map.move(e, Math.cos(angle) * knock * 0.045, Math.sin(angle) * knock * 0.045, e.type === 'drone');
    if (G.settings.dmgNums) this.fx('number', e.x, e.y - e.r - 5, { vy: -31, vx: 0, text: Math.round(damage), duration: 0.58 });
    this.sparks(e.x, e.y, '#fa8269', 4);
    G.audio.play('hit', e);
    if (e.hp <= 0) this.kill(e);
    return true;
  },

  kill(e) {
    if (e.dead) return;
    e.dead = true;
    const def = G.ENEMY[e.type];
    if (def && e.type !== 'pylon') {
      this.kills++;
      this.credits += Math.round(def.reward * this.diff.reward * (e.elite ? 1.4 : 1));
      this.score += Math.round(def.score * this.diff.score * (e.elite ? 1.4 : 1));
      if (!e.boss && G.chance(0.28)) this.drops.push({ x: e.x, y: e.y, kind: G.pick(['ammo', 'ammo', 'plate', 'med']), life: 22 });
    }
    if (e.type !== 'drone' && e.type !== 'pylon') {
      this.decals.push({ x: e.x, y: e.y, angle: e.angle, r: e.r });
      if (this.decals.length > 84) this.decals.shift();
    }
    this.sparks(e.x, e.y, e.type === 'pylon' ? '#ba8dff' : '#ee7860', e.boss ? 36 : 8, e.boss ? 400 : 160);
    if (e.boss) {
      this.fx('ring', e.x, e.y, { radius: 190, color: '#ff825e', duration: 0.8 });
      this.radio('c_site', 'com_boss_down');
      G.audio.play('explosion', e);
    } else G.audio.play('kill', { ...e, vol: 0.5 });
    if (e.type === 'pylon') {
      const archon = this.enemies.find(other => other.type === 'archon' && !other.dead);
      if (archon && !this.enemies.some(other => other.type === 'pylon' && !other.dead)) archon.warded = false;
    }
  },

  targets() {
    return this.enemies.filter(e => !e.dead).concat(this.anomalies.filter(a => a.kind === 'scp106' && !a.dormant));
  },

  fire(w, slot) {
    const p = this.player;
    const reach = G.map.trace(p.x, p.y, p.x + Math.cos(p.angle) * w.len, p.y + Math.sin(p.angle) * w.len);
    const x = p.x + Math.cos(p.angle) * w.len * reach * 0.98;
    const y = p.y + Math.sin(p.angle) * w.len * reach * 0.98;
    const damage = w.dmg * (1 + this.up.dmg * 0.12);
    const shot = { hit: false };
    slot.mag--;
    slot.cd = 1 / (w.rate * (p.cola ? 1.32 : 1));
    this.shots++;
    p.flash = 0.075;
    this.shake = Math.max(this.shake, w.shake);
    G.audio.play(w.sound);
    if (w.type === 'tesla') {
      const seen = this.targets().filter(e => G.dist(x, y, e.x, e.y) <= w.range &&
        Math.abs(G.angDiff(p.angle, Math.atan2(e.y - y, e.x - x))) <= 0.46 &&
        G.map.trace(x, y, e.x, e.y) === 1);
      seen.sort((a, b) => G.dist2(x, y, a.x, a.y) - G.dist2(x, y, b.x, b.y));
      const visited = new Set();
      let from = { x, y }, target = seen[0];
      for (let n = 0; n < w.chain && target; n++) {
        this.fx('arc', from.x, from.y, { tx: target.x, ty: target.y, color: w.color, duration: 0.16 });
        if (this.strike(target, damage * 0.8 ** n, from.x, from.y, true, w.knock)) this.mark(shot);
        visited.add(target);
        from = target;
        target = this.targets().filter(e => !visited.has(e) && G.dist(from.x, from.y, e.x, e.y) < w.chainRange &&
          G.map.trace(from.x, from.y, e.x, e.y) === 1).sort((a, b) => G.dist2(from.x, from.y, a.x, a.y) - G.dist2(from.x, from.y, b.x, b.y))[0];
      }
      if (!visited.size) this.fx('arc', x, y, { tx: x + Math.cos(p.angle) * 34, ty: y + Math.sin(p.angle) * 34, color: w.color, duration: 0.13 });
    } else if (w.type === 'rail') {
      const tx = x + Math.cos(p.angle) * 1100, ty = y + Math.sin(p.angle) * 1100;
      const t = G.map.trace(x, y, tx, ty);
      const ex = G.lerp(x, tx, t), ey = G.lerp(y, ty, t);
      for (const e of this.targets()) {
        if (G.segCircle(x, y, ex, ey, e.x, e.y, e.r) >= 0 && this.strike(e, damage, x, y, true, w.knock)) this.mark(shot);
      }
      this.fx('beam', x, y, { tx: ex, ty: ey, color: w.color, duration: 0.26 });
    } else {
      for (let n = 0; n < w.pellets; n++) {
        const a = p.angle + G.rand(-w.spread, w.spread);
        this.bullet(x, y, a, w.speed, damage, 'player', { shot, knock: w.knock, color: w.color, falloff: w.falloff, len: w.len });
      }
    }
  },

  bullet(x, y, angle, speed, damage, team, opts = {}) {
    this.projectiles.push({ x, y, angle, speed, damage, team, life: 1.55, traveled: 0,
      color: team === 'hostile' ? '#ff7958' : '#fff0b5', len: 17, ...opts });
  },

  updateProjectiles(dt) {
    const p = this.player;
    const live = [];
    for (const b of this.projectiles) {
      b.life -= dt;
      if (b.homing) b.angle = G.turnTo(b.angle, Math.atan2(p.y - b.y, p.x - b.x), b.homing * dt);
      const tx = b.x + Math.cos(b.angle) * b.speed * dt, ty = b.y + Math.sin(b.angle) * b.speed * dt;
      const wall = G.map.trace(b.x, b.y, tx, ty);
      let limit = wall, target = null;
      const targets = b.team === 'hostile' ? [p] : this.targets();
      for (const e of targets) {
        const t = G.segCircle(b.x, b.y, tx, ty, e.x, e.y, e.r + (b.homing ? 3 : 0));
        if (t >= 0 && t < limit) { limit = t; target = e; }
      }
      b.traveled += b.speed * dt * limit;
      const x = G.lerp(b.x, tx, limit), y = G.lerp(b.y, ty, limit);
      if (limit < 1 || b.life <= 0) {
        if (b.blast) this.explode(x, y, b.blast, b.damage, b.team);
        else if (target === p) this.damage(b.damage, b.x, b.y);
        else if (target) {
          const damage = b.damage * (b.falloff ? Math.max(0.25, 1 - b.traveled / b.falloff * 0.75) : 1);
          if (this.strike(target, damage, b.x, b.y, false, b.knock)) {
            this.mark(b.shot);
            if (b.shot) G.audio.play('hitmarker', { ui: true });
          }
        } else if (wall < 1) {
          this.sparks(x, y, b.color, 3);
          G.audio.play('ricochet', { x, y, vol: 0.4 });
        }
      } else {
        b.x = x;
        b.y = y;
        live.push(b);
      }
    }
    this.projectiles = live;
  },

  explode(x, y, radius, damage, team) {
    const p = this.player;
    if (team !== 'hostile') {
      for (const e of this.targets()) {
        const d = G.dist(x, y, e.x, e.y);
        if (d >= radius + e.r || G.map.trace(x, y, e.x, e.y) < 1) continue;
        this.strike(e, damage * (1 - 0.55 * Math.min(1, d / radius)), x, y, true, 235);
      }
    }
    const d = G.dist(x, y, p.x, p.y);
    if (d < radius && G.map.trace(x, y, p.x, p.y) === 1) {
      this.damage(damage * (1 - 0.55 * d / radius) * (team === 'hostile' ? 1 : 0.24), x, y);
    }
    this.shake = Math.max(this.shake, 0.5 / (1 + d / 450));
    this.fx('ring', x, y, { radius, color: '#ff9e62', bright: true, duration: 0.49 });
    this.sparks(x, y, '#ffb279', 22, radius * 2.3);
    G.audio.play('explosion', { x, y });
  },

  useItems(input) {
    const p = this.player, bag = this.inventory;
    if (input.heal && bag.scp500 && p.hp < this.healthLimit) {
      p.hp = this.healthLimit;
      p.warned = false;
      bag.scp500--;
      this.fx('ring', p.x, p.y, { radius: 75, color: '#92e0ae', duration: 0.48 });
      G.audio.play('pill');
    }
    if (input.cola && bag.scp207 && !p.cola && p.hp > 8) {
      p.cola = 10;
      p.hp -= 8;
      bag.scp207--;
      G.audio.play('can');
    }
    for (const [pressed, type, duration, speed] of [[input.grenade, 'frag', 0.88, 520], [input.ball, 'scp018', 7.5, 430]]) {
      if (!pressed || !bag[type]) continue;
      bag[type]--;
      this.devices.push({ type, x: p.x, y: p.y, vx: Math.cos(p.angle) * speed, vy: Math.sin(p.angle) * speed,
        life: duration, duration, bounce: 0, contacts: new Map(), age: 0, r: 5 });
      G.audio.play('throw');
    }
    if (input.sentry && bag.sentry) {
      bag.sentry--;
      this.devices.push({ type: 'sentry', x: p.x, y: p.y, angle: p.angle, life: 24, duration: 24, cd: 0 });
      G.audio.play('deploy');
    }
  },

  updateDevices(dt) {
    for (const d of this.devices) {
      d.life -= dt;
      if (d.life <= 0) {
        if (d.type === 'frag') this.explode(d.x, d.y, 151, 240, 'player');
        continue;
      }
      if (d.type === 'sentry') {
        d.cd -= dt;
        const e = this.targets().filter(e => G.dist(d.x, d.y, e.x, e.y) < 410 && G.map.trace(d.x, d.y, e.x, e.y) === 1)
          .sort((a, b) => G.dist2(d.x, d.y, a.x, a.y) - G.dist2(d.x, d.y, b.x, b.y))[0];
        if (!e) continue;
        const aim = Math.atan2(e.y - d.y, e.x - d.x);
        d.angle = G.turnTo(d.angle, aim, dt * 8);
        if (d.cd <= 0 && Math.abs(G.angDiff(d.angle, aim)) < 0.16) {
          this.bullet(d.x, d.y, d.angle, 1350, 23, 'sentry', { color: '#a5f5cd' });
          d.cd = 0.16;
          G.audio.play('rifle', { x: d.x, y: d.y, vol: 0.32 });
        }
        continue;
      }
      d.age += dt;
      const x = d.x, y = d.y;
      G.map.move(d, d.vx * dt, d.vy * dt);
      let bounce = false;
      if (d.x === x && d.vx) { d.vx *= -1; bounce = true; }
      if (d.y === y && d.vy) { d.vy *= -1; bounce = true; }
      if (d.type === 'frag') {
        d.vx *= 0.26 ** dt;
        d.vy *= 0.26 ** dt;
        if (bounce) G.audio.play('bounce', d);
        continue;
      }
      if (bounce) {
        d.bounce++;
        const mult = Math.min(1.21, 1050 / Math.hypot(d.vx, d.vy));
        d.vx *= mult;
        d.vy *= mult;
        G.audio.play('ball', { ...d, p: Math.min(1, d.bounce / 5) });
      }
      for (const e of this.targets()) {
        if ((d.contacts.get(e) || 0) <= this.time && G.segCircle(x, y, d.x, d.y, e.x, e.y, e.r + d.r) >= 0) {
          this.strike(e, 106 + Math.min(140, d.bounce * 30), x, y, true, 300);
          d.contacts.set(e, this.time + 0.38);
        }
      }
      const p = this.player;
      if (d.age > 0.62 && G.segCircle(x, y, d.x, d.y, p.x, p.y, p.r + d.r) >= 0) this.damage(33, d.x, d.y);
    }
    this.devices = this.devices.filter(d => d.life > 0);
  },

  updateDrops(dt) {
    const p = this.player;
    this.drops = this.drops.filter(d => {
      d.life -= dt;
      if (d.life <= 0) return false;
      if (G.dist2(d.x, d.y, p.x, p.y) > 26 ** 2) return true;
      if (d.kind === 'ammo') {
        if (!p.arms.some((a, i) => a.owned && a.reserve < this.reserveLimit(i))) return true;
        this.resupply(0.12);
      } else if (d.kind === 'plate') {
        if (p.armor >= this.armorLimit) return true;
        p.armor = Math.min(this.armorLimit, p.armor + 14);
      } else {
        if (p.hp >= this.healthLimit) return true;
        p.hp = Math.min(this.healthLimit, p.hp + 12);
      }
      G.audio.play('pickup');
      return false;
    });
  },
});
