import { getQuery, getRequestHeaders, sendRedirect } from 'h3'
import { handler as callbackHandler } from '../../../../netlify/functions/lastfm-callback'

export default defineEventHandler(async (event) => {
  const result = await callbackHandler({
    httpMethod: 'GET',
    headers: getRequestHeaders(event),
    queryStringParameters: getQuery(event)
  })

  if (result?.statusCode === 302 && result?.headers?.Location) {
    return sendRedirect(event, result.headers.Location, 302)
  }

  return result?.body || 'Przetwarzanie autoryzacji Last.fm...'
})
