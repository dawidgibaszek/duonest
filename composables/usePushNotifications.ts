import { ref, reactive, watch, computed } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { activeToastItem, authSession, currentUser, isAuthLoading, isLoggingOut, isPaired } from './duo/state'
import { useRealtimeSync } from './duo/useRealtimeSync'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'

export interface PushCategorySettings {
  nudges: boolean        // Puknięcia i gesty miłości
  mood: boolean          // Zmiana nastroju partnera
  calendar: boolean      // Wspólny terminarz i randki
  shopping: boolean      // Nowe pozycje na liście zakupów
  tasks: boolean         // Zadania domowe i punkty
  meals: boolean         // Planer obiadów i posiłków
  partnerOnline: boolean // Wejście partnera do aplikacji
  wishlist: boolean      // Wishlista i marzenia partnera
  savings: boolean       // Skarbonki i cele finansowe
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
  savings: true,        // Skarbonki i cele finansowe
  sound: true,
  vibrate: true
}

// Global persistent state across composable instances
const isSupported = computed(() => isNativeApp() ||
  (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator))
const permission = ref<NotificationPermission>('default')
const isPushEnabled = ref(false)
const isPostPairingPromptOpen = ref(false)
const isSubscribing = ref(false)
export const pushSettings = reactive<PushCategorySettings>({ ...DEFAULT_PUSH_SETTINGS })

let isInitialized = false

// --- Native app (Capacitor iOS & Android): push via Firebase Cloud Messaging -
// The web build uses Web Push + service worker; inside the native app there is
// no Web Push manager, so the device registers an FCM token with the backend
// instead and the server delivers through APNs / FCM (see server/utils/pushCore.ts).
export const isNativeApp = () =>
  Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.location.protocol === 'capacitor:')

const STORAGE_KEY_ENABLED = 'duonest_push_enabled'
const STORAGE_KEY_SETTINGS = 'duonest_push_settings'
const STORAGE_KEY_PROMPT_SHOWN = 'duonest_push_prompt_shown'
const STORAGE_KEY_NATIVE_DEVICE = 'duonest_push_native_device'

const nativeRegistered = ref(false)
const isTestingPush = ref(false)
let nativeSyncTimer: ReturnType<typeof setTimeout> | undefined
let registerInFlight: Promise<boolean> | undefined
let nativeWork: Promise<unknown> = Promise.resolve()
let nativeDevice: { uid: string; token: string; enabled?: boolean } | null = null
let androidSilentSyncedKey: string | null = null
const isAndroidNative = () => Capacitor.getPlatform() === 'android'

const mapNativePermission = (state: string): NotificationPermission =>
  state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'default'

function rememberNativeDevice(device: typeof nativeDevice) {
  nativeDevice = device
  try {
    if (device) localStorage.setItem(STORAGE_KEY_NATIVE_DEVICE, JSON.stringify(device))
    else localStorage.removeItem(STORAGE_KEY_NATIVE_DEVICE)
  } catch {}
}

function queueNativeWork<T>(work: () => Promise<T>): Promise<T> {
  const next = nativeWork.then(work)
  nativeWork = next.catch(() => {})
  return next
}

const activeNativeAccount = () => {
  if (isAuthLoading.value || isLoggingOut.value || !currentUser.value?.id) return null
  return getFirebaseBridge()?.auth.currentUser ?? null
}

async function forgetNativeDevice() {
  const account = getFirebaseBridge()?.auth.currentUser
  const device = nativeDevice
  const token = device?.uid === account?.uid ? device?.token : null

  const unregister = async () => {
    if (!token || !account) return false
    const authToken = await account.getIdToken()
    const result = await $fetch<{ success: boolean }>('/api/push/unsubscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: { fcmToken: token },
      timeout: 4000
    })
    return result.success === true
  }

  const [removed, invalidated] = await Promise.all([
    unregister().catch(() => false),
    FirebaseMessaging.deleteToken().then(() => true, () => false)
  ])
  await FirebaseMessaging.removeAllDeliveredNotifications().catch(() => {})
  if (removed || invalidated) rememberNativeDevice(null)
  androidSilentSyncedKey = null
  nativeRegistered.value = false
  return removed || invalidated
}

