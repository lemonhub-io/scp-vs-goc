import { audio } from './audio';
import * as core from './core';
import type { Point } from './core';
import * as data from './data';
import type { EnemyType } from './data';
import { fx as effects } from './fx';
import type { Operation } from './game';
import { map as siteMap } from './map';
import type { Anomaly, Enemy, Player, ProjectileOptions } from './simulation';

const enemyRanges: Partial<Record<EnemyType, number>> = { trooper: 270, breacher: 145, sapper: 220, marksman: 470, shield: 200, adept: 330, exo: 355, archon: 300 };

export class ThreatSystem {
  constructor(private readonly run: Operation) {}

  spawn(type: EnemyType, point: Point, options: Partial<Pick<Enemy, 'elite' | 'from' | 'grace' | 'angle'>> = {}): Enemy {
    const def = data.ENEMY[type];
    const max = (def?.hp || 55) * this.run.diff.hp * (this.run.def.hpMul || 1) * (options.elite ? 1.5 : 1);
    const e: Enemy = { ...point, type, hp: max, max, r: def?.r || 12, speed: def?.speed || 132,
      boss: !!def?.boss, wards: 0, angle: Math.PI / 2, cd: core.rand(0.4, 1.2), grace: 0.53,
      ward: 0, hit: 0, step: 0, lock: 0, lockAngle: 0, planting: 0, armed: 0, stomp: 0, swing: core.pick([-1, 1]), ...options };
    if (type !== 'drone' && type !== 'pylon') {
      const fixed = siteMap.collide(e.x, e.y, e.r);
      e.x = fixed.x; e.y = fixed.y;
    }
    if (type !== 'zombie' && type !== 'pylon') e.ai = this.run.tactics.makeEnemyMind(e);
    this.run.enemies.push(e);
    this.run.fx(e.x, e.y, { type: 'ring', radius: e.r * 2.3, color: e.boss ? '#ff9a4a' : '#5cc6ff', duration: 0.6 });
    if (e.boss) {
      audio.play('rise', e);
      this.run.shake = Math.max(this.run.shake, 0.6);
    } else if (type !== 'pylon' && type !== 'zombie' && core.chance(0.25)) audio.play('ding', { x: e.x, y: e.y, vol: 0.5 });
    return e;
  }

  steer(e: Enemy, angle: number, dt: number, speed = 1, flying = false): void {
    let dx = Math.cos(angle), dy = Math.sin(angle);
    for (const o of this.run.enemies) {
      if (o === e || o.dead) continue;
      const x = e.x - o.x, y = e.y - o.y, d = Math.hypot(x, y), gap = e.r + o.r + 5;
      if (d > 0.1 && d < gap) {
        const force = 0.75 * (1 - d / gap);
        dx += x / d * force;
        dy += y / d * force;
      }
    }
    const pace = e.speed * speed * (e.elite ? 1.12 : 1);
    siteMap.move(e, dx * pace * dt, dy * pace * dt, flying);
    e.step += dt * pace * 0.055;
  }

  volley(e: Enemy, angle: number, count: number, spread: number, speed: number, damage: number, sound: string, options?: ProjectileOptions): void {
    const r = e.r * 0.84;
    for (let i = 0; i < count; i++) {
      const a = angle + (count > 1 ? (i / (count - 1) - 0.5) * spread : core.rand(-spread, spread));
      this.run.combat.bullet(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, a, speed, damage * (e.elite ? 1.2 : 1), 'hostile', options);
    }
    e.flash = 0.085;
    e.kick = 1;
    if (!options || !options.homing) effects.muzzle(e.x + Math.cos(angle) * (e.r + 8), e.y + Math.sin(angle) * (e.r + 8), angle, '#ff9a6a', e.boss ? 1.2 : 0.75);
    audio.play(sound, e);
  }

