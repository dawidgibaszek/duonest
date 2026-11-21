// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false, // SPA / PWA mode for optimal mobile Ionic native app experience
  // Cream boot screen shown before the JS bundle loads (mirrored by pages/index.vue)
  spaLoadingTemplate: 'spa-loading-template.html',
  devtools: { enabled: false },

  experimental: {
    appManifest: false
  },

  modules: [
    '@nuxtjs/ionic',
    '@vite-pwa/nuxt'
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
        'firebase/database'
      ]
    },
    server: {
      watch: {
        usePolling: false
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
          'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()'
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
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'duonest-38dc2',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'duonest-38dc2.firebasestorage.app',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '273218538953',
      firebaseAppId: process.env.FIREBASE_APP_ID || '1:273218538953:web:f8daf30bf01ae40a66ec18',
      firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL || '',
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      id: '/',
      name: 'DuoNest - Aplikacja dla Par',
      short_name: 'DuoNest',
      description: 'Zarządzanie wspólnym domem i budowanie relacji dla par',
      theme_color: '#f6f2e7',
      background_color: '#f6f2e7',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      orientation: 'portrait',
      lang: 'pl',
      start_url: '/',
      scope: '/',
      icons: [
        { src: '/pwa-192x192.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa-maskable-512x512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      importScripts: ['/sw-push.js'],
      clientsClaim: true,
      skipWaiting: true,
      // Firebase REST API, Firestore and Auth must always go to network - never serve from cache.
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/(?:firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|.*\.firebaseio\.com)\/.*/i,
          handler: 'NetworkOnly',
          options: {
            cacheName: 'firebase-api',
          }
        }
      ]
    },
    devOptions: {
      enabled: false,
      type: 'module'
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
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
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
        { rel: 'manifest', href: '/manifest.json?v=3' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg?v=3' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon.png?v=3' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=3' },
        // iOS PWA launch screens (same look as spa-loading-template.html)
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1320x2868.png', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1260x2736.png', media: '(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1206x2622.png', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1290x2796.png', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1179x2556.png', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1284x2778.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1170x2532.png', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1125x2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1242x2688.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-828x1792.png', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-1242x2208.png', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-750x1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/splash/splash-640x1136.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
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
