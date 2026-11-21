import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { getFirebaseAdminDb } from './firebaseAdmin'

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
  // Firebase Hosting → Cloud Functions: the client IP is the first X-Forwarded-For entry
  const forwarded = req?.headers?.['x-forwarded-for']
  const first = String(Array.isArray(forwarded) ? forwarded[0] : forwarded || '').split(',')[0].trim()
  if (first && isIP(first)) return first

  const socketIp = req?.socket?.remoteAddress
  return typeof socketIp === 'string' && isIP(socketIp) ? socketIp : 'unknown'
}

export async function checkRateLimit(
  event: any,
  options: { maxRequests?: number; windowMs?: number; keyPrefix?: string }
): Promise<{ allowed: boolean; remaining: number; resetAt: number; retryAfterSeconds?: number; unavailable?: boolean }> {
  const limit = Math.max(1, Math.min(options.maxRequests || 30, 10000))
  const windowMs = Math.max(1000, Math.min(options.windowMs || 60000, 3600000))
  const prefix = String(options.keyPrefix || 'api').slice(0, 80)
  const clientIp = getClientIp(event)
  const ipHash = createHash('sha256').update(clientIp).digest('hex')
  const bucketKey = `${prefix}:${ipHash}`
  const now = Date.now()

  // Shared limiter backed by Firestore (works across serverless instances).
  try {
    const db = getFirebaseAdminDb()
    const ref = db.collection('rate_limits').doc(createHash('sha256').update(bucketKey).digest('hex'))
    const result = await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref)
      const data = snap.exists ? snap.data() : null
      const resetAt = Number(data?.reset_at) || 0
      if (!data || now > resetAt) {
        tx.set(ref, { count: 1, reset_at: now + windowMs, expires_at: new Date(now + windowMs) })
        return { allowed: true, count: 1, resetAt: now + windowMs }
      }
      const count = Number(data.count) || 0
      if (count >= limit) return { allowed: false, count, resetAt }
      tx.update(ref, { count: count + 1 })
      return { allowed: true, count: count + 1, resetAt }
    })
    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - now) / 1000))
    return {
      allowed: result.allowed,
      remaining: Math.max(0, limit - result.count),
      resetAt: result.resetAt,
      retryAfterSeconds: result.allowed ? undefined : retryAfterSeconds
    }
  } catch (error: any) {
    // Fall back to the per-instance in-memory limiter instead of rejecting everyone.
    console.warn('[RateLimit] Shared limiter unavailable, using in-memory fallback:', error?.message || error)
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
