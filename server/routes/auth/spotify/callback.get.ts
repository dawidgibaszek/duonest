import { getMethod, getQuery, getRequestHeaders, setResponseHeaders, setResponseStatus } from 'h3'
import { handler as callbackHandler } from '../../../../netlify/functions/spotify-callback'

export default defineEventHandler(async (request) => {
  const result = await callbackHandler({
    httpMethod: getMethod(request),
    headers: getRequestHeaders(request),
    queryStringParameters: getQuery(request)
  })

  if (result?.headers) {
    setResponseHeaders(request, result.headers)
  }
  if (result?.statusCode) {
    setResponseStatus(request, result.statusCode)
  }

  if (result?.statusCode >= 300 && result?.statusCode < 400 && result?.headers?.Location) {
    return sendRedirect(request, result.headers.Location, result.statusCode)
  }

  return result?.body
})

