import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, getLastFmUserPlayback, lastFmConfig, response } from './_shared/lastfm'

export const handler = async (event: any) => {
  const headers = corsHeaders('POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') return response(405, { success: false, error: 'Method not allowed' }, headers)

  const config = lastFmConfig()
  if (!config) {
    return response(503, { success: false, error: 'Integracja Last.fm nie jest skonfigurowana' }, headers)
  }

  const auth = await authenticateNetlifyUser(event)
  if ('error' in auth) return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)

  let body: any
  try {
    body = event.body ? JSON.parse(event.body) : {}
  } catch {
    return response(400, { success: false, error: 'Nieprawidłowy JSON' }, headers)
  }

  const username = String(body.username || '').trim()
  if (!username) {
    return response(400, { success: false, error: 'Podaj poprawny login Last.fm' }, headers)
  }

  // Quick verification: test if user exists on Last.fm
  try {
    const testUrl = new URL('https://ws.audioscrobbler.com/2.0/')
    testUrl.searchParams.set('method', 'user.getinfo')
    testUrl.searchParams.set('user', username)
    testUrl.searchParams.set('api_key', config.apiKey)
    testUrl.searchParams.set('format', 'json')

    const testRes = await fetch(testUrl.toString())
    if (testRes.status === 404) {
      return response(404, { success: false, error: `Użytkownik "${username}" nie istnieje na Last.fm` }, headers)
    }
  } catch {
    // If check fails on network, proceed anyway
  }

  const { error: primaryError } = await auth.supabase.from('lastfm_connections').upsert({
    profile_id: auth.profile.id,
    lastfm_username: username,
    updated_at: new Date().toISOString()
  })

  if (primaryError) {
    console.warn('[lastfm-connect] Błąd zapisu do lastfm_connections, zapisuję do spotify_connections:', primaryError.message)
    await auth.supabase.from('spotify_connections').upsert({
      profile_id: auth.profile.id,
      spotify_user_id: `lastfm:${username}`,
      access_token: 'lastfm',
      refresh_token: 'lastfm',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      scopes: ['lastfm'],
      updated_at: new Date().toISOString()
    })
  }

  await auth.supabase.from('spotify_presence').upsert({
    profile_id: auth.profile.id,
    partnership_id: auth.profile.partnership_id || null,
    is_visible: true,
    updated_at: new Date().toISOString()
  })

  // Attempt initial playback check in background
  const initialPlayback = await getLastFmUserPlayback(username)

  return response(
    200,
    {
      success: true,
      username,
      playback: initialPlayback
    },
    headers
  )
}

