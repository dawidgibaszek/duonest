<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div class="dn-header-title">Zwierzak</div>
            <button type="button" class="dn-header-btn" aria-label="Edytuj zwierzaka" @click="openEditor">
              <ion-icon :icon="pencilOutline" aria-hidden="true" />
              Edytuj
            </button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="briar-content">
      <div class="briar-view">
        <div class="briar-stage" :aria-busy="status === 'loading'">
          <div class="briar-identity">
            <h1 :title="displayName">{{ displayName }}</h1>
            <span v-if="stats" class="dn-pill briar-mood">
              <ion-icon :icon="leafOutline" aria-hidden="true" />
              {{ getPetMood(stats) }}
            </span>
          </div>
          <button
            type="button"
            class="briar-pet"
            :aria-label="`Pogłaszcz zwierzaka: ${displayName}`"
            :disabled="status !== 'ready'"
            @click="petBunny"
          >
            <canvas ref="canvas" aria-hidden="true" :class="{ 'is-ready': status === 'ready' }" />
          </button>
          <div v-if="status !== 'ready'" class="briar-status" role="status">
            <div v-if="status === 'loading'" class="briar-loading">
              <span class="briar-loading-icon" aria-hidden="true">
                <ion-icon :icon="pawOutline" />
              </span>
              <span>Wczytywanie zwierzaka</span>
              <ion-spinner name="dots" aria-hidden="true" />
            </div>
            <span v-else>Nie udało się wczytać animacji zwierzaka.</span>
          </div>
        </div>

        <section class="dn-card briar-care" aria-labelledby="briar-care-title">
          <h2 id="briar-care-title">Opieka</h2>
          <div class="briar-care-actions">
            <button
              v-for="action in careOptions"
              :key="action.kind"
              type="button"
              :disabled="!stats || !!busyAction || !!retryRequest || displayPercent(stats[PET_ACTIONS[action.kind].need]) >= PET_LIMITS.full"
              :aria-busy="busyAction === action.kind"
              @click="care(action.kind)"
            >
              <ion-spinner v-if="busyAction === action.kind" name="crescent" aria-hidden="true" />
              <ion-icon v-else :icon="action.icon" aria-hidden="true" />
              <span>{{ action.label }}</span>
            </button>
          </div>
          <p v-if="actionError" class="briar-care-message is-error" role="alert">{{ actionError }}</p>
          <button v-if="retryRequest && !busyAction" type="button" class="dn-button-secondary briar-care-retry" @click="care(retryRequest.kind)">
            Ponów akcję
          </button>
        </section>

        <section class="dn-card briar-stats" aria-labelledby="briar-stats-title" :aria-busy="loading">
          <h2 id="briar-stats-title">Statystyki</h2>
          <ul v-if="stats" class="briar-stats-grid" role="list">
            <li v-for="stat in statOptions" :key="stat.id" class="briar-stat" :class="{ 'is-neglected': isNeglected(stat.id, stats[stat.id]) }">
              <div class="briar-stat-top">
                <span class="briar-stat-icon" aria-hidden="true">
                  <ion-icon :icon="stat.icon" />
                </span>
                <span class="briar-stat-value" aria-hidden="true">{{ displayPercent(stats[stat.id]) }}%</span>
              </div>
              <span class="briar-stat-label">{{ stat.label }}</span>
              <div
                class="briar-stat-track"
                role="meter"
                :aria-label="stat.label"
                :aria-valuemin="stat.id === 'health' ? PET_LIMITS.healthMin : 0"
                :aria-valuemax="PET_LIMITS.full"
                :aria-valuenow="displayPercent(stats[stat.id])"
              >
                <span :style="{ width: `${displayPercent(stats[stat.id])}%` }" />
              </div>
            </li>
          </ul>
          <p v-else-if="!syncError" class="briar-care-message" role="status">Wczytywanie statystyk…</p>
          <template v-if="syncError">
            <p class="briar-care-message is-error" role="alert">Nie udało się pobrać aktualnego stanu zwierzaka.</p>
            <button type="button" class="dn-button-secondary briar-care-retry" @click="refresh">Odśwież</button>
          </template>
        </section>
      </div>
    </ion-content>

    <ion-modal
      :is-open="editorOpen"
      class="dn-form-sheet-modal bunny-editor"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :can-dismiss="canDismissEditor"
      aria-labelledby="bunny-editor-title"
      @didDismiss="editorOpen = false"
    >
      <ion-header class="dn-form-sheet-header ion-no-border">
        <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
        <ion-toolbar>
          <div class="dn-form-sheet-heading">
            <h2 id="bunny-editor-title" class="dn-form-sheet-title">Edytuj zwierzaka</h2>
            <button type="button" class="dn-form-sheet-close" aria-label="Zamknij" :disabled="savingName" @click="editorOpen = false">
              <ion-icon :icon="closeOutline" aria-hidden="true" />
            </button>
          </div>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <form class="bunny-name-form" @submit.prevent="saveName">
          <label for="bunny-name">Imię zwierzaka</label>
          <input
            id="bunny-name"
            v-model="draftName"
            type="text"
            maxlength="40"
            autocapitalize="words"
            enterkeyhint="done"
            :disabled="savingName"
          />
          <p v-if="nameSaveFailed" class="bunny-name-error" role="alert">Nie udało się zapisać imienia. Spróbuj ponownie.</p>
          <button class="dn-button-primary" type="submit" :disabled="savingName || !draftName.trim()">
            {{ savingName ? 'Zapisywanie…' : 'Zapisz imię' }}
          </button>
        </form>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import type { Rive } from '@rive-app/canvas-lite'
