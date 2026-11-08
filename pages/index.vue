<template>
  <ion-page class="splash-screen-page">
    <ion-content :fullscreen="true" class="splash-screen-content">
      <div class="splash-center">
        <div class="splash-logo-wrap">
          <img src="/favicon.png" alt="DuoNest" class="splash-logo-img" />
        </div>
        <h1 class="splash-brand">DuoNest</h1>
        <p class="splash-tagline">Wspólny Dom &amp; Relacja</p>
        <div class="splash-spinner-wrap">
          <ion-spinner name="crescent" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

const { isAuthenticated, isPaired, initializeClientState } = useDuoState()

onMounted(async () => {
  try {
    initializeClientState()
    if (!isAuthenticated.value) {
      await navigateTo('/login', { replace: true })
    } else if (!isPaired.value) {
      await navigateTo('/pairing', { replace: true })
    } else {
      await navigateTo('/tabs/nest', { replace: true })
    }
  } catch (err) {
    console.error('Splash navigation error:', err)
    await navigateTo('/login', { replace: true })
  }
})
</script>

<style scoped>
.splash-screen-content {
  --background: #0f172a;
}

.splash-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  text-align: center;
}

.splash-logo-wrap {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.splash-logo-img {
  width: 52px;
  height: 52px;
  object-fit: contain;
}

.splash-brand {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.splash-tagline {
  margin: 6px 0 28px 0;
  font-size: 14px;
  font-weight: 500;
  color: #94a3b8;
}

.splash-spinner-wrap {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.splash-spinner-wrap ion-spinner {
  --color: #38bdf8;
  width: 28px;
  height: 28px;
}
</style>
