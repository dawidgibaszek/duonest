import { exchangeSpotifyToken, getSupabaseAdmin, spotifyConfig } from './_shared/spotify'

function redirect(event: any, status: string) {
  const host = event?.headers?.['x-forwarded-host'] || event?.headers?.host
  const proto = event?.headers?.['x-forwarded-proto'] || 'https'
  const currentOrigin = host ? `${proto}://${host}` : ''
  const target = currentOrigin || process.env.URL || process.env.NUXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://duonestapp.pl'
  const url = new URL('/tabs/relationship', target)
  url.searchParams.set('category', 'nest_settings')
  url.searchParams.set('spotify', status)
  return { statusCode: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' }, body: '' }
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { Allow: 'GET' }, body: 'Method not allowed' }
  const query = event.queryStringParameters || {}
  if (query.error) return redirect(event, 'denied')
  if (!query.code || !query.state || !spotifyConfig()) return redirect(event, 'failed')

  const supabase = getSupabaseAdmin()
  const { data: oauthState, error: stateError } = await supabase
    .from('spotify_oauth_states')
    .select('state, profile_id, code_verifier, expires_at')
    .eq('state', query.state)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (stateError || !oauthState) return redirect(event, 'invalid_state')

  try {
    const token = await exchangeSpotifyToken({
      grant_type: 'authorization_code',
      code: query.code,
      redirect_uri: spotifyConfig()!.redirectUri,
      code_verifier: oauthState.code_verifier
    })
    if (!token.refresh_token) throw new Error('Spotify did not return a refresh token')
    const meResponse = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token.access_token}` } })
    if (!meResponse.ok) throw new Error('Spotify profile lookup failed')
    const spotifyUser = await meResponse.json() as { id: string }
    const { error } = await supabase.from('spotify_connections').upsert({
      profile_id: oauthState.profile_id,
      spotify_user_id: spotifyUser.id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      scopes: (token.scope || '').split(' ').filter(Boolean),
      updated_at: new Date().toISOString()
    })
    if (error) throw error
    await supabase.from('spotify_oauth_states').delete().eq('state', query.state)
    return redirect(event, 'connected')
  } catch {
    await supabase.from('spotify_oauth_states').delete().eq('state', query.state)
    return redirect(event, 'failed')
  }
}
