<template>
  <Teleport to="body">
    <Transition name="duo-confirm-fade">
      <div
        v-if="confirmState.isOpen"
        class="duo-confirm-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descId"
        @click.self="handleCancel"
      >
        <div class="duo-confirm-card" ref="cardRef">
          <!-- Icon Glow Badge -->
          <div class="duo-confirm-badge-wrap">
            <div
              class="duo-confirm-icon-badge"
              :class="[`badge-${confirmState.type}`, `badge-icon-${confirmState.icon}`]"
            >
              <!-- TRASH ICON -->
              <svg
                v-if="confirmState.icon === 'trash'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="confirm-svg"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>

              <!-- WARNING ICON -->
              <svg
                v-else-if="confirmState.icon === 'warning'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="confirm-svg"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>

              <!-- LOGOUT ICON -->
              <svg
                v-else-if="confirmState.icon === 'logout'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="confirm-svg"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>

              <!-- UNLINK ICON -->
              <svg
                v-else-if="confirmState.icon === 'unlink'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="confirm-svg"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>

              <!-- HEART ICON -->
              <svg
                v-else-if="confirmState.icon === 'heart'"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="confirm-svg"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>

              <!-- INFO ICON DEFAULT -->
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="confirm-svg"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
          </div>

          <!-- Header & Message -->
          <div class="duo-confirm-header">
            <h3 :id="titleId" class="duo-confirm-title">{{ confirmState.title }}</h3>
            <p :id="descId" class="duo-confirm-desc">{{ confirmState.message }}</p>
          </div>

          <!-- Item Highlight (if provided) -->
          <div v-if="confirmState.itemHighlight" class="duo-confirm-highlight">
            <span class="highlight-text">{{ confirmState.itemHighlight }}</span>
          </div>

          <!-- Action Buttons -->
          <div class="duo-confirm-actions">
            <button
              ref="cancelBtnRef"
              type="button"
              class="duo-confirm-btn duo-confirm-cancel-btn"
              @click="handleCancel"
            >
              {{ confirmState.cancelText || 'Anuluj' }}
            </button>
            <button
              ref="confirmBtnRef"
              type="button"
              class="duo-confirm-btn duo-confirm-submit-btn"
              :class="`btn-${confirmState.type}`"
              @click="handleConfirm"
            >
              {{ confirmState.confirmText || 'Potwierdź' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useConfirm } from '~/composables/useConfirm'

const { confirmState, handleConfirm, handleCancel } = useConfirm()

const titleId = 'duo-confirm-title-' + Math.random().toString(36).substring(2, 9)
const descId = 'duo-confirm-desc-' + Math.random().toString(36).substring(2, 9)

const cardRef = ref<HTMLElement | null>(null)
const confirmBtnRef = ref<HTMLButtonElement | null>(null)
const cancelBtnRef = ref<HTMLButtonElement | null>(null)

const onKeydown = (e: KeyboardEvent) => {
  if (!confirmState.value.isOpen) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    handleCancel()
  } else if (e.key === 'Enter') {
    // If cancel button is currently focused, do not intercept Enter
    if (document.activeElement === cancelBtnRef.value) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    handleConfirm()
  }
}

watch(
  () => confirmState.value.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      // Default focus on confirm button for smooth keyboard accessibility
      if (confirmState.value.danger) {
        // If danger, focus cancel by default for safety, or confirm
        cancelBtnRef.value?.focus()
      } else {
        confirmBtnRef.value?.focus()
      }
    }
  }
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<style scoped>
/* Bottom card in the DuoNest Minimal style: serif title, stacked pill buttons */
.duo-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  background: rgba(28, 27, 25, 0.32);
  box-sizing: border-box;
}

.duo-confirm-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 28px;
  padding: 28px 22px 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  box-shadow: 0 24px 60px -24px rgba(28, 27, 25, 0.35);
}

.duo-confirm-badge-wrap {
  margin-bottom: 18px;
}

.duo-confirm-icon-badge {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dn-cream, #f6f2e7);
  color: var(--dn-ink, #1c1b19);
}

.confirm-svg {
  width: 22px;
  height: 22px;
}

.duo-confirm-icon-badge.badge-danger {
  background: #fcefec;
  color: var(--dn-danger, #c2412d);
}

.duo-confirm-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.duo-confirm-title {
  margin: 0;
  font-family: var(--dn-serif, 'Fraunces', Georgia, serif);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--dn-ink, #1c1b19);
}

.duo-confirm-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--dn-muted, #6b6e75);
}

.duo-confirm-highlight {
  width: 100%;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--dn-field, #f5f6f8);
  border: 1px solid var(--dn-field-line, #e3e6eb);
  box-sizing: border-box;
}

.highlight-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--dn-ink, #1c1b19);
  word-break: break-word;
}

.duo-confirm-actions {
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  width: 100%;
  margin-top: 24px;
}

.duo-confirm-btn {
  width: 100%;
  min-height: 52px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: none;
  outline: none;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.18s ease;
}

.duo-confirm-btn:active {
  transform: scale(0.98);
}

.duo-confirm-cancel-btn {
  background: var(--dn-soft, #f2f3f5);
  color: var(--dn-ink, #1c1b19);
}

.duo-confirm-submit-btn {
  background: var(--dn-ink, #1c1b19);
  color: #ffffff;
}

.duo-confirm-submit-btn.btn-danger {
  background: var(--dn-danger, #c2412d);
}

.duo-confirm-btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.18);
}

/* ========================================================== */
/* TRANSITIONS                                                */
/* ========================================================== */
.duo-confirm-fade-enter-active,
.duo-confirm-fade-leave-active {
  transition: opacity 0.22s ease;
}

.duo-confirm-fade-enter-active .duo-confirm-card,
.duo-confirm-fade-leave-active .duo-confirm-card {
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
}

.duo-confirm-fade-enter-from,
.duo-confirm-fade-leave-to {
  opacity: 0;
}

.duo-confirm-fade-enter-from .duo-confirm-card,
.duo-confirm-fade-leave-to .duo-confirm-card {
  transform: translateY(24px);
  opacity: 0;
}
</style>
