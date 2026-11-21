/**
 * Account, membership and pairing operations that require admin privileges.
 *
 * Firestore/RTDB security rules only let a client touch data of the partnership
 * listed in its `members/{uid}` record. That record (and every write to another
 * person's profile) is produced here, on the server, after verifying ownership.
 *
 * NOTE: an identical copy lives in server/utils/duoAccount.ts (Nuxt server
 * build separately). Keep both files in sync.
 */

export interface DecodedUser {
  uid: string
  email?: string
  email_verified?: boolean
}

export interface AccountSyncResult {
  profile_id: string | null
  partnership_id: string | null
}

type Db = any
type Rtdb = any

const nowIso = () => new Date().toISOString()

const profileIdOf = (p: any): string => String(p?.id || p?.docId || '')

async function findProfilesForUid(db: Db, uid: string): Promise<any[]> {
  const found = new Map<string, any>()
  const own = await db.collection('profiles').doc(uid).get()
  if (own.exists) found.set(own.id, { ...own.data(), docId: own.id })
  const snap = await db.collection('profiles').where('auth_user_id', '==', uid).limit(10).get()
  for (const d of snap.docs) found.set(d.id, { ...d.data(), docId: d.id })
  return [...found.values()]
}

/**
 * One account can have several profile docs (original + copies/stubs written by
 * older app versions under profiles/{uid}). Pick the real one:
 * valid nest ≫ complete profile (code, name, own `id`) ≫ newest.
 */
async function pickCanonicalProfile(db: Db, list: any[], uid: string): Promise<any | null> {
  if (list.length === 0) return null
  const scored = await Promise.all(list.map(async (p) => {
    const hasValidNest = p.partnership_id ? Boolean(await validPartnershipFor(db, p)) : false
    const score =
      (hasValidNest ? 32 : 0) +
      (p.pairing_code ? 8 : 0) +
      (p.name ? 4 : 0) +
      (p.id ? 2 : 0)
    return { p, score, ts: Date.parse(p.updated_at || p.created_at || '') || 0 }
  }))
  scored.sort((a, b) => (b.score - a.score) || (b.ts - a.ts))
  return scored[0].p
}

/** Every Firestore doc that represents the given profile (canonical doc + mirrors). */
async function profileDocRefs(db: Db, profile: any): Promise<any[]> {
  const refs = new Map<string, any>()
  const pid = profileIdOf(profile)
  if (pid) refs.set(pid, db.collection('profiles').doc(pid))
  if (profile.docId) refs.set(profile.docId, db.collection('profiles').doc(profile.docId))
  if (profile.auth_user_id) {
    const snap = await db.collection('profiles').where('auth_user_id', '==', profile.auth_user_id).limit(10).get()
    for (const d of snap.docs) refs.set(d.id, d.ref)
  }
  // Only update docs that already exist – never create stub profiles.
  const existing: any[] = []
  for (const ref of refs.values()) {
    const s = await ref.get()
    if (s.exists) existing.push(ref)
  }
  return existing
}

async function validPartnershipFor(db: Db, profile: any): Promise<string | null> {
  const partnershipId = profile?.partnership_id
  if (!partnershipId) return null
  const snap = await db.collection('partnerships').doc(String(partnershipId)).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  const me = profileIdOf(profile)
  return data.partner1_id === me || data.partner2_id === me ? snap.id : null
}

async function writeMembership(db: Db, rtdb: Rtdb | null, uid: string, profileId: string | null, partnershipId: string | null) {
  await db.collection('members').doc(uid).set({
    profile_id: profileId,
    partnership_id: partnershipId,
    updated_at: nowIso()
  })
  if (rtdb) {
    try {
      await rtdb.ref(`members/${uid}`).set({ profile_id: profileId, partnership_id: partnershipId })
    } catch (err) {
      console.warn('[duoAccount] RTDB membership write failed:', (err as any)?.message || err)
    }
  }
}

async function loadMyProfile(db: Db, user: DecodedUser) {
  const profiles = await findProfilesForUid(db, user.uid)
  return pickCanonicalProfile(db, profiles, user.uid)
}

