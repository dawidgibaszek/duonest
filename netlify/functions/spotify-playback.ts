import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, getSpotifyAccessToken, publicTrack, response } from './_shared/spotify'

function frontendPlayback(playback: any) {
  if (!playback) return null
  return {
    is_playing: playback.isPlaying,
    track_name: playback.track?.name || '',
    artist_name: playback.track?.artists?.join(', ') || '',
    album_name: playback.track?.album || null,
    album_image_url: playback.track?.albumImageUrl || null,
    track_url: playback.track?.externalUrl || null,
    progress_ms: playback.progressMs,
    duration_ms: playback.durationMs,
    updated_at: playback.fetchedAt
  }
}

function playbackPayload(connected: boolean, visible: boolean, playback: any, partnerPlayback: any) {
  return {
    success: true,
    connected,
    visible,
    playback,
    partnerPlayback,
    connection: { connected, visible_to_partner: visible },
    my_playback: frontendPlayback(playback),
    partner_playback: frontendPlayback(partnerPlayback)
  }
}

export const handler = async (event: any) => {
  const headers = corsHeaders('GET, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'GET') return response(405, { success: false, error: 'Method not allowed' }, headers)
  const auth = await authenticateNetlifyUser(event)
  if ('error' in auth) return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)
  const { data: presence } = await auth.supabase.from('spotify_presence').select('is_visible, track, is_playing, progress_ms, duration_ms, fetched_at').eq('profile_id', auth.profile.id).maybeSingle()
  const { data: partnerPresence } = auth.profile.partnership_id
    ? await auth.supabase.from('spotify_presence').select('track, is_playing, progress_ms, duration_ms, fetched_at').eq('partnership_id', auth.profile.partnership_id).eq('is_visible', true).neq('profile_id', auth.profile.id).limit(1).maybeSingle()
    : { data: null }
  const partnerPlayback = partnerPresence
    ? { track: partnerPresence.track, isPlaying: partnerPresence.is_playing, progressMs: partnerPresence.progress_ms, durationMs: partnerPresence.duration_ms, fetchedAt: partnerPresence.fetched_at }
    : null
  if (presence && !presence.is_visible) return response(200, playbackPayload(true, false, null, partnerPlayback), headers)
  const savedPlayback = presence?.track
    ? {
        track: presence.track,
        isPlaying: false,
        progressMs: presence.progress_ms || 0,
        durationMs: presence.duration_ms || 0,
        fetchedAt: presence.fetched_at
      }
    : null
  const token = await getSpotifyAccessToken(auth.profile.id)
  if (!token) return response(200, playbackPayload(false, presence?.is_visible !== false, savedPlayback, partnerPlayback), headers)

  const result = await fetch('https://api.spotify.com/v1/me/player', { headers: { Authorization: `Bearer ${token}` } })
  if (result.status === 204) return response(200, playbackPayload(true, presence?.is_visible !== false, savedPlayback, partnerPlayback), headers)
  if (!result.ok) return response(502, { success: false, error: 'Unable to read Spotify playback' }, headers)
  const player = await result.json() as any
  const playback = {
    track: publicTrack(player.item) || savedPlayback?.track,
    isPlaying: Boolean(player.is_playing),
    progressMs: player.progress_ms || 0,
    durationMs: player.item?.duration_ms || savedPlayback?.durationMs || 0,
    fetchedAt: new Date().toISOString()
  }
  await auth.supabase.from('spotify_presence').upsert({
    profile_id: auth.profile.id,
    partnership_id: auth.profile.partnership_id || null,
    is_visible: presence?.is_visible !== false,
    track: playback.track,
    is_playing: playback.isPlaying,
    progress_ms: playback.progressMs,
    duration_ms: playback.durationMs,
    fetched_at: playback.fetchedAt,
    updated_at: playback.fetchedAt
  })
  return response(200, playbackPayload(true, presence?.is_visible !== false, playback, partnerPlayback), headers)
}
