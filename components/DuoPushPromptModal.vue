<template>
  <Teleport to="body">
    <transition name="duo-push-fade">
      <div
        v-if="isPostPairingPromptOpen"
        class="duo-push-overlay"
        @click.self="declinePostPairingPrompt"
      >
        <div class="duo-push-modal-card">
          <!-- Top Heart Glow Icon -->
          <div class="duo-push-badge-row">
            <div class="duo-push-icon-glow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="bell-svg">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div class="heart-sub-badge">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Title & Description -->
          <div class="duo-push-header">
                        <h3 class="duo-push-title">Bądźcie w kontakcie</h3>
            <p class="duo-push-desc">
              Chcesz wiedzieć od razu, gdy <strong>{{ partnerDisplayName }}</strong> przyśle Ci gest bliskości, zmieni nastrój lub dopisze coś do listy zakupów?
            </p>
          </div>

          <!-- Feature Bullets -->
          <div class="duo-push-benefits">
            <div class="benefit-item">
              <div class="benefit-icon-box love-bg">
                <svg viewBox="0 0 24 24" fill="currentColor" class="mini-svg">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <div class="benefit-text">
                <strong>Gesty i bliskość na żywo</strong>
                <span>Puknięcia, buziaki, uściski i aktualizacje nastroju</span>
              </div>
            </div>

            <div class="benefit-item">
              <div class="benefit-icon-box calendar-bg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="mini-svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="benefit-text">
                <strong>Wspólny terminarz & randki</strong>
                <span>Powiadomienia o nowych planach i zrealizowanych celach</span>
              </div>
            </div>

            <div class="benefit-item">
              <div class="benefit-icon-box tasks-bg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="mini-svg">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div class="benefit-text">
                <strong>Zakupy i zadania domowe</strong>
                <span>Wiesz, kiedy {{ partnerDisplayName }} dopisze zakupy lub ukończy zadanie</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="duo-push-actions">
            <button
              type="button"
              class="dn-button-sea duo-push-enable-btn"
              @click="acceptPostPairingPrompt"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="btn-svg">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span>Włącz powiadomienia</span>
            </button>

            <button
              type="button"
              class="duo-push-later-btn"
              @click="declinePostPairingPrompt"
            >
              Może później
            </button>
          </div>

          <p class="duo-push-footnote">
            Możesz zmienić szczegółowe opcje powiadomień w dowolnej chwili w zakładce <em>Relacja → Ustawienia Gniazdka</em>.
          </p>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { usePushNotifications } from '~/composables/usePushNotifications'
import { useDuoGrammar } from '~/composables/duo/useGrammar'

const {
  isPostPairingPromptOpen,
  acceptPostPairingPrompt,
  declinePostPairingPrompt
} = usePushNotifications()

const { partnerDisplayName } = useDuoGrammar()
</script>

<style scoped>
.duo-push-overlay {
  position: fixed;
  inset: 0;
  z-index: 80000;
  background: rgba(28, 27, 25, 0.32);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
}

.duo-push-modal-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 28px;
  border: none;
  box-shadow: 0 24px 60px -24px rgba(28, 27, 25, 0.35);
  padding: 28px 22px 18px;
  text-align: left;
  position: relative;
  overflow: hidden;
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes modalPop {
  0% {
    opacity: 0;
    transform: translateY(24px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Transitions */
.duo-push-fade-enter-active,
.duo-push-fade-leave-active {
  transition: opacity 0.25s ease;
}
.duo-push-fade-enter-from,
.duo-push-fade-leave-to {
  opacity: 0;
}

/* Badge row */
.duo-push-badge-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 18px;
}

.duo-push-icon-glow {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--dn-cream, #f6f2e7);
  color: var(--dn-ink, #1c1b19);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bell-svg {
  width: 24px;
  height: 24px;
}

.heart-sub-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  background: var(--dn-ink, #1c1b19);
  border-radius: 50%;
  border: 2px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.heart-sub-badge svg {
  width: 11px;
  height: 11px;
}

/* Header */
.duo-push-header {
  margin-bottom: 18px;
}

.duo-push-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #1c1b19;
  background: var(--dn-soft);
  border: none;
  border-radius: 9999px;
  padding: 3px 10px;
  margin-bottom: 8px;
}

.duo-push-title {
  font-family: var(--dn-serif, 'Fraunces', Georgia, serif);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--dn-ink, #1c1b19);
  margin: 0 0 8px 0;
}

.duo-push-desc {
  font-size: 15px;
  line-height: 1.5;
  color: var(--dn-muted, #6b6e75);
  margin: 0;
}

.duo-push-desc strong {
  color: #1c1b19;
}

/* Benefits */
.duo-push-benefits {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 22px 0 24px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.benefit-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-svg {
  width: 17px;
  height: 17px;
}

.love-bg {
  background: var(--dn-soft, #f2f3f5);
  color: var(--dn-ink, #1c1b19);
}

.calendar-bg {
  background: var(--dn-soft, #f2f3f5);
  color: var(--dn-ink, #1c1b19);
}

.tasks-bg {
  background: var(--dn-soft, #f2f3f5);
  color: var(--dn-ink, #1c1b19);
}

.benefit-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.benefit-text strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--dn-ink, #1c1b19);
}

.benefit-text span {
  font-size: 13.5px;
  color: #737373;
}

/* Actions */
.duo-push-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.duo-push-enable-btn {
  width: 100%;
  min-height: 52px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-svg {
  width: 18px;
  height: 18px;
}

.duo-push-later-btn {
  min-height: 52px;
  background: var(--dn-soft, #f2f3f5);
  border: none;
  color: var(--dn-ink, #1c1b19);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  padding: 0 20px;
  cursor: pointer;
  border-radius: 999px;
}

.duo-push-later-btn:hover {
  background: var(--dn-soft-press, #e6e8eb);
}

.duo-push-footnote {
  font-size: 11px;
  color: #a2a2a2;
  margin: 12px 0 0 0;
  line-height: 1.35;
}

.duo-push-footnote em {
  font-style: normal;
  color: #737373;
  font-weight: 600;
}
</style>

