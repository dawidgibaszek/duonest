<template>
  <div
    v-if="toast"
    class="duo-toast-container"
    :class="{ 'is-entering': isEntering }"
    role="alert"
    aria-live="polite"
  >
    <div
      ref="cardRef"
      class="duo-toast-card"
      :class="[
        `type-${toast.type}`,
        exitClass,
        { 'is-dragging': isDragging, 'is-paused': isPaused }
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
      @mouseenter="pauseTimer"
      @mouseleave="resumeTimer"
    >
      <!-- Drag Handle / Visual Swipe Indicator -->
      <div class="duo-toast-handle-wrapper" aria-hidden="true">
        <div class="duo-toast-handle"></div>
      </div>

      <div class="duo-toast-body">
        <!-- Type Badge Icon -->
        <div class="duo-toast-icon-wrapper" :class="`icon-${toast.type}`">
          <!-- POINTS / LEVEL UP / ACHIEVEMENTS -->
          <svg
            v-if="toast.type === 'points'"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="toast-svg"
          >
            <path d="M12 2l2.8 6.6 7.2.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.2-.6L12 2z" />
          </svg>

          <!-- LOVE / NUDGES / GESTURES / PARTNER -->
          <svg
            v-else-if="toast.type === 'love'"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="toast-svg"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>

          <!-- CALENDAR / PLANS -->
          <svg
            v-else-if="toast.type === 'calendar'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="toast-svg"
          >
            <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M12 14v4" />
            <path d="M10 16h4" />
          </svg>

          <!-- SHOPPING LIST -->
          <svg
            v-else-if="toast.type === 'shopping'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="toast-svg"
          >
            <circle cx="8" cy="21" r="1.5" />
            <circle cx="19" cy="21" r="1.5" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>

          <!-- TASKS & CHORES -->
          <svg
            v-else-if="toast.type === 'tasks'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="toast-svg"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>

          <!-- MEALS & RECIPES -->
          <svg
            v-else-if="toast.type === 'meals'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="toast-svg"
          >
            <path d="M18 2v8a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2V2" />
            <path d="M15 12v10" />
            <path d="M8 2v10" />
            <path d="M5 2c0 4 3 6 3 6v14" />
          </svg>

          <!-- MOOD -->
          <svg
            v-else-if="toast.type === 'mood'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="toast-svg"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>

          <!-- WARNING / ALERT -->
          <svg
            v-else-if="toast.type === 'warning'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="toast-svg"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
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

        <!-- Content Details -->
        <div class="duo-toast-content">
          <div class="duo-toast-header-row">
            <span class="duo-toast-tag">{{ toast.title || 'DuoNest' }}</span>
            <span class="duo-toast-dot" aria-hidden="true">•</span>
            <span class="duo-toast-time">teraz</span>
          </div>
          <p class="duo-toast-message">{{ toast.message }}</p>
        </div>

        <!-- Quick Dismiss Button -->
        <button
          class="duo-toast-close-btn"
          type="button"
          aria-label="Odrzuć powiadomienie"
          @pointerdown.stop
          @touchstart.stop
          @click.stop="triggerDismiss('up')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Subtle Duration Progress Bar -->
      <div class="duo-toast-progress-track" aria-hidden="true">
        <div
          :key="toast.id"
          class="duo-toast-progress-bar"
          :style="{
            animationDuration: `${toast.duration || 4000}ms`
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDuoState } from '~/composables/useDuoState'
import { playNotificationChime, playNotificationHaptic, pushSettings } from '~/composables/usePushNotifications'

const { activeToastItem, dismissToast } = useDuoState()

const toast = computed(() => activeToastItem.value)

// Drag & touch state
const cardRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const isPaused = ref(false)
const isEntering = ref(false)
const exitClass = ref<string>('')

const dragX = ref(0)
const dragY = ref(0)
const rotation = ref(0)
const dragOpacity = ref(1)

