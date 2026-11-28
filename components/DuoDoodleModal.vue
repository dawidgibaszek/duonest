<template>
  <ion-modal
    :is-open="isOpen"
    :can-dismiss="canDismissDoodle"
    aria-labelledby="doodle-title"
    class="duo-doodle-modal"
    @willPresent="handleModalWillPresent"
    @didPresent="handleModalPresented"
    @didDismiss="emit('close')"
  >
    <div class="doodle-studio">
      <header class="doodle-header">
        <button type="button" class="doodle-icon-btn" aria-label="Zamknij rysunek" @click="handleClose">
          <ion-icon :icon="ioniconsCloseOutline" aria-hidden="true" />
        </button>

        <div class="doodle-heading">
          <h2 id="doodle-title">Wspólny rysunek</h2>
          <p class="doodle-status" role="status" :class="{ drawing: isPartnerDrawing }">
            <span class="doodle-status-dot" aria-hidden="true"></span>
            {{ isPartnerDrawing ? 'Druga osoba rysuje' : isPartnerOnline ? 'Druga osoba online' : 'Druga osoba offline' }}
          </p>
        </div>

        <button
          type="button"
          class="dn-button-primary doodle-save-btn"
          :disabled="isSavingDoodle || (strokes.length === 0 && !currentDoodle?.strokes.length)"
          @click="handleSave"
        >
          Gotowe
        </button>
      </header>

      <div ref="containerRef" class="doodle-canvas-container">
        <div class="doodle-board" :style="{ width: boardWidth + 'px' }">
          <canvas
            ref="canvasRef"
            class="doodle-touch-canvas"
            :width="DOODLE_WIDTH"
            :height="DOODLE_HEIGHT"
            aria-label="Płótno wspólnego rysunku"
            @pointerdown="handlePointerDown"
            @pointermove="handlePointerMove"
            @pointerup="handlePointerUp"
            @pointercancel="handlePointerUp"
            @contextrestored="redrawFullCanvas"
          ></canvas>

          <div v-if="strokes.length === 0 && !isPartnerDrawing" class="doodle-canvas-hint">
            <ion-icon :icon="ioniconsBrushOutline" aria-hidden="true" />
            <p>Dotknij płótna, aby zacząć rysować</p>
          </div>
        </div>
      </div>

      <footer class="doodle-toolbar" aria-label="Narzędzia rysowania">
        <div class="doodle-toolbar-actions">
          <div class="doodle-segment doodle-tool-modes" role="group" aria-label="Narzędzie">
            <button type="button" :aria-pressed="currentTool === 'brush'" @click="setTool('brush')">
              <ion-icon :icon="ioniconsBrushOutline" aria-hidden="true" />
              <span>Pędzel</span>
            </button>
            <button type="button" :aria-pressed="currentTool === 'eraser'" @click="setTool('eraser')">
              <DuoIcon name="eraser" :size="16" aria-hidden="true" />
              <span>Gumka</span>
            </button>
          </div>

          <div class="doodle-canvas-actions">
            <button
              type="button"
              class="doodle-icon-btn"
              :disabled="isClosing || strokes.length === 0"
              aria-label="Cofnij ostatnią kreskę"
              @click="handleUndo"
            >
              <ion-icon :icon="ioniconsArrowUndoOutline" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="doodle-icon-btn"
              :disabled="isClosing || strokes.length === 0"
              aria-label="Wyczyść rysunek"
              @click="handleClear"
            >
              <ion-icon :icon="ioniconsTrashOutline" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="doodle-size-control">
          <span id="doodle-size-label" class="doodle-control-label">Rozmiar</span>
          <div class="doodle-segment doodle-sizes" role="group" aria-labelledby="doodle-size-label">
            <button
              v-for="option in currentSizeOptions"
              :key="option.size"
              type="button"
              :aria-label="option.label"
              :aria-pressed="currentSize === option.size"
              @click="setSize(option.size)"
            >
              <span
                class="doodle-size-dot"
                :class="{ eraser: currentTool === 'eraser' }"
                :style="{ '--dot-size': option.dotSize + 'px' }"
                aria-hidden="true"
              ></span>
            </button>
          </div>
        </div>

        <div class="doodle-color-control" :class="{ inactive: currentTool === 'eraser' }">
          <label class="doodle-control-label" for="doodle-color">Kolor</label>
          <input
            id="doodle-color"
            v-model.number="colorPosition"
            class="doodle-color-range"
            type="range"
            min="0"
            :max="lastColorPosition"
            :disabled="currentTool === 'eraser'"
            :style="{ '--doodle-color': currentColor, '--doodle-spectrum': colorSpectrum }"
            @change="bumpDrawingIdleTimer"
          />
        </div>
      </footer>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDuoState } from '~/composables/useDuoState'
