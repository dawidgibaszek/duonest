// DuoNest - Service Worker Push Notification Handler
// Listens for background Web Push events and notification interactions

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

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

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      let isSilent = payload.silent === true
      let vibratePattern = payload.vibrate !== undefined ? payload.vibrate : [120, 60, 120, 60, 180]

      // Check if user has muted this category, sound, or vibration in local settings
      const category = payload.data && payload.data.category
      if ('caches' in self) {
        try {
          const cache = await caches.open('duonest-settings')
          const resp = await cache.match('/push-settings.json')
          if (resp) {
            const prefData = await resp.json()
            if (prefData.enabled === false) return
            if (category && prefData.settings && prefData.settings[category] === false) return

            if (prefData.settings) {
              if (prefData.settings.sound === false) {
                isSilent = true
              }
              if (prefData.settings.vibrate === false) {
                vibratePattern = []
              }
            }
          }
        } catch (_) {}
      }

      const notificationOptions = {
        body: payload.body,
        icon: payload.icon || '/pwa-192x192.png',
        badge: payload.badge || '/favicon.png',
        data: payload.data,
        vibrate: vibratePattern,
        silent: isSilent,
        tag: payload.tag || 'duonest-alert-' + Date.now(),
        renotify: true,
        requireInteraction: false
      }

      // Check if user is currently inside the app (any window/tab is visible or focused)
      const isAppInForeground = windowClients.some((client) => {
        return client.visibilityState === 'visible' || client.focused
      })

      // If user is currently in the active app, do NOT show system push notification
      if (isAppInForeground) {
        // Forward message to active window so in-app UI can react
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'DUONEST_IN_APP_PUSH',
            payload
          })
        })
        return
      }

      // User is outside the app (browser minimized, screen locked, or other tab) -> show system push
      return self.registration.showNotification(payload.title, notificationOptions)
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  let targetPath = (event.notification.data && event.notification.data.url) || '/tabs/nest'

  // Security guard: Only allow relative in-app paths starting with / (prevent open redirect to external phishing URLs)
  if (typeof targetPath !== 'string' || !targetPath.startsWith('/') || targetPath.startsWith('//') || targetPath.includes('://')) {
    targetPath = '/tabs/nest'
  }

  const finalUrl = new URL(targetPath, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a DuoNest window is already open, focus and navigate it
      for (const client of windowClients) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          client.navigate(finalUrl)
          return client.focus()
        }
      }
      // If no window is open, open a new one within our origin
      if (clients.openWindow) {
        return clients.openWindow(finalUrl)
      }
    })
  )
})

