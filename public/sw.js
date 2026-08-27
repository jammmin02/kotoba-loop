// Minimal service worker: caches static assets only (icons, hashed build
// output) so the installed app's shell keeps working with a flaky
// connection. Deliberately does NOT cache API responses or RSC/page
// payloads — offline study-data sync is out of scope (PROMPT 56).
const CACHE_NAME = "kotoba-loop-static-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Full page loads: try the network first, fall back to a cached offline
  // page when there's no connection. Never intercept RSC/data fetches.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((res) => res ?? Response.error())),
    );
    return;
  }

  // Static, content-hashed assets: serve from cache when present (and refresh
  // it in the background); otherwise fetch from the network and cache it.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const putInCache = (res) => {
          if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
          return res;
        };
        if (cached) {
          fetch(request).then(putInCache).catch(() => {});
          return cached;
        }
        return fetch(request).then(putInCache);
      }),
    );
  }
});
