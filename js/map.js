'use strict';
/* Site-109 layout, collision, ray casting, flow fields and static prerender */
G.map = (function () {
  const T = (G.TILE = 32);
  const W = 64, H = 46;
  const M = { W, H, T, pw: W * T, ph: H * T };
  const tiles = new Uint8Array(W * H).fill(1); // 0 floor 1 wall 2 prop 3 door
  const ftype = new Uint8Array(W * H);
  M.tiles = tiles; M.ftype = ftype;
  M.props = [];
  M.labels = [];

  const idx = (x, y) => y * W + x;
  function carve(x, y, w, h, ft) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { tiles[idx(i, j)] = 0; ftype[idx(i, j)] = ft; }
  }
  function wall(x, y, w, h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) tiles[idx(i, j)] = 1;
  }
  function prop(x, y, w, h, type) {
    M.props.push({ x, y, w, h, type });
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) tiles[idx(i, j)] = 2;
  }

  // floor types: 0 concrete 1 grate 2 lobby 3 lab 4 cell 5 corroded
  carve(22, 2, 20, 9, 2);      // surface lobby
  carve(29, 1, 6, 1, 2);       // elevator alcove
  carve(29, 11, 6, 3, 1);      // north corridor
  carve(18, 14, 28, 12, 0);    // atrium
  wall(22, 17, 2, 2); wall(40, 17, 2, 2); wall(22, 21, 2, 2); wall(40, 21, 2, 2);
  carve(13, 18, 5, 4, 1);      // west corridor
  carve(3, 14, 10, 14, 0);     // west hub armory
  carve(5, 2, 4, 12, 1);       // maintenance shaft
  carve(46, 18, 5, 4, 1);      // east corridor
  carve(51, 12, 10, 16, 3);    // research labs
  carve(55, 4, 6, 8, 0);       // freight bay
  carve(29, 26, 6, 4, 1);      // south corridor
  carve(6, 30, 52, 4, 1);      // containment corridor
  carve(6, 28, 4, 2, 1);       // west link
  carve(53, 28, 4, 2, 1);      // east link
  carve(10, 35, 10, 9, 4);     // cell A
  carve(27, 35, 10, 9, 4);     // cell B
  carve(44, 35, 10, 9, 5);     // cell C

  // props: 1 crate 2 barrier 3 desk 4 rack 5 locker 6 bench
  prop(24, 6, 2, 1, 2); prop(38, 6, 2, 1, 2);
  prop(30, 8, 4, 1, 3);
  prop(30, 23, 4, 1, 3);
  prop(26, 15, 1, 1, 1); prop(37, 15, 1, 1, 1); prop(19, 24, 1, 1, 1); prop(44, 24, 1, 1, 1);
  prop(8, 19, 2, 1, 1); prop(8, 20, 1, 1, 1); prop(5, 24, 2, 1, 1); prop(11, 25, 1, 1, 1);
  prop(3, 16, 1, 2, 5);
  prop(53, 14, 1, 4, 4); prop(57, 14, 1, 4, 4); prop(53, 21, 1, 4, 4); prop(57, 21, 1, 4, 4);
  prop(59, 26, 2, 1, 6);
  prop(55, 8, 2, 1, 1); prop(60, 10, 1, 1, 1);
  prop(20, 31, 2, 1, 2); prop(43, 31, 2, 1, 2);
  prop(7, 8, 1, 1, 1);
  prop(29, 37, 2, 1, 3);

  prop(60, 19, 1, 2, 5);

  /* x and padY mark the charge point outside the blast door, y is the cell interior */
  M.cells = [[14, 15, 15], [31, 32, 32], [48, 49, 49]].map(([d0, d1, cx], i) => ({
    index: i, door: [d0, d1], x: cx * T, padY: 33.5 * T, y: 39.5 * T,
    rect: [cx - 5, 35, 10, 9], label: 'ABC'[i], scp: G.CELLS[i].scp, anomaly: G.CELLS[i].anomaly,
  }));
  M.doorOpen = [false, false, false];
  M.setDoor = function (i, closed) {
    const c = M.cells[i];
    for (const x of c.door) tiles[idx(x, 34)] = closed ? 3 : 0;
    M.doorOpen[i] = !closed;
    M.dirty = true;
  };
  M.reset = function () { for (let i = 0; i < 3; i++) M.setDoor(i, true); };
  M.reset();

  M.entries = {
    N: [{ x: 30.5 * T, y: 3 * T }, { x: 32 * T, y: 3.4 * T }, { x: 33.5 * T, y: 3 * T }],
    W: [{ x: 5.8 * T, y: 3.2 * T }, { x: 7 * T, y: 3.6 * T }, { x: 8.2 * T, y: 3.2 * T }],
    E: [{ x: 56.5 * T, y: 5.2 * T }, { x: 58 * T, y: 5.6 * T }, { x: 59.5 * T, y: 5.2 * T }],
  };
  M.start = { x: 32 * T, y: 22 * T };
  M.lockers = [{ x: 4.65 * T, y: 17 * T }, { x: 59.35 * T, y: 20 * T }];

  M.lamps = [
    [27, 5, 270, '#ffe2bf', 0.9], [37, 5, 270, '#ffe2bf', 0.9], [32, 3, 200, '#ffd7a8', 0.7],
    [32, 12.5, 190, '#e6eeff', 0.8],
    [25, 16, 260, '#dfe9ff', 0.85], [39, 16, 260, '#dfe9ff', 0.85], [25, 23.5, 260, '#dfe9ff', 0.85], [39, 23.5, 260, '#dfe9ff', 0.85],
    [32, 20, 230, '#cfe0ff', 0.6],
    [15, 20, 170, '#ffe6c4', 0.7],
    [7.5, 17, 240, '#ffd9a6', 0.85], [8, 25, 220, '#ffd9a6', 0.75, 1],
    [7, 5, 190, '#ff9a55', 0.65, 1], [7, 11, 170, '#ff9a55', 0.55],
    [48.5, 20, 170, '#e0ecff', 0.7],
    [55.5, 15, 260, '#bfe4ff', 0.85], [55.5, 23, 260, '#bfe4ff', 0.85],
    [58, 7, 240, '#ffc070', 0.8, 1],
    [32, 27.5, 150, '#ffb070', 0.6],
    [10, 32, 200, '#ff9d5c', 0.6], [19, 32, 200, '#ff9d5c', 0.6], [27, 32, 200, '#ff9d5c', 0.6], [37, 32, 200, '#ff9d5c', 0.6],
    [45, 32, 200, '#ff9d5c', 0.6], [54, 32, 200, '#ff9d5c', 0.6],
    [15, 39.5, 200, '#e8e2d0', 0.7], [32, 39.5, 200, '#c8f0d0', 0.6], [49, 39.5, 200, '#c09070', 0.5, 1],
  ].map((l) => ({ x: l[0] * T, y: l[1] * T, r: l[2], color: l[3], i: l[4], flicker: !!l[5], poly: null }));
  M.beacons = [
    { x: 6.5 * T, y: 30.5 * T }, { x: 57.5 * T, y: 30.5 * T }, { x: 32 * T, y: 26.5 * T },
    { x: 18.5 * T, y: 14.5 * T }, { x: 45.5 * T, y: 14.5 * T },
  ];

  /* queries */
  M.tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H ? 1 : tiles[idx(tx, ty)]);
  M.solid = (tx, ty) => M.tileAt(tx, ty) !== 0;
  M.opaque = (tx, ty) => { const t = M.tileAt(tx, ty); return t === 1 || t === 3; };
  M.solidAt = (x, y) => M.solid(Math.floor(x / T), Math.floor(y / T));
  M.opaqueAt = (x, y) => M.opaque(Math.floor(x / T), Math.floor(y / T));

  /* Push a circle out of solid tiles */
  M.collide = function (x, y, r, solidFn) {
    solidFn = solidFn || M.solid;
    for (let iter = 0; iter < 2; iter++) {
      const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T);
      const y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (!solidFn(tx, ty)) continue;
          const nx = G.clamp(x, tx * T, tx * T + T), ny = G.clamp(y, ty * T, ty * T + T);
          const dx = x - nx, dy = y - ny;
          const d2 = dx * dx + dy * dy;
          if (d2 < r * r) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2), push = r - d;
              x += (dx / d) * push; y += (dy / d) * push;
            } else {
              const cx = tx * T + T / 2, cy = ty * T + T / 2;
              const ox = x - cx, oy = y - cy;
              if (Math.abs(ox) > Math.abs(oy)) x = cx + Math.sign(ox || 1) * (T / 2 + r);
              else y = cy + Math.sign(oy || 1) * (T / 2 + r);
            }
          }
        }
      }
    }
    return { x, y };
  };

  M.move = function (e, dx, dy, solidFn) {
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(len / (e.r * 0.5)));
    let x = e.x, y = e.y;
    for (let i = 0; i < steps; i++) {
      x += dx / steps; y += dy / steps;
      const p = M.collide(x, y, e.r, solidFn);
      x = p.x; y = p.y;
    }
    const hit = Math.abs(x - (e.x + dx)) > 0.01 || Math.abs(y - (e.y + dy)) > 0.01;
    e.x = G.clamp(x, e.r, M.pw - e.r); e.y = G.clamp(y, e.r, M.ph - e.r);
    return hit;
  };

  /* DDA ray: distance to the first blocking tile along unit vector */
  M.raycast = function (x, y, dx, dy, maxD, blockFn) {
    blockFn = blockFn || M.opaque;
    let tx = Math.floor(x / T), ty = Math.floor(y / T);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(T / dx) : Infinity;
    const tdy = dy !== 0 ? Math.abs(T / dy) : Infinity;
    let tmx = dx > 0 ? ((tx + 1) * T - x) / dx : dx < 0 ? (tx * T - x) / dx : Infinity;
    let tmy = dy > 0 ? ((ty + 1) * T - y) / dy : dy < 0 ? (ty * T - y) / dy : Infinity;
    let t = 0;
    for (let n = 0; n < 200; n++) {
      if (tmx < tmy) { t = tmx; tmx += tdx; tx += sx; } else { t = tmy; tmy += tdy; ty += sy; }
      if (t >= maxD) return maxD;
      if (blockFn(tx, ty)) return t;
    }
    return maxD;
  };

  M.los = function (x1, y1, x2, y2, blockFn) {
    const dx = x2 - x1, dy = y2 - y1;
    const d = Math.hypot(dx, dy);
    if (d < 1) return true;
    return M.raycast(x1, y1, dx / d, dy / d, d, blockFn) >= d - 0.5;
  };

  /* Visibility polygon as flat [x0,y0,x1,y1...] */
  M.visPoly = function (x, y, radius, a0, a1, rays, includeCenter) {
    const pts = [];
    if (includeCenter) pts.push(x, y);
    for (let i = 0; i <= rays; i++) {
      const a = a0 + ((a1 - a0) * i) / rays;
      const dx = Math.cos(a), dy = Math.sin(a);
      let d = M.raycast(x, y, dx, dy, radius);
      if (d < radius) d += 6;
      pts.push(x + dx * d, y + dy * d);
    }
    return pts;
  };

  /* Dijkstra flow field on 8-neighbour grid; walls nearby cost more */
  const penalty = new Float32Array(W * H);
  function buildPenalty() {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let p = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (M.solid(x + i, y + j)) p = 0.7;
      penalty[idx(x, y)] = p;
    }
  }
  M.large = (tx, ty) => {
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (M.solid(tx + i, ty + j)) return false;
    return true;
  };
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  M.field = function (targets, large) {
    const dist = new Float32Array(W * H).fill(1e9);
    const pass = large ? M.large : (x, y) => !M.solid(x, y);
    const heap = [];
    const push = (d, i) => {
      heap.push([d, i]);
      let k = heap.length - 1;
      while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
    };
    const pop = () => {
      const top = heap[0], end = heap.pop();
      if (heap.length) {
        heap[0] = end; let k = 0;
        for (;;) {
          const l = 2 * k + 1, r = l + 1; let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]]; k = m;
        }
      }
      return top;
    };
    for (const t of targets) {
      const tx = Math.floor(t.x / T), ty = Math.floor(t.y / T);
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      dist[idx(tx, ty)] = 0; push(0, idx(tx, ty));
    }
    while (heap.length) {
      const [d, i] = pop();
      if (d > dist[i]) continue;
      const x = i % W, y = (i / W) | 0;
      for (const [ox, oy, c] of NB) {
        const nx = x + ox, ny = y + oy;
        if (!pass(nx, ny)) continue;
        if (ox && oy && (!pass(x + ox, y) || !pass(x, y + oy))) continue;
        const ni = idx(nx, ny);
        // Compare the same precision stored in the field when discarding stale heap entries.
        const nd = Math.fround(d + c + (large ? 0 : penalty[ni]));
        if (nd < dist[ni]) { dist[ni] = nd; push(nd, ni); }
      }
    }
    return dist;
  };

  /* Direction from a field at a world point, or null when at target or unreachable */
  M.fieldDir = function (field, x, y, large) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
    const pass = large ? M.large : (a, b) => !M.solid(a, b);
    let best = field[idx(tx, ty)], bx = -1, by = -1;
    if (best >= 1e9) {
      // standing somewhere odd: find any neighbour with a valid value
      best = 1e9;
    }
    for (const [ox, oy] of NB) {
      const nx = tx + ox, ny = ty + oy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (!pass(nx, ny)) continue;
      if (ox && oy && (!pass(tx + ox, ty) || !pass(tx, ty + oy))) continue;
      const v = field[idx(nx, ny)];
      if (v < best) { best = v; bx = nx; by = ny; }
    }
    if (bx < 0) return null;
    const gx = bx * T + T / 2 - x, gy = by * T + T / 2 - y;
    const d = Math.hypot(gx, gy) || 1;
    return { x: gx / d, y: gy / d, v: best };
  };
  M.fieldValue = (field, x, y) => {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return 1e9;
    return field[idx(tx, ty)];
  };

  M.randomFloorNear = function (x, y, rmin, rmax, needLos) {
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * G.TAU, r = G.rand(rmin, rmax);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      const tx = Math.floor(px / T), ty = Math.floor(py / T);
      if (M.solid(tx, ty) || !M.large(tx, ty)) continue;
      if (needLos && !M.los(x, y, px, py)) continue;
      return { x: tx * T + T / 2, y: ty * T + T / 2 };
    }
    return null;
  };

  /* Static decoration */
  M.labels = [
    { t: 'SURFACE ACCESS', x: 32, y: 9.6, s: 15 },
    { t: 'ATRIUM  SECTOR 2', x: 32, y: 25.3, s: 13 },
    { t: 'ARMORY', x: 8, y: 14.8, s: 14 },
    { t: 'MAINTENANCE', x: 7, y: 12.6, s: 10, rot: -Math.PI / 2 },
    { t: 'RESEARCH LAB 4', x: 56, y: 12.8, s: 12 },
    { t: 'FREIGHT', x: 58, y: 10.4, s: 12 },
    { t: 'CONTAINMENT WING', x: 32, y: 30.7, s: 14 },
    { t: 'SCP-173', x: 15, y: 42.4, s: 18 },
    { t: 'SCP-049', x: 32, y: 42.4, s: 18 },
    { t: 'SCP-106', x: 49, y: 42.4, s: 18 },
    { t: 'CELL A', x: 15, y: 36, s: 11 },
    { t: 'CELL B', x: 32, y: 36, s: 11 },
    { t: 'CELL C', x: 49, y: 36, s: 11 },
  ];

  function stripes(g, x, y, w, h, a) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = `rgba(20,18,12,${a})`; g.fillRect(x, y, w, h);
    g.fillStyle = `rgba(214,164,52,${a})`;
    for (let i = -h; i < w + h; i += 16) {
      g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + 8, y + h); g.lineTo(x + i + 8 + h, y); g.lineTo(x + i + h, y); g.closePath(); g.fill();
    }
    g.restore();
  }

  // Official SCP Wiki vector shared with the masthead and app icons
  const foundationLogo = new Image();
  let logoStamp = null;
  M.drawLogo = function (g, cx, cy, R) {
    if (!logoStamp) return;
    g.save();
    g.globalAlpha = 0.075;
    g.drawImage(logoStamp, cx - R, cy - R, R * 2, R * 2);
    g.restore();
  };
  foundationLogo.onload = () => {
    logoStamp = document.createElement('canvas');
    logoStamp.width = logoStamp.height = 256;
    const stamp = logoStamp.getContext('2d');
    stamp.drawImage(foundationLogo, 0, 0, 256, 256);
    stamp.globalCompositeOperation = 'source-in';
    stamp.fillStyle = '#fff';
    stamp.fillRect(0, 0, 256, 256);
    // The floor can be baked before the image finishes loading
    if (M.floorCanvas) {
      const g = M.floorCanvas.getContext('2d');
      g.save();
      g.scale(M.FS, M.FS);
      M.drawLogo(g, 32 * T, 20 * T, 82);
      g.restore();
    }
  };
  foundationLogo.src = 'icons/seal.svg';

  function drawProp(g, p, rnd) {
    const x = p.x * T, y = p.y * T, w = p.w * T, h = p.h * T;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    G.rr(g, x + 4, y + 5, w - 2, h - 2, 4); g.fill();
    if (p.type === 1) {
      for (let i = 0; i < p.w; i++) for (let j = 0; j < p.h; j++) {
        const cx = x + i * T, cy = y + j * T;
        g.fillStyle = '#4a503e'; G.rr(g, cx + 2, cy + 2, T - 4, T - 4, 3); g.fill();
        g.fillStyle = '#5a614c'; G.rr(g, cx + 4, cy + 4, T - 8, T - 8, 2); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx + 5, cy + 5); g.lineTo(cx + T - 5, cy + T - 5); g.moveTo(cx + T - 5, cy + 5); g.lineTo(cx + 5, cy + T - 5); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(cx + 4, cy + 4, T - 8, 3);
      }
    } else if (p.type === 2) {
      g.fillStyle = '#6a6a64'; G.rr(g, x + 1, y + 6, w - 2, h - 12, 4); g.fill();
      g.fillStyle = '#7b7b74'; G.rr(g, x + 3, y + 9, w - 6, h - 18, 3); g.fill();
      stripes(g, x + 6, y + 12, w - 12, h - 24, 0.75);
    } else if (p.type === 3) {
      g.fillStyle = '#2e2a26'; G.rr(g, x + 1, y + 3, w - 2, h - 6, 3); g.fill();
      g.fillStyle = '#3a352f'; G.rr(g, x + 3, y + 5, w - 6, h - 10, 2); g.fill();
      for (let i = 0; i < p.w; i += 2) {
        g.fillStyle = '#15181c'; g.fillRect(x + i * T + 10, y + 7, 18, 11);
        g.fillStyle = 'rgba(120,200,255,0.35)'; g.fillRect(x + i * T + 12, y + 9, 14, 7);
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + i * T + 34, y + 12, 14, 8);
      }
    } else if (p.type === 4) {
      g.fillStyle = '#16191e'; G.rr(g, x + 2, y + 1, w - 4, h - 2, 3); g.fill();
      g.fillStyle = '#20252c'; g.fillRect(x + 5, y + 4, w - 10, h - 8);
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1;
      for (let k = y + 8; k < y + h - 6; k += 6) { g.beginPath(); g.moveTo(x + 7, k); g.lineTo(x + w - 7, k); g.stroke(); }
      for (let k = y + 9; k < y + h - 8; k += 12) M.leds.push({ x: x + w - 9, y: k, c: rnd() < 0.7 ? 0 : 1, ph: rnd() * 10 });
    } else if (p.type === 5) {
      g.fillStyle = '#25332a'; G.rr(g, x + 2, y + 1, w - 3, h - 2, 3); g.fill();
      g.fillStyle = '#2f4034'; g.fillRect(x + 5, y + 4, w - 10, h - 8);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + w / 2 - 1, y + 6, 2, h - 12);
      g.fillStyle = 'rgba(232,176,74,0.7)'; g.fillRect(x + 7, y + h / 2 - 8, 4, 16);
    } else if (p.type === 6) {
      g.fillStyle = '#2b3036'; G.rr(g, x + 1, y + 3, w - 2, h - 6, 3); g.fill();
      g.fillStyle = '#d6dde4'; g.globalAlpha = 0.15; g.fillRect(x + 6, y + 7, w - 12, h - 14); g.globalAlpha = 1;
    }
  }

  M.leds = [];
  M.renderFloor = function () {
    const FS = 1.5;
    M.FS = FS;
    const c = document.createElement('canvas');
    c.width = Math.ceil(M.pw * FS); c.height = Math.ceil(M.ph * FS);
    const g = c.getContext('2d');
    g.scale(FS, FS);
    const rnd = G.seeded(109);
    g.fillStyle = '#0c0e11'; g.fillRect(0, 0, M.pw, M.ph);
    M.leds = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (tiles[idx(x, y)] === 1) continue;
      const px = x * T, py = y * T, f = ftype[idx(x, y)];
      const v = rnd() * 6 - 3;
      if (f === 0) {
        const b = 58 + v;
        g.fillStyle = `rgb(${b},${b + 3},${b + 8})`; g.fillRect(px, py, T, T);
        if ((x + y) % 2 === 0) { g.fillStyle = 'rgba(255,255,255,0.015)'; g.fillRect(px, py, T, T); }
        g.fillStyle = 'rgba(0,0,0,0.28)';
        if (x % 2 === 0) g.fillRect(px, py, 1, T);
        if (y % 2 === 0) g.fillRect(px, py, T, 1);
      } else if (f === 1) {
        g.fillStyle = `rgb(${46 + v},${50 + v},${56 + v})`; g.fillRect(px, py, T, T);
        g.fillStyle = 'rgba(0,0,0,0.32)';
        for (let k = 3; k < T; k += 6) g.fillRect(px + 3, py + k, T - 6, 2);
        g.fillStyle = 'rgba(255,255,255,0.035)';
        for (let k = 5; k < T; k += 6) g.fillRect(px + 3, py + k, T - 6, 1);
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(px, py, T, 1); g.fillRect(px, py, 1, T);
      } else if (f === 2) {
        const alt = (Math.floor(x / 2) + Math.floor(y / 2)) % 2;
        const b = (alt ? 70 : 64) + v * 0.5;
        g.fillStyle = `rgb(${b},${b + 2},${b + 6})`; g.fillRect(px, py, T, T);
        g.fillStyle = 'rgba(0,0,0,0.3)';
        if (x % 2 === 0) g.fillRect(px, py, 1, T);
        if (y % 2 === 0) g.fillRect(px, py, T, 1);
        g.fillStyle = 'rgba(255,255,255,0.03)';
        g.beginPath(); g.moveTo(px, py + T); g.lineTo(px + 10, py + T); g.lineTo(px + T, py + 10); g.lineTo(px + T, py); g.closePath(); g.fill();
      } else if (f === 3) {
        const b = 74 + v * 0.6;
        g.fillStyle = `rgb(${b},${b + 5},${b + 12})`; g.fillRect(px, py, T, T);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(px, py, T, 1); g.fillRect(px, py, 1, T);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(px + 16, py, 1, T); g.fillRect(px, py + 16, T, 1);
      } else if (f === 4) {
        const b = 56 + v;
        g.fillStyle = `rgb(${b + 2},${b + 1},${b})`; g.fillRect(px, py, T, T);
      } else if (f === 5) {
        const b = 46 + v;
        g.fillStyle = `rgb(${b + 4},${b},${b - 4})`; g.fillRect(px, py, T, T);
      }
    }
    // speckle and wear
    for (let i = 0; i < 9000; i++) {
      const x = rnd() * M.pw, y = rnd() * M.ph;
      if (tiles[idx(Math.floor(x / T), Math.floor(y / T))] === 1) continue;
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)';
      g.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    for (let i = 0; i < 160; i++) {
      const x = rnd() * M.pw, y = rnd() * M.ph;
      if (tiles[idx(Math.floor(x / T), Math.floor(y / T))] === 1) continue;
      const r = 10 + rnd() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(0,0,0,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, G.TAU); g.fill();
    }
    // corroded cell
    for (let i = 0; i < 26; i++) {
      const x = (44 + rnd() * 10) * T, y = (35 + rnd() * 9) * T, r = 10 + rnd() * 34;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(16,10,6,0.75)'); gr.addColorStop(0.7, 'rgba(30,18,10,0.4)'); gr.addColorStop(1, 'rgba(30,18,10,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, G.TAU); g.fill();
    }
    // contained stains in 173 cell
    for (let i = 0; i < 10; i++) {
      const x = (11 + rnd() * 8) * T, y = (36 + rnd() * 7) * T, r = 6 + rnd() * 18;
      g.fillStyle = `rgba(${60 + rnd() * 30},${30 + rnd() * 10},20,0.18)`;
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, G.TAU); g.fill();
    }
    // corridor paint lines
    g.fillStyle = 'rgba(214,164,52,0.35)';
    g.fillRect(6 * T + 6, 30 * T + 5, 52 * T - 12, 3);
    g.fillRect(6 * T + 6, 34 * T - 8, 52 * T - 12, 3);
    // chevrons toward containment
    g.fillStyle = 'rgba(214,164,52,0.22)';
    for (let k = 0; k < 3; k++) {
      const cy = 26.6 * T + k * 34, cx = 32 * T;
      g.beginPath(); g.moveTo(cx - 34, cy); g.lineTo(cx, cy + 18); g.lineTo(cx + 34, cy); g.lineTo(cx + 34, cy + 8); g.lineTo(cx, cy + 26); g.lineTo(cx - 34, cy + 8); g.closePath(); g.fill();
    }
    // hazard zones
    for (const c of M.cells) stripes(g, c.door[0] * T - 16, 33 * T + 14, 2 * T + 32, 18, 0.55);
    stripes(g, 29 * T, 2 * T, 6 * T, 10, 0.5);
    stripes(g, 5 * T, 2 * T, 4 * T, 10, 0.5);
    stripes(g, 55 * T, 4 * T, 6 * T, 10, 0.5);
    // elevator doors
    g.fillStyle = '#2a2f36'; g.fillRect(29 * T + 6, 1 * T + 2, 6 * T - 12, T - 6);
    g.fillStyle = '#353b44'; g.fillRect(29 * T + 10, 1 * T + 6, 3 * T - 12, T - 14); g.fillRect(32 * T + 2, 1 * T + 6, 3 * T - 12, T - 14);
    // logo
    M.drawLogo(g, 32 * T, 20 * T, 82);
    // wall ambient occlusion
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (tiles[idx(x, y)] === 1) continue;
      const px = x * T, py = y * T;
      const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [ox, oy] of sides) {
        if (M.tileAt(x + ox, y + oy) !== 1) continue;
        let gr;
        if (oy === -1) gr = g.createLinearGradient(0, py, 0, py + 16);
        else if (oy === 1) gr = g.createLinearGradient(0, py + T, 0, py + T - 16);
        else if (ox === -1) gr = g.createLinearGradient(px, 0, px + 16, 0);
        else gr = g.createLinearGradient(px + T, 0, px + T - 16, 0);
        gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(px, py, T, T);
      }
    }
    // labels
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const l of M.labels) {
      g.save();
      g.translate(l.x * T, l.y * T);
      if (l.rot) g.rotate(l.rot);
      g.font = `700 ${l.s}px "Chakra Petch", "IBM Plex Mono", monospace`;
      g.fillStyle = 'rgba(230,226,210,0.13)';
      if (g.letterSpacing !== undefined) g.letterSpacing = '3px';
      g.fillText(l.t, 0, 0);
      g.restore();
    }
    for (const p of M.props) drawProp(g, p, rnd);
    M.floorCanvas = c;
    buildWallGeometry();
    buildPenalty();
    M.renderMini();
    return c;
  };

  /* Wall geometry for per-frame vector drawing */
  function buildWallGeometry() {
    M.wallRuns = [];
    for (let y = 0; y < H; y++) {
      let s = -1;
      for (let x = 0; x <= W; x++) {
        const w = x < W && tiles[idx(x, y)] === 1;
        if (w && s < 0) s = x;
        if (!w && s >= 0) { M.wallRuns.push([s * T, y * T, (x - s) * T, T]); s = -1; }
      }
    }
    const segs = [];
    const isW = (x, y) => M.tileAt(x, y) === 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isW(x, y)) continue;
      if (!isW(x, y - 1) && y > 0) segs.push(['h', y * T, x * T, x * T + T, 1]);
      if (!isW(x, y + 1) && y < H - 1) segs.push(['h', y * T + T, x * T, x * T + T, -1]);
      if (!isW(x - 1, y) && x > 0) segs.push(['v', x * T, y * T, y * T + T, 1]);
      if (!isW(x + 1, y) && x < W - 1) segs.push(['v', x * T + T, y * T, y * T + T, -1]);
    }
    // merge collinear
    segs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[4] - b[4] || a[1] - b[1] || a[2] - b[2]));
    const merged = [];
    for (const s of segs) {
      const m = merged[merged.length - 1];
      if (m && m[0] === s[0] && m[1] === s[1] && m[4] === s[4] && Math.abs(m[3] - s[2]) < 0.5) m[3] = s[3];
      else merged.push(s.slice());
    }
    M.wallEdges = merged;
    const pc = document.createElement('canvas'); pc.width = 12; pc.height = 12;
    const pg = pc.getContext('2d');
    pg.strokeStyle = 'rgba(255,255,255,0.028)'; pg.lineWidth = 1;
    pg.beginPath(); pg.moveTo(0, 12); pg.lineTo(12, 0); pg.stroke();
    M.hatchSrc = pc;
  }

  M.drawWalls = function (ctx, x0, y0, x1, y1) {
    if (!M.hatch) M.hatch = ctx.createPattern(M.hatchSrc, 'repeat');
    ctx.fillStyle = '#101216';
    ctx.beginPath();
    for (const r of M.wallRuns) {
      if (r[0] > x1 || r[0] + r[2] < x0 || r[1] > y1 || r[1] + r[3] < y0) continue;
      ctx.rect(r[0], r[1], r[2], r[3]);
    }
    ctx.fill();
    ctx.fillStyle = M.hatch; ctx.fill();
    // inner cap band
    ctx.fillStyle = '#1a1e24';
    ctx.beginPath();
    for (const s of M.wallEdges) {
      if (s[0] === 'h') {
        if (s[1] < y0 - 8 || s[1] > y1 + 8 || s[3] < x0 || s[2] > x1) continue;
        ctx.rect(s[2], s[4] > 0 ? s[1] : s[1] - 7, s[3] - s[2], 7);
      } else {
        if (s[1] < x0 - 8 || s[1] > x1 + 8 || s[3] < y0 || s[2] > y1) continue;
        ctx.rect(s[4] > 0 ? s[1] : s[1] - 7, s[2], 7, s[3] - s[2]);
      }
    }
    ctx.fill();
    ctx.strokeStyle = '#3d4550'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const s of M.wallEdges) {
      if (s[0] === 'h') {
        if (s[1] < y0 - 8 || s[1] > y1 + 8 || s[3] < x0 || s[2] > x1) continue;
        ctx.moveTo(s[2], s[1]); ctx.lineTo(s[3], s[1]);
      } else {
        if (s[1] < x0 - 8 || s[1] > x1 + 8 || s[3] < y0 || s[2] > y1) continue;
        ctx.moveTo(s[1], s[2]); ctx.lineTo(s[1], s[3]);
      }
    }
    ctx.stroke();
  };

  M.renderMini = function () {
    const s = 3;
    const c = document.createElement('canvas'); c.width = W * s; c.height = H * s;
    const g = c.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = tiles[idx(x, y)];
      if (t === 1) continue;
      g.fillStyle = t === 2 ? 'rgba(160,170,185,0.32)' : ftype[idx(x, y)] >= 4 ? 'rgba(232,176,74,0.18)' : 'rgba(160,170,185,0.16)';
      g.fillRect(x * s, y * s, s, s);
    }
    M.miniCanvas = c; M.miniScale = s;
  };

  /* Precompute occluded lamp polygons once */
  M.bakeLamps = function () {
    for (const l of M.lamps) {
      const pts = M.visPoly(l.x, l.y, l.r, 0, G.TAU, 160, false);
      const p = new Path2D();
      p.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
      p.closePath();
      l.path = p;
    }
  };

  /* Gameplay API used by the simulation */
  M.width = M.pw; M.height = M.ph; M.tile = T;

  M.open = function (x, y, r = 0) {
    if (x < r || y < r || x > M.pw - r || y > M.ph - r) return false;
    const x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T);
    const y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!M.solid(tx, ty)) continue;
      const nx = G.clamp(x, tx * T, tx * T + T), ny = G.clamp(y, ty * T, ty * T + T);
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < r * r) return false;
    }
    return true;
  };

  /* Fraction of the segment travelled before a solid tile; padding sweeps a fat line */
  M.trace = function (x, y, tx, ty, padding = 0) {
    const dx = tx - x, dy = ty - y;
    const d = Math.hypot(dx, dy);
    if (d < 0.01) return 1;
    const ux = dx / d, uy = dy / d;
    let best = M.raycast(x, y, ux, uy, d, M.solid);
    if (padding > 0) {
      const ox = -uy * padding, oy = ux * padding;
      best = Math.min(best, M.raycast(x + ox, y + oy, ux, uy, d, M.solid), M.raycast(x - ox, y - oy, ux, uy, d, M.solid));
    }
    return best >= d ? 1 : best / d;
  };

  const baseMove = M.move;
  M.move = function (unit, dx, dy, phase) {
    if (phase) {
      unit.x = G.clamp(unit.x + dx, T + unit.r, M.pw - T - unit.r);
      unit.y = G.clamp(unit.y + dy, T + unit.r, M.ph - T - unit.r);
      return false;
    }
    return baseMove(unit, dx, dy);
  };

  const routes = new Map();
  function routeField(x, y, large) {
    if (M.dirty) { routes.clear(); buildPenalty(); M.dirty = false; }
    const gx = G.clamp(Math.floor(x / T), 0, W - 1), gy = G.clamp(Math.floor(y / T), 0, H - 1);
    const key = (gy * W + gx) * 2 + (large ? 1 : 0);
    let field = routes.get(key);
    if (!field) {
      if (routes.size >= 48) routes.delete(routes.keys().next().value);
      field = M.field([{ x: (gx + 0.5) * T, y: (gy + 0.5) * T }], large);
      routes.set(key, field);
    }
    return field;
  }
  M.routeCost = function (unit, x, y) {
    if (M.trace(unit.x, unit.y, x, y, unit.r + 1) === 1) return G.dist(unit.x, unit.y, x, y);
    return M.fieldValue(routeField(x, y, false), unit.x, unit.y) * T;
  };
  M.direction = function (unit, x, y) {
    const straight = Math.atan2(y - unit.y, x - unit.x);
    if (M.trace(unit.x, unit.y, x, y, unit.r + 1) === 1) return straight;
    let dir;
    if (unit.r > 19 && M.large(Math.floor(unit.x / T), Math.floor(unit.y / T))) {
      dir = M.fieldDir(routeField(x, y, true), unit.x, unit.y, true);
    }
    if (!dir) dir = M.fieldDir(routeField(x, y, false), unit.x, unit.y, false);
    return dir ? Math.atan2(dir.y, dir.x) : straight;
  };

  return M;
})();
