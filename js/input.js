'use strict';
/* Keyboard, mouse, gamepad and touch unified into one per-frame snapshot */
G.input = (function () {
  const I = {
    keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, rdown: false, rpressed: false, lpressed: false },
    wheel: 0, usingPad: false, touch: false,
    state: null,
  };
  const pad = { aimX: 1, aimY: 0, prev: {} };
  const touch = { move: null, aim: null, buttons: {} };

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (!I.keys[e.code]) I.pressed[e.code] = true;
    I.keys[e.code] = true;
    I.usingPad = false;
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code) && G.state === 'play') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { I.keys[e.code] = false; });
  window.addEventListener('blur', () => { I.keys = {}; I.mouse.down = false; I.mouse.rdown = false; });
  window.addEventListener('mousemove', (e) => { I.mouse.x = e.clientX; I.mouse.y = e.clientY; I.mouse.ready = true; I.usingPad = false; });
  window.addEventListener('mousedown', (e) => {
    if (e.target.closest && e.target.closest('.ui-layer button, .ui-layer input, .panel')) return;
    I.mouse.x = e.clientX; I.mouse.y = e.clientY; I.mouse.ready = true;
    if (e.button === 0) { I.mouse.down = true; I.mouse.lpressed = true; }
    if (e.button === 2) { I.mouse.rdown = true; I.mouse.rpressed = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) I.mouse.down = false;
    if (e.button === 2) I.mouse.rdown = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('wheel', (e) => { I.wheel += Math.sign(e.deltaY); }, { passive: true });

  /* Touch: left half moves, right half aims and fires, buttons on the right */
  function setupTouch() {
    const layer = document.getElementById('touch');
    if (!layer) return;
    const stickL = layer.querySelector('.stick-l'), stickR = layer.querySelector('.stick-r');
    const knob = (el) => el.querySelector('.knob');
    function place(el, t) {
      el.style.left = t.ox + 'px'; el.style.top = t.oy + 'px'; el.classList.add('on');
    }
    layer.addEventListener('touchstart', (e) => {
      I.touch = true;
      document.body.classList.add('touch');
      for (const tc of e.changedTouches) {
        const b = tc.target.closest && tc.target.closest('[data-tb]');
        if (b) { touch.buttons[b.dataset.tb] = 2; b.classList.add('down'); b._tid = tc.identifier; continue; }
        const right = tc.clientX > window.innerWidth * 0.5;
        const t = { id: tc.identifier, ox: tc.clientX, oy: tc.clientY, x: tc.clientX, y: tc.clientY };
        if (right && !touch.aim) { touch.aim = t; place(stickR, t); }
        else if (!right && !touch.move) { touch.move = t; place(stickL, t); }
      }
      e.preventDefault();
    }, { passive: false });
    layer.addEventListener('touchmove', (e) => {
      for (const tc of e.changedTouches) {
        for (const k of ['move', 'aim']) {
          const t = touch[k];
          if (t && t.id === tc.identifier) {
            t.x = tc.clientX; t.y = tc.clientY;
            const el = k === 'move' ? stickL : stickR;
            let dx = t.x - t.ox, dy = t.y - t.oy;
            const m = Math.hypot(dx, dy), mx = 54;
            if (m > mx) { dx *= mx / m; dy *= mx / m; }
            knob(el).style.transform = `translate(${dx}px,${dy}px)`;
          }
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const tc of e.changedTouches) {
        for (const k of ['move', 'aim']) {
          if (touch[k] && touch[k].id === tc.identifier) {
            const el = k === 'move' ? stickL : stickR;
            el.classList.remove('on'); knob(el).style.transform = '';
            touch[k] = null;
          }
        }
        layer.querySelectorAll('[data-tb]').forEach((b) => {
          if (b._tid === tc.identifier) { b.classList.remove('down'); touch.buttons[b.dataset.tb] = 0; b._tid = null; }
        });
      }
    };
    layer.addEventListener('touchend', end);
    layer.addEventListener('touchcancel', end);
  }
  I.setupTouch = setupTouch;

  I.resetTouch = () => {
    touch.move = touch.aim = null;
    touch.buttons = {};
    const layer = document.getElementById('touch');
    layer.querySelectorAll('.stick').forEach(el => {
      el.classList.remove('on');
      el.querySelector('.knob').style.transform = '';
    });
    layer.querySelectorAll('[data-tb]').forEach(el => {
      el.classList.remove('down');
      el._tid = null;
    });
  };

  function padButtons(gp) {
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const cur = {}, edge = {};
    for (let i = 0; i < 17; i++) { cur[i] = b(i); edge[i] = cur[i] && !pad.prev[i]; }
    pad.prev = cur;
    return { cur, edge };
  }

  /* Builds the input snapshot. player and camera supply world mapping */
  I.poll = function (px, py, screenToWorld) {
    const k = I.keys, p = I.pressed;
    let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let my = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    const w = I.mouse.ready ? screenToWorld(I.mouse.x, I.mouse.y) : { x: px, y: py - 200 };
    const s = {
      mx, my, aimX: w.x, aimY: w.y,
      fire: I.mouse.down || I.mouse.lpressed, grenade: I.mouse.rpressed,
      dash: !!(p.Space || p.ShiftLeft || p.ShiftRight),
      reload: !!p.KeyR, interact: !!k.KeyE, interactPressed: !!p.KeyE,
      heal: !!p.KeyQ, ball: !!p.KeyF, cola: !!p.KeyC, sentry: !!p.KeyX,
      weapon: -1, weaponDelta: 0, pause: !!(p.Escape || p.KeyP),
      crossX: I.mouse.x, crossY: I.mouse.y,
    };
    for (let i = 1; i <= 6; i++) if (p['Digit' + i]) s.weapon = i - 1;
    if (I.wheel) { s.weaponDelta = I.wheel > 0 ? 1 : -1; }
    if (p.KeyG) s.grenade = true;

    // gamepad
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps && Array.from(gps).find((g) => g && g.connected);
    if (gp) {
      const { cur, edge } = padButtons(gp);
      const ax = gp.axes;
      const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
      const lx = dz(ax[0] || 0), ly = dz(ax[1] || 0), rx = dz(ax[2] || 0), ry = dz(ax[3] || 0);
      const any = lx || ly || rx || ry || Object.values(cur).some(Boolean);
      if (any) I.usingPad = true;
      if (I.usingPad) {
        if (lx || ly) { s.mx = lx; s.my = ly; }
        if (Math.hypot(rx, ry) > 0.3) { pad.aimX = rx; pad.aimY = ry; }
        const m = Math.hypot(pad.aimX, pad.aimY) || 1;
        s.aimX = px + (pad.aimX / m) * 240; s.aimY = py + (pad.aimY / m) * 240;
        s.padAim = true;
        s.fire = s.fire || cur[7] || (gp.buttons[7] && gp.buttons[7].value > 0.3);
        s.grenade = s.grenade || edge[6];
        s.dash = s.dash || edge[0];
        s.reload = s.reload || edge[2];
        s.interact = s.interact || cur[1];
        s.interactPressed = s.interactPressed || edge[1];
        s.heal = s.heal || edge[3];
        s.ball = s.ball || edge[14];
        s.cola = s.cola || edge[15];
        s.sentry = s.sentry || edge[13];
        if (edge[5]) s.weaponDelta = 1;
        if (edge[4]) s.weaponDelta = -1;
        s.pause = s.pause || edge[9];
        const stick = ly > 0.55 || lx > 0.55 ? 1 : ly < -0.55 || lx < -0.55 ? -1 : 0;
        s.menuMove = edge[13] || edge[15] ? 1 : edge[12] || edge[14] ? -1 : stick !== pad.menuStick ? stick : 0;
        pad.menuStick = stick;
        s.menuSelect = edge[0];
        s.menuBack = edge[1];
      }
    }

    // touch
    if (I.touch) {
      if (touch.move) {
        const dx = touch.move.x - touch.move.ox, dy = touch.move.y - touch.move.oy;
        const m = Math.hypot(dx, dy);
        if (m > 8) { const f = Math.min(1, m / 54); s.mx = (dx / m) * f; s.my = (dy / m) * f; }
      }
      if (touch.aim) {
        const dx = touch.aim.x - touch.aim.ox, dy = touch.aim.y - touch.aim.oy;
        const m = Math.hypot(dx, dy);
        if (m > 10) { pad.aimX = dx; pad.aimY = dy; }
        s.fire = m > 22;
      }
      const mm = Math.hypot(pad.aimX, pad.aimY) || 1;
      s.aimX = px + (pad.aimX / mm) * 240; s.aimY = py + (pad.aimY / mm) * 240;
      s.padAim = true;
      const tb = touch.buttons;
      const edgeB = (n) => { if (tb[n] === 2) { tb[n] = 1; return true; } return false; };
      s.dash = s.dash || edgeB('dash');
      s.grenade = s.grenade || edgeB('frag');
      s.reload = s.reload || edgeB('reload');
      s.heal = s.heal || edgeB('heal');
      s.ball = s.ball || edgeB('ball');
      s.cola = s.cola || edgeB('cola');
      s.sentry = s.sentry || edgeB('sentry');
      if (edgeB('swap')) s.weaponDelta = 1;
      s.interact = s.interact || !!tb.use;
      s.interactPressed = s.interactPressed || edgeB('use');
      s.pause = s.pause || edgeB('pause');
    }
    I.state = s;
    return s;
  };

  I.endFrame = function () {
    I.pressed = {};
    I.mouse.lpressed = false;
    I.mouse.rpressed = false;
    I.wheel = 0;
  };

  return I;
})();
