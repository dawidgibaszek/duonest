/**
 * iOS app (Capacitor) runtime adjustments. No-op on the web / PWA.
 *
 * - The app is served from capacitor://localhost, so relative `/api/*` calls
 *   are routed to the production backend (Firebase Hosting → Cloud Function).
 * - Dark status-bar icons (all screens are cream / white).
 * - The native launch screen is hidden once the web app has rendered.
 */
import { Capacitor } from '@capacitor/core'

export const NATIVE_API_ORIGIN = 'https://duonestapp.pl'

export default defineNuxtPlugin({
  name: 'native-app',
  enforce: 'pre',
  setup(nuxtApp) {
    if (!Capacitor.isNativePlatform()) return

    document.documentElement.classList.add('dn-native', `dn-native-${Capacitor.getPlatform()}`)

    // --- API base URL -------------------------------------------------------
    const toBackend = (url: string) => (url.startsWith('/api/') ? NATIVE_API_ORIGIN + url : url)

    const nativeFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string') return nativeFetch(toBackend(input), init)
      if (input instanceof URL) {
        if (input.pathname.startsWith('/api/')) {
          return nativeFetch(NATIVE_API_ORIGIN + input.pathname + input.search, init)
        }
        return nativeFetch(input, init)
      }
      if (input instanceof Request) {
        const requestUrl = new URL(input.url)
        if (requestUrl.pathname.startsWith('/api/')) {
          return nativeFetch(new Request(NATIVE_API_ORIGIN + requestUrl.pathname + requestUrl.search, input), init)
        }
        return nativeFetch(input, init)
      }
      return nativeFetch(input as any, init)
    }

    // $fetch (ofetch) resolves relative URLs against the app origin – give it the backend instead
    const originalFetch = globalThis.$fetch
    if (typeof originalFetch.create === 'function') {
      const backendFetch = originalFetch.create({
        onRequest(context) {
          if (typeof context.request === 'string') {
            context.request = toBackend(context.request)
          } else if (context.request instanceof URL) {
            context.request = context.request.pathname.startsWith('/api/')
              ? new URL(NATIVE_API_ORIGIN + context.request.pathname + context.request.search)
              : context.request
          }
        }
      })
      globalThis.$fetch = backendFetch as typeof globalThis.$fetch
    }

    // --- Status bar & launch screen ----------------------------------------
    nuxtApp.hook('app:mounted', async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Light }) // dark icons
      } catch (_) {}
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 250 })
      } catch (_) {}
    })
  }
})
