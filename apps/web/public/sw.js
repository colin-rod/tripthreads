/**
 * Service Worker for Push Notifications
 *
 * Minimal service worker that handles:
 * - Push event listening
 * - Displaying notifications
 * - Notification click handling (deep links)
 *
 * Phase 4: Push Notifications
 * NOTE: NO offline caching or PWA features (deferred to Phase 5+)
 */

// Service worker version (update when making changes)
const SW_VERSION = '1.0.0'

console.log(`[ServiceWorker] Version ${SW_VERSION} loading...`)

/**
 * Handle push events
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push event received')

  // Parse push data
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch (error) {
    console.error('[ServiceWorker] Error parsing push data:', error)
    data = {
      title: 'TripThreads',
      body: 'You have a new notification',
      data: { url: 'https://tripthreads.app' },
    }
  }

  // Notification options
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    data: data.data || { url: 'https://tripthreads.app' },
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(data.title || 'TripThreads', options)
  )
})

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked')

  // Close notification
  event.notification.close()

  // Get deep link URL from notification data
  const url = event.notification.data?.url || 'https://tripthreads.app'

  // Open URL in existing window or new window
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }

        // If no window exists, open new one
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

/**
 * Service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated version:', SW_VERSION)

  // Take control of all pages immediately
  event.waitUntil(self.clients.claim())
})

/**
 * Service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing version:', SW_VERSION)

  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting())
})

console.log('[ServiceWorker] Loaded successfully')
