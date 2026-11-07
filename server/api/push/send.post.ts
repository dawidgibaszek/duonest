import { defineEventHandler, readBody, createError } from 'h3'
import {
  configureWebPush,
  sendWebPushToSubscription,
  type PushNotificationPayload
} from '~/server/utils/webPush'
import { getAuthenticatedPushContext } from '~/server/utils/pushAuth'
import { checkRateLimit } from '~/server/utils/rateLimit'
import { formatPartnerAction } from '~/server/utils/pushFormatter'

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 30, windowMs: 60000, keyPrefix: 'push_send' })
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele powiadomień. Odczekaj chwilę.'
    })
  }

  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing request body'
    })
  }

  const wp = configureWebPush(config)
  if (!wp) {
    console.warn('[WebPush] VAPID keys not configured, skipping web push')
    return {
      success: false,
      message: 'VAPID keys not configured on server'
    }
  }

  const { supabase, profile } = await getAuthenticatedPushContext(event, config)
  const partnershipId = profile.partnership_id
  if (!partnershipId) {
    throw createError({ statusCode: 403, statusMessage: 'An active partnership is required' })
  }

  const { data: part, error: partnershipError } = await supabase
    .from('partnerships')
    .select('id, partner1_id, partner2_id')
    .eq('id', partnershipId)
    .maybeSingle()

  if (partnershipError || !part) {
    throw createError({ statusCode: 403, statusMessage: 'Partnership is unavailable' })
  }

  const partnerId = part.partner1_id === profile.id
    ? part.partner2_id
    : part.partner2_id === profile.id
      ? part.partner1_id
      : null
  if (!partnerId) {
    throw createError({ statusCode: 403, statusMessage: 'Authenticated profile is not a partnership member' })
  }

  // Sanitize redirect URL to prevent Open Redirect
  const sanitizeUrl = (raw: string | undefined): string => {
    if (!raw || typeof raw !== 'string') return '/tabs/nest'
    const clean = raw.trim()
    if (clean.startsWith('/') && !clean.startsWith('//') && !clean.includes('\\')) {
      return clean
    }
    return '/tabs/nest'
  }

  let finalPayload: PushNotificationPayload | null = null

  if (typeof body.action === 'string' && body.action.length <= 64) {
    const formatted = formatPartnerAction(body.action, body.payload, profile.name || 'Twój Partner')
    if (!formatted) {
      return {
        success: true,
        message: 'Action ignored (no notification needed)'
      }
    }
    finalPayload = {
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
  }

  if (!finalPayload) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Could not construct notification payload from request'
    })
  }

  // Find target subscriptions:
  let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth, user_id')

  query = query.eq('user_id', partnerId)

  const { data: subscriptions, error } = await query

  if (error) {
    console.error('[WebPush] Error fetching subscriptions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Nie udało się pobrać subskrypcji'
    })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return {
      success: true,
      sentCount: 0,
      message: 'No active push subscriptions found for recipient'
    }
  }

  // Send to all recipient devices in parallel
  const sendPromises = subscriptions.map((sub: any) =>
    sendWebPushToSubscription(wp, supabase, sub, finalPayload!)
  )

  const results = await Promise.allSettled(sendPromises)
  const successfulCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length

  return {
    success: true,
    sentCount: successfulCount,
    totalDevices: subscriptions.length
  }
})

