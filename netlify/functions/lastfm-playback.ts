import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, getLastFmUserPlayback, response } from './_shared/lastfm'

function getServiceSearchUrl(service: string, trackName: string, artistName: string, fallbackUrl: string | null) {
  const query = encodeURIComponent(`${trackName} ${artistName}`)
  switch (service) {
    case 'apple_music':
      return `https://music.apple.com/search?term=${query}`
    case 'youtube_music':
      return `https://music.youtube.com/search?q=${query}`
    case 'tidal':
      return `https://listen.tidal.com/search?q=${query}`
    case 'lastfm':
      return fallbackUrl || `https://www.last.fm/search?q=${query}`
    default:
      return `https://open.spotify.com/search/${query}`
  }
}

function frontendPlayback(playback: any, service = 'spotify') {
  if (!playback) return null
  const musicService = playback.music_service || playback.track?.music_service || service || 'spotify'
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
    updated_at: playback.fetchedAt || new Date().toISOString(),
    music_service: musicService
  }
}

async function fetchUserMusic(
  supabase: any,
  profileId: string,
  partnershipId: string | null
) {
  // 1. Get Last.fm connection and preferred music service
  const { data: connection } = await supabase
    .from('lastfm_connections')
    .select('lastfm_username, music_service')
    .eq('profile_id', profileId)
    .maybeSingle()

  // 2. Get Presence
  const { data: presence } = await supabase
    .from('spotify_presence')
    .select('is_visible, track, is_playing, progress_ms, duration_ms, fetched_at')
    .eq('profile_id', profileId)
    .maybeSingle()

  const isVisible = presence ? presence.is_visible !== false : true
  const username = connection?.lastfm_username?.trim()
  const musicService = connection?.music_service || presence?.track?.music_service || 'spotify'

  if (!username) {
    return {
      connected: false,
      username: null,
      service: musicService,
      visible: isVisible,
      playback: null
    }
  }

  // 3. Fetch live playback from Last.fm
  const live = await getLastFmUserPlayback(username)
  if (live && live.track) {
    const customizedTrack = {
      ...live.track,
      music_service: musicService,
      externalUrl: getServiceSearchUrl(
        musicService,
        live.track.name,
        live.track.artists?.[0] || '',
        live.track.externalUrl
      )
    }

    const hasTrackChanged = (live.track.name !== presence?.track?.name) || (live.isPlaying !== presence?.is_playing)
    const isStale = !presence?.fetched_at || (Date.now() - new Date(presence.fetched_at).getTime() > 15_000)

    if (hasTrackChanged || isStale) {
      await supabase.from('spotify_presence').upsert({
        profile_id: profileId,
        partnership_id: partnershipId,
        is_visible: isVisible,
        track: customizedTrack,
        is_playing: live.isPlaying,
        progress_ms: 0,
        duration_ms: 0,
        fetched_at: live.fetchedAt,
        updated_at: live.fetchedAt
      })
    }

    return {
      connected: true,
      username,
      service: musicService,
      visible: isVisible,
      playback: {
        ...live,
        track: customizedTrack,
        music_service: musicService
      }
    }
  }

  // Fallback to cached presence
  const cachedTrack = presence?.track ? {
    ...presence.track,
    music_service: musicService
  } : null

  const cachedPlayback = cachedTrack ? {
    track: cachedTrack,
    isPlaying: Boolean(presence.is_playing),
    progressMs: presence.progress_ms || 0,
    durationMs: presence.duration_ms || 0,
    fetchedAt: presence.fetched_at || new Date().toISOString(),
    music_service: musicService
  } : null

  return {
    connected: true,
    username,
    service: musicService,
    visible: isVisible,
    playback: cachedPlayback
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

  const [myResult, partnerResult] = await Promise.all([
    fetchUserMusic(auth.supabase, auth.profile.id, auth.profile.partnership_id || null),
    partnerProfileId
      ? fetchUserMusic(auth.supabase, partnerProfileId, auth.profile.partnership_id || null)
      : Promise.resolve(null)
  ])

  const partnerPlayback = (partnerResult && partnerResult.visible !== false)
    ? partnerResult.playback
    : null

  return response(
    200,
    {
      success: true,
      connected: myResult.connected,
      visible: myResult.visible,
      playback: myResult.playback,
      partnerPlayback,
      connection: {
        connected: myResult.connected,
        display_name: myResult.username,
        visible_to_partner: myResult.visible,
        music_service: myResult.service || 'spotify',
        service: myResult.service || 'spotify'
      },
      my_playback: frontendPlayback(myResult.playback, myResult.service),
      partner_playback: frontendPlayback(partnerPlayback, partnerResult?.service)
    },
    headers
  )
}
