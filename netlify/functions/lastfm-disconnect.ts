import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, response } from './_shared/lastfm'

export const handler = async (event: any) => {
  const headers = corsHeaders('POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') return response(405, { success: false, error: 'Method not allowed' }, headers)

  const auth = await authenticateNetlifyUser(event)
  if ('error' in auth) return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)

  await Promise.all([
    auth.supabase.from('lastfm_connections').delete().eq('profile_id', auth.profile.id),
    auth.supabase.from('spotify_presence').update({
      track: null,
      is_playing: false,
      updated_at: new Date().toISOString()
    }).eq('profile_id', auth.profile.id)
  ])

  return response(200, { success: true, connected: false }, headers)
}

