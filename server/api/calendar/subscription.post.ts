import { defineEventHandler, readBody, createError, setHeader } from 'h3'
import { getFirebaseAdminDb, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { updateCalendarSubscription } from '~/functions/src/calendarCore'
import { DuoDataError } from '~/functions/src/partnershipAccess'

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  const user = await requireFirebaseUser(event)
  const body = await readBody(event)
  try {
    return await updateCalendarSubscription(getFirebaseAdminDb(), user.uid, body?.action)
  } catch (error) {
    if (error instanceof DuoDataError) throw createError({ statusCode: error.status, data: { message: error.message } })
    throw error
  }
})
