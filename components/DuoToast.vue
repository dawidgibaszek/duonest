<template>
  <div
    v-if="toast"
    class="duo-toast-container"
    :class="{ 'is-entering': isEntering }"
    role="status"
    aria-live="polite"
  >
    <div
      ref="cardRef"
      class="duo-toast-pill"
      :class="[
        `type-${toast.type || 'success'}`,
        exitClass,
        { 'is-dragging': isDragging }
      ]"
      :style="cardTransformStyle"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click="triggerDismiss('up')"
    >
      <!-- Mini Icon Dot -->
      <div class="toast-icon-dot" :class="`icon-${toast.type || 'success'}`">
        <!-- POINTS / ACHIEVEMENTS -->
        <svg
          v-if="toast.type === 'points'"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="toast-svg"
        >
          <path d="M12 2l2.8 6.6 7.2.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.2-.6L12 2z" />
        </svg>

        <!-- LOVE / NUDGES -->
        <svg
          v-else-if="toast.type === 'love'"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="toast-svg"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>

        <!-- CALENDAR -->
        <svg
          v-else-if="toast.type === 'calendar'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>

        <!-- SHOPPING -->
        <svg
          v-else-if="toast.type === 'shopping'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <circle cx="8" cy="21" r="1.5" />
          <circle cx="19" cy="21" r="1.5" />
          <path d="M2 2h2l2.6 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.6-7.4H5.1" />
        </svg>

        <!-- TASKS -->
        <svg
          v-else-if="toast.type === 'tasks'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>

        <!-- MEALS -->
        <svg
          v-else-if="toast.type === 'meals'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <path d="M18 2v8a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2V2" />
          <path d="M15 12v10" />
          <path d="M8 2v10" />
          <path d="M5 2c0 4 3 6 3 6v14" />
        </svg>

        <!-- MOVIES -->
        <svg
          v-else-if="toast.type === 'movies'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>

        <!-- WISHLIST -->
        <svg
          v-else-if="toast.type === 'wishlist'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>

        <!-- SAVINGS & GOALS -->
        <svg
          v-else-if="toast.type === 'savings'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
        </svg>

        <!-- MOOD -->
        <svg
          v-else-if="toast.type === 'mood'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>

        <!-- WARNING -->
        <svg
          v-else-if="toast.type === 'warning'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.3"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>

        <!-- DEFAULT / SUCCESS -->
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="toast-svg"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <!-- Message Text -->
      <span class="toast-message" :title="toast.message">{{ toast.message }}</span>

      <!-- Mini Dismiss Button -->
      <button
        class="toast-close-btn"
        type="button"
        aria-label="Zamknij"
        @click.stop="triggerDismiss('up')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDuoState } from '~/composables/useDuoState'

const { activeToastItem, dismissToast } = useDuoState()

const toast = computed(() => activeToastItem.value)

// Drag & touch state
const cardRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const isEntering = ref(false)
const exitClass = ref<string>('')

const dragX = ref(0)
const dragY = ref(0)
const dragOpacity = ref(1)

let startX = 0
let startY = 0
let activePointerId: number | null = null

// Timer management
let timerId: any = null

const cardTransformStyle = computed(() => {
  if (exitClass.value) {
    return {
      '--exit-x': `${dragX.value}px`,
      '--exit-y': `${dragY.value}px`
    }
  }

  if (isDragging.value) {
    return {
      transform: `translate3d(${dragX.value}px, ${dragY.value}px, 0)`,
      opacity: dragOpacity.value,
      transition: 'none'
    }
  }

  return {
    transform: 'translate3d(0, 0, 0)',
    opacity: 1
  }
})

const startAutoDismissTimer = (duration: number) => {
  clearTimeout(timerId)
  // Fast, unobtrusive duration (2400ms default)
  const time = Math.min(duration || 2400, 3200)
  timerId = setTimeout(() => {
    triggerDismiss('up')
  }, time)
}

// Watch toast item changes
watch(
  () => toast.value?.id,
  (newId) => {
    if (newId && toast.value) {
      exitClass.value = ''
      dragX.value = 0
      dragY.value = 0
      dragOpacity.value = 1
      isDragging.value = false

      isEntering.value = true
      setTimeout(() => {
        isEntering.value = false
      }, 260)

      startAutoDismissTimer(toast.value.duration || 2400)
    } else {
      clearTimeout(timerId)
      timerId = null
    }
  },
  { immediate: true }
)

const triggerDismiss = (direction: 'up' | 'left' | 'right') => {
  if (exitClass.value) return
  clearTimeout(timerId)

  if (direction === 'up') exitClass.value = 'dismiss-up'
  else if (direction === 'left') exitClass.value = 'dismiss-left'
  else exitClass.value = 'dismiss-right'

  setTimeout(() => {
    dismissToast()
    exitClass.value = ''
    dragX.value = 0
    dragY.value = 0
    dragOpacity.value = 1
    isDragging.value = false
  }, 190)
}

// Touch Gestures
const onTouchStart = (e: TouchEvent) => {
  if (exitClass.value || e.touches.length !== 1) return
  startX = e.touches[0].clientX
  startY = e.touches[0].clientY
  isDragging.value = true
  clearTimeout(timerId)
}

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || exitClass.value || e.touches.length !== 1) return
  const currentX = e.touches[0].clientX
  const currentY = e.touches[0].clientY
  const deltaX = currentX - startX
  const deltaY = currentY - startY

  const offsetY = deltaY < 0 ? deltaY : deltaY * 0.25
  dragX.value = deltaX
  dragY.value = offsetY

  const dist = Math.abs(deltaX) + (deltaY < 0 ? Math.abs(deltaY) * 1.5 : 0)
  dragOpacity.value = Math.max(0.4, 1 - dist / 180)
}

