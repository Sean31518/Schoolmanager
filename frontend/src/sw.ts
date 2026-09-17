/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

// generateSW mode adds these two automatically; injectManifest mode (needed
// here for the push/notificationclick handlers below) uses our own file
// as-is, so without this a freshly-activated SW wouldn't control already-
// open pages (incl. the very tab that just installed it) until a reload.
self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

// Last-loaded API responses stay available offline instead of erroring —
// see project memory project_schoolmanager_pwa.md for why AuthContext's
// /auth/me call in particular depends on this.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
)

interface PushPayload {
  title?: string
  body?: string
  url?: string
}

self.addEventListener('push', (event) => {
  let data: PushPayload = {}
  try {
    data = event.data?.json() as PushPayload
  } catch {
    data = { body: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Schulmanager', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
