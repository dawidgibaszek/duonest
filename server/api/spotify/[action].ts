import { defineEventHandler, getMethod, getRequestHeader, readBody, setResponseHeader, setResponseStatus } from 'h3'
import { getFirebaseAdminDb, requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { resolveCallerProfile } from '~/server/utils/duoAccount'
import { handleMusicAction, isMusicAction } from '~/server/utils/musicCore'

/** /api/spotify/:action – Last.fm music activity (see server/utils/musicCore.ts) */
export default defineEventHandler(async (event) => {
  const action = event.context.params?.action || ''
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (!isMusicAction('spotify', action)) {
    setResponseStatus(event, 404)
    return { success: false, error: 'Music endpoint not found' }
  }

  const user = await requireFirebaseUser(event)
  const db = getFirebaseAdminDb()
  const profile = await resolveCallerProfile(db, user)
  if (!profile) {
    setResponseStatus(event, 403)
    return { success: false, error: 'No profile linked to account' }
  }

  const method = getMethod(event)
  const body = method === 'POST' ? await readBody(event).catch(() => ({})) : undefined
  const result = await handleMusicAction(
    db,
    { id: profile.id, partnership_id: profile.partnership_id || null },
    'spotify',
    action,
    method,
    body,
    getRequestHeader(event, 'origin')
  )
  setResponseStatus(event, result.status)
  return result.body
})
