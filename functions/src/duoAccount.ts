/**
 * Account, membership and pairing operations that require admin privileges.
 *
 * Firestore/RTDB security rules only let a client touch data of the partnership
 * listed in its `members/{uid}` record. That record (and every write to another
 * person's profile) is produced here, on the server, after verifying ownership.
 *
 */

import { randomBytes, randomUUID } from 'node:crypto'

export interface DecodedUser {
  uid: string
  email?: string
  email_verified?: boolean
  name?: string
}

export interface AccountSyncResult {
  profile_id: string | null
  partnership_id: string | null
}

type Db = any
type Rtdb = any

const nowIso = () => new Date().toISOString()
const newPairingCode = () => `DN-${randomBytes(6).toString('hex').toUpperCase()}`

const profileIdOf = (p: any): string => String(p?.docId || '')

async function findProfilesForUid(db: Db, uid: string): Promise<any[]> {
  const found = new Map<string, any>()
  const own = await db.collection('profiles').doc(uid).get()
  if (own.exists && (own.data()?.auth_user_id === uid || !own.data()?.auth_user_id)) {
    found.set(own.id, { ...own.data(), docId: own.id })
  }
  const snap = await db.collection('profiles').where('auth_user_id', '==', uid).limit(10).get()
  for (const d of snap.docs) found.set(d.id, { ...d.data(), docId: d.id })
  return [...found.values()]
}

/**
 * One account can have several profile docs (original + copies/stubs written by
 * older app versions under profiles/{uid}). Pick the real one:
 * valid nest ≫ complete profile (code, name, own `id`) ≫ newest.
 */
async function pickCanonicalProfile(db: Db, list: any[]): Promise<any | null> {
  if (list.length === 0) return null
  const scored = await Promise.all(list.map(async (p) => {
    const hasValidNest = p.partnership_id ? Boolean(await validPartnershipFor(db, p)) : false
    const score =
      (hasValidNest ? 32 : 0) +
      (p.pairing_code ? 8 : 0) +
      (p.name ? 4 : 0) +
      (p.id === p.docId ? 2 : 0)
    return { p, score, ts: Date.parse(p.updated_at || p.created_at || '') || 0 }
  }))
  scored.sort((a, b) => (b.score - a.score) || (b.ts - a.ts))
  return scored[0].p
}

/** Every Firestore doc that represents the given profile (canonical doc + mirrors). */
async function profileDocRefs(db: Db, profile: any): Promise<any[]> {
  const refs = new Map<string, any>()
  if (profile.docId) refs.set(profile.docId, db.collection('profiles').doc(profile.docId))
  if (profile.auth_user_id) {
    const snap = await db.collection('profiles').where('auth_user_id', '==', profile.auth_user_id).limit(10).get()
    for (const d of snap.docs) refs.set(d.id, d.ref)
  }
  return [...refs.values()]
}

async function validPartnershipFor(db: Db, profile: any): Promise<string | null> {
  const partnershipId = profile?.partnership_id
  if (typeof partnershipId !== 'string' || !partnershipId || partnershipId.includes('/')) return null
  const snap = await db.collection('partnerships').doc(String(partnershipId)).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  const me = profileIdOf(profile)
  return data.partner1_id === me || data.partner2_id === me ? snap.id : null
}

async function mirrorMembership(db: Db, rtdb: Rtdb | null, uid: string) {
  if (!rtdb) return
  try {
    const data = (await db.collection('members').doc(uid).get()).data()
    await rtdb.ref(`members/${uid}`).set(data ? { profile_id: data.profile_id, partnership_id: data.partnership_id } : null)
  } catch (err) {
    console.warn('[duoAccount] RTDB membership sync failed', (err as any)?.code)
  }
}

const membership = (profile_id: string | null, partnership_id: string | null) =>
  ({ profile_id, partnership_id, updated_at: nowIso() })

async function loadMyProfile(db: Db, user: DecodedUser) {
  const profiles = await findProfilesForUid(db, user.uid)
  return pickCanonicalProfile(db, profiles)
}

