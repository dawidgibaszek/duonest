/**
 * Music activity (Last.fm) – Firestore implementation shared by the Nuxt dev
 * server and the production Cloud Function.
 *
 * NOTE: an identical copy lives in functions/src/musicCore.ts. Keep both in sync.
 *
 * Firestore (server-only collections, Admin SDK):
 *   music_connections/{profileId}  { service_username, session_key?, music_service, updated_at }
 *   music_presence/{profileId}     { partnership_id, is_visible, track, is_playing, progress_ms, duration_ms, fetched_at, updated_at }
 *
 * Env: LASTFM_API_KEY, LASTFM_SHARED_SECRET (the latter only for the OAuth flow).
 */
import { createHash } from 'crypto'

type Db = any

export interface MusicCaller {
  id: string
  partnership_id: string | null
}

export interface MusicResult {
  status: number
  body: any
}

const VALID_SERVICES = ['spotify', 'apple_music', 'youtube_music', 'tidal', 'lastfm']
const DEFAULT_DURATION = 210_000
const SITE_ORIGIN = 'https://duonestapp.pl'

const ok = (body: any): MusicResult => ({ status: 200, body })
const fail = (status: number, error: string, extra: Record<string, any> = {}): MusicResult => ({
  status,
  body: { success: false, error, ...extra }
})

// -----------------------------------------------------------------------------
// Last.fm API
// -----------------------------------------------------------------------------
function lastFmConfig() {
  const apiKey = process.env.LASTFM_API_KEY || ''
  const sharedSecret = process.env.LASTFM_SHARED_SECRET || ''
  if (!apiKey) return null
  return { apiKey, sharedSecret }
}

const NOT_CONFIGURED = 'Integracja Last.fm nie jest skonfigurowana na serwerze'

function lastFmUrl(params: Record<string, string>) {
  const url = new URL('https://ws.audioscrobbler.com/2.0/')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('format', 'json')
  return url.toString()
}

function createApiSig(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('') + secret
  return createHash('md5').update(base, 'utf8').digest('hex')
}

async function exchangeLastFmToken(token: string) {
  const config = lastFmConfig()
  if (!config || !config.sharedSecret) throw new Error(NOT_CONFIGURED)

  const params = { method: 'auth.getSession', api_key: config.apiKey, token }
  const res = await fetch(lastFmUrl({ ...params, api_sig: createApiSig(params, config.sharedSecret) }))
  if (!res.ok) throw new Error(`Błąd autoryzacji Last.fm (${res.status})`)
  const data: any = await res.json()
  if (data?.error || !data?.session?.name) throw new Error(data?.message || 'Nie udało się pobrać sesji Last.fm')
  return { username: String(data.session.name), sessionKey: String(data.session.key || '') }
}

async function getTrackDuration(artist: string, trackName: string, apiKey: string): Promise<number> {
  try {
    const res = await fetch(lastFmUrl({ method: 'track.getinfo', artist, track: trackName, api_key: apiKey }))
    if (res.ok) {
      const dur = Number(((await res.json()) as any)?.track?.duration)
      if (!isNaN(dur) && dur > 10_000) return dur
    }
  } catch {}
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${trackName}`)}&entity=song&limit=1`)
    if (res.ok) {
      const dur = Number(((await res.json()) as any)?.results?.[0]?.trackTimeMillis)
      if (!isNaN(dur) && dur > 10_000) return dur
    }
  } catch {}
  return DEFAULT_DURATION
}

interface LivePlayback {
  isPlaying: boolean
  durationMs: number
  prevTrackEndedAtMs: number | null
  track: {
    name: string
    artists: string[]
    album: string | null
    albumImageUrl: string | null
    externalUrl: string | null
  }
  fetchedAt: string
}

