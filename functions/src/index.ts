import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { region } from 'firebase-functions/v1'
import { getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabaseWithUrl } from 'firebase-admin/database'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { databaseUrlForProject } from './firebaseProject'
import express from 'express'
import cors from 'cors'
import { getCalendarFeed, updateCalendarSubscription } from './calendarCore'
import { mutateDuoData } from './duoMutations'
import { DuoDataError } from './partnershipAccess'
import { processScrape } from './wishlistScraper'
import { syncAccount, pairWithCode, disconnectPartnership, resolveCallerProfile, mirrorMembership, pairingRetryAfter } from './duoAccount'
import { refreshPartnerProfile } from './partnerProfile'
import { MAX_AVATAR_BYTES, readProfileAvatar, writeProfileAvatar } from './profileAvatar'
import { handlePushAction, notifySavedDoodle, notifyLocationWidgets, PUSH_ACTIONS, type PushAction } from './pushCore'
import { handleMusicAction, isMusicAction } from './musicCore'
import { handleMoviesTrending, handleMoviesSearch, handleMoviesRandom } from './moviesCore'
import { handleMealsCategories, handleMealsSearch, handleMealsLookup, handleMealsImport } from './mealsCore'
import { requireDuoClient } from './clientAccess'
import { readWidgetDoodle, readWidgetLocation, updateWidgetAccess } from './widgetAccess'
import { storeNativeDiagnosticReports } from './nativeDiagnostics'
import { createAdminRouter } from './adminAccess'
import { locationSession, publishDuoLocation } from './duoLocation'
import { requestPasswordReset, sendVerificationEmail } from './authEmails'

// Inicjalizacja Firebase Admin
if (getApps().length === 0) {
  initializeApp()
}

const db = getFirestore()
const auth = getAuth()
const apiServiceAccount = defineString('DUO_API_SERVICE_ACCOUNT', {
  default: 'duonest-api@duonest-38dc2.iam.gserviceaccount.com'
})

// Realtime Database (null if the project has no default RTDB instance)
const getRtdb = () => {
  try {
    const app = getApp()
    const url = process.env.FIREBASE_DATABASE_URL || app.options.databaseURL ||
      databaseUrlForProject(app.options.projectId || process.env.GCLOUD_PROJECT)
    return url ? getDatabaseWithUrl(url, app) : null
  } catch (_) {
    return null
  }
}

const decodedUser = (req: any) => ({
  uid: req.user.uid,
  email: req.user.email,
  name: typeof req.user.name === 'string' ? req.user.name : undefined,
  email_verified: req.user.email_verified === true
})

export const provisionDuoProfile = region('europe-west1').runWith({ failurePolicy: true })
  .auth.user().onCreate(async (eventUser, context) => {
    if (Date.now() - Date.parse(context.timestamp) > 24 * 60 * 60_000) return
    const user = await auth.getUser(eventUser.uid).catch(error => {
      if (error.code === 'auth/user-not-found') return null
      throw error
    })
    if (!user) return
    if (user.disabled || (!user.email && !user.providerData.length)) return
    await syncAccount(db, getRtdb(), {
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      email_verified: user.emailVerified
    })
  })

export const syncDuoMembership = region('europe-west1').runWith({ failurePolicy: true })
  .firestore.document('members/{uid}').onWrite(async (_, context) => {
    const rtdb = getRtdb()
    if (!rtdb) throw new Error('Realtime Database is unavailable')
    await mirrorMembership(db, rtdb, context.params.uid)
  })

export const completeDuoDisconnection = region('europe-west1').runWith({ failurePolicy: true })
  .database.ref('revoked_partnerships/{pid}').onCreate(async (snapshot, context) => {
    const uid = snapshot.child('requested_by').val()
    if (typeof uid !== 'string' || !uid) return
    const rtdb = getRtdb()
    if (!rtdb) throw new Error('Realtime Database is unavailable')
    await disconnectPartnership(db, rtdb, { uid }, context.params.pid)
  })

export const syncPartnerProfile = region('europe-west1').runWith({ failurePolicy: true })
  .firestore.document('profiles/{id}').onWrite(async (_, context) => {
    await refreshPartnerProfile(db, context.params.id)
  })

