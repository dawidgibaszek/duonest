import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../server/utils/tmdb'

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

  const query = event.queryStringParameters || {}
  const categoryType = String(query.type || 'all').toLowerCase()

  const apiKey = String(
    query.apiKey ||
    process.env.TMDB_API_KEY ||
    process.env.NUXT_TMDB_API_KEY ||
    process.env.NUXT_PUBLIC_TMDB_API_KEY ||
    ''
  ).trim()

  if (!apiKey) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'NO_API_KEY',
        message: 'Brak klucza TMDB API. Wprowadź klucz w panelu Netlify (TMDB_API_KEY) lub w aplikacji.',
        results: []
      })
    }
  }

  try {
    const { headers, queryParams } = getTmdbHeadersAndParams(apiKey)
    queryParams['include_adult'] = 'false'
    queryParams['language'] = 'pl-PL'

    let endpoint = 'https://api.themoviedb.org/3/trending/all/week'

    if (categoryType === 'movie') {
      endpoint = 'https://api.themoviedb.org/3/trending/movie/week'
    } else if (categoryType === 'tv') {
      endpoint = 'https://api.themoviedb.org/3/trending/tv/week'
    } else if (categoryType === 'anime') {
      endpoint = 'https://api.themoviedb.org/3/discover/tv'
      queryParams['sort_by'] = 'popularity.desc'
      queryParams['with_genres'] = '16'
      queryParams['with_original_language'] = 'ja'
      queryParams['vote_count.gte'] = '20'
    }

    const url = new URL(endpoint)
    Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v))

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: `HTTP_${response.status}`,
          results: []
        })
      }
    }

    const data = await response.json()
    const rawResults: TmdbRawItem[] = data.results || []

    const validResults = rawResults
      .filter((r) => r.media_type !== 'person' && (r.title || r.name))
      .map((r) => normalizeTmdbItem(r, categoryType === 'anime' ? 'anime' : undefined))

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        category: categoryType,
        results: validResults.slice(0, 16)
      })
    }
  } catch (err: any) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'SERVER_ERROR',
        message: err.message || 'Wystąpił nieoczekiwany błąd podczas pobierania trendów.',
        results: []
      })
    }
  }
}

