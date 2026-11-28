<template>
  <ion-toolbar class="section-back-toolbar">
    <NuxtLink :to="to" replace class="dn-header-btn dn-header-btn--soft section-back">
      <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
      {{ label }}
    </NuxtLink>
  </ion-toolbar>
</template>

<script setup lang="ts">
import { arrowBackOutline } from 'ionicons/icons'

withDefaults(defineProps<{ to?: string; label?: string }>(), {
  to: '/tabs/daily',
  label: 'Wróć do organizacji'
})
</script>

<style scoped>
.section-back-toolbar {
  --border-width: 0;
  --min-height: 0;
}

.section-back {
  min-height: 44px;
  margin: 8px 20px 0;
  text-decoration: none;
}

.section-back:focus-visible {
  outline: 2px solid var(--dn-ink);
  outline-offset: 2px;
}
</style>
