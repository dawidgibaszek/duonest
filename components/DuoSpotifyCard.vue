<template>
  <div
    v-if="playback"
    class="dn-card spotify-activity-card"
    :class="{ 'is-preview': isPreview }"
  >
    <!-- Header Row -->
    <div class="card-header-row">
      <div class="header-left">
        <span class="section-badge">
          <DuoSpotifyLogo size="xs" />
          <span>SPOTIFY</span>
        </span>
        <h4 class="card-title">{{ titleText }}</h4>
      </div>

      <!-- Live / Idle Status Pill -->
      <span v-if="playback.is_playing" class="spotify-status-tag is-live">
        <span class="live-dot"></span>
        <span>LIVE</span>
      </span>
      <span v-else class="spotify-status-tag is-idle">
        <ion-icon :icon="ioniconsTimeOutline" class="idle-icon" />
        <span>PAUZA</span>
      </span>
    </div>

    <!-- Card Body: Cover Art + Track Meta + Progress + Link -->
    <div class="spotify-activity-body">
      <!-- Album Cover Art (Clean, no vinyl overlap, generous gap) -->
      <div class="spotify-cover-wrap">
        <img
          v-if="playback.album_image_url && !hasCoverError"
          :src="playback.album_image_url"
          :alt="playback.track_name || 'Okładka albumu'"
          class="spotify-cover-img"
          @error="hasCoverError = true"
        />
        <div v-else class="spotify-cover-fallback">
          <ion-icon :icon="ioniconsMusicalNotes" class="fallback-note-icon" />
        </div>
      </div>

      <!-- Track Information -->
      <div class="spotify-track-meta">
        <strong class="track-name" :title="playback.track_name">
          {{ playback.track_name || 'Nieznany utwór' }}
        </strong>

        <span class="artist-name" :title="playback.artist_name">
          {{ playback.artist_name || 'Nieznany wykonawca' }}
        </span>

        <!-- Live Progress Bar -->
        <div v-if="playback.is_playing && playback.duration_ms" class="spotify-progress">
          <div class="spotify-progress-track">
            <div
              class="spotify-progress-fill"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
          <div class="spotify-progress-times">
            <span>{{ formatTime(liveProgressMs) }}</span>
            <span>{{ formatTime(playback.duration_ms) }}</span>
          </div>
        </div>

        <!-- Action / Spotify Link -->
        <div class="spotify-action-row">
          <a
            v-if="playback.track_url"
            :href="playback.track_url"
            target="_blank"
            rel="noopener noreferrer"
            class="spotify-open-btn"
          >
            <DuoSpotifyLogo size="xs" />
            <span>Otwórz w Spotify</span>
            <ion-icon :icon="ioniconsOpenOutline" class="open-icon" />
          </a>
          <span v-else-if="isPreview" class="spotify-preview-pill">
            <ion-icon :icon="ioniconsEyeOutline" />
            <span>Podgląd aktywności</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { SpotifyPlayback } from '~/composables/useSpotify'

const props = withDefaults(
  defineProps<{
    playback?: SpotifyPlayback | null
    userName?: string
    isPreview?: boolean
  }>(),
  {
    playback: null,
    userName: 'Partner',
    isPreview: false
  }
)

const spotifyClock = ref(Date.now())
const hasCoverError = ref(false)
let clockTimer: ReturnType<typeof setInterval> | null = null

watch(
  () => [props.playback?.track_name, props.playback?.updated_at, props.playback?.album_image_url],
  () => {
    spotifyClock.value = Date.now()
    hasCoverError.value = false
  }
)

const isSelf = computed(() => {
  const name = props.userName?.trim().toLowerCase()
  return name === 'ty' || props.isPreview
})

const titleText = computed(() => {
  const isPlaying = props.playback?.is_playing
  if (isSelf.value) {
    return isPlaying ? 'Ty teraz słuchasz' : 'Ty ostatnio słuchałeś'
  }
  const name = props.userName || 'Partner'
  return isPlaying ? `${name} teraz słucha` : `${name} ostatnio słuchał(a)`
})

const liveProgressMs = computed(() => {
  if (!props.playback) return 0
  const progress = props.playback.progress_ms || 0
  if (!props.playback.is_playing) return progress
  const elapsed = Math.max(0, spotifyClock.value - new Date(props.playback.updated_at).getTime())
  const duration = props.playback.duration_ms || Number.MAX_SAFE_INTEGER
  return Math.min(duration, progress + elapsed)
})

const progressPercent = computed(() => {
  if (!props.playback || !props.playback.duration_ms) return 0
  return Math.min(100, Math.max(0, (liveProgressMs.value / props.playback.duration_ms) * 100))
})

const formatTime = (milliseconds?: number | null) => {
  const totalSeconds = Math.max(0, Math.floor((milliseconds || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

onMounted(() => {
  clockTimer = setInterval(() => {
    if (props.playback?.is_playing) {
      spotifyClock.value = Date.now()
    }
  }, 1000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style scoped>
.spotify-activity-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: var(--dn-card-shadow);
  padding: 16px;
  margin: 10px 16px;
  min-width: 0;
  box-sizing: border-box;
}

.spotify-activity-card.is-preview {
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
}

.section-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #64748b;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 3px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

/* Status tag matching DuoNest chips/pills */
.spotify-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.spotify-status-tag.is-live {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.spotify-status-tag.is-idle {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #16a34a;
}

.idle-icon {
  font-size: 12px;
  color: #94a3b8;
}

/* Body layout */
.spotify-activity-body {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 10px;
  min-width: 0;
}

/* Album Cover */
.spotify-cover-wrap {
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}

.spotify-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.spotify-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #ffffff;
}

.fallback-note-icon {
  font-size: 28px;
}

/* Track Metadata */
.spotify-track-meta {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}

.track-name {
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.artist-name {
  color: #64748b;
  font-size: 12.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8px;
}

/* Progress bar (Clean, no glow) */
.spotify-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.spotify-progress-track {
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.spotify-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: #1db954;
  transition: width 0.4s linear;
}

.spotify-progress-times {
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Action button matching DuoNest black accent styling */
.spotify-action-row {
  display: flex;
  align-items: center;
}

.spotify-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  background: #0f172a;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  touch-action: manipulation;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.spotify-open-btn:active {
  transform: scale(0.97);
  background: #1e293b;
}

.open-icon {
  font-size: 12px;
}

.spotify-preview-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}

@media (max-width: 430px) {
  .spotify-activity-body {
    gap: 14px;
  }

  .spotify-cover-wrap {
    width: 68px;
    height: 68px;
    flex: 0 0 68px;
  }

  .track-name {
    font-size: 14px;
  }

  .artist-name {
    font-size: 12px;
  }
}
</style>
