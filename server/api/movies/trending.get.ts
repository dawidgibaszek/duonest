import { defineEventHandler, getQuery } from 'h3'
import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../utils/tmdb'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const categoryType = String(query.type || 'all').toLowerCase()
  const runtimeConfig = useRuntimeConfig()
  const apiKey = String(
    query.apiKey ||
    runtimeConfig.tmdbApiKey ||
    runtimeConfig.public.tmdbApiKey ||
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
      headers
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