import type { DuoDoodleStroke } from '~/types/duo'
import { isStrokeContinued, newDocumentId } from '~/composables/duo/utils'
import { trackDuoEvent } from '~/composables/useDuoAnalytics'
import DuoIcon from '~/components/DuoIcon.vue'
import { hslToHex } from '~/utils/duoColors'
import { DOODLE_HEIGHT, DOODLE_WIDTH, drawDoodleStroke } from '~/utils/duoDoodle'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const {
  currentUser,
  currentDoodle,
  partnerUser,
  isPartnerOnline,
  isPartnerDrawing,
  partnerLiveStroke,
  triggerToast,
  saveDoodle,
  clearDoodle,
  broadcastLiveStroke,
  broadcastDrawingStatus,
  broadcastToPartner
} = useDuoState()

// Elements
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const boardWidth = ref(0)

// Drawing State
const currentTool = ref<'brush' | 'eraser'>('brush')
const currentBrushSize = ref(5)
const currentEraserSize = ref(16)

const brushSizes = [
  { size: 2.5, dotSize: 4, label: 'Cienki pędzel' },
  { size: 5, dotSize: 7, label: 'Normalny pędzel' },
  { size: 10, dotSize: 12, label: 'Gruby pędzel' },
  { size: 22, dotSize: 17, label: 'Marker' }
]

const eraserSizes = [
  { size: 8, dotSize: 6, label: 'Mała gumka' },
  { size: 16, dotSize: 10, label: 'Średnia gumka' },
  { size: 26, dotSize: 14, label: 'Duża gumka' },
  { size: 44, dotSize: 18, label: 'Szeroka gumka' }
]

const currentSizeOptions = computed(() => currentTool.value === 'eraser' ? eraserSizes : brushSizes)
const currentSize = computed(() => currentTool.value === 'eraser' ? currentEraserSize.value : currentBrushSize.value)

const grayEnd = 32
const hueStart = 56
const firstHue = 348
const lastColorPosition = hueStart + 360
const colorPosition = ref(hueStart)

const getBrushColor = (position: number) => {
  if (position <= grayEnd) {
    return hslToHex(0, 0, 90 * position / grayEnd)
  }
  if (position < hueStart) {
    const progress = (position - grayEnd) / (hueStart - grayEnd)
    return hslToHex(firstHue, 77 * progress, 90 - 40 * progress)
  }
  return hslToHex((firstHue + position - hueStart) % 360, 77, 50)
}

const currentColor = computed(() => getBrushColor(colorPosition.value))
const spectrumPositions = [
  0, grayEnd, (grayEnd + hueStart) / 2, hueStart,
  ...[0, 60, 120, 180, 240, 300].map(hue => hueStart + 360 - firstHue + hue),
  lastColorPosition
]
const spectrumStops = spectrumPositions.map(position => {
  return `${getBrushColor(position)} ${100 * position / lastColorPosition}%`
})
const colorSpectrum = `linear-gradient(to right, ${spectrumStops.join(', ')})`

