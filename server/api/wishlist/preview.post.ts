import { defineEventHandler, readBody, createError } from 'h3'
import { processScrape } from '../../utils/wishlistScraper'
import { checkRateLimit, getClientIp } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const rate = checkRateLimit(`scrape:${ip}`, 15, 60000)
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