let startX = 0
let startY = 0
let startTime = 0
let activePointerId: number | null = null

// Timer management
let timerId: any = null
let timerRemaining = 4000
let timerStartTime = 0

const cardTransformStyle = computed(() => {
  if (exitClass.value) {
    return {
      '--exit-x': `${dragX.value}px`,
      '--exit-y': `${dragY.value}px`
    }
  }

  if (isDragging.value) {
    return {
      transform: `translate3d(${dragX.value}px, ${dragY.value}px, 0) rotate(${rotation.value}deg)`,
      opacity: dragOpacity.value,
      transition: 'none'
    }
  }

  // Resting position (handled by CSS transitions)
  return {
    transform: 'translate3d(0, 0, 0) rotate(0deg)',
    opacity: 1
  }
})

const startAutoDismissTimer = (duration: number) => {
  clearTimeout(timerId)
  timerRemaining = duration || 4000
  timerStartTime = Date.now()
  isPaused.value = false

  timerId = setTimeout(() => {
    triggerDismiss('up')
  }, timerRemaining)
}

const pauseTimer = () => {
  if (timerId) {
    clearTimeout(timerId)
    timerId = null
    const elapsed = Date.now() - timerStartTime
    timerRemaining = Math.max(timerRemaining - elapsed, 600)
    isPaused.value = true
  }
}

const resumeTimer = () => {
  if (!timerId && !exitClass.value && toast.value) {
    timerStartTime = Date.now()
    isPaused.value = false
    timerId = setTimeout(() => {
      triggerDismiss('up')
    }, timerRemaining)
  }
}

// Watch toast item changes
watch(
  () => toast.value?.id,
  (newId) => {
    if (newId && toast.value) {
      exitClass.value = ''
      dragX.value = 0
      dragY.value = 0
      rotation.value = 0
      dragOpacity.value = 1
      isDragging.value = false

      isEntering.value = true
      setTimeout(() => {
        isEntering.value = false
      }, 350)

      startAutoDismissTimer(toast.value.duration || 4000)

      // In-app alert chime and vibration feedback honoring user preferences
      if (pushSettings.sound !== false) {
        playNotificationChime()
      }
      if (pushSettings.vibrate !== false) {
        playNotificationHaptic([25])
      }
    } else {
      clearTimeout(timerId)
      timerId = null
    }
  },
  { immediate: true }
)

const hapticFeedback = () => {
  try {
    if (pushSettings.vibrate !== false && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
  } catch (_) {}
}

const triggerDismiss = (direction: 'up' | 'left' | 'right') => {
  if (exitClass.value) return
  pauseTimer()
  hapticFeedback()

  if (direction === 'up') exitClass.value = 'dismiss-up'
  else if (direction === 'left') exitClass.value = 'dismiss-left'
  else exitClass.value = 'dismiss-right'

  setTimeout(() => {
    dismissToast()
    exitClass.value = ''
    dragX.value = 0
    dragY.value = 0
    rotation.value = 0
    dragOpacity.value = 1
    isDragging.value = false
  }, 220)
}

// ============================================
// TOUCH GESTURE HANDLING (Mobile native touch)
// ============================================
const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length !== 1 || exitClass.value) return
  isDragging.value = true
  startX = e.touches[0].clientX
  startY = e.touches[0].clientY
  startTime = Date.now()
  pauseTimer()
}

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || e.touches.length !== 1 || exitClass.value) return
  const currentX = e.touches[0].clientX
  const currentY = e.touches[0].clientY
  const deltaX = currentX - startX
  const deltaY = currentY - startY

  // Upward translation 1:1, downward pull has rubber-band resistance
  const offsetY = deltaY < 0 ? deltaY : deltaY * 0.28
  const offsetX = deltaX

  dragX.value = offsetX
  dragY.value = offsetY
  rotation.value = offsetX * 0.04

  // Fade out as it moves away from center/upward
  const dist = Math.abs(offsetX) + (deltaY < 0 ? Math.abs(deltaY) * 1.5 : 0)
  dragOpacity.value = Math.max(0.3, 1 - dist / 220)

  // Prevent default scroll if user is dragging up or sideways
  if (Math.abs(deltaX) > 8 || deltaY < -8) {
    if (e.cancelable) e.preventDefault()
  }
}

