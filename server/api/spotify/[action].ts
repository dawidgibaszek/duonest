import { getMethod, getQuery, getRequestHeaders, readBody, setResponseHeaders, setResponseStatus } from 'h3'
import { handler as callbackHandler } from '../../../netlify/functions/spotify-callback'
import { handler as disconnectHandler } from '../../../netlify/functions/spotify-disconnect'
import { handler as playbackHandler } from '../../../netlify/functions/spotify-playback'
import { handler as startHandler } from '../../../netlify/functions/spotify-start'
import { handler as visibilityHandler } from '../../../netlify/functions/spotify-visibility'

const handlers: Record<string, (event: any) => Promise<any>> = {
  callback: callbackHandler,
  disconnect: disconnectHandler,
  playback: playbackHandler,
  start: startHandler,
  status: playbackHandler,
  'current-playback': playbackHandler,
  visibility: visibilityHandler
}

export default defineEventHandler(async (request) => {
  const action = request.context.params?.action || ''
  const spotifyHandler = handlers[action]

  if (!spotifyHandler) {
    setResponseStatus(request, 404)
    return { success: false, error: 'Spotify endpoint not found' }
  }

  const body = ['POST', 'PUT', 'PATCH'].includes(getMethod(request))
    ? await readBody(request)
    : undefined
  const result = await spotifyHandler({
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
