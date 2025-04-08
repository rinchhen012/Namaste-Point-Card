/* eslint-disable no-restricted-globals */

// This service worker can be customized as needed for specific project requirements.
// It uses Workbox for caching strategies.

importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js"
);

// Precache static assets
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Cache the Google Fonts stylesheets with a stale-while-revalidate strategy.
workbox.routing.registerRoute(
  /^https:\/\/fonts\.googleapis\.com/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "google-fonts-stylesheets",
  })
);

// Cache the underlying font files with a cache-first strategy for 1 year.
workbox.routing.registerRoute(
  /^https:\/\/fonts\.gstatic\.com/,
  new workbox.strategies.CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30,
      }),
    ],
  })
);

// Cache images
workbox.routing.registerRoute(
  /\.(?:png|gif|jpg|jpeg|webp|svg)$/,
  new workbox.strategies.CacheFirst({
    cacheName: "images",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Cache JavaScript and CSS
workbox.routing.registerRoute(
  /\.(?:js|css)$/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "static-resources",
  })
);

// Default route - NetworkFirst for HTML
workbox.routing.registerRoute(
  ({ request }) => request.mode === "navigate",
  new workbox.strategies.NetworkFirst({
    cacheName: "pages",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
      }),
    ],
  })
);

// Cache API responses with NetworkFirst
workbox.routing.registerRoute(
  new RegExp("/api/"),
  new workbox.strategies.NetworkFirst({
    cacheName: "api-responses",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Handle offline fallback
const FALLBACK_HTML_URL = "/offline.html";
self.addEventListener("install", (event) => {
  const files = [FALLBACK_HTML_URL];
  event.waitUntil(
    self.caches
      .open("offline-fallbacks")
      .then((cache) => cache.addAll(files))
      .then(() => self.skipWaiting())
  );
});

// When a fetch fails (e.g., user is offline), serve the offline page for navigate requests
workbox.routing.setCatchHandler(({ event }) => {
  if (event.request.mode === "navigate") {
    return caches.match(FALLBACK_HTML_URL);
  }
  return Response.error();
});

// Listen for push notifications
self.addEventListener("push", (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "icons/icon_x192.png",
    badge: "icons/badge_x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Namaste Point Card",
      options
    )
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          // If so, just focus it.
          if (client.url === event.notification.data.url && "focus" in client) {
            return client.focus();
          }
        }
        // If not, then open a new window/tab with the URL
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});
