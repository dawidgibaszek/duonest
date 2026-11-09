import { createHash, randomBytes } from 'node:crypto'
import { getSupabaseAdmin } from './pushAuth'

export { getSupabaseAdmin } from './pushAuth'

export const spotifyScopes = ['user-read-currently-playing', 'user-read-playback-state']

export function spotifyConfig() {
  const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret, SPOTIFY_REDIRECT_URI: redirectUri } = process.env
  if (!clientId || !clientSecret || !redirectUri) return null
  return { clientId, clientSecret, redirectUri }
}

export function spotifyServerConfig() {
  const config = spotifyConfig()
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!config || !supabaseServiceRoleKey) return null
  return { ...config, supabaseServiceRoleKey }
}

export function base64Url(value: Buffer) {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createOAuthState() {
  const state = base64Url(randomBytes(32))
  const verifier = base64Url(randomBytes(48))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  return { state, verifier, challenge }
}

export function response(statusCode: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    body: JSON.stringify(body)
  }
}

export function corsHeaders(methods = 'GET, POST, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': methods,
    'Content-Type': 'application/json'
  }
}

export async function exchangeSpotifyToken(params: Record<string, string>) {
  const config = spotifyConfig()
  if (!config) throw new Error('Spotify integration is not configured')
  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ ...params, client_id: config.clientId }).toString()
  })
  if (!result.ok) throw new Error('Spotify token exchange failed')
  return result.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope?: string }>
}

export async function getSpotifyAccessToken(profileId: string) {
  const supabase = getSupabaseAdmin()
  const { data: connection, error } = await supabase
    .from('spotify_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error || !connection) return null

  if (new Date(connection.expires_at).getTime() > Date.now() + 60_000) {
    return connection.access_token as string
  }

  try {
    const token = await exchangeSpotifyToken({ grant_type: 'refresh_token', refresh_token: connection.refresh_token })
    await supabase.from('spotify_connections').update({
      access_token: token.access_token,
      expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('profile_id', profileId)
    return token.access_token
  } catch {
    return null
  }
}

export function publicTrack(item: any) {
  if (!item) return null
  return {
    id: item.id || null,
    name: item.name || null,
    artists: Array.isArray(item.artists) ? item.artists.map((artist: any) => artist.name).filter(Boolean) : [],
    album: item.album?.name || null,
    albumImageUrl: item.album?.images?.[0]?.url || null,
    uri: item.uri || null,
    externalUrl: item.external_urls?.spotify || null
  }
}
