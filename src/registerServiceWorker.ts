// Service Worker Registration Helper for Offline B2B PWA Capabilities

export function registerServiceWorker(): void {
  if (typeof window !== 'undefined') {
    // Purge any stale cache storage from previous app versions
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'eagle-excel-cache-v5') {
            console.log('[ServiceWorker] Purging legacy cache:', key);
            caches.delete(key);
          }
        });
      }).catch(() => {});
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Force update check
            registration.update().catch(() => {});
            
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      console.log('[ServiceWorker] Updated service worker active.');
                    }
                  }
                };
              }
            };
          })
          .catch((error) => {
            console.warn('[ServiceWorker] Registration warning:', error);
          });
      });
    }
  }
}
