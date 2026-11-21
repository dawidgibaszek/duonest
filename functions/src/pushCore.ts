/**
 * Push notifications – device registration and delivery, shared by the Nuxt
 * dev server and the production Cloud Function.
 *
 * NOTE: an identical copy lives in server/utils/pushCore.ts. Keep both in sync.
 *
 * Two kinds of devices live in `push_subscriptions/{id}` (server-only collection):
 *   - type 'web' – browser / PWA Web Push subscription (VAPID), id = sha256(endpoint)
 *   - type 'fcm' – iOS app, Firebase Cloud Messaging token,   id = sha256('fcm:' + token)
 *
 * The PWA filters categories in its service worker; the iOS app cannot run code
 * before a notification is shown, so FCM devices store their category switches
 * (`settings`) and are filtered here.
 *
 * The iOS doodle widget (iOS 26+) has its own APNs token in `widget_push_tokens/{id}`
 * (server-only, id = sha256('widget:' + token)). FCM cannot address it, so it is pushed
 * straight to APNs.
 *
 * Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (web only – FCM uses the
 * Admin SDK credentials); APNS_KEY_PRODUCTION, APNS_KEY_SANDBOX (.p8 keys for widget pushes).
 */
import { createHash, sign } from 'crypto'
import { connect } from 'http2'
import type { Messaging } from 'firebase-admin/messaging'
import webpush from 'web-push'
import { formatPartnerAction } from './pushFormatter'

type Db = any

export interface PushCaller {
  uid: string
  profileId: string
  partnershipId: string | null
  name: string | null
}

export interface PushResult {
  status: number
  body: any
}

const ok = (body: any): PushResult => ({ status: 200, body })
const fail = (status: number, error: string): PushResult => ({ status, body: { success: false, error } })

const COLLECTION = 'push_subscriptions'
const WIDGET_COLLECTION = 'widget_push_tokens'
const TTL_SECONDS = 60 * 60 * 24
const SETTING_KEYS = ['nudges', 'mood', 'calendar', 'shopping', 'tasks', 'meals', 'partnerOnline', 'wishlist', 'savings', 'sound', 'vibrate']

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const webDocId = (endpoint: string) => sha256(endpoint)
const fcmDocId = (token: string) => sha256('fcm:' + token)
const widgetDocId = (token: string) => sha256('widget:' + token.toLowerCase())

const ALLOWED_PUSH_HOSTS = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com'
])

export function isAllowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') && ALLOWED_PUSH_HOSTS.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

export function sanitizePushUrl(raw: any): string {
  if (typeof raw !== 'string') return '/tabs/nest'
  const clean = raw.trim()
  return clean.startsWith('/') && !clean.startsWith('//') && !clean.includes('\\') ? clean : '/tabs/nest'
}

let vapidReady: boolean | null = null
function configureVapid() {
  if (vapidReady) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const privateKey = process.env.VAPID_PRIVATE_KEY || ''
  if (!publicKey || !privateKey) return false
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:kontakt@duonestapp.pl', publicKey, privateKey)
    vapidReady = true
  } catch {
    console.error('[push] invalid VAPID configuration')
    vapidReady = false
  }
  return vapidReady
}

function cleanSettings(raw: any): Record<string, boolean> | null {
  if (!raw || typeof raw !== 'object') return null
  const out: Record<string, boolean> = {}
  for (const key of SETTING_KEYS) if (typeof raw[key] === 'boolean') out[key] = raw[key]
  return out
}

// -----------------------------------------------------------------------------
// Registration
// -----------------------------------------------------------------------------
const validFcmToken = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 20 && value.length <= 4096

async function saveFcmDevice(db: Db, caller: PushCaller, token: string, previousToken: unknown, data: Record<string, unknown>) {
  const devices = db.collection(COLLECTION)
  const ref = devices.doc(fcmDocId(token))
  const previousRef = validFcmToken(previousToken) && previousToken !== token
    ? devices.doc(fcmDocId(previousToken))
    : null

  await db.runTransaction(async (transaction: any) => {
    if (previousRef) {
      const previous = await transaction.get(previousRef)
      if (previous.data()?.auth_user_id === caller.uid) transaction.delete(previousRef)
    }
    transaction.set(ref, { ...data, id: ref.id })
  })

  return ref.id
}

const validWidgetToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64,200}$/i.test(value)

