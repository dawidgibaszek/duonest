import { Capacitor, registerPlugin } from '@capacitor/core'
import { computed, ref } from 'vue'
import { authUser, currentUser, isAuthLoading, isPaired, partnerUser, partnership } from '~/composables/duo/state'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'

export interface DuoPosition {
  latitude: number
  longitude: number
  accuracy: number
  captured_at: number
  address?: { street?: string; number?: string; city?: string; country?: string }
}

const nativeLocation = registerPlugin<{
  start(options: { token: string; requestBackground: boolean }): Promise<void>
  stop(): Promise<void>
  status(): Promise<{ active: boolean }>
  locate(): Promise<DuoPosition>
}>('DuoLocation')

const STORAGE_KEY = 'duonest_location_sharing_device'
const ownShared = ref<DuoPosition | null>(null)
const ownPreview = ref<DuoPosition | null>(null)
const partnerPosition = ref<DuoPosition | null>(null)
const sharing = ref(false)
const updatingSharing = ref(false)
const sharingError = ref('')
const clock = ref(Date.now())
const isNative = () => Capacitor.isNativePlatform()

const activePair = computed(() => {
  const uid = authUser.value?.id
  return uid && isPaired.value
    ? { uid, pid: partnership.value?.id, own: currentUser.value.id, partner: partnerUser.value?.id }
    : null
})
const deviceKey = computed(() => {
  const uid = authUser.value?.id
  const pid = currentUser.value.partnership_id
  if (isAuthLoading.value) return undefined
  return uid && pid ? `${uid}:${pid}` : ''
})
const validPosition = (point: DuoPosition | null) => point && clock.value - point.captured_at < 24 * 60 * 60_000 ? point : null
const myPosition = computed(() => {
  if (!activePair.value) return null
  const preview = validPosition(ownPreview.value)
  const shared = validPosition(ownShared.value)
  return preview && (!shared || preview.captured_at > shared.captured_at) ? preview : shared
})
const theirPosition = computed(() => activePair.value ? validPosition(partnerPosition.value) : null)
const distance = computed(() => {
  const a = myPosition.value
  const b = theirPosition.value
  if (!a || !b) return null
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLng = (b.longitude - a.longitude) * rad
  const chord = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2
  return 6_371_008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, chord)))
})

let browserWatch: number | undefined
let sequence = 0
let renewedAt = 0

function fromBrowser(position: GeolocationPosition): DuoPosition {
  const { latitude, longitude, accuracy } = position.coords
  return { latitude, longitude, accuracy, captured_at: position.timestamp }
}

function browserGeolocation() {
  if (!navigator.geolocation) throw new Error('Przeglądarka nie udostępnia lokalizacji.')
  return navigator.geolocation
}

const browserOptions = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }
const geoError = (error: GeolocationPositionError) => new Error(error.code === 1
  ? 'Zezwól przeglądarce na dostęp do lokalizacji.'
  : 'Nie udało się ustalić pozycji. Spróbuj ponownie.')

async function startBrowser(token: string, revision: number) {
  const geo = browserGeolocation()
  await new Promise<void>((resolve, reject) => {
    geo.getCurrentPosition(() => resolve(), error => reject(geoError(error)), browserOptions)
  })
  if (revision !== sequence) return
  let lastSent = 0
  browserWatch = geo.watchPosition(position => {
    if (revision !== sequence || Date.now() - lastSent < 18_000) return
    lastSent = Date.now()
    void fetch('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fromBrowser(position)),
      signal: AbortSignal.timeout(12_000)
    }).then(response => {
      if (!response.ok && revision === sequence) {
        sharingError.value = 'Nie udało się wysłać pozycji.'
        if (response.status === 401) void stopLocal()
      }
    }).catch(() => {
      if (revision === sequence) sharingError.value = 'Nie udało się wysłać pozycji.'
    })
  }, error => {
    if (revision === sequence) sharingError.value = geoError(error).message
  }, browserOptions)
}

async function stopLocal() {
  ++sequence
  sharing.value = false
  renewedAt = 0
  if (browserWatch !== undefined) navigator.geolocation?.clearWatch(browserWatch)
  browserWatch = undefined
  if (isNative()) await nativeLocation.stop().catch(() => {})
}

