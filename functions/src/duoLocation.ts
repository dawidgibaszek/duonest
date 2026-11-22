import { createHash, randomBytes } from 'node:crypto'
import type { Firestore, Transaction } from 'firebase-admin/firestore'
import type { Auth } from 'firebase-admin/auth'
import { DuoDataError } from './partnershipAccess'
import { isNativeVersionAllowed } from './clientAccess'

const lifetimeMs = 7 * 24 * 60 * 60_000
const maxAgeMs = 24 * 60 * 60_000
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const grantRef = (db: Firestore, uid: string) => db.collection('location_grants').doc(uid)
const locationRef = (db: Firestore, pid: string, profileId: string) =>
  db.collection('partnership_locations').doc(pid).collection('location_fixes').doc(profileId)

async function membership(db: Firestore, tx: Transaction, uid: string) {
  const member = (await tx.get(db.collection('members').doc(uid))).data()
  const pid = member?.partnership_id
  const profileId = member?.profile_id
  if (typeof pid !== 'string' || !pid || pid.includes('/') ||
      typeof profileId !== 'string' || !profileId || profileId.includes('/')) return null
  const [profile, pair] = await Promise.all([
    tx.get(db.collection('profiles').doc(profileId)),
    tx.get(db.collection('partnerships').doc(pid))
  ])
  if (profile.get('auth_user_id') !== uid || profile.get('partnership_id') !== pid ||
      ![pair.get('partner1_id'), pair.get('partner2_id')].includes(profileId)) return null
  return { pid, profileId }
}

export async function revokeDuoLocation(db: Firestore, uid: string) {
  await db.runTransaction(async tx => {
    const ref = grantRef(db, uid)
    const grant = (await tx.get(ref)).data()
    if (grant) tx.delete(locationRef(db, grant.pid, grant.profileId))
    tx.delete(ref)
  })
  return { enabled: false }
}

export async function locationSession(db: Firestore, uid: string, authenticatedAt: number, action: unknown, expectedPid: unknown, client?: { platform: 'ios' | 'android'; version: string; build: string }) {
  if (action === 'stop') return revokeDuoLocation(db, uid)
  if (action !== 'start' && action !== 'resume') throw new DuoDataError(400, 'Nieprawidłowe ustawienie lokalizacji.')
  const token = `${encodeURIComponent(uid)}.${randomBytes(32).toString('base64url')}`
  return db.runTransaction(async tx => {
    const member = await membership(db, tx, uid)
    if (!member || member.pid !== expectedPid) throw new DuoDataError(403, 'Brak aktywnej pary.')
    const ref = grantRef(db, uid)
    const previous = (await tx.get(ref)).data()
    const samePair = previous?.pid === member.pid && previous?.profileId === member.profileId
    if (action === 'resume' && !samePair) return { enabled: false }
    if (previous && !samePair) tx.delete(locationRef(db, previous.pid, previous.profileId))
    tx.set(ref, {
      ...member,
      authenticatedAt,
      ...(client ? { client } : {}),
      tokenHash: hash(token),
      expires_at: new Date(Date.now() + lifetimeMs)
    })
    return { enabled: true, token }
  })
}

function position(body: Record<string, unknown>) {
  const { latitude, longitude, accuracy, captured_at } = body
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
      typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 50_000 ||
      typeof captured_at !== 'number' || !Number.isFinite(captured_at) ||
      captured_at < Date.now() - 5 * 60_000 || captured_at > Date.now() + 30_000) {
    throw new DuoDataError(400, 'Nieprawidłowy odczyt lokalizacji.')
  }
  const fields = ['street', 'number', 'city', 'country'] as const
  const source = body.address as Record<string, unknown> | undefined
  const address = Object.fromEntries(fields.map(field => {
    const value = source?.[field]
    return [field, typeof value === 'string' ? value.trim().slice(0, 100) : '']
  }))
  return { latitude, longitude, accuracy, captured_at, address }
}

export async function publishDuoLocation(db: Firestore, auth: Auth, header: string, body: Record<string, unknown>) {
  const token = /^Bearer (\S{1,520})$/i.exec(header)?.[1]
  const fail = () => new DuoDataError(401, 'Sesja udostępniania wygasła.')
  if (!token) throw fail()
  const separator = token.lastIndexOf('.')
  if (separator < 1 || !/^[\w-]{43}$/.test(token.slice(separator + 1))) throw fail()
  let uid: string
  try { uid = decodeURIComponent(token.slice(0, separator)) } catch { throw fail() }
  if (!uid || uid.length > 128 || uid.includes('/')) throw fail()
  const data = position(body)
  const ref = grantRef(db, uid)
  const expectedHash = hash(token)
  const currentGrant = (await ref.get()).data()
  if (!currentGrant || currentGrant.tokenHash !== expectedHash || currentGrant.expires_at.toMillis() <= Date.now()) throw fail()
  const client = currentGrant.client
  if (process.env.DUO_APP_CHECK_ENFORCE === 'true' && (
    !['ios', 'android'].includes(client?.platform) ||
    !await isNativeVersionAllowed(client.platform, client.version, client.build)
  )) throw fail()
  const user = await auth.getUser(uid).catch(error => {
    if (error?.code === 'auth/user-not-found') return null
    throw error
  })
  if (!user || user.disabled || Date.parse(user.tokensValidAfterTime ?? '') > currentGrant.authenticatedAt) throw fail()

  return db.runTransaction(async tx => {
    const grant = (await tx.get(ref)).data()
    if (!grant || grant.tokenHash !== expectedHash || grant.expires_at.toMillis() <= Date.now()) throw fail()
    const member = await membership(db, tx, uid)
    if (member?.pid !== grant.pid || member?.profileId !== grant.profileId) throw fail()
    const target = locationRef(db, grant.pid, grant.profileId)
    const previous = (await tx.get(target)).data()
    if (previous && (previous.captured_at >= data.captured_at || Date.now() - previous.updated_at.toMillis() < 12_000)) {
      return { success: true }
    }
    const now = Date.now()
    tx.set(target, { ...data, updated_at: new Date(now), expires_at: new Date(now + maxAgeMs) })
    if (grant.expires_at.toMillis() - now < maxAgeMs) {
      tx.update(ref, { expires_at: new Date(now + lifetimeMs) })
    }
    return { success: true }
  })
}

export function removeDuoLocationForPair(db: Firestore, tx: Transaction, uid: string, pid: string, profileId: string) {
  tx.delete(grantRef(db, uid))
  tx.delete(locationRef(db, pid, profileId))
}