async function saveWidgetToken(db: Db, caller: PushCaller, body: any): Promise<PushResult> {
  const token = body.widgetPushToken
  if (!validWidgetToken(token)) return fail(400, 'Invalid widget push token')
  const ref = db.collection(WIDGET_COLLECTION).doc(widgetDocId(token))
  await ref.set({
    id: ref.id,
    user_id: caller.profileId,
    auth_user_id: caller.uid,
    partnership_id: caller.partnershipId,
    token: token.toLowerCase(),
    environment: body.environment === 'development' ? 'development' : 'production',
    updated_at: new Date().toISOString()
  })
  return ok({ success: true, id: ref.id })
}

async function subscribe(db: Db, caller: PushCaller, body: any): Promise<PushResult> {
  if (body?.widgetPushToken !== undefined) return saveWidgetToken(db, caller, body)

  const base = {
    user_id: caller.profileId,
    auth_user_id: caller.uid,
    partnership_id: caller.partnershipId,
    user_agent: typeof body?.userAgent === 'string' ? body.userAgent.slice(0, 512) : null,
    updated_at: new Date().toISOString()
  }

  // iOS app (FCM token)
  if (body?.fcmToken !== undefined) {
    const token = body.fcmToken
    if (!validFcmToken(token)) return fail(400, 'Invalid FCM token')
    const id = await saveFcmDevice(db, caller, token, body.previousFcmToken, {
      ...base,
      type: 'fcm',
      platform: body.platform === 'android' ? 'android' : 'ios',
      fcm_token: token,
      enabled: body.enabled !== false,
      settings: cleanSettings(body.settings) || {}
    })
    return ok({ success: true, id })
  }

  // Browser / PWA (Web Push)
  const sub = body?.subscription
  const endpoint = sub?.endpoint
  if (
    typeof endpoint !== 'string' || endpoint.length > 1024 || !isAllowedPushEndpoint(endpoint) ||
    typeof sub.keys?.p256dh !== 'string' || typeof sub.keys?.auth !== 'string'
  ) {
    return fail(400, 'Invalid subscription')
  }
  const ref = db.collection(COLLECTION).doc(webDocId(endpoint))
  await ref.set({
    ...base,
    id: ref.id,
    type: 'web',
    endpoint,
    p256dh: sub.keys.p256dh.slice(0, 256),
    auth: sub.keys.auth.slice(0, 256)
  }, { merge: true })
  return ok({ success: true, id: ref.id })
}

async function unsubscribe(db: Db, caller: PushCaller, body: any): Promise<PushResult> {
  let id: string | null = null
  let collection = COLLECTION
  if (typeof body?.fcmToken === 'string' && body.fcmToken) id = fcmDocId(body.fcmToken)
  else if (typeof body?.endpoint === 'string' && body.endpoint) id = webDocId(body.endpoint)
  else if (validWidgetToken(body?.widgetPushToken)) {
    id = widgetDocId(body.widgetPushToken)
    collection = WIDGET_COLLECTION
  }
  if (!id) return fail(400, 'Endpoint or fcmToken required')

  const ref = db.collection(collection).doc(id)
  const removed = await db.runTransaction(async (transaction: any) => {
    const snap = await transaction.get(ref)
    const subscription = snap.data()
    if (subscription && (subscription.auth_user_id
      ? subscription.auth_user_id !== caller.uid
      : subscription.user_id !== caller.profileId)) return false
    if (snap.exists) transaction.delete(ref)
    return true
  })
  return removed ? ok({ success: true }) : fail(403, 'Push device belongs to another account')
}

// -----------------------------------------------------------------------------
// Delivery
// -----------------------------------------------------------------------------
interface OutgoingNotification {
  title: string
  body: string
  url: string
  category: string
  action?: string
  vibrate?: number[]
  silent?: boolean
}

const DEAD_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
])

// The token may have been re-registered while a delivery was in flight.
async function removeDeadDevice(snapshot: any) {
  await snapshot.ref.delete({ lastUpdateTime: snapshot.updateTime }).catch(() => {})
}

function fcmFailureMessage(code: string, platform?: string) {
  if (platform !== 'android' && (code === 'messaging/third-party-auth-error' || code === 'messaging/invalid-apns-credentials')) {
    return 'Firebase odrzucił wysyłkę do iOS. Sprawdź klucz APNs dla środowiska tej wersji aplikacji w Firebase.'
  }
  return 'Firebase nie przyjął powiadomienia. Spróbuj ponownie.'
}

