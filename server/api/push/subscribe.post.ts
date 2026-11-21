import { defineEventHandler, readBody, createError, setResponseStatus } from 'h3'
import { getFirebaseAdminDb, getFirebaseAdminMessaging, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { resolveCallerProfile } from '~/server/utils/duoAccount'
import { checkRateLimit } from '~/server/utils/rateLimit'
import { handlePushAction } from '~/server/utils/pushCore'

/** POST /api/push/subscribe – see server/utils/pushCore.ts (Web Push + FCM) */
export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 20, windowMs: 60000, keyPrefix: 'push_subscribe' })
  if (!rate.allowed) throw createError({ statusCode: 429, statusMessage: 'Zbyt wiele żądań. Odczekaj chwilę.' })

  const user = await requireFirebaseUser(event)
  const db = getFirebaseAdminDb()
  const profile = await resolveCallerProfile(db, user)
  if (!profile) throw createError({ statusCode: 403, statusMessage: 'No profile is linked to this account' })

  const body = await readBody(event).catch(() => ({}))
  const result = await handlePushAction(db, getFirebaseAdminMessaging(), {
    uid: user.uid,
    profileId: profile.id,
    partnershipId: profile.partnership_id || null,
    name: profile.name || null
  }, 'subscribe', body || {})
  setResponseStatus(event, result.status)
  return result.body
})
