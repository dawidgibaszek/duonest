<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleClose" class="duo-doodle-modal">
    <div class="doodle-studio-wrapper">
      <!-- TOP HEADER BAR -->
      <div class="doodle-header-bar">
        <button class="doodle-header-btn back-btn" @click="handleClose" title="Wróć">
          <ion-icon :icon="ioniconsCloseOutline" />
        </button>

        <div class="doodle-title-center">
          <div class="doodle-title-row">
            <span class="doodle-title-text">Wspólna Tablica</span>
            <span v-if="isPartnerDrawing" class="doodle-live-badge live-pulse">
              <span class="live-dot"></span>
              {{ partnerUser?.name || 'Partner' }} rysuje!
            </span>
            <span v-else-if="isPartnerOnline" class="doodle-live-badge online">
              <span class="online-dot"></span>
              {{ partnerUser?.name || 'Partner' }} widzi na żywo
            </span>
          </div>
          <span class="doodle-subtitle-text">Zostaw miłą wiadomość lub rysunek dla partnera ✨</span>
        </div>

        <button class="doodle-header-btn save-btn" @click="handleSave" :disabled="strokes.length === 0" title="Zapisz na tablicy">
          <ion-icon :icon="ioniconsCheckmarkOutline" />
          <span>Gotowe</span>
        </button>
      </div>

      <!-- MAIN CANVAS DRAWING AREA (LIGHT NOTEBOOK STYLE) -->
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
          <p>Przeciągnij palcem po ekranie, aby narysować...</p>
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
const currentColor = ref('#e11d48') // Duo Coral Rose default
const currentBrushSize = ref(5)

const brushSizes = [
  { size: 2.5, dotSize: 4, label: 'Cienki' },
  { size: 5, dotSize: 7, label: 'Normalny' },
  { size: 10, dotSize: 12, label: 'Gruby' },
  { size: 22, dotSize: 17, label: 'Marker' }
]

// Harmonious DuoNest palette for clean white canvas
const colorPalette = [
  { name: 'Koralowy Róż', value: '#e11d48' },
  { name: 'Granat DuoNest', value: '#0f172a' },
  { name: 'Morski Błękit', value: '#0284c7' },
  { name: 'Szmaragdowa Mięta', value: '#059669' },
  { name: 'Złoty Bursztyn', value: '#d97706' },
  { name: 'Lawendowy Fiolet', value: '#7c3aed' },
  { name: 'Ciepły Brąz', value: '#854d0e' },
  { name: 'Różowy Pastel', value: '#ec4899' }
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
  // Focus handler
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
    let strokeColor = stroke.color || '#e11d48'
    if (strokeColor.toLowerCase() === '#ffffff') {
      strokeColor = '#0f172a'
    }
    ctx.strokeStyle = strokeColor
  }

  const scaleFactor = Math.min(width, height) / 400
  ctx.lineWidth = Math.max(1.5, stroke.width * scaleFactor)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (pts.length === 2) {
    const x = pts[0] * width
    const y = pts[1] * height
    ctx.beginPath()
    ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fillStyle = ctx.strokeStyle
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
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  drawStrokeOnContext(ctx, stroke, canvas.width, canvas.height)
}

const handlePointerDown = (e: PointerEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

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

  const dist = Math.hypot(normX - lastX, normY - lastY)
  if (dist < 0.003) return

  pts.push(normX, normY)
  redrawFullCanvas()

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
      previewDataUrl = canvas.toDataURL('image/png', 0.85)
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
  padding: 12px 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid #e2e8f0;
  z-index: 20;
}

.doodle-header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  border-radius: 9999px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;
}

.doodle-header-btn:active {
  transform: scale(0.96);
  background: #e2e8f0;
}

.back-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  justify-content: center;
  font-size: 20px;
  border-radius: 50%;
}

.save-btn {
  background: #0f172a;
  border: none;
  color: #ffffff;
  box-shadow: 0 3px 12px rgba(15, 23, 42, 0.2);
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
  color: #0f172a;
  letter-spacing: -0.3px;
}

.doodle-subtitle-text {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
  font-weight: 500;
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

/* CANVAS DRAWING BOARD (COZY LIGHT PAPER) */
.doodle-canvas-container {
  flex: 1;
  position: relative;
  margin: 14px 16px;
  background-color: #ffffff;
  background-image: radial-gradient(#e2e8f0 1.2px, transparent 1.2px);
  background-size: 20px 20px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
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
  font-size: 36px;
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
  padding: 12px 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 18px rgba(15, 23, 42, 0.05);
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
  background: #f1f5f9;
  border-radius: 12px;
  padding: 3px;
  gap: 3px;
}

.doodle-tool-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  color: #64748b;
  padding: 6px 12px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.16s ease;
}

.doodle-tool-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.brush-size-group {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 3px 6px;
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
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  cursor: pointer;
  transition: all 0.16s ease;
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
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px;
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
  border: 2.5px solid #ffffff;
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
  transform: scale(1.18);
  box-shadow: 0 0 0 2px #0f172a, 0 3px 8px rgba(15, 23, 42, 0.2);
}

.color-selected-check {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}
</style>
