import { defineEventHandler, getQuery, createError } from 'h3'
import { searchMealsCatalog } from '../../utils/meals'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rl = await checkRateLimit(event, { maxRequests: 60, windowMs: 60_000, keyPrefix: 'meals_search' })
  if (!rl.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele zapytań o przepisy. Spróbuj ponownie za chwilę.'
    })
  }

  const query = getQuery(event)
  const searchQuery = String(query.q || query.query || query.s || '').trim().slice(0, 80)
  const category = String(query.category || query.c || '').trim().slice(0, 40)
  const area = String(query.area || query.a || '').trim().slice(0, 40)
  const isRandom = query.random === 'true' || query.random === '1'

  const rawPage = parseInt(String(query.page || 1), 10)
  const pageNum = Number.isFinite(rawPage) ? Math.max(1, Math.min(rawPage, 1000)) : 1

  const rawLimit = parseInt(String(query.limit || 24), 10)
  const limitNum = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 60)) : 24

  return await searchMealsCatalog({
    searchQuery,
    category,
    area,
    isRandom,
    pageNum,
    limitNum
  })
})
