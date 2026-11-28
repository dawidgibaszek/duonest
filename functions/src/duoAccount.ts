/**
 * Account, membership and pairing operations that require admin privileges.
 *
 * Firestore/RTDB security rules only let a client touch data of the partnership
 * listed in its `members/{uid}` record. That record (and every write to another
 * person's profile) is produced here, on the server, after verifying ownership.
 *
 */

import { randomInt, randomUUID } from 'node:crypto'
import { createPetCareState } from './petCare'
import { removeDuoLocationForPair } from './duoLocation'
import { isCurrentPairingCode, normalizePairingCode, PAIRING_CODE_ALPHABET, PAIRING_CODE_LENGTH } from './pairingCode'
import { DuoDataError } from './partnershipAccess'
import { projectPartnerProfile } from './partnerProfile'

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
async function allocatePairingCode(db: Db, tx: any, exclude: ReadonlySet<string> = new Set()) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = Array.from({ length: PAIRING_CODE_LENGTH }, () =>
      PAIRING_CODE_ALPHABET[randomInt(PAIRING_CODE_ALPHABET.length)]).join('')
    if (exclude.has(code)) continue
    const ref = db.collection('pairing_codes').doc(code)
    if ((await tx.get(ref)).exists) continue
    const existing = await tx.get(db.collection('profiles').where('pairing_code', '==', code).limit(1))
    if (existing.empty) return { code, ref }
  }
  throw new Error('Could not reserve pairing code')
}
const fallbackProfileName = (email?: string | null) =>
  ((typeof email === 'string' ? email.split('@')[0] : '') || 'Użytkownik').slice(0, 60)

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

export async function mirrorMembership(db: Db, rtdb: Rtdb, uid: string) {
  const snapshot = await db.collection('members').doc(uid).get()
  const data = snapshot.data()
  const revision = snapshot.updateTime ?? snapshot.readTime
  await rtdb.ref(`members/${uid}`).transaction((current: any) => {
    if (current?.revision_seconds > revision.seconds ||
        (current?.revision_seconds === revision.seconds && current?.revision_nanos >= revision.nanoseconds)) return
    return {
      profile_id: data?.profile_id ?? null,
      partnership_id: data?.partnership_id ?? null,
      revision_seconds: revision.seconds,
      revision_nanos: revision.nanoseconds
    }
  })
}

function syncMembershipNow(db: Db, rtdb: Rtdb | null, uid: string) {
  // Firestore's members trigger retries a failed inline mirror.
  return rtdb ? mirrorMembership(db, rtdb, uid).catch(error => {
    console.warn('[duoAccount] RTDB membership sync failed', error?.code)
  }) : Promise.resolve()
}

const membership = (profile_id: string | null, partnership_id: string | null) =>
  ({ profile_id, partnership_id, updated_at: nowIso() })

export function pairingRetryAfter(db: Db, uid: string): Promise<number> {
  const ref = db.collection('pairing_limits').doc(uid)
  return db.runTransaction(async (tx: any) => {
    const now = Date.now()
    const previous = (await tx.get(ref)).data()?.attempts as number[] | undefined
    const recent = (previous ?? []).filter(time => time > now - 60_000)
    if (recent.length >= 10) return Math.max(1, Math.ceil((recent[0] + 60_000 - now) / 1000))
    tx.set(ref, { attempts: [...recent, now], expires_at: new Date(now + 86_400_000) })
    return 0
  })
}

async function loadMyProfile(db: Db, user: DecodedUser) {
  const profiles = await findProfilesForUid(db, user.uid)
  return pickCanonicalProfile(db, profiles)
}

