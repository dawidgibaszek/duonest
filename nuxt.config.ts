// https://nuxt.com/docs/api/configuration/nuxt-config
import { databaseUrlForProject, DUONEST_PROJECT_ID } from './functions/src/firebaseProject'
import { existsSync, readFileSync } from 'node:fs'

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || DUONEST_PROJECT_ID
const androidProperties = 'android/local.properties'
const androidMapsConfigured = Boolean(process.env.MAPS_API_KEY?.trim()) ||
  (existsSync(androidProperties) && /^MAPS_API_KEY\s*=\s*\S+/m.test(readFileSync(androidProperties, 'utf8')))
const cezarState = '**/.ai/cezar/**'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false, // Ionic and Capacitor use the same generated SPA bundle.
  // Cream boot screen shown before the JS bundle loads (mirrored by pages/index.vue)
  spaLoadingTemplate: 'spa-loading-template.html',
  devtools: { enabled: false },
  ignore: [cezarState],

  experimental: {
    appManifest: false
  },

  modules: [
    '@nuxtjs/ionic'
  ],

  vite: {
    optimizeDeps: {
      include: [
        'canvas-confetti',
        'ionicons/icons',
        'qrcode',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/database',
        'firebase/storage'
      ]
    },
    server: {
      watch: {
        usePolling: false,
        ignored: [cezarState]
      },
      ws: {
        clientPort: 3000,
        port: 3000
      }
    }
  },

  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/']
    },
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          // camera=(self): the pairing QR scanner needs the camera on our own origin
          'Permissions-Policy': process.env.NODE_ENV === 'development' ? 'camera=(self), microphone=(), geolocation=(self)' : 'camera=(self), microphone=(), geolocation=()'
        }
      }
    }
  },

  ionic: {
    css: {
      utilities: true
    },
    config: {
      // Automatic native platform adaptation: Ionic defaults to 'ios' on iOS and 'md' on Android
      swipeBackEnabled: true,
      animated: true,
      rippleEffect: true
    }
  },

  runtimeConfig: {
    // Server-only keys (never exposed to client browser)
    firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:kontakt@duonestapp.pl',
    tmdbApiKey: process.env.TMDB_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',

    public: {
      firebaseApiKey: process.env.FIREBASE_API_KEY || 'AIzaSyBrxtidFifD4vlf9OPSu9jkMWJLVsJAKV8',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || 'duonest-38dc2.firebaseapp.com',
      firebaseProjectId,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'duonest-38dc2.firebasestorage.app',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '273218538953',
      firebaseAppId: process.env.FIREBASE_APP_ID || '1:273218538953:web:f8daf30bf01ae40a66ec18',
      firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL || databaseUrlForProject(firebaseProjectId) || '',
      firebaseUseEmulators: process.env.FIREBASE_USE_EMULATORS === '1',
      firebaseEmulatorHost: process.env.FIREBASE_EMULATOR_HOST || '127.0.0.1',
      googleMapsAndroidConfigured: androidMapsConfigured,
      appCheckRecaptchaSiteKey: process.env.NUXT_PUBLIC_APP_CHECK_RECAPTCHA_SITE_KEY || '',
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    }
  },

  app: {
    head: {
      title: 'DuoNest - Wspólny Dom & Relacja',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'description', content: 'Minimalistyczna aplikacja dla par - wspólne zakupy, domowe obowiązki, kalendarz i budowanie relacji.' },
        // Updated per route by plugins/status-bar.client.ts (cream on start screens, white elsewhere)
        { name: 'theme-color', content: '#f6f2e7' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'DuoNest' },
        { name: 'apple-touch-fullscreen', content: 'yes' },
        { name: 'format-detection', content: 'telephone=no' },

        // Open Graph
        { property: 'og:site_name', content: 'DuoNest' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://duonestapp.pl' },
        { property: 'og:title', content: 'DuoNest - Wspólny Dom & Relacja' },
        { property: 'og:description', content: 'Minimalistyczna aplikacja dla par - wspólne zakupy, domowe obowiązki, kalendarz i budowanie relacji.' },
        { property: 'og:image', content: 'https://duonestapp.pl/icon.png' },
        { property: 'og:locale', content: 'pl_PL' },

        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'DuoNest - Wspólny Dom & Relacja' },
        { name: 'twitter:description', content: 'Minimalistyczna aplikacja dla par - wspólne zakupy, domowe obowiązki, kalendarz i budowanie relacji.' },
        { name: 'twitter:image', content: 'https://duonestapp.pl/icon.png' }
      ],
      link: [
        { rel: 'canonical', href: 'https://duonestapp.pl' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg?v=3' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon.png?v=3' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=3' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap' }
      ]
    }
  },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/auth.css'
  ]
})