// Strokes list (each point is normalized 0..1)
const strokes = ref<DuoDoodleStroke[]>([])
let currentActiveStroke: DuoDoodleStroke | null = null
let isDrawingActive = false
let drawingSessionBroadcasted = false
let drawingHeartbeatTimer: ReturnType<typeof setInterval> | null = null
let resizeObserver: ResizeObserver | null = null
let lastBroadcastTime = 0
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
let lastSavedStrokesJson = ''
let savingStrokesJson: string | null = null
let savedSilentlyInSession = false
const IDLE_AUTO_SAVE_MS = 4000
const hasLocalChanges = ref(false)
const isSavingDoodle = ref(false)
let activeSavePromise: Promise<boolean> | null = null
const isClosing = ref(false)

const cancelAutoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
}

const stopDrawingHeartbeat = () => {
  if (drawingHeartbeatTimer) {
    clearInterval(drawingHeartbeatTimer)
    drawingHeartbeatTimer = null
  }
}

const startDrawingSession = () => {
  cancelAutoSave()
  if (!drawingSessionBroadcasted) {
    drawingSessionBroadcasted = true
    broadcastDrawingStatus(true)
  }
  if (!drawingHeartbeatTimer) {
    drawingHeartbeatTimer = setInterval(() => {
      if (drawingSessionBroadcasted && isDrawingActive) {
        broadcastDrawingStatus(true)
      }
    }, 2500)
  }
}

const endDrawingSession = (stopRemoteWidget: boolean) => {
  stopDrawingHeartbeat()
  if (drawingSessionBroadcasted) {
    drawingSessionBroadcasted = false
    broadcastDrawingStatus(false, { stopRemoteWidget })
  }
}

const scheduleAutoSave = (delayMs = IDLE_AUTO_SAVE_MS) => {
  cancelAutoSave()
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null
    void performAutoSave()
  }, delayMs)
}

const performSaveInternal = async (options: { silent?: boolean } = {}): Promise<boolean> => {
  const currentJson = JSON.stringify(strokes.value)
  if (currentJson === lastSavedStrokesJson) {
    hasLocalChanges.value = false
    return true
  }

  if (strokes.value.length === 0) {
    if (lastSavedStrokesJson && lastSavedStrokesJson !== '[]') {
      const cleared = await clearDoodle({ silent: options.silent })
      if (cleared) {
        lastSavedStrokesJson = '[]'
        hasLocalChanges.value = strokes.value.length > 0
        savedSilentlyInSession = false
        endDrawingSession(false)
        return true
      }
      return false
    }
    lastSavedStrokesJson = '[]'
    hasLocalChanges.value = false
    return true
  }

  const canvas = canvasRef.value
  let previewDataUrl: string | undefined = undefined
  if (canvas) {
    try {
      previewDataUrl = canvas.toDataURL('image/png', 0.92)
    } catch (_) {}
  }

  const strokesSnapshot = JSON.parse(currentJson)
  savingStrokesJson = currentJson
  try {
    const saved = await saveDoodle(strokesSnapshot, previewDataUrl, { silent: options.silent })
    if (!saved) return false
    lastSavedStrokesJson = currentJson
    hasLocalChanges.value = JSON.stringify(strokes.value) !== lastSavedStrokesJson
    savedSilentlyInSession = Boolean(options.silent)
    if (!isDrawingActive && !hasLocalChanges.value) {
      endDrawingSession(false)
    }
    return true
  } finally {
    savingStrokesJson = null
  }
}

const performAutoSave = async () => {
  if (!props.isOpen || isClosing.value || activeSavePromise) return
  if (isDrawingActive) {
    scheduleAutoSave(IDLE_AUTO_SAVE_MS)
    return
  }
  if (!hasLocalChanges.value) {
    endDrawingSession(true)
    return
  }
  isSavingDoodle.value = true
  const snapshot = JSON.stringify(strokes.value)
  const saving = performSaveInternal({ silent: true })
  activeSavePromise = saving
  try {
    await saving
  } catch {
    // Keep the draft for the next edit or a manual save.
  } finally {
    isSavingDoodle.value = false
    activeSavePromise = null
    if (props.isOpen && !isClosing.value && snapshot !== JSON.stringify(strokes.value) && hasLocalChanges.value) {
      scheduleAutoSave(IDLE_AUTO_SAVE_MS)
    }
  }
}

