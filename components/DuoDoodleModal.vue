<template>
  <ion-modal
    :is-open="isOpen"
    @willPresent="handleModalWillPresent"
    @didPresent="handleModalPresented"
    @didDismiss="handleClose"
    class="duo-doodle-modal"
  >
    <div class="doodle-studio-wrapper">
      <!-- TOP HEADER BAR -->
      <div class="doodle-header-bar">
        <button class="doodle-header-btn back-btn" @click="handleClose" title="Wróć">
          <ion-icon :icon="ioniconsCloseOutline" />
        </button>

        <div class="doodle-title-center">
          <div class="doodle-title-row">
            <span class="doodle-title-text">Wspólny rysunek</span>
            <span v-if="isPartnerDrawing" class="doodle-live-badge live-pulse">
              <span class="live-dot"></span>
              {{ partnerUser?.name || 'Partner' }} rysuje!
            </span>
            <span v-else-if="isPartnerOnline" class="doodle-live-badge online">
              <span class="online-dot"></span>
              {{ partnerUser?.name || 'Partner' }} online
            </span>
          </div>
          <span class="doodle-subtitle-text">Rysujcie razem w czasie rzeczywistym</span>
        </div>

        <button class="doodle-header-btn save-btn" @click="handleSave" :disabled="strokes.length === 0" title="Zapisz rysunek">
          <ion-icon :icon="ioniconsCheckmarkOutline" />
          <span>Gotowe</span>
        </button>
      </div>

      <!-- MAIN CANVAS DRAWING AREA (CLEAN RETINA PAPER STYLE) -->
      <div class="doodle-canvas-container" ref="containerRef">
        <canvas
          ref="canvasRef"
          class="doodle-touch-canvas"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
        ></canvas>

        <!-- Empty canvas watermark guide -->
        <div v-if="strokes.length === 0 && !isPartnerDrawing" class="doodle-empty-watermark" @click="focusCanvas">
          <ion-icon :icon="ioniconsBrushOutline" class="watermark-icon" />
          <p>Dotknij i narysuj coś miłego ✨</p>
        </div>
      </div>

      <!-- BOTTOM FLOATING TOOLBAR -->
      <div class="doodle-floating-controls">
        <!-- ROW 1: ACTIONS (TOOLS, BRUSH SIZES, UNDO, CLEAR) -->
        <div class="doodle-actions-row">
          <div class="tool-mode-group">
            <button
              class="doodle-tool-btn"
              :class="{ active: currentTool === 'brush' }"
              @click="setTool('brush')"
              title="Pędzel"
            >
              <ion-icon :icon="ioniconsBrushOutline" />
              <span>Pędzel</span>
            </button>
            <button
              class="doodle-tool-btn"
              :class="{ active: currentTool === 'eraser' }"
              @click="setTool('eraser')"
              title="Gumka"
            >
              <ion-icon :icon="ioniconsColorWandOutline" />
              <span>Gumka</span>
            </button>
          </div>

          <div class="brush-size-group" :class="{ 'eraser-mode': currentTool === 'eraser' }">
            <template v-if="currentTool === 'brush'">
              <button
                v-for="s in brushSizes"
                :key="'brush-' + s.size"
                class="brush-size-btn"
                :class="{ active: currentBrushSize === s.size }"
                @click="setBrushSize(s.size)"
                :title="s.label"
              >
                <span class="brush-dot-preview" :style="{ width: s.dotSize + 'px', height: s.dotSize + 'px', backgroundColor: currentColor }"></span>
              </button>
            </template>
            <template v-else>
              <button
                v-for="s in eraserSizes"
                :key="'eraser-' + s.size"
                class="brush-size-btn eraser-size-btn"
                :class="{ active: currentEraserSize === s.size }"
                @click="setEraserSize(s.size)"
                :title="s.label"
              >
                <span class="eraser-dot-preview" :style="{ width: s.dotSize + 'px', height: s.dotSize + 'px' }"></span>
              </button>
            </template>
          </div>

          <div class="canvas-actions-group">
            <button
              class="action-icon-btn"
              @click="handleUndo"
              :disabled="strokes.length === 0"
              title="Cofnij ostatnią kreskę"
            >
              <ion-icon :icon="ioniconsArrowUndoOutline" />
            </button>
            <button
              class="action-icon-btn danger"
              @click="handleClear"
              :disabled="strokes.length === 0"
              title="Wyczyść wszystko"
            >
              <ion-icon :icon="ioniconsTrashOutline" />
            </button>
          </div>
        </div>

        <!-- ROW 2: COLOR PALETTE (WHEN BRUSH IS ACTIVE) -->
        <div class="doodle-colors-scroll" v-show="currentTool === 'brush'">
          <button
            v-for="col in colorPalette"
            :key="col.value"
            class="doodle-color-btn"
            :class="{ active: currentColor === col.value }"
            :style="{ backgroundColor: col.value }"
            @click="setColor(col.value)"
            :title="col.name"
          >
            <span class="color-selected-check" v-if="currentColor === col.value"></span>
          </button>
        </div>

        <!-- ROW 2 ALTERNATIVE: ERASER INFO BANNER (WHEN ERASER IS ACTIVE) -->
        <div class="doodle-eraser-bar" v-show="currentTool === 'eraser'">
          <div class="eraser-badge">
            <ion-icon :icon="ioniconsColorWandOutline" />
            <span>Tryb gumki</span>
          </div>
          <span class="eraser-hint-text">Wybierz rozmiar i wymazuj kreski</span>
          <button type="button" class="switch-to-brush-btn" @click="setTool('brush')">
            <ion-icon :icon="ioniconsBrushOutline" />
            <span>Pędzel</span>
          </button>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  useDuoState,
  type DuoDoodleStroke
} from '~/composables/useDuoState'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const {
  currentDoodle,
  partnerUser,
  isPartnerOnline,
  isPartnerDrawing,
  partnerLiveStroke,
  saveDoodle,
  clearDoodle,
  broadcastLiveStroke,
  broadcastDrawingStatus
} = useDuoState()

