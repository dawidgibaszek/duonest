import { defineEventHandler, getQuery, createError } from 'h3'
import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../utils/tmdb'
import { checkRateLimit } from '../../utils/rateLimit'

const GENRE_MAP: Record<string, { movie?: number; tv?: number }> = {
  all: {},
  action: { movie: 28, tv: 10759 },
  adventure: { movie: 12, tv: 10759 },
  animation: { movie: 16, tv: 16 },
  comedy: { movie: 35, tv: 35 },
  crime: { movie: 80, tv: 80 },
  documentary: { movie: 99, tv: 99 },
  drama: { movie: 18, tv: 18 },
  family: { movie: 10751, tv: 10751 },
  fantasy: { movie: 14, tv: 10765 },
  horror: { movie: 27, tv: 9648 },
  romance: { movie: 10749, tv: 18 },
  scifi: { movie: 878, tv: 10765 },
  thriller: { movie: 53, tv: 9648 }
}

export default defineEventHandler(async (event) => {
  const rl = checkRateLimit(event, { maxRequests: 30, windowMs: 60_000, keyPrefix: 'movie_random' })
  if (!rl.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele zapytań losowania. Spróbuj ponownie za chwilę.'
    })
  }

  const query = getQuery(event)
  const requestedType = String(query.type || 'all').toLowerCase().slice(0, 10)
  const requestedGenre = String(query.genre || 'all').toLowerCase().slice(0, 20)
  const minRatingRaw = parseFloat(String(query.minRating || 0))
  const minRating = isNaN(minRatingRaw) ? 0 : Math.max(0, Math.min(10, minRatingRaw))
  const runtimeConfig = useRuntimeConfig()

  // Use only server-side configured API key (Zero Trust)
  const apiKey = String(
    runtimeConfig.tmdbApiKey ||
    process.env.TMDB_API_KEY ||
    ''
  ).trim()

  if (!apiKey) {
    return {
      success: false,
      error: 'NO_API_KEY',
      message: 'Brak klucza TMDB API na serwerze.'
    }
  }

  try {
    // Decide concrete target type if 'all' was selected
    let targetType: 'movie' | 'tv' | 'anime' = 'movie'
    if (requestedType === 'anime') {
      targetType = 'anime'
    } else if (requestedType === 'tv') {
      targetType = 'tv'
    } else if (requestedType === 'movie') {
      targetType = 'movie'
    } else {
      // 65% movie, 25% tv, 10% anime
      const rand = Math.random()
      if (rand < 0.65) targetType = 'movie'
      else if (rand < 0.90) targetType = 'tv'
      else targetType = 'anime'
    }

    const { headers, queryParams } = getTmdbHeadersAndParams(apiKey)
    queryParams['include_adult'] = 'false'
    queryParams['language'] = 'pl-PL'

    let endpoint = 'https://api.themoviedb.org/3/discover/movie'

    if (targetType === 'anime') {
      endpoint = 'https://api.themoviedb.org/3/discover/tv'
      queryParams['with_genres'] = '16'
      queryParams['with_original_language'] = 'ja'
      queryParams['vote_count.gte'] = '15'
      if (minRating > 0) {
        queryParams['vote_average.gte'] = String(minRating)
      }
      queryParams['sort_by'] = 'popularity.desc'
    } else if (targetType === 'tv') {
      endpoint = 'https://api.themoviedb.org/3/discover/tv'
      queryParams['sort_by'] = 'popularity.desc'
      queryParams['vote_count.gte'] = '20'
      if (minRating > 0) {
        queryParams['vote_average.gte'] = String(minRating)
      }
      if (requestedGenre !== 'all' && GENRE_MAP[requestedGenre]?.tv) {
        queryParams['with_genres'] = String(GENRE_MAP[requestedGenre].tv)
      }
    } else {
      // movie
      endpoint = 'https://api.themoviedb.org/3/discover/movie'
      queryParams['sort_by'] = 'popularity.desc'
      queryParams['vote_count.gte'] = '30'
      if (minRating > 0) {
        queryParams['vote_average.gte'] = String(minRating)
      }
      if (requestedGenre !== 'all' && GENRE_MAP[requestedGenre]?.movie) {
        queryParams['with_genres'] = String(GENRE_MAP[requestedGenre].movie)
      }
    }

    const randomPage = Math.floor(Math.random() * 5) + 1
    queryParams['page'] = String(randomPage)

    const fetchPage = async (pageNumber: number) => {
      const url = new URL(endpoint)
      Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v))
      url.searchParams.set('page', String(pageNumber))

      const resp = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(6000)
      })
      if (!resp.ok) {
        if (resp.status === 401) {
          throw new Error('INVALID_API_KEY')
        }
        if (resp.status === 429) {
          throw new Error('RATE_LIMITED')
        }
        return null
      }
      return await resp.json()
    }

    let data = await fetchPage(randomPage)
    if (!data?.results || data.results.length === 0) {
      // Fallback to page 1
      data = await fetchPage(1)
    }

    const rawResults: TmdbRawItem[] = Array.isArray(data?.results) ? data.results : []
    if (rawResults.length === 0) {
      return {
        success: false,
        error: 'NO_RESULTS',
        message: 'Nie znaleziono filmów spełniających te kryteria w bazie TMDB. Spróbuj poluzować filtry.'
      }
    }

    // Filter items with poster and valid title
    const candidates = rawResults
      .filter(r => (r.title || r.name) && (r.poster_path || r.backdrop_path))
      .map(r => normalizeTmdbItem(r, targetType === 'anime' ? 'anime' : undefined))

    const listToUse = candidates.length > 0 ? candidates : rawResults.map(r => normalizeTmdbItem(r, targetType === 'anime' ? 'anime' : undefined))

    // Shuffle
    for (let i = listToUse.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [listToUse[i], listToUse[j]] = [listToUse[j], listToUse[i]]
    }

    const winner = listToUse[0]
    const pool = listToUse.slice(0, 10)

    return {
      success: true,
      targetType,
      genre: requestedGenre,
      winner,
      pool,
      total_found: listToUse.length
    }
  } catch (err: any) {
    console.error('[Movies Random Error]:', err?.message || err)
    if (err.message === 'INVALID_API_KEY') {
      return {
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Klucz TMDB API jest nieprawidłowy lub wygasł.'
      }
    }
    if (err.message === 'RATE_LIMITED') {
      return {
        success: false,
        error: 'RATE_LIMITED',
        message: 'Przekroczono limit zapytań TMDB API. Odczekaj chwilę.'
      }
    }
    return {
      success: false,
      error: 'SERVER_ERROR',
      message: 'Wystąpił błąd podczas losowania z TMDB. Spróbuj ponownie za chwilę.'
    }
  }
})
