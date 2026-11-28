<template>
  <ion-page>
    <ion-header :translucent="true">
      <DuoSectionBack to="/tabs/leisure" label="Wróć do rozrywki" />
      <ion-toolbar>
        <div class="dn-page-header">
          <h1 class="dn-header-title">Dzienny rysunek</h1>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="drawing-page">
        <div class="drawing-month">
          <button type="button" class="dn-header-btn dn-header-btn--icon" aria-label="Poprzedni miesiąc" @click="changeMonth(-1)">
            <ion-icon :icon="chevronBackOutline" aria-hidden="true" />
          </button>
          <h2 aria-live="polite">{{ monthFormat.format(selectedDay) }}</h2>
          <button type="button" class="dn-header-btn dn-header-btn--icon" aria-label="Następny miesiąc" :disabled="isCurrentMonth" @click="changeMonth(1)">
            <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
          </button>
        </div>

        <div ref="dayStrip" class="drawing-days" role="group" aria-label="Dni miesiąca">
          <button
            v-for="day in days" :key="day.getTime()" type="button"
            :aria-label="dateFormat.format(day)"
            :aria-pressed="day.getTime() === selectedDay.getTime()"
            :aria-current="day.getTime() === today.getTime() ? 'date' : undefined"
            :disabled="day > today"
            @click="selectedDay = day"
          >
            <span aria-hidden="true">{{ weekdayFormat.format(day) }}</span>
            {{ day.getDate() }}
          </button>
        </div>

        <section class="dn-card drawing-card" aria-labelledby="drawing-date">
          <div class="drawing-card-heading">
            <h2 id="drawing-date">{{ isToday ? 'Dzisiaj' : dateFormat.format(selectedDay) }}</h2>
            <button v-if="!isToday" type="button" class="dn-header-btn dn-header-btn--soft" @click="selectToday">Wróć do dziś</button>
          </div>
          <button v-if="doodle?.strokes.length" type="button" class="drawing-preview drawing-preview-button" aria-label="Powiększ rysunek" @click="viewerOpen = true">
            <canvas
              ref="canvas"
              :width="DOODLE_WIDTH" :height="DOODLE_HEIGHT"
              aria-hidden="true"
              @contextrestored="renderPreview"
            />
            <span class="drawing-preview-icon" aria-hidden="true">
              <ion-icon :icon="expandOutline" />
            </span>
          </button>
          <div v-else class="drawing-preview">
            <div class="drawing-empty">
              <ion-icon :icon="brushOutline" aria-hidden="true" />
              <p role="status">{{ previewMessage }}</p>
              <button v-if="loadFailed" type="button" class="dn-header-btn dn-header-btn--soft" @click="retryCount++">Spróbuj ponownie</button>
            </div>
          </div>
          <button v-if="isToday && partnership" type="button" class="dn-button-primary drawing-edit" @click="editorOpen = true">
            <ion-icon :icon="brushOutline" aria-hidden="true" />
            {{ doodle?.strokes.length ? 'Edytuj' : 'Zacznij rysować' }}
          </button>
        </section>
      </div>
    </ion-content>
    <ion-modal :is-open="viewerOpen" aria-labelledby="drawing-viewer-title" class="drawing-viewer" @didDismiss="viewerOpen = false">
      <div class="drawing-viewer-layout">
        <header class="drawing-viewer-header">
          <h2 id="drawing-viewer-title">{{ dateFormat.format(selectedDay) }}</h2>
          <button type="button" class="dn-header-btn dn-header-btn--icon" aria-label="Zamknij podgląd" @click="viewerOpen = false">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </header>
        <div ref="zoomStage" class="drawing-zoom-stage">
          <canvas
            ref="zoomCanvas"
            :width="DOODLE_WIDTH" :height="DOODLE_HEIGHT"
            :style="{ width: zoom * 100 + '%' }"
            role="img"
            aria-label="Zapisany rysunek"
            @contextrestored="renderZoom"
          />
        </div>
        <div class="drawing-zoom-controls" role="group" aria-label="Powiększenie">
          <button type="button" class="dn-header-btn dn-header-btn--icon" aria-label="Pomniejsz" :disabled="zoom === 1" @click="changeZoom(-0.5)">
            <ion-icon :icon="removeOutline" aria-hidden="true" />
          </button>
          <output aria-live="polite">{{ zoom * 100 }}%</output>
          <button type="button" class="dn-header-btn dn-header-btn--icon" aria-label="Przybliż" :disabled="zoom === 3" @click="changeZoom(0.5)">
            <ion-icon :icon="addOutline" aria-hidden="true" />
          </button>
        </div>
      </div>
    </ion-modal>
    <DuoDoodleModal :is-open="editorOpen" title="Dzienny rysunek" @close="editorOpen = false" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { addOutline, brushOutline, chevronBackOutline, chevronForwardOutline, closeOutline, expandOutline, removeOutline } from 'ionicons/icons'
