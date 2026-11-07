import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { getSupabaseServerClient } from './webPush'

// In-memory sliding window rate limiter for API endpoints (OWASP API4:2023 mitigation)
interface RateLimitRecord {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()
let cleanupInterval: any = null

function ensureCleanup() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitMap.entries()) {
      if (!record || isNaN(record.resetAt) || now > record.resetAt) {
        rateLimitMap.delete(key)
      }
    }
  }, 60000)
}

export function getClientIp(event: any): string {
  if (!event) return 'unknown'
  const req = event.node?.req
  const trustedNetlifyIp = req?.headers?.['x-nf-client-connection-ip']
  const clientIp = Array.isArray(trustedNetlifyIp) ? trustedNetlifyIp[0] : trustedNetlifyIp
  if (typeof clientIp === 'string' && isIP(clientIp.trim())) return clientIp.trim()

  const socketIp = req?.socket?.remoteAddress
  return typeof socketIp === 'string' && isIP(socketIp) ? socketIp : 'unknown'
}

export async function checkRateLimit(
  event: any,
  options: { maxRequests?: number; windowMs?: number; keyPrefix?: string }
): Promise<{ allowed: boolean; remaining: number; resetAt: number; retryAfterSeconds?: number; unavailable?: boolean }> {
  const limit = Math.max(1, Math.min(options.maxRequests || 30, 10000))
  const windowMs = Math.max(1000, Math.min(options.windowMs || 60000, 3600000))
  const windowSeconds = Math.ceil(windowMs / 1000)
  const prefix = String(options.keyPrefix || 'api').slice(0, 80)
  const clientIp = getClientIp(event)
  const ipHash = createHash('sha256').update(clientIp).digest('hex')
  const bucketKey = `${prefix}:${ipHash}`
  const now = Date.now()

  try {
    const config = useRuntimeConfig(event)
    const supabase = getSupabaseServerClient(config)
    if (supabase) {
      const { data, error } = await supabase.rpc('consume_api_rate_limit', {
        p_bucket_key: bucketKey,
        p_limit: limit,
        p_window_seconds: windowSeconds
      })
      const result = Array.isArray(data) ? data[0] : null
      if (error || !result) {
        console.error('[RateLimit] Shared limiter unavailable:', error?.message || 'empty RPC result')
        return { allowed: false, remaining: 0, resetAt: now + windowMs, retryAfterSeconds: windowSeconds, unavailable: true }
      }
      return {
        allowed: Boolean(result.allowed),
        remaining: result.allowed ? Math.max(0, limit - 1) : 0,
        resetAt: now + Math.max(1, Number(result.retry_after_seconds) || windowSeconds) * 1000,
        retryAfterSeconds: Math.max(1, Number(result.retry_after_seconds) || windowSeconds)
      }
    }
  } catch (error: any) {
    if (!process.dev) {
      console.error('[RateLimit] Unable to initialize shared limiter:', error?.message || error)
      return { allowed: false, remaining: 0, resetAt: now + windowMs, retryAfterSeconds: windowSeconds, unavailable: true }
    }
  }

  if (!process.dev) {
    return { allowed: false, remaining: 0, resetAt: now + windowMs, retryAfterSeconds: windowSeconds, unavailable: true }
  }

  ensureCleanup()
  const finalKey = `${prefix}:${clientIp}`

  const record = rateLimitMap.get(finalKey)

  if (!record || isNaN(record.resetAt) || now > record.resetAt) {
    rateLimitMap.set(finalKey, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt }
}
