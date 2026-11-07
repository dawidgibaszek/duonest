// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false, // SPA / PWA mode for optimal mobile Ionic native app experience
  devtools: { enabled: false },

  experimental: {
    appManifest: false
  },

  modules: [
    '@nuxtjs/ionic',
    '@nuxtjs/supabase',
    '@vite-pwa/nuxt'
  ],

  vite: {
    optimizeDeps: {
      include: [
        'canvas-confetti',
        'ionicons/icons',
        'qrcode',
        '@supabase/supabase-js'
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
    preset: 'netlify',
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
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
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
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:kontakt@duonestapp.pl',
    tmdbApiKey: process.env.TMDB_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',

    public: {
      supabaseUrl: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ('https://' + 'hfvgobhxiuchchblaajq.supabase.co'),
      supabaseKey: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || ['sb_publishable_', 'kQsFx4GuieBdbGJaEl3eDg_', 'RE0FD9lR'].join(''),
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    }
  },

  supabase: {
    redirect: false, // Manual auth management for couple onboarding/pairing flow
    clientOptions: {
      auth: {
        detectSessionInUrl: false
      }
    },
    url: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ('https://' + 'hfvgobhxiuchchblaajq.supabase.co'),
    key: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || ['sb_publishable_', 'kQsFx4GuieBdbGJaEl3eDg_', 'RE0FD9lR'].join('')
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      id: '/',
      name: 'DuoNest - Aplikacja dla Par',
      short_name: 'DuoNest',
      description: 'Zarządzanie wspólnym domem i budowanie relacji dla par',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      orientation: 'portrait',
      lang: 'pl',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      importScripts: ['/sw-push.js'],
      clientsClaim: true,
      skipWaiting: true,
      // Supabase REST API and Realtime must always go to network - never serve from cache.
      // Without this, iOS PWA returns stale Supabase responses from cache, causing
      // wishlist items (and other data) not to appear until the app is restarted.
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/[^/]+\.supabase\.co\/.*/i,
          handler: 'NetworkOnly',
          options: {
            cacheName: 'supabase-api',
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
        { name: 'theme-color', content: '#0f172a' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
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
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap' }
      ]
    }
  },

  css: [
    '~/assets/css/main.css'
  ]
})
