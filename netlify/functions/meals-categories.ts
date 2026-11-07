import { getMealCategoriesAndAreas } from '../../server/utils/meals'
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

  const rateLimitResponse = await getRateLimitResponse(event, 'meals-categories', 60, 60, corsHeaders)
  if (rateLimitResponse) return rateLimitResponse

  const result = getMealCategoriesAndAreas()
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(result)
  }
}

