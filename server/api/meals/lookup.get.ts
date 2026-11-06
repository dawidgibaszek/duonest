import { defineEventHandler, getQuery, createError } from 'h3'
import { lookupMealById } from '../../utils/meals'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rl = checkRateLimit(event, { maxRequests: 60, windowMs: 60_000, keyPrefix: 'meals_lookup' })
  if (!rl.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele zapytań o przepis. Spróbuj ponownie za chwilę.'
    })
  }

  const query = getQuery(event)
  const id = String(query.id || query.i || '').trim()
  if (!id || !/^[a-zA-Z0-9_-]{1,30}$/.test(id)) {
    return { success: false, error: 'INVALID_ID', meal: null }
  }

  return await lookupMealById(id)
})