// Elements
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Drawing State
const currentTool = ref<'brush' | 'eraser'>('brush')
const currentColor = ref('#e11d48') // Duo Coral Rose default
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

// 10 Harmonious DuoNest palette colors
const colorPalette = [
  { name: 'Koralowy Róż', value: '#e11d48' },
  { name: 'Granat DuoNest', value: '#0f172a' },
  { name: 'Morski Błękit', value: '#0284c7' },
  { name: 'Turkusowy Cyjan', value: '#06b6d4' },
  { name: 'Szmaragdowa Mięta', value: '#059669' },
  { name: 'Limonkowa Zieleń', value: '#84cc16' },
  { name: 'Złoty Bursztyn', value: '#d97706' },
  { name: 'Ciepły Brąz', value: '#854d0e' },
  { name: 'Lawendowy Fiolet', value: '#7c3aed' },
  { name: 'Różowy Pastel', value: '#ec4899' }
]

// Strokes list (each point is normalized 0..1)
const strokes = ref<DuoDoodleStroke[]>([])
let currentActiveStroke: DuoDoodleStroke | null = null
let isDrawingActive = false
let resizeObserver: ResizeObserver | null = null
let lastBroadcastTime = 0

// Populate strokes from currentDoodle
const loadStrokesFromDoodle = () => {
  if (currentDoodle.value && Array.isArray(currentDoodle.value.strokes)) {
    strokes.value = JSON.parse(JSON.stringify(currentDoodle.value.strokes))
  } else {
    strokes.value = []
  }
}

// Ensure canvas is resized and drawn immediately across animation frames
const triggerCanvasRefresh = () => {
  nextTick(() => {
    initCanvas()
  })
  requestAnimationFrame(() => {
    initCanvas()
  })
  setTimeout(() => {
    initCanvas()
  }, 60)
  setTimeout(() => {
    initCanvas()
  }, 180)
  setTimeout(() => {
    initCanvas()
  }, 350)
}

const handleModalWillPresent = () => {
  loadStrokesFromDoodle()
  triggerCanvasRefresh()
}

