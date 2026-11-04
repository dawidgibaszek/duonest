import { defineEventHandler, readBody, createError } from 'h3'
import { configureWebPush, getSupabaseServerClient } from '~/server/utils/webPush'

export default defineEventHandler(async (event) => {
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

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid subscription object: missing endpoint, p256dh, or auth key'
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
