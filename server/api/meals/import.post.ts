import { defineEventHandler, readBody, createError } from 'h3'
import { processRecipeImport } from '../../utils/recipeScraper'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 20, windowMs: 60000, keyPrefix: 'recipe_import' })
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
      error: 'Wklej poprawny link do przepisu, TikToka lub YouTube Shorts.'
    }
  }

  return await processRecipeImport(rawUrl)
})

