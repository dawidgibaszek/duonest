import { lookupMealById } from '../../server/utils/meals'

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

  try {
    const query = event.queryStringParameters || {}
    const id = String(query.id || query.i || '').trim()

    const result = await lookupMealById(id)
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
        meal: null
      })
    }
  }
}

