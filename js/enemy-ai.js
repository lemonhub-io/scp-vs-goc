'use strict';

/* Coalition decisions use sightings, sound and recent reports. Movement and weapons update every frame. */
(() => {
  const M = G.map;
  const T = M.tile;
  const tactics = {
    safe: { think: 0.34, react: 0.34, memory: 3, lead: 0.28 },
    euclid: { think: 0.24, react: 0.21, memory: 4.4, lead: 0.62 },
    keter: { think: 0.17, react: 0.13, memory: 5.8, lead: 0.85 },
  };
  const patrol = [
    { x: 32 * T, y: 20 * T }, { x: 32 * T, y: 28 * T }, { x: 16 * T, y: 32.5 * T },
    { x: 8 * T, y: 23 * T }, { x: 11.5 * T, y: 15.5 * T }, { x: 32 * T, y: 6.5 * T },
    { x: 51 * T, y: 32.5 * T }, { x: 55 * T, y: 20 * T }, { x: 58 * T, y: 7 * T },
  ];
  const positionAngles = Array.from({ length: 12 }, (_, i) => ({
    x: Math.cos(i * G.TAU / 12), y: Math.sin(i * G.TAU / 12),
  }));

  function clear(a, b, padding = 0) {
    return M.trace(a.x, a.y, b.x, b.y, padding) === 1;
  }

  function canNotice(e, p, distance) {
    if (distance < 128 || e.ai.visible) return true;
    return Math.abs(G.angDiff(e.angle, Math.atan2(p.y - e.y, p.x - e.x))) < 1.95;
  }

  function scout(e) {
    const ai = e.ai;
    const contact = ai.contact;
    if (contact) {
      if (ai.searchContact !== contact) {
        ai.searchContact = contact;
        ai.searchStep = -1;
        ai.searchGoal = contact;
      }
      if (!ai.searchGoal || G.dist(e.x, e.y, ai.searchGoal.x, ai.searchGoal.y) < 24) {
        const bearing = contact.vx || contact.vy ? Math.atan2(contact.vy, contact.vx) : e.angle;
        ai.searchGoal = null;
        while (++ai.searchStep < 4) {
          const angle = bearing + e.swing * ai.searchStep * Math.PI / 2;
          const x = contact.x + Math.cos(angle) * 105, y = contact.y + Math.sin(angle) * 105;
          if (M.open(x, y, e.r + 1) && clear(contact, { x, y }, e.r)) {
            ai.searchGoal = { x, y };
            break;
          }
        }
      }
      if (ai.searchGoal) return ai.searchGoal;
    }
    if (G.dist(e.x, e.y, patrol[ai.patrol].x, patrol[ai.patrol].y) < 28) {
      ai.patrol = (ai.patrol + e.swing + patrol.length) % patrol.length;
    }
    return patrol[ai.patrol];
  }

  function nearbyAlly(run, e, score) {
    let best = null, bestScore = 0;
    for (const o of run.enemies) {
      if (o === e || o.dead || o.grace > 0 || !o.ai) continue;
      const d = G.dist(e.x, e.y, o.x, o.y);
      if (d > 350) continue;
      const value = score(o, d);
      if (value > bestScore) { best = o; bestScore = value; }
    }
    return best;
  }

  function dangerAt(run, e) {
    let closest = null, urgency = 0;
    for (const grenade of run.grenadeThreats || []) {
      if (grenade.device.life > 0.68 || grenade.device.life <= 0 ||
        G.dist2(e.x, e.y, grenade.device.x, grenade.device.y) > 410 ** 2 || !clear(e, grenade.device)) continue;
      const d = G.dist(e.x, e.y, grenade.x, grenade.y);
      const threat = (grenade.r + e.r + 30 - d) / (0.25 + grenade.device.life);
      if (threat > urgency && clear(e, grenade)) { urgency = threat; closest = grenade; }
    }
    return closest;
  }

  function anchorFor(run, e, contact) {
    const ai = e.ai;
    const ally = e.type === 'shield' ? nearbyAlly(run, e, (o, d) => o.type === 'sapper' && o.target ? 350 - d : 0)
      : e.type === 'adept' ? nearbyAlly(run, e, (o, d) => {
        if (o.type === 'drone' || o.type === 'adept' || o.ward > 0.9) return 0;
        return 215 - d + (o.type === 'sapper' || o.boss ? 95 : 0) + 100 * (1 - o.hp / o.max);
      }) : null;
    if (ally) {
      if (e.type === 'adept') return { x: ally.x, y: ally.y, r: 120 };
      const facing = contact || { x: ally.target.x, y: ally.target.padY };
      const angle = Math.atan2(facing.y - ally.y, facing.x - ally.x);
      const x = ally.x + Math.cos(angle) * 57, y = ally.y + Math.sin(angle) * 57;
      if (M.open(x, y, e.r + 1) && clear(ally, { x, y }, e.r)) return { x, y, r: 24 };
      return { x: ally.x, y: ally.y, r: 55 };
    }
    if (e.type === 'trooper' && !ai.flank) {
      const c = run.cells.find(cell => cell.charge && G.dist2(e.x, e.y, cell.x, cell.padY) < 250 ** 2);
      if (c) return { x: c.x, y: c.padY - 42, r: 85 };
    }
    return null;
  }

  function planPosition(run, e, target, range, anchor, danger, mode) {
    const ai = e.ai;
    const facing = target && Math.atan2(e.y - target.y, e.x - target.x);
    const flankAngle = target && ai.flankAngle;
    const others = run.enemies.filter(o => o !== e && !o.dead && o.ai &&
      G.dist2(e.x, e.y, o.x, o.y) < 420 ** 2);
    let best = null, high = -Infinity;
    function score(x, y, travel) {
      const point = { x, y };
      if (travel && (!M.open(x, y, e.r + 1) || !clear(e, point, e.r))) return;
      let value = -travel * 0.23;
      if (target && range) {
        const d = G.dist(x, y, target.x, target.y);
        const exposed = clear(point, target);
        value -= Math.abs(d - range) * (mode === 'cover' ? 0.2 : 0.65);
        value += mode === 'cover' ? (exposed ? -156 : 86) : (exposed ? 68 : -50);
        if (ai.flank && mode === 'fight') {
          const angle = Math.atan2(y - target.y, x - target.x);
          value += 95 * Math.cos(G.angDiff(angle, flankAngle ?? facing));
        }
      }
      if (anchor) value -= Math.abs(G.dist(x, y, anchor.x, anchor.y) - anchor.r) * 0.85;
      if (danger) {
        const d = G.dist(x, y, danger.x, danger.y);
        const escape = Math.min(travel, e.speed * danger.device.life) / (travel || 1);
        const arrival = { x: G.lerp(e.x, x, escape), y: G.lerp(e.y, y, escape) };
        const margin = G.dist(arrival.x, arrival.y, danger.x, danger.y) - danger.r - e.r;
        value += clear(arrival, danger) ? G.clamp(margin, -220, 24) * 3.3 : 145;
        value += Math.min(d - danger.r - e.r, 35) * 0.7;
      }
      for (const o of others) {
        const d = G.dist(x, y, o.x, o.y), gap = e.r + o.r + 15;
        if (d < gap) value -= (gap - d) * 2;
        const reserved = o.ai.goal;
        if (reserved && o.ai.mode === 'fight') {
          const separation = G.dist(x, y, reserved.x, reserved.y);
          if (separation < 48) value -= (48 - separation) * 0.65;
        }
      }
      if (ai.goal && ai.mode === mode && G.dist2(x, y, ai.goal.x, ai.goal.y) < 38 ** 2) value += 18;
      if (value > high) { high = value; best = point; }
    }
    score(e.x, e.y, 0);
    for (const radius of [42, 92, 158, 220]) {
      for (const dir of positionAngles) score(e.x + dir.x * radius, e.y + dir.y * radius, radius);
    }
    if (anchor && M.open(anchor.x, anchor.y, e.r + 1)) {
      score(anchor.x, anchor.y, G.dist(e.x, e.y, anchor.x, anchor.y));
    }
    return best;
  }

  Object.assign(G.Operation.prototype, {
    makeEnemyMind(e) {
      const flank = e.type === 'breacher' || (e.type === 'trooper' && G.chance(0.38));
      return { nextThink: this.time + G.rand(0, 0.17), flank, patrol: e.y < 13 * T ? 0 : 1 };
    },

    updateEnemyIntelligence() {
      if (this.time < (this.grenadeScanAt || 0)) return;
      this.grenadeScanAt = this.time + 0.11;
      this.grenadeThreats = [];
      for (const d of this.devices) {
        if (d.type !== 'frag' || d.life > 0.79 || d.life <= 0) continue;
        const predicted = { x: d.x, y: d.y, r: d.r };
        let vx = d.vx, vy = d.vy;
        for (let t = d.life; t > 0.00001; t -= 0.033) {
          const step = Math.min(t, 0.033), x = predicted.x, y = predicted.y;
          M.move(predicted, vx * step, vy * step);
          vx *= (predicted.x === x ? -1 : 1) * 0.26 ** step;
          vy *= (predicted.y === y ? -1 : 1) * 0.26 ** step;
        }
        this.grenadeThreats.push({ x: predicted.x, y: predicted.y, r: 151, device: d });
      }
    },

    thinkEnemy(e, distance, sight, range) {
      const ai = e.ai, now = this.time, tuning = tactics[this.diff.id];
      if (now < ai.nextThink) return;
      ai.nextThink = now + tuning.think * G.rand(0.8, 1.2);
      const p = this.player;
      const visible = sight && canNotice(e, p, distance);
      if (visible) {
        const reacquired = !ai.contact || now - (ai.lastSight ?? -Infinity) > 0.65;
        if (reacquired) {
          ai.readyAt = now + tuning.react * G.rand(0.85, 1.2);
          const other = nearbyAlly(this, e, (o, d) => o.ai.visible && !o.ai.flank ? 350 - d : 0);
          if (ai.flank) {
            const partner = nearbyAlly(this, e, (o, d) => o.ai.visible && o.ai.flank ? 350 - d : 0);
            ai.flankSide = partner ? -partner.ai.flankSide : e.swing;
            const front = other || e;
            ai.flankAngle = Math.atan2(front.y - p.y, front.x - p.x) + ai.flankSide * 1.08;
          }
        }
        ai.lastSight = now;
        ai.contact = ai.report = { x: p.x, y: p.y, vx: p.vx || 0, vy: p.vy || 0, at: now };
        if (p.flash > 0 && distance < 520 &&
          Math.abs(G.angDiff(p.angle, Math.atan2(e.y - p.y, e.x - p.x))) < 0.21) ai.pressureUntil = now + 0.65;
      } else {
        if (ai.contact && now - ai.contact.at > tuning.memory) ai.contact = null;
        const other = nearbyAlly(this, e, (o, d) => {
          const report = o.ai.report;
          if (!report || report.at <= (ai.contact?.at ?? -Infinity) || now - report.at > 1.35) return 0;
          return 100 * (1.35 - (now - report.at)) + (350 - d) / 10;
        });
        if (other?.ai.report && now - other.ai.report.at <= 1.35 &&
          other.ai.report.at > (ai.contact?.at ?? -Infinity)) ai.contact = other.ai.report;
        const shot = this.enemyNoise;
        if (p.hp > 0 && shot && now - shot.at < 1 && shot.at > (ai.contact?.at ?? -Infinity) &&
          G.dist2(e.x, e.y, shot.x, shot.y) < (clear(e, shot) ? 660 : 370) ** 2) ai.contact = shot;
      }
      ai.visible = visible;
      const danger = !e.boss && e.type !== 'drone' ? dangerAt(this, e) : null;
      if (e.type === 'sapper') this.chooseSapperCell(e);

      if (danger) {
        const escape = planPosition(this, e, null, 0, null, danger, 'evade');
        if (G.dist2(e.x, e.y, escape.x, escape.y) > 12 ** 2) {
          ai.goal = escape; ai.mode = 'evade';
          return;
        }
      }
      if (e.type === 'sapper' && e.target) {
        ai.goal = null; ai.mode = 'plant';
        return;
      }
      if (e.type === 'drone' || e.boss) {
        ai.goal = scout(e); ai.mode = 'search';
        return;
      }
      const anchor = anchorFor(this, e, ai.contact);
      if (e.type === 'adept') this.wardNearby(e);
      if (!visible && (!ai.contact || !ai.coverUntil || now >= ai.coverUntil)) {
        if (anchor) {
          ai.goal = clear(e, anchor, e.r) ? planPosition(this, e, null, 0, anchor, null, 'escort') : anchor;
          ai.mode = 'escort';
        } else {
          ai.goal = scout(e);
          ai.mode = 'search';
        }
        return;
      }

      const pressured = (ai.pressureUntil || 0) > now;
      if (e.type !== 'shield' && e.type !== 'breacher' && !(e.lock > 0) &&
        now >= (ai.coverReadyAt || 0) &&
        ((pressured && e.cd > 0.2) || (e.type === 'marksman' && e.cd > 1.4))) {
        ai.coverUntil = now + (e.type === 'marksman' ? 1.05 : 0.68);
        ai.coverReadyAt = now + 2.9;
      }
      const mode = now < (ai.coverUntil || 0) ? 'cover' : 'fight';
      const preferred = e.type === 'breacher' ? range * 0.73 : range * 0.86;
      ai.goal = planPosition(this, e, ai.contact, preferred, anchor, null, mode);
      ai.mode = mode;
      if (mode === 'fight' && visible && distance > range * 1.2 && G.dist2(e.x, e.y, ai.goal.x, ai.goal.y) < 12 ** 2) {
        ai.goal = ai.contact;
      }
    },

    chooseSapperCell(e) {
      const ai = e.ai;
      if (e.target && e.target.hp > 0 && !e.target.charge &&
        (e.planting > 0 || this.time < (ai.chooseAgainAt || 0))) return;
      let best = null, low = Infinity;
      for (const c of this.cells) {
        if (c.hp <= 0 || c.charge) continue;
        const cost = M.routeCost(e, c.x, c.padY);
        if (cost > M.width * M.height) continue;
        const contact = ai.contact;
        const guarded = contact && G.dist2(contact.x, contact.y, c.x, c.padY) < 265 ** 2 &&
          clear(contact, { x: c.x, y: c.padY });
        let score = cost + c.hp * 1.4 + (guarded ? 440 : 0) - (e.target === c ? 145 : 0);
        for (const o of this.enemies) if (o !== e && !o.dead && o.target === c) score += 620;
        if (score < low) { low = score; best = c; }
      }
      if (e.target !== best) e.planting = 0;
      e.target = best;
      ai.chooseAgainAt = this.time + G.rand(0.9, 1.25);
    },

    wardNearby(e) {
      const ai = e.ai;
      if ((ai.wardAt || 0) > this.time) return;
      const allies = this.enemies.filter(o => o !== e && !o.dead && o.ai &&
        o.type !== 'drone' && o.ward < 0.8 && G.dist2(e.x, e.y, o.x, o.y) < 175 ** 2 && clear(e, o));
      if (allies.length < 2 && !allies.some(o => (o.type === 'sapper' || o.boss) && (o.hp < o.max || ai.visible))) return;
      for (const o of allies) o.ward = 2.6;
      this.fx('ring', e.x, e.y, { radius: 175, color: '#8ae6ff', duration: 0.45, bright: true });
      G.audio.play('wardon', e);
      ai.wardAt = this.time + 4.8;
    },

    enemyAim(e, p, speed, distance) {
      const tuning = tactics[this.diff.id];
      const lead = Math.min(0.4, distance / speed) * tuning.lead;
      const x = p.x + G.clamp((p.vx || 0) * lead, -68, 68);
      const y = p.y + G.clamp((p.vy || 0) * lead, -68, 68);
      if (clear(p, { x, y }) && clear(e, { x, y })) return Math.atan2(y - e.y, x - e.x);
      return Math.atan2(p.y - e.y, p.x - e.x);
    },

    enemySight(e, p, distance) {
      return p.hp > 0 && distance <= 730 && !M.solidAt(e.x, e.y) && clear(e, p);
    },
  });
})();
