import { exchangeLastFmToken, getSupabaseAdmin, lastFmConfig } from './_shared/lastfm'

function redirect(event: any, status: string) {
  const host = event?.headers?.['x-forwarded-host'] || event?.headers?.host
  const proto = event?.headers?.['x-forwarded-proto'] || 'https'
  const currentOrigin = host ? `${proto}://${host}` : ''
  const target = currentOrigin || process.env.URL || process.env.NUXT_PUBLIC_SITE_URL || 'https://duonestapp.pl'
  const url = new URL('/tabs/relationship', target)
  url.searchParams.set('category', 'nest_settings')
  url.searchParams.set('music', status)
  return { statusCode: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' }, body: '' }
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { Allow: 'GET' }, body: 'Method not allowed' }
  const query = event.queryStringParameters || {}
  const token = query.token
  const state = query.state

  if (!token || !state || !lastFmConfig()) {
    return redirect(event, 'failed')
  }

  const supabase = getSupabaseAdmin()
  const { data: oauthState, error: stateError } = await supabase
    .from('spotify_oauth_states')
    .select('state, profile_id, expires_at')
    .eq('state', state)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (stateError || !oauthState) {
    return redirect(event, 'invalid_state')
  }

  try {
    const session = await exchangeLastFmToken(token)

    // Save Last.fm connection
    const { error: saveError } = await supabase.from('lastfm_connections').upsert({
      profile_id: oauthState.profile_id,
      lastfm_username: session.username,
      session_key: session.sessionKey,
      updated_at: new Date().toISOString()
    })

    if (saveError) {
      console.error('[lastfm-callback] Błąd zapisu połączenia:', saveError.message)
      throw saveError
    }

    // Ensure presence row exists with visibility true
    await supabase.from('spotify_presence').upsert({
      profile_id: oauthState.profile_id,
      is_visible: true,
      updated_at: new Date().toISOString()
    })

    await supabase.from('spotify_oauth_states').delete().eq('state', state)
    return redirect(event, 'connected')
  } catch (err) {
    console.error('[lastfm-callback] Błąd wymiany tokenu:', err)
    await supabase.from('spotify_oauth_states').delete().eq('state', state)
    return redirect(event, 'failed')
  }
}