export const refreshSavedDoodleWidgets = region('europe-west1')
  .runWith({ secrets: ['APNS_KEY_PRODUCTION', 'APNS_KEY_SANDBOX'], failurePolicy: true })
  .firestore.document('partnership_doodles/{id}').onCreate(async (snapshot, context) => {
    if (Date.now() - Date.parse(context.timestamp) > 24 * 60 * 60_000) return
    const pid = snapshot.get('partnership_id')
    if (typeof pid === 'string' && pid && !pid.includes('/')) {
      const authorId = snapshot.get('author_id')
      const authorName = snapshot.get('author_name')
      await notifySavedDoodle(db, getMessaging(), pid, {
        doodleId: snapshot.id,
        authorId: typeof authorId === 'string' ? authorId : '',
        authorName: typeof authorName === 'string' ? authorName : ''
      })
    }
  })

// Updates and revocations both invalidate the partner's iOS widget. No coordinates in pushes.
export const refreshPartnerLocationWidgets = region('europe-west1')
  .runWith({ secrets: ['APNS_KEY_PRODUCTION', 'APNS_KEY_SANDBOX'], failurePolicy: true })
  .firestore.document('partnership_locations/{pid}/location_fixes/{profileId}').onWrite(async (_, context) => {
    if (Date.now() - Date.parse(context.timestamp) > 5 * 60_000) return
    await notifyLocationWidgets(db, getMessaging(), context.params.pid, context.params.profileId)
  })

const app = express()
app.use(cors({ origin: true }))
// Native background updates authenticate with the location-only grant, not the WebView.
app.post('/api/location/update', express.json({ limit: '3kb' }), async (req, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    res.json(await publishDuoLocation(db, auth, req.get('Authorization') || '', req.body || {}))
  } catch (error) {
    respondToDataError(res, error)
  }
})
app.use(requireDuoClient)
app.use(express.json())
app.use('/api/admin', createAdminRouter(db))

// Middleware uwierzytelniania tokenu Firebase
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  try {
    const decoded = await auth.verifyIdToken(match[1], true)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid authentication token' })
  }
}

app.post('/api/auth/verification-email', requireAuth, async (req: any, res) => {
  await sendVerificationEmail(auth, db, req.user.uid, res)
})

app.post('/api/auth/password-reset', async (req, res) => {
  await requestPasswordReset(auth, db, req, res)
})

// -----------------------------------------------------------------------------
// 1. FILMY (TMDB)
// -----------------------------------------------------------------------------
app.get('/api/movies/trending', async (req, res) => {
  try {
    const requestKey = req.headers['x-tmdb-api-key'] as string | undefined
    const result = await handleMoviesTrending(req.query, requestKey)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, results: [] })
  }
})

app.get('/api/movies/search', async (req, res) => {
  try {
    const requestKey = req.headers['x-tmdb-api-key'] as string | undefined
    const result = await handleMoviesSearch(req.query, requestKey)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, results: [] })
  }
})

app.get('/api/movies/random', async (req, res) => {
  try {
    const requestKey = req.headers['x-tmdb-api-key'] as string | undefined
    const result = await handleMoviesRandom(req.query, requestKey)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// -----------------------------------------------------------------------------
// 2. PRZEPISY (MEALS)
// -----------------------------------------------------------------------------
app.get('/api/meals/categories', async (_req, res) => {
  try {
    const result = await handleMealsCategories()
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ categories: [], areas: [], error: err.message })
  }
})

app.get('/api/meals/search', async (req, res) => {
  try {
    const result = await handleMealsSearch(req.query)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ success: false, meals: [], error: err.message })
  }
})

app.get('/api/meals/lookup', async (req, res) => {
  try {
    const result = await handleMealsLookup(req.query)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ success: false, meal: null, error: err.message })
  }
})