const onTouchEnd = () => {
  if (!isDragging.value || exitClass.value) return
  isDragging.value = false

  const finalX = dragX.value
  const finalY = dragY.value

  if (finalY < -24) {
    triggerDismiss('up')
  } else if (finalX < -60) {
    triggerDismiss('left')
  } else if (finalX > 60) {
    triggerDismiss('right')
  } else {
    dragX.value = 0
    dragY.value = 0
    dragOpacity.value = 1
    startAutoDismissTimer(1800)
  }
}

// Pointer Events for Desktop Mouse Drag
const onPointerDown = (e: PointerEvent) => {
  if (e.pointerType === 'touch' || exitClass.value) return
  if (e.button !== 0) return

  startX = e.clientX
  startY = e.clientY
  activePointerId = e.pointerId
  isDragging.value = true
  clearTimeout(timerId)

  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch (_) {}
}

const onPointerMove = (e: PointerEvent) => {
  if (!isDragging.value || exitClass.value || e.pointerId !== activePointerId) return
  const currentX = e.clientX
  const currentY = e.clientY
  const deltaX = currentX - startX
  const deltaY = currentY - startY

  const offsetY = deltaY < 0 ? deltaY : deltaY * 0.25
  dragX.value = deltaX
  dragY.value = offsetY

  const dist = Math.abs(deltaX) + (deltaY < 0 ? Math.abs(deltaY) * 1.5 : 0)
  dragOpacity.value = Math.max(0.4, 1 - dist / 180)
}

const onPointerUp = (e: PointerEvent) => {
  if (!isDragging.value || exitClass.value || e.pointerId !== activePointerId) return
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch (_) {}
  activePointerId = null
  onTouchEnd()
}

// Keyboard escape dismissal
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && toast.value) {
    triggerDismiss('up')
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown)
  }
  clearTimeout(timerId)
})
</script>

<style scoped>
/* ========================================================== */
/* CONTAINER                                                  */
/* ========================================================== */
.duo-toast-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding-top: max(env(safe-area-inset-top), 8px);
  padding-left: 12px;
  padding-right: 12px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  pointer-events: none;
  z-index: 999999;
}

/* ========================================================== */
/* MINIMALIST CAPSULE PILL                                    */
/* ========================================================== */
.duo-toast-pill {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  max-width: min(92vw, 380px);
  padding: 6px 12px 6px 10px;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 9999px;
  box-shadow:
    0 10px 24px -4px rgba(15, 23, 42, 0.12),
    0 2px 6px -1px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-y;
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease;
}

.duo-toast-pill:hover {
  border-color: #cbd5e1;
  box-shadow:
    0 12px 28px -4px rgba(15, 23, 42, 0.15),
    0 3px 8px -1px rgba(15, 23, 42, 0.07);
}

.duo-toast-pill:active {
  transform: scale(0.98);
}

/* ========================================================== */
/* ICON DOT                                                   */
/* ========================================================== */
.toast-icon-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-svg {
  width: 12.5px;
  height: 12.5px;
}

/* Type variations - subtle clean tints */
.icon-points {
  background: #fef3c7;
  color: #d97706;
}

.icon-love {
  background: #ffe4e6;
  color: #e11d48;
}

.icon-calendar {
  background: #e0e7ff;
  color: #4338ca;
}

.icon-shopping {
  background: #ccfbf1;
  color: #0f766e;
}

.icon-tasks,
.icon-meals {
  background: #f1f5f9;
  color: #334155;
}

.icon-movies {
  background: #fae8ff;
  color: #a21caf;
}

.icon-wishlist {
  background: #fef9c3;
  color: #a16207;
}

.icon-savings {
  background: #f1f5f9;
  color: #0f172a;
}

.icon-mood {
  background: #ede9fe;
  color: #6d28d9;
}

.icon-warning {
  background: #ffedd5;
  color: #c2410c;
}

.icon-success {
  background: #dcfce7;
  color: #15803d;
}

/* ========================================================== */
/* MESSAGE TEXT                                               */
/* ========================================================== */
.toast-message {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

/* ========================================================== */
/* CLOSE BUTTON                                               */
/* ========================================================== */
.toast-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
  margin-left: 2px;
}

.toast-close-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}

.toast-close-btn svg {
  width: 11px;
  height: 11px;
}

/* ========================================================== */
/* ANIMATIONS                                                 */
/* ========================================================== */
.is-entering .duo-toast-pill {
  animation: duoToastPillEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes duoToastPillEnter {
  0% {
    opacity: 0;
    transform: translate3d(0, -26px, 0) scale(0.94);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

.duo-toast-pill.dismiss-up {
  transform: translate3d(var(--exit-x, 0), -38px, 0) scale(0.92) !important;
  opacity: 0 !important;
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease !important;
}

.duo-toast-pill.dismiss-left {
  transform: translate3d(-100vw, var(--exit-y, 0), 0) !important;
  opacity: 0 !important;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease !important;
}

.duo-toast-pill.dismiss-right {
  transform: translate3d(100vw, var(--exit-y, 0), 0) !important;
  opacity: 0 !important;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease !important;
}

@media (max-width: 420px) {
  .toast-message {
    max-width: 220px;
    font-size: 12.5px;
  }
  .duo-toast-pill {
    padding: 5px 10px 5px 8px;
    min-height: 36px;
  }
}
</style>
