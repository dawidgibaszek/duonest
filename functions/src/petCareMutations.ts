import type { Firestore, Transaction } from 'firebase-admin/firestore'
import { DuoDataError, type PartnershipAccess } from './partnershipAccess'
import { applyPetCare, calculatePetCare, createPetCareState, PET_ACTIONS, type PetActionType, type PetCareState } from './petCare'

const RECEIPT_TTL_MS = 7 * 24 * 60 * 60_000

export async function managePetCare(
  tx: Transaction, db: Firestore, access: PartnershipAccess, id: string, body: Record<string, unknown>
) {
  if (access.partnershipId !== id) throw new DuoDataError(403, 'Brak dostępu do zwierzaka.')

  const ref = db.collection('partnerships').doc(id)
  const stored = access.partnership.pet_care as PetCareState | null | undefined

  if (body.action === 'pet/read') {
    const now = Date.now()
    const state = stored ? calculatePetCare(stored, now) : createPetCareState(now)
    if (!stored) tx.update(ref, { pet_care: state })
    return { state, serverNow: now }
  }

  const { kind, requestId } = body
  if (typeof kind !== 'string' || !Object.hasOwn(PET_ACTIONS, kind) ||
      typeof requestId !== 'string' || !/^pet_[a-f0-9]{32}$/.test(requestId)) {
    throw new DuoDataError(400, 'Nieprawidłowa akcja opieki.')
  }

  const receiptRef = ref.collection('pet_care_requests').doc(`${access.profileId}_${requestId}`)
  const receipt = (await tx.get(receiptRef)).data()
  const now = Date.now()
  const initial = stored ?? createPetCareState(now)
  if (receipt) {
    if (receipt.kind !== kind) throw new DuoDataError(409, 'To żądanie dotyczy innej akcji opieki.')
    return { state: calculatePetCare(initial, now), serverNow: now, gained: receipt.gained as number }
  }

  const result = applyPetCare(initial, kind as PetActionType, access.profileId, now)
  if (result.gained > 0 || !stored) tx.update(ref, { pet_care: result.state })
  tx.create(receiptRef, { kind, gained: result.gained, expires_at: new Date(now + RECEIPT_TTL_MS) })
  return result
}
