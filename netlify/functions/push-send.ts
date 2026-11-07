import {
  configureWebPush,
  sendWebPushToSubscription,
  type PushNotificationPayload
} from '../../server/utils/webPush'
import { formatPartnerAction } from '../../server/utils/pushFormatter'
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
    const partnershipId = profile.partnership_id
    if (!partnershipId) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Brak aktywnego gniazdka (partnership)' })
      }
    }

    const body = event.body ? JSON.parse(event.body) : {}
    if (!body || !body.action) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Missing action in request body' })
      }
    }

    const wp = configureWebPush({})
    if (!wp) {
      console.warn('[WebPush] VAPID keys not configured in environment')
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, message: 'VAPID keys not configured' })
      }
    }

    const { data: part, error: partnershipError } = await supabase
      .from('partnerships')
      .select('id, partner1_id, partner2_id')
      .eq('id', partnershipId)
      .maybeSingle()

    if (partnershipError || !part) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Partnership is unavailable' })
      }
    }

    const partnerId = part.partner1_id === profile.id
      ? part.partner2_id
      : part.partner2_id === profile.id
        ? part.partner1_id
        : null

    if (!partnerId) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Partner not found' })
      }
    }

    const formatted = formatPartnerAction(body.action, body.payload, profile.name || 'Twój Partner')
    if (!formatted) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Action ignored (no notification needed)' })
      }
    }

    const sanitizeUrl = (raw: string | undefined): string => {
      if (!raw || typeof raw !== 'string') return '/tabs/nest'
      const clean = raw.trim()
      if (clean.startsWith('/') && !clean.startsWith('//') && !clean.includes('\\')) {
        return clean
      }
      return '/tabs/nest'
    }

    const finalPayload: PushNotificationPayload = {
      title: String(formatted.title).slice(0, 120),
      body: String(formatted.body).slice(0, 400),
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
      data: {
        url: sanitizeUrl(formatted.url),
        category: formatted.category,
        action: body.action
      },
      tag: `duonest-${formatted.category}-${Date.now()}`,
      vibrate: [120, 60, 120, 60, 180],
      renotify: true
    }

    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .eq('user_id', partnerId)

    if (subsError) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Nie udało się pobrać subskrypcji' })
      }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, sentCount: 0, message: 'No subscriptions found for partner' })
      }
    }

    const sendPromises = subscriptions.map((sub: any) =>
      sendWebPushToSubscription(wp, supabase, sub, finalPayload)
    )

    const results = await Promise.allSettled(sendPromises)
    const successfulCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        sentCount: successfulCount,
        totalDevices: subscriptions.length
      })
    }
  } catch (err: any) {
    console.error('[push-send] Error processing push:', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message || 'Internal error' })
    }
  }
}