async function getLastFmUserPlayback(username: string): Promise<LivePlayback | null> {
  const config = lastFmConfig()
  if (!config) return null
  try {
    const res = await fetch(lastFmUrl({ method: 'user.getrecenttracks', user: username.trim(), api_key: config.apiKey, limit: '2' }))
    if (!res.ok) return null
    const raw = ((await res.json()) as any)?.recenttracks?.track
    if (!raw) return null
    const tracks = Array.isArray(raw) ? raw : [raw]
    const item = tracks[0]
    if (!item?.name) return null

    const isPlaying = item['@attr']?.nowplaying === 'true'
    const name = String(item.name || '').trim()
    const artist = String(item.artist?.['#text'] || item.artist?.name || '').trim()
    const album = String(item.album?.['#text'] || item.album?.name || '').trim() || null

    let prevTrackEndedAtMs: number | null = null
    if (isPlaying && tracks[1]?.date?.uts) {
      const uts = Number(tracks[1].date.uts)
      if (!isNaN(uts) && uts > 0) prevTrackEndedAtMs = uts * 1000
    }

    const images = item.image || []
    const albumImageUrl =
      images.find((img: any) => img.size === 'extralarge')?.['#text'] ||
      images.find((img: any) => img.size === 'large')?.['#text'] ||
      images[images.length - 1]?.['#text'] ||
      null

    return {
      isPlaying,
      durationMs: await getTrackDuration(artist, name, config.apiKey),
      prevTrackEndedAtMs,
      track: {
        name,
        artists: artist ? [artist] : [],
        album,
        albumImageUrl: albumImageUrl && String(albumImageUrl).startsWith('http') ? albumImageUrl : null,
        externalUrl: item.url || `https://open.spotify.com/search/${encodeURIComponent(`${name} ${artist}`)}`
      },
      fetchedAt: new Date().toISOString()
    }
  } catch (err) {
    console.error(`[Last.fm] Błąd pobierania utworów dla ${username}:`, err)
    return null
  }
}

function serviceSearchUrl(service: string, trackName: string, artistName: string, fallbackUrl: string | null) {
  const q = encodeURIComponent(`${trackName} ${artistName}`)
  switch (service) {
    case 'apple_music': return `https://music.apple.com/search?term=${q}`
    case 'youtube_music': return `https://music.youtube.com/search?q=${q}`
    case 'tidal': return `https://listen.tidal.com/search?q=${q}`
    case 'lastfm': return fallbackUrl || `https://www.last.fm/search?q=${q}`
    default: return `https://open.spotify.com/search/${q}`
  }
}

function frontendPlayback(playback: any, service = 'spotify') {
  if (!playback) return null
  return {
    is_playing: Boolean(playback.isPlaying),
    track_name: playback.track?.name || '',
    artist_name: Array.isArray(playback.track?.artists) ? playback.track.artists.join(', ') : (playback.track?.artists || ''),
    album_name: playback.track?.album || null,
    album_image_url: playback.track?.albumImageUrl || null,
    track_url: playback.track?.externalUrl || null,
    progress_ms: typeof playback.progressMs === 'number' ? playback.progressMs : 0,
    duration_ms: typeof playback.durationMs === 'number' && playback.durationMs > 0 ? playback.durationMs : DEFAULT_DURATION,
    started_at: playback.track?.started_at || null,
    updated_at: playback.fetchedAt || new Date().toISOString(),
    music_service: playback.music_service || playback.track?.music_service || service || 'spotify'
  }
}

// -----------------------------------------------------------------------------
// Firestore helpers
// -----------------------------------------------------------------------------
const connRef = (db: Db, profileId: string) => db.collection('music_connections').doc(profileId)
const presenceRef = (db: Db, profileId: string) => db.collection('music_presence').doc(profileId)
const nowIso = () => new Date().toISOString()

async function saveConnection(db: Db, me: MusicCaller, username: string, sessionKey?: string) {
  const prev = (await connRef(db, me.id).get()).data()
  await connRef(db, me.id).set({
    service_username: username,
    ...(sessionKey ? { session_key: sessionKey } : {}),
    music_service: prev?.music_service || 'spotify',
    updated_at: nowIso()
  }, { merge: true })
  await presenceRef(db, me.id).set({
    partnership_id: me.partnership_id || null,
    is_visible: true,
    updated_at: nowIso()
  }, { merge: true })
}

async function resolvePartnerProfileId(db: Db, me: MusicCaller): Promise<string | null> {
  if (!me.partnership_id) return null
  const snap = await db.collection('partnerships').doc(me.partnership_id).get()
  const d = snap.data()
  if (!d) return null
  if (d.partner1_id === me.id) return d.partner2_id || null
  if (d.partner2_id === me.id) return d.partner1_id || null
  return null
}

