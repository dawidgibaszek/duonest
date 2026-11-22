<template>
  <div class="feature-picker" role="group" aria-label="Widoczne zakładki" data-no-swipe>
    <button
      v-for="id in DUO_FEATURES"
      :key="id"
      type="button"
      class="feature-choice"
      :aria-pressed="model.includes(id)"
      :disabled="disabled"
      @click="toggle(id)"
    >
      <span class="feature-icon"><ion-icon :icon="FEATURE_DETAILS[id].icon" aria-hidden="true" /></span>
      <span>{{ FEATURE_DETAILS[id].label }}</span>
      <ion-icon :icon="model.includes(id) ? ioniconsCheckmarkCircle : ioniconsEllipseOutline" class="feature-mark" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { DUO_FEATURES, type DuoFeature } from '~/utils/duoPersonalization'
import { FEATURE_DETAILS } from '~/utils/duoPersonalizationUi'

defineProps<{ disabled?: boolean }>()
const model = defineModel<DuoFeature[]>({ required: true })

function toggle(id: DuoFeature) {
  model.value = model.value.includes(id) ? model.value.filter(feature => feature !== id) : [...model.value, id]
}
</script>

<style scoped>
.feature-picker { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); }
.feature-choice {
  display: grid; grid-template-columns: 34px minmax(0, 1fr) 17px; align-items: center; gap: 9px; text-align: left;
  width: 100%; min-height: 55px; padding: 8px; background: var(--dn-field); border: 1px solid var(--dn-line);
  border-radius: 14px; color: var(--dn-ink); font-size: 13px; font-weight: 600; line-height: 1.25;
}
.feature-choice[aria-pressed="true"] { background: var(--dn-cream); border-color: var(--dn-cream-deep); }
.feature-icon {
  width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: #fff; font-size: 18px;
}
.feature-mark { font-size: 17px; }
</style>