export async function detachNativePushOnLogout() {
  clearTimeout(nativeSyncTimer)
  try {
    await queueNativeWork(forgetNativeDevice)
  } catch {
    console.warn('[Push] Could not detach the native device')
  }
}

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

// --- Badging API (PWA Icon Unread Badge) ---
export const clearAppBadge = async () => {
  if (typeof window === 'undefined') return

  // 1. Clear badge using client Badging API
  if ('clearAppBadge' in navigator) {
    try {
      await (navigator as any).clearAppBadge()
    } catch (_) {}
  } else if ('setAppBadge' in navigator) {
    try {
      await (navigator as any).setAppBadge(0)
    } catch (_) {}
  }

  // 2. Clear cache storage so Service Worker knows the badge count is reset
  if ('caches' in window) {
    try {
      const cache = await caches.open('duonest-badge')
      await cache.put(
        '/badge-count.json',
        new Response(JSON.stringify({ count: 0, updatedAt: Date.now() }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    } catch (_) {}
  }

  // 3. Clear localStorage tracking
  try {
    localStorage.setItem('duonest_badge_count', '0')
    localStorage.setItem('duonest_last_app_active_ts', String(Date.now()))
  } catch (_) {}

  // 4. Message active Service Worker to clear its badge count immediately
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'DUONEST_CLEAR_BADGE' })
    }
  } catch (_) {}
}

export const incrementAppBadge = async () => {
  if (typeof window === 'undefined') return

  let next = 1
  if ('caches' in window) {
    try {
      const cache = await caches.open('duonest-badge')
      const resp = await cache.match('/badge-count.json')
      if (resp) {
        const data = await resp.json()
        next = (Number(data.count) || 0) + 1
      }
      await cache.put(
        '/badge-count.json',
        new Response(JSON.stringify({ count: next, updatedAt: Date.now() }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    } catch (_) {
      next = 1
    }
  }

  try {
    localStorage.setItem('duonest_badge_count', String(next))
  } catch (_) {}

  if ('setAppBadge' in navigator) {
    try {
      await (navigator as any).setAppBadge(next)
    } catch (_) {}
  }
}

let hasBadgeListeners = false
export const initBadgeListeners = () => {
  if (typeof window === 'undefined') return
  if (hasBadgeListeners) return
  hasBadgeListeners = true

  // Clear badge upon opening or launching the app
  clearAppBadge()

  // Clear badge whenever the user returns to the app from background or unlocks phone
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        clearAppBadge()
      }
    })
  }

  window.addEventListener('focus', () => {
    clearAppBadge()
  })
}

