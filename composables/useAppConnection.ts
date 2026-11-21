import { Capacitor } from '@capacitor/core'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { NATIVE_API_ORIGIN } from '~/utils/duoApiClient'

const PROBE_INTERVAL_MS = 30_000
const RETRY_INTERVAL_MS = 5_000
const PROBE_TIMEOUT_MS = 5_000

export function useAppConnection() {
  const offline = ref(import.meta.client && !navigator.onLine)
  const checkingConnection = ref(false)
  const address = Capacitor.isNativePlatform() ? `${NATIVE_API_ORIGIN}/connectivity.txt` : '/connectivity.txt'
  let pending: AbortController | undefined
  let nextProbe: number | undefined
  let foreground = true

  function pause() {
    window.clearTimeout(nextProbe)
    const request = pending
    pending = undefined
    request?.abort()
    checkingConnection.value = false
  }

  function onOffline() {
    pause()
    offline.value = true
    if (foreground && !document.hidden) nextProbe = window.setTimeout(checkConnection, RETRY_INTERVAL_MS)
  }

  async function checkConnection() {
    if (!foreground || document.hidden || pending) return
    window.clearTimeout(nextProbe)
    const request = new AbortController()
    pending = request
    checkingConnection.value = true
    const timeout = window.setTimeout(() => request.abort(), PROBE_TIMEOUT_MS)

    try {
      const response = await fetch(address, {
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: request.signal
      })
      const reachable = response.ok && (await response.text()).trim() === 'duonest-online'
      if (pending === request) offline.value = !reachable
    } catch {
      if (pending === request) offline.value = true
    } finally {
      window.clearTimeout(timeout)
      if (pending === request) {
        pending = undefined
        checkingConnection.value = false
        nextProbe = window.setTimeout(checkConnection, offline.value ? RETRY_INTERVAL_MS : PROBE_INTERVAL_MS)
      }
    }
  }

  function onVisibilityChange() {
    if (!foreground || document.hidden) pause()
    else void checkConnection()
  }

  function setConnectionForeground(active: boolean) {
    foreground = active
    onVisibilityChange()
  }

  onMounted(() => {
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', checkConnection)
    document.addEventListener('visibilitychange', onVisibilityChange)
    if (navigator.onLine) void checkConnection()
    else onOffline()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('offline', onOffline)
    window.removeEventListener('online', checkConnection)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    pause()
  })

  return { offline, checkingConnection, checkConnection, setConnectionForeground }
}
