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
  if (!event) return '127.0.0.1'
  const req = event.node?.req
  const forwarded = req?.headers ? (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) : null
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : String(forwarded).split(',')[0]
    const clean = raw.trim()
    if (/^[0-9a-fA-F:.]+$/.test(clean) && clean.length <= 45) {
      return clean
    }
  }
  return req?.socket?.remoteAddress || '127.0.0.1'
}

export function checkRateLimit(
  keyOrEvent: string | any,
  limitOrOptions: number | { maxRequests?: number; windowMs?: number; keyPrefix?: string },
  windowMsArg?: number
): { allowed: boolean; remaining: number; resetAt: number } {
  ensureCleanup()
  const now = Date.now()

  let finalKey = 'rl_default'
  let limit = 30
  let windowMs = 60000

  if (typeof keyOrEvent === 'string') {
    finalKey = keyOrEvent
    limit = typeof limitOrOptions === 'number' ? Math.max(1, limitOrOptions) : 30
    windowMs = typeof windowMsArg === 'number' ? Math.max(1000, windowMsArg) : 60000
  } else {
    // Called with (event, options)
    const event = keyOrEvent
    const opts = (typeof limitOrOptions === 'object' && limitOrOptions !== null) ? limitOrOptions : {}
    const prefix = opts.keyPrefix || 'api'
    const ip = getClientIp(event)
    finalKey = `${prefix}:${ip}`
    limit = Math.max(1, opts.maxRequests || 30)
    windowMs = Math.max(1000, opts.windowMs || 60000)
  }

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
