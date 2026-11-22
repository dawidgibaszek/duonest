import { setResponseHeader, getRequestHeader, readBody, createError } from 'h3'
import { publishDuoLocation } from '~/functions/src/duoLocation'
import { DuoDataError } from '~/functions/src/partnershipAccess'
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    return await publishDuoLocation(
      getFirebaseAdminDb(), getFirebaseAdminAuth(), getRequestHeader(event, 'authorization') || '', await readBody(event) ?? {}
    )
  } catch (error) {
    if (error instanceof DuoDataError) throw createError({ statusCode: error.status, message: error.message })
    throw error
  }
})
