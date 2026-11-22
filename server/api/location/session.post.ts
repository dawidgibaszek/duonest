import { setResponseHeader, readBody, createError } from 'h3'
import { locationSession } from '~/functions/src/duoLocation'
import { DuoDataError } from '~/functions/src/partnershipAccess'
import { getFirebaseAdminDb, requireFirebaseUser } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async event => {
  const user = await requireFirebaseUser(event)
  const body = await readBody(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    return await locationSession(getFirebaseAdminDb(), user.uid, user.auth_time * 1000, body?.action, body?.partnershipId)
  } catch (error) {
    if (error instanceof DuoDataError) throw createError({ statusCode: error.status, message: error.message })
    throw error
  }
})
