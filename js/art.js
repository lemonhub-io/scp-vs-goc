'use strict';

G.drawSurveillance = (canvas) => {
  const c = canvas.getContext('2d');
  const W = 1000, H = 920;
  canvas.width = W; canvas.height = H;
  const rng = G.seeded(109);
  const poly = (fill, ...p) => {
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.closePath();
    c.fill();
  };
  const line = (color, width, ...p) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.stroke();
  };
  const rect = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  const gradient = (x, y, tx, ty, stops) => {
    const g = c.createLinearGradient(x, y, tx, ty);
    stops.forEach(([t, color]) => g.addColorStop(t, color));
    return g;
  };
  const glow = (x, y, rx, ry, color) => {
    c.save();
    c.translate(x, y);
    c.scale(rx, ry);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    c.fillStyle = g;
    c.fillRect(-1, -1, 2, 2);
    c.restore();
  };

  rect(0, 0, W, H, '#121718');
  poly(gradient(0, 290, 680, 370, [[0, '#111819'], [0.7, '#333436'], [1, '#211b1c']]),
    0, 0, 660, 270, 660, 614, 0, 920);
  poly(gradient(695, 330, 1000, 200, [[0, '#3b2526'], [1, '#15191a']]), 700, 280, 1000, 40, 1000, 883, 700, 615);
  poly(gradient(0, 880, 0, 600, [[0, '#1b2020'], [0.55, '#28292a'], [1, '#332627']]),
    0, 865, 518, 609, 792, 609, 1000, 820, 1000, 920, 0, 920);
  poly(gradient(0, 0, 350, 320, [[0, '#0c1112'], [1, '#292425']]), 0, 0, 1000, 0, 1000, 113, 784, 302, 523, 302);
  line('#464041', 2, 0, 800, 560, 575);
  line('#594240', 2, 1000, 768, 760, 566);
  line('#45433f', 4, 0, 423, 544, 458);
  line('#161819', 13, 0, 489, 508, 480);
  line('#6b4945', 2, 0, 494, 509, 484);
  const vanX = 661, vanY = 456;
  for (const x of [-450, -70, 245, 488, 658, 836, 1120, 1420]) {
    line('#51504c', 2, x, 920, vanX + (x - vanX) * 0.18, 608);
    line('#121718', 4, x + 9, 920, vanX + (x + 9 - vanX) * 0.18, 608);
  }
  for (const y of [636, 656, 682, 716, 763, 827, 914]) {
    const t = (y - vanY) / (920 - vanY);
    line('#414140', 2, Math.max(0, vanX - 1040 * t), y, Math.min(W, vanX + 530 * t), y);
    line('#181b1b', 3, Math.max(0, vanX - 1040 * t), y + 4, Math.min(W, vanX + 530 * t), y + 4);
  }
  for (const t of [0.23, 0.34, 0.53, 0.78, 1.18]) {
    const x1 = vanX - 630 * t, x2 = vanX + 533 * t;
    const top = vanY - 378 * t, bot = vanY + 433 * t, size = 47 * t;
    poly('#111516', x1-size, bot+10, x1-size, top+36, x1+13, top-size, x2-8, top-size, x2+size, top+32, x2+size, bot+6, x2-3, bot-4,
      x2-3, top+53, x2-48*t, top+10, x1+45*t, top+10, x1+5, top+55, x1+5, bot-7);
    line('#474242', 3, x1+4, bot-6, x1+4, top+53, x1+44*t, top+10, x2-48*t, top+10, x2-3, top+53, x2-3, bot-4);
    line('#292d2d', 5, x1-size-1, bot+10, x1-size-1, top+36, x1+13, top-size, x2-8, top-size, x2+size, top+32, x2+size, bot+6);
    if (t > 0.3) {
      poly('#442925', x1+6, top+92*t, x1+30*t, top+94*t, x1+30*t, top+156*t, x1+6, top+161*t);
      line('#a55847', 2, x1+8, top+160*t, x1+26*t, top+154*t);
    }
  }

  const doorX = 513, doorY = 316, doorW = 284, doorH = 301;
  rect(doorX-20, doorY-19, doorW+40, doorH+29, '#111416');
  rect(doorX-13, doorY-14, doorW+26, doorH+24, '#4a3333');
  rect(doorX-7, doorY-9, doorW+14, doorH+15, '#191719');
  rect(doorX, doorY, doorW, doorH, '#252326');
  poly('#3e3334', 513,316, 655,316, 655,617, 513,617, 513,582, 532,558, 532,383, 513,362);
  poly('#33282a', 663,316, 797,316, 797,361, 779,381, 779,562, 797,585, 797,617, 663,617);
  rect(543, 394, 225, 136, '#20201f');
  rect(545, 396, 220, 130, '#332b2b');
  rect(653, 315, 8, 307, '#101214');
  rect(659, 315, 2, 306, '#885344');
  c.textAlign = 'center';
  c.font = '900 88px "Arial Narrow", sans-serif';
  c.fillStyle = '#8b7770';
  c.fillText('109', 654, 499);
  rect(653, 405, 8, 119, '#222022');
  c.font = '700 13px monospace';
  c.fillStyle = '#baa496';
  c.fillText('CONTAINMENT WING', 655, 552);
  rect(565, 300, 181, 7, '#271c1d');
  rect(591, 299, 130, 4, '#ff846e');
  glow(655, 305, 163, 109, '#ff53486b');
  rect(480, 443, 16, 47, '#0d1112');
  rect(483, 448, 10, 6, '#f76d50');
  rect(483, 460, 10, 4, '#784b43');
  rect(817, 400, 25, 93, '#121515');
  rect(823, 411, 12, 12, '#d66752');
  rect(823, 432, 12, 4, '#5a504d');

  c.save();
  c.beginPath();
  c.rect(508, 581, 294, 15);
  c.clip();
  rect(508, 581, 294, 15, '#222222');
  for (let x = 480; x < 814; x += 25) poly('#756048', x, 596, x+11,596, x+28,581, x+17,581);
  c.restore();
  const cable = (off, color, width) => {
    c.beginPath();
    c.moveTo(70 + off, 0); c.bezierCurveTo(223 + off, 135, 413 + off, 160, 580 + off, 269);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  };
  for (const off of [-28, -8, 11, 105, 125]) {
    cable(off, '#0c1011', 10);
    cable(off+3, '#4b3f3d', 1.4);
  }
  c.save();
  c.globalCompositeOperation = 'screen';
  glow(660, 358, 386, 426, '#86232365');
  glow(664, 607, 318, 172, '#d2443640');
  glow(664, 696, 121, 196, '#a44d3936');
  glow(900, 224, 136, 135, '#6d24283a');
  glow(335, 137, 206, 151, '#58746a18');
  c.restore();
  for (let i = 0; i < 23000; i++) {
    c.fillStyle = rng() < 0.5 ? '#d7b8a912' : '#00000024';
    const x = rng() * W, y = rng() * H;
    c.fillRect(x, y, rng() * 4 + 0.5, rng() * 1.8 + 0.5);
  }
  for (let y = 1; y < H; y += 4) rect(0, y, W, 1, '#060b0b63');
  const shade = c.createRadialGradient(640, 435, 170, 610, 470, 678);
  shade.addColorStop(0, '#080b0a00');
  shade.addColorStop(1, '#080b0aef');
  rect(0, 0, W, H, shade);
};
