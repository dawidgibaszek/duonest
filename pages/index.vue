<template>
  <ion-page class="splash-screen-page">
    <ion-content v-if="showDownload" :fullscreen="true" class="download-screen-content">
      <main class="download-screen">
        <div class="download-card">
          <div class="download-logo">
            <img src="/logo.svg" alt="" width="112" height="112">
          </div>
          <h1>DuoNest</h1>
          <p>Jedno gniazdko dla Was dwojga.</p>
          <div class="download-actions">
            <button type="button" class="download-badge" disabled>
              <ion-icon :icon="logoApple" aria-hidden="true" />
              <span><small>Download on the</small><strong>App Store</strong></span>
            </button>
            <button type="button" class="download-badge" disabled>
              <ion-icon :icon="logoGooglePlaystore" aria-hidden="true" />
              <span><small>Get it on</small><strong>Google Play</strong></span>
            </button>
          </div>
        </div>
      </main>
    </ion-content>
    <ion-content v-else :fullscreen="true" :scroll-y="false" class="splash-screen-content">
      <!-- Same layout as /spa-loading-template.html, so the boot hand-off is invisible -->
      <div class="dn-boot" role="status" aria-label="Ładowanie DuoNest">
        <div class="dn-boot-brand">
          <img src="/logo.svg" alt="DuoNest" class="dn-boot-logo" width="96" height="96" />
          <span class="dn-boot-name">DuoNest</span>
        </div>
        <div v-if="authRestoreFailed" class="dn-boot-retry">
          <p>Nie udało się wczytać danych. Ponawiamy połączenie.</p>
          <div class="dn-boot-retry-actions">
            <button type="button" class="dn-button-secondary" :disabled="isLoggingOut" @click="retrySessionRestore">Spróbuj ponownie</button>
            <button type="button" class="dn-button-secondary" :disabled="isLoggingOut" @click="signOutUser">
              {{ isLoggingOut ? 'Wylogowywanie…' : 'Zaloguj się ponownie' }}
            </button>
          </div>
        </div>
        <div v-else class="dn-boot-spinner" aria-hidden="true">
          <span v-for="i in 8" :key="i" :style="{ '--i': i - 1 }"></span>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { logoApple, logoGooglePlaystore } from 'ionicons/icons'
import { onMounted, onScopeDispose, ref, watch } from 'vue'

const showDownload = !import.meta.dev && !Capacitor.isNativePlatform()
const { isAuthenticated, needsEmailVerification, isPaired, isAuthLoading, authRestoreFailed, isLoggingOut,
  initializeClientState, retrySessionRestore, signOutUser } = useDuoState()
const router = useRouter()
const canNavigate = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (showDownload) return
  initializeClientState()
  timer = setTimeout(() => { canNavigate.value = true }, 600)
})
onScopeDispose(() => clearTimeout(timer))

watch([canNavigate, isAuthLoading], ([visible, loading]) => {
  if (!visible || loading || router.currentRoute.value.path !== '/') return
  const next = !isAuthenticated.value ? '/welcome'
    : needsEmailVerification.value ? '/verify-email'
      : isPaired.value ? '/tabs/nest' : '/pairing'
  void navigateTo(next, { replace: true })
})
</script>

<style scoped>
.download-screen-content { --background: var(--dn-cream); }

.download-screen {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: max(28px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom));
}

.download-card {
  width: min(100%, 620px);
  padding: clamp(36px, 8vw, 72px) clamp(18px, 5vw, 48px);
  border: 1px solid var(--dn-cream-deep);
  border-radius: 36px;
  background: #fff;
  text-align: center;
}

.download-logo {
  display: grid;
  place-items: center;
  width: clamp(112px, 23vw, 144px);
  aspect-ratio: 1;
  margin: 0 auto 24px;
  border-radius: 32px;
  background: var(--dn-cream);
}

.download-logo img { width: 76%; height: auto; }
.download-card h1 { margin: 0; font: 650 clamp(40px, 8vw, 68px)/1 var(--dn-serif); color: var(--dn-ink); }
.download-card p { margin: 16px auto 32px; font-size: clamp(15px, 3vw, 18px); color: var(--dn-muted); }
.download-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }

.download-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  border: 1px solid var(--dn-line);
  border-radius: 14px;
  background: var(--dn-ink);
  color: white;
  min-height: 52px;
  min-width: 145px;
  text-align: left;
}

.download-badge:disabled { opacity: .72; cursor: default; }
.download-badge ion-icon { flex: 0 0 auto; font-size: 25px; }
.download-badge small, .download-badge strong { display: block; line-height: 1.12; color: inherit; }
.download-badge small { font-size: 10px; }
.download-badge strong { font-size: 17px; }

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

.dn-boot-retry {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom) + 32px);
  padding: 0 24px;
  text-align: center;
}

.dn-boot-retry-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
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