export async function syncAccount(db: Db, rtdb: Rtdb | null, user: DecodedUser): Promise<AccountSyncResult> {
  const name = user.name?.trim().slice(0, 60)
  const candidate = await loadMyProfile(db, user)
  const profileRef = db.collection('profiles').doc(candidate?.docId || user.uid)
  const memberRef = db.collection('members').doc(user.uid)

  const result = await db.runTransaction(async (tx: any) => {
    const stored = (await tx.get(profileRef)).data()
    if (stored?.auth_user_id && stored.auth_user_id !== user.uid) {
      return { profile_id: null, partnership_id: null }
    }

    const storedPid = stored?.partnership_id
    const nestRef = typeof storedPid === 'string' && storedPid && !storedPid.includes('/')
      ? db.collection('partnerships').doc(storedPid) : null
    const nest = nestRef ? (await tx.get(nestRef)).data() : null
    const partnershipId = nest && [nest.partner1_id, nest.partner2_id].includes(profileRef.id) ? nestRef.id : null
    const partnerId = partnershipId && (nest.partner1_id === profileRef.id ? nest.partner2_id : nest.partner1_id)
    const peer = typeof partnerId === 'string' && partnerId && !partnerId.includes('/')
      ? (await tx.get(db.collection('profiles').doc(partnerId))).data() : null

    if (!stored && candidate) return { profile_id: null, partnership_id: null }
    const nextCode = isCurrentPairingCode(stored?.pairing_code) ? null : await allocatePairingCode(db, tx)
    if (nextCode) tx.create(nextCode.ref, { uid: user.uid })

    if (!stored) {
      const email = user.email || null
      tx.create(profileRef, {
        id: user.uid,
        auth_user_id: user.uid,
        email,
        name: name || fallbackProfileName(email),
        name_from_auth_pending: !name,
        pairing_code: nextCode!.code,
        avatar_color: '#0284c7',
        current_mood: 'happy',
        mood_note: '',
        love_note: '',
        gender: null,
        grammatical_gender: null,
        onboarding_stage: 'profile',
        partnership_id: null,
        points: 0,
        created_at: nowIso(),
        updated_at: nowIso()
      })
    } else {
      const updates: Record<string, unknown> = {}
      if (stored.id !== profileRef.id) updates.id = profileRef.id
      if (!stored.auth_user_id) updates.auth_user_id = user.uid
      if (stored.partnership_id && !partnershipId) updates.partnership_id = null
      if (!partnershipId && stored.points) updates.points = 0
      if (nextCode) {
        updates.pairing_code = nextCode.code
        updates.legacy_pairing_code = null
      }
      if (stored.name_from_auth_pending === true && name) {
        if (stored.name === fallbackProfileName(stored.email)) updates.name = name
        updates.name_from_auth_pending = false
      }
      if (Object.keys(updates).length) tx.update(profileRef, updates)
      if (partnershipId) {
        tx.set(db.collection('partner_profiles').doc(profileRef.id),
          projectPartnerProfile({ ...stored, ...updates }, profileRef.id, partnershipId))
        if (peer?.partnership_id === partnershipId && peer.auth_user_id) {
          tx.set(db.collection('partner_profiles').doc(partnerId), projectPartnerProfile(peer, partnerId, partnershipId))
        }
      }
    }

    tx.set(memberRef, membership(profileRef.id, partnershipId))
    return { profile_id: profileRef.id, partnership_id: partnershipId }
  })
  await syncMembershipNow(db, rtdb, user.uid)
  return result
}

/** Idempotent backfill of the canonical code and any existing profile mirrors. */
export async function migratePairingCode(db: Db, uid: string): Promise<boolean> {
  const profile = await loadMyProfile(db, { uid })
  if (!profile) return false
  const profiles = await profileDocRefs(db, profile)
  return db.runTransaction(async (tx: any) => {
    const rows = (await Promise.all(profiles.map(ref => tx.get(ref))))
      .filter(row => row.data()?.auth_user_id === uid)
    const canonical = rows.find(row => row.id === profile.docId)
    if (!canonical) return false

    const activeCode = canonical.data()?.pairing_code
    const next = isCurrentPairingCode(activeCode) ? null : await allocatePairingCode(db, tx)
    const code = next?.code ?? activeCode
    if (next) tx.create(next.ref, { uid })

    let changed = false
    for (const row of rows) {
      const previous = row.data()?.pairing_code
      if (previous === code) continue
      tx.update(row.ref, {
        pairing_code: code,
        legacy_pairing_code: null
      })
      changed = true
    }
    return changed
  })
}

