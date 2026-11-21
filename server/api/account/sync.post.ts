import { defineEventHandler } from 'h3'
import { getFirebaseAdminDb, getFirebaseAdminRtdb, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { syncAccount } from '~/server/utils/duoAccount'

/**
 * Links the signed-in Firebase user to their profile and writes the
 * `members/{uid}` record that Firestore/RTDB security rules rely on.
 */
export default defineEventHandler(async (event) => {
  const user = await requireFirebaseUser(event)
  return await syncAccount(getFirebaseAdminDb(), getFirebaseAdminRtdb(), user)
})