async function deliverToDevice(messaging: Messaging, doc: any, n: OutgoingNotification, respectSettings: boolean): Promise<{ success: boolean; error?: string }> {
  const sub = doc.data() || {}

  if (sub.enabled === false) return { success: false }

  if (sub.type === 'fcm' || sub.fcm_token) {
    if (!messaging || typeof sub.fcm_token !== 'string') return { success: false, error: 'Brak FCM Messaging lub tokenu' }
    const settings = sub.settings || {}
    if (respectSettings && settings[n.category] === false) return { success: false }
    const silent = n.silent === true || settings.sound === false

    try {
      await messaging.send({
        token: sub.fcm_token,
        notification: { title: n.title, body: n.body },
        data: { url: n.url, category: n.category, action: n.action || '', recipientProfileId: sub.user_id },
        android: {
          priority: 'high',
          ttl: TTL_SECONDS * 1000,
          notification: {
            channelId: silent ? 'duonest_silent' : 'duonest_default',
            icon: 'ic_stat_duonest',
            color: '#232c38',
            ...(silent ? {} : { defaultSound: true, defaultVibrateTimings: settings.vibrate !== false })
          }
        },
        apns: {
          headers: {
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'apns-expiration': String(Math.floor(Date.now() / 1000) + TTL_SECONDS)
          },
          payload: {
            aps: {
              ...(silent ? {} : { sound: 'default' }),
              'thread-id': `duonest-${n.category}`
            }
          }
        }
      })
      return { success: true }
    } catch (err: any) {
      const code = err?.code || 'unknown'
      console.error('[push] FCM send failed:', code)
      if (DEAD_FCM_CODES.has(code)) {
        await removeDeadDevice(doc)
        return { success: false, error: 'Rejestracja tego urządzenia wygasła. Włącz powiadomienia ponownie.' }
      }
      return { success: false, error: fcmFailureMessage(code, sub.platform) }
    }
  }

  // Web Push
  if (!isAllowedPushEndpoint(sub.endpoint) || !configureVapid()) return { success: false, error: 'WebPush nieobsługiwany' }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: n.title,
        body: n.body,
        icon: '/pwa-192x192.png',
        badge: '/badge-96.png',
        data: { url: n.url, category: n.category, action: n.action },
        tag: `duonest-${n.category}-${Date.now()}`,
        vibrate: n.vibrate ?? [120, 60, 120, 60, 180],
        silent: n.silent === true,
        renotify: true
      }),
      { TTL: TTL_SECONDS }
    )
    return { success: true }
  } catch (err: any) {
    const errStr = `WebPush ${err?.statusCode || 'send failed'}`
    if (err?.statusCode === 404 || err?.statusCode === 410) await removeDeadDevice(doc)
    else console.warn('[push] Web Push send failed:', errStr)
    return { success: false, error: errStr }
  }
}

async function deliverToProfile(db: Db, messaging: Messaging, profileId: string, n: OutgoingNotification, respectSettings: boolean) {
  const subs = await db.collection(COLLECTION).where('user_id', '==', profileId).get()
  const results = await Promise.all(subs.docs.map((doc: any) => deliverToDevice(messaging, doc, n, respectSettings)))
  const sentCount = results.filter(r => r.success).length
  const failed = results.find(r => !r.success && r.error)
  return { sentCount, totalDevices: subs.size, message: failed?.error }
}

async function resolvePartner(db: Db, caller: PushCaller): Promise<string | null> {
  if (!caller.partnershipId) return null
  const d = (await db.collection('partnerships').doc(caller.partnershipId).get()).data()
  if (!d) return null
  if (d.partner1_id === caller.profileId) return d.partner2_id || null
  if (d.partner2_id === caller.profileId) return d.partner1_id || null
  return null
}

/** Notification about the caller's action – sent to their partner ONLY; text is built server-side. */
async function send(db: Db, messaging: Messaging, caller: PushCaller, body: any): Promise<PushResult> {
  const action = body?.action
  if (typeof action !== 'string' || !action || action.length > 64) return fail(400, 'Missing action')
  if (!caller.partnershipId) return fail(403, 'An active partnership is required')
  const partnerId = await resolvePartner(db, caller)
  if (!partnerId) return fail(403, 'Authenticated profile is not a partnership member')

  const widgets = WIDGET_ACTIONS.has(action) ? refreshPartnerWidgets(db, messaging, partnerId, action, caller) : Promise.resolve()
  const formatted = formatPartnerAction(action, body?.payload, caller.name || 'Twój Partner')
  if (!formatted) {
    await widgets
    return ok({ success: true, message: 'Action ignored (no notification needed)' })
  }

  const [result] = await Promise.all([deliverToProfile(db, messaging, partnerId, {
    title: String(formatted.title).slice(0, 120),
    body: String(formatted.body).slice(0, 400),
    url: sanitizePushUrl(formatted.url),
    category: formatted.category,
    action
  }, true), widgets])
  return ok({ success: true, ...result })
}

