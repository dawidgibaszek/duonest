import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import type { Request, RequestHandler } from 'express'
import type { Firestore } from 'firebase-admin/firestore'

const WINDOW_MS = 60_000
const fallback = new Map<string, { count: number; resetAt: number }>()
let nextCleanup = 0

function clientIp(req: Request) {
  const forwarded = req.get('x-forwarded-for')?.split(',').map(value => value.trim())
  // Google adds the connecting client and its proxy at the end of the chain.
  const address = process.env.FUNCTIONS_EMULATOR === 'true'
    ? req.socket.remoteAddress
    : forwarded?.at(-2) ?? forwarded?.at(-1) ?? req.socket.remoteAddress
  return address && isIP(address) ? address : 'unknown'
}

function countLocally(key: string, limit: number, now: number) {
  if (now >= nextCleanup) {
    for (const [id, bucket] of fallback) {
      if (now >= bucket.resetAt) fallback.delete(id)
    }
    nextCleanup = now + WINDOW_MS
  }
  const previous = fallback.get(key)
  const bucket = previous && now < previous.resetAt ? previous : { count: 0, resetAt: now + WINDOW_MS }
  if (bucket.count >= limit) return bucket.resetAt
  bucket.count++
  fallback.set(key, bucket)
  return 0
}

export function rateLimit(db: Firestore, scope: string, limit: number, message: string): RequestHandler {
  return async (req, res, next) => {
    const uid = (req as Request & { user?: { uid: string } }).user?.uid
    const subject = uid ? `uid:${uid}` : `ip:${clientIp(req)}`
    const key = createHash('sha256').update(`${scope}:${subject}`).digest('hex')
    const now = Date.now()
    let retryAt: number
    try {
      const ref = db.collection('rate_limits').doc(key)
      retryAt = await db.runTransaction(async tx => {
        const data = (await tx.get(ref)).data()
        const resetAt = Number(data?.reset_at) || 0
        if (now >= resetAt) {
          tx.set(ref, { count: 1, reset_at: now + WINDOW_MS, expires_at: new Date(now + WINDOW_MS) })
          return 0
        }
        const count = Number(data?.count) || 0
        if (count >= limit) return resetAt
        tx.update(ref, { count: count + 1 })
        return 0
      })
    } catch (error) {
      console.warn('[RateLimit] Shared limiter unavailable:', (error as { code?: unknown })?.code)
      retryAt = countLocally(key, limit, now)
    }
    if (!retryAt) return next()
    res.set('Retry-After', String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))))
    res.set('Access-Control-Expose-Headers', 'Retry-After')
    return res.status(429).json({ success: false, error: message })
  }
}
