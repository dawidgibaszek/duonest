import { ref, computed } from 'vue'

export interface MusicPlayback {
  is_playing: boolean
  track_name: string
  artist_name: string
  album_name?: string | null
  album_image_url?: string | null
  track_url?: string | null
  progress_ms?: number | null
  duration_ms?: number | null
  updated_at: string
  music_service?: string | null
}

export interface MusicConnection {
  connected: boolean
  display_name?: string | null
  visible_to_partner: boolean
  music_service?: string | null
  service?: string | null
}

// Backwards compatibility type aliases
export type SpotifyPlayback = MusicPlayback
export type SpotifyConnection = MusicConnection

const connection = ref<MusicConnection>({
  connected: false,
  visible_to_partner: false,
  music_service: 'spotify',
  service: 'spotify'
})
const myPlayback = ref<MusicPlayback | null>(null)
const partnerPlayback = ref<MusicPlayback | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
let refreshInFlight = false
let pollingTimer: ReturnType<typeof setTimeout> | null = null
let pollingSubscribers = 0

const normalizePlayback = (playback: any): MusicPlayback | null => {
  if (!playback) return null

  // Nested track object shape
  if (playback.track) {
    return {
      is_playing: Boolean(playback.isPlaying ?? playback.is_playing),
      track_name: playback.track.name || 'Nieznany utwór',
      artist_name: Array.isArray(playback.track.artists)
        ? playback.track.artists.join(', ')
        : String(playback.track.artists || 'Nieznany wykonawca'),
      album_name: playback.track.album || null,
      album_image_url: playback.track.albumImageUrl || null,
      track_url: playback.track.externalUrl || null,
      progress_ms: playback.progressMs ?? playback.progress_ms ?? null,
      duration_ms: playback.durationMs ?? playback.duration_ms ?? null,
      updated_at: playback.fetchedAt || playback.updated_at || new Date().toISOString(),
      music_service: playback.music_service || playback.track?.music_service || null
    }
  }

  // Flat frontend playback object shape
  if (playback.track_name) {
    return {
      is_playing: Boolean(playback.is_playing ?? playback.isPlaying),
      track_name: playback.track_name,
      artist_name: playback.artist_name || 'Nieznany wykonawca',
      album_name: playback.album_name || null,
      album_image_url: playback.album_image_url || null,
      track_url: playback.track_url || null,
      progress_ms: playback.progress_ms ?? playback.progressMs ?? null,
      duration_ms: playback.duration_ms ?? playback.durationMs ?? null,
      updated_at: playback.updated_at || playback.fetchedAt || new Date().toISOString(),
      music_service: playback.music_service || null
    }
  }

  return null
}

const getAccessToken = async () => {
  const client = useSupabaseClient()
  const { data } = await client.auth.getSession()
  return data.session?.access_token || ''
}

const callApi = async (path: string, options: RequestInit = {}) => {
  const accessToken = await getAccessToken()
  if (!accessToken) throw new Error('Brak aktywnej sesji')

  return await $fetch<any>(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })
}

export const refreshMusicStatus = async (showLoading = false) => {
  if (refreshInFlight) return
  refreshInFlight = true
  if (showLoading) isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await callApi('/api/lastfm/status')

    connection.value = {
      connected: Boolean(data?.connection?.connected ?? data?.connected),
      display_name: data?.connection?.display_name || data?.display_name || null,
      visible_to_partner: Boolean(data?.connection?.visible_to_partner ?? data?.visible),
      music_service: data?.connection?.music_service || data?.connection?.service || 'spotify',
      service: data?.connection?.music_service || data?.connection?.service || 'spotify'
    }
    myPlayback.value = normalizePlayback(data?.my_playback || data?.playback)
    partnerPlayback.value = normalizePlayback(data?.partner_playback || data?.partnerPlayback)
  } catch (error: any) {
    if (error?.statusCode !== 401) {
      errorMessage.value = error?.data?.error || error?.message || 'Nie udało się pobrać aktywności muzycznej'
    }
  } finally {
    refreshInFlight = false
    isLoading.value = false
  }
}

const scheduleNextPoll = () => {
  if (pollingSubscribers <= 0) return
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }

  // Pause frequent polling when tab/app is hidden to save network & battery
  if (typeof document !== 'undefined' && document.hidden) {
    return
  }

  // Fast live polling (4s) when music is playing, relaxed (8s) when idle
  const isAnyPlaying = Boolean(myPlayback.value?.is_playing || partnerPlayback.value?.is_playing)
  const delay = isAnyPlaying ? 4000 : 8000

  pollingTimer = setTimeout(async () => {
    if (pollingSubscribers <= 0) return
    await refreshMusicStatus()
    scheduleNextPoll()
  }, delay)
}

