"use strict";
/* Generated browser script from src/combat.ts. Edit the TypeScript source. */
var G;
(function (G) {
    const combatMethods = {
        mark(shot) {
            if (shot && !shot.hit) {
                shot.hit = true;
                this.hits++;
            }
            if (shot)
                this.hitMarker = this.time + 0.14;
        },
        sparks(x, y, color, count = 6, speed = 160, angle, spread) {
            G.fx.sparks(x, y, color, count, speed * 1.6, angle, spread);
        },
        popup(x, y, text, color, big) {
            this.fx(x, y, { type: 'number', vy: -38, vx: G.rand(-12, 12), text, color, big, duration: big ? 0.9 : 0.6 });
        },
        strike(e, damage, x, y, piercing = false, knock = 0) {
            const angle = Math.atan2(e.y - y, e.x - x);
            if ('kind' in e) {
                if (e.kind !== 'scp106' || e.dormant)
                    return false;
                e.health -= damage;
                G.fx.blood(e.x, e.y, angle, 3, '#1a110c');
                if (e.health <= 0) {
                    e.dormant = 12;
                    e.health = 560;
                    G.fx.corrosion(e.x, e.y, 40);
                    this.fx(e.x, e.y, { type: 'ring', radius: 104, color: '#88677b', duration: 0.8 });
                    G.audio.play('growl', e);
                }
                return true;
            }
            if (e.dead)
                return false;
            const relative = Math.abs(G.angDiff(e.angle, Math.atan2(y - e.y, x - e.x)));
            const guard = G.ENEMY[e.type]?.frontGuard;
            const guarded = guard && !piercing && relative < guard.halfAngle;
            if (e.warded || guarded) {
                const hx = e.x + Math.cos(angle + Math.PI) * (e.r + 4), hy = e.y + Math.sin(angle + Math.PI) * (e.r + 4);
                G.fx.sparks(hx, hy, '#8ae6ff', 5, 240, angle + Math.PI, 0.9);
                G.audio.play('shield', e);
                if (e.warded)
                    return false;
            }
            let weak = false;
            if (e.type === 'exo' && relative > 2.28) {
                damage *= 2;
                weak = true;
            }
            // A shield and an adept's ward cannot multiply their damage reductions.
            if (guarded) {
                damage *= guard.damageTaken;
                knock *= guard.damageTaken;
            }
            else if (e.ward > 0 && !piercing)
                damage *= 0.55;
            e.hp -= damage;
            e.hit = 0.11;
            if (e.ai)
                e.ai.pressureUntil = this.time + 0.85;
            if (knock && !e.boss)
                G.map.move(e, Math.cos(angle) * knock * 0.045, Math.sin(angle) * knock * 0.045, e.type === 'drone');
            if (G.settings.dmgNums)
                this.popup(e.x + G.rand(-6, 6), e.y - e.r - 8, Math.round(damage), weak ? '#ffb070' : '#f2efe4', weak || damage >= 100);
            if (!guarded) {
                const metal = e.type === 'drone' || e.type === 'exo' || e.type === 'pylon';
                if (metal)
                    G.fx.sparks(e.x, e.y, e.type === 'pylon' ? '#8ae6ff' : '#ffd27a', 5, 260, angle, 0.9);
                else
                    G.fx.blood(e.x, e.y, angle, 4, e.type === 'zombie' ? '#3d4a1c' : e.type === 'adept' || e.type === 'archon' ? '#3a6fd8' : '#8e1f1c');
                G.audio.play('hit', e);
            }
            if (e.hp <= 0)
                this.kill(e, angle);
            return true;
        },
        kill(e, angle = e.angle + Math.PI) {
            if (e.dead)
                return;
            e.dead = true;
            const def = G.ENEMY[e.type];
            if (def && e.type !== 'pylon') {
                this.kills++;
                this.combo++;
                this.comboT = 3.2;
                this.best = Math.max(this.best, this.combo);
                this.credits += Math.round(def.reward * this.diff.reward * (e.elite ? 1.4 : 1));
                const pts = Math.round(def.score * this.diff.score * (e.elite ? 1.4 : 1) * this.mult);
                this.score += pts;
                this.fx(e.x, e.y - e.r - 20, { type: 'text', vy: -26, vx: 0, text: '+' + pts, color: this.mult > 1 ? '#ffb547' : '#c9d1d8', duration: 0.9 });
                if (!e.boss && G.chance(0.26))
                    this.drops.push({ x: e.x, y: e.y, kind: G.pick(['ammo', 'ammo', 'plate', 'med']), life: 20 });
                this.killMarker = this.time + 0.14;
                this.hitMarker = this.time + 0.14;
            }
            if (e.type === 'drone' || e.type === 'pylon') {
                G.fx.explosion(e.x, e.y, e.type === 'pylon' ? 40 : 30);
                G.audio.play('smallboom', e);
            }
            else if (e.type !== 'exo' && e.type !== 'archon') {
                const blood = e.type === 'zombie' ? 'rgba(40,52,22,0.55)' : e.type === 'adept' ? 'rgba(40,80,170,0.45)' : 'rgba(92,16,16,0.55)';
                G.fx.pool(e.x, e.y, e.r * 1.4, blood);
                G.fx.stamp(c => G.art.corpse(c, { ...e, angle: angle }));
                G.fx.blood(e.x, e.y, angle, 10, e.type === 'zombie' ? '#3d4a1c' : '#8e1f1c', 240);
            }
            if (e.elite)
                this.hitstop = Math.max(this.hitstop, 0.04);
            if (e.boss) {
                this.hitstop = 0.22;
                this.shake = 1;
                for (let i = 0; i < 6; i++)
                    G.fx.explosion(e.x + G.rand(-40, 40), e.y + G.rand(-40, 40), G.rand(40, 80));
                this.fx(e.x, e.y, { type: 'ring', radius: 260, color: '#ff9a4a', duration: 1, bright: true });
                this.radio('c_site', 'com_boss_down');
                G.audio.play('explosion', e);
                G.fx.scorch(e.x, e.y, 90);
            }
            else
                G.audio.play('kill', { ...e, vol: 0.5 });
            if (e.type === 'pylon') {
                const archon = this.enemies.find(other => other.type === 'archon' && !other.dead);
                if (archon && !this.enemies.some(other => other.type === 'pylon' && !other.dead))
                    archon.warded = false;
            }
        },
        targets() {
            return [...this.enemies.filter(e => !e.dead), ...this.anomalies.filter(a => a.kind === 'scp106' && !a.dormant)];
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
            this.enemyNoise = { x: p.x, y: p.y, at: this.time };
            p.flash = 0.075;
            p.kick = 1;
            this.shake = Math.max(this.shake, w.shake * 1.4);
            this.kickX -= Math.cos(p.angle) * w.recoil * 0.9;
            this.kickY -= Math.sin(p.angle) * w.recoil * 0.9;
            G.fx.muzzle(x, y, p.angle, w.type === 'tesla' ? '#9fe8ff' : w.type === 'rail' ? '#ffb36b' : '#ffd9a0', w.id === 'b12' || w.type === 'rail' ? 1.4 : w.id === 'p9' ? 0.8 : 1);
            if (!w.type)
                G.fx.casing(p.x + Math.cos(p.angle) * 8, p.y + Math.sin(p.angle) * 8, p.angle, w.id === 'b12');
            G.audio.play(w.sound);
            if (w.type === 'tesla') {
                const seen = this.targets().filter(e => G.dist(x, y, e.x, e.y) <= w.range &&
                    Math.abs(G.angDiff(p.angle, Math.atan2(e.y - y, e.x - x))) <= 0.46 &&
                    G.map.trace(x, y, e.x, e.y) === 1);
                seen.sort((a, b) => G.dist2(x, y, a.x, a.y) - G.dist2(x, y, b.x, b.y));
                const visited = new Set();
                let from = { x, y };
                let target = seen[0];
                for (let n = 0; n < w.chain && target; n++) {
                    this.fx(from.x, from.y, { type: 'arc', tx: target.x, ty: target.y, color: w.color, duration: 0.16 });
                    if (this.strike(target, damage * 0.8 ** n, from.x, from.y, true, w.knock))
                        this.mark(shot);
                    visited.add(target);
                    from = target;
                    target = this.targets().filter(e => !visited.has(e) && G.dist(from.x, from.y, e.x, e.y) < w.chainRange &&
                        G.map.trace(from.x, from.y, e.x, e.y) === 1).sort((a, b) => G.dist2(from.x, from.y, a.x, a.y) - G.dist2(from.x, from.y, b.x, b.y))[0];
                }
                if (!visited.size)
                    this.fx(x, y, { type: 'arc', tx: x + Math.cos(p.angle) * 34, ty: y + Math.sin(p.angle) * 34, color: w.color, duration: 0.13 });
            }
            else if (w.type === 'rail') {
                const tx = x + Math.cos(p.angle) * 1100, ty = y + Math.sin(p.angle) * 1100;
                const t = G.map.trace(x, y, tx, ty);
                const ex = G.lerp(x, tx, t), ey = G.lerp(y, ty, t);
                for (const e of this.targets()) {
                    if (G.segCircle(x, y, ex, ey, e.x, e.y, e.r) >= 0 && this.strike(e, damage, x, y, true, w.knock))
                        this.mark(shot);
                }
                this.fx(x, y, { type: 'beam', tx: ex, ty: ey, color: w.color, duration: 0.26 });
            }
            else {
                const spread = w.spread + (w.pellets > 1 ? 0 : p.bloom);
                p.bloom = Math.min(0.12, p.bloom + w.recoil * 0.006);
                for (let n = 0; n < w.pellets; n++) {
                    const a = p.angle + G.rand(-spread, spread);
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
                if (b.homing)
                    b.angle = G.turnTo(b.angle, Math.atan2(p.y - b.y, p.x - b.x), b.homing * dt);
                const tx = b.x + Math.cos(b.angle) * b.speed * dt, ty = b.y + Math.sin(b.angle) * b.speed * dt;
                const wall = b.lob ? 1 : G.map.trace(b.x, b.y, tx, ty);
                let limit = wall;
                let target = null;
                const targets = b.lob ? [] : b.team === 'hostile' ? (p.hp > 0 ? [p] : []) : this.targets();
                for (const e of targets) {
                    const t = G.segCircle(b.x, b.y, tx, ty, e.x, e.y, e.r + (b.homing ? 3 : 0));
                    if (t >= 0 && t < limit) {
                        limit = t;
                        target = e;
                    }
                }
                b.traveled += b.speed * dt * limit;
                const x = G.lerp(b.x, tx, limit), y = G.lerp(b.y, ty, limit);
                if (limit < 1 || b.life <= 0) {
                    if (b.blast)
                        this.explode(x, y, b.blast, b.damage, b.team);
                    else if (target === p)
                        this.damage(b.damage, b.x, b.y);
                    else if (target && ('type' in target || 'kind' in target)) {
                        const damage = b.damage * (b.falloff ? Math.max(0.25, 1 - b.traveled / b.falloff * 0.75) : 1);
                        if (this.strike(target, damage, b.x, b.y, false, b.knock)) {
                            this.mark(b.shot);
                            if (b.shot)
                                G.audio.play('hitmarker', { ui: true });
                        }
                    }
                    else if (wall < 1) {
                        const back = b.angle + Math.PI;
                        G.fx.sparks(x, y, b.homing ? b.color : '#ffd27a', b.homing ? 8 : 4, 200, back, 1.1);
                        G.fx.dust(x - Math.cos(b.angle) * 3, y - Math.sin(b.angle) * 3, 2);
                        G.fx.hole(x - Math.cos(b.angle) * 4, y - Math.sin(b.angle) * 4);
                        if (b.homing)
                            G.fx.light(x, y, 90, b.color, 0.2, 0.8);
                        G.audio.play('ricochet', { x, y, vol: 0.4 });
                    }
                }
                else {
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
                    if (d >= radius + e.r || G.map.trace(x, y, e.x, e.y) < 1)
                        continue;
                    this.strike(e, damage * (1 - 0.55 * Math.min(1, d / radius)), x, y, true, 235);
                }
            }
            const d = G.dist(x, y, p.x, p.y);
            if (d < radius && G.map.trace(x, y, p.x, p.y) === 1) {
                this.damage(damage * (1 - 0.55 * d / radius) * (team === 'hostile' ? 1 : 0.24), x, y);
            }
            this.shake = Math.max(this.shake, Math.min(1, 0.9 / (1 + d / 380)));
            this.fx(x, y, { type: 'ring', radius: radius * 1.1, color: '#ffb070', bright: true, duration: 0.45 });
            G.fx.explosion(x, y, radius * 0.55);
            G.audio.play(radius > 80 ? 'explosion' : 'smallboom', { x, y });
        },
        useItems(input) {
            const p = this.player, bag = this.inventory;
            if (input.heal && bag.scp500 && p.hp < this.healthLimit) {
                p.hp = this.healthLimit;
                p.warned = false;
                bag.scp500--;
                this.fx(p.x, p.y, { type: 'ring', radius: 75, color: '#7ee0a0', duration: 0.48, bright: true });
                G.fx.light(p.x, p.y, 200, '#7ee0a0', 0.6, 1);
                for (let i = 0; i < 14; i++)
                    G.fx.add({ t: 'ember', x: p.x + G.rand(-14, 14), y: p.y + G.rand(-14, 14), vx: G.rand(-30, 30), vy: G.rand(-50, -10), life: G.rand(0.5, 1), size: 1.6, drag: 1, color: '#7ee0a0' });
                G.audio.play('pill');
            }
            if (input.cola && bag.scp207 && !p.cola && p.hp > 8) {
                p.cola = 10;
                p.hp -= 8;
                bag.scp207--;
                this.fx(p.x, p.y, { type: 'ring', radius: 60, color: '#ff4a57', duration: 0.4, bright: true });
                G.audio.play('can');
            }
            for (const [pressed, type, duration, speed] of [[input.grenade, 'frag', 0.88, 520], [input.ball, 'scp018', 7.5, 430]]) {
                if (!pressed || !bag[type])
                    continue;
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
                    if (d.type === 'frag')
                        this.explode(d.x, d.y, 151, 240, 'player');
                    continue;
                }
                if (d.type === 'sentry') {
                    d.cd -= dt;
                    const e = this.targets().filter(e => G.dist(d.x, d.y, e.x, e.y) < 410 && G.map.trace(d.x, d.y, e.x, e.y) === 1)
                        .sort((a, b) => G.dist2(d.x, d.y, a.x, a.y) - G.dist2(d.x, d.y, b.x, b.y))[0];
                    if (!e)
                        continue;
                    const aim = Math.atan2(e.y - d.y, e.x - d.x);
                    d.angle = G.turnTo(d.angle, aim, dt * 8);
                    if (d.cd <= 0 && Math.abs(G.angDiff(d.angle, aim)) < 0.16) {
                        const mx = d.x + Math.cos(d.angle) * 18, my = d.y + Math.sin(d.angle) * 18;
                        this.bullet(mx, my, d.angle + G.rand(-0.04, 0.04), 1350, 23, 'sentry', { color: '#ffd27a' });
                        G.fx.muzzle(mx, my, d.angle, '#ffd27a', 0.7);
                        d.cd = 0.16;
                        G.audio.play('rifle', { x: d.x, y: d.y, vol: 0.32 });
                    }
                    continue;
                }
                d.age += dt;
                const x = d.x, y = d.y;
                G.map.move(d, d.vx * dt, d.vy * dt);
                let bounce = false;
                if (d.x === x && d.vx) {
                    d.vx *= -1;
                    bounce = true;
                }
                if (d.y === y && d.vy) {
                    d.vy *= -1;
                    bounce = true;
                }
                if (d.type === 'frag') {
                    d.vx *= 0.26 ** dt;
                    d.vy *= 0.26 ** dt;
                    if (bounce)
                        G.audio.play('bounce', d);
                    continue;
                }
                if (d.bounce > 1 && Math.random() < 0.5)
                    G.fx.add({ t: 'ember', x: d.x, y: d.y, vx: 0, vy: 0, life: 0.25, size: 2.2, color: '#ff3a3a' });
                if (bounce) {
                    G.fx.sparks(d.x, d.y, '#ff8a7a', 4, 200);
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
                if (d.age > 0.62 && G.segCircle(x, y, d.x, d.y, p.x, p.y, p.r + d.r) >= 0)
                    this.damage(33, d.x, d.y);
            }
            this.devices = this.devices.filter(d => d.life > 0);
        },
        updateDrops(dt) {
            const p = this.player;
            this.drops = this.drops.filter(d => {
                d.life -= dt;
                if (d.life <= 0)
                    return false;
                const dist = G.dist(d.x, d.y, p.x, p.y);
                if (dist < 120 && dist > 1) {
                    const pull = (1 - dist / 120) * 520 * dt;
                    d.x += (p.x - d.x) / dist * pull;
                    d.y += (p.y - d.y) / dist * pull;
                }
                if (dist > 26)
                    return true;
                if (d.kind === 'ammo') {
                    if (!p.arms.some((a, i) => a.owned && a.reserve < this.reserveLimit(i)))
                        return true;
                    this.resupply(0.12);
                }
                else if (d.kind === 'plate') {
                    if (p.armor >= this.armorLimit)
                        return true;
                    p.armor = Math.min(this.armorLimit, p.armor + 14);
                }
                else {
                    if (p.hp >= this.healthLimit)
                        return true;
                    p.hp = Math.min(this.healthLimit, p.hp + 12);
                }
                G.audio.play('pickup');
                return false;
            });
        },
    };
    Object.assign(G.Operation.prototype, combatMethods);
})(G || (G = {}));
