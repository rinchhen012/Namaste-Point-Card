// Firebase Messaging Service Worker

importScripts(
  "https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js"
);

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: self.FIREBASE_CONFIG.apiKey,
  authDomain: self.FIREBASE_CONFIG.authDomain,
  projectId: self.FIREBASE_CONFIG.projectId,
  storageBucket: self.FIREBASE_CONFIG.storageBucket,
  messagingSenderId: self.FIREBASE_CONFIG.messagingSenderId,
  appId: self.FIREBASE_CONFIG.appId,
  measurementId: self.FIREBASE_CONFIG.measurementId,
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification.title || "New Notification";
  const notificationOptions = {
    body: payload.notification.body || "",
    icon: payload.notification.icon || "/logo192.png",
    data: payload.data,
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// When user clicks on the notification
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click: ", event);

  event.notification.close();

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a window tab matching the targeted URL already exists, focus that;
        // The 'data' object here is what we passed in the 'data' field of the notification options
        const url =
          event.notification.data && event.notification.data.url
            ? event.notification.data.url
            : "/";

        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        // Otherwise, open a new tab to the applicable URL
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