import wasmUrl from '@rive-app/canvas-lite/rive.wasm?url'
import fallbackWasmUrl from '@rive-app/canvas-lite/rive_fallback.wasm?url'
import { closeOutline, flashOutline, gameControllerOutline, happyOutline, heartOutline, leafOutline, moonOutline, pawOutline, pencilOutline, restaurantOutline, sparklesOutline, waterOutline } from 'ionicons/icons'
import { useDuoState } from '~/composables/useDuoState'
import { useDuoPetCare } from '~/composables/useDuoPetCare'
import { getPetMood, PET_ACTIONS, PET_LIMITS, type PetActionType, type PetStats } from '~/functions/src/petCare'
import bunnyUrl from '~/assets/bunny.riv?url'

const props = defineProps<{ active: boolean }>()
const { partnership, updatePartnershipSettings, triggerToast } = useDuoState()
const petName = computed(() => partnership.value?.pet_name?.trim() || '')
const displayName = computed(() => petName.value || 'Królik')

const statOptions = [
  { id: 'hunger', label: 'Najedzenie', icon: restaurantOutline },
  { id: 'hydration', label: 'Nawodnienie', icon: waterOutline },
  { id: 'hygiene', label: 'Higiena', icon: sparklesOutline },
  { id: 'happiness', label: 'Szczęście', icon: happyOutline },
  { id: 'energy', label: 'Energia', icon: flashOutline },
  { id: 'health', label: 'Zdrowie', icon: heartOutline }
] as const

const careOptions = [
  { kind: 'feed', label: 'Nakarm', icon: restaurantOutline, animation: 'feed' },
  { kind: 'hydrate', label: 'Napój', icon: waterOutline, animation: 'drink' },
  { kind: 'clean', label: 'Umyj', icon: sparklesOutline, animation: 'wash' },
  { kind: 'play', label: 'Pobaw się', icon: gameControllerOutline, animation: 'play' },
  { kind: 'rest', label: 'Odpoczynek', icon: moonOutline, animation: 'pet' }
] as const

const { stats, loading, syncError, actionError, busyAction, retryRequest, refresh, performCare } = useDuoPetCare(computed(() => props.active))

const canvas = ref<HTMLCanvasElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const editorOpen = ref(false)
const draftName = ref('')
const savingName = ref(false)
const nameSaveFailed = ref(false)
let player: Rive | undefined
let resizeObserver: ResizeObserver | undefined

const canDismissEditor = () => !savingName.value

function petBunny() {
  player?.viewModelInstance?.trigger('pet')?.trigger()
}

function displayPercent(value: number) {
  return Math.round(value)
}

function isNeglected(id: keyof PetStats, value: number) {
  return value <= (id === 'health' ? PET_LIMITS.sick : PET_LIMITS.needsCare)
}

async function care(kind: PetActionType) {
  const result = await performCare(kind)
  if (!result || result.gained <= 0 || !props.active) return

  if ('vibrate' in navigator) navigator.vibrate(15)
  const option = careOptions.find(action => action.kind === kind)
  if (option) player?.viewModelInstance?.trigger(option.animation)?.trigger()
}

function openEditor() {
  draftName.value = petName.value
  nameSaveFailed.value = false
  editorOpen.value = true
}

