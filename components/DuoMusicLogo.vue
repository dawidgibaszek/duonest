<template>
  <span
    class="duo-music-logo"
    :class="[`duo-music-logo--${size}`, `duo-music-logo--${normalizedService}`]"
    :title="serviceConfig.name"
  >
    <!-- 1. SPOTIFY -->
    <svg
      v-if="normalizedService === 'spotify'"
      viewBox="0 0 24 24"
      class="logo-svg"
      role="img"
      aria-label="Spotify"
      shape-rendering="geometricPrecision"
    >
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path
        d="M6.35 9.15c3.45-1.04 7.84-.74 10.96.94"
        fill="none"
        stroke="#0f172a"
        stroke-linecap="round"
        stroke-width="1.8"
      />
      <path
        d="M7.25 12.35c2.88-.78 6.43-.52 9.02.87"
        fill="none"
        stroke="#0f172a"
        stroke-linecap="round"
        stroke-width="1.8"
      />
      <path
        d="M8.2 15.35c2.25-.52 4.89-.29 6.8.72"
        fill="none"
        stroke="#0f172a"
        stroke-linecap="round"
        stroke-width="1.8"
      />
    </svg>

    <!-- 2. APPLE MUSIC -->
    <svg
      v-else-if="normalizedService === 'apple_music'"
      viewBox="0 0 24 24"
      class="logo-svg"
      role="img"
      aria-label="Apple Music"
    >
      <rect width="24" height="24" rx="6" fill="#FA243C" />
      <path
        d="M15.5 5.5v8.2a2.3 2.3 0 1 1-1.8-2.25V8.1l-4.8 1.4v6.2a2.3 2.3 0 1 1-1.8-2.25V7.2L15.5 5.5z"
        fill="#FFFFFF"
      />
    </svg>

    <!-- 3. YOUTUBE MUSIC -->
    <svg
      v-else-if="normalizedService === 'youtube_music'"
      viewBox="0 0 24 24"
      class="logo-svg"
      role="img"
      aria-label="YouTube Music"
    >
      <circle cx="12" cy="12" r="12" fill="#FF0000" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#FFFFFF" stroke-width="1.8" />
      <polygon points="10.2,8.8 15.2,12 10.2,15.2" fill="#FFFFFF" />
    </svg>

    <!-- 4. TIDAL -->
    <svg
      v-else-if="normalizedService === 'tidal'"
      viewBox="0 0 24 24"
      class="logo-svg"
      role="img"
      aria-label="Tidal"
    >
      <rect width="24" height="24" rx="6" fill="#000000" />
      <path
        d="M4.5 9L7.5 6L10.5 9L7.5 12L4.5 9ZM10.5 9L13.5 6L16.5 9L13.5 12L10.5 9ZM16.5 9L19.5 6L22.5 9L19.5 12L16.5 9ZM10.5 15L13.5 12L16.5 15L13.5 18L10.5 15Z"
        fill="#00FFFF"
      />
    </svg>

    <!-- 5. LAST.FM DEFAULT -->
    <svg
      v-else
      viewBox="0 0 24 24"
      class="logo-svg"
      role="img"
      aria-label="Last.fm"
    >
      <circle cx="12" cy="12" r="12" fill="#D51007" />
      <path
        d="M7 14.5c-.6 0-1-.4-1-1s.4-1 1-1c1 0 1.5.5 2 1.5l.7 1.3c.7 1.4 1.7 1.9 3 1.9 1.9 0 2.8-1.1 2.8-2.6 0-1.1-.6-1.8-1.9-2.5l-1.4-.7c-1.4-.7-2.3-1.6-2.3-3.1 0-1.8 1.4-2.9 3.2-2.9 1.8 0 2.9 1.1 3.2 2.5h-1.5c-.3-.8-.8-1.2-1.7-1.2-1.1 0-1.7.6-1.7 1.6 0 .9.6 1.4 1.6 2l1.4.7c1.6.9 2.4 1.8 2.4 3.4 0 2-1.4 3.3-4.1 3.3-1.6 0-2.9-.7-3.8-2.3L7.7 13.5c-.3-.5-.5-.7-.7-.7v1.7H7z"
        fill="#FFFFFF"
      />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type MusicServiceType = 'spotify' | 'apple_music' | 'youtube_music' | 'tidal' | 'lastfm'

const props = withDefaults(
  defineProps<{
    service?: string | null
    size?: 'xs' | 'small' | 'medium' | 'large' | 'xl'
  }>(),
  {
    service: 'spotify',
    size: 'medium'
  }
)

const normalizedService = computed<MusicServiceType>(() => {
  const s = String(props.service || '').toLowerCase().trim()
  if (s === 'apple' || s === 'apple_music' || s === 'applemusic') return 'apple_music'
  if (s === 'yt' || s === 'youtube' || s === 'youtube_music' || s === 'ytmusic') return 'youtube_music'
  if (s === 'tidal') return 'tidal'
  if (s === 'lastfm' || s === 'last_fm' || s === 'last.fm') return 'lastfm'
  return 'spotify'
})

const serviceConfig = computed(() => {
  switch (normalizedService.value) {
    case 'apple_music':
      return { name: 'Apple Music' }
    case 'youtube_music':
      return { name: 'YouTube Music' }
    case 'tidal':
      return { name: 'Tidal' }
    case 'lastfm':
      return { name: 'Last.fm' }
    default:
      return { name: 'Spotify' }
  }
})
</script>

<style scoped>
.duo-music-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 0;
}

.logo-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.duo-music-logo--xs {
  width: 14px;
  height: 14px;
}

.duo-music-logo--small {
  width: 18px;
  height: 18px;
}

.duo-music-logo--medium {
  width: 22px;
  height: 22px;
}

.duo-music-logo--large {
  width: 32px;
  height: 32px;
}

.duo-music-logo--xl {
  width: 48px;
  height: 48px;
}
</style>