import type { DuoDoodle } from '~/types/duo'
import { DOODLE_HEIGHT, DOODLE_WIDTH, isDoodleOnDay, redrawDoodle } from '~/utils/duoDoodle'

const { partnership, currentDoodle, readDoodleForDay } = useDuoState()
const route = useRouter().currentRoute
const active = computed(() => route.value.name === 'tabs-drawing')
const today = useDoodleToday()
const selectedDay = ref(today.value)
const editorOpen = ref(false)
const viewerOpen = ref(false)
const zoom = ref(1)
const dayStrip = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const zoomStage = ref<HTMLDivElement | null>(null)
const zoomCanvas = ref<HTMLCanvasElement | null>(null)
const archivedDoodle = ref<DuoDoodle | null>(null)
const loading = ref(false)
const loadFailed = ref(false)
const retryCount = ref(0)

const monthFormat = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' })
const weekdayFormat = new Intl.DateTimeFormat('pl-PL', { weekday: 'short' })
const dateFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
const isToday = computed(() => selectedDay.value.getTime() === today.value.getTime())
const year = computed(() => selectedDay.value.getFullYear())
const month = computed(() => selectedDay.value.getMonth())
const isCurrentMonth = computed(() => year.value === today.value.getFullYear() && month.value === today.value.getMonth())
const days = computed(() => {
  const count = new Date(year.value, month.value + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => new Date(year.value, month.value, index + 1))
})

const doodle = computed(() => {
  if (!isToday.value) return archivedDoodle.value
  const latest = currentDoodle.value
  return latest && latest.partnership_id === partnership.value?.id &&
    isDoodleOnDay(latest.updated_at, today.value) ? latest : null
})

const previewMessage = computed(() => {
  if (!partnership.value) return 'Połączcie się w parę, aby korzystać ze wspólnego płótna.'
  if (loading.value) return 'Wczytywanie rysunku…'
  if (loadFailed.value) return 'Nie udało się wczytać rysunku.'
  return isToday.value ? 'Płótno jest puste.' : 'Brak rysunku z tego dnia.'
})

function selectToday() {
  selectedDay.value = today.value
}

function changeMonth(offset: number) {
  const target = new Date(year.value, month.value + offset, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(selectedDay.value.getDate(), lastDay))
  selectedDay.value = target > today.value ? today.value : target
}

function renderPreview() {
  redrawDoodle(canvas.value, doodle.value?.strokes ?? [])
}

function renderZoom() {
  redrawDoodle(zoomCanvas.value, doodle.value?.strokes ?? [])
}

async function changeZoom(step: number) {
  const stage = zoomStage.value
  const image = zoomCanvas.value
  if (!stage || !image) return

  const stageBounds = stage.getBoundingClientRect()
  const imageBounds = image.getBoundingClientRect()
  const x = (stageBounds.left + stage.clientWidth / 2 - imageBounds.left) / imageBounds.width
  const y = (stageBounds.top + stage.clientHeight / 2 - imageBounds.top) / imageBounds.height
  zoom.value += step
  await nextTick()
  stage.scrollLeft = x * image.offsetWidth - stage.clientWidth / 2
  stage.scrollTop = y * image.offsetHeight - stage.clientHeight / 2
}

function centerSelectedDay() {
  const strip = dayStrip.value
  if (!active.value || !strip?.clientWidth) return
  const button = strip.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (button) strip.scrollLeft = button.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2
}

