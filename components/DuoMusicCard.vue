<template>
  <div
    v-if="playback"
    class="dn-card music-activity-card"
    :class="{ 'is-preview': isPreview }"
  >
    <!-- Header Row -->
    <div class="card-header-row">
      <div class="header-left">
        <span class="section-badge">
          <DuoMusicLogo :service="currentService" size="xs" />
          <span>{{ isSelf ? 'TWOJA MUZYKA' : 'MUZYKA PARTNERA' }}</span>
        </span>
        <h4 class="card-title">{{ titleText }}</h4>
      </div>

      <!-- Live / Idle Status Pill with Animated Equalizer -->
      <span v-if="playback.is_playing" class="music-status-tag is-live">
        <span class="live-eq" aria-hidden="true">
          <span class="eq-col col-1"></span>
          <span class="eq-col col-2"></span>
          <span class="eq-col col-3"></span>
        </span>
        <span>TERAZ GRA</span>
      </span>
      <span v-else class="music-status-tag is-idle">
        <ion-icon :icon="ioniconsTimeOutline" class="idle-icon" />
        <span>OSTATNIO</span>
      </span>
    </div>

    <!-- Inner Player Surface matching DuoNest design language -->
    <div class="music-player-surface">
      <!-- Main Track Row: Cover + Meta -->
      <div class="player-main-row">
        <!-- Album Cover -->
        <div class="music-cover-wrap">
          <img
            v-if="playback.album_image_url && !hasCoverError"
            :src="playback.album_image_url"
            :alt="playback.track_name || 'Okładka albumu'"
            class="music-cover-img"
            @error="hasCoverError = true"
          />
          <div v-else class="music-cover-fallback">
            <ion-icon :icon="ioniconsMusicalNotes" class="fallback-note-icon" />
          </div>

          <!-- Subtle animated playing badge overlay -->
          <div v-if="playback.is_playing" class="cover-playing-indicator" title="Odtwarzanie na żywo">
            <span class="playing-pulse-dot"></span>
          </div>
        </div>

        <!-- Track Metadata -->
        <div class="music-track-meta">
          <strong class="track-name" :title="playback.track_name">
            {{ playback.track_name || 'Nieznany utwór' }}
          </strong>

          <span class="artist-name" :title="playback.artist_name">
            {{ playback.artist_name || 'Nieznany wykonawca' }}
          </span>

          <span
            v-if="playback.album_name && playback.album_name !== playback.track_name"
            class="album-name"
            :title="playback.album_name"
          >
            {{ playback.album_name }}
          </span>

          <div class="platform-meta-tag">
            <DuoMusicLogo :service="currentService" size="xs" />
            <span>{{ servicePlatformName }}</span>
          </div>
        </div>
      </div>

      <!-- Live Progress Bar -->
      <div v-if="playback.is_playing || playback.duration_ms" class="music-progress">
        <div class="music-progress-track">
          <div
            class="music-progress-fill"
            :class="{ 'is-paused': !playback.is_playing }"
            :style="{ width: `${progressPercent}%`, backgroundColor: progressFillColor }"
          ></div>
        </div>
        <div class="music-progress-times">
          <span>{{ formatTime(currentProgress) }}</span>
          <span>{{ formatTime(trackDurationMs) }}</span>
        </div>
      </div>

      <!-- Action Button to open in streaming service -->
      <div class="player-action-row">
        <a
          v-if="targetTrackUrl"
          :href="targetTrackUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="music-open-btn"
        >
          <DuoMusicLogo :service="currentService" size="xs" />
          <span>{{ serviceMeta.open }}</span>
          <ion-icon :icon="ioniconsOpenOutline" class="open-icon" />
        </a>
        <span v-else-if="isPreview" class="music-preview-pill">
          <ion-icon :icon="ioniconsEyeOutline" />
          <span>Podgląd aktywności dla partnera</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { MusicPlayback } from '~/composables/useMusic'
import DuoMusicLogo from '~/components/DuoMusicLogo.vue'

const props = withDefaults(
  defineProps<{
    playback?: MusicPlayback | null
    userName?: string
    isPreview?: boolean
    service?: string | null
  }>(),
  {
    playback: null,
    userName: 'Partner',
    isPreview: false,
    service: null
  }
)

