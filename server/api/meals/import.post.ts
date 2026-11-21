import { defineEventHandler, readBody, createError } from 'h3'
import { handleMealsImport } from '~/functions/src/mealsCore'
import { requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  await requireFirebaseUser(event)
  const rate = await checkRateLimit(event, { maxRequests: 20, windowMs: 60000, keyPrefix: 'recipe_import' })
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele prób importu przepisów. Odczekaj chwilę przed kolejną próbą.'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  return await handleMealsImport(body)
})
