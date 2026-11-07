import { defineEventHandler, readBody, createError } from 'h3'
import {
  configureWebPush,
  sendWebPushToSubscription
} from '~/server/utils/webPush'
import { getAuthenticatedPushContext } from '~/server/utils/pushAuth'
import { checkRateLimit } from '~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 6, windowMs: 60000, keyPrefix: 'push_test' })
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele powiadomień testowych. Odczekaj chwilę.'
    })
  }

  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'Missing request body' })
  }

  const wp = configureWebPush(config)
  if (!wp) {
    throw createError({
      statusCode: 500,
      statusMessage: 'VAPID keys not configured on server'
    })
  }

  const { supabase, profile } = await getAuthenticatedPushContext(event, config)

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', profile.id)

  if (error || !subscriptions || subscriptions.length === 0) {
    return {
      success: false,
      message: 'Brak zarejestrowanych urządzeń dla tego konta. Upewnij się, że zezwoliłeś na powiadomienia w przeglądarce.'
    }
  }

  const payload = {
    title: body.title || 'DuoNest - Test Powiadomień',
    body: body.body || 'Powiadomienia Web Push działają w 100%! Będziesz na bieżąco, nawet gdy aplikacja jest zamknięta.',
    data: {
      url: body.url || '/tabs/nest',
      category: 'nudges'
    },
    tag: 'duonest-test-' + Date.now(),
    vibrate: body.vibrate !== undefined ? body.vibrate : [120, 60, 120, 60, 180],
    silent: body.silent === true
  }

  let sent = 0
  for (const sub of subscriptions) {
    const ok = await sendWebPushToSubscription(wp, supabase, sub, payload)
    if (ok) sent++
  }

  return {
    success: true,
    sentCount: sent,
    totalDevices: subscriptions.length
  }
})

