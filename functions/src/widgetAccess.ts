import { createHash } from 'node:crypto'
import type { Auth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import type { RequestHandler } from 'express'
import { isWidgetVersionAllowed } from './clientAccess'

const LIFETIME_MS = 14 * 24 * 60 * 60_000
const credentialRef = (db: Firestore, token: string) =>
  db.collection('widget_read_sessions').doc(createHash('sha256').update(token).digest('hex'))

function validCredential(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
}

// The app proves Firebase Auth and App Check before provisioning a device.
// The extension can only read the current drawing and shared partner position for its verified nest.
export function updateWidgetAccess(db: Firestore): RequestHandler {
  return async (req, res) => {
    const user = (req as typeof req & { user: { uid: string; auth_time: number } }).user
    const token = req.body?.token
    if (!validCredential(token)) return res.status(400).json({ error: 'invalid_widget_credential' })
    const ref = credentialRef(db, token)
    try {
      const accepted = await db.runTransaction(async tx => {
        const existing = (await tx.get(ref)).data()
        if (existing && existing.uid !== user.uid) return false
        if (req.body?.revoke === true) {
          if (existing) tx.delete(ref)
          return true
        }
        const member = (await tx.get(db.collection('members').doc(user.uid))).data()
        if (!member?.profile_id || !member?.partnership_id) return false
        tx.set(ref, {
          uid: user.uid,
          profileId: member.profile_id,
          partnershipId: member.partnership_id,
          authenticatedAt: user.auth_time * 1000,
          platform: res.locals.duoPlatform === 'android' ? 'android' : 'ios',
          version: req.get('X-DuoNest-Version') ?? '',
          build: req.get('X-DuoNest-Build') ?? '',
          expiresAt: Date.now() + LIFETIME_MS
        })
        return true
      })
      return accepted ? res.json({ success: true }) : res.status(403).json({ error: 'widget_access_denied' })
    } catch {
      return res.status(503).json({ error: 'widget_unavailable' })
    }
  }
}

export function readWidgetDoodle(db: Firestore, auth: Auth): RequestHandler {
  return readWidgetData(db, auth, false)
}

export function readWidgetLocation(db: Firestore, auth: Auth): RequestHandler {
  return readWidgetData(db, auth, true)
}

function readWidgetData(db: Firestore, auth: Auth, location: boolean): RequestHandler {
  return async (req, res) => {
    res.set('Cache-Control', 'private, no-store')
    const token = req.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]
    if (!token) return res.status(401).json({ error: 'widget_credential_required' })

    try {
      const session = (await credentialRef(db, token).get()).data()
      if (!session || session.expiresAt <= Date.now()) return res.status(401).json({ error: 'widget_session_expired' })
      const user = await auth.getUser(session.uid).catch(error => {
        if (error.code === 'auth/user-not-found') return null
        throw error
      })
      if (!user || user.disabled || Date.parse(user.tokensValidAfterTime ?? '') > session.authenticatedAt) {
        return res.status(401).json({ error: 'widget_session_expired' })
      }
      if (!await isWidgetVersionAllowed(session.platform === 'android' ? 'android' : 'ios', session.version, session.build)) {
        return res.status(426).json({ error: 'update_required' })
      }

      const result = await db.runTransaction(async tx => {
        const [access, member, profile, nest] = await tx.getAll(
          credentialRef(db, token),
          db.collection('members').doc(session.uid),
          db.collection('profiles').doc(session.profileId),
          db.collection('partnerships').doc(session.partnershipId)
        )
        if (!access.exists || access.get('partnershipId') !== session.partnershipId ||
            member.get('profile_id') !== session.profileId || member.get('partnership_id') !== session.partnershipId ||
            profile.get('auth_user_id') !== session.uid || profile.get('partnership_id') !== session.partnershipId ||
            ![nest.get('partner1_id'), nest.get('partner2_id')].includes(session.profileId)) return null

        if (location) {
          const partnerId = nest.get('partner1_id') === session.profileId ? nest.get('partner2_id') : nest.get('partner1_id')
          if (typeof partnerId !== 'string' || !partnerId || partnerId.includes('/')) return { location: null }
          const partner = await tx.get(db.collection('profiles').doc(partnerId))
          const partnerUid = partner.get('auth_user_id')
          if (partner.get('partnership_id') !== session.partnershipId || typeof partnerUid !== 'string' || !partnerUid || partnerUid.includes('/')) return { location: null }
          const [grant, fix] = await tx.getAll(
            db.collection('location_grants').doc(partnerUid),
            db.collection('partnership_locations').doc(session.partnershipId).collection('location_fixes').doc(partnerId)
          )
          const expiresAt = Math.min(grant.get('expires_at')?.toMillis() ?? 0, fix.get('expires_at')?.toMillis() ?? 0)
          const visible = grant.get('pid') === session.partnershipId && grant.get('profileId') === partnerId &&
            expiresAt > Date.now()
          const data = fix.data()
          return { partnerName: partner.get('name') || '', location: visible && data ? {
            latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy,
            captured_at: data.captured_at, expires_at: expiresAt, address: data.address
          } : null }
        }

        const snapshot = await tx.get(db.collection('partnership_doodles')
          .where('partnership_id', '==', session.partnershipId).orderBy('updated_at', 'desc').limit(1))
        const doc = snapshot.docs[0]
        const doodle = doc?.data()
        return { doodle: doodle ? {
          id: doc.id,
          updated_at: doodle.updated_at,
          author_name: doodle.author_name,
          strokes: doodle.strokes
        } : null }
      }, { readOnly: true })
      return result ? res.json(result) : res.status(403).json({ error: 'widget_access_denied' })
    } catch {
      return res.status(503).json({ error: 'widget_unavailable' })
    }
  }
}
