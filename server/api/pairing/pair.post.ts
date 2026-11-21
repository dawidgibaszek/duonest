import { defineEventHandler, readBody, createError } from 'h3'
import { getFirebaseAdminDb, getFirebaseAdminRtdb, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { pairWithCode } from '~/server/utils/duoAccount'
import { checkRateLimit } from '~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 10, windowMs: 60000, keyPrefix: 'pairing' })
  if (!rate.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zbyt wiele prób parowania. Odczekaj chwilę.' })
  }
  const user = await requireFirebaseUser(event)
  // Only password accounts must confirm the address (Apple may hide the e-mail)
  if (user.sign_in_provider === 'password' && !user.email_verified) {
    throw createError({ statusCode: 403, statusMessage: 'email_not_verified' })
  }
  const body = await readBody(event).catch(() => ({}))
  return await pairWithCode(
    getFirebaseAdminDb(),
    getFirebaseAdminRtdb(),
    user,
    String(body?.pairing_input || ''),
    typeof body?.display_name === 'string' ? body.display_name : null
  )
})
