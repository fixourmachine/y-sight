/*
  Y-Sight service worker
  - Cache-first for core shell
  - Network-first for everything else (with cache fallback)

  Bump CACHE_VERSION when you change any core asset.
*/

// Bump this on every deploy that changes *any* cached asset.
// Consider setting it to a date stamp like "2026-02-15-1".
const CACHE_VERSION = "v2";
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

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");

  // 1) Navigations / HTML: NETWORK-FIRST to prevent stale app shell winning.
  //    Fallback to cached index.html when offline.
  if (isHTML) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CORE_CACHE);
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          if (fresh && fresh.ok) {
            // Cache the latest HTML so offline still works.
            cache.put("./index.html", fresh.clone());
          }
          return fresh;
        } catch (e) {
          return (
            (await cache.match("./index.html")) ||
            (await caches.match("./index.html"))
          );
        }
      })()
    );
    return;
  }

  // 2) Cache-first for core static assets (icons, manifest, etc.)
  //    If not cached yet, fetch and populate cache.
  const isCoreAsset = CORE_ASSETS.some((p) => url.pathname.endsWith(p.replace("./", "")));
  if (isCoreAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(CORE_CACHE);
          cache.put(req, res.clone());
        }
        return res;
      })()
    );
    return;
  }

  // 3) Everything else: NETWORK-FIRST with cache fallback.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CORE_CACHE);
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return (await cache.match(req)) || (await caches.match(req));
      }
    })()
  );
});
