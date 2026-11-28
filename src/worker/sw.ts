/* Generated service worker from src/worker/sw.ts. Edit the TypeScript source. */

// Bump the release whenever a cached file changes. Keep each installation isolated by scope.
// The browser registers this script as a service worker. TypeScript's self covers all worker kinds.
const worker = self as unknown as ServiceWorkerGlobalScope;
const scope = worker.registration.scope;
const prefix = 'site109-offline:' + encodeURIComponent(scope) + ':';
const cacheName = prefix + '8';
const entry = new URL('index.html', scope).href;
const assets = new Set([
  'index.html', 'manifest.webmanifest', 'css/main.css',
  'js/core.js', 'js/data.js', 'js/i18n.js', 'js/pwa.js', 'js/audio.js', 'js/input.js',
  'js/map.js', 'js/fx.js', 'js/game.js', 'js/combat.js', 'js/enemy-ai.js', 'js/threats.js',
  'js/art.js', 'js/render.js', 'js/ui.js',
  'icons/seal.svg', 'icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'fonts/chakra-petch/500.woff2', 'fonts/chakra-petch/600.woff2', 'fonts/chakra-petch/700.woff2',
  'fonts/ibm-plex-mono/400.woff2', 'fonts/ibm-plex-mono/500.woff2', 'fonts/ibm-plex-mono/600.woff2',
].map(path => new URL(path, scope).href));

worker.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(Array.from(assets, url => new Request(url, { cache: 'reload' })));
  })());
});

worker.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const outdated = (await caches.keys()).filter(name => name.startsWith(prefix) && name !== cacheName);
    await Promise.all(outdated.map(name => caches.delete(name)));
    await worker.clients.claim();
  })());
});

worker.addEventListener('message', event => {
  if (event.data === 'APPLY_UPDATE') event.waitUntil(worker.skipWaiting());
});

async function serve(url: string, request: Request): Promise<Response> {
  const cached = await caches.match(url, { cacheName }).catch(() => undefined);
  return cached || fetch(request);
}

worker.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== worker.location.origin) return;
  url.search = '';
  url.hash = '';
  if (request.mode === 'navigate' && (url.href === scope || url.href === entry)) {
    event.respondWith(serve(entry, request));
  } else if (assets.has(url.href)) {
    event.respondWith(serve(url.href, request));
  }
});