async function findPairingOwner(db: Db, code: string) {
  const current = await db.collection('profiles').where('pairing_code', '==', code).limit(20).get()
  const owners = new Set<string>(current.docs
    .map(doc => doc.data()?.auth_user_id).filter(Boolean))
  return owners.size === 1 ? [...owners][0] : null
}

export async function pairWithCode(
  db: Db,
  rtdb: Rtdb | null,
  user: DecodedUser,
  rawInput: string,
  displayName?: string | null
): Promise<{ error?: string; partnership?: any; partner?: any; points?: number }> {
  const input = String(rawInput || '').trim().slice(0, 200)
  if (!input) return { error: 'invalid_pairing_input' }

  // Pairing works ONLY with the partner's pairing code – it is the shared secret that
  // proves consent. (Pairing by e-mail let anyone attach themselves to a stranger.)
  if (input.includes('@')) return { error: 'pairing_code_required' }
  let code = normalizePairingCode(input)
  // Older clients add this prefix even to current codes.
  if (code.startsWith('DN-') && isCurrentPairingCode(code.slice(3))) code = code.slice(3)
  if (!isCurrentPairingCode(code)) return { error: 'invalid_pairing_input' }

  let me = await loadMyProfile(db, user)
  if (!me?.auth_user_id || !me.pairing_code) {
    const { profile_id } = await syncAccount(db, rtdb, user)
    if (!profile_id) return { error: 'profile_not_linked' }
    const profile = await db.collection('profiles').doc(profile_id).get()
    if (!profile.exists || profile.data()?.auth_user_id !== user.uid) return { error: 'profile_not_linked' }
    me = { ...profile.data(), docId: profile.id }
  }
  const myId = profileIdOf(me)

  const owner = await findPairingOwner(db, code)
  if (!owner || owner === user.uid) return { error: 'partner_unavailable' }
  const partner = await loadMyProfile(db, { uid: owner })
  if (partner?.pairing_code !== code) return { error: 'partner_unavailable' }
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
    pet_name: null,
    pet_care: createPetCareState(Date.parse(created)),
    created_at: created
  }

  const myUpdates: any = { partnership_id: partnershipId, points: 0, updated_at: created }
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
    const myProfile = mine.find(doc => doc.id === myId)?.data()
    const partnerProfile = theirs.find(doc => doc.id === partnerId)?.data()
    if (!myProfile || partnerProfile?.pairing_code !== code) return null

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
        return {
          partnership: { ...candidate, id: doc.id },
          points: Number(myProfile.points) || 0,
          partner: projectPartnerProfile(partnerProfile, partnerId, doc.id)
        }
      }
      if (ids.includes(myId) || ids.includes(partnerId)) return null
    }
    const myCode = await allocatePairingCode(db, tx)
    const theirCode = await allocatePairingCode(db, tx, new Set([myCode.code]))
    tx.create(myCode.ref, { uid: user.uid })
    tx.create(theirCode.ref, { uid: partner.auth_user_id })
    tx.create(db.collection('partnerships').doc(partnershipId), partnership)
    for (const doc of mine) tx.update(doc.ref, { ...myUpdates, pairing_code: myCode.code, legacy_pairing_code: null })
    for (const doc of theirs) tx.update(doc.ref, {
      partnership_id: partnershipId, points: 0, updated_at: created,
      pairing_code: theirCode.code, legacy_pairing_code: null
    })
    const myPublic = projectPartnerProfile({ ...myProfile, ...myUpdates }, myId, partnershipId)
    const theirPublic = projectPartnerProfile({ ...partnerProfile, points: 0 }, partnerId, partnershipId)
    tx.set(db.collection('partner_profiles').doc(myId), myPublic)
    tx.set(db.collection('partner_profiles').doc(partnerId), theirPublic)
    tx.set(db.collection('members').doc(user.uid), membership(myId, partnershipId))
    tx.set(db.collection('members').doc(partner.auth_user_id), membership(partnerId, partnershipId))
    return { partnership, points: 0, partner: theirPublic }
  })
  if (!paired) return { error: 'already paired' }

  await Promise.all([syncMembershipNow(db, rtdb, user.uid), syncMembershipNow(db, rtdb, partner.auth_user_id)])

  return paired
}