app.post('/api/meals/import', requireAuth, async (req: any, res) => {
  if (!allowPush(`recipes:${req.user.uid}`, 20)) return res.status(429).json({ success: false, error: 'Zbyt wiele prób importu.' })
  try {
    const result = await handleMealsImport(req.body)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// -----------------------------------------------------------------------------
// 3. KALENDARZ (iCal FEED)
// -----------------------------------------------------------------------------
function respondToDataError(res: express.Response, error: unknown) {
  if (error instanceof DuoDataError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  console.error('[duo-data]', (error as any)?.code)
  res.status(500).json({ error: 'Operacja chwilowo niedostępna.' })
}

app.get('/api/avatar/:id', requireAuth, async (req: any, res) => {
  res.set('Cache-Control', 'private, no-store')
  try {
    const image = await readProfileAvatar(db, req.user.uid, req.params.id)
    res.type('image/jpeg').send(image)
  } catch (error) {
    respondToDataError(res, error)
  }
})

app.post('/api/avatar', requireAuth, express.raw({ type: 'image/jpeg', limit: MAX_AVATAR_BYTES }), async (req: any, res) => {
  res.set('Cache-Control', 'no-store')
  if (!allowPush(`avatar:${req.user.uid}`, 10)) return res.status(429).json({ error: 'avatar_rate_limited' })
  try {
    if (!Buffer.isBuffer(req.body)) throw new DuoDataError(400, 'Nie wybrano zdjęcia JPG.')
    res.json(await writeProfileAvatar(db, req.user.uid, req.body))
  } catch (error) {
    respondToDataError(res, error)
  }
})

app.delete('/api/avatar', requireAuth, async (req: any, res) => {
  res.set('Cache-Control', 'no-store')
  if (!allowPush(`avatar:${req.user.uid}`, 10)) return res.status(429).json({ error: 'avatar_rate_limited' })
  try {
    res.json(await writeProfileAvatar(db, req.user.uid, null))
  } catch (error) {
    respondToDataError(res, error)
  }
})

app.get('/api/calendar/feed', async (req, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    const feed = await getCalendarFeed(db, req.query.token)
    res.set('Content-Type', 'text/calendar; charset=utf-8')
    res.set('Content-Disposition', 'inline; filename="duonest-calendar.ics"')
    res.send(feed)
  } catch (error) {
    respondToDataError(res, error)
  }
})

app.post('/api/calendar/subscription', requireAuth, async (req: any, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    res.json(await updateCalendarSubscription(db, req.user.uid, req.body?.action))
  } catch (error) {
    respondToDataError(res, error)
  }
})

app.post('/api/duo/mutate', requireAuth, async (req: any, res) => {
  try {
    res.json(await mutateDuoData(db, req.user.uid, req.body))
  } catch (error) {
    respondToDataError(res, error)
  }
})

// -----------------------------------------------------------------------------
// 4. POWIADOMIENIA PUSH – Web Push (PWA) + FCM (aplikacja iOS), see pushCore.ts
// -----------------------------------------------------------------------------
const pushLimiter = new Map<string, number[]>()
const allowPush = (key: string, max: number) => {
  const now = Date.now()
  const recent = (pushLimiter.get(key) || []).filter(t => now - t < 60_000)
  if (recent.length >= max) return false
  recent.push(now)
  pushLimiter.set(key, recent)
  return true
}
const PUSH_LIMITS: Record<PushAction, number> = { subscribe: 20, unsubscribe: 20, send: 30, test: 6 }

app.post('/api/diagnostics/:platform', requireAuth, async (req: any, res) => {
  const { platform } = req.params
  if (platform !== 'ios' && platform !== 'android') return res.sendStatus(404)
  if (res.locals.duoPlatform && res.locals.duoPlatform !== platform) return res.sendStatus(403)
  const reports = req.body?.reports
  if (!Array.isArray(reports) || reports.length === 0 || reports.length > 8) {
    return res.status(400).json({ error: 'invalid_diagnostics_batch' })
  }
  if (!allowPush(`diagnostics:${req.user.uid}`, 5)) {
    return res.status(429).json({ error: 'too_many_diagnostics_batches' })
  }
  try {
    await storeNativeDiagnosticReports(db, platform, reports)
    return res.json({ success: true })
  } catch {
    return res.status(503).json({ error: 'diagnostics_unavailable' })
  }
})

for (const action of PUSH_ACTIONS) {
  app.post(`/api/push/${action}`, requireAuth, async (req: any, res: any) => {
    try {
      if (!allowPush(`${action}:${req.user.uid}`, PUSH_LIMITS[action])) {
        return res.status(429).json({ success: false, error: 'Zbyt wiele żądań. Odczekaj chwilę.' })
      }
      const profile = await resolveCallerProfile(db, decodedUser(req))
      if (!profile) return res.status(403).json({ success: false, error: 'No profile is linked to this account' })
      const result = await handlePushAction(db, getMessaging(), {
        uid: req.user.uid,
        profileId: profile.id,
        partnershipId: profile.partnership_id || null,
        name: profile.name || null,
        gender: profile.gender || null,
        grammatical_gender: profile.grammatical_gender || null
      }, action, req.body || {})
      res.status(result.status).json(result.body)
    } catch (err: any) {
      console.error(`[push/${action}]`, err)
      res.status(500).json({ success: false, error: err.message })
    }
  })
}

app.post('/api/wishlist/preview', requireAuth, async (req: any, res) => {
  if (!allowPush(`wishlist:${req.user.uid}`, 15)) return res.status(429).json({ success: false, error: 'Zbyt wiele zapytań o podgląd.' })
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  if (url.length > 2048) return res.status(400).json({ success: false, error: 'Link jest zbyt długi.' })
  try {
    res.json(await processScrape(url))
  } catch (error) {
    respondToDataError(res, error)
  }
})

// -----------------------------------------------------------------------------
// 4b. KONTO, CZŁONKOSTWO I PAROWANIE (wymaga uprawnień administratora)
// -----------------------------------------------------------------------------
app.post('/api/widget/session', requireAuth, updateWidgetAccess(db))
app.get('/api/widget/doodle', readWidgetDoodle(db, auth))
app.get('/api/widget/location', readWidgetLocation(db, auth))

app.post('/api/location/session', requireAuth, async (req: any, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    const platform = res.locals.duoPlatform
    if (process.env.DUO_APP_CHECK_ENFORCE === 'true' && !platform && req.body?.action !== 'stop') {
      return res.status(403).json({ error: 'native_app_required' })
    }
    const client = platform ? { platform, version: req.get('X-DuoNest-Version') ?? '', build: req.get('X-DuoNest-Build') ?? '' } : undefined
    res.json(await locationSession(db, req.user.uid, req.user.auth_time * 1000, req.body?.action, req.body?.partnershipId, client))
  } catch (error) {
    respondToDataError(res, error)
  }
})

app.post('/api/account/sync', requireAuth, async (req: any, res) => {
  try {
    res.json(await syncAccount(db, getRtdb(), decodedUser(req)))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/pairing/pair', requireAuth, async (req: any, res) => {
  try {
    // Only password accounts must confirm the address (Apple may hide the e-mail)
    if (req.user.firebase?.sign_in_provider === 'password' && req.user.email_verified !== true) {
      return res.status(403).json({ error: 'email_not_verified' })
    }
    const retryAfter = await pairingRetryAfter(db, req.user.uid)
    if (retryAfter) {
      res.set('Retry-After', String(retryAfter))
      res.set('Access-Control-Expose-Headers', 'Retry-After')
      return res.status(429).json({ error: 'pairing_rate_limited' })
    }
    const { pairing_input, display_name } = req.body || {}
    res.json(await pairWithCode(db, getRtdb(), decodedUser(req), String(pairing_input || ''), typeof display_name === 'string' ? display_name : null))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/pairing/disconnect', requireAuth, async (req: any, res) => {
  try {
    res.json(await disconnectPartnership(db, getRtdb(), decodedUser(req)))
  } catch (err) {
    respondToDataError(res, err)
  }
})

// -----------------------------------------------------------------------------
// MUZYKA (Last.fm) – /api/lastfm/*, /api/music/*, /api/spotify/* (legacy alias)
// -----------------------------------------------------------------------------
app.all('/api/:group(lastfm|music|spotify)/:action', async (req: any, res: any, next: any) => {
  const { group, action } = req.params
  if (!isMusicAction(group, action)) return res.status(404).json({ success: false, error: 'Music endpoint not found' })
  return requireAuth(req, res, next)
}, async (req: any, res: any) => {
  try {
    res.set('Cache-Control', 'no-store')
    const profile = await resolveCallerProfile(db, decodedUser(req))
    if (!profile) return res.status(403).json({ success: false, error: 'No profile linked to account' })
    const result = await handleMusicAction(
      db,
      { id: profile.id, partnership_id: profile.partnership_id || null },
      req.params.group,
      req.params.action,
      req.method,
      req.body,
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined
    )
    res.status(result.status).json(result.body)
  } catch (err: any) {
    console.error('[music]', err)
    res.status(500).json({ success: false, error: err.message || 'Music error' })
  }
})

// Eksport Cloud Function v2
export const api = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    invoker: 'public',
    serviceAccount: apiServiceAccount,
    secrets: [defineSecret('APNS_KEY_PRODUCTION'), defineSecret('APNS_KEY_SANDBOX'), defineSecret('RESEND_API_KEY')]
  },
  app
)