const handleModalPresented = () => {
  loadStrokesFromDoodle()
  initCanvas()
  if (containerRef.value) {
    setupResizeObserver(containerRef.value)
  }
}

// Sync with currentDoodle on modal open
watch(() => props.isOpen, (open) => {
  if (open) {
    loadStrokesFromDoodle()
    triggerCanvasRefresh()
  } else {
    if (isDrawingActive) {
      isDrawingActive = false
      broadcastDrawingStatus(false)
    }
  }
})

// Sync if currentDoodle updates in background while modal is open
watch(() => currentDoodle.value, (newDoodle) => {
  if (props.isOpen && !isDrawingActive && newDoodle && Array.isArray(newDoodle.strokes)) {
    strokes.value = JSON.parse(JSON.stringify(newDoodle.strokes))
    redrawFullCanvas()
  }
}, { deep: true })

// Setup ResizeObserver when containerRef is available
const setupResizeObserver = (el: HTMLElement) => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect.width > 20 && entry.contentRect.height > 20) {
        initCanvas()
      }
    }
  })
  resizeObserver.observe(el)
}

watch(containerRef, (el) => {
  if (el) {
    setupResizeObserver(el)
  }
})

// Listen to real-time strokes drawn by partner
watch(() => partnerLiveStroke.value, (live) => {
  if (live && live.stroke && props.isOpen) {
    strokes.value.push(JSON.parse(JSON.stringify(live.stroke)))
    renderStroke(live.stroke)
  }
})

const setTool = (tool: 'brush' | 'eraser') => {
  currentTool.value = tool
}

const setBrushSize = (size: number) => {
  currentBrushSize.value = size
}

const setEraserSize = (size: number) => {
  currentEraserSize.value = size
}

const setColor = (col: string) => {
  currentColor.value = col
  currentTool.value = 'brush'
}

const focusCanvas = () => {
  // Focus handler
}

// Canvas Initialization with DPR scaling (Retina HD crisp rendering)
const initCanvas = () => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const rect = container.getBoundingClientRect()
  if (rect.width <= 10 || rect.height <= 10) return

  // High-DPI scaling: at least 2x, or devicePixelRatio
  const dpr = Math.max(window.devicePixelRatio || 1, 2)
  const targetW = Math.round(rect.width * dpr)
  const targetH = Math.round(rect.height * dpr)

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  redrawFullCanvas()
}

// Redraw all strokes onto the canvas with crisp subpixel anti-aliasing
const redrawFullCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const stroke of strokes.value) {
    drawStrokeOnContext(ctx, stroke, canvas.width, canvas.height)
  }
}

// Draw a single stroke onto the canvas context
const drawStrokeOnContext = (
  ctx: CanvasRenderingContext2D,
  stroke: DuoDoodleStroke,
  width: number,
  height: number
) => {
  const pts = stroke.points
  if (!pts || pts.length < 2) return

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (stroke.isEraser) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.fillStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    let strokeColor = stroke.color || '#e11d48'
    if (strokeColor.toLowerCase() === '#ffffff') {
      strokeColor = '#0f172a'
    }
    ctx.strokeStyle = strokeColor
    ctx.fillStyle = strokeColor
  }

  // Scale line width proportionally to canvas resolution
  const scaleFactor = Math.min(width, height) / 400
  ctx.lineWidth = Math.max(2, stroke.width * scaleFactor)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (pts.length === 2) {
    const x = pts[0] * width
    const y = pts[1] * height
    ctx.beginPath()
    ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  ctx.beginPath()
  const firstX = pts[0] * width
  const firstY = pts[1] * height
  ctx.moveTo(firstX, firstY)

  for (let i = 2; i < pts.length; i += 2) {
    const prevX = pts[i - 2] * width
    const prevY = pts[i - 1] * height
    const currX = pts[i] * width
    const currY = pts[i + 1] * height
    const midX = (prevX + currX) / 2
    const midY = (prevY + currY) / 2
    ctx.quadraticCurveTo(prevX, prevY, midX, midY)
  }

  const lastX = pts[pts.length - 2] * width
  const lastY = pts[pts.length - 1] * height
  ctx.lineTo(lastX, lastY)
  ctx.stroke()
  ctx.restore()
}

