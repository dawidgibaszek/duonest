import { defineEventHandler, readBody, createError } from 'h3'
import {
  configureWebPush,
  getSupabaseServerClient,
  sendWebPushToSubscription
} from '~/server/utils/webPush'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body || !body.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing userId'
    })
  }

  const wp = configureWebPush(config)
  if (!wp) {
    throw createError({
      statusCode: 500,
      statusMessage: 'VAPID keys not configured on server'
    })
  }

  const supabase = getSupabaseServerClient(config)
  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase server client not available'
    })
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', body.userId)

  if (error || !subscriptions || subscriptions.length === 0) {
    return {
      success: false,
      message: 'Brak zarejestrowanych urządzeń dla tego konta. Upewnij się, że zezwoliłeś na powiadomienia w przeglądarce.'
    }
  }

  const payload = {
    title: body.title || 'DuoNest – Test Powiadomień 💌',
    body: body.body || 'Powiadomienia Web Push działają w 100%! Będziesz na bieżąco, nawet gdy aplikacja jest zamknięta.',
    data: {
      url: body.url || '/tabs/nest',
      category: 'nudges'
    },
    tag: 'duonest-test-' + Date.now(),
    vibrate: [120, 60, 120, 60, 180]
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

