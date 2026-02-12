/*
  Y-Sight service worker
  - Cache-first for core shell
  - Network-first for everything else (with cache fallback)

  Bump CACHE_VERSION when you change any core asset.
*/

const CACHE_VERSION = "v1";
const CORE_CACHE = `y-sight-core-${CACHE_VERSION}`;

// Keep this list small and stable.
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js",
  "./404.html",
  "./robots.txt",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("y-sight-") && k !== CORE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only same-origin.
  if (url.origin !== self.location.origin) return;

  // Cache-first for core assets.
  if (CORE_ASSETS.some((p) => url.pathname.endsWith(p.replace("./", "")))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Network-first for everything else.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CORE_CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
