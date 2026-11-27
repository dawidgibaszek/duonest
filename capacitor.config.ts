import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Native mobile shell for DuoNest (iOS & Android).
 *   npm run ios:build      → nuxt generate + cap sync ios
 *   npm run ios:open       → open the project in Xcode (Archive → TestFlight)
 *   npm run android:build  → nuxt generate + cap sync android
 *   npm run android:open   → open the project in Android Studio
 */
const config: CapacitorConfig = {
  appId: 'com.belka.duonest',
  appName: 'DuoNest',
  webDir: 'dist',
  appendUserAgent: 'DuoNest (+https://duonestapp.pl)',
  android: {
    backgroundColor: '#f6f2e7'
  },
  ios: {
    // Web content goes under the status bar / notch; the app pads itself with env(safe-area-inset-*)
    contentInset: 'never',
    backgroundColor: '#f6f2e7',
    scheme: 'DuoNest',
    limitsNavigationsToAppBoundDomains: false,
    // iOS uses the native MapKit plugin. The Capacitor Google Maps plugin is Android-only here.
    includePlugins: [
      '@capacitor-firebase/analytics',
      '@capacitor-firebase/app-check',
      '@capacitor-firebase/authentication',
      '@capacitor-firebase/messaging',
      '@capacitor/app',
      '@capacitor/keyboard',
      '@capacitor/splash-screen',
      '@capacitor/status-bar'
    ]
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
          '@capacitor-firebase/analytics': ['AnalyticsWithoutAdIdSupport'],
          '@capacitor-firebase/authentication': ['Google']
        },
        // Avoids the SwiftPM package identity collision (capacitor-firebase#959)
        packageOptions: {
          '@capacitor-firebase/analytics': { symlink: true },
          '@capacitor-firebase/app-check': { symlink: true },
          '@capacitor-firebase/authentication': { symlink: true },
          '@capacitor-firebase/messaging': { symlink: true }
        }
      }
    }
  }
}

export default config