const onTouchEnd = () => {
  if (!isDragging.value || exitClass.value) return
  isDragging.value = false

  const deltaX = dragX.value
  const deltaY = dragY.value
  const elapsed = Math.max(Date.now() - startTime, 1)
  const velocityX = deltaX / elapsed
  const velocityY = deltaY / elapsed

  // Upward swipe threshold (flick or drag)
  if (deltaY < -35 || (velocityY < -0.3 && deltaY < -15)) {
    triggerDismiss('up')
    return
  }

  // Left swipe threshold
  if (deltaX < -60 || (velocityX < -0.35 && deltaX < -20)) {
    triggerDismiss('left')
    return
  }

  // Right swipe threshold
  if (deltaX > 60 || (velocityX > 0.35 && deltaX > 20)) {
    triggerDismiss('right')
    return
  }

  // Spring back to center
  dragX.value = 0
  dragY.value = 0
  rotation.value = 0
  dragOpacity.value = 1
  resumeTimer()
}

// ============================================
// POINTER GESTURE HANDLING (Desktop/Mouse test)
// ============================================
const onPointerDown = (e: PointerEvent) => {
  // Only handle primary pointer (left mouse click, not touch to avoid duplicate events)
  if (e.button !== 0 || exitClass.value || e.pointerType === 'touch') return
  isDragging.value = true
  activePointerId = e.pointerId
  startX = e.clientX
  startY = e.clientY
  startTime = Date.now()
  pauseTimer()

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

  const offsetY = deltaY < 0 ? deltaY : deltaY * 0.28
  const offsetX = deltaX

  dragX.value = offsetX
  dragY.value = offsetY
  rotation.value = offsetX * 0.04

  const dist = Math.abs(offsetX) + (deltaY < 0 ? Math.abs(deltaY) * 1.5 : 0)
  dragOpacity.value = Math.max(0.3, 1 - dist / 220)
}

const onPointerUp = (e: PointerEvent) => {
  if (!isDragging.value || exitClass.value || e.pointerId !== activePointerId) return
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch (_) {}
  activePointerId = null
  onTouchEnd()
}

// Keyboard escape dismissal for accessibility
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
.duo-toast-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding-top: max(env(safe-area-inset-top), 10px);
  padding-left: 14px;
  padding-right: 14px;
  padding-bottom: 12px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  pointer-events: none;
  z-index: 999999;
}

/* Base Card */
.duo-toast-card {
  pointer-events: auto;
  position: relative;
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow:
    0 16px 36px -8px rgba(15, 23, 42, 0.16),
    0 6px 18px -3px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.22s ease;
}

.duo-toast-card:active {
  cursor: grabbing;
}

.duo-toast-card.is-dragging {
  cursor: grabbing;
  box-shadow:
    0 22px 42px -6px rgba(15, 23, 42, 0.22),
    0 8px 24px -2px rgba(15, 23, 42, 0.12);
}

