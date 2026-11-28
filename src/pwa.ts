import * as translations from './i18n';
import type { RuntimeSession } from './session';

export function startPwa(session: RuntimeSession, signal: AbortSignal) {
  if (import.meta.env.DEV || !window.isSecureContext || !/^https?:$/.test(location.protocol) || !('serviceWorker' in navigator)) return;

  const install = document.querySelector<HTMLButtonElement>('#install-game');
  const update = document.querySelector<HTMLButtonElement>('#update-game');
  const iosHint = document.getElementById('ios-install');
  const status = document.getElementById('offline-status');
  const settings = document.querySelector<HTMLElement>('.pwa-settings');
  if (!install || !update || !iosHint || !status || !settings) return;
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installPrompt: BeforeInstallPromptEvent | null = null;
  let installed = false;
  let registration: ServiceWorkerRegistration | undefined;
  let applyingUpdate = false;

  const showInstallOptions = () => {
    const inApp = installed || standalone.matches || navigator.standalone === true;
    install.hidden = inApp || !installPrompt;
    iosHint.hidden = inApp || !!installPrompt || navigator.standalone !== false;
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    showInstallOptions();
  }, { signal });
  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    showInstallOptions();
  }, { signal });
  standalone.addEventListener?.('change', showInstallOptions, { signal });
  install.addEventListener('click', async () => {
    const prompt = installPrompt;
    if (!prompt) return;
    installPrompt = null;
    showInstallOptions();
    try {
      await prompt.prompt();
    } catch {
      // A browser can withdraw an install offer before the click reaches it.
    }
  }, { signal });

  const showOfflineStatus = (key: 'pwa_ready' | 'pwa_preparing' | 'pwa_unavailable') => {
    status.dataset.i18n = key;
    status.textContent = translations.t(key);
  };

  const syncRegistration = () => {
    if (!registration) return;
    update.hidden = !registration.waiting || !registration.active;
    if (registration.active) showOfflineStatus('pwa_ready');
    else if (registration.installing || registration.waiting) showOfflineStatus('pwa_preparing');
    else showOfflineStatus('pwa_unavailable');
  };

  const watchWorker = () => {
    registration?.installing?.addEventListener('statechange', syncRegistration, { signal });
    syncRegistration();
  };

  update.addEventListener('click', () => {
    if (!registration?.waiting || session.state !== 'menu') return;
    applyingUpdate = true;
    update.disabled = true;
    registration.waiting.postMessage('APPLY_UPDATE');
  }, { signal });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applyingUpdate && session.state === 'menu') location.reload();
    applyingUpdate = false;
    update.disabled = false;
    if (registration) syncRegistration();
  }, { signal });

  settings.hidden = false;
  showInstallOptions();
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
    if (signal.aborted) return;
    registration = reg;
    registration.addEventListener('updatefound', watchWorker, { signal });
    watchWorker();
  }).catch(() => { if (!signal.aborted) showOfflineStatus('pwa_unavailable'); });
}
