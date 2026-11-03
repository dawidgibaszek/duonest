import { processScrape } from '../../server/utils/wishlistScraper'

// Netlify Functions Handler
export const handler = async (event: any) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  try {
    let urlParam = ''
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      urlParam = body?.url || ''
    } else {
      urlParam = event.queryStringParameters?.url || ''
    }

    const result = await processScrape(urlParam)
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message || 'Server error' })
    }
  }
}
