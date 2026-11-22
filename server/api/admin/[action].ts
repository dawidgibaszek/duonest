import {
  createError, defineEventHandler, deleteCookie, getCookie, getRequestHeader, getRequestHost,
  getRequestProtocol, getRouterParam, readRawBody, setCookie, setResponseHeader, setResponseStatus
} from 'h3'

const production = 'https://duonestapp.pl'
const devCookie = 'duonest_admin_dev'
const loopbackHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i
const loopbackPeers = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const allowedRequests = new Set([
  'GET/dashboard', 'GET/ios-settings', 'GET/analytics', 'GET/analytics-live', 'GET/history',
  'PUT/ios-settings', 'POST/session', 'DELETE/session'
])

export default defineEventHandler(async event => {
  const action = getRouterParam(event, 'action')
  const method = event.method
  const host = getRequestHost(event, { xForwardedHost: false })
  // Nitro's dev proxy forwards the peer address when it uses a Unix socket.
  const peer = event.node.req.socket.remoteAddress ?? getRequestHeader(event, 'x-forwarded-for')
  if (!import.meta.dev || !loopbackHost.test(host) || !loopbackPeers.has(peer ?? '') ||
    !allowedRequests.has(`${method}/${action}`)) throw createError({ statusCode: 404 })

  const protocol = getRequestProtocol(event, { xForwardedProto: false })
  const origin = getRequestHeader(event, 'origin')
  const localOrigin = `${protocol}://${host}`
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  if (origin ? origin !== localOrigin : method !== 'GET') {
    throw createError({ statusCode: 403 })
  }

  // Forward only credentials for this panel. The production API still verifies roles and sessions.
  const headers = new Headers({ Origin: production })
  if (method === 'POST' && action === 'session') {
    const authorization = getRequestHeader(event, 'authorization')
    if (authorization) headers.set('Authorization', authorization)
  }
  const session = getCookie(event, devCookie)
  if (session && session.length <= 4096 && /^[A-Za-z0-9_.-]+$/.test(session)) {
    headers.set('Cookie', '__session=' + session)
  }

  let body: string | undefined
  if (method === 'PUT') {
    body = await readRawBody(event)
    if (!body || Buffer.byteLength(body) > 4096) throw createError({ statusCode: 400 })
    headers.set('Content-Type', 'application/json')
  }

  let upstream: Response
  try {
    const search = new URLSearchParams()
    const incoming = new URL(event.path, localOrigin)
    if (action === 'analytics' || action === 'analytics-live') {
      for (const key of (action === 'analytics' ? ['days', 'platform', 'version', 'mode'] : ['platform'])) {
        const value = incoming.searchParams.get(key)
        if (value !== null) search.set(key, value)
      }
    }
    const url = new URL(`/api/admin/${action}`, production)
    url.search = search.toString()
    upstream = await fetch(url, {
      method, headers, body, redirect: 'error', signal: AbortSignal.timeout(action === 'analytics' ? 20_000 : 10_000)
    })
  } catch {
    throw createError({ statusCode: 502 })
  }

  const cookieOptions = { httpOnly: true, secure: protocol === 'https', sameSite: 'strict', path: '/api/admin' } as const
  if (action === 'session' && upstream.ok) {
    if (method === 'DELETE') {
      deleteCookie(event, devCookie, cookieOptions)
    } else {
      const cookie = upstream.headers.get('set-cookie') ?? ''
      const token = cookie.match(/^__session=([A-Za-z0-9_.-]{1,4096});/i)?.[1]
      const maxAge = Number(cookie.match(/;\s*Max-Age=(\d+)/i)?.[1])
      if (!token || !Number.isSafeInteger(maxAge) || maxAge < 1) throw createError({ statusCode: 502 })
      setCookie(event, devCookie, token, { ...cookieOptions, maxAge })
    }
  }

  setResponseStatus(event, upstream.status)
  if (upstream.status === 204) return
  setResponseHeader(event, 'Content-Type', upstream.headers.get('content-type') ?? 'application/json')
  return await upstream.text()
})
