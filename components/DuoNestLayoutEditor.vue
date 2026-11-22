<template>
  <ion-modal :is-open="isOpen" class="dn-form-sheet-modal" :breakpoints="[0, 0.92, 1]"
    :initial-breakpoint="0.92" :can-dismiss="canDismiss" @didDismiss="emit('close')">
    <ion-header class="dn-form-sheet-header ion-no-border">
      <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
      <ion-toolbar>
        <div class="dn-form-sheet-heading">
          <h2 class="dn-form-sheet-title">Układ Gniazdka</h2>
          <button type="button" class="dn-form-sheet-close" aria-label="Zamknij" :disabled="saving" @click="emit('close')">
            <ion-icon :icon="ioniconsCloseOutline" />
          </button>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="layout-editor" data-no-swipe>
        <p class="layout-description">Przeciągnij karty, żeby zmienić kolejność. Usunięcie karty nie usuwa jej danych.</p>

        <ion-reorder-group :disabled="saving" @ionReorderEnd="onReorder">
          <div v-for="(card, index) in draft" :key="card" class="layout-row">
            <span class="layout-icon"><ion-icon :icon="NEST_CARD_DETAILS[card].icon" aria-hidden="true" /></span>
            <span class="layout-label">{{ NEST_CARD_DETAILS[card].label }}</span>
            <div class="layout-actions">
              <button type="button" :disabled="saving || index === 0"
                :aria-label="`Przesuń wyżej: ${NEST_CARD_DETAILS[card].label}`" @click="move(index, index - 1)">
                <ion-icon :icon="ioniconsChevronUpOutline" />
              </button>
              <button type="button" :disabled="saving || index === draft.length - 1"
                :aria-label="`Przesuń niżej: ${NEST_CARD_DETAILS[card].label}`" @click="move(index, index + 1)">
                <ion-icon :icon="ioniconsChevronDownOutline" />
              </button>
              <button type="button" :disabled="saving"
                :aria-label="`Usuń kartę: ${NEST_CARD_DETAILS[card].label}`" @click="draft = draft.filter(id => id !== card)">
                <ion-icon :icon="ioniconsRemoveCircleOutline" />
              </button>
              <ion-reorder aria-hidden="true" />
            </div>
          </div>
        </ion-reorder-group>
        <p v-if="draft.length === 0" class="layout-description">Układ jest pusty.</p>

        <button v-if="available.length" type="button" class="dn-button-secondary layout-button"
          :aria-expanded="showCatalog" :disabled="saving" @click="showCatalog = !showCatalog">
          <ion-icon :icon="ioniconsAddOutline" aria-hidden="true" /> Dodaj kartę
        </button>
        <div v-if="showCatalog && available.length" class="layout-catalog">
          <button v-for="card in available" :key="card" type="button" class="layout-row" :disabled="saving" @click="draft = [...draft, card]">
            <span class="layout-icon"><ion-icon :icon="NEST_CARD_DETAILS[card].icon" aria-hidden="true" /></span>
            <span class="layout-label">
              {{ NEST_CARD_DETAILS[card].label }}
              <small>{{ NEST_CARD_DETAILS[card].description }}</small>
            </span>
            <ion-icon :icon="ioniconsAddOutline" aria-hidden="true" />
          </button>
        </div>

        <p v-if="error" class="layout-error" role="alert">{{ error }}</p>
        <button type="button" class="dn-button-primary layout-button" :disabled="saving" @click="save">
          {{ saving ? 'Zapisywanie…' : 'Gotowe' }}
        </button>
        <button type="button" class="layout-reset" :disabled="saving" @click="draft = [...DEFAULT_NEST_CARDS]">
          Przywróć układ domyślny
        </button>
        <span class="ion-sr-only" role="status">{{ announcement }}</span>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ReorderEndCustomEvent } from '@ionic/core'
import { DEFAULT_NEST_CARDS, NEST_CARDS, type NestCard } from '~/utils/duoPersonalization'
import { NEST_CARD_DETAILS } from '~/utils/duoPersonalizationUi'
import { translateAppError } from '~/utils/errorTranslator'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { nestCards } = useDuoPersonalization()
const { updateMyProfile } = useDuoState()
const draft = ref<NestCard[]>([])
const available = computed(() => NEST_CARDS.filter(card => !draft.value.includes(card)))
const showCatalog = ref(false)
const saving = ref(false)
const error = ref('')
const announcement = ref('')
const canDismiss = () => !saving.value

watch(() => props.isOpen, (open) => {
  if (!open) return
  draft.value = [...nestCards.value]
  showCatalog.value = false
  error.value = ''
  announcement.value = ''
})

function move(from: number, to: number) {
  const card = draft.value[from]
  if (!card || from === to || to < 0 || to >= draft.value.length) return
  const next = [...draft.value]
  next.splice(from, 1)
  next.splice(to, 0, card)
  draft.value = next
  announcement.value = `${NEST_CARD_DETAILS[card].label}. Pozycja ${to + 1} z ${next.length}.`
}

async function onReorder(event: ReorderEndCustomEvent) {
  const { from, to, complete } = event.detail
  await complete(false)
  move(from, to)
}

async function save() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    if (!await updateMyProfile({ nest_cards: draft.value })) return
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
.layout-editor, .layout-catalog { display: grid; gap: 8px; }
.layout-description { margin: 0 0 8px; color: var(--dn-muted); font-size: 14px; }
.layout-row {
  display: flex; align-items: center; gap: 9px; min-height: 50px; padding: 6px 8px;
  border: 1px solid var(--dn-line); border-radius: 13px; background: var(--dn-field); text-align: left;
}
ion-reorder-group .layout-row + .layout-row { margin-top: 6px; }
.layout-icon {
  flex: 0 0 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: var(--dn-cream);
}
.layout-label { flex: 1; min-width: 0; font-weight: 600; font-size: 13px; color: var(--dn-ink); }
.layout-label small { display: block; color: var(--dn-muted); font-weight: 400; }
.layout-actions { display: flex; align-items: center; }
.layout-actions button, .layout-actions ion-reorder {
  width: clamp(30px, 9vw, 40px); height: 38px; display: grid; place-items: center; padding: 0;
  background: transparent; color: var(--dn-ink); font-size: 16px;
}
.layout-actions button:disabled { opacity: .35; }
.layout-button { width: 100%; margin-top: 4px; }
.layout-reset { min-height: 44px; background: transparent; color: var(--dn-muted); font-size: 13px; }
.layout-error { margin: 0; color: var(--dn-danger); }
</style>
