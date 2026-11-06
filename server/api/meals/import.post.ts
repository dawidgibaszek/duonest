import { defineEventHandler, readBody, createError } from 'h3'
import { processRecipeImport } from '../../utils/recipeScraper'
import { checkRateLimit, getClientIp } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const rate = checkRateLimit(`recipe-import:${ip}`, 20, 60000)
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele prób importu przepisów. Odczekaj chwilę przed kolejną próbą.'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const rawUrl = String(body?.url || '').trim()

  if (!rawUrl) {
    return {
      success: false,
      error: 'Wklej poprawny link do przepisu lub TikToka.'
    }
  }

  return await processRecipeImport(rawUrl)
})

