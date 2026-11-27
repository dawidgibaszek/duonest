import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'
import { getFirebaseAdminDb, getFirebaseAdminRtdb, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { pairWithCode, pairingRetryAfter } from '~/server/utils/duoAccount'

export default defineEventHandler(async (event) => {
  const user = await requireFirebaseUser(event)
  // Only password accounts must confirm the address (Apple may hide the e-mail)
  if (user.sign_in_provider === 'password' && !user.email_verified) {
    throw createError({ statusCode: 403, statusMessage: 'email_not_verified' })
  }
  const db = getFirebaseAdminDb()
  const retryAfter = await pairingRetryAfter(db, user.uid)
  if (retryAfter) {
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({ statusCode: 429, statusMessage: 'pairing_rate_limited' })
  }
  const body = await readBody(event).catch(() => ({}))
  return await pairWithCode(
    db,
    getFirebaseAdminRtdb(),
    user,
    String(body?.pairing_input || ''),
    typeof body?.display_name === 'string' ? body.display_name : null
  )
})
