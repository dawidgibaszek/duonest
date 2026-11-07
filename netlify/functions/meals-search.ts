import { searchMealsCatalog } from '../../server/utils/meals'
import { getRateLimitResponse } from './_shared/rateLimit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  const rateLimitResponse = await getRateLimitResponse(event, 'meals-search', 60, 60, corsHeaders)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const query = event.queryStringParameters || {}
    const result = await searchMealsCatalog({
      searchQuery: query.q || query.query || query.s || '',
      category: query.category || query.c || '',
      area: query.area || query.a || '',
      isRandom: query.random === 'true' || query.random === '1',
      pageNum: parseInt(String(query.page || 1), 10) || 1,
      limitNum: parseInt(String(query.limit || 24), 10) || 24
    })

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    }
  } catch (err: any) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: err?.message || 'SERVER_ERROR',
        meals: [],
        pagination: { page: 1, limit: 24, total: 0, totalPages: 1, hasNext: false, hasPrev: false }
      })
    }
  }
}