const WIDGET_ACTIONS = new Set(['DOODLE_SAVE', 'DOODLE_DRAWING_STATUS'])

/**
 * Silent message for the doodle home-screen widget on the partner's phones, whichever
 * platform drew. Android gets a data-only message (notification messages of a closed app
 * go straight to the tray); iOS gets a background push that wakes the app to reload it.
 * A saved doodle also reaches iOS 26+ widgets directly, even when the app was force-quit.
 */
async function refreshPartnerWidgets(db: Db, messaging: Messaging, partnerId: string, action: string, caller: PushCaller) {
  await Promise.all([
    action === 'DOODLE_SAVE' ? pushWidgetReloads(db, partnerId) : undefined,
    wakePartnerApps(db, messaging, partnerId, action, caller)
  ])
}

async function wakePartnerApps(db: Db, messaging: Messaging, partnerId: string, action: string, caller: PushCaller) {
  if (!messaging) return
  const subs = await db.collection(COLLECTION).where('user_id', '==', partnerId).get()
  const ttlSeconds = action === 'DOODLE_SAVE' ? TTL_SECONDS : 60
  await Promise.all(subs.docs.map(async (doc: any) => {
    const sub = doc.data() || {}
    if (typeof sub.fcm_token !== 'string') return
    const data = { widget: 'doodle', action, senderName: String(caller.name || '').slice(0, 60), recipientProfileId: partnerId }
    try {
      await messaging.send(sub.platform === 'android'
        ? { token: sub.fcm_token, data, android: { priority: 'high', ttl: ttlSeconds * 1000 } }
        : {
            token: sub.fcm_token,
            data,
            apns: {
              headers: {
                'apns-push-type': 'background',
                'apns-priority': '5',
                'apns-expiration': String(Math.floor(Date.now() / 1000) + ttlSeconds)
              },
              payload: { aps: { contentAvailable: true } }
            }
          })
    } catch (err: any) {
      if (DEAD_FCM_CODES.has(err?.code)) await removeDeadDevice(doc)
      else console.warn('[push] widget refresh failed:', err?.code || 'unknown')
    }
  }))
}

// WidgetKit push updates. Each key only works in its own APNs environment.
const APNS_TEAM_ID = 'RJ378D5P3C'
const APNS_WIDGET_TOPIC = 'com.belka.duonest.push-type.widgets'
const APNS = {
  production: { host: 'api.push.apple.com', keyId: 'S7VWY4RJ3X', keyEnv: 'APNS_KEY_PRODUCTION' },
  development: { host: 'api.sandbox.push.apple.com', keyId: 'AUNYM58R67', keyEnv: 'APNS_KEY_SANDBOX' }
} as const
type ApnsEnvironment = keyof typeof APNS
const DEAD_APNS_REASONS = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'])

// APNs rejects provider tokens older than an hour and throttles refreshing them more than every 20 minutes.
const apnsJwts = new Map<ApnsEnvironment, { jwt: string; issuedAt: number }>()
function apnsProviderToken(environment: ApnsEnvironment) {
  const now = Math.floor(Date.now() / 1000)
  const cached = apnsJwts.get(environment)
  if (cached && now - cached.issuedAt < 40 * 60) return cached.jwt
  const key = process.env[APNS[environment].keyEnv]?.replace(/\\n/g, '\n')
  if (!key) return null
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${part({ alg: 'ES256', kid: APNS[environment].keyId })}.${part({ iss: APNS_TEAM_ID, iat: now })}`
  const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  const jwt = `${unsigned}.${signature}`
  apnsJwts.set(environment, { jwt, issuedAt: now })
  return jwt
}

function sendApnsWidgetPush(environment: ApnsEnvironment, token: string): Promise<{ status: number; reason?: string }> {
  let jwt: string | null
  try {
    jwt = apnsProviderToken(environment)
  } catch {
    jwt = null
  }
  if (!jwt) return Promise.resolve({ status: 0, reason: 'MissingProviderKey' })

  return new Promise((resolve) => {
    const client = connect(`https://${APNS[environment].host}`)
    let settled = false
    const finish = (result: { status: number; reason?: string }) => {
      if (settled) return
      settled = true
      client.close()
      resolve(result)
    }
    client.on('error', () => finish({ status: 0, reason: 'ConnectionError' }))
    client.setTimeout(10_000, () => {
      finish({ status: 0, reason: 'Timeout' })
      client.destroy()
    })

    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      'apns-push-type': 'widgets',
      'apns-topic': APNS_WIDGET_TOPIC,
      'apns-expiration': String(Math.floor(Date.now() / 1000) + TTL_SECONDS),
      'content-type': 'application/json'
    })
    let status = 0
    let body = ''
    request.setEncoding('utf8')
    request.on('response', (headers) => { status = Number(headers[':status']) || 0 })
    request.on('data', (chunk: string) => { body += chunk })
    request.on('end', () => {
      let reason: string | undefined
      try { reason = JSON.parse(body)?.reason } catch {}
      finish({ status, reason })
    })
    request.on('error', () => finish({ status: 0, reason: 'RequestError' }))
    request.end(JSON.stringify({ aps: { 'content-changed': true } }))
  })
}

