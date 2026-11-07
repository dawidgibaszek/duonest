import { createError, getHeader } from 'h3'
import { getSupabaseServerClient } from '~/server/utils/webPush'

export async function getAuthenticatedPushContext(event: any, config: any) {
  const authorization = getHeader(event, 'authorization') || ''
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const supabase = getSupabaseServerClient(config)
  if (!supabase) {
    throw createError({ statusCode: 503, statusMessage: 'Push service is not configured' })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid authentication token' })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, partnership_id, name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to load authenticated profile' })
  }
  if (!profile) {
    throw createError({ statusCode: 403, statusMessage: 'No profile is linked to this account' })
  }

  return { supabase, user, profile }
}