import { ref, reactive, watch } from 'vue'
import { useDuoState } from '~/composables/useDuoState'

export interface PushCategorySettings {
  nudges: boolean        // Puknięcia i gesty miłości
  mood: boolean          // Zmiana nastroju partnera
  calendar: boolean      // Wspólny terminarz i randki
  shopping: boolean      // Nowe pozycje na liście zakupów
  tasks: boolean         // Zadania domowe i punkty
  meals: boolean         // Planer obiadów i posiłków
  partnerOnline: boolean // Wejście partnera do aplikacji
  wishlist: boolean      // Wishlista i marzenia partnera
  sound: boolean         // Dźwięk powiadomienia
  vibrate: boolean       // Wibracja telefonu
}

const DEFAULT_PUSH_SETTINGS: PushCategorySettings = {
  nudges: true,
  mood: true,
  calendar: true,
  shopping: true,
  tasks: true,
  meals: true,
  partnerOnline: false, // domyślnie wyłączone, aby nie rozpraszać
  wishlist: true,       // Nowe marzenia i prezenty
  sound: true,
  vibrate: true
}

// Global persistent state across composable instances
const isSupported = ref(false)
const permission = ref<NotificationPermission>('default')
const isPushEnabled = ref(false)
const isPostPairingPromptOpen = ref(false)
const postPairingPartnerName = ref('Partner')
const isSubscribing = ref(false)
export const pushSettings = reactive<PushCategorySettings>({ ...DEFAULT_PUSH_SETTINGS })

let isInitialized = false

// Storage keys
const STORAGE_KEY_ENABLED = 'duonest_push_enabled'
const STORAGE_KEY_SETTINGS = 'duonest_push_settings'
const STORAGE_KEY_PROMPT_SHOWN = 'duonest_push_prompt_shown'

// High-fidelity web audio synthesizer for in-app alert chimes (zero latency, zero network)
export const playNotificationChime = () => {
  if (typeof window === 'undefined') return
  if (pushSettings.sound === false) return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    const now = ctx.currentTime

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Note 2: B5 (987.77 Hz) - harmonic sparkle
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(987.77, now + 0.08)
    gain2.gain.setValueAtTime(0, now + 0.08)
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.10)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.55)
  } catch (_) {}
}

export const playNotificationHaptic = (pattern: number[] = [120, 60, 120]) => {
  if (typeof window === 'undefined' || !('navigator' in window)) return
  if (pushSettings.vibrate === false) return
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch (_) {}
}

