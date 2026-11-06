import { defineEventHandler, readBody, createError } from 'h3'
import { configureWebPush, getSupabaseServerClient } from '~/server/utils/webPush'
import { checkRateLimit, getClientIp } from '~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const rate = checkRateLimit(`push_sub:${ip}`, 20, 60000)
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele żądań rejestracji powiadomień. Odczekaj chwilę.'
    })
  }

  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body || !body.userId || !body.subscription) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing userId or subscription object'
    })
  }

  const { userId, partnershipId, subscription, userAgent } = body
  const { endpoint, keys } = subscription

  if (
    !endpoint ||
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    endpoint.length > 1024 ||
    !keys?.p256dh ||
    typeof keys.p256dh !== 'string' ||
    keys.p256dh.length > 256 ||
    !keys?.auth ||
    typeof keys.auth !== 'string' ||
    keys.auth.length > 256
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid subscription object: invalid endpoint or cryptographic keys'
    })
  }

  const supabase = getSupabaseServerClient(config)
  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase server client not available'
    })
  }

  // Ensure VAPID is configured
  configureWebPush(config)

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        partnership_id: partnershipId || null,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'endpoint' }
    )
    .select()

  if (error) {
    console.error('[WebPush] Error saving push subscription:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to save push subscription'
    })
  }

  return {
    success: true,
    message: 'Push subscription registered successfully',
    id: data?.[0]?.id
  }
})