const renderStroke = (stroke: DuoDoodleStroke) => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  drawStrokeOnContext(ctx, stroke, canvas.width, canvas.height)
}

const handlePointerDown = (e: PointerEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

  // Ensure canvas is correctly sized prior to drawing
  if (canvas.width <= 300 || canvas.height <= 150) {
    initCanvas()
  }

  try {
    canvas.setPointerCapture(e.pointerId)
  } catch (_) {}

  isDrawingActive = true
  broadcastDrawingStatus(true)

  const rect = canvas.getBoundingClientRect()
  const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

  const isEraserMode = currentTool.value === 'eraser'
  const strokeWidth = isEraserMode ? currentEraserSize.value : currentBrushSize.value

  currentActiveStroke = {
    color: currentColor.value,
    width: strokeWidth,
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
  broadcastDrawingStatus(false)

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
}

const handleUndo = () => {
  if (strokes.value.length === 0) return
  strokes.value.pop()
  redrawFullCanvas()
}

const handleClear = () => {
  strokes.value = []
  redrawFullCanvas()
}

const handleSave = () => {
  const canvas = canvasRef.value
  let previewDataUrl: string | undefined = undefined
  if (canvas) {
    try {
      previewDataUrl = canvas.toDataURL('image/png', 0.92)
    } catch (_) {}
  }

  saveDoodle(strokes.value, previewDataUrl)
  emit('close')
}

const handleClose = () => {
  if (isDrawingActive) {
    isDrawingActive = false
    broadcastDrawingStatus(false)
  }
  emit('close')
}

onMounted(() => {
  if (containerRef.value) {
    setupResizeObserver(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<style scoped>
.duo-doodle-modal {
  --background: #f8fafc;
  --height: 100%;
  --width: 100%;
}

.doodle-studio-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #f8fafc;
  color: #0f172a;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  position: relative;
  overflow: hidden;
}

/* TOP HEADER */
.doodle-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  z-index: 20;
  flex-shrink: 0;
}

.doodle-header-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  border-radius: 9999px;
  padding: 8px 14px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
}

.doodle-header-btn span {
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
}

.doodle-header-btn:active {
  transform: scale(0.96);
  background: #e2e8f0;
}

.back-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  justify-content: center;
  font-size: 20px;
  border-radius: 50%;
  flex-shrink: 0 !important;
}

.save-btn {
  background: #0f172a;
  border: none;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.16);
  flex-shrink: 0 !important;
  white-space: nowrap !important;
}

.save-btn span {
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
}

.save-btn:active:not(:disabled) {
  transform: scale(0.96);
  background: #1e293b;
}

.save-btn:disabled {
  opacity: 0.35;
  pointer-events: none;
  box-shadow: none;
}

.doodle-title-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  min-width: 0;
  padding: 0 6px;
  overflow: hidden;
}

.doodle-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 100%;
}

.doodle-title-text {
  font-family: 'Outfit', -apple-system, sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.2px;
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doodle-subtitle-text {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
  font-weight: 500;
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

.doodle-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
}

.doodle-live-badge.live-pulse {
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #e11d48;
  animation: liveBadgePulse 1.6s infinite ease-in-out;
}

.doodle-live-badge.online {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #16a34a;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #e11d48;
  box-shadow: 0 0 6px rgba(225, 29, 72, 0.6);
}

.online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #16a34a;
}

@keyframes liveBadgePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.03); }
}

/* CANVAS DRAWING BOARD (CLEAN RETINA HIGH DEFINITION PAPER) */
.doodle-canvas-container {
  flex: 1;
  position: relative;
  margin: 12px 16px;
  background-color: #ffffff;
  background-image: radial-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px);
  background-size: 24px 24px;
  border-radius: 22px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.8);
  overflow: hidden;
  touch-action: none;
}

