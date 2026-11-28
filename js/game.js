"use strict";
/* Generated browser script from src/game.ts. Edit the TypeScript source. */
var G;
(function (G) {
    class Operation {
        constructor(endless, difficulty) {
            this.endless = endless;
            this.enemies = [];
            this.anomalies = [];
            this.projectiles = [];
            this.devices = [];
            this.drops = [];
            this.effects = [];
            this.marks = [];
            this.notes = [];
            this.radioQueue = [];
            this.wave = 0;
            this.score = 0;
            this.credits = 200;
            this.time = 0;
            this.kills = 0;
            this.shots = 0;
            this.hits = 0;
            this.shake = 0;
            this.combo = 0;
            this.comboT = 0;
            this.best = 0;
            this.alarm = 0;
            this.kickX = 0;
            this.kickY = 0;
            this.hitstop = 0;
            this.ending = 0;
            this.result = null;
            this.phase = 'combat';
            this.clearIn = 0;
            this.waveTime = 0;
            this.enemyNoise = null;
            this.grenadeScanAt = 0;
            this.grenadeThreats = [];
            this.waveKills = 0;
            this.waveShots = 0;
            this.waveHits = 0;
            this.def = G.WAVES[0];
            this.queue = [];
            this.spawnIn = 0;
            this.interaction = null;
            this.beatT = 0;
            this.bonus = 0;
            this.restored = 0;
            this.killMarker = 0;
            this.hitMarker = 0;
            G.map.reset();
            G.fx.reset();
            this.diff = G.DIFFS[difficulty] || G.DIFFS[1];
            this.cells = G.map.cells.map(cell => ({ ...cell, hp: 100, charge: null }));
            this.lockers = G.map.lockers.map(locker => ({ ...locker, cd: 0 }));
            this.up = { dmg: 0, reload: 0, hp: 0, armor: 0, dash: 0, ammo: 0 };
            this.inventory = { frag: 3, scp500: 1, scp018: 0, scp207: 0, sentry: 0 };
            this.player = {
                ...G.map.start, r: 13, angle: -Math.PI / 2, hp: 100, armor: 50, weapon: 1, kick: 0, bloom: 0,
                arms: G.WEAPONS.map((w, i) => ({ owned: i < 2, mag: w.mag, reserve: w.reserve, cd: 0, reload: 0 })),
                dash: 0, dashTime: 0, dashAngle: 0, invulnerable: 0, cola: 0, step: 0, flash: 0, hit: 0,
            };
            this.nextWave();
        }
        get healthLimit() { return 100 + 20 * this.up.hp; }
        get armorLimit() { return 50 + 25 * this.up.armor; }
        get intact() { return this.cells.filter(c => c.hp > 0).length; }
        get accuracy() { return this.shots ? Math.round(this.hits / this.shots * 100) : 0; }
        get hostiles() { return this.queue.length + this.enemies.filter(e => !e.dead).length; }
        get mult() { return 1 + Math.min(3, Math.floor(this.combo / 5) * 0.5); }
        reserveLimit(i) { return Math.round(G.WEAPONS[i].reserve * (1 + this.up.ammo * 0.25)); }
        nextWave() {
            this.wave++;
            this.phase = 'combat';
            this.clearIn = 0;
            this.waveTime = 0;
            this.enemyNoise = null;
            this.marks.length = 0;
            this.waveKills = this.kills;
            this.waveShots = this.shots;
            this.waveHits = this.hits;
            this.player.invulnerable = 1;
            this.drops.length = 0;
            this.lockers.forEach(l => { l.cd = 0; });
            this.def = G.buildWave(this.wave, this.endless);
            this.queue = [];
            for (const [type, count] of Object.entries(this.def.units)) {
                for (let n = 0; n < Math.max(1, Math.round(count * this.diff.count)); n++)
                    this.queue.push(type);
            }
            for (let i = this.queue.length - 1; i > 0; i--) {
                const n = G.randi(0, i);
                [this.queue[i], this.queue[n]] = [this.queue[n], this.queue[i]];
            }
            if (this.def.boss)
                this.queue.splice(2, 0, this.def.boss);
            this.spawnIn = 2.6;
            this.banner = { title: this.wave === G.FINAL_WAVE && !this.endless ? 'wave_final' : 'wave_title',
                subtitle: 'wave_sub_' + (this.wave <= 10 ? this.wave : 'x'), vars: { n: this.wave }, until: this.time + 3.1 };
            this.radio('c_site', this.wave <= 10 ? 'com_' + this.wave + 'a' : 'wave_sub_x');
            const intercept = 'com_' + this.wave + 'b';
            if (G.STR.en[intercept])
                this.radio('c_goc', intercept, {}, 4.8);
            G.audio.play('horn', { ui: true });
            G.audio.setMusic(this.def.boss ? 3 : 2);
        }
        radio(from, key, vars = {}, delay = 0) {
            this.radioQueue.push({ from, key, vars, at: this.time + delay });
        }
        notify(key, vars = {}, tone = 'info') {
            this.notes.push({ key, vars, tone, until: this.time + 4 });
            if (this.notes.length > 3)
                this.notes.shift();
        }
        fx(x, y, options) {
            const duration = options.duration ?? 0.3;
            this.effects.push({ ...options, x, y, life: duration, duration });
        }
        sparks(x, y, color, count = 6, speed = 135) {
            for (let i = 0; i < count; i++) {
                const a = G.rand(G.TAU), v = G.rand(speed * 0.2, speed);
                this.fx(x, y, { type: 'spark', color, vx: Math.cos(a) * v, vy: Math.sin(a) * v, duration: G.rand(0.16, 0.52) });
            }
        }
        damage(amount, x, y) {
            const p = this.player;
            if (this.phase !== 'combat' || this.result || p.invulnerable > 0 || p.hp <= 0)
                return;
            amount *= this.diff.dmg;
            const absorbed = Math.min(p.armor, amount * 0.65);
            p.armor -= absorbed;
            const remaining = amount - absorbed;
            p.hp = Math.max(0, p.hp - remaining);
            p.invulnerable = 0.21;
            p.hit = 0.45;
            p.hurtAngle = Math.atan2(y - p.y, x - p.x);
            this.shake = Math.max(this.shake, Math.min(0.75, 0.3 + amount / 80));
            const away = p.hurtAngle + Math.PI;
            if (absorbed)
                G.fx.sparks(p.x, p.y, '#8ec8ff', 6, 220, away, 0.8);
            if (remaining > 0.5)
                G.fx.blood(p.x, p.y, away, Math.min(12, 3 + remaining / 4));
            G.audio.play('hurt');
            if (!p.hp) {
                G.fx.blood(p.x, p.y, away, 22, '#8e1f1c', 260);
                G.fx.pool(p.x, p.y, 22);
                this.finish('kia');
            }
            else if (p.hp < 30 && !p.warned) {
                p.warned = true;
                this.notify('alert_lowhp', {}, 'danger');
                this.radio('c_site', 'com_lowhp');
            }
        }
        finish(result) {
            if (this.result)
                return;
            this.result = result;
            this.ending = result === 'win' ? 1.6 : 2.1;
            this.banner = { title: 'end_' + result, subtitle: 'end_' + result + '_d', vars: {}, until: this.time + 9, end: true };
            G.audio.siren(false);
            G.audio.setMusic(0);
            G.audio.play(result === 'win' ? 'victory' : 'gameover', { ui: true });
        }
        clearWave() {
            this.projectiles.length = 0;
            this.devices = this.devices.filter(d => d.type !== 'frag');
            this.marks.length = 0;
            const bonus = Math.round((145 + this.wave * 29 + this.intact * 32) * this.diff.reward);
            this.credits += bonus;
            this.score += Math.round((350 + this.intact * 130) * this.diff.score);
            if (!this.endless && this.wave === G.FINAL_WAVE) {
                this.finish('win');
                return;
            }
            this.bonus = bonus;
            this.restored = Math.min(this.healthLimit - this.player.hp, 24);
            this.player.hp += this.restored;
            this.player.armor = Math.min(this.armorLimit, this.player.armor + 18);
            this.resupply(0.35);
            this.phase = 'armory';
            G.audio.siren(false);
            G.audio.setMusic(1);
            G.audio.play('ding', { ui: true });
        }
        resupply(fraction) {
            this.player.arms.forEach((slot, i) => {
                if (slot.owned && Number.isFinite(slot.reserve)) {
                    const limit = this.reserveLimit(i);
                    slot.reserve = Math.min(limit, slot.reserve + Math.ceil(limit * fraction));
                }
            });
        }
        price(entry) {
            if (entry.kind === 'upgrade')
                return entry.costs[this.up[entry.up]] ?? null;
            if (entry.kind === 'weapon' && this.player.arms[entry.wpn].owned)
                return null;
            if (entry.kind === 'item' && this.inventory[entry.item] >= entry.max)
                return null;
            if (entry.kind === 'repair' && this.cells[entry.cell].hp === 100)
                return null;
            if (entry.kind === 'heal' && this.player.hp === this.healthLimit)
                return null;
            if (entry.kind === 'armor' && this.player.armor === this.armorLimit)
                return null;
            if (entry.kind === 'ammo' && !this.player.arms.some((a, i) => a.owned && a.reserve < this.reserveLimit(i)))
                return null;
            return entry.cost;
        }
        buy(entry) {
            const cost = this.price(entry);
            if (this.phase !== 'armory' || cost === null || cost > this.credits)
                return false;
            this.credits -= cost;
            const p = this.player;
            switch (entry.kind) {
                case 'weapon':
                    p.arms[entry.wpn].owned = true;
                    p.arms[entry.wpn].reserve = this.reserveLimit(entry.wpn);
                    p.weapon = entry.wpn;
                    break;
                case 'item':
                    this.inventory[entry.item]++;
                    break;
                case 'heal':
                    p.hp = this.healthLimit;
                    break;
                case 'armor':
                    p.armor = this.armorLimit;
                    break;
                case 'ammo':
                    this.resupply(1);
                    break;
                case 'upgrade':
                    this.up[entry.up]++;
                    if (entry.up === 'hp')
                        p.hp += 20;
                    if (entry.up === 'armor')
                        p.armor += 25;
                    if (entry.up === 'ammo')
                        this.resupply(0.2);
                    break;
                case 'repair': {
                    const c = this.cells[entry.cell];
                    if (!c.hp) {
                        this.anomalies = this.anomalies.filter(a => a.cell.index !== c.index);
                        this.enemies = this.enemies.filter(e => e.type !== 'zombie' || e.from !== c.index);
                        G.map.setDoor(c.index, true);
                        this.notify('alert_recontain', { s: c.scp });
                    }
                    c.hp = Math.min(100, c.hp + 50);
                    break;
                }
            }
            G.audio.play('buy', { ui: true });
            return true;
        }
        update(dt, input) {
            if (this.hitstop > 0) {
                this.hitstop -= dt;
                return;
            }
            if (this.ending > 0) {
                this.ending -= dt;
                dt *= 0.35;
                if (this.ending <= 0) {
                    this.phase = 'finished';
                    return;
                }
            }
            this.time += dt;
            this.waveTime += dt;
            const p = this.player;
            const settle = Math.exp(-14 * dt);
            this.kickX *= settle;
            this.kickY *= settle;
            this.comboT -= dt;
            if (this.comboT <= 0)
                this.combo = 0;
            const danger = this.cells.some(c => c.charge) || this.anomalies.some(a => !(a.dormant > 0));
            this.alarm = G.approach(this.alarm, danger ? 1 : 0, dt * 0.8);
            G.fx.update(dt);
            for (const f of this.effects) {
                f.life -= dt;
                if ('vx' in f) {
                    f.x += f.vx * dt;
                    f.y += f.vy * dt;
                }
            }
            this.effects = this.effects.filter(f => f.life > 0);
            for (const m of this.marks)
                m.life -= dt;
            this.marks = this.marks.filter(m => m.life > 0);
            G.audio.listener.x = p.x;
            G.audio.listener.y = p.y;
            this.shake = Math.max(0, this.shake - dt * 0.85);
            const radio = this.radioQueue.findIndex(line => line.at <= this.time);
            if ((!this.message || this.message.until <= this.time) && radio !== -1) {
                this.message = { ...this.radioQueue.splice(radio, 1)[0], until: this.time + 4.5 };
                G.audio.play('radio', { ui: true });
            }
            this.notes = this.notes.filter(n => n.until > this.time);
            if (p.hp > 0 && p.hp < this.healthLimit * 0.3 && !this.result) {
                this.beatT = (this.beatT || 0) - dt;
                if (this.beatT <= 0) {
                    this.beatT = 0.95;
                    G.audio.play('heartbeat', { ui: true, vol: 0.8 });
                }
            }
            if (p.hp > 0)
                this.updatePlayer(dt, input);
            if (!this.result)
                this.updateInteract(dt, input);
            if (this.phase !== 'combat')
                return;
            this.spawnIn -= dt;
            if (!this.result && this.spawnIn <= 0 && this.queue.length && this.enemies.length < 32) {
                const type = this.queue.shift();
                this.spawn(type, G.pick(G.map.entries[G.pick(this.def.spawns)]), {
                    elite: !G.ENEMY[type].boss && G.chance(this.def.elite || 0),
                });
                this.spawnIn = Math.max(0.35, 1.04 - this.wave * 0.052);
            }
            this.updateEnemyIntelligence();
            for (const e of this.enemies)
                if (!e.dead)
                    this.updateEnemy(e, dt);
            for (const a of this.anomalies)
                this.updateAnomaly(a, dt);
            this.updateProjectiles(dt);
            this.updateDevices(dt);
            this.updateDrops(dt);
            this.enemies = this.enemies.filter(e => !e.dead);
            if (!this.result && !this.hostiles && !this.cells.some(c => c.charge)) {
                if (!this.clearIn) {
                    this.clearIn = 1.9;
                    if (this.endless || this.wave !== G.FINAL_WAVE) {
                        this.banner = { title: 'wave_clear', subtitle: 'wave_clear_sub', vars: {}, until: this.time + 1.8 };
                        this.radio('c_site', 'com_clear');
                    }
                    G.audio.setMusic(1);
                }
                else if ((this.clearIn -= dt) <= 0)
                    this.clearWave();
            }
            else
                this.clearIn = 0;
        }
        updatePlayer(dt, input) {
            const p = this.player;
            const x = p.x, y = p.y;
            p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
            for (const timer of ['dash', 'dashTime', 'invulnerable', 'cola', 'flash', 'hit'])
                p[timer] = Math.max(0, p[timer] - dt);
            p.kick = Math.max(0, p.kick - dt * 9);
            p.bloom = Math.max(0, p.bloom - dt * 0.35);
            for (const [i, arm] of p.arms.entries()) {
                if (!arm.owned)
                    continue;
                const w = G.WEAPONS[i];
                arm.cd = Math.max(0, arm.cd - dt);
                if (w.regen && !arm.cd)
                    arm.mag = Math.min(w.mag, arm.mag + w.regen * dt);
                if (arm.reload && (arm.reload -= dt) <= 0) {
                    const fill = Math.min(w.mag - arm.mag, arm.reserve);
                    arm.mag += fill;
                    arm.reserve -= fill;
                    arm.reload = 0;
                    if (i === p.weapon)
                        G.audio.play('reloadEnd');
                }
            }
            if (input.weapon >= 0 && p.arms[input.weapon]?.owned)
                p.weapon = input.weapon;
            if (input.weaponDelta) {
                const equipped = p.arms.flatMap((arm, i) => arm.owned ? [i] : []);
                p.weapon = equipped[(equipped.indexOf(p.weapon) + input.weaponDelta + equipped.length) % equipped.length];
            }
            const move = Math.hypot(input.mx, input.my), norm = Math.max(1, move);
            const w = G.WEAPONS[p.weapon], arm = p.arms[p.weapon];
            if (input.dash && !p.dash) {
                p.dash = 2.9 * (1 - 0.25 * this.up.dash);
                p.dashTime = 0.17;
                p.invulnerable = Math.max(p.invulnerable, 0.23);
                p.dashAngle = move > 0.05 ? Math.atan2(input.my, input.mx) : p.angle;
                G.fx.dust(p.x, p.y, 5);
                G.audio.play('dash');
            }
            const speed = 232 * (w.moveMul || 1) * (p.cola ? 1.38 : 1);
            if (p.dashTime) {
                this.fx(p.x, p.y, { type: 'afterimage', angle: p.angle, duration: 0.16 });
                G.map.move(p, Math.cos(p.dashAngle) * 665 * dt, Math.sin(p.dashAngle) * 665 * dt);
            }
            else {
                G.map.move(p, input.mx / norm * speed * dt, input.my / norm * speed * dt);
            }
            p.vx = dt > 0 ? (p.x - x) / dt : 0;
            p.vy = dt > 0 ? (p.y - y) / dt : 0;
            p.step += Math.min(1, move) * dt * 12;
            if (move > 0.2)
                p.bloom = Math.min(0.09, p.bloom + dt * 0.05);
            if (input.reload)
                this.reload(w, arm);
            if (input.fire && !arm.cd && !arm.reload && !p.dashTime) {
                if (arm.mag >= 1)
                    this.fire(w, arm);
                else
                    this.reload(w, arm);
            }
            this.useItems(input);
        }
        reload(w, arm) {
            if (arm.reload || w.regen || arm.mag === w.mag || !arm.reserve)
                return;
            arm.reload = w.reload * (1 - this.up.reload * 0.14);
            G.audio.play('reload');
        }
        updateInteract(dt, input) {
            const p = this.player;
            this.interaction = null;
            const near = (point, r) => G.dist2(p.x, p.y, point.x, point.y) < r * r && G.map.trace(p.x, p.y, point.x, point.y) === 1;
            for (const c of this.cells) {
                const charge = c.charge;
                if (!charge)
                    continue;
                if (near(charge, 68)) {
                    charge.progress = input.interact ? charge.progress + dt : Math.max(0, charge.progress - dt * 0.5);
                    this.interaction = { key: 'w_defuse', progress: charge.progress / 1.55 };
                    if (charge.progress >= 1.55) {
                        c.charge = null;
                        this.credits += 70;
                        this.score += Math.round(300 * this.diff.score);
                        this.notify('alert_defused');
                        G.audio.play('defuse', charge);
                        continue;
                    }
                }
                else
                    charge.progress = 0;
                charge.fuse -= dt;
                if (charge.fuse <= 0) {
                    c.charge = null;
                    this.explode(charge.x, charge.y, 94, 56, 'hostile');
                    c.hp = Math.max(0, c.hp - this.diff.charge);
                    if (c.hp)
                        this.notify('alert_cellhit', { c: c.label }, 'danger');
                    else
                        this.breach(c);
                }
                else if (this.time >= charge.nextBeep) {
                    G.audio.play('beep', charge);
                    charge.nextBeep = this.time + (charge.fuse < 4 ? 0.28 : 0.85);
                }
            }
            G.audio.siren(this.cells.some(c => c.charge));
            for (const locker of this.lockers) {
                locker.cd = Math.max(0, locker.cd - dt);
                if (this.interaction || !near(locker, 68))
                    continue;
                this.interaction = { key: locker.cd > 0 ? 'alert_ammo_cd' : 'w_ammo', progress: locker.cd ? 1 - locker.cd / 24 : 0 };
                if (!locker.cd && input.interactPressed) {
                    locker.cd = 24;
                    this.resupply(0.65);
                    this.player.armor = Math.min(this.armorLimit, this.player.armor + 10);
                    this.notify('alert_ammo');
                    G.audio.play('pickup', locker);
                }
            }
        }
        breach(cell) {
            this.notify('alert_breach', { s: cell.scp }, 'danger');
            this.radio('c_site', 'com_' + cell.scp);
            if (this.intact === 1)
                this.radio('c_o5', 'com_lost2');
            G.map.setDoor(cell.index, false);
            this.anomalies.push({ kind: cell.anomaly, cell, x: cell.x, y: cell.y, r: 15, angle: -Math.PI / 2,
                health: 560, dormant: 0, cd: 1.2, step: 0, hop: 0 });
            const dy = 34 * G.map.tile + 16;
            G.fx.debris(cell.x, dy, 26, '#3d4550', 420);
            G.fx.dust(cell.x, dy, 14, '#6d7278');
            G.fx.light(cell.x, dy, 320, '#ff7a3d', 0.8, 1.2);
            this.shake = Math.max(this.shake, 0.8);
            G.audio.play('clang', { x: cell.x, y: dy });
            this.fx(cell.x, dy, { type: 'ring', color: '#ff7a3d', radius: 170, duration: 1.1, bright: true });
            if (!this.intact)
                this.finish('lost');
        }
    }
    G.Operation = Operation;
})(G || (G = {}));
