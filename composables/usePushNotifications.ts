import { ref, reactive, watch } from 'vue'
import { useDuoState } from '~/composables/useDuoState'

export interface PushCategorySettings {
  nudges: boolean        // Puknięcia i gesty miłości
  mood: boolean          // Zmiana nastroju partnera
  calendar: boolean      // Wspólny terminarz i randki
  shopping: boolean      // Nowe pozycje na liście zakupów
  tasks: boolean         // Zadania domowe i punkty
  partnerOnline: boolean // Wejście partnera do aplikacji
  sound: boolean         // Dźwięk powiadomienia
  vibrate: boolean       // Wibracja telefonu
}

const DEFAULT_PUSH_SETTINGS: PushCategorySettings = {
  nudges: true,
  mood: true,
  calendar: true,
  shopping: true,
  tasks: true,
  partnerOnline: false, // domyślnie wyłączone, aby nie rozpraszać
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
const pushSettings = reactive<PushCategorySettings>({ ...DEFAULT_PUSH_SETTINGS })

let isInitialized = false

// Storage keys
const STORAGE_KEY_ENABLED = 'duonest_push_enabled'
const STORAGE_KEY_SETTINGS = 'duonest_push_settings'
const STORAGE_KEY_PROMPT_SHOWN = 'duonest_push_prompt_shown'

export const usePushNotifications = () => {
  const { currentUser, partnerUser, triggerToast, activeToastItem } = useDuoState()

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

    // Listen to partner realtime events (via activeToastItem) and dispatch push notification
    watch(activeToastItem, (newToast) => {
      if (!newToast) return
      if (!isPushEnabled.value || permission.value !== 'granted') return

      const m = newToast.message.toLowerCase()
      // Skip self-feedback confirmation toasts
      if (m.includes('skopiowan') || m.includes('zapisano') || m.includes('zmieniono kolor') || m.includes('twoje imię')) {
        return
      }

      let category: keyof PushCategorySettings = 'nudges'
      if (newToast.type === 'calendar') category = 'calendar'
      else if (newToast.type === 'shopping') category = 'shopping'
      else if (newToast.type === 'tasks' || newToast.type === 'points') category = 'tasks'
      else if (newToast.type === 'mood') category = 'mood'
      else if (newToast.type === 'love') category = 'nudges'
      else if (m.includes('w aplikacji')) category = 'partnerOnline'

      if (!pushSettings[category]) return

      sendDirectNotification(
        newToast.title || 'DuoNest',
        newToast.message,
        '/tabs/nest'
      )
    })
  }

  // Persist settings
  const persistSettings = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY_ENABLED, JSON.stringify(isPushEnabled.value))
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(pushSettings))
    } catch (_) {}
  }

  // Request browser permission
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      triggerToast('Powiadomienia nie są wspierane na tym urządzeniu lub przeglądarce.', { type: 'warning' })
      return false
    }

    try {
      const res = await Notification.requestPermission()
      permission.value = res

      if (res === 'granted') {
        isPushEnabled.value = true
        persistSettings()
        triggerToast('Powiadomienia zostały pomyślnie włączone! 💌', { type: 'love', title: 'Powiadomienia DuoNest' })
        
        // Attempt background push registration
        await registerServiceWorkerSubscription()
        return true
      } else if (res === 'denied') {
        isPushEnabled.value = false
        persistSettings()
        triggerToast('Uprawnienie do powiadomień zostało zablokowane w przeglądarce.', { type: 'warning' })
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

  // Register push subscription with active ServiceWorker
  const registerServiceWorkerSubscription = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.ready
      if (!reg || !('pushManager' in reg)) return

      // In pure PWA mode without explicit VAPID server key, service worker showNotification is used.
      // If a VAPID public key is configured in env, we can subscribe to PushManager:
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
          'DuoNest – Witajcie w Gniazdku! 🕊️',
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
          triggerToast('Odblokuj powiadomienia w ustawieniach przeglądarki (ikona kłódki przy adresie).', {
            type: 'warning',
            title: 'Wymagane uprawnienie'
          })
        }
      } else {
        isPushEnabled.value = true
        persistSettings()
        triggerToast('Włączono powiadomienia na tym urządzeniu.', { type: 'success' })
      }
    } else {
      isPushEnabled.value = false
      persistSettings()
      triggerToast('Powiadomienia push zostały wyłączone.', { type: 'info' })
    }
  }

  // Toggle individual category
  const toggleCategory = (key: keyof PushCategorySettings) => {
    pushSettings[key] = !pushSettings[key]
    persistSettings()
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

    // Do NOT show system push notifications when the user is currently inside the active app!
    if (!force && isAppInForeground()) {
      return
    }

    const vibratePattern = pushSettings.vibrate ? [120, 60, 120, 60, 180] : undefined

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/favicon.png',
            vibrate: vibratePattern,
            data: { url },
            tag: 'duonest-' + Date.now(),
            renotify: true
          })
          return
        }
      }

      // Fallback if ServiceWorker not ready
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/favicon.png',
        vibrate: vibratePattern
      })
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

  // Test notification action
  const sendTestNotification = async () => {
    if (permission.value !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }

    isPushEnabled.value = true
    persistSettings()

    const partnerName = partnerUser.value?.name || 'Partner'
    sendDirectNotification(
      `DuoNest – Test Powiadomień 💌`,
      `Wszystko działa idealnie! Gdy ${partnerName} wyśle Ci buziaka lub doda zadanie, dowiesz się od razu.`,
      '/tabs/nest',
      true
    )
    triggerToast('Wysłano testowe powiadomienie na Twoje urządzenie!', { type: 'success', title: 'Powiadomienie Push' })
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
    sendTestNotification
  }
}