async function fetchUserMusic(db: Db, profileId: string, partnershipId: string | null) {
  const [connSnap, presenceSnap] = await Promise.all([connRef(db, profileId).get(), presenceRef(db, profileId).get()])
  const connection = connSnap.data()
  const presence: any = presenceSnap.data() || null

  const username = String(connection?.service_username || '').trim() || null
  const isVisible = presence ? presence.is_visible !== false : true
  const musicService = connection?.music_service || presence?.track?.music_service || 'spotify'

  if (!username) {
    return { connected: false, username: null, service: musicService, visible: isVisible, playback: null }
  }

  const live = await getLastFmUserPlayback(username)
  if (live) {
    const durationMs = live.durationMs || DEFAULT_DURATION
    const isSameTrack = presence?.track?.name === live.track.name
    const now = Date.now()
    let progressMs = 0
    let startedAt = now

    if (live.isPlaying) {
      const existingStart = Number(presence?.track?.started_at)
      if (isSameTrack && existingStart > 0 && now - existingStart < durationMs * 2) {
        startedAt = existingStart
        progressMs = Math.max(0, now - startedAt) % durationMs
      } else if (!isSameTrack && live.prevTrackEndedAtMs && now - live.prevTrackEndedAtMs > 0 && now - live.prevTrackEndedAtMs < durationMs) {
        // Current track started when the previous scrobble ended
        startedAt = live.prevTrackEndedAtMs
        progressMs = now - startedAt
      } else if (isSameTrack && typeof presence?.progress_ms === 'number' && presence?.fetched_at) {
        const elapsed = Math.max(0, now - new Date(presence.fetched_at).getTime())
        progressMs = (presence.progress_ms + elapsed) % durationMs
        startedAt = now - progressMs
      }
    } else {
      progressMs = isSameTrack && typeof presence?.progress_ms === 'number' ? presence.progress_ms : 0
      startedAt = now - progressMs
    }

    const track = {
      ...live.track,
      started_at: startedAt,
      music_service: musicService,
      externalUrl: serviceSearchUrl(musicService, live.track.name, live.track.artists[0] || '', live.track.externalUrl)
    }

    const changed = live.track.name !== presence?.track?.name || live.isPlaying !== presence?.is_playing
    const stale = !presence?.fetched_at || now - new Date(presence.fetched_at).getTime() > 10_000
    if (changed || stale) {
      await presenceRef(db, profileId).set({
        partnership_id: partnershipId,
        is_visible: isVisible,
        track,
        is_playing: live.isPlaying,
        progress_ms: progressMs,
        duration_ms: durationMs,
        fetched_at: live.fetchedAt,
        updated_at: live.fetchedAt
      }, { merge: true }).catch((err) => console.warn('[music] presence write failed:', err?.message))
    }

    return {
      connected: true,
      username,
      service: musicService,
      visible: isVisible,
      playback: { ...live, progressMs, durationMs, track, music_service: musicService }
    }
  }

  // Last.fm unreachable – fall back to the cached presence
  const cachedPlayback = presence?.track
    ? {
        track: { ...presence.track, music_service: musicService },
        isPlaying: Boolean(presence.is_playing),
        progressMs: presence.progress_ms || 0,
        durationMs: presence.duration_ms || DEFAULT_DURATION,
        fetchedAt: presence.fetched_at || nowIso(),
        music_service: musicService
      }
    : null

  return { connected: true, username, service: musicService, visible: isVisible, playback: cachedPlayback }
}

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
async function status(db: Db, me: MusicCaller): Promise<MusicResult> {
  const partnerId = await resolvePartnerProfileId(db, me)
  const [mine, partner] = await Promise.all([
    fetchUserMusic(db, me.id, me.partnership_id),
    partnerId ? fetchUserMusic(db, partnerId, me.partnership_id) : Promise.resolve(null)
  ])
  const partnerPlayback = partner && partner.visible !== false ? partner.playback : null

  return ok({
    success: true,
    connected: mine.connected,
    visible: mine.visible,
    playback: mine.playback,
    partnerPlayback,
    connection: {
      connected: mine.connected,
      display_name: mine.username,
      visible_to_partner: mine.visible,
      music_service: mine.service || 'spotify',
      service: mine.service || 'spotify'
    },
    my_playback: frontendPlayback(mine.playback, mine.service),
    partner_playback: frontendPlayback(partnerPlayback, partner?.service)
  })
}

/** Builds the Last.fm login URL; the callback lands on the web app (Last.fm only allows http(s) callbacks). */
function start(origin: string | undefined): MusicResult {
  const config = lastFmConfig()
  if (!config) return fail(503, NOT_CONFIGURED)
  const base = origin && /^https?:\/\//i.test(origin) ? origin : SITE_ORIGIN
  const authUrl = new URL('https://www.last.fm/api/auth/')
  authUrl.searchParams.set('api_key', config.apiKey)
  authUrl.searchParams.set('cb', new URL('/auth/lastfm/callback', base).toString())
  return ok({ authorization_url: authUrl.toString() })
}