export const usePushNotifications = () => {
  const { triggerToast } = useRealtimeSync()
  const router = useRouter()

  // Initialize environment detection and stored preferences
  const initPushNotifications = () => {
    if (typeof window === 'undefined') return
    if (isInitialized) return
    isInitialized = true

    // Initialize Badging API listeners (clears badge on launch / resume)
    initBadgeListeners()

    // Check browser support for Notification & ServiceWorker
    const hasNotification = 'Notification' in window
    const native = isNativeApp()

    if (hasNotification && !native) {
      permission.value = Notification.permission
    }

    // Load master switch from localStorage
    try {
      const storedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED)
      if (storedEnabled !== null) {
        const parsed = JSON.parse(storedEnabled)
        isPushEnabled.value = native ? Boolean(parsed) : (Boolean(parsed) && permission.value === 'granted')
      } else {
        isPushEnabled.value = native ? false : permission.value === 'granted'
      }
    } catch (_) {
      isPushEnabled.value = native ? false : permission.value === 'granted'
    }

    // Load category settings
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS)
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings)
        Object.assign(pushSettings, parsed)
      }
    } catch (_) {}

    if (native) {
      initNativePush()
      return
    }

    if (isPushEnabled.value && permission.value === 'granted') {
      // Auto-register/sync subscription when user is authenticated and push is enabled
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
      } else if (newToast.type === 'wishlist' || newToast.type === 'movies' || m.includes('marzeni') || m.includes('wishlist') || m.includes('prezent') || m.includes('film') || m.includes('seans')) {
        category = 'wishlist'
        targetUrl = (newToast.type === 'movies' || m.includes('film') || m.includes('seans')) ? '/tabs/movies' : '/tabs/wishlist'
      } else if (newToast.type === 'savings' || m.includes('skarbonk') || m.includes('wpłac') || m.includes('wypłac') || m.includes('cel')) {
        category = 'savings'
        targetUrl = '/tabs/savings'
      } else if (newToast.type === 'mood') {
        category = 'mood'
      } else if (newToast.type === 'love') {
        category = 'nudges'
      } else if (m.includes('w aplikacji') || m.includes('jest online')) {
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
  const persistSettings = (syncNative = true) => {
    if (typeof window === 'undefined') return
    if (syncNative && isNativeApp() && isPushEnabled.value && permission.value === 'granted') {
      clearTimeout(nativeSyncTimer)
      nativeSyncTimer = setTimeout(() => { void syncNativePreferences() }, 600)
    }
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
    if (isNativeApp()) return requestNativePermission()
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
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 5000))
      ])
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

        // Link this browser subscription to the signed-in profile.
        if (sub && currentUser.value?.id) {
          const response = await $fetch<{ success: boolean }>('/api/push/subscribe', {
            method: 'POST',
            headers: await getFreshAuthHeaders(),
            body: { subscription: sub.toJSON(), userAgent: navigator.userAgent },
            timeout: 8000
          })
          if (response?.success) return sub
        }
      }
    } catch {
      console.warn('[Push] Browser registration failed')
    } finally {
      isSubscribing.value = false
    }
  }

  // --- Native (iOS app) -------------------------------------------------------
  const getFreshAuthHeaders = async () => {
    try {
      const bridge = getFirebaseBridge()
      const { data } = await bridge.auth.getSession()
      const token = data.session?.access_token || authSession.value?.access_token
      if (token) return { Authorization: `Bearer ${token}` }
    } catch (_) {}
    return authSession.value?.access_token
      ? { Authorization: `Bearer ${authSession.value.access_token}` }
      : undefined
  }

  const saveNativeToken = async (
    token: string,
    account: NonNullable<ReturnType<typeof activeNativeAccount>>,
    alertsEnabled = true
  ) => {
    const authToken = await account.getIdToken()
    const wantAlerts = isPushEnabled.value && permission.value === 'granted'
    if (alertsEnabled ? !wantAlerts : (!isAndroidNative() || !currentUser.value?.partnership_id || wantAlerts)) return false
    if (activeNativeAccount()?.uid !== account.uid) return false
    const response = await $fetch<{ success: boolean }>('/api/push/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        fcmToken: token,
        previousFcmToken: nativeDevice?.uid === account.uid ? nativeDevice.token : undefined,
        platform: isAndroidNative() ? 'android' : 'ios',
        enabled: alertsEnabled,
        settings: { ...pushSettings },
        userAgent: navigator.userAgent
      },
      timeout: 8000
    })
    if (!response?.success) return false
    rememberNativeDevice({ uid: account.uid, token, enabled: alertsEnabled })
    if (alertsEnabled) androidSilentSyncedKey = null
    nativeRegistered.value = alertsEnabled
    return true
  }

  // Android home-screen widgets wake via data-only FCM messages even when tray alerts are off.
  const registerAndroidSilentDevice = (force = false): Promise<boolean> => {
    if (!isAndroidNative() || !currentUser.value?.partnership_id || !activeNativeAccount()) return Promise.resolve(false)
    return queueNativeWork(async () => {
      const account = activeNativeAccount()
      const pid = currentUser.value?.partnership_id
      if (!account || !pid || (isPushEnabled.value && permission.value === 'granted')) return false
      for (const delay of [0, 500, 1500]) {
        if (delay) await new Promise(resolve => setTimeout(resolve, delay))
        if (activeNativeAccount()?.uid !== account.uid || currentUser.value?.partnership_id !== pid) return false
        if (isPushEnabled.value && permission.value === 'granted') return false
        const result = await FirebaseMessaging.getToken().catch(() => null)
        if (!result?.token) continue
        const key = `${account.uid}:${pid}:${result.token}`
        if (!force && androidSilentSyncedKey === key &&
            nativeDevice?.uid === account.uid && nativeDevice.token === result.token && nativeDevice.enabled === false) {
          nativeRegistered.value = false
          return true
        }
        const saved = await saveNativeToken(result.token, account, false)
        if (saved) androidSilentSyncedKey = key
        return saved
      }
      return false
    }).catch(() => false)
  }

  const registerNativeDevice = (): Promise<boolean> => {
    if (registerInFlight) return registerInFlight
    if (!isPushEnabled.value || permission.value !== 'granted' || !activeNativeAccount()) return Promise.resolve(false)

    isSubscribing.value = true
    registerInFlight = queueNativeWork(async () => {
      const account = activeNativeAccount()
      if (!account || !isPushEnabled.value || permission.value !== 'granted') return false

      // APNs registration is asynchronous on iOS, especially on cold launch.
      for (const delay of [0, 500, 1000, 2000]) {
        if (delay) await new Promise(resolve => setTimeout(resolve, delay))
        if (!isPushEnabled.value || permission.value !== 'granted' || activeNativeAccount()?.uid !== account.uid) return false
        const result = await FirebaseMessaging.getToken().catch(() => null)
        if (result?.token) return saveNativeToken(result.token, account)
      }
      return false
    }).catch(() => {
      console.warn('[Push] Native registration failed')
      return false
    }).then((registered) => {
      nativeRegistered.value = registered
      return registered
    }).finally(() => {
      isSubscribing.value = false
      registerInFlight = undefined
    })
    return registerInFlight
  }

  const syncNativePreferences = () => queueNativeWork(async () => {
    const account = activeNativeAccount()
    if (!account || !nativeDevice || nativeDevice.uid !== account.uid) return
    await saveNativeToken(nativeDevice.token, account)
  }).catch(() => {
    console.warn('[Push] Could not sync notification preferences')
    triggerToast('Nie udało się zapisać ustawień powiadomień. Spróbujemy ponownie po powrocie do aplikacji.', { type: 'warning' })
  })

  const requestNativePermission = async (): Promise<boolean> => {
    try {
      const current = await FirebaseMessaging.checkPermissions()
      const { receive } = current.receive === 'granted' ? current : await FirebaseMessaging.requestPermissions()
      permission.value = mapNativePermission(receive)
    } catch {
      triggerToast('Nie udało się sprawdzić uprawnień powiadomień.', { type: 'warning' })
      return false
    }

    if (permission.value !== 'granted') {
      nativeRegistered.value = false
      if (permission.value === 'denied') {
        const osLabel = Capacitor.getPlatform() === 'android' ? 'Androidzie' : 'iOS'
        triggerToast(`Powiadomienia zablokowane w ${osLabel}`, { type: 'warning' })
      }
      return false
    }

    isPushEnabled.value = true
    persistSettings(false)
    const registered = await registerNativeDevice()
    triggerToast(
      registered ? 'Włączono powiadomienia' : 'Nie udało się zarejestrować tego urządzenia. Spróbuj ponownie.',
      { type: registered ? 'success' : 'warning' }
    )
    return registered
  }

  const initNativePush = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_NATIVE_DEVICE) || 'null')
      if (typeof stored?.uid === 'string' && typeof stored?.token === 'string') nativeDevice = stored
    } catch {}

    if (Capacitor.getPlatform() === 'android') {
      void Promise.all([
        FirebaseMessaging.createChannel({
          id: 'duonest_default',
          name: 'DuoNest – Powiadomienia',
          description: 'Powiadomienia ze wspólnego Gniazdka',
          importance: 4,
          vibration: true,
          visibility: 1
        }),
        FirebaseMessaging.createChannel({
          id: 'duonest_silent',
          name: 'DuoNest – Ciche powiadomienia',
          description: 'Powiadomienia bez dźwięku',
          importance: 2,
          vibration: false,
          visibility: 1
        })
      ]).catch(() => console.warn('[Push] Could not create Android notification channels'))
    }

    try {
      let pendingRoute: { url: string; recipient?: string } | undefined
      const openPendingRoute = () => {
        if (!pendingRoute || isAuthLoading.value || isLoggingOut.value) return
        if (!isPaired.value || !activeNativeAccount() || !router.currentRoute.value.path.startsWith('/tabs/')) return
        const { url, recipient } = pendingRoute
        pendingRoute = undefined
        if (!recipient || recipient === currentUser.value.id) void router.push(url).catch(() => {})
      }

      void FirebaseMessaging.addListener('notificationActionPerformed', ({ actionId, notification }) => {
        if (actionId !== 'tap') return
        const data = notification.data as { url?: unknown; recipientProfileId?: string } | undefined
        if (typeof data?.url !== 'string' ||
            !/^\/tabs\/(nest|calendar|shopping|tasks|meals|movies|wishlist|savings|relationship)$/.test(data.url)) return
        pendingRoute = { url: data.url, recipient: data.recipientProfileId }
        openPendingRoute()
      }).catch(() => console.warn('[Push] Notification tap listener unavailable'))

      void FirebaseMessaging.addListener('tokenReceived', () => {
        androidSilentSyncedKey = null
        if (!isSubscribing.value) refresh()
      }).catch(() => console.warn('[Push] Token refresh listener unavailable'))

      void FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
        const data = notification.data as { action?: string } | undefined
        if (data?.action === 'TEST') console.info('[Push] Test notification received')
      }).catch(() => console.warn('[Push] Notification listener unavailable'))

      const refreshNativePush = async () => {
        const { receive } = await FirebaseMessaging.checkPermissions()
        permission.value = mapNativePermission(receive)
        if (permission.value !== 'granted') nativeRegistered.value = false
        if (isPushEnabled.value && permission.value === 'granted') {
          await registerNativeDevice()
        } else if (isAndroidNative() && currentUser.value?.partnership_id && activeNativeAccount()) {
          await registerAndroidSilentDevice()
        } else if (nativeDevice?.uid && nativeDevice.uid === activeNativeAccount()?.uid) {
          await queueNativeWork(forgetNativeDevice)
        }
      }
      const refresh = () => { void refreshNativePush().catch(() => console.warn('[Push] Native refresh failed')) }

      watch([isAuthLoading, () => authSession.value?.user?.id, () => currentUser.value?.id, () => currentUser.value?.partnership_id], () => {
        refresh()
        openPendingRoute()
      })
      watch([isPaired, () => router.currentRoute.value.path], openPendingRoute, { flush: 'post' })
      watch(isLoggingOut, (loggingOut) => { if (loggingOut) pendingRoute = undefined })
      void App.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh() })
        .catch(() => console.warn('[Push] App state listener unavailable'))
      window.addEventListener('online', refresh)
      refresh()
    } catch {
      console.warn('[Push] Native initialization failed')
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
  const askPermissionAfterPairing = () => {
    if (typeof window === 'undefined') return
    if (!isSupported.value) return
    const hasAlreadyAsked = localStorage.getItem(STORAGE_KEY_PROMPT_SHOWN) === 'true'

    // If already asked or user already granted/denied, do not prompt again
    if (hasAlreadyAsked) return
    if (permission.value === 'granted') {
      localStorage.setItem(STORAGE_KEY_PROMPT_SHOWN, 'true')
      return
    }

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
          'DuoNest - Witajcie w Gniazdku!',
          'Powiadomienia ze wspólnego Gniazdka są aktywne.',
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

    if (isNativeApp()) {
      if (target) {
        await requestNativePermission()
      } else {
        isPushEnabled.value = false
        persistSettings(false)
        clearTimeout(nativeSyncTimer)
        if (isAndroidNative() && currentUser.value?.partnership_id && activeNativeAccount()) {
          await FirebaseMessaging.removeAllDeliveredNotifications().catch(() => {})
          const updated = await registerAndroidSilentDevice(true)
          triggerToast(
            updated ? 'Wyłączono powiadomienia' : 'Nie udało się zapisać ustawień powiadomień. Ponowimy próbę po połączeniu.',
            { type: updated ? 'info' : 'warning' }
          )
        } else {
          const detached = await queueNativeWork(forgetNativeDevice).catch(() => false)
          triggerToast(
            detached ? 'Wyłączono powiadomienia' : 'Nie udało się odpiąć urządzenia. Ponowimy próbę po połączeniu.',
            { type: detached ? 'info' : 'warning' }
          )
        }
      }
      return
    }

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
        await registerServiceWorkerSubscription()
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

    // iOS app: system notifications come only from the server (FCM/APNs)
    if (isNativeApp()) return

    // App is in background/minimized -> increment badge counter for unread push notifications
    await incrementAppBadge()

    const isSilent = pushSettings.sound === false
    const vibratePattern = pushSettings.vibrate ? [120, 60, 120, 60, 180] : []

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(finalTitle, {
            body: finalBody,
            icon: '/pwa-192x192.png',
            badge: '/badge-96.png',
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
        badge: '/badge-96.png',
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
  const sendTestNotification = async () => {
    if (isTestingPush.value) return
    if (!isPushEnabled.value || permission.value !== 'granted') {
      triggerToast('Najpierw włącz powiadomienia na tym urządzeniu.', { type: 'warning' })
      return
    }

    isTestingPush.value = true
    try {
      const native = isNativeApp()
      const device = native
        ? await registerNativeDevice() && nativeDevice && { fcmToken: nativeDevice.token }
        : await registerServiceWorkerSubscription().then(subscription => subscription && { endpoint: subscription.endpoint })
      const headers = await getFreshAuthHeaders()
      if (!device || !headers) {
        triggerToast('Nie udało się zarejestrować tego urządzenia.', { type: 'warning' })
        return
      }

      const result = await $fetch<{ success: boolean; sentCount?: number; message?: string }>('/api/push/test', {
        method: 'POST',
        headers,
        body: {
          ...device,
          url: '/tabs/relationship',
          vibrate: pushSettings.vibrate ? [120, 60, 120, 60, 180] : [],
          silent: !pushSettings.sound
        },
        timeout: 12000
      })
      if (!result?.success || !result.sentCount) {
        triggerToast(result?.message || 'Wysyłka powiadomienia testowego nie powiodła się.', { type: 'warning' })
        return
      }
      triggerToast('Wysłano powiadomienie testowe na to urządzenie.', { type: 'success' })
    } catch {
      triggerToast('Wysyłka powiadomienia testowego nie powiodła się. Spróbuj ponownie.', { type: 'warning' })
    } finally {
      isTestingPush.value = false
    }
  }

  return {
    isNativeApp: computed(() => isNativeApp()),
    isSupported,
    permission,
    isPushEnabled,
    pushSettings,
    isPostPairingPromptOpen,
    isSubscribing,
    nativeRegistered,
    isTestingPush,
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
    playNotificationHaptic,
    clearAppBadge,
    incrementAppBadge
  }
}