watch(active, (visible) => {
  if (visible) selectToday()
  else viewerOpen.value = false
}, { immediate: true })
watch(today, (_next, previous) => {
  if (selectedDay.value.getTime() === previous.getTime()) selectToday()
})
watch([active, selectedDay, dayStrip], centerSelectedDay, { flush: 'post' })
watch(dayStrip, (strip, _, onCleanup) => {
  if (!strip) return
  const observer = new ResizeObserver(centerSelectedDay)
  observer.observe(strip)
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

watch([active, selectedDay, isToday, () => partnership.value?.id, retryCount], async ([visible, day, current, pid], _, onCleanup) => {
  archivedDoodle.value = null
  loading.value = false
  loadFailed.value = false
  if (!visible || !pid || current) return

  let stale = false
  onCleanup(() => { stale = true })
  loading.value = true
  try {
    const archived = await readDoodleForDay(pid, day)
    if (!stale) archivedDoodle.value = archived
  } catch {
    if (!stale) loadFailed.value = true
  } finally {
    if (!stale) loading.value = false
  }
})
watch([canvas, doodle], renderPreview, { flush: 'post' })
watch([zoomCanvas, doodle], renderZoom, { flush: 'post' })
watch(viewerOpen, (open) => {
  if (open) zoom.value = 1
})
</script>

<style scoped>
.drawing-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  max-width: 680px;
  margin-inline: auto;
  padding: 14px clamp(16px, 5vw, 36px) 24px;
}

.drawing-month,
.drawing-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.drawing-month h2,
.drawing-card-heading h2 {
  margin: 0;
  font: 600 1.25rem var(--dn-serif);
}

.drawing-month h2::first-letter {
  text-transform: uppercase;
}

.drawing-month button:disabled {
  opacity: 0.4;
}

.drawing-days {
  position: relative;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  padding: 4px 3px 8px;
}

.drawing-days button {
  display: grid;
  gap: 2px;
  flex: 0 0 46px;
  min-height: 54px;
  padding: 7px 4px;
  border: 1px solid var(--dn-line);
  border-radius: 14px;
  background: var(--dn-bg);
  color: var(--dn-ink);
  font-weight: 600;
}

.drawing-days button span {
  font-size: 0.7rem;
  font-weight: 400;
}

.drawing-days button[aria-pressed="true"] {
  background: var(--dn-ink);
  color: var(--dn-bg);
}

.drawing-days button:disabled {
  opacity: 0.4;
}

.drawing-card {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.drawing-preview {
  display: grid;
  place-items: center;
  aspect-ratio: 2 / 1;
  min-height: 132px;
  border: 1px solid var(--dn-line);
  border-radius: 16px;
  background: var(--dn-bg);
}

.drawing-preview canvas {
  display: block;
  width: 100%;
  height: auto;
}

.drawing-preview-button {
  position: relative;
  width: 100%;
  padding: 0;
  overflow: hidden;
  color: var(--dn-ink);
  cursor: zoom-in;
}

.drawing-preview-icon {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--dn-line);
  border-radius: 50%;
  background: var(--dn-bg);
}

.drawing-viewer {
  --width: min(100%, 1100px);
  --height: 100%;
  --background: var(--dn-bg);
}

.drawing-viewer-layout {
  display: grid;
  grid-template: auto minmax(0, 1fr) auto / minmax(0, 1fr);
  height: 100%;
  padding: max(8px, env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom));
}

.drawing-viewer-header,
.drawing-zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-block: 8px;
}

.drawing-viewer-header {
  justify-content: space-between;
}

.drawing-viewer-header h2 {
  margin: 0;
  font: 600 1.25rem var(--dn-serif);
}

.drawing-zoom-stage {
  display: flex;
  overflow: auto;
  overscroll-behavior: contain;
}

.drawing-zoom-stage canvas {
  flex: none;
  height: auto;
  margin-block: auto;
}

.drawing-zoom-controls {
  justify-content: center;
}

.drawing-zoom-controls output {
  min-width: 4em;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.drawing-zoom-controls button:disabled {
  opacity: 0.4;
}

.drawing-empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 12px;
  text-align: center;
  color: var(--dn-muted);
}

.drawing-empty ion-icon {
  font-size: 24px;
}

.drawing-empty p {
  margin: 0;
}

.drawing-edit {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>
