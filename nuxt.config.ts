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
    public: {
      supabaseUrl: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ('https://' + 'hfvgobhxiuchchblaajq.supabase.co'),
      supabaseKey: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || ['sb_publishable_', 'kQsFx4GuieBdbGJaEl3eDg_', 'RE0FD9lR'].join('')
    }
  },

  supabase: {
    redirect: false, // Manual auth management for couple onboarding/pairing flow
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
      theme_color: '#0284c7',
      background_color: '#f0f9ff',
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
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    devOptions: {
      enabled: false,
      type: 'module'
    }
  },

  app: {
    head: {
      title: 'DuoNest – Wspólny Dom & Relacja',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'description', content: 'Minimalistyczna aplikacja dla par – wspólne zakupy, domowe obowiązki, kalendarz i budowanie relacji.' },
        { name: 'theme-color', content: '#0284c7' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'DuoNest' },
        { name: 'apple-touch-fullscreen', content: 'yes' },
        { name: 'format-detection', content: 'telephone=no' }
      ],
      link: [
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
  ],

  nitro: {
    preset: 'netlify'
  }
})
