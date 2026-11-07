import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../server/utils/tmdb'
import { getRateLimitResponse } from './_shared/rateLimit'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-TMDB-API-Key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  const rateLimitResponse = await getRateLimitResponse(event, 'movies-search', 40, 60, corsHeaders)
  if (rateLimitResponse) return rateLimitResponse

  const query = event.queryStringParameters || {}
  const searchQuery = String(query.q || query.query || '').trim().slice(0, 80)
  const requestedType = String(query.type || 'all').toLowerCase()
  const filterType = ['all', 'movie', 'tv', 'anime'].includes(requestedType) ? requestedType : 'all'
  const requestApiKey = Object.entries(event.headers || {}).find(([name]) => name.toLowerCase() === 'x-tmdb-api-key')?.[1]

  const apiKey = String(
    requestApiKey ||
    process.env.TMDB_API_KEY ||
    process.env.NUXT_TMDB_API_KEY ||
    process.env.NUXT_PUBLIC_TMDB_API_KEY ||
    ''
  ).trim()

  if (!searchQuery) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, results: [] })
    }
  }

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
    queryParams['query'] = searchQuery

    let endpoint = 'https://api.themoviedb.org/3/search/multi'
    if (filterType === 'movie') {
      endpoint = 'https://api.themoviedb.org/3/search/movie'
    } else if (filterType === 'tv') {
      endpoint = 'https://api.themoviedb.org/3/search/tv'
    } else if (filterType === 'anime') {
      endpoint = 'https://api.themoviedb.org/3/search/multi'
    }

    const url = new URL(endpoint)
    Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v))

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(6000)
    })

    if (!response.ok) {
      if (response.status === 401) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'INVALID_API_KEY',
            message: 'Podany klucz TMDB API jest nieprawidłowy lub wygasł.',
            results: []
          })
        }
      }
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: `HTTP_${response.status}`,
          message: `Błąd TMDB (${response.status}): ${response.statusText}`,
          results: []
        })
      }
    }

    const data = await response.json()
    const rawResults: TmdbRawItem[] = data.results || []

    const validResults = rawResults
      .filter((r) => r.media_type !== 'person' && (r.title || r.name))
      .map((r) => normalizeTmdbItem(r, filterType === 'anime' ? 'anime' : undefined))

    let filteredResults = validResults
    if (filterType === 'anime') {
      const animeOnly = validResults.filter(r => r.media_type === 'anime')
      filteredResults = animeOnly.length > 0
        ? animeOnly
        : validResults.filter(r => r.genres.some(g => g.toLowerCase().includes('animacj') || g.toLowerCase().includes('anime')))
      if (filteredResults.length === 0) {
        filteredResults = validResults
      }
    } else if (filterType === 'movie') {
      filteredResults = validResults.filter(r => r.media_type === 'movie')
    } else if (filterType === 'tv') {
      filteredResults = validResults.filter(r => r.media_type === 'tv')
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        filterType,
        results: filteredResults
      })
    }
  } catch (err: any) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'SERVER_ERROR',
        message: err.message || 'Wystąpił nieoczekiwany błąd podczas wyszukiwania.',
        results: []
      })
    }
  }
}

