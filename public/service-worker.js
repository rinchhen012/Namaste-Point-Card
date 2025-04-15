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

// Listen for the SKIP_WAITING message
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Define common notification actions
const NOTIFICATION_ACTIONS = {
  POINTS_UPDATED: "points-updated",
  REWARD_EXPIRING: "reward-expiring",
  SPECIAL_OFFER: "special-offer",
};

// Listen for push notifications
self.addEventListener("push", (event) => {
  let notificationData;

  try {
    notificationData = event.data.json();
  } catch (e) {
    // If the data is not JSON, use it as text
    notificationData = {
      title: "Namaste Point Card",
      body: event.data.text(),
      url: "/",
    };
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || "icons/icon_x192.png",
    badge: notificationData.badge || "icons/badge_x72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: notificationData.id || Date.now(),
      url: notificationData.url || "/",
      action: notificationData.action,
    },
    // Add actions based on notification type
    actions: getNotificationActions(notificationData),
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || "Namaste Point Card",
      options
    )
  );
});

// Get actions buttons based on notification type
function getNotificationActions(data) {
  const actions = [];

  switch (data.action) {
    case NOTIFICATION_ACTIONS.POINTS_UPDATED:
      actions.push({
        action: "view-profile",
        title: "View Profile",
      });
      break;

    case NOTIFICATION_ACTIONS.REWARD_EXPIRING:
      actions.push({
        action: "view-reward",
        title: "View Reward",
      });
      break;

    case NOTIFICATION_ACTIONS.SPECIAL_OFFER:
      actions.push({
        action: "view-offer",
        title: "View Offer",
      });
      break;

    default:
      // Add a default action for all notifications
      actions.push({
        action: "open",
        title: "Open App",
      });
  }

  return actions;
}

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  notification.close();

  let url = notification.data.url || "/";

  // Handle action button clicks
  if (event.action) {
    switch (event.action) {
      case "view-profile":
        url = "/profile";
        break;

      case "view-reward":
        // If we have a specific reward ID, go to that, otherwise redemption history
        url = notification.data.rewardId
          ? `/redemption/${notification.data.rewardId}`
          : "/redemption-history";
        break;

      case "view-offer":
        url = notification.data.offerId
          ? `/coupons?highlight=${notification.data.offerId}`
          : "/coupons";
        break;
    }
  }

  // This handles both clicking the notification itself and clicking action buttons
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        // Find a client that's already open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];

          // If we find an existing window, focus it and navigate if needed
          if ("focus" in client) {
            client.focus();

            // If we need to change URL, navigate
            if (client.url.indexOf(url) === -1 && "navigate" in client) {
              return client.navigate(url);
            }

            return client;
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
