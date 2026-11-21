import type { Firestore, Transaction } from 'firebase-admin/firestore'

export class DuoDataError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export function documentId(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 128 || /[/\\\u0000-\u001f]/.test(value) || value === '.' || value === '..') {
    throw new DuoDataError(400, 'Nieprawidłowy identyfikator.')
  }
  return value
}

export async function requirePartnership(tx: Transaction, db: Firestore, uid: string) {
  const member = (await tx.get(db.collection('members').doc(uid))).data()
  if (!member?.profile_id || !member?.partnership_id) {
    throw new DuoDataError(403, 'Wymagane jest aktywne Gniazdko.')
  }

  const profileId = documentId(member.profile_id)
  const partnershipId = documentId(member.partnership_id)
  const profileRef = db.collection('profiles').doc(profileId)
  const partnershipRef = db.collection('partnerships').doc(partnershipId)
  const [profileSnap, partnershipSnap] = await tx.getAll(profileRef, partnershipRef)
  const profile = profileSnap.data()
  const partnership = partnershipSnap.data()
  if (profile?.auth_user_id !== uid || profile.partnership_id !== partnershipId || !partnership ||
      (partnership.partner1_id !== profileId && partnership.partner2_id !== profileId)) {
    throw new DuoDataError(403, 'Brak dostępu do Gniazdka.')
  }
  return { profileId, partnershipId, profileRef, partnershipRef, profile, partnership }
}

export type PartnershipAccess = Awaited<ReturnType<typeof requirePartnership>>
