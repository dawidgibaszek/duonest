import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Native iOS shell for DuoNest.
 *   npm run ios:build   → nuxt generate + cap sync ios
 *   npm run ios:open    → open the project in Xcode (Archive → TestFlight)
 */
const config: CapacitorConfig = {
  appId: 'com.belka.duonest',
  appName: 'DuoNest',
  webDir: 'dist',
  ios: {
    // Web content goes under the status bar / notch; the app pads itself with env(safe-area-inset-*)
    contentInset: 'never',
    backgroundColor: '#f6f2e7',
    scheme: 'DuoNest',
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#f6f2e7',
      showSpinner: false
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT'
    },
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound']
    },
    FirebaseAuthentication: {
      // Native sheet only returns the credential; the web SDK signs in, so the
      // whole app keeps using one Firebase session.
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com']
    }
  },
  experimental: {
    ios: {
      spm: {
        swiftToolsVersion: '6.1',
        // Google Sign-In SDK only (no Facebook SDK in the binary)
        packageTraits: {
          '@capacitor-firebase/authentication': ['Google']
        },
        // Avoids the SwiftPM package identity collision (capacitor-firebase#959)
        packageOptions: {
          '@capacitor-firebase/authentication': { symlink: true },
          '@capacitor-firebase/messaging': { symlink: true }
        }
      }
    }
  }
}

export default config