export async function syncAccount(db: Db, rtdb: Rtdb | null, user: DecodedUser): Promise<AccountSyncResult> {
  const candidate = await loadMyProfile(db, user)
  const profileRef = db.collection('profiles').doc(candidate?.docId || user.uid)
  const memberRef = db.collection('members').doc(user.uid)

  const result = await db.runTransaction(async (tx: any) => {
    const stored = (await tx.get(profileRef)).data()
    if (stored?.auth_user_id && stored.auth_user_id !== user.uid) {
      return { profile_id: null, partnership_id: null }
    }

    const nestRef = typeof stored?.partnership_id === 'string'
      ? db.collection('partnerships').doc(stored.partnership_id) : null
    const nest = nestRef ? (await tx.get(nestRef)).data() : null
    const partnershipId = nest && [nest.partner1_id, nest.partner2_id].includes(profileRef.id) ? nestRef.id : null

    if (!stored) {
      if (candidate) return { profile_id: null, partnership_id: null }
      const email = user.email || null
      tx.create(profileRef, {
        id: user.uid,
        auth_user_id: user.uid,
        email,
        name: (user.name?.trim() || email?.split('@')[0] || 'Użytkownik').slice(0, 60),
        pairing_code: newPairingCode(),
        avatar_color: '#0284c7',
        current_mood: 'happy',
        mood_note: '',
        love_note: '',
        favorite_drink: '',
        favorite_treat: '',
        partnership_id: null,
        points: 0,
        created_at: nowIso(),
        updated_at: nowIso()
      })
    } else {
      const updates: Record<string, unknown> = {}
      if (stored.id !== profileRef.id) updates.id = profileRef.id
      if (!stored.auth_user_id) updates.auth_user_id = user.uid
      if (!stored.pairing_code) updates.pairing_code = newPairingCode()
      if (Object.keys(updates).length) tx.update(profileRef, updates)
    }

    tx.set(memberRef, membership(profileRef.id, partnershipId))
    return { profile_id: profileRef.id, partnership_id: partnershipId }
  })
  await mirrorMembership(db, rtdb, user.uid)
  return result
}

function normalizeCode(raw: string): string {
  let code = raw.toUpperCase().replace(/\s+/g, '')
  if (!code.startsWith('DN-')) code = code.startsWith('DN') ? `DN-${code.substring(2)}` : `DN-${code}`
  return code
}

function partnerSummary(p: any, partnershipId: string) {
  return {
    id: profileIdOf(p),
    name: p.name || 'Partner',
    avatar_url: p.avatar_url || null,
    avatar_color: p.avatar_color || '#0d9488',
    partnership_id: partnershipId,
    points: Number(p.points) || 0
  }
}

export async function pairWithCode(
  db: Db,
  rtdb: Rtdb | null,
  user: DecodedUser,
  rawInput: string,
  displayName?: string | null
): Promise<{ error?: string; partnership?: any; partner?: any }> {
  const input = String(rawInput || '').trim().slice(0, 200)
  if (!input) return { error: 'invalid_pairing_input' }

  const me = await loadMyProfile(db, user)
  if (!me) return { error: 'profile_not_linked' }
  const myId = profileIdOf(me)

  // Pairing works ONLY with the partner's pairing code – it is the shared secret that
  // proves consent. (Pairing by e-mail let anyone attach themselves to a stranger.)
  if (input.includes('@')) return { error: 'pairing_code_required' }
  const code = normalizeCode(input)
  if (!/^DN-[A-Z0-9]{4,12}$/.test(code)) return { error: 'invalid_pairing_input' }

  const snap = await db.collection('profiles').where('pairing_code', '==', code).limit(20).get()
  const matches = snap.docs.map((doc: any) => ({ ...doc.data(), docId: doc.id }))
  const owners = new Set(matches.map((profile: any) => profile.auth_user_id).filter(Boolean))
  if (owners.size !== 1 || owners.has(user.uid)) return { error: 'partner_unavailable' }
  const [owner] = owners
  const partner = await pickCanonicalProfile(db, matches.filter((profile: any) => profile.auth_user_id === owner))
  if (!partner || !partner.auth_user_id || profileIdOf(partner) === myId) return { error: 'partner_unavailable' }
  const partnerId = profileIdOf(partner)

  const myRefs = await profileDocRefs(db, me)
  const partnerRefs = await profileDocRefs(db, partner)
  if (myRefs.length === 0 || partnerRefs.length === 0) return { error: 'partner_unavailable' }

  const created = nowIso()
  const partnershipId = randomUUID()
  const partnership = {
    id: partnershipId,
    partner1_id: myId,
    partner2_id: partnerId,
    nest_name: 'Nasze Ciepłe Gniazdko',
    nest_level: 1,
    anniversary_date: created.split('T')[0],
    pet_id: null,
    pet_name: null,
    pet_xp: 0,
    created_at: created
  }

  const myUpdates: any = { partnership_id: partnershipId, updated_at: created }
  const cleanName = String(displayName || '').trim().slice(0, 60)
  if (cleanName) myUpdates.name = cleanName

  // Atomic: re-check that neither person is in an active nest, then write everything.
  // Prevents two people pairing with the same partner at the same moment.
  const paired = await db.runTransaction(async (tx: any) => {
    const [myDocs, partnerDocs] = await Promise.all([
      Promise.all(myRefs.map((ref: any) => tx.get(ref))),
      Promise.all(partnerRefs.map((ref: any) => tx.get(ref)))
    ])
    const mine = myDocs.filter(doc => doc.data()?.auth_user_id === user.uid)
    const theirs = partnerDocs.filter(doc => doc.data()?.auth_user_id === partner.auth_user_id)
    if (!mine.some(doc => doc.id === myId) || !theirs.some(doc => doc.id === partnerId && doc.data()?.pairing_code === code)) return null

    const existingPids = new Set<string>()
    for (const doc of [...mine, ...theirs]) {
      const pid = doc.data()?.partnership_id
      if (typeof pid === 'string') existingPids.add(pid)
    }
    const existing = await Promise.all([...existingPids].map(pid => tx.get(db.collection('partnerships').doc(pid))))
    for (const doc of existing) {
      const candidate = doc.data()
      if (!candidate) continue
      const ids = [candidate.partner1_id, candidate.partner2_id]
      if (ids.includes(myId) && ids.includes(partnerId)) {
        tx.set(db.collection('members').doc(user.uid), membership(myId, doc.id))
        tx.set(db.collection('members').doc(partner.auth_user_id), membership(partnerId, doc.id))
        return { ...candidate, id: doc.id }
      }
      if (ids.includes(myId) || ids.includes(partnerId)) return null
    }
    tx.create(db.collection('partnerships').doc(partnershipId), partnership)
    for (const doc of mine) tx.update(doc.ref, myUpdates)
    for (const doc of theirs) tx.update(doc.ref, { partnership_id: partnershipId, updated_at: created })
    tx.set(db.collection('members').doc(user.uid), membership(myId, partnershipId))
    tx.set(db.collection('members').doc(partner.auth_user_id), membership(partnerId, partnershipId))
    return partnership
  })
  if (!paired) return { error: 'already paired' }

  await Promise.all([mirrorMembership(db, rtdb, user.uid), mirrorMembership(db, rtdb, partner.auth_user_id)])

  return {
    partnership: paired,
    partner: partnerSummary(partner, paired.id)
  }
}

