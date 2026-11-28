import { audio } from './audio';
import { restoreSettings } from './core';
import { createInput } from './input';
import { map } from './map';
import { startPwa } from './pwa';
import { createRenderer } from './render';
import type { RuntimeSession } from './session';
import { mountUi } from './ui';

export function startGame(canvas: HTMLCanvasElement, radar: HTMLCanvasElement) {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  const session: RuntimeSession = { state: 'menu' };
  let requestedFrame = 0;

  window.addEventListener('pagehide', event => {
    if (!event.persisted) lifetime.abort();
  }, { signal });
  signal.addEventListener('abort', () => window.cancelAnimationFrame(requestedFrame), { once: true });

  try {
    restoreSettings();
    audio.attach(signal);
    const controls = createInput(session, signal);
    map.loadArtwork(signal);
    const renderer = createRenderer(canvas, radar, session, controls, signal);
    const ui = mountUi(session, controls, renderer, signal);
    startPwa(session, signal);

    let previous = 0;
    const frame = (now: number) => {
      if (signal.aborted) return;
      const dt = Math.min(0.033, (now - (previous || now)) / 1000);
      previous = now;
      const position = ui.run?.player ?? map.start;
      const input = controls.poll(position.x, position.y, renderer.world);
      ui.update(dt, input);
      const run = ui.run;
      if (run) renderer.frame(run, input, session.state === 'play' ? dt : 0);
      else renderer.attract(dt);
      controls.endFrame();
      requestedFrame = window.requestAnimationFrame(frame);
    };

    requestedFrame = window.requestAnimationFrame(frame);
  } catch (error) {
    lifetime.abort();
    throw error;
  }
}
