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

    document.documentElement.classList.add('dn-native', `dn-native-${Capacitor.getPlatform()}`)

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
