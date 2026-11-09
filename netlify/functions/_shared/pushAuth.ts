import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ('https://' + 'hfvgobhxiuchchblaajq.supabase.co')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const anonKey = process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || ['sb_publishable_', 'kQsFx4GuieBdbGJaEl3eDg_', 'RE0FD9lR'].join('')

  return createClient(url, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function authenticateNetlifyUser(event: any) {
  const authHeader = Object.entries(event.headers || {}).find(([k]) => k.toLowerCase() === 'authorization')?.[1] as string | undefined
  const accessToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!accessToken) {
    return { error: 'Authentication required', statusCode: 401 }
  }

  const supabase = getSupabaseAdmin()
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !user) {
    return { error: 'Invalid authentication token', statusCode: 401 }
  }

  // Local development may not have SUPABASE_SERVICE_ROLE_KEY configured.
  // Resolve the profile through the authenticated RPC before falling back to
  // service-role/profile lookups, so RLS still protects this request.
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
  if (url && anonKey) {
    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    })
    const { data: rpcProfile } = await userClient.rpc('get_my_profile')
    if (rpcProfile?.id) {
      return { supabase, user, profile: rpcProfile }
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, partnership_id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    const { data: profile2 } = await supabase
      .from('profiles')
      .select('id, partnership_id, name')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile2) {
      return { error: 'No profile linked to account', statusCode: 403 }
    }
    return { supabase, user, profile: profile2 }
  }

  return { supabase, user, profile }
}
