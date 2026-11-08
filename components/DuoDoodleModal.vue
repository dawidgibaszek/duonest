<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleClose" class="duo-doodle-modal">
    <div class="doodle-studio-wrapper">
      <!-- TOP HEADER BAR -->
      <div class="doodle-header-bar">
        <button class="doodle-header-btn back-btn" @click="handleClose" title="Zamknij">
          <ion-icon :icon="ioniconsCloseOutline" />
        </button>

        <div class="doodle-title-center">
          <div class="doodle-title-row">
            <span class="doodle-title-text">Wspólna Tablica</span>
            <span v-if="isPartnerDrawing" class="doodle-live-badge live-pulse">
              <span class="live-dot"></span>
              {{ partnerUser?.name || 'Partner' }} teraz rysuje!
            </span>
            <span v-else-if="isPartnerOnline" class="doodle-live-badge online">
              <span class="online-dot"></span>
              {{ partnerUser?.name || 'Partner' }} widzi na żywo
            </span>
          </div>
          <span class="doodle-subtitle-text">Narysuj coś słodkiego dla drugiej połówki 🎨</span>
        </div>

        <button class="doodle-header-btn save-btn" @click="handleSave" :disabled="strokes.length === 0" title="Zapisz na tablicy">
          <ion-icon :icon="ioniconsCheckmarkOutline" />
          <span>Gotowe</span>
        </button>
      </div>

      <!-- MAIN CANVAS DRAWING AREA -->
      <div class="doodle-canvas-container" ref="containerRef">
        <!-- Background decorative watermark / pin -->
        <div class="doodle-fridge-pin">
          <span class="pin-head"></span>
        </div>

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
          <p>Przeciągnij palcem, aby zacząć rysować...</p>
        </div>
      </div>

      <!-- BOTTOM FLOATING TOOLBAR -->
      <div class="doodle-floating-controls">
        <!-- ROW 1: ACTIONS (UNDO, CLEAR, ERASER TOGGLE) & SIZES -->
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

          <div class="brush-size-group">
            <button
              v-for="s in brushSizes"
              :key="s.size"
              class="brush-size-btn"
              :class="{ active: currentBrushSize === s.size && currentTool === 'brush' }"
              @click="setBrushSize(s.size)"
              :title="s.label"
            >
              <span class="brush-dot-preview" :style="{ width: s.dotSize + 'px', height: s.dotSize + 'px', backgroundColor: currentColor }"></span>
            </button>
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
const currentColor = ref('#fb7185') // Duo Rose / Coral default
const currentBrushSize = ref(5)

const brushSizes = [
  { size: 2.5, dotSize: 4, label: 'Cienki' },
  { size: 5, dotSize: 8, label: 'Normalny' },
  { size: 10, dotSize: 13, label: 'Gruby' },
  { size: 22, dotSize: 18, label: 'Marker' }
]

const colorPalette = [
  { name: 'Koralowy Róż', value: '#fb7185' },
  { name: 'Świeża Mięta', value: '#34d399' },
  { name: 'Morski Błękit', value: '#38bdf8' },
  { name: 'Słoneczny Złoty', value: '#fbbf24' },
  { name: 'Lawenda', value: '#c084fc' },
  { name: 'Ciepły Pomarańcz', value: '#fb923c' },
  { name: 'Kreda / Biały', value: '#ffffff' },
  { name: 'Ciemny Grafit', value: '#0f172a' }
]

// Strokes list (each point is normalized 0..1)
const strokes = ref<DuoDoodleStroke[]>([])
let currentActiveStroke: DuoDoodleStroke | null = null
let isDrawingActive = false
let resizeObserver: ResizeObserver | null = null
let lastBroadcastTime = 0

// Sync with currentDoodle on modal open
watch(() => props.isOpen, (open) => {
  if (open) {
    if (currentDoodle.value && currentDoodle.value.strokes) {
      // Clone strokes deep to allow safe local edits/undo
      strokes.value = JSON.parse(JSON.stringify(currentDoodle.value.strokes))
    } else {
      strokes.value = []
    }
    nextTick(() => {
      initCanvas()
    })
  } else {
    if (isDrawingActive) {
      isDrawingActive = false
      broadcastDrawingStatus(false)
    }
  }
})

// Listen to real-time strokes drawn by partner
watch(() => partnerLiveStroke.value, (live) => {
  if (live && live.stroke && props.isOpen) {
    // Add partner's stroke to our strokes list and render it
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

const setColor = (col: string) => {
  currentColor.value = col
  currentTool.value = 'brush'
}

const focusCanvas = () => {
  // Focus canvas area
}

// Canvas Initialization with DPR scaling
const initCanvas = () => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const rect = container.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)

  redrawFullCanvas()
}

// Redraw all strokes onto the canvas
const redrawFullCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

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
  if (stroke.isEraser) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color || '#fb7185'
  }

  // Scale stroke width proportionally to canvas size
  const scaleFactor = Math.min(width, height) / 400
  ctx.lineWidth = Math.max(1.5, stroke.width * scaleFactor)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (pts.length === 2) {
    // Single dot
    const x = pts[0] * width
    const y = pts[1] * height
    ctx.beginPath()
    ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fill()
    ctx.restore()
    return
  }

  // Smooth quadratic Bezier curve
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

  // Final point
  const lastX = pts[pts.length - 2] * width
  const lastY = pts[pts.length - 1] * height
  ctx.lineTo(lastX, lastY)
  ctx.stroke()
  ctx.restore()
}