// Populate strokes from currentDoodle
const loadStrokesFromDoodle = () => {
  cancelAutoSave()
  stopDrawingHeartbeat()
  drawingSessionBroadcasted = false
  savedSilentlyInSession = false
  hasLocalChanges.value = false
  if (currentDoodle.value && Array.isArray(currentDoodle.value.strokes)) {
    strokes.value = JSON.parse(JSON.stringify(currentDoodle.value.strokes))
  } else {
    strokes.value = []
  }
  lastSavedStrokesJson = JSON.stringify(strokes.value)
}

const handleModalWillPresent = () => {
  loadStrokesFromDoodle()
  void nextTick(redrawFullCanvas)
}

const handleModalPresented = () => {
  loadStrokesFromDoodle()
  redrawFullCanvas()
}

// Sync with currentDoodle on modal open
watch(() => props.isOpen, (open) => {
  if (open) {
    loadStrokesFromDoodle()
    void nextTick(redrawFullCanvas)
  } else {
    cancelAutoSave()
    isDrawingActive = false
    currentActiveStroke = null
    endDrawingSession(true)
  }
})

// Sync if currentDoodle updates in background while modal is open
watch(() => currentDoodle.value, (newDoodle) => {
  if (!props.isOpen) return

  if (!newDoodle || !Array.isArray(newDoodle.strokes) || newDoodle.strokes.length === 0) {
    cancelAutoSave()
    strokes.value = []
    lastSavedStrokesJson = '[]'
    hasLocalChanges.value = false
    savedSilentlyInSession = false
    currentActiveStroke = null
    isDrawingActive = false
    endDrawingSession(false)
    redrawFullCanvas()
    return
  }

  if (newDoodle.author_id === currentUser.value?.id && JSON.stringify(newDoodle.strokes) === savingStrokesJson) {
    lastSavedStrokesJson = savingStrokesJson
    hasLocalChanges.value = JSON.stringify(strokes.value) !== lastSavedStrokesJson
    return
  }

  const incomingStrokes: DuoDoodleStroke[] = Array.isArray(newDoodle.strokes)
    ? JSON.parse(JSON.stringify(newDoodle.strokes))
    : []

  if (!hasLocalChanges.value && !isDrawingActive) {
    strokes.value = incomingStrokes
    lastSavedStrokesJson = JSON.stringify(incomingStrokes)
    redrawFullCanvas()
  } else {
    // Preserve local unsaved strokes and merge in new strokes from partner
    let added = false
    for (const inc of incomingStrokes) {
      let matched = false
      for (let i = 0; i < strokes.value.length; i++) {
        const s = strokes.value[i]
        if (!s) continue
        if (isStrokeContinued(s, inc)) {
          matched = true
          if (inc.points.length > s.points.length) {
            strokes.value[i] = inc
            added = true
          }
          break
        } else if (isStrokeContinued(inc, s)) {
          matched = true
          break
        }
      }
      if (!matched) {
        strokes.value.push(inc)
        added = true
      }
    }
    lastSavedStrokesJson = JSON.stringify(incomingStrokes)
    hasLocalChanges.value = JSON.stringify(strokes.value) !== lastSavedStrokesJson
    if (added) redrawFullCanvas()
  }
}, { deep: true })

// Setup ResizeObserver when containerRef is available
const setupResizeObserver = (el: HTMLElement) => {
  resizeObserver = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    boardWidth.value = Math.min(width, height * DOODLE_WIDTH / DOODLE_HEIGHT)
  })
  resizeObserver.observe(el)
}

watch(containerRef, (el) => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (el) {
    setupResizeObserver(el)
    redrawFullCanvas()
  }
}, { flush: 'post' })