/* Enter Animation */
.is-entering .duo-toast-card {
  animation: duoToastEnter 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes duoToastEnter {
  0% {
    opacity: 0;
    transform: translate3d(0, -45px, 0) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

/* Exit Animations */
.duo-toast-card.dismiss-up {
  transform: translate3d(var(--exit-x, 0), -120px, 0) scale(0.9) !important;
  opacity: 0 !important;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease !important;
}

.duo-toast-card.dismiss-left {
  transform: translate3d(-120vw, var(--exit-y, 0), 0) rotate(-16deg) !important;
  opacity: 0 !important;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease !important;
}

.duo-toast-card.dismiss-right {
  transform: translate3d(120vw, var(--exit-y, 0), 0) rotate(16deg) !important;
  opacity: 0 !important;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease !important;
}

/* Drag Handle */
.duo-toast-handle-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 6px;
  padding-bottom: 2px;
}

.duo-toast-handle {
  width: 38px;
  height: 4px;
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.45);
  transition: background-color 0.2s ease, width 0.2s ease;
}

.duo-toast-card:hover .duo-toast-handle,
.duo-toast-card.is-dragging .duo-toast-handle {
  background: rgba(100, 116, 139, 0.65);
  width: 44px;
}

/* Main Body */
.duo-toast-body {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 14px 10px 14px;
}

/* Icon Badges */
.duo-toast-icon-wrapper {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.toast-svg {
  width: 20px;
  height: 20px;
}

/* Type variations */
.icon-points {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
}

.icon-love {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.35);
}

.icon-calendar {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.icon-shopping {
  background: linear-gradient(135deg, #0d9488 0%, #059669 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
}

.icon-tasks {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
}

.icon-meals {
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
}

.icon-mood {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
}

.icon-warning {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.35);
}

.icon-success {
  background: linear-gradient(135deg, #0f172a 0%, #0d9488 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
}

/* Content details */
.duo-toast-content {
  flex: 1;
  min-width: 0;
}

.duo-toast-header-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.duo-toast-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #0f172a;
}

.type-love .duo-toast-tag { color: #e11d48; }
.type-points .duo-toast-tag { color: #d97706; }
.type-calendar .duo-toast-tag { color: #4f46e5; }
.type-shopping .duo-toast-tag { color: #0d9488; }
.type-tasks .duo-toast-tag { color: #0f172a; }
.type-mood .duo-toast-tag { color: #7c3aed; }
.type-warning .duo-toast-tag { color: #ea580c; }

.duo-toast-dot {
  font-size: 10px;
  color: #94a3b8;
}

.duo-toast-time {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
}

.duo-toast-message {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.35;
  font-weight: 600;
  color: #0f172a;
  word-break: break-word;
}

/* Close Button */
.duo-toast-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(241, 245, 249, 0.85);
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: all 0.15s ease;
}

.duo-toast-close-btn svg {
  width: 14px;
  height: 14px;
}

.duo-toast-close-btn:hover {
  background: rgba(226, 232, 240, 1);
  color: #0f172a;
  transform: scale(1.08);
}

.duo-toast-close-btn:active {
  transform: scale(0.92);
}

/* Progress bar */
.duo-toast-progress-track {
  height: 2.5px;
  width: 100%;
  background: rgba(226, 232, 240, 0.5);
  overflow: hidden;
}

.duo-toast-progress-bar {
  height: 100%;
  width: 100%;
  transform-origin: left;
  animation: shrinkProgress linear forwards;
}

.duo-toast-card.is-paused .duo-toast-progress-bar {
  animation-play-state: paused;
}

@keyframes shrinkProgress {
  0% {
    transform: scaleX(1);
  }
  100% {
    transform: scaleX(0);
  }
}

.type-success .duo-toast-progress-bar {
  background: linear-gradient(90deg, #0f172a, #0d9488);
}

.type-love .duo-toast-progress-bar {
  background: linear-gradient(90deg, #f43f5e, #fb7185);
}

.type-points .duo-toast-progress-bar {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.type-calendar .duo-toast-progress-bar {
  background: linear-gradient(90deg, #6366f1, #818cf8);
}

.type-shopping .duo-toast-progress-bar {
  background: linear-gradient(90deg, #0d9488, #14b8a6);
}

.type-tasks .duo-toast-progress-bar {
  background: linear-gradient(90deg, #0f172a, #334155);
}

.type-mood .duo-toast-progress-bar {
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
}

.type-warning .duo-toast-progress-bar {
  background: linear-gradient(90deg, #f97316, #fb923c);
}
</style>
