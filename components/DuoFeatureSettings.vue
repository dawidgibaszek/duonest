<template>
  <ion-modal :is-open="isOpen" class="dn-form-sheet-modal" :breakpoints="[0, 0.9, 1]"
    :initial-breakpoint="0.9" :can-dismiss="canDismiss" @didDismiss="emit('close')">
    <ion-header class="dn-form-sheet-header ion-no-border">
      <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
      <ion-toolbar>
        <div class="dn-form-sheet-heading">
          <h2 class="dn-form-sheet-title">Twoje zakładki</h2>
          <button type="button" class="dn-form-sheet-close" aria-label="Zamknij" :disabled="saving" @click="emit('close')">
            <ion-icon :icon="ioniconsCloseOutline" />
          </button>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="feature-help">Ukryte zakładki znikną tylko z Twojego menu. Wspólne dane zostaną w Gniazdku.</p>
      <DuoFeaturePicker v-model="draft" :disabled="saving" />
      <p v-if="error" class="feature-error" role="alert">{{ error }}</p>
      <button class="dn-button-primary feature-save" type="button" :disabled="saving" @click="save">
        {{ saving ? 'Zapisywanie…' : 'Zapisz zakładki' }}
      </button>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DuoFeature } from '~/utils/duoPersonalization'
import { translateAppError } from '~/utils/errorTranslator'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { enabledFeatures } = useDuoPersonalization()
const { updateMyProfile } = useDuoState()
const draft = ref<DuoFeature[]>([])
const saving = ref(false)
const error = ref('')
const canDismiss = () => !saving.value

watch(() => props.isOpen, (open) => {
  if (!open) return
  draft.value = [...enabledFeatures.value]
  error.value = ''
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (!await updateMyProfile({ enabled_features: draft.value })) return
  } catch (err) {
    error.value = translateAppError(err)
    return
  } finally {
    saving.value = false
  }
  emit('close')
}
</script>

<style scoped>
.feature-help { margin: 0 0 16px; color: var(--dn-muted); font-size: 14px; }
.feature-save { width: 100%; margin-top: 18px; }
.feature-error { color: var(--dn-danger); }
</style>
