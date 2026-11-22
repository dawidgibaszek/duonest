import { trackDuoEvent } from '~/composables/useDuoAnalytics'
import { getFirebaseBridge } from '../useFirebaseBridge'
import { moviesList, currentUser, partnership } from './state'
import { saveToStorage, deduplicateMoviesList } from './utils'
import type { MovieItem, MovieReview } from '~/types/duo'

let refreshMoviesInFlight = false

export function useMovies(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncMoviesToStorage = () => {
    moviesList.value = deduplicateMoviesList(moviesList.value)
    saveToStorage('duonest_movies', moviesList.value)
  }

  const addMovie = async (
    movieOrTitle: string | Partial<MovieItem>,
    optionsData: Partial<MovieItem> = {}
  ): Promise<MovieItem | null> => {
    if (!movieOrTitle || !partnership.value?.id) return null

    let title = ''
    let payload: Partial<MovieItem> = {}

    if (typeof movieOrTitle === 'string') {
      title = movieOrTitle.trim()
      payload = { ...optionsData }
    } else if (typeof movieOrTitle === 'object' && movieOrTitle !== null) {
      title = String(movieOrTitle.title || '').trim()
      payload = { ...movieOrTitle, ...optionsData }
    }

    if (!title) return null

    const rawStatus = (payload.status as any) || 'planned'
    const statusVal: 'planned' | 'watching' | 'watched' =
      rawStatus === 'to_watch' ? 'planned' : (rawStatus as 'planned' | 'watching' | 'watched')
    const nowIso = new Date().toISOString()

    const newMovie: MovieItem = {
      id: `movie_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      partnership_id: partnership.value.id,
      title,
      original_title: payload.original_title || null,
      tmdb_id: payload.tmdb_id !== undefined ? payload.tmdb_id : null,
      media_type: payload.media_type || 'movie',
      poster_path: payload.poster_path || payload.poster_url || null,
      backdrop_path: payload.backdrop_path || null,
      release_year: payload.release_year || (payload.year ? String(payload.year) : null),
      genres: payload.genres || (payload.genre ? [payload.genre] : null),
      overview: payload.overview || payload.description || null,
      vote_average: payload.vote_average !== undefined ? payload.vote_average : null,
      status: statusVal,
      target_date: payload.target_date || null,
      added_by: currentUser.value?.id || null,
      watched_at: statusVal === 'watched' ? nowIso : null,
      reviews: {},
      last_watched_season: payload.last_watched_season || (statusVal === 'watching' ? 1 : null),
      last_watched_episode: payload.last_watched_episode || (statusVal === 'watching' ? 1 : null),
      created_at: nowIso,
      updated_at: nowIso,
      // Legacy compatibility:
      year: payload.year || (payload.release_year ? parseInt(payload.release_year, 10) || null : null),
      genre: payload.genre || (payload.genres && payload.genres[0]) || null,
      poster_url: payload.poster_url || payload.poster_path || null,
      description: payload.description || payload.overview || null,
      runtime_minutes: payload.runtime_minutes || null,
      streaming_platform: payload.streaming_platform || null
    }

    const { error } = await getDb().from('movies').insert(newMovie)
    if (error) {
      options.triggerToast('Nie udało się zapisać filmu.', { type: 'warning' })
      return null
    }
    if (partnership.value?.id !== newMovie.partnership_id) return null
    moviesList.value = [newMovie, ...moviesList.value.filter(movie => movie.id !== newMovie.id)]
    syncMoviesToStorage()
    options.broadcastToPartner('MOVIE_ADD', newMovie)

    if (statusVal === 'watched') {
      options.triggerToast(`Dodano "${title}" jako obejrzane! 🎉`, { type: 'movies' })
    } else if (statusVal === 'watching') {
      options.triggerToast(`Rozpoczęto seans "${title}"! 🍿`, { type: 'movies' })
    } else {
      options.triggerToast(`Dodano "${title}" do listy do obejrzenia 🎬`, { type: 'movies' })
    }
    trackDuoEvent('duo_movie_added')
    return newMovie
  }

  const persistMovieUpdate = async (movie: MovieItem, changes: Partial<MovieItem>) => {
    const patch = { ...changes, updated_at: new Date().toISOString() }
    try {
      const { error } = await getDb().from('movies').update(patch).eq('id', movie.id)
      if (error) throw error
      if (partnership.value?.id !== movie.partnership_id) return false
      moviesList.value = moviesList.value.map(row => row.id === movie.id ? { ...row, ...patch } : row)
      syncMoviesToStorage()
      return true
    } catch {
      options.triggerToast('Nie udało się zapisać zmiany filmu.', { type: 'warning' })
      return false
    }
  }

  const updateMovie = async (id: string, updates: Partial<MovieItem>) => {
    const movie = moviesList.value.find(row => row.id === id)
    if (!movie || !(await persistMovieUpdate(movie, updates))) return false
    options.broadcastToPartner('MOVIE_UPDATE', { id, ...updates })
    options.triggerToast('Zaktualizowano film')
    return true
  }

  const updateMovieProgress = async (id: string, seasonOrMinutes: number, episode?: number) => {
    const movie = moviesList.value.find(row => row.id === id)
    if (!movie) return false
    const progress = episode === undefined
      ? { watch_progress_minutes: seasonOrMinutes }
      : { last_watched_season: seasonOrMinutes, last_watched_episode: episode }
    return persistMovieUpdate(movie, { ...progress, last_watched_at: new Date().toISOString() })
  }

  const toggleMovieWatched = async (id: string, targetStatus?: MovieItem['status']) => {
    const movie = moviesList.value.find(row => row.id === id)
    if (!movie) return false
    const status = targetStatus || (movie.status === 'watched' ? 'planned' : 'watched')
    const watched_at = status === 'watched' ? new Date().toISOString() : null
    const patch: Partial<MovieItem> = { status, watched_at }
    if (status === 'watching' && !movie.last_watched_season) {
      patch.last_watched_season = 1
      patch.last_watched_episode = 1
    }
    if (!(await persistMovieUpdate(movie, patch))) return false
    options.broadcastToPartner('MOVIE_TOGGLE_WATCHED', { id, title: movie.title, ...patch })
    options.triggerToast(status === 'watched' ? 'Oznaczono jako obejrzane' : status === 'watching' ? 'Rozpoczęto seans' : 'Przeniesiono do planowanych', { type: 'movies' })
    return true
  }

  const saveMovieReview = async (id: string, rating: number, comment = '') => {
    const movie = moviesList.value.find(row => row.id === id)
    const profileId = currentUser.value.id
    if (!movie || !profileId || !Number.isFinite(rating)) return false
    const updatedAt = new Date().toISOString()
    const review: MovieReview = {
      user_id: profileId,
      author_name: currentUser.value.name || 'Ja',
      rating: Math.max(1, Math.min(10, Math.round(rating))),
      comment: comment.trim().slice(0, 2000) || null,
      reviewed_at: updatedAt,
      updated_at: updatedAt
    }
    try {
      await getDb().saveMovieReview(id, profileId, review, updatedAt)
      if (currentUser.value.id !== profileId || partnership.value?.id !== movie.partnership_id) return false
      const current = moviesList.value.find(row => row.id === id)
      if (current) current.reviews = { ...current.reviews, [profileId]: review }
      syncMoviesToStorage()
      options.triggerToast(`Zapisano Twoją recenzję dla „${movie.title}”`, { type: 'movies' })
      return true
    } catch {
      options.triggerToast('Nie udało się zapisać recenzji.', { type: 'warning' })
      return false
    }
  }

  const deleteMovie = async (id: string) => {
    const pid = partnership.value?.id
    try {
      const { error } = await getDb().from('movies').delete().eq('id', id)
      if (error) throw error
      if (partnership.value?.id !== pid) return false
      moviesList.value = moviesList.value.filter(movie => movie.id !== id)
      syncMoviesToStorage()
      options.triggerToast('Usunięto film z listy')
      return true
    } catch {
      options.triggerToast('Nie udało się usunąć filmu.', { type: 'warning' })
      return false
    }
  }

  const refreshMovies = async () => {
    if (refreshMoviesInFlight) return
    const pId = partnership.value?.id
    const bridge = getDb()
    if (!bridge || !pId) return

    refreshMoviesInFlight = true
    try {
      const { data, error } = await bridge
        .from('movies')
        .select('*')
        .eq('partnership_id', pId)
        .order('created_at', { ascending: false })

      if (!error && data && partnership.value?.id === pId) {
        moviesList.value = deduplicateMoviesList(data)
        syncMoviesToStorage()
      }
    } catch (_) {
    } finally {
      refreshMoviesInFlight = false
    }
  }

  return {
    addMovie,
    updateMovie,
    updateMovieProgress,
    toggleMovieWatched,
    saveMovieReview,
    deleteMovie,
    refreshMovies
  }
}
