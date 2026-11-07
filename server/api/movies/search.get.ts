import { defineEventHandler, getQuery, getHeader, createError } from 'h3'
import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../utils/tmdb'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rl = await checkRateLimit(event, { maxRequests: 40, windowMs: 60_000, keyPrefix: 'movie_search' })
  if (!rl.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele zapytań wyszukiwania. Spróbuj ponownie za chwilę.'
    })
  }

  const query = getQuery(event)
  const searchQuery = String(query.q || query.query || '').trim().slice(0, 80)
  const filterType = String(query.type || 'all').toLowerCase().slice(0, 10)
  const runtimeConfig = useRuntimeConfig()
  const requestApiKey = getHeader(event, 'x-tmdb-api-key')

  // Use only server-side configured API key (Zero Trust: do not trust incoming query parameters for sensitive API credentials)
  const apiKey = String(
    requestApiKey ||
    runtimeConfig.tmdbApiKey ||
    process.env.TMDB_API_KEY ||
    ''
  ).trim()

  if (!searchQuery) {
    return { success: true, results: [] }
  }

  if (!apiKey) {
    return {
      success: false,
      error: 'NO_API_KEY',
      message: 'Brak skonfigurowanego klucza TMDB API na serwerze.',
      results: []
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
          success: false,
          error: 'INVALID_API_KEY',
          message: 'Klucz TMDB API jest nieprawidłowy lub wygasł.',
          results: []
        }
      }
      return {
        success: false,
        error: `HTTP_${response.status}`,
        message: 'Błąd połączenia z bazą filmów. Spróbuj ponownie później.',
        results: []
      }
    }

    const data = await response.json()
    const rawResults: TmdbRawItem[] = Array.isArray(data.results) ? data.results : []

    // Filter out person results from multi-search and normalize
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
      success: true,
      filterType,
      results: filteredResults
    }
  } catch (err: any) {
    console.error('[Movies Search Error]:', err?.message || err)
    return {
      success: false,
      error: 'SEARCH_FAILED',
      message: 'Nie udało się połączyć z bazą filmów. Sprawdź połączenie z internetem.',
      results: []
    }
  }
})