async function pushWidgetReloads(db: Db, partnerId: string) {
  const tokens = await db.collection(WIDGET_COLLECTION).where('user_id', '==', partnerId).get()
  await Promise.all(tokens.docs.map(async (doc: any) => {
    const entry = doc.data() || {}
    if (!validWidgetToken(entry.token)) return
    const environment: ApnsEnvironment = entry.environment === 'development' ? 'development' : 'production'
    const result = await sendApnsWidgetPush(environment, entry.token)
    if (result.status === 200) return
    if (result.status === 410 || DEAD_APNS_REASONS.has(result.reason || '')) await removeDeadDevice(doc)
    else console.warn('[push] widget push failed:', result.status, result.reason || 'unknown')
  }))
}

/** A targeted test verifies the current installation, even on a multi-device account. */
async function test(db: Db, messaging: Messaging, caller: PushCaller, body: any): Promise<PushResult> {
  const notification: OutgoingNotification = {
    title: String(body?.title || 'DuoNest · Powiadomienie testowe').slice(0, 120),
    body: String(body?.body || 'To jest powiadomienie testowe z DuoNest.').slice(0, 400),
    url: sanitizePushUrl(body?.url),
    category: 'nudges',
    action: 'TEST',
    vibrate: Array.isArray(body?.vibrate) ? body.vibrate.filter((v: any) => typeof v === 'number').slice(0, 10) : undefined,
    silent: body?.silent === true
  }

  if (body?.fcmToken !== undefined || body?.endpoint !== undefined) {
    const token = body?.fcmToken
    const endpoint = body?.endpoint
    const id = validFcmToken(token)
      ? fcmDocId(token)
      : typeof endpoint === 'string' && endpoint.length <= 1024 && isAllowedPushEndpoint(endpoint) ? webDocId(endpoint) : null
    if (!id) return fail(400, 'Invalid push device')

    const doc = await db.collection(COLLECTION).doc(id).get()
    const device = doc.data()
    if (!device || device.auth_user_id !== caller.uid || device.user_id !== caller.profileId || device.enabled === false) {
      return fail(404, 'Brak aktywnej rejestracji na tym urządzeniu.')
    }
    const result = await deliverToDevice(messaging, doc, notification, false)
    return ok({ success: result.success, sentCount: Number(result.success), totalDevices: 1, message: result.error })
  }

  const result = await deliverToProfile(db, messaging, caller.profileId, notification, false)
  return ok({
    success: result.sentCount > 0,
    ...result,
    message: result.sentCount ? undefined : result.message || 'Brak aktywnych urządzeń dla tego konta.'
  })
}

export const PUSH_ACTIONS = ['subscribe', 'unsubscribe', 'send', 'test'] as const
export type PushAction = typeof PUSH_ACTIONS[number]

export async function handlePushAction(
  db: Db,
  messaging: Messaging,
  caller: PushCaller,
  action: PushAction,
  body: any
): Promise<PushResult> {
  switch (action) {
    case 'subscribe': return subscribe(db, caller, body)
    case 'unsubscribe': return unsubscribe(db, caller, body)
    case 'send': return send(db, messaging, caller, body)
    case 'test': return test(db, messaging, caller, body)
  }
  return fail(404, 'Push endpoint not found')
}
