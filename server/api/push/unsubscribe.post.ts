import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseServerClient } from '~/server/utils/webPush'
import { checkRateLimit, getClientIp } from '~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const rate = checkRateLimit(`push_unsub:${ip}`, 20, 60000)
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele żądań wyrejestrowania. Odczekaj chwilę.'
    })
  }

  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body || !body.endpoint || typeof body.endpoint !== 'string' || !body.endpoint.startsWith('https://')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing or invalid endpoint URL'
    })
  }

  const supabase = getSupabaseServerClient(config)
  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase server client not available'
    })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)

  if (error) {
    console.error('[WebPush] Error deleting push subscription:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete push subscription'
    })
  }

  return {
    success: true,
    message: 'Push subscription removed successfully'
  }
})