export async function stopDuoLocation(revoke: boolean, explicit = false) {
  if (!import.meta.client) return
  const remembered = localStorage.getItem(STORAGE_KEY)
  const wasActive = sharing.value || updatingSharing.value || ownShared.value || remembered?.startsWith(`${authUser.value?.id}:`)
  localStorage.removeItem(STORAGE_KEY)
  await stopLocal()
  if (revoke && (wasActive || explicit)) await getFirebaseBridge().callApi('/api/location/session', { action: 'stop' })
}

async function startSharing(action: 'start' | 'resume') {
  if (updatingSharing.value || !activePair.value || !deviceKey.value) return
  const key = deviceKey.value
  const revision = ++sequence
  updatingSharing.value = true
  sharingError.value = ''
  let issued = false
  try {
    const result = await getFirebaseBridge().callApi<{ enabled: boolean; token?: string }>('/api/location/session', {
      action, partnershipId: activePair.value.pid
    })
    if (revision !== sequence || (deviceKey.value !== undefined && key !== deviceKey.value)) return
    if (!result.enabled || !result.token) {
      await stopDuoLocation(false)
      return
    }
    issued = true
    if (isNative()) await nativeLocation.start({ token: result.token, requestBackground: action === 'start' })
    else await startBrowser(result.token, revision)
    if (revision !== sequence || (deviceKey.value !== undefined && key !== deviceKey.value)) {
      if (isNative()) await nativeLocation.stop().catch(() => {})
      return
    }
    localStorage.setItem(STORAGE_KEY, key)
    sharing.value = true
    renewedAt = Date.now()
  } catch (err) {
    if (revision === sequence) {
      if (action === 'start' && issued) await stopDuoLocation(true).catch(() => {})
      sharingError.value = err instanceof Error ? err.message : 'Nie udało się włączyć udostępniania.'
    }
  } finally {
    updatingSharing.value = false
  }
}

export function observeDuoLocation(pair: typeof activePair.value) {
  ownPreview.value = ownShared.value = partnerPosition.value = null
  if (!pair?.pid || !pair.own || !pair.partner) return
  const collection = `partnership_locations/${pair.pid}/location_fixes`
  const bridge = getFirebaseBridge()
  function listen(profileId: string, target: typeof ownShared) {
    let retry: ReturnType<typeof setTimeout> | undefined
    let unsubscribe: (() => void) | undefined
    const connect = () => {
      unsubscribe?.()
      unsubscribe = bridge.observeDocument(collection, profileId, data => { target.value = data }, () => {
        target.value = null
        // A permission-denied snapshot expires permanently. Try again in case sharing resumes.
        retry = setTimeout(connect, 30_000)
      })
    }
    connect()
    return () => { clearTimeout(retry); unsubscribe?.() }
  }
  const mine = listen(pair.own, ownShared)
  const theirs = listen(pair.partner, partnerPosition)
  return () => { mine(); theirs() }
}

export function useDuoLocation() {
  return {
    activePair, deviceKey, clock, ownShared, myPosition, theirPosition, distance, sharing, updatingSharing, sharingError,
    startSharing: () => startSharing('start'),
    resumeSharing: async () => {
      if (!deviceKey.value || localStorage.getItem(STORAGE_KEY) !== deviceKey.value) return
      if (sharing.value && !isNative()) return
      if (sharing.value && Date.now() - renewedAt < 20 * 60 * 60_000) {
        const status = await nativeLocation.status().catch(() => null)
        if (status?.active) return
        sharing.value = false
      }
      return startSharing('resume')
    },
    stopSharing: async () => {
      sharingError.value = ''
      try {
        await stopDuoLocation(true, true)
        ownShared.value = null
      } catch {
        sharingError.value = 'Telefon przestał wysyłać pozycję. Połącz się z internetem, aby usunąć ostatni odczyt.'
        throw new Error(sharingError.value)
      }
    },
    locate: async () => {
      const key = deviceKey.value
      const position = isNative() ? await nativeLocation.locate() : await new Promise<DuoPosition>((resolve, reject) => {
        browserGeolocation().getCurrentPosition(position => resolve(fromBrowser(position)), error => reject(geoError(error)), browserOptions)
      })
      if (key && key === deviceKey.value) ownPreview.value = position
    }
  }
}
