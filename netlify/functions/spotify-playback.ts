import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, getSpotifyAccessToken, publicTrack, response } from './_shared/spotify'

function frontendPlayback(playback: any) {
  if (!playback) return null
  return {
    is_playing: Boolean(playback.isPlaying),
    track_name: playback.track?.name || '',
    artist_name: Array.isArray(playback.track?.artists)
      ? playback.track.artists.join(', ')
      : (playback.track?.artists || ''),
    album_name: playback.track?.album || null,
    album_image_url: playback.track?.albumImageUrl || null,
    track_url: playback.track?.externalUrl || null,
    progress_ms: playback.progressMs ?? null,
    duration_ms: playback.durationMs ?? null,
    updated_at: playback.fetchedAt || new Date().toISOString()
  }
}

function playbackPayload(
  connected: boolean,
  visible: boolean,
  playback: any,
  partnerPlayback: any
) {
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

async function fetchLiveUserPlayback(
  supabase: any,
  profileId: string,
  partnershipId: string | null
) {
  const { data: presence } = await supabase
    .from('spotify_presence')
    .select('is_visible, track, is_playing, progress_ms, duration_ms, fetched_at')
    .eq('profile_id', profileId)
    .maybeSingle()

  const isVisible = presence ? presence.is_visible !== false : true

  // Expire offline/idle tracks older than 24h
  const isStale = presence?.fetched_at
    ? Date.now() - new Date(presence.fetched_at).getTime() > 24 * 60 * 60 * 1000
    : false

  const savedPlayback = (presence?.track && !isStale)
    ? {
        track: presence.track,
        isPlaying: false,
        progressMs: presence.progress_ms || 0,
        durationMs: presence.duration_ms || 0,
        fetchedAt: presence.fetched_at || new Date().toISOString()
      }
    : null

  const token = await getSpotifyAccessToken(profileId)
  if (!token) {
    if (presence?.is_playing) {
      await supabase.from('spotify_presence').update({
        is_playing: false,
        updated_at: new Date().toISOString()
      }).eq('profile_id', profileId)
    }
    return {
      connected: false,
      visible: isVisible,
      playback: savedPlayback
    }
  }

  try {
    const result = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (result.status === 204) {
      // Inactive player / paused or closed
      if (presence?.is_playing) {
        await supabase.from('spotify_presence').update({
          is_playing: false,
          updated_at: new Date().toISOString()
        }).eq('profile_id', profileId)
      }
      return {
        connected: true,
        visible: isVisible,
        playback: savedPlayback
      }
    }

    if (!result.ok) {
      return {
        connected: true,
        visible: isVisible,
        playback: presence?.track ? {
          track: presence.track,
          isPlaying: Boolean(presence.is_playing),
          progressMs: presence.progress_ms || 0,
          durationMs: presence.duration_ms || 0,
          fetchedAt: presence.fetched_at || new Date().toISOString()
        } : savedPlayback
      }
    }

    const player = await result.json() as any
    const track = publicTrack(player.item) || presence?.track || null
    const isPlaying = Boolean(player.is_playing)
    const progressMs = typeof player.progress_ms === 'number' ? player.progress_ms : 0
    const durationMs = player.item?.duration_ms || presence?.duration_ms || 0
    const fetchedAt = new Date().toISOString()

    const playback = track ? {
      track,
      isPlaying,
      progressMs,
      durationMs,
      fetchedAt
    } : null

    // Update presence in Supabase when track or play state changes, or when stale
    const hasTrackChanged = (track?.id || track?.name) !== (presence?.track?.id || presence?.track?.name)
    const hasPlayingChanged = Boolean(presence?.is_playing) !== isPlaying
    const isStalePresence = !presence?.fetched_at || (Date.now() - new Date(presence.fetched_at).getTime() > 15_000)

    if (hasTrackChanged || hasPlayingChanged || isStalePresence) {
      await supabase.from('spotify_presence').upsert({
        profile_id: profileId,
        partnership_id: partnershipId,
        is_visible: isVisible,
        track,
        is_playing: isPlaying,
        progress_ms: progressMs,
        duration_ms: durationMs,
        fetched_at: fetchedAt,
        updated_at: fetchedAt
      })
    }

    return {
      connected: true,
      visible: isVisible,
      playback
    }
  } catch (err) {
    console.error(`[Spotify Playback] Error fetching for ${profileId}:`, err)
    return {
      connected: true,
      visible: isVisible,
      playback: savedPlayback
    }
  }
}

export const handler = async (event: any) => {
  const headers = corsHeaders('GET, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'GET') return response(405, { success: false, error: 'Method not allowed' }, headers)

  const auth = await authenticateNetlifyUser(event)
  if ('error' in auth) return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)

  let partnerProfileId: string | null = null
  if (auth.profile.partnership_id) {
    const { data: part } = await auth.supabase
      .from('partnerships')
      .select('partner1_id, partner2_id')
      .eq('id', auth.profile.partnership_id)
      .maybeSingle()

    if (part) {
      partnerProfileId =
        part.partner1_id === auth.profile.id
          ? part.partner2_id
          : part.partner2_id === auth.profile.id
            ? part.partner1_id
            : null
    }

    if (!partnerProfileId) {
      const { data: partnerProf } = await auth.supabase
        .from('profiles')
        .select('id')
        .eq('partnership_id', auth.profile.partnership_id)
        .neq('id', auth.profile.id)
        .limit(1)
        .maybeSingle()
      partnerProfileId = partnerProf?.id || null
    }
  }

  // Fetch live playback for both caller and partner in parallel
  const [myResult, partnerResult] = await Promise.all([
    fetchLiveUserPlayback(auth.supabase, auth.profile.id, auth.profile.partnership_id || null),
    partnerProfileId
      ? fetchLiveUserPlayback(auth.supabase, partnerProfileId, auth.profile.partnership_id || null)
      : Promise.resolve(null)
  ])

  const partnerPlayback = (partnerResult && partnerResult.visible !== false)
    ? partnerResult.playback
    : null

  return response(
    200,
    playbackPayload(
      myResult.connected,
      myResult.visible,
      myResult.playback,
      partnerPlayback
    ),
    headers
  )
}
