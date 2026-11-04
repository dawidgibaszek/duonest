import { defineEventHandler, getQuery } from 'h3'
import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../utils/tmdb'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const runtimeConfig = useRuntimeConfig()
  const apiKey = String(query.apiKey || runtimeConfig.tmdbApiKey || runtimeConfig.public.tmdbApiKey || process.env.TMDB_API_KEY || '').trim()

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
    const url = new URL('https://api.themoviedb.org/3/trending/all/week')
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
      .slice(0, 15)
      .map((r) => normalizeTmdbItem(r))

    return {
      success: true,
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

