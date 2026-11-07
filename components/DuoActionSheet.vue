<template>
  <Teleport to="body">
    <Transition name="duo-sheet-fade">
      <div
        v-if="isOpen"
        class="duo-action-sheet-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="(title || header) ? titleId : undefined"
        @click.self="handleOverlayClick"
      >
        <div
          class="duo-action-sheet-card"
          ref="cardRef"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <!-- Pull Handle -->
          <div class="sheet-handle-pill" aria-hidden="true"></div>

          <!-- Header -->
          <div v-if="title || header || subtitle || subHeader" class="sheet-header-box">
            <h4 v-if="title || header" :id="titleId" class="sheet-title">
              {{ title || header }}
            </h4>
            <p v-if="subtitle || subHeader" class="sheet-subtitle">
              {{ subtitle || subHeader }}
            </p>
          </div>

          <!-- Action Buttons Stack -->
          <div class="sheet-buttons-list">
            <button
              v-for="(btn, idx) in nonCancelButtons"
              :key="idx"
              type="button"
              class="sheet-action-item"
              :class="{
                'is-destructive': btn.role === 'destructive' || btn.danger,
                'has-icon': !!btn.icon
              }"
              @click="handleActionClick(btn)"
            >
              <!-- Icon Container -->
              <div v-if="btn.icon" class="action-icon-badge">
                <ion-icon
                  v-if="typeof btn.icon === 'string' || (typeof btn.icon === 'object' && btn.icon !== null)"
                  :icon="btn.icon"
                />
                <component v-else :is="btn.icon" />
              </div>

              <!-- Label and description -->
              <div class="action-text-col">
                <span class="action-text-title">{{ btn.text }}</span>
                <span v-if="btn.description || btn.subtext" class="action-text-sub">
                  {{ btn.description || btn.subtext }}
                </span>
              </div>

              <!-- Trailing chevron for standard items -->
              <div v-if="btn.role !== 'destructive' && !btn.danger" class="action-trailing-arrow">
                <ion-icon :icon="ioniconsChevronForwardOutline" />
              </div>
            </button>
          </div>

          <!-- Cancel Button -->
          <div class="sheet-cancel-container">
            <button
              type="button"
              class="sheet-cancel-btn"
              @click="handleCancelClick"
            >
              <ion-icon :icon="cancelBtnItem?.icon || ioniconsCloseOutline" class="cancel-icon" />
              <span>{{ cancelBtnItem?.text || cancelText || 'Anuluj' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import {
  chevronForwardOutline as ioniconsChevronForwardOutline,
  closeOutline as ioniconsCloseOutline
} from 'ionicons/icons'

export interface DuoActionSheetButton {
  text: string
  role?: 'destructive' | 'cancel' | string
  icon?: any
  danger?: boolean
  description?: string
  subtext?: string
  handler?: () => boolean | void | Promise<boolean | void>
  data?: any
}

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title?: string
    header?: string
    subtitle?: string
    subHeader?: string
    buttons?: DuoActionSheetButton[]
    actions?: DuoActionSheetButton[]
    cancelText?: string
  }>(),
  {
    title: '',
    header: '',
    subtitle: '',
    subHeader: '',
    cancelText: 'Anuluj'
  }
)

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'dismiss'): void
  (e: 'didDismiss'): void
  (e: 'select', button: DuoActionSheetButton): void
  (e: 'cancel'): void
}>()

const titleId = 'duo-action-sheet-title-' + Math.random().toString(36).substring(2, 9)
const cardRef = ref<HTMLElement | null>(null)

const allButtons = computed<DuoActionSheetButton[]>(() => {
  return props.buttons || props.actions || []
})

const nonCancelButtons = computed(() => {
  return allButtons.value.filter(b => b.role !== 'cancel')
})

const cancelBtnItem = computed(() => {
  return allButtons.value.find(b => b.role === 'cancel')
})

const close = () => {
  emit('update:isOpen', false)
  emit('dismiss')
  emit('didDismiss')
}

const handleOverlayClick = () => {
  handleCancelClick()
}

const handleActionClick = (btn: DuoActionSheetButton) => {
  emit('select', btn)
  close()
  if (btn.handler) {
    try {
      btn.handler()
    } catch (err) {
      console.error('[DuoActionSheet] Handler error:', err)
    }
  }
}

const handleCancelClick = () => {
  emit('cancel')
  close()
  if (cancelBtnItem.value?.handler) {
    try {
      cancelBtnItem.value.handler()
    } catch (err) {
      console.error('[DuoActionSheet] Cancel handler error:', err)
    }
  }
}

// Keyboard ESC handling
const onKeyDown = (e: KeyboardEvent) => {
  if (!props.isOpen) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    handleCancelClick()
  }
}

// Touch swipe-down to dismiss
let touchStartY = 0
let touchCurrentY = 0