async function connect(db: Db, me: MusicCaller, body: any): Promise<MusicResult> {
  const config = lastFmConfig()
  if (!config) return fail(503, NOT_CONFIGURED)

  const username = String(body?.username || '').trim()
  if (!username || username.length > 64) return fail(400, 'Podaj poprawny login Last.fm')

  try {
    const res = await fetch(lastFmUrl({ method: 'user.getinfo', user: username, api_key: config.apiKey }))
    if (res.status === 404) return fail(404, `Użytkownik "${username}" nie istnieje na Last.fm`)
  } catch {
    // network hiccup – accept the username anyway
  }

  await saveConnection(db, me, username)
  return ok({ success: true, username, playback: await getLastFmUserPlayback(username) })
}

async function callback(db: Db, me: MusicCaller, body: any): Promise<MusicResult> {
  const token = String(body?.token || '').trim()
  if (!token) return fail(400, 'Brak tokenu autoryzacji')
  try {
    const session = await exchangeLastFmToken(token)
    await saveConnection(db, me, session.username, session.sessionKey)
    return ok({ success: true, username: session.username })
  } catch (err: any) {
    console.error('[lastfm callback] token exchange failed:', err)
    return fail(500, err?.message || 'Nie udało się zweryfikować tokenu z Last.fm')
  }
}

async function disconnect(db: Db, me: MusicCaller): Promise<MusicResult> {
  await Promise.allSettled([
    connRef(db, me.id).delete(),
    presenceRef(db, me.id).set({
      track: null,
      is_playing: false,
      progress_ms: 0,
      duration_ms: 0,
      updated_at: nowIso()
    }, { merge: true })
  ])
  return ok({ success: true, connected: false })
}

async function visibility(db: Db, me: MusicCaller, body: any): Promise<MusicResult> {
  const visible = body?.visible_to_partner ?? body?.visible
  if (typeof visible !== 'boolean') return fail(400, 'Pole visible_to_partner musi być boolean')
  await presenceRef(db, me.id).set({
    partnership_id: me.partnership_id || null,
    is_visible: visible,
    updated_at: nowIso()
  }, { merge: true })
  return ok({ success: true, visible_to_partner: visible })
}

async function setService(db: Db, me: MusicCaller, body: any): Promise<MusicResult> {
  const raw = String(body?.service || body?.music_service || '').toLowerCase().trim()
  const service = VALID_SERVICES.includes(raw) ? raw : 'spotify'

  const conn = await connRef(db, me.id).get()
  if (conn.exists) await connRef(db, me.id).set({ music_service: service, updated_at: nowIso() }, { merge: true })

  const presence = (await presenceRef(db, me.id).get()).data()
  if (presence?.track) {
    await presenceRef(db, me.id).set({ track: { ...presence.track, music_service: service }, updated_at: nowIso() }, { merge: true })
  }
  return ok({ success: true, service })
}

const GET_ACTIONS = new Set(['status', 'playback', 'current-playback', 'start'])
const POST_ACTIONS = new Set(['connect', 'callback', 'disconnect', 'visibility', 'service'])

/** Is this a known action? Lets the caller answer 404 before authenticating. */
export function isMusicAction(group: string, action: string) {
  if (group === 'spotify') return ['status', 'playback', 'current-playback', 'disconnect', 'visibility'].includes(action)
  return GET_ACTIONS.has(action) || POST_ACTIONS.has(action)
}

/**
 * Dispatches /api/{lastfm|music|spotify}/{action}. `spotify/*` is the legacy
 * alias – the app only uses it for disconnect / visibility, which are shared.
 */
export async function handleMusicAction(
  db: Db,
  me: MusicCaller,
  group: string,
  action: string,
  method: string,
  body: any,
  origin?: string
): Promise<MusicResult> {
  if (!isMusicAction(group, action)) return fail(404, 'Music endpoint not found')
  const m = method.toUpperCase()
  if (GET_ACTIONS.has(action) && m !== 'GET') return fail(405, 'Method not allowed')
  if (POST_ACTIONS.has(action) && m !== 'POST') return fail(405, 'Method not allowed')

  switch (action) {
    case 'status':
    case 'playback':
    case 'current-playback':
      return status(db, me)
    case 'start':
      return start(origin)
    case 'connect':
      return connect(db, me, body)
    case 'callback':
      return callback(db, me, body)
    case 'disconnect':
      return disconnect(db, me)
    case 'visibility':
      return visibility(db, me, body)
    case 'service':
      return setService(db, me, body)
  }
  return fail(404, 'Music endpoint not found')
}
