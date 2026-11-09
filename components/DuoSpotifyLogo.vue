<template>
  <svg
    class="duo-spotify-logo"
    :class="`duo-spotify-logo--${size}`"
    viewBox="0 0 24 24"
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
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'xs' | 'small' | 'medium' | 'large' | 'xl'
}>(), {
  size: 'medium'
})
</script>

<style scoped>
.duo-spotify-logo {
  display: block;
  flex: 0 0 auto;
  transition: transform 0.2s ease;
}

.duo-spotify-logo--xs {
  width: 14px;
  height: 14px;
}

.duo-spotify-logo--small {
  width: 18px;
  height: 18px;
}

.duo-spotify-logo--medium {
  width: 22px;
  height: 22px;
}

.duo-spotify-logo--large {
  width: 32px;
  height: 32px;
}

.duo-spotify-logo--xl {
  width: 48px;
  height: 48px;
}
</style>