async function saveName() {
  const name = draftName.value.trim().slice(0, 40)
  if (!name || savingName.value) return

  savingName.value = true
  nameSaveFailed.value = false
  try {
    if (await updatePartnershipSettings({ pet_name: name })) {
      editorOpen.value = false
      triggerToast('Zmieniono imię pupila', { type: 'love' })
    } else {
      nameSaveFailed.value = true
    }
  } catch {
    nameSaveFailed.value = true
  } finally {
    savingName.value = false
  }
}

watch([canvas, () => props.active], async ([surface, active]) => {
  if (player) {
    if (status.value !== 'error') {
      if (active) player.startRendering()
      else player.stopRendering()
    }
    return
  }
  if (!surface || !active) return

  try {
    const { Alignment, Fit, Layout, Rive, RuntimeLoader } = await import('@rive-app/canvas-lite')
    if (player || !props.active || canvas.value !== surface) return

    status.value = 'loading'
    RuntimeLoader.setWasmUrl(wasmUrl)
    RuntimeLoader.setWasmFallbackUrl(fallbackWasmUrl)
    let nextFrameCheck = 0
    let previousFrameHadBriar = false
    player = new Rive({
      src: bunnyUrl,
      canvas: surface,
      artboard: 'Briar',
      stateMachine: 'Briar Care',
      autoBind: true,
      autoplay: true,
      shouldDisableRiveListeners: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        if (!player) return
        const viewModel = player.viewModelInstance
        const mood = viewModel?.number('mood')
        const hat = viewModel?.boolean('wearHat')
        if (!mood || !hat) {
          status.value = 'error'
          player.stopRendering()
          return
        }

        mood.value = 0
        hat.value = false
        player.resizeDrawingSurfaceToCanvas()
        resizeObserver = new ResizeObserver(() => player?.resizeDrawingSurfaceToCanvas())
        resizeObserver.observe(surface)
        if (!props.active) player.stopRendering()
      },
      onAdvance: () => {
        if (status.value !== 'loading' || !surface.width || !surface.height) return
        const now = performance.now()
        if (now < nextFrameCheck) return
        nextFrameCheck = now + 50

        // The Rive intro can have color in the center, but the bunny has clear space on both sides.
        const { width, height } = surface
        const row = surface.getContext('2d')?.getImageData(0, Math.floor(height * 0.6), width, 1).data
        if (!row) return

        const leftAlpha = row[Math.floor(width * 0.15) * 4 + 3]
        const rightAlpha = row[Math.floor(width * 0.85) * 4 + 3]
        const center = Math.floor(width / 2) * 4
        const frameHasBriar = leftAlpha === 0 && rightAlpha === 0 && row[center + 3] === 255 &&
          row[center] + row[center + 1] + row[center + 2] > 0
        if (frameHasBriar && previousFrameHadBriar) status.value = 'ready'
        previousFrameHadBriar = frameHasBriar
      },
      onLoadError: () => { status.value = 'error' }
    })
  } catch {
    status.value = 'error'
  }
}, { flush: 'post' })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  player?.cleanup()
  player = undefined
})
</script>

<style scoped>
.briar-content {
  --padding-bottom: calc(105px + env(safe-area-inset-bottom, 0px));
}

.briar-view {
  display: grid;
  gap: 18px;
  width: min(100%, 860px);
  margin-inline: auto;
  padding: 10px 18px 20px;
}

.briar-stage {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: end;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid var(--dn-cream-deep);
  border-radius: 30px;
  background: radial-gradient(ellipse at 50% 43%, var(--dn-bg), var(--dn-cream) 66%, var(--dn-cream-deep));
}

.briar-identity {
  position: absolute;
  z-index: 1;
  inset: 16px 18px auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.briar-identity h1 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--dn-ink);
  font: 600 clamp(32px, 8vw, 48px) / 1.1 var(--dn-serif);
  letter-spacing: -0.05em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.briar-mood {
  flex-shrink: 0;
  padding: 6px 10px;
  border: 1px solid var(--dn-cream-deep);
  color: var(--dn-cream-ink);
  background: var(--dn-bg);
  font-weight: 700;
}

.briar-mood ion-icon {
  font-size: 15px;
}

.briar-pet {
  width: min(100%, 330px);
  margin: 18px 0 -28px;
  padding: 0;
  border: 0;
  border-radius: 24px;
  background: transparent;
}

.briar-pet:not(:disabled) {
  cursor: pointer;
}

.briar-pet:focus-visible {
  outline: 2px solid var(--dn-cream-ink);
  outline-offset: -4px;
}

.briar-stage canvas {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease-out;
}

.briar-stage canvas.is-ready {
  opacity: 1;
}

