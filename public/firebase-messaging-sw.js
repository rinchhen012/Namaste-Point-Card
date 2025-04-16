// DISABLED Firebase Messaging Service Worker
// This is a placeholder service worker file while notifications are disabled

console.log(
  "[firebase-messaging-sw.js] Notifications are temporarily disabled"
);

// Basic service worker lifecycle events to ensure proper registration
self.addEventListener("install", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker installed");
  self.skipWaiting(); // Activate immediately
});

self.addEventListener("activate", (event) => {
  console.log(
    "[firebase-messaging-sw.js] Service Worker activated - Notifications disabled"
  );
  event.waitUntil(clients.claim()); // Take control of all clients
});

// Add fetch handler to prevent unhandled promise rejections
self.addEventListener("fetch", (event) => {
  // Just let the browser handle the request normally
});

// Notification click handler that does nothing
self.addEventListener("notificationclick", (event) => {
  console.log(
    "[firebase-messaging-sw.js] Notification click received (notifications disabled)"
  );

  if (event.notification) {
    event.notification.close();
  }
});

// Message handler that logs but does nothing
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    console.log(
      "[firebase-messaging-sw.js] Received Firebase config but notifications are disabled"
    );
  }
});
