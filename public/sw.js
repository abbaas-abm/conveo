// Minimal service worker. Its presence (with a fetch handler) is required by
// Chrome/Android for the "Add to Home Screen" install prompt to appear. It does
// no caching, so it never serves stale content.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally a pass-through: let the network handle every request.
});
