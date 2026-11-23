'use strict';
/* Static game data: weapons, hostiles, waves, shop */

G.DIFFS = [
  { id: 'safe', hp: 0.8, dmg: 0.6, count: 0.85, reward: 1.2, charge: 40, score: 0.75, fuse: 18 },
  { id: 'euclid', hp: 1, dmg: 1, count: 1, reward: 1, charge: 50, score: 1, fuse: 15 },
  { id: 'keter', hp: 1.3, dmg: 1.45, count: 1.2, reward: 0.9, charge: 60, score: 1.6, fuse: 13 },
];

G.WEAPONS = [
  { id: 'p9', dmg: 26, rate: 4.6, mag: 12, reserve: Infinity, reload: 1.0, spread: 0.028, pellets: 1, speed: 1500,
    knock: 70, recoil: 3, shake: 0.08, sound: 'pistol', cost: 0, color: '#ffd9a0', len: 14 },
  { id: 'k17', dmg: 18, rate: 10.5, mag: 30, reserve: 210, reload: 1.5, spread: 0.05, pellets: 1, speed: 1750,
    knock: 55, recoil: 2.2, shake: 0.07, sound: 'rifle', cost: 0, color: '#ffe0a8', len: 22 },
  { id: 'b12', dmg: 13, rate: 1.55, mag: 6, reserve: 42, reload: 2.0, spread: 0.26, pellets: 8, speed: 1350,
    knock: 260, recoil: 7, shake: 0.22, sound: 'shotgun', cost: 450, color: '#ffc58a', len: 20, falloff: 380 },
  { id: 'lmg', dmg: 21, rate: 13, mag: 90, reserve: 360, reload: 3.0, spread: 0.07, pellets: 1, speed: 1850,
    knock: 70, recoil: 2.6, shake: 0.09, sound: 'lmg', cost: 950, color: '#ffe6b0', len: 26, moveMul: 0.86 },
  { id: 'tesla', dmg: 36, rate: 6.5, mag: 40, reserve: Infinity, reload: 0, spread: 0, pellets: 1, speed: 0,
    knock: 40, recoil: 1.5, shake: 0.06, sound: 'tesla', cost: 1400, color: '#9fe8ff', len: 20,
    type: 'tesla', regen: 8, range: 470, chain: 3, chainRange: 190 },
  { id: 'lance', dmg: 190, rate: 1.15, mag: 5, reserve: 30, reload: 2.3, spread: 0, pellets: 1, speed: 0,
    knock: 320, recoil: 10, shake: 0.32, sound: 'rail', cost: 1250, color: '#ffb36b', len: 30, type: 'rail' },
];

G.ENEMY = {
  trooper: { hp: 72, speed: 92, r: 13, reward: 12, score: 100 },
  breacher: { hp: 120, speed: 126, r: 14, reward: 18, score: 150 },
  sapper: { hp: 66, speed: 112, r: 13, reward: 26, score: 220 },
  marksman: { hp: 62, speed: 80, r: 13, reward: 24, score: 200 },
  shield: { hp: 160, speed: 64, r: 15, reward: 30, score: 260 },
  adept: { hp: 96, speed: 86, r: 13, reward: 40, score: 320 },
  drone: { hp: 28, speed: 200, r: 10, reward: 8, score: 80 },
  exo: { hp: 3400, speed: 50, r: 34, reward: 450, score: 6000, boss: true },
  archon: { hp: 4400, speed: 70, r: 24, reward: 600, score: 9000, boss: true },
  pylon: { hp: 280, speed: 0, r: 16, reward: 20, score: 300 },
  zombie: { hp: 70, speed: 104, r: 13, reward: 4, score: 60 },
};

/* Scripted operation, waves 1 to 10 */
G.WAVES = [
  { units: { trooper: 7 }, spawns: ['N'] },
  { units: { trooper: 8, breacher: 3, sapper: 2 }, spawns: ['N'] },
  { units: { trooper: 8, breacher: 3, sapper: 3, marksman: 2 }, spawns: ['N', 'W'] },
  { units: { trooper: 8, breacher: 4, sapper: 3, marksman: 2, shield: 2, drone: 4 }, spawns: ['N', 'W'] },
  { units: { trooper: 6, drone: 5, sapper: 2 }, boss: 'exo', spawns: ['N', 'W'] },
  { units: { trooper: 8, breacher: 4, sapper: 4, marksman: 2, shield: 2, adept: 2 }, spawns: ['N', 'W', 'E'] },
  { units: { trooper: 10, breacher: 5, sapper: 5, marksman: 3, shield: 3, adept: 3, drone: 6 }, spawns: ['N', 'W', 'E'], elite: 0.15 },
  { units: { trooper: 6, breacher: 6, sapper: 7, drone: 16 }, spawns: ['N', 'W', 'E'], elite: 0.2 },
  { units: { trooper: 12, breacher: 6, sapper: 6, marksman: 4, shield: 4, adept: 4, drone: 8 }, spawns: ['N', 'W', 'E'], elite: 0.3 },
  { units: { trooper: 8, shield: 3, sapper: 4, adept: 4, drone: 6 }, boss: 'archon', spawns: ['N', 'W', 'E'], elite: 0.3 },
];
G.FINAL_WAVE = 10;

