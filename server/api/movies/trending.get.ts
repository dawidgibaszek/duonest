import { defineEventHandler, getQuery, createError } from 'h3'
import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../utils/tmdb'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const rl = checkRateLimit(event, { maxRequests: 40, windowMs: 60_000, keyPrefix: 'movie_trending' })
  if (!rl.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele zapytań o trendy filmowe. Spróbuj ponownie za chwilę.'
    })
  }

  const query = getQuery(event)
  const rawType = String(query.type || 'all').toLowerCase().trim()
  const categoryType = ['all', 'movie', 'tv', 'anime'].includes(rawType) ? rawType : 'all'
  const runtimeConfig = useRuntimeConfig()
  const apiKey = String(
    runtimeConfig.tmdbApiKey ||
    runtimeConfig.public?.tmdbApiKey ||
    process.env.TMDB_API_KEY ||
    ''
  ).trim()

  if (!apiKey) {
    return {
      success: false,
      error: 'NO_API_KEY',
      message: 'Brak klucza TMDB API.',
      results: []
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
      // Use discover/tv with animation & Japanese language for top popular anime
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
      headers,
      signal: AbortSignal.timeout(6000)
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP_${response.status}`,
        results: []
      }
    }

    const data = await response.json()
    const rawResults: TmdbRawItem[] = data.results || []

    const results = rawResults
      .filter((r) => r.media_type !== 'person' && (r.title || r.name))
      .slice(0, 18)
      .map((r) => normalizeTmdbItem(r, categoryType === 'anime' ? 'anime' : (categoryType === 'movie' ? 'movie' : (categoryType === 'tv' ? 'tv' : undefined))))

    return {
      success: true,
      categoryType,
      results
    }
  } catch (err: any) {
    return {
      success: false,
      error: 'NETWORK_ERROR',
      results: []
    }
  }
})
