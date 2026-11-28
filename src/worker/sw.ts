// Filled from the production build so each release preloads its own complete asset set.
declare const __SITE109_REVISION__: string;
declare const __SITE109_ASSETS__: readonly string[];
// The browser registers this script as a service worker. TypeScript's self covers all worker kinds.
const worker = self as unknown as ServiceWorkerGlobalScope;
const scope = worker.registration.scope;
const prefix = 'site109-offline:' + encodeURIComponent(scope) + ':';
const cacheName = prefix + __SITE109_REVISION__;
const entry = new URL('index.html', scope).href;
const assets = new Set(__SITE109_ASSETS__.map(path => new URL(path, scope).href));

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
