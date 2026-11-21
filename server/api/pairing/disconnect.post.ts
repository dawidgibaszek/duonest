import { defineEventHandler } from 'h3'
import { getFirebaseAdminDb, getFirebaseAdminRtdb, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { disconnectPartnership } from '~/server/utils/duoAccount'

export default defineEventHandler(async (event) => {
  const user = await requireFirebaseUser(event)
  return await disconnectPartnership(getFirebaseAdminDb(), getFirebaseAdminRtdb(), user)
})
