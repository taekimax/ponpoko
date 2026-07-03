const CACHE_VERSION = "2026-07-04-new-games-v1";
const STATIC_CACHE = `ponpoko-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ponpoko-runtime-${CACHE_VERSION}`;
const APP_SHELL = [
  "/ponpoko/",
  "/ponpoko/index.html",
  "/ponpoko/manifest.webmanifest"
];
const CACHE_FIRST_PREFIXES = [
  "/ponpoko/assets/",
  "/ponpoko/emulatorjs/",
  "/ponpoko/roms/",
  "/ponpoko/states/",
  "/ponpoko/thumbs/"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const expectedCaches = new Set([STATIC_CACHE, RUNTIME_CACHE]);
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith("ponpoko-") && !expectedCaches.has(cacheName))
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (CACHE_FIRST_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? Response.error();
  }
}
