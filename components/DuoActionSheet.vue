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
  background: rgba(28, 27, 25, 0.32);
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
  padding: 10px 20px max(20px, env(safe-area-inset-bottom)) 20px;
  box-shadow: none;
  border-top: none;
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
  width: 36px;
  height: 5px;
  background: #d9dce1;
  border-radius: 9999px;
  margin: 0 auto 18px auto;
  flex-shrink: 0;
}

/* HEADER BOX */
.sheet-header-box {
  text-align: left;
  padding: 0 4px 14px;
}

.sheet-title {
  margin: 0;
  font-family: var(--dn-serif, 'Fraunces', Georgia, serif);
  font-size: 24px;
  font-weight: 600;
  color: var(--dn-ink, #1c1b19);
  letter-spacing: -0.01em;
  line-height: 1.2;
  word-break: break-word;
}

.sheet-subtitle {
  margin: 6px 0 0 0;
  font-size: 14px;
  color: var(--dn-muted, #6b6e75);
  font-weight: 400;
  line-height: 1.45;
}

/* BUTTONS LIST */
.sheet-buttons-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

.sheet-action-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 60px;
  padding: 8px 4px;
  border-radius: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--dn-line, #eceef1);
  cursor: pointer;
  transition: opacity 0.16s ease;
  text-align: left;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.sheet-action-item:hover {
  background: transparent;
}

.sheet-action-item:active {
  opacity: 0.6;
}

/* ICON BADGE */
.action-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--dn-soft, #f2f3f5);
  color: var(--dn-ink, #1c1b19);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex-shrink: 0;
}

.sheet-action-item:hover .action-icon-badge {
  background: #e5e6e8;
}

/* TEXT CONTENT */
.action-text-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.action-text-title {
  font-size: 16px;
  font-weight: 500;
  color: #1c1b19;
  line-height: 1.3;
  letter-spacing: -0.2px;
}

.action-text-sub {
  font-size: 11.5px;
  color: #737373;
  margin-top: 2px;
  line-height: 1.3;
}

/* TRAILING ARROW */
.action-trailing-arrow {
  color: #a2a2a2;
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
  background: transparent;
}

.sheet-action-item.is-destructive .action-icon-badge {
  background: #fcefec;
  color: var(--dn-danger, #c2412d);
}

.sheet-action-item.is-destructive .action-text-title {
  color: #c2412d;
}

.sheet-action-item.is-destructive:hover {
  background: transparent;
}

.sheet-action-item.is-destructive:active {
  opacity: 0.6;
}

/* CANCEL BUTTON */
.sheet-cancel-container {
  margin-top: 18px;
  width: 100%;
}

.sheet-cancel-btn {
  width: 100%;
  min-height: 52px;
  border-radius: 999px;
  background: var(--dn-soft, #f2f3f5);
  border: none;
  color: var(--dn-ink, #1c1b19);
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-family: inherit;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.sheet-cancel-btn .cancel-icon {
  display: none;
}

.sheet-cancel-btn:hover {
  background: var(--dn-soft-press, #e6e8eb);
}

.sheet-cancel-btn:active {
  transform: scale(0.98);
  background: var(--dn-soft-press, #e6e8eb);
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
    border: 1px solid rgba(229, 230, 232, 0.9);
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
