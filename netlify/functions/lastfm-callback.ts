import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, exchangeLastFmToken, response } from './_shared/lastfm'

async function saveLastFmConnection(
  supabase: any,
  profileId: string,
  username: string,
  sessionKey: string
) {
  // 1. Try saving to lastfm_connections
  const { error: primaryError } = await supabase.from('lastfm_connections').upsert({
    profile_id: profileId,
    lastfm_username: username,
    session_key: sessionKey,
    updated_at: new Date().toISOString()
  })

  // 2. Fallback: if table doesn't exist in Supabase yet, save to spotify_connections
  if (primaryError) {
    console.warn('[lastfm-callback] Błąd zapisu do lastfm_connections, zapisuję do spotify_connections:', primaryError.message)
    await supabase.from('spotify_connections').upsert({
      profile_id: profileId,
      spotify_user_id: `lastfm:${username}`,
      access_token: sessionKey || 'lastfm',
      refresh_token: 'lastfm',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      scopes: ['lastfm'],
      updated_at: new Date().toISOString()
    })
  }

  // 3. Ensure presence exists with visibility true
  await supabase.from('spotify_presence').upsert({
    profile_id: profileId,
    is_visible: true,
    updated_at: new Date().toISOString()
  })
}

export const handler = async (event: any) => {
  const headers = corsHeaders('GET, POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }

  // POST: Called by pages/auth/lastfm/callback.vue with { token }
  if (event.httpMethod === 'POST') {
    const auth = await authenticateNetlifyUser(event)
    if ('error' in auth) {
      return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)
    }

    let body: any
    try {
      body = event.body ? JSON.parse(event.body) : {}
    } catch {
      return response(400, { success: false, error: 'Nieprawidłowy JSON' }, headers)
    }

    const token = String(body.token || '').trim()
    if (!token) {
      return response(400, { success: false, error: 'Brak tokenu autoryzacji' }, headers)
    }

    try {
      const session = await exchangeLastFmToken(token)
      await saveLastFmConnection(auth.supabase, auth.profile.id, session.username, session.sessionKey)

      return response(200, {
        success: true,
        username: session.username
      }, headers)
    } catch (err: any) {
      console.error('[lastfm-callback POST] Błąd wymiany tokenu:', err)
      return response(500, {
        success: false,
        error: err?.message || 'Nie udało się zweryfikować tokenu z Last.fm'
      }, headers)
    }
  }

  // GET: If hit directly, redirect to Vue callback page
  if (event.httpMethod === 'GET') {
    const query = event.queryStringParameters || {}
    const token = query.token

    const host = event?.headers?.['x-forwarded-host'] || event?.headers?.host
    const proto = event?.headers?.['x-forwarded-proto'] || 'https'
    const currentOrigin = host ? `${proto}://${host}` : ''
    const target = currentOrigin || process.env.URL || process.env.NUXT_PUBLIC_SITE_URL || 'https://duonestapp.pl'

    const targetUrl = new URL('/auth/lastfm/callback', target)
    if (token) targetUrl.searchParams.set('token', token)

    return {
      statusCode: 302,
      headers: { Location: targetUrl.toString(), 'Cache-Control': 'no-store' },
      body: ''
    }
  }

  return response(405, { success: false, error: 'Method not allowed' }, headers)
}
