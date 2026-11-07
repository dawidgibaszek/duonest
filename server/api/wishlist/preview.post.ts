import { defineEventHandler, readBody, createError } from 'h3'
import { processScrape } from '../../utils/wishlistScraper'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 15, windowMs: 60000, keyPrefix: 'scrape' })
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele zapytań podglądu linku. Odczekaj chwilę.'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const rawUrl = (body?.url || '').trim()
  return await processScrape(rawUrl)
})
