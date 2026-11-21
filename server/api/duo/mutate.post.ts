import { defineEventHandler, readBody, createError } from 'h3'
import { getFirebaseAdminDb, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { mutateDuoData } from '~/functions/src/duoMutations'
import { DuoDataError } from '~/functions/src/partnershipAccess'

export default defineEventHandler(async event => {
  const user = await requireFirebaseUser(event)
  const body = await readBody(event)
  try {
    return await mutateDuoData(getFirebaseAdminDb(), user.uid, body)
  } catch (error) {
    if (error instanceof DuoDataError) throw createError({ statusCode: error.status, data: { message: error.message } })
    throw error
  }
})
