import { authenticateNetlifyUser } from './_shared/pushAuth'
import { corsHeaders, response } from './_shared/lastfm'

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

  const visible = body.visible_to_partner ?? body.visible
  if (typeof visible !== 'boolean') return response(400, { success: false, error: 'Pole visible_to_partner musi być boolean' }, headers)

  const payload = {
    profile_id: auth.profile.id,
    partnership_id: auth.profile.partnership_id || null,
    is_visible: visible,
    updated_at: new Date().toISOString()
  }

  // 1. Primary: music_presence
  const { error: musicPresErr } = await auth.supabase.from('music_presence').upsert(payload)

  // 2. Fallback: spotify_presence
  if (musicPresErr) {
    const { error: legacyErr } = await auth.supabase.from('spotify_presence').upsert(payload)
    if (legacyErr) return response(500, { success: false, error: 'Nie udało się zaktualizować widoczności' }, headers)
  } else {
    // Keep legacy in sync if it exists
    await auth.supabase.from('spotify_presence').upsert(payload).catch(() => {})
  }

  return response(200, { success: true, visible_to_partner: visible }, headers)
}

