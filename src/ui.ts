import { audio } from './audio';
import * as core from './core';
import type { Language } from './core';
import * as data from './data';
import type { DifficultyId, ItemId, ShopCategory } from './data';
import { fx as effects } from './fx';
import { Operation } from './game';
import * as translations from './i18n';
import type { InputSnapshot, InputState } from './input';
import { map as siteMap } from './map';
import type { createRenderer } from './render';
import type { RuntimeSession, Screen } from './session';

type ManualTab = 'controls' | 'hostiles' | 'anomalies';
interface SpecialElements {
  'set-language': HTMLSelectElement;
  safe: HTMLInputElement; euclid: HTMLInputElement; keter: HTMLInputElement;
}


export function mountUi(session: RuntimeSession, controls: InputState, renderer: ReturnType<typeof createRenderer>, signal: AbortSignal) {
  function $<Id extends string>(id: Id): Id extends keyof SpecialElements ? SpecialElements[Id] : HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error('Missing element ' + id);
    return el as Id extends keyof SpecialElements ? SpecialElements[Id] : HTMLElement;
  }
  const on = (id: string, fn: () => void) => $(id).addEventListener('click', fn, { signal });
  const t = translations.t;
  const screens = Array.from(document.querySelectorAll<HTMLElement>('.screen'));
  const meter = (el: HTMLElement, value: number) => { el.style.width = core.clamp(value * 100, 0, 100) + '%'; };
  const text = (id: string, value: string | number) => {
    const el = $(id);
    const content = String(value);
    if (el.textContent !== content) el.textContent = content;
  };
  let run: Operation | null = null;
  let selectedEndless = false, settingsFrom: 'menu' | 'pause' = 'menu', manualTab: ManualTab = 'controls', category: ShopCategory = 'weapons';
  const record: Record<string, number> = {};
  const savedRecords = core.store.get('records', null);
  if (savedRecords && typeof savedRecords === 'object') {
    for (const [key, value] of Object.entries(savedRecords) as [string, unknown][]) {
      if (typeof value === 'number' && Number.isFinite(value)) record[key] = value;
    }
  }
  let newBest = false;
  let lastNotes = '', lastItems = '', lastHints = '', lastRadio = '', lastSlots = '';
  const selectRecord = (endless: boolean, difficulty: DifficultyId) => (endless ? 'endless_' : 'operation_') + difficulty;

  function node<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, value?: string | number | null, className?: string) {
    const el = document.createElement(tag);
    if (value != null) el.textContent = String(value);
    if (className) el.className = className;
    return el;
  }

  function show(state: Screen, focus?: string) {
    const from = session.state;
    session.state = state;
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
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      if (from === 'pause' && run) {
        audio.setMusic(run.def.boss ? 3 : 2);
        audio.siren(run.cells.some(c => c.charge));
      }
    } else {
      controls.resetTouch();
      if (state === 'pause') {
        audio.setMusic(1);
        audio.siren(false);
      }
      const target = focus ? $(focus) : active?.querySelector('button');
      target?.focus({ preventScroll: true });
    }
    refresh();
  }

  function refresh() {
    translations.applyI18n();
    text('language', core.settings.lang === 'zh' ? 'English' : '简体中文');
    $('set-language').value = core.settings.lang;
    const difficulty = data.DIFFS[core.settings.difficulty] || data.DIFFS[1];
    $(difficulty.id).checked = true;
    text('difficulty-description', t('diff_' + difficulty.id + '_d'));
    const best = Math.max(record[selectRecord(false, difficulty.id)] || 0, record[selectRecord(true, difficulty.id)] || 0);
    text('best', best ? core.fmt(best) : t('best_none'));
    document.title = t('title_site') + ' ' + t('title_main');
    if (session.state === 'brief') {
      text('brief-mode', t(selectedEndless ? 'brief_p3e' : 'brief_p3'));
      text('brief-objective', t(selectedEndless ? 'brief_o1e' : 'brief_o1'));
    }
    if (session.state === 'manual') drawManual();
    if (session.state === 'armory') drawArmory();
    if (session.state === 'report') drawReport();
    if (run) updateHud();
  }

  function launch(endless: boolean) {
    audio.init();
    selectedEndless = endless;
    show('brief', 'deploy');
  }

  function deploy() {
    audio.init();
    run = new Operation(selectedEndless, core.settings.difficulty);
    renderer.snap(run.player);
    show('play');
  }

  function returnToMenu() {
    run = null;
    siteMap.reset();
    effects.reset();
    audio.siren(false);
    audio.setMusic(0);
    show('menu', 'begin');
  }

  function next() {
    if (!run) return;
    if (session.state === 'report') {
      run.endless = true;
      run.player.hp = Math.min(run.healthLimit, run.player.hp + 24);
      run.player.armor = Math.min(run.armorLimit, run.player.armor + 18);
      run.resupply(0.35);
    }
    run.nextWave();
    show('play');
  }

  function setLanguage(lang: Language) {
    core.settings.lang = lang;
    core.saveSettings();
    refresh();
  }

  function tabs<K extends string>(id: string, entries: readonly (readonly [K, string])[], active: K, select: (key: K) => void) {
    const slot = $(id);
    const previouslyFocused = slot.contains(document.activeElement);
    slot.replaceChildren(...entries.map(([key, title]) => {
      const button = node('button', t(title));
      button.type = 'button';
      button.setAttribute('aria-pressed', String(key === active));
      button.addEventListener('click', () => select(key));
      return button;
    }));
    if (previouslyFocused) slot.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }

  function drawManual() {
    tabs('manual-tabs', (['controls', 'hostiles', 'anomalies'] as const).map(key => [key, 'man_' + key] as const), manualTab,
      (key) => { manualTab = key; drawManual(); });
    const content = $('manual-content');
    content.replaceChildren();
    if (manualTab === 'controls') {
      const keys = [
        ['move', 'W A S D'], ['aim', core.settings.lang === 'zh' ? '鼠标与左键' : 'Mouse and left click'],
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
      ? Object.keys(data.ENEMY).filter(key => key !== 'pylon' && key !== 'zombie').map(key => 'h_' + key)
      : ['173', '049', '106', '500', '018', '207'].map(key => 'an_' + key);
    for (const key of keys) {
      const article = node('article', null, 'manual-card');
      const alias = translations.STR.en[key + '_n'] ? '  ' + t(key + '_n') : '';
      article.append(node('h3', t(key) + alias), node('p', t(key + '_d')));
      cards.append(article);
    }
    content.append(cards);
  }

  function stats(id: string, values: readonly (readonly [string, number | string])[]) {
    $(id).replaceChildren(...values.map(([name, value]) => {
      const block = node('div');
      block.append(node('span', t(name)), node('strong', value));
      return block;
    }));
  }

  function drawArmory() {
    const current = run;
    if (!current) return;
    text('arm-cleared', t('arm_cleared', { n: current.wave }));
    text('arm-credits', core.fmt(current.credits));
    const shots = current.shots - current.waveShots;
    stats('arm-stats', [
      ['arm_kills', current.kills - current.waveKills], ['arm_acc', (shots ? Math.round((current.hits - current.waveHits) / shots * 100) : 0) + '%'],
      ['arm_bonus', '+' + core.fmt(current.bonus)], ['arm_cells', current.intact + ' / 3'],
    ]);
    tabs('arm-tabs', data.SHOP_CATS.map(key => [key, 'cat_' + key] as const), category, key => { category = key; drawArmory(); });
    text('arm-loadout', t('arm_loadout') + '  ' + current.player.arms.flatMap((arm, i) => arm.owned ? [t('wpn_' + data.WEAPONS[i].id)] : []).join('  ·  '));
    const shelf = $('arm-items');
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && shelf.contains(active) ? active.dataset.buy : null;
    shelf.replaceChildren(...data.SHOP.filter(e => e.cat === category).map(entry => {
      const article = node('article');
      const title = t('sh_' + entry.id);
      const label = entry.kind === 'repair' ? t('sh_r_d', { s: current.cells[entry.cell].scp }) : t('sh_' + entry.id + '_d');
      const cost = current.price(entry);
      const availability = cost === null
        ? t(entry.kind === 'weapon' ? 'arm_owned' : entry.kind === 'upgrade' ? 'arm_maxed' : 'arm_full')
        : core.fmt(cost);
      const detail = entry.kind === 'upgrade' ? t('arm_lv', { n: current.up[entry.up] }) :
        entry.kind === 'item' ? current.inventory[entry.item] + ' / ' + entry.max :
        entry.kind === 'repair' ? current.cells[entry.cell].hp + '%' : '';
      const description = node('div');
      description.append(node('h3', title), node('p', label));
      const buy = node('button', availability, 'secondary');
      buy.type = 'button';
      buy.disabled = cost === null || current.credits < cost;
      buy.dataset.buy = entry.id;
      buy.setAttribute('aria-label', cost === null ? title + ' ' + availability : t('arm_purchase', { item: title }) + ' ' + availability);
      buy.addEventListener('click', () => { if (current.buy(entry)) { drawArmory(); updateHud(); } });
      const footer = node('footer');
      footer.append(node('span', detail), buy);
      article.append(description, footer);
      return article;
    }));
    if (focused) {
      const target = Array.from(shelf.querySelectorAll('button')).find(button => button.dataset.buy === focused && !button.disabled);
      (target || $('arm-tabs').querySelector<HTMLElement>('[aria-pressed="true"]'))?.focus({ preventScroll: true });
    }
  }

  function drawReport() {
    const current = run;
    if (!current) return;
    text('result', t('end_' + current.result));
    text('result-story', t(current.result === 'win' && current.intact < 3 ? 'end_partial' : 'end_' + current.result + '_d'));
    $('result-endless').hidden = !current.endless;
    text('result-endless', current.endless ? t('end_endless_d', { n: current.wave }) : '');
    $('new-record').hidden = !newBest;
    $('continue').hidden = current.result !== 'win' || current.endless;
    stats('result-stats', [
      ['end_score', core.fmt(current.score)], ['end_wave', current.wave], ['end_kills', current.kills],
      ['end_acc', current.accuracy + '%'], ['end_cells', current.intact + ' / 3'], ['end_time', core.fmtTime(current.time)],
    ]);
  }

  const monitors = siteMap.cells.map(cell => {
    const block = node('div', null, 'cell-monitor');
    const readout = node('span', cell.label + '  ' + cell.scp);
    const bar = node('div', null, 'meter'), fill = node('i');
    bar.append(fill);
    block.append(readout, bar);
    $('hud-cells').append(block);
    return { block, readout, fill };
  });

  function updateHud() {
    const s = run;
    if (!s) return;
    const p = s.player, weapon = data.WEAPONS[p.weapon], arm = p.arms[p.weapon];
    text('hud-wave', s.endless ? core.pad(s.wave) : core.pad(s.wave) + ' / ' + data.FINAL_WAVE);
    text('hud-hostiles', core.pad(s.hostiles));
    text('hud-credits', core.fmt(s.credits));
    text('hud-score', core.fmt(s.score));
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
    $('banner').hidden = session.state !== 'play' || !s.banner || s.banner.until <= s.time;
    $('banner').classList.toggle('end', !!(s.banner && s.banner.end));
    $('banner').classList.toggle('clear', !!(s.banner && s.banner.title === 'wave_clear'));
    if (!$('banner').hidden && s.banner) {
      text('banner-title', t(s.banner.title, s.banner.vars));
      text('banner-sub', t(s.banner.subtitle, s.banner.vars));
    }

    text('hp-value', Math.ceil(p.hp));
    text('armor-value', Math.ceil(p.armor));
    meter($('hp-meter'), p.hp / s.healthLimit);
    meter($('armor-meter'), p.armor / s.armorLimit);
    meter($('dash-meter'), 1 - p.dash / (2.9 * (1 - 0.25 * s.up.dash)));
    text('active-weapon', t('wpn_' + weapon.id));
    text('mag', core.pad(Math.floor(arm.mag)));
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
    const pad = controls.usingPad, touch = controls.touch;
    const caps: Record<ItemId, string> = { frag: pad ? 'LT' : 'G', scp500: pad ? 'Y' : 'Q', scp018: pad ? '◀' : 'F', scp207: pad ? '▶' : 'C', sentry: pad ? '▼' : 'X' };
    const items = (Object.entries(s.inventory) as [ItemId, number][]).map(([key, n]) => [key, t('it_' + key), n] as const);
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
    $('interaction').hidden = !interaction || session.state !== 'play';
    if (interaction) {
      let key = interaction.key;
      if (controls.touch || controls.usingPad) {
        const device = controls.touch ? 'touch' : 'pad';
        if (key === 'w_defuse') key = device + '_defuse';
        if (key === 'w_ammo') key = device + '_resupply';
      }
      text('interaction-label', t(key));
      meter($('interaction-meter'), interaction.progress);
    }

    const hints = !core.settings.hints || s.wave > 2 || s.waveTime >= 21 ? [] : controls.usingPad
      ? [['LS', 'hint_move'], ['RS / RT', 'hint_aim'], ['A', 'hint_dash_short'], ['X', 'hint_reload']]
      : s.wave === 1 ? [['WASD', 'hint_move'], ['LMB', 'hint_aim'], ['Space', 'hint_dash_short'], ['R', 'hint_reload']]
        : [['E', 'hint_defuse'], ['G', 'hint_grenade'], ['Q', 'hint_item']];
    cache = JSON.stringify(hints) + core.settings.lang;
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
  on('language', () => setLanguage(core.settings.lang === 'zh' ? 'en' : 'zh'));
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
  on('retry', () => { if (run) { selectedEndless = run.endless; deploy(); } });
  on('continue', next);
  on('report-menu', returnToMenu);
  function closeOverlay(id: Screen) {
    if (id === 'settings' && settingsFrom === 'pause') show('pause', 'pause-settings');
    else show('menu', id === 'brief' ? 'begin' : id + '-open');
  }
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.close;
    if (id === 'settings' || id === 'credits' || id === 'manual' || id === 'brief') closeOverlay(id);
  }, { signal }));
  document.querySelectorAll<HTMLInputElement>('input[name=difficulty]').forEach(input => input.addEventListener('change', () => {
    core.settings.difficulty = Number(input.value);
    core.saveSettings();
    refresh();
  }, { signal }));
  document.querySelectorAll<HTMLInputElement>('[data-setting]').forEach(input => {
    const key = input.dataset.setting;
    if (key === 'dmgNums' || key === 'hints') {
      input.checked = core.settings[key];
      input.addEventListener('input', () => { core.settings[key] = input.checked; core.saveSettings(); }, { signal });
    } else if (key === 'master' || key === 'music' || key === 'sfx' || key === 'shake') {
      input.value = String(core.settings[key]);
      input.addEventListener('input', () => {
        core.settings[key] = Number(input.value);
        core.saveSettings();
        audio.setVolumes();
      }, { signal });
    }
  });
  $('set-language').addEventListener('change', () => {
    const value = $('set-language').value;
    if (value === 'en' || value === 'zh') setLanguage(value);
  }, { signal });
  document.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('.ui-layer button')) {
      audio.play('ui', { ui: true });
    }
  }, { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && session.state === 'play') show('pause', 'resume');
  }, { signal });
  window.addEventListener('blur', () => { if (session.state === 'play') show('pause', 'resume'); }, { signal });

  function pauseOrBack() {
    const state = session.state;
    if (state === 'play') show('pause', 'resume');
    else if (state === 'pause') show('play');
    else if (state === 'brief' || state === 'settings' || state === 'credits' || state === 'manual') closeOverlay(state);
  }

  // Inputs handle their own arrow keys and still allow Escape to close the current screen.
  document.addEventListener('keydown', event => {
    if (event.code === 'Escape' && event.target instanceof Element && event.target.matches('input, select')) pauseOrBack();
  }, { signal });

  function gamepadMenu(input: InputSnapshot) {
    const active = document.getElementById(session.state);
    if (!active) return;
    const buttons = Array.from(active.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, a[href]'))
      .filter(el => !el.hidden && (el.offsetWidth > 0 || el.offsetHeight > 0));
    if (!buttons.length) return;
    const focused = document.activeElement;
    const index = focused instanceof HTMLElement ? buttons.indexOf(focused) : -1;
    if (input.menuMove) buttons[(index + buttons.length + input.menuMove + (index < 0 && input.menuMove < 0 ? 1 : 0)) % buttons.length].focus();
    else if (input.menuSelect) (buttons[index] || buttons[0]).click();
    else if (input.menuBack) pauseOrBack();
  }

  function update(dt: number, input: InputSnapshot) {
    if (input.pause) pauseOrBack();
    else if (session.state !== 'play' && (input.menuMove || input.menuSelect || input.menuBack)) gamepadMenu(input);
    if (run) {
      if (session.state === 'play' && !input.pause) {
        run.update(dt, input);
        if (run.phase === 'armory') {
          category = 'weapons';
          show('armory', 'next');
        } else if (run.phase === 'finished') {
          const key = selectRecord(run.endless, run.diff.id);
          newBest = run.score > (record[key] || 0);
          if (newBest) {
            record[key] = run.score;
            core.store.set('records', record);
          }
          show('report', 'retry');
        } else updateHud();
      }
    }
  }

  show('menu');
  return { update, get run() { return run; } };
}
