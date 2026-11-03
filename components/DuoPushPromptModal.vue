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
            <span class="duo-push-pill">NOWE POŁĄCZENIE GNIAZDKA</span>
            <h3 class="duo-push-title">Powiadomienia od Partnera 💌</h3>
            <p class="duo-push-desc">
              Chcesz wiedzieć od razu, gdy <strong>{{ postPairingPartnerName || 'Twój Partner' }}</strong> przyśle Ci gest bliskości, zmieni nastrój lub dopisze coś do listy zakupów?
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
                <span>Wiesz kiedy partner dopisze zakupy lub ukończy zadanie</span>
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

const {
  isPostPairingPromptOpen,
  postPairingPartnerName,
  acceptPostPairingPrompt,
  declinePostPairingPrompt
} = usePushNotifications()
</script>

<style scoped>
.duo-push-overlay {
  position: fixed;
  inset: 0;
  z-index: 999998;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.duo-push-modal-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 26px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow:
    0 25px 50px -12px rgba(2, 132, 199, 0.25),
    0 12px 24px -4px rgba(15, 23, 42, 0.12);
  padding: 24px 20px 20px 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes modalPop {
  0% {
    opacity: 0;
    transform: scale(0.92) translateY(20px);
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
  justify-content: center;
  margin-bottom: 12px;
}

.duo-push-icon-glow {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px -4px rgba(2, 132, 199, 0.45);
}

.bell-svg {
  width: 32px;
  height: 32px;
}

.heart-sub-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 26px;
  height: 26px;
  background: #f43f5e;
  border-radius: 50%;
  border: 2px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(244, 63, 94, 0.4);
}

.heart-sub-badge svg {
  width: 14px;
  height: 14px;
}

/* Header */
.duo-push-header {
  margin-bottom: 18px;
}

.duo-push-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #0284c7;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 9999px;
  padding: 3px 10px;
  margin-bottom: 8px;
}

.duo-push-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.duo-push-desc {
  font-size: 13.5px;
  line-height: 1.45;
  color: #475569;
  margin: 0;
  padding: 0 4px;
}

.duo-push-desc strong {
  color: #0f172a;
}

/* Benefits */
.duo-push-benefits {
  background: #f8fafc;
  border-radius: 18px;
  padding: 12px;
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  margin-bottom: 18px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.benefit-icon-box {
  width: 34px;
  height: 34px;
  border-radius: 10px;
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
  background: #ffe4e6;
  color: #f43f5e;
}

.calendar-bg {
  background: #eef2ff;
  color: #6366f1;
}

.tasks-bg {
  background: #e0f2fe;
  color: #0284c7;
}

.benefit-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.benefit-text strong {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
}

.benefit-text span {
  font-size: 11px;
  color: #64748b;
}

/* Actions */
.duo-push-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.duo-push-enable-btn {
  width: 100%;
  padding: 14px 20px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
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
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 13.5px;
  font-weight: 600;
  padding: 10px;
  cursor: pointer;
  border-radius: 12px;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.duo-push-later-btn:hover {
  color: #0f172a;
  background: #f1f5f9;
}

.duo-push-footnote {
  font-size: 11px;
  color: #94a3b8;
  margin: 12px 0 0 0;
  line-height: 1.35;
}

.duo-push-footnote em {
  font-style: normal;
  color: #64748b;
  font-weight: 600;
}
</style>

