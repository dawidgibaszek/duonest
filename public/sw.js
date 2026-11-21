// Retire the service worker installed by the former DuoNest PWA.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    const legacy = names.filter(name =>
      (name.startsWith('workbox-precache-') && name.endsWith(self.registration.scope)) ||
      ['duonest-badge', 'duonest-settings', 'firebase-api'].includes(name)
    )
    await Promise.all(legacy.map(name => caches.delete(name)))
    await self.clients.claim()
    await self.registration.unregister()
  })())
})
