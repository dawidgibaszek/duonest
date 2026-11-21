/**
 * iOS app (Capacitor) runtime adjustments. No-op on the web / PWA.
 *
 * - Dark status-bar icons (all screens are cream / white).
 * - The native launch screen is hidden once the web app has rendered.
 */
import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin({
  name: 'native-app',
  enforce: 'pre',
  setup(nuxtApp) {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform()
    document.documentElement.classList.add('dn-native', `dn-native-${platform}`)

    // Android WebView runs on https://localhost; ensure any legacy Service Worker is retired.
    if (platform === 'android' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(reg => reg.unregister())))
        .catch(() => {})
    }

    // --- Status bar & launch screen ----------------------------------------
    nuxtApp.hook('app:mounted', async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        if (platform === 'android') {
          await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
        }
        await StatusBar.setStyle({ style: Style.Light }) // dark icons
      } catch (_) {}
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide({ fadeOutDuration: 250 })
      } catch (_) {}
    })
  }
})