export async function disconnectPartnership(
  db: Db, rtdb: Rtdb | null, user: DecodedUser, expectedPartnershipId?: string
): Promise<{ success: boolean }> {
  const me = await loadMyProfile(db, user)
  if (!me) return { success: true }
  const profileRef = db.collection('profiles').doc(me.docId)
  const result = await db.runTransaction(async (tx: any) => {
    const current = (await tx.get(profileRef)).data()
    if (current?.auth_user_id !== user.uid) return null
    const pid = current.partnership_id
    if (typeof pid !== 'string' || (expectedPartnershipId && pid !== expectedPartnershipId)) return null

    const nestRef = db.collection('partnerships').doc(pid)
    const nest = (await tx.get(nestRef)).data()
    if (!nest || ![nest.partner1_id, nest.partner2_id].includes(profileRef.id)) return null

    const profiles = await tx.get(db.collection('profiles').where('partnership_id', '==', pid))
    const ids = new Map<string, string>([[user.uid, profileRef.id]])
    for (const doc of profiles.docs) {
      const uid = doc.data()?.auth_user_id
      if (uid && [nest.partner1_id, nest.partner2_id].includes(doc.id)) ids.set(uid, doc.id)
    }
    const freshCodes = new Map<string, Awaited<ReturnType<typeof allocatePairingCode>>>()
    const reserved = new Set<string>()
    for (const uid of ids.keys()) {
      const next = await allocatePairingCode(db, tx, reserved)
      freshCodes.set(uid, next)
      reserved.add(next.code)
    }
    // Block the old RTDB channel before Firestore commits, even if membership mirroring fails.
    if (!rtdb) throw new DuoDataError(503, 'Nie można teraz rozłączyć Gniazdka.')
    await rtdb.ref(`revoked_partnerships/${pid}`).set({ requested_by: user.uid })
    for (const [uid, next] of freshCodes) tx.create(next.ref, { uid })
    for (const doc of profiles.docs) {
      const next = freshCodes.get(doc.data()?.auth_user_id)
      if (next) tx.update(doc.ref, {
        partnership_id: null, points: 0, pairing_code: next.code, legacy_pairing_code: null, updated_at: nowIso()
      })
    }
    tx.delete(nestRef)
    for (const [uid, profileId] of ids) {
      tx.set(db.collection('members').doc(uid), membership(profileId, null))
      tx.delete(db.collection('partner_profiles').doc(profileId))
      tx.delete(db.collection('calendar_subscriptions').doc(uid))
      removeDuoLocationForPair(db, tx, uid, pid, profileId)
    }
    return [...ids.keys()]
  })
  await Promise.all((result || [user.uid]).map((uid: string) => syncMembershipNow(db, rtdb, uid)))
  return { success: true }
}

/** Resolves the caller's profile (used by push endpoints). */
export async function resolveCallerProfile(db: Db, user: DecodedUser) {
  const me = await loadMyProfile(db, user)
  if (!me) return null
  return {
    id: profileIdOf(me),
    name: me.name || null,
    gender: me.gender || null,
    grammatical_gender: me.grammatical_gender || null,
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
