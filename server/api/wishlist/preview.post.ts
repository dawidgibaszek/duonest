import { defineEventHandler, readBody, createError } from 'h3'
import { requireFirebaseUser } from '~/server/utils/firebaseAdmin'
import { processScrape } from '../../utils/wishlistScraper'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  await requireFirebaseUser(event)
  const rate = await checkRateLimit(event, { maxRequests: 15, windowMs: 60000, keyPrefix: 'scrape' })
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele zapytań podglądu linku. Odczekaj chwilę.'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''
  if (rawUrl.length > 2048) throw createError({ statusCode: 400, message: 'Link jest zbyt długi.' })
  return await processScrape(rawUrl)
})
