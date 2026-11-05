import { defineEventHandler, getQuery } from 'h3'
import { lookupMealById } from '../../utils/meals'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.id || query.i || '').trim()
  return await lookupMealById(id)
})
