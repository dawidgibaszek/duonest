import { createError, getRequestHeader, readRawBody, setResponseHeader } from 'h3'
import { MAX_AVATAR_BYTES, writeProfileAvatar } from '~/functions/src/profileAvatar'
import { DuoDataError } from '~/functions/src/partnershipAccess'
import { getFirebaseAdminDb, getFirebaseAvatarBucket, requireFirebaseUser } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async event => {
  const { uid } = await requireFirebaseUser(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (getRequestHeader(event, 'Content-Type') !== 'image/jpeg') throw createError({ statusCode: 415 })
  if (Number(getRequestHeader(event, 'Content-Length')) > MAX_AVATAR_BYTES) throw createError({ statusCode: 413 })
  try {
    const image = await readRawBody(event, false)
    if (!image?.length) throw createError({ statusCode: 400, message: 'Nie wybrano zdjęcia JPG.' })
    return await writeProfileAvatar(getFirebaseAdminDb(), uid, image, getFirebaseAvatarBucket())
  } catch (error) {
    if (error instanceof DuoDataError) throw createError({ statusCode: error.status, message: error.message })
    throw error
  }
})
