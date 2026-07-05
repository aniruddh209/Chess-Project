const CACHE_NAME = "chessplay-v1";
const ASSETS = [
  "/",
  "/css/style.css",
  "/js/chessgame.js",
  "/vendor/chess.js",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Only intercept GET requests and exclude socket/api calls
  if (e.request.method !== "GET" || e.request.url.includes("/socket.io/") || e.request.url.includes("/api/")) {
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {});
    })
  );
});
