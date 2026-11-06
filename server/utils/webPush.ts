import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: {
    url?: string
    category?: string
    [key: string]: any
  }
  vibrate?: number[]
  tag?: string
  renotify?: boolean
  requireInteraction?: boolean
}

let isVapidConfigured = false

export function configureWebPush(config: any) {
  if (isVapidConfigured) return webpush

  const subject = config.vapidSubject || process.env.VAPID_SUBJECT || 'mailto:kontakt@duonestapp.pl'
  const publicKey = config.public?.vapidPublicKey || process.env.VAPID_PUBLIC_KEY || process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = config.vapidPrivateKey || process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) {
    console.warn('[WebPush] VAPID keys not configured in runtimeConfig/env')
    return null
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    isVapidConfigured = true
    return webpush
  } catch (err) {
    console.error('[WebPush] Failed to set VAPID details:', err)
    return null
  }
}

export function getSupabaseServerClient(config: any) {
  const url = config.public?.supabaseUrl || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const key = config.public?.supabaseKey || process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY
  if (!url || !key) {
    console.error('[WebPush] Supabase URL or Key missing')
    return null
  }
  return createClient(url, key, {
    auth: { persistSession: false }
  })
}

export async function sendWebPushToSubscription(
  wp: typeof webpush,
  supabase: any,
  subRecord: { id?: string; endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload
): Promise<boolean> {
  const pushSubscription = {
    endpoint: subRecord.endpoint,
    keys: {
      p256dh: subRecord.p256dh,
      auth: subRecord.auth
    }
  }

  const payloadString = JSON.stringify({
    title: payload.title || 'DuoNest',
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/favicon.png',
    data: {
      url: payload.data?.url || '/tabs/nest',
      category: payload.data?.category,
      ...(payload.data || {})
    },
    vibrate: payload.vibrate !== undefined ? payload.vibrate : [120, 60, 120, 60, 180],
    silent: payload.silent === true,
    tag: payload.tag || 'duonest-' + Date.now(),
    renotify: payload.renotify !== false
  })

  try {
    await wp.sendNotification(pushSubscription, payloadString, {
      TTL: 60 * 60 * 24 // 24 hours
    })
    return true
  } catch (err: any) {
    // 404 or 410 Gone means the user unsubscribed or endpoint is no longer valid
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.info(`[WebPush] Subscription expired (${err.statusCode}), deleting endpoint:`, subRecord.endpoint.slice(0, 30) + '...')
      if (supabase) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subRecord.endpoint)
      }
    } else {
      console.warn('[WebPush] Error sending notification to endpoint:', err.message || err)
    }
    return false
  }
}