G.buildWave = function (n, endless) {
  let def;
  if (n <= G.WAVES.length) {
    def = JSON.parse(JSON.stringify(G.WAVES[n - 1]));
  } else {
    const k = n - G.WAVES.length;
    const budget = 40 + k * 6;
    const weights = { trooper: 5, breacher: 3, sapper: 3, marksman: 2, shield: 2, adept: 2, drone: 3 };
    const cost = { trooper: 1, breacher: 1.3, sapper: 1.4, marksman: 1.4, shield: 1.8, adept: 2, drone: 0.6 };
    const units = {};
    let spent = 0;
    const keys = Object.keys(weights);
    const total = keys.reduce((s, x) => s + weights[x], 0);
    while (spent < budget) {
      let r = Math.random() * total, t = keys[0];
      for (const x of keys) { r -= weights[x]; if (r <= 0) { t = x; break; } }
      units[t] = (units[t] || 0) + 1;
      spent += cost[t];
    }
    def = { units, spawns: ['N', 'W', 'E'], elite: Math.min(0.75, 0.3 + k * 0.04) };
    if (n % 5 === 0) def.boss = (n / 5) % 2 === 1 ? 'exo' : 'archon';
    def.hpMul = 1 + k * 0.07;
  }
  return def;
};

/* Shop catalogue. kind decides how it is applied in game.js */
G.SHOP = [
  { id: 'w_b12', cat: 'weapons', kind: 'weapon', wpn: 2, cost: 450 },
  { id: 'w_lmg', cat: 'weapons', kind: 'weapon', wpn: 3, cost: 950 },
  { id: 'w_lance', cat: 'weapons', kind: 'weapon', wpn: 5, cost: 1250 },
  { id: 'w_tesla', cat: 'weapons', kind: 'weapon', wpn: 4, cost: 1400 },
  { id: 's_ammo', cat: 'supply', kind: 'ammo', cost: 90 },
  { id: 's_med', cat: 'supply', kind: 'heal', cost: 110 },
  { id: 's_armor', cat: 'supply', kind: 'armor', cost: 140 },
  { id: 's_frag', cat: 'supply', kind: 'item', item: 'frag', max: 6, cost: 70 },
  { id: 's_sentry', cat: 'supply', kind: 'item', item: 'sentry', max: 2, cost: 420 },
  { id: 'a_500', cat: 'anomalous', kind: 'item', item: 'scp500', max: 3, cost: 260 },
  { id: 'a_018', cat: 'anomalous', kind: 'item', item: 'scp018', max: 2, cost: 300 },
  { id: 'a_207', cat: 'anomalous', kind: 'item', item: 'scp207', max: 3, cost: 180 },
  { id: 'u_dmg', cat: 'upgrades', kind: 'upgrade', up: 'dmg', costs: [300, 520, 800, 1150] },
  { id: 'u_reload', cat: 'upgrades', kind: 'upgrade', up: 'reload', costs: [240, 420, 680] },
  { id: 'u_hp', cat: 'upgrades', kind: 'upgrade', up: 'hp', costs: [280, 480, 760] },
  { id: 'u_armor', cat: 'upgrades', kind: 'upgrade', up: 'armor', costs: [240, 440, 700] },
  { id: 'u_dash', cat: 'upgrades', kind: 'upgrade', up: 'dash', costs: [200, 420] },
  { id: 'u_ammo', cat: 'upgrades', kind: 'upgrade', up: 'ammo', costs: [180, 380, 600] },
  { id: 'r_0', cat: 'site', kind: 'repair', cell: 0, cost: 200 },
  { id: 'r_1', cat: 'site', kind: 'repair', cell: 1, cost: 200 },
  { id: 'r_2', cat: 'site', kind: 'repair', cell: 2, cost: 200 },
];
G.SHOP_CATS = ['weapons', 'supply', 'anomalous', 'upgrades', 'site'];

G.CELLS = [
  { scp: '173', anomaly: 'scp173' },
  { scp: '049', anomaly: 'scp049' },
  { scp: '106', anomaly: 'scp106' },
];
