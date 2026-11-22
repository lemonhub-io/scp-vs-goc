'use strict';

G.map = (() => {
  const tile = 42;
  const cols = 40, rows = 30;
  const width = cols * tile, height = rows * tile;
  const start = { x: 840, y: 815 };
  const entries = {
    N: [{ x: 756, y: 95 }, { x: 840, y: 95 }, { x: 924, y: 95 }],
    W: [{ x: 85, y: 511 }, { x: 85, y: 568 }, { x: 85, y: 625 }],
    E: [{ x: 1595, y: 511 }, { x: 1595, y: 568 }, { x: 1595, y: 625 }],
  };
  const cells = [10.5, 20, 29.5].map((x, i) => ({
    x: x * tile, y: 24 * tile, padY: 22.8 * tile, label: 'ABC'[i],
    scp: G.CELLS[i].scp, anomaly: G.CELLS[i].anomaly,
  }));
  const lockers = [{ x: 260, y: 780 }, { x: 1420, y: 780 }];
  const walls = [
    [0, 0, 40, 1], [0, 29, 40, 1], [0, 1, 1, 28], [39, 1, 1, 28],
    [3, 3, 12, 1], [25, 3, 12, 1], [3, 4, 1, 6], [36, 4, 1, 6],
    [7, 7, 6, 2], [27, 7, 6, 2], [17, 6, 1, 4], [22, 6, 1, 4],
    [5, 13, 5, 1], [30, 13, 5, 1], [13, 13, 2, 3], [25, 13, 2, 3],
    [18, 15, 4, 1], [4, 21, 3, 1], [33, 21, 3, 1],
    [8, 24, 5, 4], [18, 24, 4, 4], [27, 24, 5, 4],
  ].map(([x, y, w, h]) => ({ x: x * tile, y: y * tile, w: w * tile, h: h * tile }));
  const solid = Uint8Array.from({ length: cols * rows }, (_, i) => {
    const x = (i % cols + 0.5) * tile, y = (Math.floor(i / cols) + 0.5) * tile;
    return Number(walls.some(w => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h));
  });
  const index = (x, y) => Math.floor(y / tile) * cols + Math.floor(x / tile);
  const open = (x, y, r = 0) => {
    if (x < tile + r || y < tile + r || x >= width - tile - r || y >= height - tile - r) return false;
    for (const w of walls) {
      const dx = x - G.clamp(x, w.x, w.x + w.w);
      const dy = y - G.clamp(y, w.y, w.y + w.h);
      if (dx * dx + dy * dy <= r * r) return false;
    }
    return true;
  };

  function trace(x, y, tx, ty, padding = 0) {
    let hit = 1;
    const dx = tx - x, dy = ty - y;
    for (const w of walls) {
      const l = w.x - padding, r = w.x + w.w + padding;
      const t = w.y - padding, b = w.y + w.h + padding;
      if ((!dx && (x < l || x > r)) || (!dy && (y < t || y > b))) continue;
      const nearX = dx ? ((dx > 0 ? l : r) - x) / dx : -Infinity;
      const farX = dx ? ((dx > 0 ? r : l) - x) / dx : Infinity;
      const nearY = dy ? ((dy > 0 ? t : b) - y) / dy : -Infinity;
      const farY = dy ? ((dy > 0 ? b : t) - y) / dy : Infinity;
      const near = Math.max(0, nearX, nearY);
      if (near <= Math.min(farX, farY) && near < hit) hit = near;
    }
    return hit;
  }

  function move(unit, dx, dy, phase = false) {
    const r = unit.r;
    if (phase) {
      unit.x = G.clamp(unit.x + dx, tile + r, width - tile - r - 1);
      unit.y = G.clamp(unit.y + dy, tile + r, height - tile - r - 1);
      return;
    }
    if (open(unit.x + dx, unit.y, r)) unit.x += dx;
    if (open(unit.x, unit.y + dy, r)) unit.y += dy;
  }

  let routes = new Map();
  function direction(unit, x, y) {
    if (trace(unit.x, unit.y, x, y, unit.r + 1) === 1) return Math.atan2(y - unit.y, x - unit.x);
    const goal = index(x, y);
    const origin = index(unit.x, unit.y);
    if (goal === origin) return Math.atan2(y - unit.y, x - unit.x);
    const large = unit.r > 19;
    const key = goal * 2 + Number(large);
    let field = routes.get(key);
    if (!field) {
      if (routes.size > 38) routes = new Map();
      field = new Int16Array(solid.length).fill(-1);
      const queue = [goal];
      field[goal] = goal;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const here = queue[cursor];
        const col = here % cols;
        for (const next of [col > 0 ? here - 1 : -1, col < cols - 1 ? here + 1 : -1, here - cols, here + cols]) {
          if (next < 0 || next >= solid.length || solid[next] || field[next] !== -1) continue;
          if (large && !open((next % cols + 0.5) * tile, (Math.floor(next / cols) + 0.5) * tile, unit.r + 2)) continue;
          field[next] = here;
          queue.push(next);
        }
      }
      routes.set(key, field);
    }
    const next = field[origin];
    if (next < 0) return Math.atan2(y - unit.y, x - unit.x);
    const nx = (next % cols + 0.5) * tile, ny = (Math.floor(next / cols) + 0.5) * tile;
    if (trace(unit.x, unit.y, nx, ny, unit.r + 1) < 1) {
      return Math.atan2((Math.floor(origin / cols) + 0.5) * tile - unit.y, (origin % cols + 0.5) * tile - unit.x);
    }
    return Math.atan2(ny - unit.y, nx - unit.x);
  }

  return { width, height, tile, walls, start, entries, cells, lockers, open, trace, move, direction };
})();