const currentService = computed(() => {
  return props.playback?.music_service || props.service || 'spotify'
})

const servicePlatformName = computed(() => {
  const s = currentService.value
  if (s === 'apple_music') return 'Apple Music'
  if (s === 'youtube_music') return 'YouTube Music'
  if (s === 'tidal') return 'Tidal'
  if (s === 'lastfm') return 'Last.fm'
  return 'Spotify'
})

const serviceMeta = computed(() => {
  const s = currentService.value
  if (s === 'apple_music') {
    return {
      badge: 'APPLE MUSIC',
      open: 'Posłuchaj w Apple Music'
    }
  }
  if (s === 'youtube_music') {
    return {
      badge: 'YT MUSIC',
      open: 'Posłuchaj w YouTube Music'
    }
  }
  if (s === 'tidal') {
    return {
      badge: 'TIDAL',
      open: 'Posłuchaj w Tidal'
    }
  }
  if (s === 'lastfm') {
    return {
      badge: 'LAST.FM',
      open: 'Zobacz w Last.fm'
    }
  }
  return {
    badge: 'SPOTIFY',
    open: 'Posłuchaj w Spotify'
  }
})

const targetTrackUrl = computed(() => {
  if (props.playback?.track_url) {
    return props.playback.track_url
  }
  const track = props.playback?.track_name || ''
  const artist = props.playback?.artist_name || ''
  const query = encodeURIComponent(`${track} ${artist}`)
  const s = currentService.value
  if (s === 'apple_music') return `https://music.apple.com/search?term=${query}`
  if (s === 'youtube_music') return `https://music.youtube.com/search?q=${query}`
  if (s === 'tidal') return `https://listen.tidal.com/search?q=${query}`
  if (s === 'lastfm') return `https://www.last.fm/search?q=${query}`
  return `https://open.spotify.com/search/${query}`
})

const localProgressMs = ref(0)
const hasCoverError = ref(false)
let clockTimer: ReturnType<typeof setInterval> | null = null
let lastTickTimestamp = Date.now()

// Track changes or play/pause state changes
watch(
  () => [props.playback?.track_name, props.playback?.is_playing],
  () => {
    hasCoverError.value = false
    localProgressMs.value = Math.max(0, Number(props.playback?.progress_ms) || 0)
    lastTickTimestamp = Date.now()
  },
  { immediate: true }
)

// Server progress polling sync: only adjust if drift exceeds 3.5s (prevents visual jump/stutter)
watch(
  () => props.playback?.progress_ms,
  (newVal) => {
    if (newVal === undefined || newVal === null) return
    const serverVal = Math.max(0, Number(newVal))
    const diff = Math.abs(localProgressMs.value - serverVal)
    if (diff > 3500) {
      localProgressMs.value = serverVal
      lastTickTimestamp = Date.now()
    }
  }
)

const isSelf = computed(() => {
  const name = props.userName?.trim().toLowerCase()
  return name === 'ty' || props.isPreview
})

const titleText = computed(() => {
  const isPlaying = props.playback?.is_playing
  if (isSelf.value) {
    return isPlaying ? 'Ty teraz słuchasz' : 'Ty ostatnio słuchałeś(aś)'
  }
  const name = props.userName || 'Partner'
  return isPlaying ? `${name} teraz słucha` : `${name} ostatnio słuchał(a)`
})

const trackDurationMs = computed(() => {
  const dur = props.playback?.duration_ms
  if (typeof dur === 'number' && dur > 0) return dur
  return 210_000 // Standard fallback: 3:30
})

const progressFillColor = computed(() => {
  switch (currentService.value) {
    case 'apple_music':
      return '#fa243c'
    case 'youtube_music':
      return '#ff0000'
    case 'tidal':
      return '#0f172a'
    case 'lastfm':
      return '#d51007'
    default:
      return '#1db954'
  }
})

const currentProgress = computed(() => {
  if (!props.playback?.is_playing) {
    return Math.max(0, Number(props.playback?.progress_ms) || 0)
  }
  return localProgressMs.value
})

