import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedPushContext } from '~/server/utils/pushAuth'
import { checkRateLimit } from '~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 20, windowMs: 60000, keyPrefix: 'push_unsub' })
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele żądań wyrejestrowania. Odczekaj chwilę.'
    })
  }

  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body || !body.endpoint || typeof body.endpoint !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing or invalid endpoint URL'
    })
  }

  const { supabase, profile } = await getAuthenticatedPushContext(event, config)

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('user_id', profile.id)

  if (error) {
    console.error('[WebPush] Error deleting push subscription:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nie udało się usunąć subskrypcji'
    })
  }

  return {
    success: true,
    message: 'Push subscription removed successfully'
  }
})

