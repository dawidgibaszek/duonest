import { configureWebPush, sendWebPushToSubscription } from '../../server/utils/webPush'
import { authenticateNetlifyUser } from './_shared/pushAuth'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const authResult = await authenticateNetlifyUser(event)
    if ('error' in authResult) {
      return {
        statusCode: authResult.statusCode || 401,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: authResult.error })
      }
    }

    const { supabase, profile } = authResult
    const wp = configureWebPush({})
    if (!wp) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'VAPID keys not configured on server' })
      }
    }

    const body = event.body ? JSON.parse(event.body) : {}

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', profile.id)

    if (error || !subscriptions || subscriptions.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Brak zarejestrowanych urządzeń dla tego konta. Upewnij się, że zezwoliłeś na powiadomienia w przeglądarce.'
        })
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
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        sentCount: sent,
        totalDevices: subscriptions.length
      })
    }
  } catch (err: any) {
    console.error('[push-test] Error sending test push:', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message || 'Internal error' })
    }
  }
}