const progressPercent = computed(() => {
  const dur = trackDurationMs.value
  if (!dur) return 0
  return Math.min(100, Math.max(0, (currentProgress.value / dur) * 100))
})

const formatTime = (milliseconds?: number | null) => {
  if (milliseconds === null || milliseconds === undefined || isNaN(milliseconds)) {
    return '0:00'
  }
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

onMounted(() => {
  lastTickTimestamp = Date.now()
  localProgressMs.value = Math.max(0, Number(props.playback?.progress_ms) || 0)

  // Smooth 250ms ticking for uninterrupted live playback progression
  clockTimer = setInterval(() => {
    const now = Date.now()
    const delta = now - lastTickTimestamp
    lastTickTimestamp = now

    if (props.playback?.is_playing) {
      const dur = trackDurationMs.value
      localProgressMs.value = Math.min(dur, localProgressMs.value + delta)
    }
  }, 250)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style scoped>
.music-activity-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: var(--dn-card-shadow);
  padding: 16px;
  margin: 10px 16px;
  min-width: 0;
  box-sizing: border-box;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.music-activity-card.is-preview {
  margin: 0;
  box-shadow: none;
  border-radius: 16px;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.header-left {
  min-width: 0;
  flex: 1;
}

.section-badge {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  color: #0f172a;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 3px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
}

/* Status tags */
.music-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.music-status-tag.is-live {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.music-status-tag.is-idle {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

/* Animated Equalizer */
.live-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
  flex-shrink: 0;
}

.eq-col {
  width: 2.5px;
  background: #16a34a;
  border-radius: 1px;
  animation: eqAnim 1s ease-in-out infinite alternate;
}

.col-1 {
  height: 5px;
  animation-delay: 0.1s;
}

.col-2 {
  height: 11px;
  animation-delay: 0.35s;
}

.col-3 {
  height: 7px;
  animation-delay: 0.2s;
}

@keyframes eqAnim {
  0% {
    height: 3px;
  }
  100% {
    height: 12px;
  }
}

.idle-icon {
  font-size: 13px;
  color: #94a3b8;
}

/* Inner Player Surface (Matching DuoNest Widget Design) */
.music-player-surface {
  background: #f8fafc;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Player main track row */
.player-main-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

/* Album Cover */
.music-cover-wrap {
  width: 68px;
  height: 68px;
  flex: 0 0 68px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: #f1f5f9;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  position: relative;
}

.music-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.music-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
}

.fallback-note-icon {
  font-size: 26px;
}

.cover-playing-indicator {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 10px;
  height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.playing-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #16a34a;
  border: 1.5px solid #ffffff;
  box-shadow: 0 0 6px rgba(22, 163, 74, 0.6);
  animation: pulseDot 2s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

/* Track Metadata */
.music-track-meta {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}

.track-name {
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-bottom: 2px;
}

.artist-name {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
  padding-bottom: 1px;
}

.album-name {
  color: #94a3b8;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
  padding-bottom: 1px;
}

.platform-meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  line-height: 1.35;
  margin-top: 5px;
}

/* Progress bar */
.music-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.music-progress-track {
  width: 100%;
  height: 4.5px;
  border-radius: 9999px;
  background: #e2e8f0;
  overflow: hidden;
  position: relative;
}

.music-progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.25s linear;
}

.music-progress-fill.is-paused {
  opacity: 0.6;
}

.music-progress-times {
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Action button */
.player-action-row {
  display: flex;
  align-items: center;
  margin-top: 2px;
}

.music-open-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 8px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  touch-action: manipulation;
}

.music-open-btn:active {
  transform: scale(0.98);
  background: #1e293b;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.open-icon {
  font-size: 13px;
}

.music-preview-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  padding: 6px 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 11.5px;
  font-weight: 600;
}

@media (max-width: 430px) {
  .music-player-surface {
    padding: 12px;
    gap: 10px;
  }

  .player-main-row {
    gap: 12px;
  }

  .music-cover-wrap {
    width: 60px;
    height: 60px;
    flex: 0 0 60px;
    border-radius: 12px;
  }

  .track-name {
    font-size: 14.5px;
  }

  .artist-name {
    font-size: 12.5px;
  }
}
</style>
