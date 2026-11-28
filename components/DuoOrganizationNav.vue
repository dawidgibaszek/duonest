<template>
  <ion-toolbar v-if="features.length > 1" class="organization-toolbar" data-no-swipe>
    <div class="dn-page-header">
      <div class="dn-header-title">Organizacja</div>
    </div>
    <nav class="organization-nav" aria-label="Moduły organizacji">
      <button
        v-for="feature in features"
        :key="feature"
        type="button"
        class="organization-link"
        :aria-current="feature === activeDailySubTab ? 'location' : undefined"
        @click="selectDaily(feature)"
      >
        <ion-icon :icon="FEATURE_DETAILS[feature].icon" aria-hidden="true" />
        <span>{{ FEATURE_DETAILS[feature].label }}</span>
      </button>
    </nav>
  </ion-toolbar>
</template>

<script setup lang="ts">
import { activeDailySubTab, selectDaily } from '~/composables/duo/state'
import { DAILY_FEATURES } from '~/utils/duoPersonalization'
import { FEATURE_DETAILS } from '~/utils/duoPersonalizationUi'

const { isFeatureEnabled } = useDuoPersonalization()
const features = computed(() => DAILY_FEATURES.filter(isFeatureEnabled))
</script>

<style scoped>
.organization-toolbar {
  --background: #fff;
  --border-width: 0;
  --min-height: 0;
}

.organization-toolbar .dn-page-header {
  padding-bottom: 16px;
}

.organization-nav {
  display: flex;
  flex-wrap: wrap;
  margin-inline: 12px;
  border-bottom: 1px solid var(--dn-line);
}

.organization-link {
  display: flex;
  flex: 1 1 4.6em;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
  min-height: 48px;
  padding: 4px 2px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dn-muted);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.organization-link span {
  max-width: 100%;
}

.organization-link ion-icon {
  flex-shrink: 0;
  font-size: 19px;
}

.organization-link[aria-current] {
  border-bottom-color: var(--dn-ink);
  color: var(--dn-ink);
}

.organization-link:focus-visible {
  outline: 2px solid var(--dn-ink);
  outline-offset: -2px;
}
</style>
