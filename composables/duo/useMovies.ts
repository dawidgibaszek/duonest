import { getFirebaseBridge } from '../useFirebaseBridge'
import { moviesList, currentUser, partnership, isOnlineWithSupabase } from './state'
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
      reviews: payload.reviews || {},
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

    moviesList.value.unshift(newMovie)
    syncMoviesToStorage()

    options.broadcastToPartner('MOVIE_ADD', newMovie)

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('movies').insert(newMovie)
      } catch (err) {
        console.warn('Błąd podczas zapisywania filmu:', err)
      }
    }

    if (statusVal === 'watched') {
      options.triggerToast(`Dodano "${title}" jako obejrzane! 🎉`, { type: 'movies' })
    } else if (statusVal === 'watching') {
      options.triggerToast(`Rozpoczęto seans "${title}"! 🍿`, { type: 'movies' })
    } else {
      options.triggerToast(`Dodano "${title}" do listy do obejrzenia 🎬`, { type: 'movies' })
    }
    return newMovie
  }

  const updateMovie = async (id: string, updates: Partial<MovieItem>): Promise<boolean> => {
    const movie = moviesList.value.find(m => m.id === id)
    if (!movie) return false

    const nowIso = new Date().toISOString()
    const fullUpdates = { ...updates, updated_at: nowIso }
    Object.assign(movie, fullUpdates)
    syncMoviesToStorage()

    options.broadcastToPartner('MOVIE_UPDATE', { id, ...fullUpdates })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('movies').update(fullUpdates).eq('id', id)
      } catch (_) {}
    }

    options.triggerToast('Zaktualizowano film')
    return true
  }

  const updateMovieProgress = async (id: string, seasonOrMinutes: number, episode?: number): Promise<boolean> => {
    const movie = moviesList.value.find(m => m.id === id)
    if (!movie) return false

    const nowIso = new Date().toISOString()
    const updates: Partial<MovieItem> = { updated_at: nowIso }

    if (episode !== undefined) {
      movie.last_watched_season = seasonOrMinutes
      movie.last_watched_episode = episode
      movie.last_watched_at = nowIso
      updates.last_watched_season = seasonOrMinutes
      updates.last_watched_episode = episode
      updates.last_watched_at = nowIso
    } else {
      movie.watch_progress_minutes = seasonOrMinutes
      movie.last_watched_at = nowIso
      updates.watch_progress_minutes = seasonOrMinutes
      updates.last_watched_at = nowIso
    }

    syncMoviesToStorage()
    options.broadcastToPartner('MOVIE_PROGRESS', { id, ...updates })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('movies').update(updates).eq('id', id)
      } catch (_) {}
    }
    return true
  }

  const toggleMovieWatched = async (id: string, targetStatus?: 'planned' | 'watching' | 'watched'): Promise<boolean> => {
    const movie = moviesList.value.find(m => m.id === id)
    if (!movie) return false

    const newStatus: 'planned' | 'watching' | 'watched' = targetStatus || (movie.status === 'watched' ? 'planned' : 'watched')
    const watchedAt = newStatus === 'watched' ? new Date().toISOString() : null
    const nowIso = new Date().toISOString()

    movie.status = newStatus
    movie.watched_at = watchedAt
    movie.updated_at = nowIso
    if (newStatus === 'watching' && !movie.last_watched_season) {
      movie.last_watched_season = 1
      movie.last_watched_episode = 1
    }
    syncMoviesToStorage()

    options.broadcastToPartner('MOVIE_TOGGLE_WATCHED', { id, status: newStatus, watched_at: watchedAt })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('movies').update({
          status: newStatus,
          watched_at: watchedAt,
          last_watched_season: movie.last_watched_season || null,
          last_watched_episode: movie.last_watched_episode || null,
          updated_at: nowIso
        }).eq('id', id)
      } catch (_) {}
    }

    if (newStatus === 'watched') {
      options.triggerToast(`"${movie.title}" oznaczono jako obejrzane! 🎉 Czas na recenzję.`, { type: 'movies', title: 'Filmy & Seriale' })
    } else if (newStatus === 'watching') {
      options.triggerToast(`Zaczęliście seans "${movie.title}"! 🍿`, { type: 'movies', title: 'Filmy & Seriale' })
    } else {
      options.triggerToast(`Przeniesiono "${movie.title}" do planowanych.`, { type: 'movies' })
    }
    return true
  }

  const saveMovieReview = async (id: string, rating: number, comment: string = ''): Promise<boolean> => {
    const movie = moviesList.value.find(m => m.id === id)
    if (!movie) return false

    const myId = currentUser.value?.id
    if (!myId) return false

    if (!movie.reviews) movie.reviews = {}
    const nowIso = new Date().toISOString()
    const reviewData: MovieReview = {
      user_id: myId,
      author_name: currentUser.value?.name || 'Ja',
      rating: Math.max(1, Math.min(10, Math.round(rating))),
      comment: comment.trim() || null,
      reviewed_at: nowIso,
      updated_at: nowIso
    }
    movie.reviews[myId] = reviewData
    movie.updated_at = nowIso
    syncMoviesToStorage()

    options.broadcastToPartner('MOVIE_REVIEW', {
      id,
      userId: myId,
      review: reviewData
    })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('movies').update({ reviews: movie.reviews, updated_at: nowIso }).eq('id', id)
      } catch (_) {}
    }

    options.triggerToast(`Zapisano Twoją recenzję dla "${movie.title}" (${rating}/10 ⭐)!`, { type: 'movies', title: 'Recenzje Filmowe' })
    return true
  }

  const deleteMovie = async (id: string): Promise<boolean> => {
    const idx = moviesList.value.findIndex(m => m.id === id)
    if (idx === -1) return false

    const item = moviesList.value[idx]
    moviesList.value.splice(idx, 1)
    syncMoviesToStorage()

    options.broadcastToPartner('MOVIE_DELETE', { id })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('movies').delete().eq('id', id)
      } catch (err) {
        console.warn('Błąd usuwania filmu:', err)
      }
    }

    options.triggerToast(`Usunięto "${item.title}" z listy filmów.`)
    return true
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

      if (!error && data) {
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
