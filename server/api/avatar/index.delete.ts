import { createError, setResponseHeader } from 'h3'
import { writeProfileAvatar } from '~/functions/src/profileAvatar'
import { DuoDataError } from '~/functions/src/partnershipAccess'
import { getFirebaseAdminDb, getFirebaseAvatarBucket, requireFirebaseUser } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async event => {
  const { uid } = await requireFirebaseUser(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    return await writeProfileAvatar(getFirebaseAdminDb(), uid, null, getFirebaseAvatarBucket())
  } catch (error) {
    if (error instanceof DuoDataError) throw createError({ statusCode: error.status, message: error.message })
    throw error
  }
})
