'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const on = (id, fn) => $(id).addEventListener('click', fn);
  const t = G.t;
  const screens = Array.from(document.querySelectorAll('.screen'));
  const meter = (el, value) => { el.style.width = G.clamp(value * 100, 0, 100) + '%'; };
  const text = (id, value) => {
    const el = $(id);
    const content = String(value);
    if (el.textContent !== content) el.textContent = content;
  };
  let run = null;
  let selectedEndless = false, settingsFrom = 'menu', manualTab = 'controls', category = 'weapons';
  let record = G.store.get('records', {}) || {};
  let newBest = false;
  let lastNotes = '', lastItems = '', lastHints = '', lastRadio = '', lastSlots = '';
  const selectRecord = (endless, difficulty) => (endless ? 'endless_' : 'operation_') + difficulty;

  function node(tag, value, className) {
    const el = document.createElement(tag);
    if (value != null) el.textContent = value;
    if (className) el.className = className;
    return el;
  }

  function show(state, focus) {
    const from = G.state;
    G.state = state;
    document.body.classList.toggle('playing', state === 'play');
    const menuBackground = ['brief', 'manual', 'settings', 'credits'].includes(state) && !(state === 'settings' && settingsFrom === 'pause');
    const active = state === 'play' ? null : $(state);
    for (const screen of screens) {
      screen.hidden = screen !== active && !(screen.id === 'menu' && menuBackground);
      screen.inert = screen !== active;
    }
    $('hud').hidden = !run || state === 'menu';
    $('pause-open').tabIndex = state === 'play' ? 0 : -1;
    if (state === 'play') {
      document.activeElement?.blur();
      if (from === 'pause') {
        G.audio.setMusic(run.def.boss ? 3 : 2);
        G.audio.siren(run.cells.some(c => c.charge));
      }
    } else {
      G.input.resetTouch();
      if (state === 'pause') {
        G.audio.setMusic(1);
        G.audio.siren(false);
      }
      const target = focus ? $(focus) : active?.querySelector('button');
      target?.focus({ preventScroll: true });
    }
    refresh();
  }

  function refresh() {
    G.applyI18n();
    text('language', G.settings.lang === 'zh' ? 'English' : '简体中文');
    $('set-language').value = G.settings.lang;
    const difficulty = G.DIFFS[G.settings.difficulty] || G.DIFFS[1];
    $(difficulty.id).checked = true;
    text('difficulty-description', t('diff_' + difficulty.id + '_d'));
    const best = Math.max(record[selectRecord(false, difficulty.id)] || 0, record[selectRecord(true, difficulty.id)] || 0);
    text('best', best ? G.fmt(best) : t('best_none'));
    document.title = t('title_site') + ' ' + t('title_main');
    if (G.state === 'brief') {
      text('brief-mode', t(selectedEndless ? 'brief_p3e' : 'brief_p3'));
      text('brief-objective', t(selectedEndless ? 'brief_o1e' : 'brief_o1'));
    }
    if (G.state === 'manual') drawManual();
    if (G.state === 'armory') drawArmory();
    if (G.state === 'report') drawReport();
    if (run) updateHud();
  }

  function launch(endless) {
    G.audio.init();
    selectedEndless = endless;
    show('brief', 'deploy');
  }

  function deploy() {
    G.audio.init();
    run = new G.Operation(selectedEndless, G.settings.difficulty);
    G.renderer.snap(run.player);
    show('play');
  }

  function returnToMenu() {
    run = null;
    G.map.reset();
    G.fx.reset();
    G.audio.siren(false);
    G.audio.setMusic(0);
    show('menu', 'begin');
  }

  function next() {
    if (G.state === 'report') {
      run.endless = true;
      run.player.hp = Math.min(run.healthLimit, run.player.hp + 24);
      run.player.armor = Math.min(run.armorLimit, run.player.armor + 18);
      run.resupply(0.35);
    }
    run.nextWave();
    show('play');
  }

  function setLanguage(lang) {
    G.settings.lang = lang;
    G.saveSettings();
    refresh();
  }

  function tabs(id, entries, active, select) {
    const slot = $(id);
    const previouslyFocused = slot.contains(document.activeElement);
    slot.replaceChildren(...entries.map(([key, title]) => {
      const button = node('button', t(title));
      button.type = 'button';
      button.setAttribute('aria-pressed', String(key === active));
      button.addEventListener('click', () => select(key));
      return button;
    }));
    if (previouslyFocused) slot.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }

  function drawManual() {
    tabs('manual-tabs', ['controls', 'hostiles', 'anomalies'].map(key => [key, 'man_' + key]), manualTab,
      (key) => { manualTab = key; drawManual(); });
    const content = $('manual-content');
    content.replaceChildren();
    if (manualTab === 'controls') {
      const keys = [
        ['move', 'W A S D'], ['aim', G.settings.lang === 'zh' ? '鼠标与左键' : 'Mouse and left click'],
        ['dash', 'Space'], ['reload', 'R'], ['weapons', '1–6'], ['grenade', 'G'], ['interact', 'E'],
        ['items', 'Q / F / C'], ['sentry', 'X'], ['pause', 'Esc / P'],
      ];
      const dl = node('dl', null, 'control-list');
      for (const [key, keycap] of keys) dl.append(node('dt', t('k_' + key)), node('dd', keycap));
      content.append(dl, node('p', t('man_tip'), 'manual-tip'), node('h3', t('man_devices')),
        node('p', t('man_pad')), node('p', t('man_touch')));
      return;
    }
    const cards = node('div', null, 'manual-cards');
    const keys = manualTab === 'hostiles'
      ? Object.keys(G.ENEMY).filter(key => key !== 'pylon' && key !== 'zombie').map(key => 'h_' + key)
      : ['173', '049', '106', '500', '018', '207'].map(key => 'an_' + key);
    for (const key of keys) {
      const article = node('article', null, 'manual-card');
      const alias = G.STR.en[key + '_n'] ? '  ' + t(key + '_n') : '';
      article.append(node('h3', t(key) + alias), node('p', t(key + '_d')));
      cards.append(article);
    }
    content.append(cards);
  }

  function stats(id, values) {
    $(id).replaceChildren(...values.map(([name, value]) => {
      const block = node('div');
      block.append(node('span', t(name)), node('strong', value));
      return block;
    }));
  }

  function drawArmory() {
    text('arm-cleared', t('arm_cleared', { n: run.wave }));
    text('arm-credits', G.fmt(run.credits));
    const shots = run.shots - run.waveShots;
    stats('arm-stats', [
      ['arm_kills', run.kills - run.waveKills], ['arm_acc', (shots ? Math.round((run.hits - run.waveHits) / shots * 100) : 0) + '%'],
      ['arm_bonus', '+' + G.fmt(run.bonus)], ['arm_cells', run.intact + ' / 3'],
    ]);
    tabs('arm-tabs', G.SHOP_CATS.map(key => [key, 'cat_' + key]), category, key => { category = key; drawArmory(); });
    text('arm-loadout', t('arm_loadout') + '  ' + run.player.arms.flatMap((arm, i) => arm.owned ? [t('wpn_' + G.WEAPONS[i].id)] : []).join('  ·  '));
    const shelf = $('arm-items');
    const focused = shelf.contains(document.activeElement) ? document.activeElement.dataset.buy : null;
    shelf.replaceChildren(...G.SHOP.filter(e => e.cat === category).map(entry => {
      const article = node('article');
      const title = t('sh_' + entry.id);
      const label = entry.kind === 'repair' ? t('sh_r_d', { s: run.cells[entry.cell].scp }) : t('sh_' + entry.id + '_d');
      const cost = run.price(entry);
      const availability = cost === null
        ? t(entry.kind === 'weapon' ? 'arm_owned' : entry.kind === 'upgrade' ? 'arm_maxed' : 'arm_full')
        : G.fmt(cost);
      const detail = entry.kind === 'upgrade' ? t('arm_lv', { n: run.up[entry.up] }) :
        entry.kind === 'item' ? run.inventory[entry.item] + ' / ' + entry.max :
        entry.kind === 'repair' ? run.cells[entry.cell].hp + '%' : '';
      const description = node('div');
      description.append(node('h3', title), node('p', label));
      const buy = node('button', availability, 'secondary');
      buy.type = 'button';
      buy.disabled = cost === null || run.credits < cost;
      buy.dataset.buy = entry.id;
      buy.setAttribute('aria-label', cost === null ? title + ' ' + availability : t('arm_purchase', { item: title }) + ' ' + availability);
      buy.addEventListener('click', () => { if (run.buy(entry)) { drawArmory(); updateHud(); } });
      const footer = node('footer');
      footer.append(node('span', detail), buy);
      article.append(description, footer);
      return article;
    }));
    if (focused) {
      const target = Array.from(shelf.querySelectorAll('button')).find(button => button.dataset.buy === focused && !button.disabled);
      (target || $('arm-tabs').querySelector('[aria-pressed="true"]'))?.focus({ preventScroll: true });
    }
  }

  function drawReport() {
    text('result', t('end_' + run.result));
    text('result-story', t(run.result === 'win' && run.intact < 3 ? 'end_partial' : 'end_' + run.result + '_d'));
    $('result-endless').hidden = !run.endless;
    text('result-endless', run.endless ? t('end_endless_d', { n: run.wave }) : '');
    $('new-record').hidden = !newBest;
    $('continue').hidden = run.result !== 'win' || run.endless;
    stats('result-stats', [
      ['end_score', G.fmt(run.score)], ['end_wave', run.wave], ['end_kills', run.kills],
      ['end_acc', run.accuracy + '%'], ['end_cells', run.intact + ' / 3'], ['end_time', G.fmtTime(run.time)],
    ]);
  }

  const monitors = G.map.cells.map(cell => {
    const block = node('div', null, 'cell-monitor');
    const readout = node('span', cell.label + '  ' + cell.scp);
    const bar = node('div', null, 'meter'), fill = node('i');
    bar.append(fill);
    block.append(readout, bar);
    $('hud-cells').append(block);
    return { block, readout, fill };
  });

  function updateHud() {
    const s = run, p = s.player, weapon = G.WEAPONS[p.weapon], arm = p.arms[p.weapon];
    text('hud-wave', s.endless ? G.pad(s.wave) : G.pad(s.wave) + ' / ' + G.FINAL_WAVE);
    text('hud-hostiles', G.pad(s.hostiles));
    text('hud-credits', G.fmt(s.credits));
    text('hud-score', G.fmt(s.score));
    const combo = $('hud-combo');
    combo.hidden = s.mult <= 1;
    if (s.mult > 1) text('hud-combo', 'x' + s.mult.toFixed(1));
    const slots = p.arms.map((a, i) => (a.owned ? (i === p.weapon ? 2 : 1) : 0)).join('');
    if (slots !== lastSlots) {
      lastSlots = slots;
      $('slots').replaceChildren(...p.arms.map((a, i) => {
        const el = node('span', String(i + 1));
        el.dataset.state = a.owned ? (i === p.weapon ? 'on' : 'owned') : 'none';
        return el;
      }));
    }
    for (const [i, c] of s.cells.entries()) {
      const { block, readout, fill } = monitors[i];
      const value = c.charge ? c.label + ' ' + c.charge.fuse.toFixed(1) : c.label + '  ' + c.scp;
      if (readout.textContent !== value) readout.textContent = value;
      block.dataset.state = c.charge ? 'alert' : c.hp > 0 ? 'intact' : 'breach';
      block.setAttribute('aria-label', t('cell') + ' ' + c.label + ' ' + (c.hp ? c.hp + '%' : t('hud_breached')));
      meter(fill, c.hp / 100);
    }
    const boss = s.enemies.find(e => e.boss && !e.dead);
    $('boss').hidden = !boss;
    if (boss) {
      text('boss-name', t('boss_' + boss.type));
      meter($('boss-meter'), boss.hp / boss.max);
    }
    $('banner').hidden = G.state !== 'play' || !s.banner || s.banner.until <= s.time;
    $('banner').classList.toggle('end', !!(s.banner && s.banner.end));
    $('banner').classList.toggle('clear', !!(s.banner && s.banner.title === 'wave_clear'));
    if (!$('banner').hidden) {
      text('banner-title', t(s.banner.title, s.banner.vars));
      text('banner-sub', t(s.banner.subtitle, s.banner.vars));
    }

    text('hp-value', Math.ceil(p.hp));
    text('armor-value', Math.ceil(p.armor));
    meter($('hp-meter'), p.hp / s.healthLimit);
    meter($('armor-meter'), p.armor / s.armorLimit);
    meter($('dash-meter'), 1 - p.dash / (2.9 * (1 - 0.25 * s.up.dash)));
    text('active-weapon', t('wpn_' + weapon.id));
    text('mag', G.pad(Math.floor(arm.mag)));
    text('reserve', weapon.regen ? '/ ' + weapon.mag : Number.isFinite(arm.reserve) ? '/ ' + arm.reserve : '/ ∞');
    text('weapon-status', arm.reload ? t('hud_reloading') : weapon.regen && arm.mag < 1 ? t('hud_charge') :
      !arm.mag && !arm.reserve ? t('hud_noammo') : '');
    meter($('weapon-meter'), arm.reload ? 1 - arm.reload / (weapon.reload * (1 - s.up.reload * 0.14)) : arm.mag / weapon.mag);

    const notes = s.notes.map(n => [t(n.key, n.vars), n.tone]);
    let cache = JSON.stringify(notes);
    if (cache !== lastNotes) {
      lastNotes = cache;
      $('notifications').replaceChildren(...notes.map(([value, tone]) => {
        const line = node('div', value);
        line.dataset.tone = tone;
        return line;
      }));
    }
    const pad = G.input.usingPad, touch = G.input.touch;
    const caps = { frag: pad ? 'LT' : 'G', scp500: pad ? 'Y' : 'Q', scp018: pad ? '◀' : 'F', scp207: pad ? '▶' : 'C', sentry: pad ? '▼' : 'X' };
    const items = Object.entries(s.inventory).map(([key, n]) => [key, t('it_' + key), n]);
    cache = JSON.stringify(items) + pad + touch;
    if (cache !== lastItems) {
      lastItems = cache;
      $('items').replaceChildren(...items.map(([key, label, count]) => {
        const chip = node('span', null, 'item-chip');
        if (!count) chip.dataset.empty = '';
        if (!touch) chip.append(node('kbd', caps[key]));
        chip.append(document.createTextNode(label), node('b', String(count)));
        return chip;
      }));
    }

    const msg = s.message && s.message.until > s.time ? s.message : null;
    $('radio').hidden = !msg;
    if (msg) {
      const from = t(msg.from), value = t(msg.key, msg.vars);
      if (value !== lastRadio) {
        lastRadio = value;
        text('radio-from', from);
        text('radio-message', value);
      }
    }

    const interaction = s.interaction;
    $('interaction').hidden = !interaction || G.state !== 'play';
    if (interaction) {
      let key = interaction.key;
      if (G.input.touch || G.input.usingPad) {
        const device = G.input.touch ? 'touch' : 'pad';
        if (key === 'w_defuse') key = device + '_defuse';
        if (key === 'w_ammo') key = device + '_resupply';
      }
      text('interaction-label', t(key));
      meter($('interaction-meter'), interaction.progress);
    }

    const hints = !G.settings.hints || s.wave > 2 || s.waveTime >= 21 ? [] : G.input.usingPad
      ? [['LS', 'hint_move'], ['RS / RT', 'hint_aim'], ['A', 'hint_dash_short'], ['X', 'hint_reload']]
      : s.wave === 1 ? [['WASD', 'hint_move'], ['LMB', 'hint_aim'], ['Space', 'hint_dash_short'], ['R', 'hint_reload']]
        : [['E', 'hint_defuse'], ['G', 'hint_grenade'], ['Q', 'hint_item']];
    cache = JSON.stringify(hints) + G.settings.lang;
    if (cache !== lastHints) {
      lastHints = cache;
      $('hints').replaceChildren(...hints.map(([key, hint]) => {
        const el = node('span');
        el.append(node('kbd', key), document.createTextNode(t(hint)));
        return el;
      }));
    }
  }

  on('begin', () => launch(false));
  on('endless', () => launch(true));
  on('language', () => setLanguage(G.settings.lang === 'zh' ? 'en' : 'zh'));
  on('brief-back', returnToMenu);
  on('deploy', deploy);
  on('manual-open', () => show('manual'));
  on('settings-open', () => { settingsFrom = 'menu'; show('settings', 'master'); });
  on('credits-open', () => show('credits'));
  on('pause-open', () => show('pause', 'resume'));
  on('resume', () => show('play'));
  on('abandon', returnToMenu);
  on('pause-settings', () => { settingsFrom = 'pause'; show('settings', 'master'); });
  on('next', next);
  on('retry', () => { selectedEndless = run.endless; deploy(); });
  on('continue', next);
  on('report-menu', returnToMenu);
  function closeOverlay(id) {
    if (id === 'settings' && settingsFrom === 'pause') show('pause', 'pause-settings');
    else show('menu', id === 'brief' ? 'begin' : id + '-open');
  }
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeOverlay(button.dataset.close)));
  document.querySelectorAll('input[name=difficulty]').forEach(input => input.addEventListener('change', () => {
    G.settings.difficulty = Number(input.value);
    G.saveSettings();
    refresh();
  }));
  document.querySelectorAll('[data-setting]').forEach(input => {
    const key = input.dataset.setting;
    if (input.type === 'checkbox') input.checked = G.settings[key];
    else input.value = G.settings[key];
    input.addEventListener('input', () => {
      G.settings[key] = input.type === 'checkbox' ? input.checked : Number(input.value);
      G.saveSettings();
      G.audio.setVolumes();
    });
  });
  $('set-language').addEventListener('change', (event) => setLanguage(event.target.value));
  document.addEventListener('click', event => {
    if (event.target.closest('.ui-layer button')) {
      G.audio.play('ui', { ui: true });
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'play') show('pause', 'resume');
  });
  window.addEventListener('blur', () => { if (G.state === 'play') show('pause', 'resume'); });

  function pauseOrBack() {
    const state = G.state;
    if (state === 'play') show('pause', 'resume');
    else if (state === 'pause') show('play');
    else if (['brief', 'settings', 'credits', 'manual'].includes(state)) closeOverlay(state);
  }

  // Inputs handle their own arrow keys and still allow Escape to close the current screen.
  document.addEventListener('keydown', event => {
    if (event.code === 'Escape' && event.target.matches('input, select')) pauseOrBack();
  });

  function gamepadMenu(input) {
    const active = $(G.state);
    if (!active) return;
    const buttons = Array.from(active.querySelectorAll('button:not(:disabled), input, select, a[href]'))
      .filter(el => !el.hidden && (el.offsetWidth > 0 || el.offsetHeight > 0));
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement);
    if (input.menuMove) buttons[(index + buttons.length + input.menuMove + (index < 0 && input.menuMove < 0 ? 1 : 0)) % buttons.length].focus();
    else if (input.menuSelect) (buttons[index] || buttons[0]).click();
    else if (input.menuBack) pauseOrBack();
  }

  let previous = 0;
  function frame(now) {
    const dt = Math.min(0.033, (now - (previous || now)) / 1000);
    previous = now;
    const p = run?.player || G.map.start;
    const input = G.input.poll(p.x, p.y, G.renderer.world);
    if (input.pause) pauseOrBack();
    else if (G.state !== 'play' && (input.menuMove || input.menuSelect || input.menuBack)) gamepadMenu(input);
    if (run) {
      if (G.state === 'play' && !input.pause) {
        run.update(dt, input);
        if (run.phase === 'armory') {
          category = 'weapons';
          show('armory', 'next');
        } else if (run.phase === 'finished') {
          const key = selectRecord(run.endless, run.diff.id);
          newBest = run.score > (record[key] || 0);
          if (newBest) {
            record[key] = run.score;
            G.store.set('records', record);
          }
          show('report', 'retry');
        } else updateHud();
      }
      G.renderer.frame(run, input, G.state === 'play' ? dt : 0);
    } else G.renderer.attract(dt);
    G.input.endFrame();
    window.requestAnimationFrame(frame);
  }

  Object.defineProperty(G, 'run', { get: () => run });
  G.show = show;
  G.input.setupTouch();
  show('menu');
  window.requestAnimationFrame(frame);
})();
