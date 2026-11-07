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
/* ========================================================== */
/* OVERLAY & BACKDROP                                         */
/* ========================================================== */
.duo-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-sizing: border-box;
}

/* ========================================================== */
/* MODAL CARD                                                 */
/* ========================================================== */
.duo-confirm-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  border-radius: 24px;
  padding: 24px 20px 20px;
  box-shadow:
    0 25px 50px -12px rgba(15, 23, 42, 0.28),
    0 0 0 1px rgba(226, 232, 240, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  transform-origin: center center;
}

/* ========================================================== */
/* ICON BADGE                                                 */
/* ========================================================== */
.duo-confirm-badge-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.duo-confirm-icon-badge {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.confirm-svg {
  width: 26px;
  height: 26px;
}

/* Badge Color Themes */
.duo-confirm-icon-badge.badge-danger {
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.08);
}

.duo-confirm-icon-badge.badge-warning {
  background: #fffbeb;
  border: 1.5px solid #fde68a;
  color: #d97706;
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.08);
}

.duo-confirm-icon-badge.badge-info,
.duo-confirm-icon-badge.badge-primary {
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
}

.duo-confirm-icon-badge.badge-icon-logout,
.duo-confirm-icon-badge.badge-icon-unlink {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  color: #0f172a;
  box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.06);
}

/* ========================================================== */
/* HEADER & TEXTS                                             */
/* ========================================================== */
.duo-confirm-header {
  text-align: center;
  width: 100%;
}

.duo-confirm-title {
  margin: 0 0 8px;
  font-size: 17.5px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.3px;
  line-height: 1.3;
}

.duo-confirm-desc {
  margin: 0;
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.5;
  word-break: break-word;
}

/* ========================================================== */
/* ITEM HIGHLIGHT                                             */
/* ========================================================== */
.duo-confirm-highlight {
  width: 100%;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  text-align: center;
  box-sizing: border-box;
}

.highlight-text {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

/* ========================================================== */
/* ACTION BUTTONS                                             */
/* ========================================================== */
.duo-confirm-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 20px;
}

.duo-confirm-btn {
  flex: 1;
  height: 44px;
  border-radius: 13px;
  font-size: 13.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  outline: none;
  border: none;
  font-family: inherit;
  padding: 0 14px;
}

.duo-confirm-cancel-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.duo-confirm-cancel-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.duo-confirm-cancel-btn:active {
  transform: scale(0.97);
}

.duo-confirm-cancel-btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.2);
}

/* Confirm Submit Themes */
.duo-confirm-submit-btn.btn-danger {
  background: #ef4444;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.32);
}

.duo-confirm-submit-btn.btn-danger:hover {
  background: #dc2626;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  transform: translateY(-1px);
}

.duo-confirm-submit-btn.btn-danger:active {
  transform: scale(0.97);
}

.duo-confirm-submit-btn.btn-warning {
  background: #f59e0b;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.32);
}

.duo-confirm-submit-btn.btn-warning:hover {
  background: #d97706;
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
  transform: translateY(-1px);
}

.duo-confirm-submit-btn.btn-warning:active {
  transform: scale(0.97);
}

.duo-confirm-submit-btn.btn-primary,
.duo-confirm-submit-btn.btn-info {
  background: #0f172a;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.28);
}

.duo-confirm-submit-btn.btn-primary:hover,
.duo-confirm-submit-btn.btn-info:hover {
  background: #1e293b;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.36);
  transform: translateY(-1px);
}

.duo-confirm-submit-btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.2);
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
  transform: scale(0.92) translateY(10px);
  opacity: 0;
}
</style>