const onTouchStart = (e: TouchEvent) => {
  touchStartY = e.touches[0].clientY
  touchCurrentY = touchStartY
}

const onTouchMove = (e: TouchEvent) => {
  touchCurrentY = e.touches[0].clientY
}

const onTouchEnd = () => {
  const diff = touchCurrentY - touchStartY
  if (diff > 55) {
    handleCancelClick()
  }
  touchStartY = 0
  touchCurrentY = 0
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      touchStartY = 0
      touchCurrentY = 0
    }
  }
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown)
  }
})
</script>

<style scoped>
/* OVERLAY & BACKDROP */
.duo-action-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 60000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 0;
  box-sizing: border-box;
  touch-action: manipulation;
}

/* SHEET CARD */
.duo-action-sheet-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 28px 28px 0 0;
  padding: 12px 16px max(18px, env(safe-area-inset-bottom)) 16px;
  box-shadow:
    0 -12px 40px rgba(15, 23, 42, 0.22),
    0 -1px 3px rgba(15, 23, 42, 0.06);
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  animation: duoSheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  max-height: 85vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@keyframes duoSheetSlideUp {
  0% {
    transform: translateY(100%);
    opacity: 0.7;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/* TOP HANDLE PILL */
.sheet-handle-pill {
  width: 38px;
  height: 4.5px;
  background: #cbd5e1;
  border-radius: 9999px;
  margin: 0 auto 12px auto;
  flex-shrink: 0;
}

/* HEADER BOX */
.sheet-header-box {
  text-align: center;
  padding: 0 8px 12px 8px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 8px;
}

.sheet-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.3px;
  line-height: 1.35;
  word-break: break-word;
}

.sheet-subtitle {
  margin: 4px 0 0 0;
  font-size: 12.5px;
  color: #64748b;
  font-weight: 500;
  line-height: 1.4;
}

/* BUTTONS LIST */
.sheet-buttons-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.sheet-action-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.16s ease;
  text-align: left;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.sheet-action-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.sheet-action-item:active {
  transform: scale(0.985);
  background: #f1f5f9;
}

/* ICON BADGE */
.action-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.sheet-action-item:hover .action-icon-badge {
  background: #e2e8f0;
}

/* TEXT CONTENT */
.action-text-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.action-text-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
  letter-spacing: -0.2px;
}

.action-text-sub {
  font-size: 11.5px;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.3;
}

/* TRAILING ARROW */
.action-trailing-arrow {
  color: #94a3b8;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  opacity: 0.65;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.sheet-action-item:hover .action-trailing-arrow {
  opacity: 1;
  transform: translateX(2px);
}

/* DESTRUCTIVE / DANGER ITEM */
.sheet-action-item.is-destructive {
  background: #ffffff;
  border-color: #fee2e2;
}

.sheet-action-item.is-destructive .action-icon-badge {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.sheet-action-item.is-destructive .action-text-title {
  color: #dc2626;
}

.sheet-action-item.is-destructive:hover {
  background: #fff5f5;
  border-color: #fca5a5;
}

.sheet-action-item.is-destructive:active {
  background: #fee2e2;
}

/* CANCEL BUTTON */
.sheet-cancel-container {
  margin-top: 10px;
  padding-top: 6px;
  width: 100%;
}

.sheet-cancel-btn {
  width: 100%;
  height: 48px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.16s ease;
  font-family: inherit;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.sheet-cancel-btn .cancel-icon {
  font-size: 18px;
  color: #64748b;
}

.sheet-cancel-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.sheet-cancel-btn:active {
  transform: scale(0.985);
  background: #e2e8f0;
}

/* TRANSITIONS */
.duo-sheet-fade-enter-active,
.duo-sheet-fade-leave-active {
  transition: opacity 0.22s ease;
}

.duo-sheet-fade-enter-from,
.duo-sheet-fade-leave-to {
  opacity: 0;
}

.duo-sheet-fade-leave-active .duo-action-sheet-card {
  transition: transform 0.2s cubic-bezier(0.4, 0, 1, 1), opacity 0.18s ease;
  transform: translateY(100%);
  opacity: 0;
}

/* DESKTOP RESPONSIVENESS */
@media (min-width: 640px) {
  .duo-action-sheet-overlay {
    justify-content: center;
    padding: 20px;
  }

  .duo-action-sheet-card {
    border-radius: 24px;
    max-width: 440px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    animation: duoModalScaleUp 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    padding: 18px 20px 20px 20px;
  }

  .sheet-handle-pill {
    display: none;
  }

  @keyframes duoModalScaleUp {
    0% {
      transform: scale(0.94) translateY(12px);
      opacity: 0;
    }
    100% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .duo-sheet-fade-leave-active .duo-action-sheet-card {
    transform: scale(0.95) translateY(8px);
    opacity: 0;
  }
}
</style>
