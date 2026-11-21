<template>
  <main v-if="checking" class="update-screen update-screen--checking" role="status">
    <img src="/logo.svg" alt="DuoNest" width="80" height="80">
    <ion-spinner name="crescent" aria-hidden="true" />
    <span class="ion-sr-only">Sprawdzanie aktualizacji</span>
  </main>
  <main v-else class="update-screen" aria-labelledby="duo-update-title">
    <div class="update-card">
      <div class="update-art" aria-hidden="true">
        <img src="/logo.svg" alt="" width="64" height="64">
        <span class="update-icon"><ion-icon :icon="arrowDownOutline" /></span>
      </div>
      <h1 id="duo-update-title" ref="heading" tabindex="-1">Czas na aktualizację</h1>
      <p>Dostępna jest nowa wersja DuoNest. Zaktualizuj aplikację, aby dalej z niej korzystać.</p>
      <a
        v-if="url"
        class="dn-button-primary update-link"
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
      >Przejdź do aktualizacji</a>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { arrowDownOutline } from 'ionicons/icons'

defineProps<{ checking: boolean; url?: string }>()

const heading = ref<HTMLElement>()
watchEffect(() => heading.value?.focus({ preventScroll: true }), { flush: 'post' })
</script>

<style scoped>
.update-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
    max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
  background: var(--dn-bg, #fff);
  color: var(--dn-ink);
}

.update-screen--checking {
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: var(--dn-cream);
}

.update-card {
  width: min(100%, 360px);
  margin: auto;
  text-align: center;
}

.update-art {
  position: relative;
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  margin: 0 auto 30px;
  border-radius: 32px;
  background: var(--dn-cream);
}

.update-icon {
  position: absolute;
  right: -6px;
  bottom: -6px;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 3px solid white;
  border-radius: 50%;
  background: var(--dn-ink);
  color: white;
  font-size: 19px;
}

.update-card h1 {
  margin: 0 0 12px;
  font: 600 clamp(30px, 8vw, 38px)/1.12 var(--dn-serif);
  outline: none;
}

.update-card p {
  margin: 0 auto 28px;
  max-width: 30ch;
  color: var(--dn-muted);
  line-height: 1.6;
}

.update-link {
  width: 100%;
  text-decoration: none;
}
</style>
