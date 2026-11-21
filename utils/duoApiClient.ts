import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { getToken, type AppCheck } from 'firebase/app-check'

export const NATIVE_API_ORIGIN = 'https://duonestapp.pl'

export function installDuoApiFetch(appCheck?: AppCheck) {
  const native = Capacitor.isNativePlatform()
  let appInfo: ReturnType<typeof App.getInfo> | undefined
  const originalFetch = window.fetch.bind(window)
  const originalOfetch = globalThis.$fetch

  function apiDestination(input: RequestInfo | URL) {
    const address = input instanceof Request ? input.url : input
    const url = new URL(address, window.location.href)
    if (!url.pathname.startsWith('/api/')) return null

    // Never forward app credentials to a third-party URL or a different port.
    if (url.protocol === window.location.protocol && url.host === window.location.host) {
      return native ? NATIVE_API_ORIGIN + url.pathname + url.search : url.href
    }
    return url.origin === NATIVE_API_ORIGIN ? url.href : null
  }

  async function addHeaders(headers: Headers) {
    if (native) {
      appInfo ??= App.getInfo().catch(error => {
        appInfo = undefined
        throw error
      })
      const info = await appInfo.catch(() => null)
      if (info) {
        headers.set('X-DuoNest-Version', info.version)
        headers.set('X-DuoNest-Build', info.build)
      }
    }
    if (appCheck && !headers.has('X-Firebase-AppCheck')) {
      // Firebase reports and rejects missing attestation once enforcement is enabled.
      const result = await getToken(appCheck).catch(() => null)
      if (result) headers.set('X-Firebase-AppCheck', result.token)
    }
    return headers
  }

  window.fetch = async (input, init) => {
    const destination = apiDestination(input)
    if (!destination) return originalFetch(input, init)

    const request = input instanceof Request ? new Request(destination, input) : destination
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    return originalFetch(request, { ...init, headers: await addHeaders(headers) })
  }

  globalThis.$fetch = originalOfetch.create({
    async onRequest(context) {
      const destination = apiDestination(context.request)
      if (!destination) return

      context.request = context.request instanceof Request ? new Request(destination, context.request) : destination
      const headers = new Headers(context.request instanceof Request ? context.request.headers : undefined)
      new Headers(context.options.headers).forEach((value, key) => headers.set(key, value))
      context.options.headers = await addHeaders(headers)
    }
  })
}
