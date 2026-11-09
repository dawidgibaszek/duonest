import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, response } from './_shared/lastfm'

const VALID_SERVICES = ['spotify', 'apple_music', 'youtube_music', 'tidal', 'lastfm']

export const handler = async (event: any) => {
  const headers = corsHeaders('POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') return response(405, { success: false, error: 'Method not allowed' }, headers)

  const auth = await authenticateNetlifyUser(event)
  if ('error' in auth) return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)

  let body: any
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch {
    return response(400, { success: false, error: 'Nieprawidłowy JSON' }, headers)
  }

  const rawService = String(body.service || body.music_service || '').toLowerCase().trim()
  const service = VALID_SERVICES.includes(rawService) ? rawService : 'spotify'

  // 1. Update music_connections (primary) and lastfm_connections (fallback)
  try {
    await auth.supabase
      .from('music_connections')
      .update({
        music_service: service,
        updated_at: new Date().toISOString()
      })
      .eq('profile_id', auth.profile.id)
  } catch (e: any) {
    console.warn('[lastfm-service] music_connections update error:', e?.message)
  }

  try {
    await auth.supabase
      .from('lastfm_connections')
      .update({
        music_service: service,
        updated_at: new Date().toISOString()
      })
      .eq('profile_id', auth.profile.id)
  } catch {}

  // 2. Update current presence track if present (check music_presence, then spotify_presence)
  let presence: any = null
  try {
    const { data } = await auth.supabase
      .from('music_presence')
      .select('track')
      .eq('profile_id', auth.profile.id)
      .maybeSingle()
    presence = data
  } catch {}

  if (!presence) {
    try {
      const { data: legacyPresence } = await auth.supabase
        .from('spotify_presence')
        .select('track')
        .eq('profile_id', auth.profile.id)
        .maybeSingle()
      if (legacyPresence) {
        presence = legacyPresence
      }
    } catch {}
  }

  if (presence?.track) {
    const updatedTrack = {
      ...presence.track,
      music_service: service
    }
    try {
      await auth.supabase
        .from('music_presence')
        .update({
          track: updatedTrack,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', auth.profile.id)
    } catch {}

    try {
      await auth.supabase
        .from('spotify_presence')
        .update({
          track: updatedTrack,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', auth.profile.id)
    } catch {}
  }

  return response(200, { success: true, service }, headers)
}

