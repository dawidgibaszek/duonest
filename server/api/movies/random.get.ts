import { defineEventHandler, getQuery } from 'h3'
import { normalizeTmdbItem, getTmdbHeadersAndParams, TmdbRawItem } from '../../utils/tmdb'

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
  const query = getQuery(event)
  const requestedType = String(query.type || 'all').toLowerCase()
  const requestedGenre = String(query.genre || 'all').toLowerCase()
  const minRating = Number(query.minRating || 0)
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
      message: 'Brak klucza TMDB API. Wprowadź klucz w .env lub ustawieniach aplikacji.'
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
    const genreInfo = GENRE_MAP[requestedGenre] || {}

    if (targetType === 'anime') {
      endpoint = 'https://api.themoviedb.org/3/discover/tv'
      queryParams['with_original_language'] = 'ja'
      const animeGenres = [16]
      if (genreInfo.tv && genreInfo.tv !== 16) {
        animeGenres.push(genreInfo.tv)
      } else if (genreInfo.movie && genreInfo.movie !== 16) {
        animeGenres.push(genreInfo.movie)
      }
      queryParams['with_genres'] = animeGenres.join(',')
      queryParams['vote_count.gte'] = '25'
    } else if (targetType === 'tv') {
      endpoint = 'https://api.themoviedb.org/3/discover/tv'
      if (genreInfo.tv) {
        queryParams['with_genres'] = String(genreInfo.tv)
      }
      queryParams['vote_count.gte'] = '40'
    } else {
      endpoint = 'https://api.themoviedb.org/3/discover/movie'
      if (genreInfo.movie) {
        queryParams['with_genres'] = String(genreInfo.movie)
      }
      queryParams['vote_count.gte'] = '60'
    }

    if (minRating > 0) {
      queryParams['vote_average.gte'] = String(minRating)
    }

    // Sort order: popularity or vote_average
    queryParams['sort_by'] = Math.random() > 0.35 ? 'popularity.desc' : 'vote_average.desc'

    // Choose random page between 1 and 6 for variety
    const randomPage = Math.floor(Math.random() * 5) + 1
    queryParams['page'] = String(randomPage)

    const fetchPage = async (pageNumber: number) => {
      const url = new URL(endpoint)
      Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v))
      url.searchParams.set('page', String(pageNumber))

      const resp = await fetch(url.toString(), { method: 'GET', headers })
      if (!resp.ok) return null
      return await resp.json()
    }

    let data = await fetchPage(randomPage)
    if (!data?.results || data.results.length === 0) {
      // Fallback to page 1
      data = await fetchPage(1)
    }

    const rawResults: TmdbRawItem[] = data?.results || []
    if (rawResults.length === 0) {
      return {
        success: false,
        error: 'NO_RESULTS',
        message: 'Nie znaleziono filmów spełniających te kryteria w bazie TMDB. Spróbuj poluzować filtry (np. mniejsza ocena lub dowolny gatunek).'
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
    return {
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'Wystąpił nieoczekiwany błąd podczas losowania z TMDB.'
    }
  }
})

