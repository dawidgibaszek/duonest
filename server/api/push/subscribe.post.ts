import { defineEventHandler, readBody, createError } from 'h3'
import { configureWebPush, isAllowedPushEndpoint } from '~/server/utils/webPush'
import { getAuthenticatedPushContext } from '~/server/utils/pushAuth'
import { checkRateLimit } from '~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 20, windowMs: 60000, keyPrefix: 'push_sub' })
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele żądań rejestracji powiadomień. Odczekaj chwilę.'
    })
  }

  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body || !body.subscription) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing subscription object'
    })
  }

  const { subscription, userAgent } = body
  const { endpoint, keys } = subscription

  if (
    !endpoint ||
    typeof endpoint !== 'string' ||
    !isAllowedPushEndpoint(endpoint) ||
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

  const { supabase, profile } = await getAuthenticatedPushContext(event, config)

  configureWebPush(config)

  const { data: existingSubscription, error: existingError } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (existingError) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to verify push subscription ownership' })
  }
  if (existingSubscription && existingSubscription.user_id !== profile.id) {
    throw createError({ statusCode: 403, statusMessage: 'Push endpoint belongs to another account' })
  }

  const subscriptionRecord = {
    user_id: profile.id,
    partnership_id: profile.partnership_id || null,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : null,
    updated_at: new Date().toISOString()
  }
  const query = existingSubscription
    ? supabase.from('push_subscriptions').update(subscriptionRecord).eq('endpoint', endpoint).eq('user_id', profile.id)
    : supabase.from('push_subscriptions').insert(subscriptionRecord)
  const { data, error } = await query.select('id')

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 403, statusMessage: 'Push endpoint belongs to another account' })
    }
    console.error('[WebPush] Error saving push subscription:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nie udało się zapisać subskrypcji'
    })
  }

  return {
    success: true,
    message: 'Push subscription registered successfully',
    id: data?.[0]?.id
  }
})

