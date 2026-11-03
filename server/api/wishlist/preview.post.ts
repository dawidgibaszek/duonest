import { defineEventHandler, readBody } from 'h3'
import { processScrape } from '../../../netlify/functions/wishlist-preview'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const rawUrl = (body?.url || '').trim()
  return await processScrape(rawUrl)
})