// Render only a single new stroke (incremental rendering without redrawing all)
const renderStroke = (stroke: DuoDoodleStroke) => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  drawStrokeOnContext(ctx, stroke, canvas.width, canvas.height)
}

// Pointer Handlers for drawing
const handlePointerDown = (e: PointerEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

  // Set pointer capture for smooth drawing outside canvas bounds
  try {
    canvas.setPointerCapture(e.pointerId)
  } catch (_) {}

  isDrawingActive = true
  broadcastDrawingStatus(true)

  const rect = canvas.getBoundingClientRect()
  const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

  currentActiveStroke = {
    color: currentColor.value,
    width: currentBrushSize.value,
    points: [normX, normY],
    isEraser: currentTool.value === 'eraser'
  }

  strokes.value.push(currentActiveStroke)
  renderStroke(currentActiveStroke)
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

  // Min movement threshold to avoid excess points
  const dist = Math.hypot(normX - lastX, normY - lastY)
  if (dist < 0.003) return

  pts.push(normX, normY)
  redrawFullCanvas()

  // Real-time live stroke broadcast throttle (approx 60ms)
  const now = Date.now()
  if (now - lastBroadcastTime > 60) {
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
    // Broadcast final completed stroke
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
      previewDataUrl = canvas.toDataURL('image/png', 0.8)
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
    resizeObserver = new ResizeObserver(() => {
      initCanvas()
    })
    resizeObserver.observe(containerRef.value)
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
  --background: #090d16;
  --height: 100%;
  --width: 100%;
}

.doodle-studio-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: radial-gradient(circle at 50% 15%, #131c2e 0%, #090d16 85%);
  color: #f8fafc;
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
  padding: 12px 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 20;
}

.doodle-header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  border-radius: 9999px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.doodle-header-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.16);
}

.back-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  justify-content: center;
  font-size: 20px;
}

.save-btn {
  background: linear-gradient(135deg, #fb7185 0%, #e11d48 100%);
  border: none;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(225, 29, 72, 0.4);
}

.save-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
  box-shadow: none;
}

.doodle-title-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.doodle-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doodle-title-text {
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.3px;
}

.doodle-subtitle-text {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 1px;
}

.doodle-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

.doodle-live-badge.live-pulse {
  background: rgba(244, 63, 94, 0.2);
  border: 1px solid rgba(244, 63, 94, 0.5);
  color: #fda4af;
  animation: liveBadgePulse 1.6s infinite ease-in-out;
}

.doodle-live-badge.online {
  background: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #6ee7b7;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #f43f5e;
  box-shadow: 0 0 8px #f43f5e;
}

.online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
}

@keyframes liveBadgePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.03); }
}

/* CANVAS DRAWING BOARD */
.doodle-canvas-container {
  flex: 1;
  position: relative;
  margin: 12px;
  background-color: #0f172a;
  background-image: 
    radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
  border-radius: 24px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 12px 30px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  touch-action: none;
}

.doodle-fridge-pin {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  pointer-events: none;
}

.pin-head {
  display: block;
  width: 14px;
  height: 14px;
  background: radial-gradient(circle at 35% 35%, #f43f5e, #be123c);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.4);
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
  color: rgba(148, 163, 184, 0.4);
  pointer-events: none;
  text-align: center;
}

.watermark-icon {
  font-size: 38px;
}

.doodle-empty-watermark p {
  font-size: 13px;
  font-weight: 500;
  margin: 0;
}

/* FLOATING CONTROLS */
.doodle-floating-controls {
  padding: 12px 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 20;
}

.doodle-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tool-mode-group {
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 3px;
  gap: 2px;
}

.doodle-tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
}

.doodle-tool-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.brush-size-group {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.brush-size-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.16s ease;
}

.brush-size-btn.active {
  background: rgba(255, 255, 255, 0.18);
}

.brush-dot-preview {
  border-radius: 50%;
  display: block;
}

.canvas-actions-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.action-icon-btn:active:not(:disabled) {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.14);
}

.action-icon-btn:disabled {
  opacity: 0.35;
  pointer-events: none;
}

.action-icon-btn.danger {
  color: #fda4af;
}

.action-icon-btn.danger:active:not(:disabled) {
  background: rgba(244, 63, 94, 0.2);
}

/* COLORS SCROLL ROW */
.doodle-colors-scroll {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 4px;
  -webkit-overflow-scrolling: touch;
}

.doodle-colors-scroll::-webkit-scrollbar {
  display: none;
}

.doodle-color-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  position: relative;
  transition: transform 0.16s ease, border-color 0.16s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doodle-color-btn:active {
  transform: scale(0.9);
}

.doodle-color-btn.active {
  transform: scale(1.15);
  border-color: #ffffff;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
}

.color-selected-check {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
}
</style>
