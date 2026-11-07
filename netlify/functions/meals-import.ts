import { processRecipeImport } from '../../server/utils/recipeScraper'
import { getRateLimitResponse } from './_shared/rateLimit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  const rateLimitResponse = await getRateLimitResponse(event, 'meals-import', 20, 60, corsHeaders)
  if (rateLimitResponse) return rateLimitResponse

  try {
    let urlParam = ''
    if (event.httpMethod === 'POST') {
      let body: any = {}
      if (typeof event.body === 'string') {
        try {
          body = JSON.parse(event.body)
        } catch (_) {
          body = {}
        }
      } else if (event.body && typeof event.body === 'object') {
        body = event.body
      }
      urlParam = String(body?.url || '').trim()
    } else {
      urlParam = String(event.queryStringParameters?.url || '').trim()
    }

    if (!urlParam) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Wklej poprawny link do przepisu lub TikToka.'
        })
      }
    }

    const result = await processRecipeImport(urlParam)
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
        error: err?.message || 'Wystąpił błąd serwera podczas importu przepisu.'
      })
    }
  }
}

