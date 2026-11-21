<template>
  <ion-page class="splash-screen-page">
    <ion-content :fullscreen="true" :scroll-y="false" class="splash-screen-content">
      <!-- Same layout as /spa-loading-template.html, so the boot hand-off is invisible -->
      <div class="dn-boot" role="status" aria-label="Ładowanie DuoNest">
        <div class="dn-boot-brand">
          <img src="/logo.svg" alt="DuoNest" class="dn-boot-logo" width="96" height="96" />
          <span class="dn-boot-name">DuoNest</span>
        </div>
        <div class="dn-boot-spinner" aria-hidden="true">
          <span v-for="i in 8" :key="i" :style="{ '--i': i - 1 }"></span>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

const { isAuthenticated, isPaired, isAuthLoading, initializeClientState } = useDuoState()

// Keep the loading screen up long enough not to flash, but never block start-up for long
const MIN_VISIBLE_MS = 600
const MAX_AUTH_WAIT_MS = 3000

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const waitForAuthRestore = () => new Promise<void>((resolve) => {
  if (!isAuthLoading.value) return resolve()
  const startedAt = Date.now()
  const timer = setInterval(() => {
    if (!isAuthLoading.value || Date.now() - startedAt >= MAX_AUTH_WAIT_MS) {
      clearInterval(timer)
      resolve()
    }
  }, 50)
})

onMounted(async () => {
  const minVisible = delay(MIN_VISIBLE_MS)
  try {
    initializeClientState()
    // Session cached locally -> route right away; otherwise give Firebase a moment to restore it
    if (!isAuthenticated.value) {
      await waitForAuthRestore()
    }
    await minVisible

    if (!isAuthenticated.value) {
      await navigateTo('/welcome', { replace: true })
    } else if (!isPaired.value) {
      await navigateTo('/pairing', { replace: true })
    } else {
      await navigateTo('/tabs/nest', { replace: true })
    }
  } catch (err) {
    console.error('Splash navigation error:', err)
    await navigateTo('/welcome', { replace: true })
  }
})
</script>

<style scoped>
.splash-screen-content {
  --background: var(--dn-auth-cream);
}

.dn-boot {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dn-auth-cream);
}

.dn-boot-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.dn-boot-logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
}

.dn-boot-name {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  color: var(--dn-auth-ink);
}

.dn-boot-spinner {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 72px);
  width: 28px;
  height: 28px;
  margin-left: -14px;
}

.dn-boot-spinner span {
  position: absolute;
  left: 12.5px;
  top: 0;
  width: 3px;
  height: 8px;
  border-radius: 2px;
  background: var(--dn-auth-ink);
  opacity: 0.15;
  transform-origin: 1.5px 14px;
  transform: rotate(calc(var(--i) * 45deg));
  animation: dn-boot-fade 0.8s linear infinite;
  animation-delay: calc(var(--i) * 0.1s - 0.8s);
}

@keyframes dn-boot-fade {
  0% { opacity: 1; }
  100% { opacity: 0.15; }
}

@media (prefers-reduced-motion: reduce) {
  .dn-boot-spinner span {
    animation-duration: 1.6s;
  }
}
</style>