// Listen to real-time strokes drawn by partner
watch(() => partnerLiveStroke.value, (live) => {
  if (live && live.stroke && props.isOpen) {
    const strokeCopy: DuoDoodleStroke = JSON.parse(JSON.stringify(live.stroke))
    let foundIdx = -1
    for (let i = strokes.value.length - 1; i >= 0; i--) {
      if (isStrokeContinued(strokes.value[i], strokeCopy)) {
        foundIdx = i
        break
      }
    }
    if (foundIdx >= 0) {
      if (currentActiveStroke && strokes.value[foundIdx]?.id === currentActiveStroke.id) return
      strokes.value[foundIdx] = strokeCopy
      redrawFullCanvas()
    } else {
      strokes.value.push(strokeCopy)
      const ctx = canvasRef.value?.getContext('2d')
      if (ctx) drawDoodleStroke(ctx, strokeCopy)
    }
  }
})

const bumpDrawingIdleTimer = () => {
  if (!drawingSessionBroadcasted && !hasLocalChanges.value) return
  if (drawingSessionBroadcasted) broadcastDrawingStatus(true)
  if (!isDrawingActive) scheduleAutoSave(IDLE_AUTO_SAVE_MS)
}

const setTool = (tool: 'brush' | 'eraser') => {
  currentTool.value = tool
  bumpDrawingIdleTimer()
}

const setSize = (size: number) => {
  const selectedSize = currentTool.value === 'eraser' ? currentEraserSize : currentBrushSize
  selectedSize.value = size
  bumpDrawingIdleTimer()
}

const redrawFullCanvas = () => {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, DOODLE_WIDTH, DOODLE_HEIGHT)
  for (const stroke of strokes.value) drawDoodleStroke(ctx, stroke)
}

const handlePointerDown = (e: PointerEvent) => {
  if (isClosing.value || isDrawingActive) return
  const canvas = canvasRef.value
  if (!canvas) return

  hasLocalChanges.value = true

  try {
    canvas.setPointerCapture(e.pointerId)
  } catch (_) {}

  isDrawingActive = true
  startDrawingSession()

  const rect = canvas.getBoundingClientRect()
  const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

  const isEraserMode = currentTool.value === 'eraser'

  currentActiveStroke = {
    id: newDocumentId('stroke-'),
    color: currentColor.value,
    width: currentSize.value,
    points: [normX, normY],
    isEraser: isEraserMode
  }

  strokes.value.push(currentActiveStroke)
  redrawFullCanvas()
  lastBroadcastTime = Date.now()
}

const handlePointerMove = (e: PointerEvent) => {
  if (!isDrawingActive || !currentActiveStroke) return
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

  const pts = currentActiveStroke.points
  const lastX = pts[pts.length - 2]
  const lastY = pts[pts.length - 1]

  const dist = Math.hypot(normX - lastX, normY - lastY)
  if (dist < 0.002) return

  pts.push(normX, normY)
  redrawFullCanvas()

  const now = Date.now()
  if (now - lastBroadcastTime > 50) {
    lastBroadcastTime = now
    broadcastLiveStroke(currentActiveStroke)
  }
}

const handlePointerUp = (e: PointerEvent) => {
  if (!isDrawingActive) return
  isDrawingActive = false

  const canvas = canvasRef.value
  if (canvas) {
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch (_) {}
  }

  if (currentActiveStroke) {
    broadcastLiveStroke(currentActiveStroke)
    currentActiveStroke = null
  }
  scheduleAutoSave(IDLE_AUTO_SAVE_MS)
}

const handleUndo = () => {
  if (strokes.value.length === 0) return
  strokes.value.pop()
  hasLocalChanges.value = JSON.stringify(strokes.value) !== lastSavedStrokesJson
  redrawFullCanvas()
  scheduleAutoSave(2000)
}

const handleClear = () => {
  strokes.value = []
  hasLocalChanges.value = lastSavedStrokesJson !== '[]'
  redrawFullCanvas()
  scheduleAutoSave(1500)
}

