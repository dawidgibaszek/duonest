import { createHash, randomBytes } from 'node:crypto'
import type { Firestore } from 'firebase-admin/firestore'
import { DuoDataError, requirePartnership } from './partnershipAccess'
import { normalizeEventRecord } from './eventRecord'

const SUBSCRIPTIONS = 'calendar_subscriptions'
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
const tokenPattern = /^[A-Za-z0-9_-]{43}$/

export function updateCalendarSubscription(db: Firestore, uid: string, action: unknown) {
  if (action !== 'status' && action !== 'create' && action !== 'rotate' && action !== 'revoke') {
    throw new DuoDataError(400, 'Nieznana operacja subskrypcji.')
  }

  return db.runTransaction(async tx => {
    const ref = db.collection(SUBSCRIPTIONS).doc(uid)
    const access = await requirePartnership(tx, db, uid)
    const old = (await tx.get(ref)).data()
    const token = old?.partnership_id === access.partnershipId &&
      old?.profile_id === access.profileId && tokenPattern.test(old?.token) ? old.token as string : null

    if (action === 'revoke') {
      tx.delete(ref)
      return { token: null }
    }
    if (action === 'status' || (action === 'create' && token)) return { token }

    const fresh = randomBytes(32).toString('base64url')
    tx.set(ref, {
      token: fresh,
      token_hash: tokenHash(fresh),
      partnership_id: access.partnershipId,
      profile_id: access.profileId
    })
    return { token: fresh }
  })
}

function escapeIcs(value: unknown) {
  return typeof value === 'string'
    ? value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
    : ''
}

function formatDate(value: unknown) {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : null
}

export async function getCalendarFeed(db: Firestore, token: unknown): Promise<string> {
  if (typeof token !== 'string' || !tokenPattern.test(token)) {
    throw new DuoDataError(404, 'Subskrypcja kalendarza niedostępna.')
  }
  const hash = tokenHash(token)
  const snapshots = await db.collection(SUBSCRIPTIONS).where('token_hash', '==', hash).limit(1).get()
  const subscription = snapshots.docs[0]
  if (!subscription) throw new DuoDataError(404, 'Subskrypcja kalendarza niedostępna.')

  const { events, title } = await db.runTransaction(async tx => {
    const current = (await tx.get(subscription.ref)).data()
    if (current?.token_hash !== hash) throw new DuoDataError(404, 'Subskrypcja kalendarza niedostępna.')
    const access = await requirePartnership(tx, db, subscription.id).catch(error => {
      if (error instanceof DuoDataError) throw new DuoDataError(404, 'Subskrypcja kalendarza niedostępna.')
      throw error
    })
    if (current.partnership_id !== access.partnershipId || current.profile_id !== access.profileId) {
      throw new DuoDataError(404, 'Subskrypcja kalendarza niedostępna.')
    }

    const events = await tx.get(db.collection('events').where('partnership_id', '==', access.partnershipId).limit(500))
    return { events, title: access.partnership.nest_name }
  }, { readOnly: true })

  const now = formatDate(new Date().toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DuoNest//Wspólny Terminarz//PL',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcs(title) || 'DuoNest'}`
  ]
  for (const event of events.docs) {
    const data = normalizeEventRecord(event.data())
    const start = formatDate(data.start_time)
    if (!start) continue
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcs(event.id)}@duonestapp.pl`,
      `DTSTAMP:${formatDate(data.updated_at) || formatDate(data.created_at) || now}`,
      `DTSTART:${start}`,
      `DTEND:${formatDate(data.end_time) || start}`,
      `SUMMARY:${escapeIcs(data.title) || 'Wydarzenie'}`,
      `DESCRIPTION:${escapeIcs(data.description)}`,
      `LOCATION:${escapeIcs(data.location)}`,
      'END:VEVENT'
    )
  }
  return [...lines, 'END:VCALENDAR', ''].join('\r\n')
}
