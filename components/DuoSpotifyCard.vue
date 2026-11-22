<template>
  <DuoMusicCard v-bind="$props" />
</template>

<script setup lang="ts">
import DuoMusicCard from '~/components/DuoMusicCard.vue'
import type { MusicPlayback } from '~/composables/useMusic'

withDefaults(
  defineProps<{
    playback?: MusicPlayback | null
    userName?: string
    isPreview?: boolean
    service?: string | null
  }>(),
  {
    playback: null,
    isPreview: false,
    service: null
  }
)
</script>
