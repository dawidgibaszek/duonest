import { createError, getRouterParam, setResponseHeader } from 'h3'
import { readProfileAvatar } from '~/functions/src/profileAvatar'
import { DuoDataError } from '~/functions/src/partnershipAccess'
import { getFirebaseAdminDb, getFirebaseAvatarBucket, requireFirebaseUser } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async event => {
  const { uid } = await requireFirebaseUser(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  try {
    const image = await readProfileAvatar(getFirebaseAdminDb(), uid, getRouterParam(event, 'id'), getFirebaseAvatarBucket())
    setResponseHeader(event, 'Content-Type', 'image/jpeg')
    return image
  } catch (error) {
    if (error instanceof DuoDataError) throw createError({ statusCode: error.status, message: error.message })
    throw error
  }
})
