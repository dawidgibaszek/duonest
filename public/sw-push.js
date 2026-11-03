// DuoNest - Service Worker Push Notification Handler
// Listens for background Web Push events and notification interactions

self.addEventListener('push', (event) => {
  let payload = {
    title: 'DuoNest',
    body: 'Nowa wiadomość w Waszym Gniazdku! 💌',
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
    data: { url: '/tabs/nest' }
  }

  if (event.data) {
    try {
      const json = event.data.json()
      payload = {
        ...payload,
        ...json,
        data: {
          url: json.url || (json.data && json.data.url) || '/tabs/nest',
          ...(json.data || {})
        }
      }
    } catch (_) {
      const text = event.data.text()
      if (text) {
        payload.body = text
      }
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/favicon.png',
    data: payload.data,
    vibrate: [120, 60, 120, 60, 180],
    tag: payload.tag || 'duonest-alert-' + Date.now(),
    renotify: true,
    requireInteraction: false
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data && event.notification.data.url) || '/tabs/nest'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a DuoNest window is already open, focus it
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

