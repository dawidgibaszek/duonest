import { configureWebPush, isAllowedPushEndpoint } from '../../server/utils/webPush'
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
    const body = event.body ? JSON.parse(event.body) : {}

    if (!body || !body.subscription) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Missing subscription object' })
      }
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
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Invalid subscription object' })
      }
    }

    configureWebPush({})

    const { data: existingSubscription, error: existingError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .eq('endpoint', endpoint)
      .maybeSingle()

    if (existingError) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Unable to verify push subscription ownership' })
      }
    }

    if (existingSubscription && existingSubscription.user_id !== profile.id) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Push endpoint belongs to another account' })
      }
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
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Nie udało się zapisać subskrypcji' })
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Push subscription registered successfully',
        id: data?.[0]?.id
      })
    }
  } catch (err: any) {
    console.error('[push-subscribe] Error saving subscription:', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message || 'Internal error' })
    }
  }
}
