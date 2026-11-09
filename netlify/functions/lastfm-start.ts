import { randomBytes } from 'node:crypto'
import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, lastFmConfig, response } from './_shared/lastfm'

export const handler = async (event: any) => {
  const headers = corsHeaders('GET, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'GET') return response(405, { success: false, error: 'Method not allowed' }, headers)

  const config = lastFmConfig()
  if (!config) {
    return response(
      503,
      {
        success: false,
        error: 'Integracja Last.fm nie jest skonfigurowana',
        details: 'Ustaw LASTFM_API_KEY oraz LASTFM_SHARED_SECRET w pliku .env i zrestartuj serwer.'
      },
      headers
    )
  }

  const auth = await authenticateNetlifyUser(event)
  if ('error' in auth) return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)

  const state = randomBytes(24).toString('hex')
  const { error } = await auth.supabase.from('spotify_oauth_states').insert({
    state,
    profile_id: auth.profile.id,
    code_verifier: 'lastfm',
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString()
  })

  if (error) {
    console.error('[lastfm-start] Błąd zapisu stanu:', error.message)
    return response(500, { success: false, error: 'Nie udało się rozpocząć autoryzacji Last.fm' }, headers)
  }

  const host = event?.headers?.['x-forwarded-host'] || event?.headers?.host
  const proto = event?.headers?.['x-forwarded-proto'] || 'https'
  const currentOrigin = host ? `${proto}://${host}` : ''
  const baseUrl = currentOrigin || process.env.URL || process.env.NUXT_PUBLIC_SITE_URL || 'https://duonestapp.pl'

  const callbackUrl = new URL('/auth/lastfm/callback', baseUrl)
  callbackUrl.searchParams.set('state', state)

  const authUrl = new URL('https://www.last.fm/api/auth/')
  authUrl.searchParams.set('api_key', config.apiKey)
  authUrl.searchParams.set('cb', callbackUrl.toString())

  return response(200, { authorization_url: authUrl.toString() }, headers)
}

