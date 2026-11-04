import { defineEventHandler, getQuery } from 'h3'
import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../utils/tmdb'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = String(query.q || query.query || '').trim()
  const filterType = String(query.type || 'all').toLowerCase()
  const runtimeConfig = useRuntimeConfig()

  // Use server runtime config or incoming client apiKey
  const apiKey = String(
    query.apiKey ||
    runtimeConfig.tmdbApiKey ||
    runtimeConfig.public.tmdbApiKey ||
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
      message: 'Brak klucza TMDB API. Wprowadź klucz w pliku .env (TMDB_API_KEY) lub w ustawieniach wyszukiwarki.',
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
      // Use multi search to catch both anime movies and anime TV series!
      endpoint = 'https://api.themoviedb.org/3/search/multi'
    }

    const url = new URL(endpoint)
    Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v))

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'INVALID_API_KEY',
          message: 'Podany klucz TMDB API jest nieprawidłowy lub wygasł.',
          results: []
        }
      }
      return {
        success: false,
        error: `HTTP_${response.status}`,
        message: `Błąd TMDB (${response.status}): ${response.statusText}`,
        results: []
      }
    }

    const data = await response.json()
    const rawResults: TmdbRawItem[] = data.results || []

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
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: err.message || 'Nie udało się połączyć z API TMDB.',
      results: []
    }
  }
})