const onVisibilityChange = () => {
  if (typeof document !== 'undefined' && !document.hidden && pollingSubscribers > 0) {
    refreshMusicStatus().finally(() => {
      scheduleNextPoll()
    })
  }
}

const onWindowFocus = () => {
  if (pollingSubscribers > 0) {
    refreshMusicStatus().finally(() => {
      scheduleNextPoll()
    })
  }
}

export const startMusicPolling = () => {
  pollingSubscribers++
  if (pollingSubscribers === 1) {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onWindowFocus)
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
    refreshMusicStatus().finally(() => {
      scheduleNextPoll()
    })
  } else {
    scheduleNextPoll()
  }
}

export const stopMusicPolling = () => {
  pollingSubscribers = Math.max(0, pollingSubscribers - 1)
  if (pollingSubscribers === 0) {
    if (pollingTimer) {
      clearTimeout(pollingTimer)
      pollingTimer = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }
}

export const connectMusic = async () => {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const data = await callApi('/api/lastfm/start')
    if (!data?.authorization_url) throw new Error('Nie udało się wygenerować linku logowania Last.fm')
    window.location.href = data.authorization_url
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się połączyć konta muzycznego'
  } finally {
    isLoading.value = false
  }
}

export const connectMusicUsername = async (username: string) => {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const data = await callApi('/api/lastfm/connect', {
      method: 'POST',
      body: JSON.stringify({ username: username.trim() })
    })
    connection.value = {
      connected: true,
      display_name: data.username || username.trim(),
      visible_to_partner: true,
      music_service: connection.value.music_service || 'spotify',
      service: connection.value.service || 'spotify'
    }
    await refreshMusicStatus(true)
    return true
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się połączyć konta muzycznego'
    return false
  } finally {
    isLoading.value = false
  }
}

export const disconnectMusic = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await Promise.allSettled([
      callApi('/api/lastfm/disconnect', { method: 'POST' }),
      callApi('/api/spotify/disconnect', { method: 'POST' })
    ])
    connection.value = {
      connected: false,
      visible_to_partner: false,
      music_service: connection.value.music_service || 'spotify',
      service: connection.value.service || 'spotify'
    }
    myPlayback.value = null
    partnerPlayback.value = null
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się odłączyć konta muzycznego'
  } finally {
    isLoading.value = false
  }
}

export const setMusicVisibility = async (visible: boolean) => {
  try {
    await Promise.allSettled([
      callApi('/api/lastfm/visibility', {
        method: 'POST',
        body: JSON.stringify({ visible })
      }),
      callApi('/api/spotify/visibility', {
        method: 'POST',
        body: JSON.stringify({ visible })
      })
    ])
    connection.value.visible_to_partner = visible
    if (!visible) partnerPlayback.value = null
    await refreshMusicStatus()
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się zapisać ustawienia prywatności'
  }
}

export const setMusicService = async (service: string) => {
  try {
    await callApi('/api/lastfm/service', {
      method: 'POST',
      body: JSON.stringify({ service })
    })
    connection.value.music_service = service
    connection.value.service = service
    if (myPlayback.value) {
      myPlayback.value.music_service = service
    }
    await refreshMusicStatus()
  } catch (err: any) {
    console.error('Błąd zapisu platformy muzycznej:', err)
  }
}

const hasPartnerPlayback = computed(() => Boolean(partnerPlayback.value?.is_playing))

export const useMusic = () => ({
  connection,
  myPlayback,
  partnerPlayback,
  hasPartnerPlayback,
  isLoading,
  errorMessage,

  // Modern naming
  refreshMusicStatus,
  connectMusic,
  connectMusicUsername,
  disconnectMusic,
  setMusicVisibility,
  setMusicService,
  startMusicPolling,
  stopMusicPolling,

  // Backwards compatibility aliases
  refreshSpotifyStatus: refreshMusicStatus,
  connectSpotify: connectMusic,
  connectLastFm: connectMusic,
  connectLastFmUsername: connectMusicUsername,
  disconnectSpotify: disconnectMusic,
  setSpotifyVisibility: setMusicVisibility,
  startSpotifyPolling: startMusicPolling,
  stopSpotifyPolling: stopMusicPolling
})

export const useSpotify = useMusic