  updateEnemy(e: Enemy, dt: number): void {
    e.hit = Math.max(0, e.hit - dt);
    e.kick = Math.max(0, (e.kick || 0) - dt * 8);
    e.ward = Math.max(0, e.ward - dt);
    e.flash = Math.max(0, (e.flash || 0) - dt);
    if ((e.grace -= dt) > 0 || e.type === 'pylon' || this.run.phase !== 'combat') return;
    const p = this.run.player;
    e.cd -= dt;
    const distance = core.dist(e.x, e.y, p.x, p.y);
    const range = enemyRanges[e.type] ?? 0;
    const sight = !!e.ai && this.run.tactics.enemySight(e, p, distance);
    if (e.ai) this.run.tactics.thinkEnemy(e, distance, sight, range);
    const ai = e.ai;
    const visible = sight && !!ai?.visible;
    const angle = visible ? Math.atan2(p.y - e.y, p.x - e.x) : e.angle;
    if (e.type === 'drone' && ai) {
      const goal = visible ? p : ai.goal;
      if (goal) e.angle = core.turnTo(e.angle, Math.atan2(goal.y - e.y, goal.x - e.x), dt * 9);
      if ((visible && distance < 70) || e.armed > 0) {
        if (!e.armed) audio.play('beep', e);
        e.armed = (e.armed || 0) + dt;
        this.steer(e, e.angle, dt, 0.45);
        if (e.armed > 0.42) {
          e.dead = true;
          this.run.combat.explode(e.x, e.y, 64, 26, 'hostile');
        }
      } else if (goal) this.steer(e, e.angle + Math.sin(this.run.time * 3 + e.swing) * 0.5, dt, 1, true);
      return;
    }
    if (e.type === 'zombie') {
      const target = this.run.enemies.filter(o => o !== e && !o.dead && o.type !== 'zombie' && o.type !== 'pylon')
        .reduce<Enemy | Player>((nearest, o) => core.dist2(e.x, e.y, o.x, o.y) < core.dist2(e.x, e.y, nearest.x, nearest.y) ? o : nearest, p);
      e.angle = siteMap.direction(e, target.x, target.y);
      e.step += dt * 4;
      if (core.dist(e.x, e.y, target.x, target.y) > e.r + target.r + 6 ||
        siteMap.trace(e.x, e.y, target.x, target.y) < 1) this.steer(e, e.angle, dt);
      else if (e.cd <= 0) {
        e.cd = 0.8;
        if (target === p) this.run.damage(20, e.x, e.y);
        else if ('type' in target) this.run.combat.strike(target, 33, e.x, e.y, true);
      }
      return;
    }
    if (!ai) return;
    if (ai.mode === 'evade') {
      if (e.lock > 0) { e.lock = 0; e.cd = 0.65; }
      e.planting = 0;
      this.moveEnemyTo(e, ai.goal, dt, angle, visible);
      return;
    }
    if (e.type === 'sapper' && this.sapper(e, dt)) return;
    if (e.type === 'archon' && !e.warded && e.wards < 2 && this.run.time >= (e.wardRetryAt || 0) &&
      e.hp / e.max < (e.wards ? 0.33 : 0.68)) this.castWard(e);
    const ready = visible && this.run.time >= ai.readyAt;
    if (e.type === 'exo' && this.exoSpecial(e, dt, distance, Math.atan2(p.y - e.y, p.x - e.x), ready)) return;

    if (e.lock > 0) {
      const tracking = e.lock > 0.23;
      if (tracking && !visible) {
        e.lock = 0;
        e.cd = 0.65;
        return;
      }
      if (tracking) e.lockAngle = this.run.tactics.enemyAim(e, p, 1860, distance);
      e.angle = core.turnTo(e.angle, e.lockAngle, dt * 7);
      e.lock -= dt;
      if (e.lock <= 0) {
        this.volley(e, e.lockAngle, 1, 0, 1860, 46, 'sniper', { len: 45, color: '#ff5973' });
        e.cd = 2.25;
        ai.nextThink = this.run.time;
      }
      return;
    }
    const goal = e.boss && visible ? (distance > range ? p : null) : ai.goal;
    this.moveEnemyTo(e, goal, dt, angle, visible);
    if (!ready || distance > range * 1.45 || e.cd > 0 || Math.abs(core.angDiff(e.angle, angle)) > 0.38 ||
      !this.run.tactics.enemySight(e, p, distance)) return;
    const direct = Math.atan2(p.y - e.y, p.x - e.x);

    switch (e.type) {
      case 'breacher':
        this.volley(e, this.run.tactics.enemyAim(e, p, 600, distance), 6, 0.56, 600, 8, 'eshotgun', { life: 0.62 });
        e.cd = 1.52;
        break;
      case 'marksman':
        e.lock = 0.86;
        e.lockAngle = this.run.tactics.enemyAim(e, p, 1860, distance);
        audio.play('beep', e);
        break;
      case 'adept':
        if (distance < 155 && this.blink(e, p, 160)) { e.cd = 0.7; break; }
        this.volley(e, direct, 1, 0.12, 223, 25, 'orb', { life: 3, homing: 1.35, color: '#8ae6ff' });
        e.cd = 1.7;
        break;
      case 'archon':
        if (distance < 155 && this.blink(e, p, 170)) { e.cd = 0.7; break; }
        e.casts = (e.casts || 0) + 1;
        if (e.casts % 4 === 0) {
          // radial nova with a rotating gap pattern
          const n = e.hp / e.max < 0.5 ? 22 : 16, off = core.rand(core.TAU);
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * core.TAU;
            this.run.combat.bullet(e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, a, 210, 18 * (e.elite ? 1.2 : 1), 'hostile', { life: 4, homing: 0.0001, color: '#8ae6ff' });
          }
          effects.light(e.x, e.y, 260, '#8ae6ff', 0.4, 1.2);
          this.run.fx(e.x, e.y, { type: 'ring', radius: 90, color: '#8ae6ff', duration: 0.5, bright: true });
          audio.play('wardon', e);
          e.cd = 1.4;
        } else {
          this.volley(e, direct, e.warded ? 3 : 5, e.warded ? 0.7 : 1.1, 275, 24, 'orb',
            { life: 3.15, homing: 0.82, color: '#8ae6ff' });
          e.cd = e.warded ? 1.44 : 1.03;
        }
        break;
      case 'exo':
        e.burst = (e.burst || 0) + 1;
        if (e.burst >= 9) {
          this.volley(e, direct, 3, 0.52, 435, 38, 'missile', { life: 1.75, homing: 0.8, blast: 64, color: '#ffc17d' });
          e.burst = 0;
          e.cd = 1.12;
        } else {
          this.volley(e, this.run.tactics.enemyAim(e, p, 890, distance), 1, 0.17, 890, 10, 'minigun');
          e.spin = (e.spin || 0) + 1.3;
          e.cd = 0.115;
        }
        break;
      default:
        e.burst = (e.burst || 0) + 1;
        this.volley(e, this.run.tactics.enemyAim(e, p, 670, distance), 1, 0.1, 670, e.type === 'shield' ? 13 : 11, 'enemy');
        if (e.burst < 3 && e.type === 'trooper') e.cd = 0.16;
        else { e.burst = 0; e.cd = core.rand(0.98, 1.45); }
    }
  }

  moveEnemyTo(e: Enemy, goal: Point | null | undefined, dt: number, aim: number, visible: boolean): void {
    const remaining = goal ? core.dist(e.x, e.y, goal.x, goal.y) : 0;
    const moving = goal && remaining > 12;
    const heading = moving ? siteMap.direction(e, goal.x, goal.y) : e.angle;
    const turnRate = data.ENEMY[e.type]?.frontGuard?.turnRate ?? (e.type === 'exo' ? 1.75 : 7);
    e.angle = core.turnTo(e.angle, visible ? aim : heading, dt * turnRate);
    if (!moving) return;
    const pace = e.ai?.mode === 'cover' || e.ai?.mode === 'evade' || !visible ? 1 : e.type === 'shield' ? 0.93 : 0.78;
    this.steer(e, heading, dt, pace);
  }

  sapper(e: Enemy, dt: number): boolean {
    if (e.target && (e.target.hp <= 0 || e.target.charge)) {
      e.target = null;
      e.planting = 0;
      if (e.ai) e.ai.nextThink = this.run.time;
    }
    if (!e.target) return false;
    const c = e.target, angle = siteMap.direction(e, c.x, c.padY);
    e.angle = core.turnTo(e.angle, angle, dt * 8);
    if (core.dist(e.x, e.y, c.x, c.padY) > 26 || siteMap.trace(e.x, e.y, c.x, c.padY) < 1) {
      e.planting = 0;
      this.steer(e, angle, dt);
      return true;
    }
    if (!e.planting) audio.play('alert', { x: e.x, y: e.y });
    e.planting = (e.planting || 0) + dt;
    if (e.planting >= 1.65) {
      c.charge = { x: c.x, y: c.padY, fuse: this.run.diff.fuse, max: this.run.diff.fuse, progress: 0, nextBeep: this.run.time + 0.5 };
      this.run.notify('alert_charge', { c: c.label }, 'danger');
      this.run.radio('c_site', 'com_charge', { c: c.label });
      audio.play('plant', e);
      e.type = 'trooper';
      e.speed = data.ENEMY.trooper.speed;
      e.target = null;
      e.planting = 0;
      e.cd = 0.45;
      if (e.ai) e.ai.nextThink = this.run.time;
    }
    return true;
  }

  blink(e: Enemy, p: Point, distance: number): boolean {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    for (const offset of [0, 0.8, -0.8, 1.55, -1.55]) {
      const x = e.x + Math.cos(a + offset) * distance, y = e.y + Math.sin(a + offset) * distance;
      if (!siteMap.open(x, y, e.r + 4)) continue;
      this.run.fx(e.x, e.y, { type: 'ring', radius: 58, color: '#8ae6ff', duration: 0.48, bright: true });
      effects.light(e.x, e.y, 140, '#8ae6ff', 0.3, 1);
      e.x = x;
      e.y = y;
      this.run.fx(x, y, { type: 'ring', radius: 58, color: '#8ae6ff', duration: 0.48, bright: true });
      audio.play('blink', e);
      return true;
    }
    return false;
  }

  castWard(e: Enemy): void {
    const positions: Point[] = [];
    for (const radius of [132, 200, 92]) {
      for (let i = 0; i < 8 && positions.length < 2; i++) {
        const angle = e.angle + i * Math.PI / 4;
        const x = e.x + Math.cos(angle) * radius, y = e.y + Math.sin(angle) * radius;
        if (!siteMap.open(x, y, 25) || siteMap.trace(e.x, e.y, x, y) !== 1 ||
          positions.some(p => core.dist(p.x, p.y, x, y) < 135)) continue;
        positions.push({ x, y });
      }
    }
    if (!positions.length) { e.wardRetryAt = this.run.time + 1; return; }
    e.wards++;
    for (const position of positions) this.spawn('pylon', position);
    e.warded = true;
    e.cd = 0.7;
    audio.play('wardon', e);
  }

  updateAnomaly(a: Anomaly, dt: number): void {
    const p = this.run.player;
    a.cd -= dt;
    if (a.dormant > 0) {
      a.dormant -= dt;
      if (a.dormant <= 0 && a.kind === 'scp106') {
        // resurface near the operative from a corrosion pool
        const spot = siteMap.randomFloorNear(p.x, p.y, 160, 260) || { x: a.x, y: a.y };
        a.x = spot.x; a.y = spot.y;
        effects.corrosion(a.x, a.y, 46);
        audio.play('growl', a);
      }
      return;
    }
    if (this.run.phase !== 'combat') return;
    const alive = p.hp > 0;
    const prey = this.run.enemies.filter(e => !e.dead && !e.boss && e.type !== 'pylon' && e.type !== 'zombie' && e.type !== 'drone')
      .reduce<Enemy | Player | null>((nearest, e) => !nearest || core.dist2(a.x, a.y, e.x, e.y) < core.dist2(a.x, a.y, nearest.x, nearest.y) ? e : nearest, alive ? p : null);
    if (!prey) return;
    const watched = alive && core.dist(a.x, a.y, p.x, p.y) < 620 &&
      Math.abs(core.angDiff(p.angle, Math.atan2(a.y - p.y, a.x - p.x))) < 0.55 && siteMap.trace(p.x, p.y, a.x, a.y) === 1;
    a.watched = watched;
    if (a.kind === 'scp173' && watched) { a.hop = 0; return; }
    const reach = core.dist(a.x, a.y, prey.x, prey.y) <= a.r + prey.r + 7 && siteMap.trace(a.x, a.y, prey.x, prey.y) === 1;
    if (!reach) {
      if (a.kind === 'scp173') {
        // moves in abrupt hops while nobody is looking
        a.hop -= dt;
        if (a.hop <= 0) {
          a.hop = 0.12;
          a.angle = siteMap.direction(a, prey.x, prey.y);
          siteMap.move(a, Math.cos(a.angle) * 46, Math.sin(a.angle) * 46);
          effects.dust(a.x, a.y, 1, '#8f8676');
          audio.play('scrape', { x: a.x, y: a.y, vol: 0.7 });
        }
        return;
      }
      a.angle = a.kind === 'scp106' ? Math.atan2(prey.y - a.y, prey.x - a.x) : siteMap.direction(a, prey.x, prey.y);
      const speed = { scp049: 99, scp106: 80 }[a.kind];
      siteMap.move(a, Math.cos(a.angle) * speed * dt, Math.sin(a.angle) * speed * dt, a.kind === 'scp106');
      a.step += dt * 5;
      if (a.kind === 'scp106' && Math.random() < dt * 3) effects.corrosion(a.x + core.rand(-8, 8), a.y + core.rand(-8, 8), core.rand(10, 20));
      return;
    }
    if (a.cd > 0) return;
    a.angle = Math.atan2(prey.y - a.y, prey.x - a.x);
    if (a.kind === 'scp106') {
      a.cd = 0.86;
      if (prey === p) this.run.damage(40, a.x, a.y);
      else if ('type' in prey) this.run.combat.strike(prey, 88, a.x, a.y, true);
      effects.corrosion(prey.x, prey.y, 26);
      audio.play('growl', a);
    } else {
      a.cd = a.kind === 'scp173' ? 1.6 : 1.1;
      if (prey === p) {
        this.run.damage(a.kind === 'scp173' ? 72 : 45, a.x, a.y);
        const k = Math.atan2(p.y - a.y, p.x - a.x);
        siteMap.move(p, Math.cos(k) * 30, Math.sin(k) * 30);
      } else if ('type' in prey) {
        this.run.combat.kill(prey, Math.atan2(prey.y - a.y, prey.x - a.x));
        if (a.kind === 'scp049') this.spawn('zombie', { x: prey.x, y: prey.y }, { from: a.cell.index, grace: 1.6 });
      }
      audio.play(a.kind === 'scp173' ? 'snap' : 'zombie', a);
    }
  }

  /* Atlas specials: ground-pound when crowded, saturation salvo on marked ground */
  exoSpecial(e: Enemy, dt: number, distance: number, angle: number, sight: boolean): boolean {
    const p = this.run.player;
    if (e.stomp > 0) {
      e.stomp -= dt;
      if (e.stomp <= 0) {
        this.run.fx(e.x, e.y, { type: 'ring', radius: 170, color: '#ffb070', duration: 0.5, bright: true });
        effects.dust(e.x, e.y, 16, '#6d7278');
        audio.play('servo', e);
        this.run.shake = Math.max(this.run.shake, 0.7);
        if (distance < 165 && siteMap.trace(e.x, e.y, p.x, p.y) === 1) {
          this.run.damage(32, e.x, e.y);
          siteMap.move(p, Math.cos(angle) * 60, Math.sin(angle) * 60);
        }
        e.special = 2.2;
      }
      return true;
    }
    e.special = (e.special ?? 4) - dt;
    if (e.special > 0 || !sight) return false;
    if (distance < 150) {
      e.stomp = 0.65;
      this.run.marks.push({ x: e.x, y: e.y, r: 165, life: 0.65, max: 0.65 });
      audio.play('spin', e);
      return true;
    }
    const n = e.hp / e.max < 0.5 ? 7 : 5;
    const predicted = {
      x: p.x + core.clamp((p.vx || 0) * 0.46, -112, 112),
      y: p.y + core.clamp((p.vy || 0) * 0.46, -112, 112),
    };
    const center = siteMap.open(predicted.x, predicted.y, p.r) &&
      siteMap.trace(p.x, p.y, predicted.x, predicted.y, p.r) === 1 ? predicted : p;
    for (let i = 0; i < n; i++) {
      const spot = i === 0 ? center : siteMap.randomFloorNear(center.x, center.y, 58, 152, true) || p;
      const delay = 1.0 + i * 0.12;
      const sx = e.x + Math.cos(e.angle - Math.PI / 2) * 30, sy = e.y + Math.sin(e.angle - Math.PI / 2) * 30;
      const d = core.dist(sx, sy, spot.x, spot.y);
      const a = Math.atan2(spot.y - sy, spot.x - sx);
      this.run.marks.push({ x: spot.x, y: spot.y, r: 62, life: delay, max: delay });
      this.run.combat.bullet(sx, sy, a, d / delay, 30, 'hostile', { life: delay, blast: 62, color: '#ffb070', len: 20, homing: 0.0001, lob: true });
    }
    audio.play('missile', e);
    e.podReady = false;
    e.special = e.hp / e.max < 0.5 ? 5 : 7;
    if (!e.drones && e.hp / e.max < 0.5) {
      e.drones = true;
      for (let i = 0; i < 4; i++) this.spawn('drone', { x: e.x + core.rand(-30, 30), y: e.y + core.rand(-30, 30) });
    }
    return false;
  }
}
