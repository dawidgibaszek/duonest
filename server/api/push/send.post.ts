import { defineEventHandler, readBody, createError, setResponseStatus } from 'h3'
import { getFirebaseAdminDb, getFirebaseAdminMessaging, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { resolveCallerProfile } from '~/server/utils/duoAccount'
import { checkRateLimit } from '~/server/utils/rateLimit'
import { handlePushAction } from '~/server/utils/pushCore'

/** POST /api/push/send – see server/utils/pushCore.ts (Web Push + FCM) */
export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 30, windowMs: 60000, keyPrefix: 'push_send' })
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
    name: profile.name || null,
    gender: profile.gender || null,
    grammatical_gender: profile.grammatical_gender || null
  }, 'send', body || {})
  setResponseStatus(event, result.status)
  return result.body
})