export async function syncAccount(db: Db, rtdb: Rtdb | null, user: DecodedUser): Promise<AccountSyncResult> {
  const profile = await loadMyProfile(db, user)
  if (!profile) {
    await writeMembership(db, rtdb, user.uid, null, null)
    return { profile_id: null, partnership_id: null }
  }
  // Repair: a doc under profiles/{uid} written by an older version without owner/id
  if (profile.docId === user.uid && (profile.auth_user_id !== user.uid || !profile.id)) {
    await db.collection('profiles').doc(user.uid).set({ auth_user_id: user.uid, id: profile.id || user.uid }, { merge: true })
    profile.auth_user_id = user.uid
    profile.id = profile.id || user.uid
  }
  const partnershipId = await validPartnershipFor(db, profile)
  const profileId = profileIdOf(profile)
  await writeMembership(db, rtdb, user.uid, profileId, partnershipId)
  return { profile_id: profileId, partnership_id: partnershipId }
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
): Promise<{ error?: string; partnership?: any; partner?: any; partner_pairing_code?: string }> {
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

  let partner: any = null
  const snap = await db.collection('profiles').where('pairing_code', '==', code).limit(1).get()
  if (!snap.empty) partner = { ...snap.docs[0].data(), docId: snap.docs[0].id }

  if (!partner || profileIdOf(partner) === myId || partner.auth_user_id === user.uid) {
    return { error: 'partner_unavailable' }
  }
  const partnerId = profileIdOf(partner)

  // Already paired together → return the existing nest
  if (me.partnership_id && me.partnership_id === partner.partnership_id) {
    const existing = await db.collection('partnerships').doc(String(me.partnership_id)).get()
    if (existing.exists) {
      const data = existing.data() || {}
      if ([data.partner1_id, data.partner2_id].includes(myId) && [data.partner1_id, data.partner2_id].includes(partnerId)) {
        await writeMembership(db, rtdb, user.uid, myId, existing.id)
        if (partner.auth_user_id) await writeMembership(db, rtdb, partner.auth_user_id, partnerId, existing.id)
        return {
          partnership: { id: existing.id, ...data },
          partner: partnerSummary(partner, existing.id),
          partner_pairing_code: partner.pairing_code
        }
      }
    }
  }

  const myRefs = await profileDocRefs(db, me)
  const partnerRefs = await profileDocRefs(db, partner)
  if (myRefs.length === 0 || partnerRefs.length === 0) return { error: 'partner_unavailable' }

  const created = nowIso()
  const partnershipId = `part_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`
  const partnership = {
    id: partnershipId,
    partner1_id: myId,
    partner2_id: partnerId,
    nest_name: 'Nasze Ciepłe Gniazdko',
    nest_level: 1,
    anniversary_date: created.split('T')[0],
    pet_id: 'cat',
    pet_name: 'Kropek',
    pet_xp: 0,
    created_at: created
  }

  const myUpdates: any = { partnership_id: partnershipId, updated_at: created }
  const cleanName = String(displayName || '').trim().slice(0, 60)
  if (cleanName) myUpdates.name = cleanName

  // Atomic: re-check that neither person is in an active nest, then write everything.
  // Prevents two people pairing with the same partner at the same moment.
  const paired = await db.runTransaction(async (tx: any) => {
    const allRefs = [...myRefs, ...partnerRefs]
    const snaps = await Promise.all(allRefs.map((r: any) => tx.get(r)))
    const existingPids = new Set<string>()
    for (const s of snaps) {
      const pid = s.exists ? s.data()?.partnership_id : null
      if (pid) existingPids.add(String(pid))
    }
    for (const pid of existingPids) {
      const ps = await tx.get(db.collection('partnerships').doc(pid))
      if (ps.exists) {
        const d = ps.data() || {}
        if ([myId, partnerId].includes(d.partner1_id) || [myId, partnerId].includes(d.partner2_id)) return false
      }
    }
    tx.set(db.collection('partnerships').doc(partnershipId), partnership)
    for (const r of myRefs) tx.set(r, myUpdates, { merge: true })
    for (const r of partnerRefs) tx.set(r, { partnership_id: partnershipId, updated_at: created }, { merge: true })
    return true
  })
  if (!paired) return { error: 'already paired' }

  await writeMembership(db, rtdb, user.uid, myId, partnershipId)
  if (partner.auth_user_id) await writeMembership(db, rtdb, partner.auth_user_id, partnerId, partnershipId)

  return {
    partnership,
    partner: partnerSummary(partner, partnershipId),
    partner_pairing_code: partner.pairing_code
  }
}

export async function disconnectPartnership(db: Db, rtdb: Rtdb | null, user: DecodedUser): Promise<{ success: boolean }> {
  const me = await loadMyProfile(db, user)
  const partnershipId = me ? await validPartnershipFor(db, me) : null
  if (!me || !partnershipId) {
    if (me) await writeMembership(db, rtdb, user.uid, profileIdOf(me), null)
    return { success: true }
  }

  const partnershipSnap = await db.collection('partnerships').doc(partnershipId).get()
  const pdata = partnershipSnap.data() || {}
  const memberIds = [pdata.partner1_id, pdata.partner2_id].filter(Boolean).map(String)

  const authUids = new Set<string>([user.uid])
  const membersSnap = await db.collection('profiles').where('partnership_id', '==', partnershipId).limit(20).get()
  for (const d of membersSnap.docs) {
    const data = d.data()
    if (data.auth_user_id) authUids.add(String(data.auth_user_id))
    await d.ref.set({ partnership_id: null, updated_at: nowIso() }, { merge: true })
  }
  for (const id of memberIds) {
    const ref = db.collection('profiles').doc(id)
    const s = await ref.get()
    if (s.exists) {
      if (s.data()?.auth_user_id) authUids.add(String(s.data().auth_user_id))
      await ref.set({ partnership_id: null, updated_at: nowIso() }, { merge: true })
    }
  }

  await db.collection('partnerships').doc(partnershipId).delete()

  for (const uid of authUids) {
    const memberSnap = await db.collection('members').doc(uid).get()
    const profileId = memberSnap.exists ? memberSnap.data()?.profile_id || null : null
    await writeMembership(db, rtdb, uid, uid === user.uid ? profileIdOf(me) : profileId, null)
  }
  if (rtdb) {
    try { await rtdb.ref(`live/broadcast/duonest_channel_${partnershipId}`).remove() } catch (_) {}
    try { await rtdb.ref(`live/presence/duonest_channel_${partnershipId}`).remove() } catch (_) {}
  }
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