const flushBeforeClosing = async (options: { silent?: boolean } = { silent: true }) => {
  if (isClosing.value) return { ok: false, didSave: false }
  isClosing.value = true
  try {
    cancelAutoSave()
    stopDrawingHeartbeat()
    if (isDrawingActive) {
      isDrawingActive = false
      if (currentActiveStroke) broadcastLiveStroke(currentActiveStroke)
      currentActiveStroke = null
    }
    await activeSavePromise
    if (!hasLocalChanges.value) {
      endDrawingSession(true)
      return { ok: true, didSave: false }
    }

    isSavingDoodle.value = true
    if (await performSaveInternal({ silent: options.silent })) {
      endDrawingSession(false)
      return { ok: true, didSave: true }
    }
    triggerToast('Nie udało się zapisać zmian. Spróbuj ponownie.', { type: 'warning' })
    return { ok: false, didSave: false }
  } catch {
    triggerToast('Nie udało się zapisać zmian. Spróbuj ponownie.', { type: 'warning' })
    return { ok: false, didSave: false }
  } finally {
    isSavingDoodle.value = false
    isClosing.value = false
  }
}

const canDismissDoodle = async () => !props.isOpen || (await flushBeforeClosing({ silent: true })).ok

const handleClose = async () => {
  const result = await flushBeforeClosing({ silent: true })
  if (result.ok) emit('close')
}

const handleSave = async () => {
  const wasSavedSilently = savedSilentlyInSession
  const result = await flushBeforeClosing({ silent: false })
  if (!result.ok) return
  if (!result.didSave) {
    trackDuoEvent('duo_doodle_saved')
    triggerToast('Zapisano rysunek na tablicy', { type: 'love' })
    if (wasSavedSilently && currentDoodle.value?.id) {
      void broadcastToPartner('DOODLE_SAVE', { doodleId: currentDoodle.value.id })
    }
  }
  savedSilentlyInSession = false
  emit('close')
}

const handleDocumentVisibilityChange = () => {
  if (!props.isOpen || isClosing.value || typeof document === 'undefined' || document.visibilityState !== 'hidden') return
  cancelAutoSave()
  stopDrawingHeartbeat()
  if (isDrawingActive) {
    isDrawingActive = false
    if (currentActiveStroke) broadcastLiveStroke(currentActiveStroke)
    currentActiveStroke = null
  }
  if (hasLocalChanges.value) {
    void performAutoSave()
  } else {
    endDrawingSession(true)
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleDocumentVisibilityChange)
  }
})

onUnmounted(() => {
  cancelAutoSave()
  endDrawingSession(true)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleDocumentVisibilityChange)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<style scoped>
.duo-doodle-modal {
  --background: var(--dn-bg);
  --border-radius: 0;
  --height: 100%;
  --width: 100%;
}

.doodle-studio {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  box-sizing: border-box;
  height: 100%;
  padding: max(8px, env(safe-area-inset-top))
    max(12px, env(safe-area-inset-right))
    max(8px, env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-left));
  background: var(--dn-bg);
  color: var(--dn-ink);
  user-select: none;
  -webkit-user-select: none;
}

.doodle-header {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.doodle-heading h2 {
  margin: 0;
  font-family: var(--dn-serif);
  font-size: clamp(1.125rem, 5vw, 1.625rem);
  font-weight: 600;
  line-height: 1.1;
}

.doodle-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
  color: var(--dn-muted);
  font-size: 0.75rem;
  line-height: 1.2;
}

.doodle-status-dot {
  flex: 0 0 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dn-faint);
}

.doodle-status.drawing {
  color: var(--dn-ink);
}

.doodle-status.drawing .doodle-status-dot {
  background: var(--dn-ink);
}

.doodle-icon-btn,
.doodle-segment button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 999px;
  color: var(--dn-ink);
  cursor: pointer;
  touch-action: manipulation;
}

.doodle-icon-btn {
  border: 1px solid var(--dn-line);
  background: var(--dn-bg);
  font-size: 20px;
}

.doodle-icon-btn:disabled {
  opacity: 0.42;
  cursor: default;
}

.doodle-save-btn {
  min-height: 44px;
  padding: 0 14px;
  font-size: 0.875rem;
}

.doodle-canvas-container {
  display: grid;
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  place-items: center;
  min-height: 0;
  margin: 8px;
}

.doodle-board {
  position: relative;
}

