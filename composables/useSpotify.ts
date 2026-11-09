import { ref, computed } from 'vue'

export interface SpotifyPlayback {
  is_playing: boolean
  track_name: string
  artist_name: string
  album_name?: string | null
  album_image_url?: string | null
  track_url?: string | null
  progress_ms?: number | null
  duration_ms?: number | null
  updated_at: string
}

export interface SpotifyConnection {
  connected: boolean
  display_name?: string | null
  visible_to_partner: boolean
  service?: 'lastfm' | 'spotify'
}

const connection = ref<SpotifyConnection>({
  connected: false,
  visible_to_partner: false,
  service: 'lastfm'
})
const myPlayback = ref<SpotifyPlayback | null>(null)
const partnerPlayback = ref<SpotifyPlayback | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
let refreshInFlight = false
let pollingTimer: ReturnType<typeof setTimeout> | null = null
let pollingSubscribers = 0

const normalizePlayback = (playback: any): SpotifyPlayback | null => {
  if (!playback) return null

  // Nested track object shape
  if (playback.track) {
    return {
      is_playing: Boolean(playback.isPlaying),
      track_name: playback.track.name || 'Nieznany utwór',
      artist_name: Array.isArray(playback.track.artists)
        ? playback.track.artists.join(', ')
        : String(playback.track.artists || 'Nieznany wykonawca'),
      album_name: playback.track.album || null,
      album_image_url: playback.track.albumImageUrl || null,
      track_url: playback.track.externalUrl || null,
      progress_ms: playback.progressMs ?? null,
      duration_ms: playback.durationMs ?? null,
      updated_at: playback.fetchedAt || new Date().toISOString()
    }
  }

  // Flat frontend playback object shape
  if (playback.track_name) {
    return {
      is_playing: Boolean(playback.is_playing),
      track_name: playback.track_name,
      artist_name: playback.artist_name || 'Nieznany wykonawca',
      album_name: playback.album_name || null,
      album_image_url: playback.album_image_url || null,
      track_url: playback.track_url || null,
      progress_ms: playback.progress_ms ?? null,
      duration_ms: playback.duration_ms ?? null,
      updated_at: playback.updated_at || new Date().toISOString()
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

const refreshSpotifyStatus = async (showLoading = false) => {
  if (refreshInFlight) return
  refreshInFlight = true
  if (showLoading) isLoading.value = true
  errorMessage.value = ''

  try {
    // Try Last.fm status first
    let data: any = null
    try {
      data = await callApi('/api/lastfm/status')
    } catch {
      // Fallback to legacy Spotify endpoint if Last.fm fails
      data = await callApi('/api/spotify/status')
    }

    if (!data?.connected) {
      // If Last.fm is not connected, check if Spotify was connected
      try {
        const spotifyData = await callApi('/api/spotify/status')
        if (spotifyData?.connected) {
          data = spotifyData
          connection.value.service = 'spotify'
        }
      } catch {}
    } else {
      connection.value.service = 'lastfm'
    }

    connection.value = {
      connected: Boolean(data?.connection?.connected ?? data?.connected),
      display_name: data?.connection?.display_name || data?.display_name || null,
      visible_to_partner: Boolean(data?.connection?.visible_to_partner ?? data?.visible),
      service: connection.value.service || 'lastfm'
    }
    myPlayback.value = normalizePlayback(data?.playback || data?.my_playback)
    partnerPlayback.value = normalizePlayback(data?.partnerPlayback || data?.partner_playback)
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
    await refreshSpotifyStatus()
    scheduleNextPoll()
  }, delay)
}

const onVisibilityChange = () => {
  if (typeof document !== 'undefined' && !document.hidden && pollingSubscribers > 0) {
    refreshSpotifyStatus().finally(() => {
      scheduleNextPoll()
    })
  }
}

const onWindowFocus = () => {
  if (pollingSubscribers > 0) {
    refreshSpotifyStatus().finally(() => {
      scheduleNextPoll()
    })
  }
}

const startSpotifyPolling = () => {
  pollingSubscribers++
  if (pollingSubscribers === 1) {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onWindowFocus)
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
    refreshSpotifyStatus().finally(() => {
      scheduleNextPoll()
    })
  } else {
    scheduleNextPoll()
  }
}

const stopSpotifyPolling = () => {
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

const connectLastFm = async () => {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const data = await callApi('/api/lastfm/start')
    if (!data?.authorization_url) throw new Error('Nie udało się wygenerować linku logowania Last.fm')
    window.location.href = data.authorization_url
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się połączyć z Last.fm'
  } finally {
    isLoading.value = false
  }
}

const connectLastFmUsername = async (username: string) => {
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
      service: 'lastfm'
    }
    await refreshSpotifyStatus(true)
    return true
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się połączyć konta Last.fm'
    return false
  } finally {
    isLoading.value = false
  }
}

const connectSpotify = async () => {
  // Redirect to Last.fm login as the primary zero-quota method
  return connectLastFm()
}

const disconnectSpotify = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await Promise.allSettled([
      callApi('/api/lastfm/disconnect', { method: 'POST' }),
      callApi('/api/spotify/disconnect', { method: 'POST' })
    ])
    connection.value = { connected: false, visible_to_partner: false, service: 'lastfm' }
    myPlayback.value = null
    partnerPlayback.value = null
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się odłączyć konta muzycznego'
  } finally {
    isLoading.value = false
  }
}

const setSpotifyVisibility = async (visible: boolean) => {
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
    await refreshSpotifyStatus()
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się zapisać ustawienia prywatności'
  }
}

const hasPartnerPlayback = computed(() => Boolean(partnerPlayback.value?.is_playing))

export const useSpotify = () => ({
  connection,
  myPlayback,
  partnerPlayback,
  hasPartnerPlayback,
  isLoading,
  errorMessage,
  refreshSpotifyStatus,
  connectLastFm,
  connectLastFmUsername,
  connectSpotify,
  disconnectSpotify,
  setSpotifyVisibility,
  startSpotifyPolling,
  stopSpotifyPolling
})