.briar-status {
  position: absolute;
  inset: 76px 16px 16px;
  display: grid;
  place-items: center;
  color: var(--dn-cream-ink);
  text-align: center;
}

.briar-loading {
  display: grid;
  justify-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
}

.briar-loading-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 4px;
  border: 1px solid var(--dn-cream-deep);
  border-radius: 50%;
  background: var(--dn-cream);
  font-size: 26px;
}

.briar-loading ion-spinner {
  --color: var(--dn-cream-ink);
  height: 16px;
}

@media (prefers-reduced-motion: reduce) {
  .briar-stage canvas {
    transition: none;
  }

  .briar-loading ion-spinner {
    visibility: hidden;
  }
}

.briar-care,
.briar-stats {
  margin: 0;
  padding: 16px;
  border-radius: 24px;
}

.briar-care h2,
.briar-stats h2 {
  margin: 0 0 12px;
  color: var(--dn-ink);
  font: 600 25px / 1.2 var(--dn-serif);
  letter-spacing: -0.025em;
}

.briar-care-actions {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.briar-care-actions button {
  display: grid;
  grid-column: span 2;
  justify-items: center;
  align-content: center;
  gap: 5px;
  min-height: 62px;
  padding: 6px 3px;
  border: 1px solid var(--dn-cream-deep);
  border-radius: 14px;
  background: var(--dn-cream);
  color: var(--dn-ink);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.briar-care-actions button:nth-last-child(-n + 2) {
  grid-column: span 3;
}

.briar-care-actions button:disabled:not([aria-busy='true']) {
  opacity: 0.6;
  cursor: default;
}

.briar-care-actions button:not(:disabled):active {
  background: var(--dn-cream-deep);
}

.briar-care-actions ion-icon,
.briar-care-actions ion-spinner {
  width: 19px;
  height: 19px;
  --color: var(--dn-cream-ink);
  color: var(--dn-cream-ink);
  font-size: 19px;
}

.briar-care-message {
  margin: 10px 0 0;
  color: var(--dn-muted);
  font-size: 13px;
}

.briar-care-message.is-error {
  color: var(--dn-danger);
}

.briar-care-retry {
  margin-top: 8px;
}

.briar-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.briar-stat {
  display: grid;
  gap: 6px;
  padding: 10px 11px 12px;
  border: 1px solid var(--dn-line);
  border-radius: 16px;
  background: color-mix(in srgb, var(--dn-cream) 38%, var(--dn-bg));
}

.briar-stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.briar-stat-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
  font-size: 17px;
}

.briar-stat-value {
  color: var(--dn-cream-ink);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.briar-stat-label {
  color: var(--dn-ink);
  font-size: 13px;
  font-weight: 700;
}

.briar-stat-track {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dn-cream-deep);
}

.briar-stat-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--dn-cream-ink), var(--dn-ink));
  transition: width 240ms ease-out;
}

.briar-stat.is-neglected {
  border-color: color-mix(in srgb, var(--dn-danger) 24%, var(--dn-cream-deep));
}

.briar-stat.is-neglected .briar-stat-value {
  color: var(--dn-danger);
}

.briar-stat.is-neglected .briar-stat-track span {
  background: color-mix(in srgb, var(--dn-danger) 76%, var(--dn-cream-ink));
}

@media (prefers-reduced-motion: reduce) {
  .briar-stat-track span {
    transition: none;
  }
}

.bunny-editor {
  --height: min(320px, 100%);
}

.bunny-name-form {
  display: grid;
  gap: 10px;
  color: var(--dn-ink);
}

.bunny-name-form label {
  font-size: 14px;
  font-weight: 700;
}

.bunny-name-form input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--dn-field-line);
  border-radius: 14px;
  background: var(--dn-field);
  color: inherit;
  font: inherit;
}

.bunny-name-form input:focus-visible {
  outline: 2px solid var(--dn-ink);
  outline-offset: 2px;
}

.bunny-name-form .dn-button-primary {
  margin-top: 6px;
}

.bunny-name-error {
  margin: 0;
  color: var(--dn-danger);
  font-size: 13px;
}

@media (min-width: 680px) {
  .briar-view {
    grid-template-columns: 1.12fr 1fr;
    grid-template-areas: 'pet stats' 'care stats';
    gap: 24px;
    padding-top: 18px;
  }

  .briar-pet {
    width: min(100%, 400px);
  }

  .briar-stage {
    grid-area: pet;
  }

  .briar-care {
    grid-area: care;
  }

  .briar-stats {
    grid-area: stats;
    align-self: start;
  }
}
</style>
