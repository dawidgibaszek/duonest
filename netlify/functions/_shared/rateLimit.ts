import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { createClient } from '@supabase/supabase-js'

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
  unavailable?: boolean
}

let rateLimitClient: ReturnType<typeof createClient> | null = null

const getRateLimitClient = () => {
  if (rateLimitClient) return rateLimitClient

  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  rateLimitClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return rateLimitClient
}

const getTrustedClientIp = (headers: Record<string, string | undefined> = {}) => {
  const ipHeader = Object.entries(headers).find(([name]) => name.toLowerCase() === 'x-nf-client-connection-ip')?.[1]
  const ip = String(ipHeader || '').trim()
  return isIP(ip) ? ip : 'unknown'
}

export async function getRateLimitResponse(
  event: any,
  scope: string,
  limit: number,
  windowSeconds: number,
  headers: Record<string, string>
) {
  const client = getRateLimitClient()
  if (!client) {
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV !== 'production') {
      return null
    }
    return {
      statusCode: 503,
      headers: { ...headers, 'Cache-Control': 'no-store', 'Retry-After': String(windowSeconds) },
      body: JSON.stringify({ success: false, error: 'RATE_LIMIT_UNAVAILABLE' })
    }
  }

  const ipHash = createHash('sha256').update(getTrustedClientIp(event?.headers)).digest('hex')
  const { data, error } = await client.rpc('consume_api_rate_limit', {
    p_bucket_key: `${scope}:${ipHash}`,
    p_limit: limit,
    p_window_seconds: windowSeconds
  })

  const result = Array.isArray(data) ? data[0] as RateLimitResult | undefined : undefined
  if (error || !result) {
    console.error('[RateLimit] Shared limiter unavailable:', error?.message || 'empty RPC result')
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV !== 'production') {
      return null
    }
    return {
      statusCode: 503,
      headers: { ...headers, 'Cache-Control': 'no-store', 'Retry-After': String(windowSeconds) },
      body: JSON.stringify({ success: false, error: 'RATE_LIMIT_UNAVAILABLE' })
    }
  }

  if (result.allowed) return null

  const retryAfter = Math.max(1, Number(result.retry_after_seconds) || windowSeconds)
  return {
    statusCode: 429,
    headers: { ...headers, 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) },
    body: JSON.stringify({ success: false, error: 'RATE_LIMITED' })
  }
}