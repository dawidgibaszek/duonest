<template>
  <Teleport to="body">
    <main class="offline-screen" aria-labelledby="offline-heading">
      <div class="offline-content">
        <div class="offline-art" aria-hidden="true">
          <img src="/logo.svg" alt="" width="64" height="64">
          <span class="offline-icon"><ion-icon :icon="cloudOfflineOutline" /></span>
        </div>
        <h1 id="offline-heading" ref="heading" tabindex="-1">Brak połączenia</h1>
        <p>Sprawdź połączenie z internetem. Wrócisz do tego miejsca, gdy połączenie się przywróci.</p>
        <button class="dn-button-primary offline-retry" type="button" :disabled="checking" @click="$emit('retry')">
          <ion-spinner v-if="checking" name="crescent" aria-hidden="true" />
          {{ checking ? 'Sprawdzam połączenie…' : 'Spróbuj ponownie' }}
        </button>
      </div>
    </main>
  </Teleport>
</template>

<script setup lang="ts">
import { cloudOfflineOutline } from 'ionicons/icons'
import { onMounted, ref } from 'vue'

defineProps<{ checking: boolean }>()
defineEmits<{ retry: [] }>()

const heading = ref<HTMLElement>()
onMounted(() => heading.value?.focus({ preventScroll: true }))
</script>

<style scoped>
.offline-screen {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
    max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
  background: var(--dn-bg, #fff);
  color: var(--dn-ink);
}

.offline-content {
  width: min(100%, 360px);
  margin: auto;
  text-align: center;
}

.offline-art {
  position: relative;
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  margin: 0 auto 30px;
  border-radius: 32px;
  background: var(--dn-cream);
}

.offline-icon {
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

.offline-content h1 {
  margin: 0 0 12px;
  font: 600 clamp(30px, 8vw, 38px)/1.12 var(--dn-serif);
  outline: none;
}

.offline-content p {
  margin: 0 auto 28px;
  max-width: 32ch;
  color: var(--dn-muted);
  line-height: 1.6;
}

.offline-retry {
  width: 100%;
}

.offline-retry ion-spinner {
  width: 17px;
  height: 17px;
  color: inherit;
}
</style>
