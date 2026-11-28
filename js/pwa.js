"use strict";
/* Generated browser script from src/pwa.ts. Edit the TypeScript source. */
(() => {
    if (!window.isSecureContext || !/^https?:$/.test(location.protocol) || !('serviceWorker' in navigator))
        return;
    const install = document.querySelector('#install-game');
    const update = document.querySelector('#update-game');
    const iosHint = document.getElementById('ios-install');
    const status = document.getElementById('offline-status');
    const settings = document.querySelector('.pwa-settings');
    if (!install || !update || !iosHint || !status || !settings)
        return;
    const standalone = window.matchMedia('(display-mode: standalone)');
    let installPrompt = null;
    let installed = false;
    let registration;
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
    });
    window.addEventListener('appinstalled', () => {
        installed = true;
        installPrompt = null;
        showInstallOptions();
    });
    standalone.addEventListener?.('change', showInstallOptions);
    install.addEventListener('click', async () => {
        const prompt = installPrompt;
        if (!prompt)
            return;
        installPrompt = null;
        showInstallOptions();
        try {
            await prompt.prompt();
        }
        catch {
            // A browser can withdraw an install offer before the click reaches it.
        }
    });
    const showOfflineStatus = (key) => {
        status.dataset.i18n = key;
        status.textContent = G.t(key);
    };
    const syncRegistration = () => {
        if (!registration)
            return;
        update.hidden = !registration.waiting || !registration.active;
        if (registration.active)
            showOfflineStatus('pwa_ready');
        else if (registration.installing || registration.waiting)
            showOfflineStatus('pwa_preparing');
        else
            showOfflineStatus('pwa_unavailable');
    };
    const watchWorker = () => {
        registration?.installing?.addEventListener('statechange', syncRegistration);
        syncRegistration();
    };
    update.addEventListener('click', () => {
        if (!registration?.waiting || G.state !== 'menu')
            return;
        applyingUpdate = true;
        update.disabled = true;
        registration.waiting.postMessage('APPLY_UPDATE');
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (applyingUpdate && G.state === 'menu')
            location.reload();
        applyingUpdate = false;
        update.disabled = false;
        if (registration)
            syncRegistration();
    });
    settings.hidden = false;
    showInstallOptions();
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
        registration = reg;
        registration.addEventListener('updatefound', watchWorker);
        watchWorker();
    }).catch(() => showOfflineStatus('pwa_unavailable'));
})();