export const usePushNotifications = () => {
  const { currentUser, partnerUser, authSession, triggerToast, activeToastItem } = useDuoState()

  // Initialize environment detection and stored preferences
  const initPushNotifications = () => {
    if (typeof window === 'undefined') return
    if (isInitialized) return
    isInitialized = true

    // Check browser support for Notification & ServiceWorker
    const hasNotification = 'Notification' in window
    const hasSW = 'serviceWorker' in navigator
    isSupported.value = hasNotification && hasSW

    if (hasNotification) {
      permission.value = Notification.permission
    }

    // Load master switch from localStorage
    try {
      const storedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED)
      if (storedEnabled !== null) {
        isPushEnabled.value = JSON.parse(storedEnabled) && permission.value === 'granted'
      } else {
        isPushEnabled.value = permission.value === 'granted'
      }
    } catch (_) {
      isPushEnabled.value = permission.value === 'granted'
    }

    // Load category settings
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS)
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings)
        Object.assign(pushSettings, parsed)
      }
    } catch (_) {}

    // Auto-register/sync subscription when user is authenticated and push is enabled
    if (isPushEnabled.value && permission.value === 'granted') {
      registerServiceWorkerSubscription()
    }

    watch(() => currentUser.value?.id, (newId) => {
      if (newId && isPushEnabled.value && permission.value === 'granted') {
        registerServiceWorkerSubscription()
      }
    })

    // Listen to partner realtime events (via activeToastItem) and dispatch push notification
    watch(activeToastItem, (newToast) => {
      if (!newToast) return
      if (!isPushEnabled.value || permission.value !== 'granted') return

      const m = newToast.message.toLowerCase()
      // Skip self-feedback confirmation toasts
      if (
        m.includes('skopiowan') ||
        m.includes('zapisano') ||
        m.includes('zmieniono') ||
        m.includes('twoje imię') ||
        m.includes('twój profil') ||
        m.includes('twój nastrój') ||
        m.startsWith('zaktualizowano') ||
        m.startsWith('dodano') ||
        m.startsWith('usunięto') ||
        m.startsWith('spełniono') ||
        m.startsWith('oznaczono')
      ) {
        return
      }

      let category: keyof PushCategorySettings = 'nudges'
      let targetUrl = '/tabs/nest'

      if (newToast.type === 'calendar') {
        category = 'calendar'
        targetUrl = '/tabs/calendar'
      } else if (newToast.type === 'shopping') {
        category = 'shopping'
        targetUrl = '/tabs/shopping'
      } else if (newToast.type === 'tasks' || newToast.type === 'points') {
        category = 'tasks'
        targetUrl = '/tabs/tasks'
      } else if (newToast.type === 'meals' || m.includes('obiad') || m.includes('posiłek') || m.includes('przepis')) {
        category = 'meals'
        targetUrl = '/tabs/meals'
      } else if (newToast.type === 'wishlist' || m.includes('marzeni') || m.includes('wishlist') || m.includes('prezent')) {
        category = 'wishlist'
        targetUrl = '/tabs/wishlist'
      } else if (newToast.type === 'mood') {
        category = 'mood'
      } else if (newToast.type === 'love') {
        category = 'nudges'
      } else if (m.includes('w aplikacji')) {
        category = 'partnerOnline'
      }

      if (!pushSettings[category]) return

      sendDirectNotification(
        newToast.title || 'DuoNest',
        newToast.message,
        targetUrl
      )
    })
  }

  // Persist settings
  const persistSettings = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY_ENABLED, JSON.stringify(isPushEnabled.value))
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(pushSettings))
      // Also cache for ServiceWorker background check
      if ('caches' in window) {
        caches.open('duonest-settings').then((cache) => {
          cache.put('/push-settings.json', new Response(JSON.stringify({
            enabled: isPushEnabled.value,
            settings: { ...pushSettings }
          }))).catch(() => {})
        }).catch(() => {})
      }
    } catch (_) {}
  }

  // Request browser permission
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      triggerToast('Powiadomienia nieobsługiwane', { type: 'warning' })
      return false
    }

    try {
      const res = await Notification.requestPermission()
      permission.value = res

      if (res === 'granted') {
        isPushEnabled.value = true
        persistSettings()
        triggerToast('Włączono powiadomienia', { type: 'love' })
        
        // Attempt background push registration
        await registerServiceWorkerSubscription()
        return true
      } else if (res === 'denied') {
        isPushEnabled.value = false
        persistSettings()
        triggerToast('Powiadomienia zablokowane', { type: 'warning' })
        return false
      } else {
        isPushEnabled.value = false
        persistSettings()
        return false
      }
    } catch (err) {
      console.warn('Notification permission error:', err)
      return false
    }
  }

  // Register push subscription with active ServiceWorker & sync with database
  const registerServiceWorkerSubscription = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.ready
      if (!reg || !('pushManager' in reg)) return

      const vapidPublicKey = (useRuntimeConfig().public as any)?.vapidPublicKey
      if (vapidPublicKey) {
        isSubscribing.value = true
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          })
        }

        // Sync subscription with Supabase via backend endpoint
        if (sub && currentUser.value?.id) {
          await $fetch('/api/push/subscribe', {
            method: 'POST',
            headers: authSession.value?.access_token
              ? { Authorization: `Bearer ${authSession.value.access_token}` }
              : undefined,
            body: {
              subscription: sub.toJSON(),
              userAgent: navigator.userAgent
            }
          }).catch((err) => {
            console.warn('[WebPush] Subscription sync note:', err)
          })
        }

        isSubscribing.value = false
      }
    } catch (err) {
      isSubscribing.value = false
      console.warn('Push manager registration note:', err)
    }
  }

  // Helper to convert base64 VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // One-time prompt triggered AFTER pairing
  const askPermissionAfterPairing = (partnerName?: string) => {
    if (typeof window === 'undefined') return
    const hasAlreadyAsked = localStorage.getItem(STORAGE_KEY_PROMPT_SHOWN) === 'true'

    // If already asked or user already granted/denied, do not prompt again
    if (hasAlreadyAsked) return
    if (permission.value === 'granted') {
      localStorage.setItem(STORAGE_KEY_PROMPT_SHOWN, 'true')
      return
    }

    if (partnerName) {
      postPairingPartnerName.value = partnerName
    } else if (partnerUser.value?.name) {
      postPairingPartnerName.value = partnerUser.value.name
    }

    // Small delay so user finishes admiring pairing confetti
    setTimeout(() => {
      isPostPairingPromptOpen.value = true
    }, 1200)
  }

  const acceptPostPairingPrompt = async () => {
    localStorage.setItem(STORAGE_KEY_PROMPT_SHOWN, 'true')
    isPostPairingPromptOpen.value = false
    const granted = await requestPermission()
    if (granted) {
      // Send pleasant welcome notification
      setTimeout(() => {
        sendDirectNotification(
          'DuoNest - Witajcie w Gniazdku! 🕊️',
          `Powiadomienia od ${postPairingPartnerName.value || 'Partnera'} są aktywne. Bądźcie zawsze na bieżąco!`,
          '/tabs/nest'
        )
      }, 500)
    }
  }

  const declinePostPairingPrompt = () => {
    localStorage.setItem(STORAGE_KEY_PROMPT_SHOWN, 'true')
    isPostPairingPromptOpen.value = false
  }

  // Master switch toggle
  const toggleMasterPush = async (val?: boolean) => {
    const target = val !== undefined ? val : !isPushEnabled.value

    if (target) {
      if (permission.value !== 'granted') {
        const granted = await requestPermission()
        if (!granted && permission.value === 'denied') {
          triggerToast('Odblokuj w przeglądarce', {
            type: 'warning'
          })
        }
      } else {
        isPushEnabled.value = true
        persistSettings()
        triggerToast('Włączono powiadomienia', { type: 'success' })
      }
    } else {
      isPushEnabled.value = false
      persistSettings()
      triggerToast('Wyłączono powiadomienia', { type: 'info' })

      // Unsubscribe from browser PushManager & delete subscription from server
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg?.pushManager?.getSubscription()
          if (sub) {
            await $fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: authSession.value?.access_token
                ? { Authorization: `Bearer ${authSession.value.access_token}` }
                : undefined,
              body: { endpoint: sub.endpoint }
            }).catch(() => {})
            await sub.unsubscribe().catch(() => {})
          }
        }
      } catch (err) {
        console.warn('[WebPush] Unsubscribe note:', err)
      }
    }
  }

  // Toggle individual category
  const toggleCategory = (key: keyof PushCategorySettings, val?: boolean) => {
    const nextVal = val !== undefined ? val : !pushSettings[key]
    if (pushSettings[key] === nextVal) return
    pushSettings[key] = nextVal
    persistSettings()

    if (key === 'sound') {
      if (pushSettings.sound) {
        triggerToast('Włączono dźwięki', { type: 'info' })
      } else {
        triggerToast('Wyciszono dźwięki', { type: 'info' })
      }
    } else if (key === 'vibrate') {
      if (pushSettings.vibrate) {
        triggerToast('Włączono wibracje', { type: 'info' })
      } else {
        triggerToast('Wyłączono wibracje', { type: 'info' })
      }
    }
  }

  // Check if user is currently looking at the app in the foreground
  const isAppInForeground = (): boolean => {
    if (typeof document === 'undefined') return false
    return document.visibilityState === 'visible'
  }

  // Send real notification via Service Worker / Notification API
  const sendDirectNotification = async (
    title: string,
    body: string,
    url: string = '/tabs/nest',
    force: boolean = false
  ) => {
    if (typeof window === 'undefined') return
    if (!isSupported.value || permission.value !== 'granted') return

    // Ensure title, body and url are always valid strings (never DOM events or objects)
    const finalTitle = (typeof title === 'string' && title.trim()) ? title : 'DuoNest'
    const finalBody = typeof body === 'string' ? body : String(body || '')
    const finalUrl = (typeof url === 'string' && url.trim()) ? url : '/tabs/nest'

    // Play in-app audio chime if allowed
    if (pushSettings.sound !== false) {
      playNotificationChime()
    }

    // Do NOT show system push notifications when the user is currently inside the active app!
    if (!force && isAppInForeground()) {
      return
    }

    const isSilent = pushSettings.sound === false
    const vibratePattern = pushSettings.vibrate ? [120, 60, 120, 60, 180] : []

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(finalTitle, {
            body: finalBody,
            icon: '/pwa-192x192.png',
            badge: '/favicon.png',
            vibrate: vibratePattern,
            silent: isSilent,
            data: { url: finalUrl },
            tag: 'duonest-' + Date.now(),
            renotify: true
          })
          return
        }
      }

      // Fallback if ServiceWorker not ready
      new Notification(finalTitle, {
        body: finalBody,
        icon: '/pwa-192x192.png',
        badge: '/favicon.png',
        vibrate: vibratePattern,
        silent: isSilent
      } as any)
    } catch (err) {
      console.warn('sendDirectNotification error:', err)
    }
  }

  // Dispatch a notification if master and category settings allow
  const dispatchPushIfAllowed = (
    category: keyof PushCategorySettings,
    title: string,
    body: string,
    url: string = '/tabs/nest'
  ) => {
    if (!isPushEnabled.value || permission.value !== 'granted') return
    if (!pushSettings[category]) return

    sendDirectNotification(title, body, url)
  }

  // Test notification action (sends real backend push to registered device)
  const sendTestNotification = async (customTitle?: any, customBody?: any, customUrl?: any) => {
    if (permission.value !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }

    isPushEnabled.value = true
    persistSettings()

    // Ensure device is subscribed on server
    await registerServiceWorkerSubscription()

    const partnerName = partnerUser.value?.name || 'Partner'
    const title = (typeof customTitle === 'string' && customTitle.trim())
      ? customTitle
      : 'DuoNest - Test Powiadomień'
    const body = (typeof customBody === 'string' && customBody.trim())
      ? customBody
      : `Wszystko działa idealnie! Gdy ${partnerName} wyśle Ci buziaka, zaplanuje obiad lub doda zadanie, dowiesz się od razu.`
    const url = (typeof customUrl === 'string' && customUrl.trim())
      ? customUrl
      : '/tabs/nest'

    let sentViaServer = false
    if (currentUser.value?.id) {
      try {
        const res = await $fetch<{ success: boolean; sentCount?: number }>('/api/push/test', {
          method: 'POST',
          headers: authSession.value?.access_token
            ? { Authorization: `Bearer ${authSession.value.access_token}` }
            : undefined,
          body: {
            title,
            body,
            vibrate: pushSettings.vibrate ? [120, 60, 120, 60, 180] : [],
            silent: !pushSettings.sound
          }
        })
        if (res?.success && (res.sentCount || 0) > 0) {
          sentViaServer = true
        }
      } catch (err) {
        console.warn('[WebPush] Server test dispatch note:', err)
      }
    }

    // Fallback to direct client notification if server hasn't received subscription yet or local env
    if (!sentViaServer) {
      sendDirectNotification(title, body, url, true)
    }

    // Play in-app audio/haptic feedback
    if (pushSettings.sound) {
      playNotificationChime()
    }
    if (pushSettings.vibrate) {
      playNotificationHaptic([120, 60, 180])
    }

    triggerToast('Wysłano powiadomienie testowe', { type: 'success' })
  }

  return {
    isSupported,
    permission,
    isPushEnabled,
    pushSettings,
    isPostPairingPromptOpen,
    postPairingPartnerName,
    isSubscribing,
    initPushNotifications,
    requestPermission,
    askPermissionAfterPairing,
    acceptPostPairingPrompt,
    declinePostPairingPrompt,
    toggleMasterPush,
    toggleCategory,
    dispatchPushIfAllowed,
    sendDirectNotification,
    sendTestNotification,
    playNotificationChime,
    playNotificationHaptic
  }
}
