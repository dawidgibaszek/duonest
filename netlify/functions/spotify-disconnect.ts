import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, response } from './_shared/spotify'

export const handler = async (event: any) => {
  const headers = corsHeaders('POST, OPTIONS')
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') return response(405, { success: false, error: 'Method not allowed' }, headers)
  const auth = await authenticateNetlifyUser(event)
  if ('error' in auth) return response(auth.statusCode || 401, { success: false, error: auth.error }, headers)
  const { error } = await auth.supabase.from('spotify_connections').delete().eq('profile_id', auth.profile.id)
  if (error) return response(500, { success: false, error: 'Unable to disconnect Spotify' }, headers)
  await auth.supabase.from('spotify_presence').delete().eq('profile_id', auth.profile.id)
  return response(200, { success: true }, headers)
}
