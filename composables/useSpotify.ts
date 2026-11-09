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
}

const connection = ref<SpotifyConnection>({
  connected: false,
  visible_to_partner: false
})
const myPlayback = ref<SpotifyPlayback | null>(null)
const partnerPlayback = ref<SpotifyPlayback | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null
let refreshInFlight = false

const normalizePlayback = (playback: any): SpotifyPlayback | null => {
  if (!playback?.track) return null
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

const getAccessToken = async () => {
  const client = useSupabaseClient()
  const { data } = await client.auth.getSession()
  return data.session?.access_token || ''
}

const callSpotifyApi = async (path: string, options: RequestInit = {}) => {
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
    const data = await callSpotifyApi('/api/spotify/status')
    connection.value = {
      connected: Boolean(data.connection?.connected),
      display_name: data.connection?.display_name || null,
      visible_to_partner: Boolean(data.connection?.visible_to_partner)
    }
    myPlayback.value = normalizePlayback(data.playback)
    partnerPlayback.value = normalizePlayback(data.partnerPlayback)
  } catch (error: any) {
    if (error?.statusCode !== 401) {
      errorMessage.value = error?.data?.error || error?.message || 'Nie udało się pobrać aktywności Spotify'
    }
  } finally {
    refreshInFlight = false
    isLoading.value = false
  }
}

const connectSpotify = async () => {
  errorMessage.value = ''
  try {
    const data = await callSpotifyApi('/api/spotify/start')
    if (!data?.authorization_url) throw new Error('Nie udało się rozpocząć łączenia ze Spotify')
    window.location.href = data.authorization_url
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się połączyć ze Spotify'
  }
}

const disconnectSpotify = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await callSpotifyApi('/api/spotify/disconnect', { method: 'POST' })
    connection.value = { connected: false, visible_to_partner: false }
    myPlayback.value = null
    partnerPlayback.value = null
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się odłączyć Spotify'
  } finally {
    isLoading.value = false
  }
}

const setSpotifyVisibility = async (visible: boolean) => {
  try {
    await callSpotifyApi('/api/spotify/visibility', {
      method: 'POST',
      body: JSON.stringify({ visible })
    })
    connection.value.visible_to_partner = visible
    if (!visible) partnerPlayback.value = null
    await refreshSpotifyStatus()
  } catch (error: any) {
    errorMessage.value = error?.data?.error || error?.message || 'Nie udało się zapisać ustawienia prywatności'
  }
}

const startSpotifyPolling = () => {
  if (refreshTimer) return
  refreshSpotifyStatus()
  refreshTimer = setInterval(() => refreshSpotifyStatus(), 20000)
}

const stopSpotifyPolling = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
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
  connectSpotify,
  disconnectSpotify,
  setSpotifyVisibility,
  startSpotifyPolling,
  stopSpotifyPolling
})