export async function disconnectPartnership(db: Db, rtdb: Rtdb | null, user: DecodedUser): Promise<{ success: boolean }> {
  const me = await loadMyProfile(db, user)
  if (!me) return { success: true }
  const profileRef = db.collection('profiles').doc(me.docId)
  const result = await db.runTransaction(async (tx: any) => {
    const current = (await tx.get(profileRef)).data()
    if (current?.auth_user_id !== user.uid) return null
    const pid = current.partnership_id
    if (typeof pid !== 'string') return null

    const nestRef = db.collection('partnerships').doc(pid)
    const nest = (await tx.get(nestRef)).data()
    if (!nest || ![nest.partner1_id, nest.partner2_id].includes(profileRef.id)) return null

    const profiles = await tx.get(db.collection('profiles').where('partnership_id', '==', pid))
    const ids = new Map<string, string>([[user.uid, profileRef.id]])
    for (const doc of profiles.docs) {
      const uid = doc.data()?.auth_user_id
      if (uid && [nest.partner1_id, nest.partner2_id].includes(doc.id)) ids.set(uid, doc.id)
    }
    const freshCodes = new Map([...ids.keys()].map(uid => [uid, newPairingCode()]))
    for (const doc of profiles.docs) {
      const pairing_code = freshCodes.get(doc.data()?.auth_user_id)
      if (pairing_code) tx.update(doc.ref, { partnership_id: null, pairing_code, updated_at: nowIso() })
    }
    tx.delete(nestRef)
    for (const [uid, profileId] of ids) {
      tx.set(db.collection('members').doc(uid), membership(profileId, null))
      tx.delete(db.collection('calendar_subscriptions').doc(uid))
    }
    return [...ids.keys()]
  })
  await Promise.all((result || [user.uid]).map((uid: string) => mirrorMembership(db, rtdb, uid)))
  return { success: true }
}

/** Resolves the caller's profile (used by push endpoints). */
export async function resolveCallerProfile(db: Db, user: DecodedUser) {
  const me = await loadMyProfile(db, user)
  if (!me) return null
  return {
    id: profileIdOf(me),
    name: me.name || null,
    partnership_id: await validPartnershipFor(db, me)
  }
}

/** Returns the partner's profile id if the caller is a member of a valid partnership. */
export async function resolvePartnerId(db: Db, myProfileId: string, partnershipId: string | null): Promise<string | null> {
  if (!partnershipId) return null
  const snap = await db.collection('partnerships').doc(partnershipId).get()
  if (!snap.exists) return null
  const d = snap.data() || {}
  if (d.partner1_id === myProfileId) return d.partner2_id || null
  if (d.partner2_id === myProfileId) return d.partner1_id || null
  return null
}
