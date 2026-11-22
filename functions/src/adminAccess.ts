import { Router, type Request, type RequestHandler } from 'express'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import { publishIosSettings, readAdminDashboard, readAdminHistory, readIosSettings, validateIosSettings } from './adminDashboard'
import { analyticsConfigured, parseAnalyticsFilters, readAnalytics, readRealtimeAnalytics } from './adminAnalytics'

const ADMIN_ORIGIN = 'https://duonestapp.pl'
const SESSION_COOKIE = '__session'
const SESSION_DURATION = 15 * 60_000
const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/admin' } as const
const ADMIN_PROVIDERS = new Set(['password', 'google.com', 'apple.com'])

function readSessionCookie(req: Request) {
  const cookie = req.get('cookie')?.split(';').map(part => part.trim())
    .find(part => part.startsWith(SESSION_COOKIE + '='))
  const token = cookie?.slice(SESSION_COOKIE.length + 1) ?? ''
  return token.length <= 4096 && /^[A-Za-z0-9_.-]+$/.test(token) ? token : null
}

function isAdminIdentity(user: DecodedIdToken) {
  return (user.duoAdmin === true || user.duoAdminViewer === true) && user.email_verified === true &&
    ADMIN_PROVIDERS.has(user.firebase.sign_in_provider)
}

async function activeAdminRole(user: DecodedIdToken) {
  if (!isAdminIdentity(user)) return null
  const account = await getAuth().getUser(user.uid)
  if (account.disabled || !account.emailVerified ||
    !account.providerData.some(provider => provider.providerId === user.firebase.sign_in_provider)) return null
  if (account.customClaims?.duoAdmin === true && user.duoAdmin === true) return 'admin'
  if (account.customClaims?.duoAdminViewer === true) return 'viewer'
  return null
}

export function createAdminRouter(db: Firestore) {
  const admin = Router()

  admin.use((req, res, next) => {
    res.set('Cache-Control', 'private, no-store')
    const origin = req.get('origin')
    if ((origin && origin !== ADMIN_ORIGIN) || (req.method !== 'GET' && origin !== ADMIN_ORIGIN)) {
      return res.status(403).json({ error: 'admin_request_forbidden' })
    }
    return next()
  })

  admin.post('/session', async (req, res) => {
    const bearer = req.get('authorization')?.match(/^Bearer (\S+)$/i)
    if (!bearer) return res.status(401).json({ error: 'admin_login_required' })

    try {
      const auth = getAuth()
      const user = await auth.verifyIdToken(bearer[1], true)
      const authAge = Date.now() / 1000 - user.auth_time
      if (!Number.isFinite(authAge) || authAge < -60 || authAge > 300 || !await activeAdminRole(user)) {
        return res.status(403).json({ error: 'admin_login_denied' })
      }

      const cookie = await auth.createSessionCookie(bearer[1], { expiresIn: SESSION_DURATION })
      res.cookie(SESSION_COOKIE, cookie, { ...COOKIE_OPTIONS, maxAge: SESSION_DURATION })
      return res.json({ expiresAt: Date.now() + SESSION_DURATION })
    } catch {
      return res.status(403).json({ error: 'admin_login_denied' })
    }
  })

  // Clear the browser session even when its cookie is expired or the role was revoked.
  admin.delete('/session', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS)
    return res.status(204).end()
  })

  const requireSession: RequestHandler = async (req, res, next) => {
    const cookie = readSessionCookie(req)
    if (!cookie) return res.status(401).json({ error: 'admin_login_required' })
    try {
      const auth = getAuth()
      const user = await auth.verifySessionCookie(cookie, true)
      const role = await activeAdminRole(user)
      if (!role) {
        return res.status(403).json({ error: 'admin_login_denied' })
      }
      res.locals.adminUid = user.uid
      res.locals.adminRole = role
      res.locals.adminExpiresAt = user.exp * 1000
      return next()
    } catch {
      return res.status(401).json({ error: 'admin_login_required' })
    }
  }
  admin.use(requireSession)

  admin.get('/dashboard', async (_req, res) => {
    try {
      return res.json({
        ...await readAdminDashboard(db), expiresAt: res.locals.adminExpiresAt,
        canPublish: res.locals.adminRole === 'admin'
      })
    } catch {
      return res.status(503).json({ error: 'admin_dashboard_unavailable' })
    }
  })

  admin.get('/analytics', async (req, res) => {
    const filters = parseAnalyticsFilters(req.query)
    if (!filters) return res.status(400).json({ error: 'invalid_analytics_filters' })
    if (!analyticsConfigured()) return res.json({ configured: false })
    try {
      return res.json({ configured: true, ...await readAnalytics(filters) })
    } catch (error) {
      console.warn('[admin] GA4 report unavailable', (error as { code?: unknown })?.code)
      return res.status(503).json({ error: 'admin_analytics_unavailable' })
    }
  })

  admin.get('/analytics-live', async (req, res) => {
    const { platform = 'all' } = req.query
    if (typeof platform !== 'string' || !['all', 'iOS', 'Android'].includes(platform)) {
      return res.status(400).json({ error: 'invalid_analytics_filters' })
    }
    if (!analyticsConfigured()) return res.json({ configured: false })
    try {
      return res.json({ configured: true, ...await readRealtimeAnalytics(platform) })
    } catch {
      return res.status(503).json({ error: 'admin_analytics_unavailable' })
    }
  })

  admin.get('/history', async (_req, res) => {
    try {
      return res.json(await readAdminHistory(db))
    } catch {
      return res.status(503).json({ error: 'admin_history_unavailable' })
    }
  })

  admin.get('/ios-settings', async (_req, res) => {
    try {
      return res.json(await readIosSettings())
    } catch {
      return res.status(503).json({ error: 'admin_settings_unavailable' })
    }
  })

  admin.put('/ios-settings', async (req, res) => {
    if (res.locals.adminRole !== 'admin') return res.status(403).json({ error: 'admin_write_forbidden' })
    const settings = validateIosSettings(req.body)
    if (!settings) return res.status(400).json({ error: 'invalid_ios_settings' })
    try {
      const updated = await publishIosSettings(settings, { db, actor: res.locals.adminUid })
      if (!updated) return res.status(409).json({ error: 'ios_settings_changed' })
      return res.json(updated)
    } catch (error) {
      if ((error as { httpErrorCode?: { status?: number } })?.httpErrorCode?.status === 409) {
        return res.status(409).json({ error: 'ios_settings_changed' })
      }
      return res.status(503).json({ error: 'admin_settings_unavailable' })
    }
  })

  return admin
}
