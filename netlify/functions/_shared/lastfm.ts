import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from './pushAuth'

export { getSupabaseAdmin } from './pushAuth'

export function lastFmConfig() {
  const apiKey = process.env.LASTFM_API_KEY || ''
  const sharedSecret = process.env.LASTFM_SHARED_SECRET || ''
  if (!apiKey) return null
  return { apiKey, sharedSecret }
}

export function createApiSig(params: Record<string, string>, secret: string): string {
  const keys = Object.keys(params)
    .filter((k) => k !== 'format' && k !== 'callback')
    .sort()

  const signatureBase = keys.map((k) => `${k}${params[k]}`).join('') + secret
  return createHash('md5').update(signatureBase, 'utf8').digest('hex')
}

export function corsHeaders(methods = 'GET, POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': methods,
    'Content-Type': 'application/json'
  }
}

export function response(statusCode: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    body: JSON.stringify(body)
  }
}

export async function exchangeLastFmToken(token: string) {
  const config = lastFmConfig()
  if (!config || !config.sharedSecret) {
    throw new Error('Last.fm API key lub shared secret nie są skonfigurowane w .env')
  }

  const params: Record<string, string> = {
    method: 'auth.getSession',
    api_key: config.apiKey,
    token
  }
  const apiSig = createApiSig(params, config.sharedSecret)

  const url = new URL('https://ws.audioscrobbler.com/2.0/')
  url.searchParams.set('method', 'auth.getSession')
  url.searchParams.set('api_key', config.apiKey)
  url.searchParams.set('token', token)
  url.searchParams.set('api_sig', apiSig)
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Błąd autoryzacji Last.fm (${res.status})`)
  }

  const data = (await res.json()) as any
  if (data?.error || !data?.session?.name) {
    throw new Error(data?.message || 'Nie udało się pobrać sesji Last.fm')
  }

  return {
    username: String(data.session.name),
    sessionKey: String(data.session.key || '')
  }
}

export interface LastFmTrackPlayback {
  isPlaying: boolean
  track: {
    name: string
    artists: string[]
    album: string | null
    albumImageUrl: string | null
    externalUrl: string | null
  }
  fetchedAt: string
}

export async function getLastFmUserPlayback(username: string): Promise<LastFmTrackPlayback | null> {
  const config = lastFmConfig()
  if (!config) return null

  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/')
    url.searchParams.set('method', 'user.getrecenttracks')
    url.searchParams.set('user', username.trim())
    url.searchParams.set('api_key', config.apiKey)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '2')

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const data = (await res.json()) as any
    const rawTrack = data?.recenttracks?.track
    if (!rawTrack) return null

    const trackItem = Array.isArray(rawTrack) ? rawTrack[0] : rawTrack
    if (!trackItem || !trackItem.name) return null

    const isPlaying = trackItem['@attr']?.nowplaying === 'true'
    const name = String(trackItem.name || '').trim()
    const artist = String(trackItem.artist?.['#text'] || trackItem.artist?.name || '').trim()
    const album = String(trackItem.album?.['#text'] || trackItem.album?.name || '').trim() || null

    const images = trackItem.image || []
    const albumImageUrl =
      images.find((img: any) => img.size === 'extralarge')?.['#text'] ||
      images.find((img: any) => img.size === 'large')?.['#text'] ||
      images[images.length - 1]?.['#text'] ||
      null

    // Deep-link to search directly on Spotify (works on mobile app and desktop)
    const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${name} ${artist}`)}`
    const externalUrl = trackItem.url || spotifySearchUrl

    return {
      isPlaying,
      track: {
        name,
        artists: artist ? [artist] : [],
        album,
        albumImageUrl: albumImageUrl && albumImageUrl.startsWith('http') ? albumImageUrl : null,
        externalUrl
      },
      fetchedAt: new Date().toISOString()
    }
  } catch (err) {
    console.error(`[Last.fm] Błąd pobierania utworów dla ${username}:`, err)
    return null
  }
}
