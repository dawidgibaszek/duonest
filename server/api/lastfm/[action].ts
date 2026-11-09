import { getMethod, getQuery, getRequestHeaders, readBody, setResponseHeaders, setResponseStatus } from 'h3'
import { handler as callbackHandler } from '../../../netlify/functions/lastfm-callback'
import { handler as connectHandler } from '../../../netlify/functions/lastfm-connect'
import { handler as disconnectHandler } from '../../../netlify/functions/lastfm-disconnect'
import { handler as playbackHandler } from '../../../netlify/functions/lastfm-playback'
import { handler as startHandler } from '../../../netlify/functions/lastfm-start'
import { handler as visibilityHandler } from '../../../netlify/functions/lastfm-visibility'

const handlers: Record<string, (event: any) => Promise<any>> = {
  callback: callbackHandler,
  connect: connectHandler,
  disconnect: disconnectHandler,
  playback: playbackHandler,
  start: startHandler,
  status: playbackHandler,
  visibility: visibilityHandler
}

export default defineEventHandler(async (request) => {
  const action = request.context.params?.action || ''
  const lastfmHandler = handlers[action]

  if (!lastfmHandler) {
    setResponseStatus(request, 404)
    return { success: false, error: 'Last.fm endpoint not found' }
  }

  const body = ['POST', 'PUT', 'PATCH'].includes(getMethod(request))
    ? await readBody(request)
    : undefined

  const result = await lastfmHandler({
    httpMethod: getMethod(request),
    headers: getRequestHeaders(request),
    queryStringParameters: getQuery(request),
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  if (result?.headers) {
    setResponseHeaders(request, result.headers)
  }
  if (result?.statusCode) {
    setResponseStatus(request, result.statusCode)
  }

  if (typeof result?.body === 'string') {
    try {
      return JSON.parse(result.body)
    } catch {
      return result.body
    }
  }

  return result?.body || result
})