.doodle-touch-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
  cursor: crosshair;
}

.doodle-empty-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  pointer-events: none;
  text-align: center;
}

.watermark-icon {
  font-size: 34px;
  color: #cbd5e1;
}

.doodle-empty-watermark p {
  font-size: 13px;
  font-weight: 500;
  margin: 0;
  color: #94a3b8;
}

/* FLOATING CONTROLS */
.doodle-floating-controls {
  padding: 10px 14px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 20;
  flex-shrink: 0;
}

.doodle-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}

.tool-mode-group {
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 3px;
  gap: 2px;
  flex-shrink: 0;
}

.doodle-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: #64748b;
  padding: 6px 9px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
}

.doodle-tool-btn span {
  white-space: nowrap !important;
  word-break: keep-all !important;
  overflow-wrap: normal !important;
}

.doodle-tool-btn ion-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.doodle-tool-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.brush-size-group {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 3px 5px;
  gap: 3px;
  flex-shrink: 0;
}

.brush-size-btn {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.16s ease;
  flex-shrink: 0;
}

.brush-size-btn.active {
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
  border: 1px solid #cbd5e1;
}

.brush-dot-preview {
  border-radius: 50%;
  display: block;
  transition: transform 0.15s ease;
}

.brush-size-btn.active .brush-dot-preview {
  transform: scale(1.15);
}

/* ERASER SIZE BUTTONS & DOTS */
.eraser-size-btn {
  position: relative;
}

.eraser-size-btn.active {
  background: #ffffff;
  border: 1.5px solid #0f172a;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
}

.eraser-dot-preview {
  border-radius: 50%;
  display: block;
  background: #ffffff;
  border: 1.5px dashed #64748b;
  box-sizing: border-box;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease;
}

.eraser-size-btn.active .eraser-dot-preview {
  border: 2px solid #0f172a;
  background: #f1f5f9;
  transform: scale(1.15);
  box-shadow: 0 0 0 1.5px rgba(15, 23, 42, 0.12);
}

/* ERASER INFO BAR */
.doodle-eraser-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 8px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  animation: fadeIn 0.18s ease;
}

.eraser-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 700;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.eraser-badge ion-icon {
  font-size: 14px;
  color: #64748b;
}

.eraser-hint-text {
  font-size: 11.5px;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.switch-to-brush-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 8px;
  border: none;
  background: #0f172a;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.switch-to-brush-btn:active {
  transform: scale(0.96);
  background: #1e293b;
}

.canvas-actions-group {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.action-icon-btn {
  width: 33px;
  height: 33px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.16s ease;
  flex-shrink: 0;
}

.action-icon-btn:active:not(:disabled) {
  transform: scale(0.92);
  background: #e2e8f0;
}

.action-icon-btn:disabled {
  opacity: 0.35;
  pointer-events: none;
}

.action-icon-btn.danger {
  color: #e11d48;
  background: #fff1f2;
  border-color: #fecdd3;
}

.action-icon-btn.danger:active:not(:disabled) {
  background: #ffe4e6;
}

/* COLORS SCROLL ROW */
.doodle-colors-scroll {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  overflow-x: auto;
  padding: 3px 1px;
  -webkit-overflow-scrolling: touch;
}

.doodle-colors-scroll::-webkit-scrollbar {
  display: none;
}

.doodle-color-btn {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
  cursor: pointer;
  position: relative;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doodle-color-btn:active {
  transform: scale(0.9);
}

.doodle-color-btn.active {
  transform: scale(1.15);
  box-shadow: 0 0 0 2px #0f172a, 0 3px 8px rgba(15, 23, 42, 0.2);
}

.color-selected-check {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

@media (max-width: 360px) {
  .doodle-tool-btn {
    padding: 6px 7px;
    font-size: 11px;
    gap: 3px;
  }
  .brush-size-btn {
    width: 23px;
    height: 23px;
  }
  .action-icon-btn {
    width: 29px;
    height: 29px;
    font-size: 14px;
  }
  .doodle-color-btn {
    width: 27px;
    height: 27px;
  }
}
</style>
