// This service worker registration code is based on create-react-app's PWA template
// with modifications for Vite and TypeScript

// Check if the service worker is supported in the browser
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onNotificationPermissionChange?: (permission: NotificationPermission) => void;
  enabledNotifications?: boolean;
};

// Store the update handler so we can use it outside the register function
let updateCallback: ((registration: ServiceWorkerRegistration) => void) | null = null;

// This function is used to notify new content is available
export function applyUpdate() {
  if (window.serviceWorkerRegistration) {
    const registrationWaiting = window.serviceWorkerRegistration.waiting;

    if (registrationWaiting) {
      registrationWaiting.postMessage({ type: 'SKIP_WAITING' });
      registrationWaiting.addEventListener('statechange', (e) => {
        if ((e.target as ServiceWorker).state === 'activated') {
          window.location.reload();
        }
      });
    }
  }
}

export function register(config?: Config): void {
  if ('serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW
    const publicUrl = new URL(import.meta.env.BASE_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Our service worker won't work if BASE_URL is on a different origin
      // from what our page is served on. This might happen if a CDN is used.
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;

      // Save the update callback for external use
      if (config && config.onUpdate) {
        updateCallback = config.onUpdate;
      }

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        navigator.serviceWorker.ready.then((registration) => {
          console.log(
            'This web app is being served cache-first by a service worker.'
          );

          // Handle notification permission changes when requested
          if (config?.enabledNotifications && 'Notification' in window) {
            const permissionState = Notification.permission;

            if (config.onNotificationPermissionChange) {
              config.onNotificationPermissionChange(permissionState);
            }

            // Listen for permission changes (this works in some browsers)
            if (navigator.permissions && navigator.permissions.query) {
              navigator.permissions.query({ name: 'notifications' }).then((status) => {
                status.onchange = function() {
                  if (config.onNotificationPermissionChange) {
                    config.onNotificationPermissionChange(Notification.permission);
                  }
                };
              });
            }
          }
        });
      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });

    // Listen for 'controllerchange' event to reload on activation of updated service worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New service worker activated, reloading for fresh content');
      window.location.reload();
    });
  }
}

function registerValidSW(swUrl: string, config?: Config): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // Store the registration globally so we can access it later for updates
      window.serviceWorkerRegistration = registration;

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log(
                'New content is available and will be used when all ' +
                  'tabs for this page are closed.'
              );

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };

      // Handle notification permission changes when requested
      if (config?.enabledNotifications && 'Notification' in window) {
        const permissionState = Notification.permission;

        if (config.onNotificationPermissionChange) {
          config.onNotificationPermissionChange(permissionState);
        }

        // Listen for permission changes (this works in some browsers)
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
            status.onchange = function() {
              if (config.onNotificationPermissionChange) {
                config.onNotificationPermissionChange(Notification.permission);
              }
            };
          });
        }
      }
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config): void {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Extend Window interface to include the service worker registration
declare global {
  interface Window {
    serviceWorkerRegistration?: ServiceWorkerRegistration;
  }
}