.doodle-board::before {
  content: '';
  position: absolute;
  inset: -8px;
  border: 1px solid var(--dn-line);
  border-radius: 24px;
  pointer-events: none;
}

.doodle-touch-canvas {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
  cursor: crosshair;
}

.doodle-canvas-hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  padding: 12px;
  color: var(--dn-muted);
  text-align: center;
  pointer-events: none;
}

.doodle-canvas-hint ion-icon {
  padding: 12px;
  border: 1px solid var(--dn-line);
  border-radius: 50%;
  background: var(--dn-bg);
  color: var(--dn-ink);
  font-size: 24px;
}

.doodle-canvas-hint p {
  margin: 0;
  font-size: 0.8125rem;
}

.doodle-toolbar {
  display: grid;
  gap: 6px 12px;
  box-sizing: border-box;
  width: min(100%, 640px);
  justify-self: center;
  padding: 8px;
  border: 1px solid var(--dn-line);
  border-radius: 24px;
  background: var(--dn-bg);
}

.doodle-toolbar-actions,
.doodle-size-control,
.doodle-color-control {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.doodle-canvas-actions {
  display: flex;
  gap: 4px;
}

.doodle-segment {
  display: grid;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--dn-line);
  border-radius: 999px;
  background: var(--dn-soft);
}

.doodle-tool-modes {
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.doodle-segment button {
  gap: 4px;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 600;
}

.doodle-segment button ion-icon {
  font-size: 16px;
}

.doodle-segment button[aria-pressed="true"] {
  background: var(--dn-ink);
  color: var(--dn-bg);
}

.doodle-size-control {
  justify-content: space-between;
}

.doodle-sizes {
  grid-template-columns: repeat(4, 44px);
}

.doodle-size-dot {
  width: var(--dot-size);
  height: var(--dot-size);
  border: 1.5px solid currentColor;
  border-radius: 50%;
  background: currentColor;
}

.doodle-size-dot.eraser {
  background: transparent;
}

.doodle-control-label {
  flex: 0 0 4rem;
  padding-inline-start: 4px;
  color: var(--dn-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}

.doodle-color-control.inactive {
  opacity: 0.45;
}

.doodle-color-range {
  flex: 1;
  min-width: 0;
  height: 44px;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
  touch-action: none;
}

.doodle-color-range:disabled {
  cursor: default;
}

.doodle-color-range::-webkit-slider-runnable-track {
  height: 12px;
  border-radius: 999px;
  background: var(--doodle-spectrum);
  box-shadow: inset 0 0 0 1px var(--dn-line);
}

.doodle-color-range::-moz-range-track {
  height: 12px;
  border-radius: 999px;
  background: var(--doodle-spectrum);
  box-shadow: inset 0 0 0 1px var(--dn-line);
}

.doodle-color-range::-webkit-slider-thumb {
  width: 28px;
  height: 28px;
  margin-top: -8px;
  border: 3px solid var(--dn-bg);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--dn-muted);
  background: var(--doodle-color);
  appearance: none;
  -webkit-appearance: none;
}

.doodle-color-range::-moz-range-thumb {
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  border: 3px solid var(--dn-bg);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--dn-muted);
  background: var(--doodle-color);
}

.doodle-studio :is(button, input):focus-visible {
  outline: 2px solid var(--dn-ink);
  outline-offset: 2px;
}

@media (min-width: 560px) {
  .doodle-toolbar {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .doodle-toolbar-actions {
    grid-column: 1 / -1;
    justify-content: space-between;
  }

  .doodle-tool-modes {
    flex: 0 1 260px;
  }

  .doodle-color-control .doodle-control-label {
    flex-basis: auto;
  }
}

@media (min-width: 650px) and (max-height: 480px) and (orientation: landscape) {
  .doodle-studio {
    grid-template-columns: minmax(0, 1fr) 280px;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .doodle-header {
    grid-column: 1 / -1;
  }

  .doodle-toolbar {
    grid-template-columns: minmax(0, 1fr);
    align-self: end;
  }
}
</style>
