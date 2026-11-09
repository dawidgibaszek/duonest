import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, createOAuthState, response, spotifyConfig, spotifyServerConfig, spotifyScopes } from './_shared/spotify'

export const handler = async (event: any) => {
  const headers = corsHeaders('GET, OPTIONS')
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
    if (event.httpMethod !== 'GET') return response(405, { success: false, error: 'Method not allowed' }, headers)
    if (!spotifyServerConfig()) {
      return response(503, {
        success: false,
        error: 'Spotify integration is not configured for server-side storage',
        details: 'Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI and SUPABASE_SERVICE_ROLE_KEY, then restart the dev server.'
      }, headers)
    }

    const auth = await authenticateNetlifyUser(event)
    if ('error' in auth) return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)
    const { state, verifier, challenge } = createOAuthState()
    const supabase = auth.supabase
    const { error } = await supabase.from('spotify_oauth_states').insert({
      state,
      profile_id: auth.profile.id,
      code_verifier: verifier,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString()
    })
    if (error) {
      console.error('[spotify-start] OAuth state insert failed:', error.message)
      return response(500, {
        success: false,
        error: 'Unable to start Spotify authorization',
        ...(process.env.NODE_ENV !== 'production' ? { details: error.message } : {})
      }, headers)
    }

    const config = spotifyConfig()!
    const url = new URL('https://accounts.spotify.com/authorize')
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: spotifyScopes.join(' '),
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge
    }).toString()
    return response(200, { authorization_url: url.toString() }, headers)
  } catch (error: any) {
    console.error('[spotify-start] Unexpected error:', error)
    return response(500, {
      success: false,
      error: 'Unable to start Spotify authorization',
      ...(process.env.NODE_ENV !== 'production' ? { details: error?.message || 'Unknown server error' } : {})
    }, headers)
  }
}
