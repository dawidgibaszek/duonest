import { defineEventHandler, getQuery } from 'h3'
import { searchMealsCatalog } from '../../utils/meals'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return await searchMealsCatalog({
    searchQuery: String(query.q || query.query || query.s || ''),
    category: String(query.category || query.c || ''),
    area: String(query.area || query.a || ''),
    isRandom: query.random === 'true' || query.random === '1',
    pageNum: parseInt(String(query.page || 1), 10) || 1,
    limitNum: parseInt(String(query.limit || 24), 10) || 24
  })
})
