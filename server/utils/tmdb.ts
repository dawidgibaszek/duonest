// TMDB (The Movie Database) Utility for DuoNest
export const TMDB_GENRES: Record<number, string> = {
  28: 'Akcja',
  12: 'Przygodowy',
  16: 'Animacja',
  35: 'Komedia',
  80: 'Kryminał',
  99: 'Dokumentalny',
  18: 'Dramat',
  10751: 'Familijny',
  14: 'Fantasy',
  36: 'Historyczny',
  27: 'Horror',
  10402: 'Muzyczny',
  9648: 'Tajemnica',
  10749: 'Romans',
  878: 'Sci-Fi',
  10770: 'Film TV',
  53: 'Thriller',
  10752: 'Wojenny',
  37: 'Western',
  10759: 'Akcja i Przygoda',
  10762: 'Dla dzieci',
  10763: 'Wiadomości',
  10764: 'Reality Show',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Mydlana opera',
  10767: 'Talk Show',
  10768: 'Wojna i Polityka'
}

export interface TmdbRawItem {
  id: number
  media_type?: string
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
  genre_ids?: number[]
  genres?: Array<{ id: number; name: string }>
  original_language?: string
  origin_country?: string[]
}

export interface TmdbNormalizedItem {
  tmdb_id: number
  title: string
  original_title: string
  media_type: 'movie' | 'tv' | 'anime'
  poster_path: string | null
  backdrop_path: string | null
  release_year: string
  overview: string
  vote_average: number
  genres: string[]
}

export function detectMediaType(item: TmdbRawItem, forcedType?: string): 'movie' | 'tv' | 'anime' {
  if (forcedType === 'anime') return 'anime'
  if (forcedType === 'movie') return 'movie'
  if (forcedType === 'tv') return 'tv'

  const rawType = item.media_type || (item.title ? 'movie' : 'tv')
  const genreIds = item.genre_ids || (item.genres ? item.genres.map(g => g.id) : [])
  const isAnimation = genreIds.includes(16)
  const isJapanese = item.original_language === 'ja' || (item.origin_country && item.origin_country.includes('JP'))

  if (isAnimation && isJapanese) {
    return 'anime'
  }
  return rawType === 'tv' ? 'tv' : 'movie'
}

export function mapGenreIds(genreIds?: number[], rawGenres?: Array<{ id: number; name: string }>): string[] {
  if (rawGenres && rawGenres.length > 0) {
    return rawGenres.map(g => g.name).filter(Boolean)
  }
  if (!genreIds || !Array.isArray(genreIds)) return []
  return genreIds.map(id => TMDB_GENRES[id] || '').filter(Boolean)
}

export function normalizeTmdbItem(item: TmdbRawItem, forcedType?: string): TmdbNormalizedItem {
  const title = (item.title || item.name || 'Bez tytułu').trim()
  const originalTitle = (item.original_title || item.original_name || title).trim()
  const mediaType = detectMediaType(item, forcedType)
  const dateStr = item.release_date || item.first_air_date || ''
  const releaseYear = dateStr ? dateStr.substring(0, 4) : ''
  const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null
  const backdropPath = item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null
  const voteAverage = item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0
  const genres = mapGenreIds(item.genre_ids, item.genres)

  return {
    tmdb_id: item.id,
    title,
    original_title: originalTitle,
    media_type: mediaType,
    poster_path: posterPath,
    backdrop_path: backdropPath,
    release_year: releaseYear,
    overview: (item.overview || '').trim(),
    vote_average: voteAverage,
    genres
  }
}

export function getTmdbHeadersAndParams(apiKey: string) {
  const isBearer = apiKey.startsWith('ey') || apiKey.length > 50
  const headers: Record<string, string> = {
    accept: 'application/json'
  }
  const queryParams: Record<string, string> = {
    language: 'pl-PL'
  }

  if (isBearer) {
    headers['Authorization'] = `Bearer ${apiKey}`
  } else {
    queryParams['api_key'] = apiKey
  }

  return { headers, queryParams }
}

