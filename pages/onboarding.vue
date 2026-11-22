<template>
  <ion-page>
    <ion-content ref="content" class="dn-auth-content" :fullscreen="true">
      <main class="dn-auth-body setup-body">
        <header class="setup-heading">
          <div class="setup-icon"><ion-icon :icon="profileStep ? ioniconsPersonOutline : ioniconsAppsOutline" aria-hidden="true" /></div>
          <h1 class="dn-auth-title">{{ profileStep ? 'Twój profil' : 'Twoje zakładki' }}</h1>
          <p>{{ profileStep
            ? 'Na podstawie wyboru dopasujemy formę językową. Możesz zmienić ją później w profilu.'
            : 'Wybierz, czego chcesz używać w DuoNest. Zawsze możesz zmienić zakładki w ustawieniach.' }}</p>
        </header>

        <div v-if="profileStep">
          <fieldset class="setup-group">
            <legend>Płeć <span>(opcjonalnie)</span></legend>
            <div class="setup-options">
              <button v-for="option in GENDER_OPTIONS" :key="option.value" type="button"
                class="setup-option" :aria-pressed="gender === option.value" :disabled="saving"
                @click="gender = gender === option.value ? null : option.value">
                <ion-icon :icon="option.icon" aria-hidden="true" />
                {{ option.label }}
              </button>
            </div>
          </fieldset>
          <label for="setup-grammar">Forma językowa</label>
          <select id="setup-grammar" v-model="grammar" class="setup-select" :disabled="saving">
            <option :value="null">Automatyczna</option>
            <option v-for="option in GRAMMAR_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        <template v-else>
          <DuoFeaturePicker v-model="features" :disabled="saving" />
          <button type="button" class="setup-option setup-location" :aria-pressed="locationSelected"
            :disabled="saving" @click="locationSelected = !locationSelected">
            <ion-icon :icon="ioniconsLocationOutline" aria-hidden="true" />
            <span><strong>Lokalizacja w Gniazdku</strong><small>Udostępnianie pozycji włączysz osobno.</small></span>
            <ion-icon :icon="locationSelected ? ioniconsCheckmarkCircle : ioniconsEllipseOutline" aria-hidden="true" />
          </button>
          <p class="setup-footnote">Gniazdko i Relacja są zawsze dostępne.</p>
        </template>

        <p v-if="error" class="dn-auth-alert dn-auth-alert--error" role="alert">{{ error }}</p>
        <button class="dn-auth-btn setup-continue" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Zapisywanie…' : profileStep ? 'Dalej' : 'Przejdź do Gniazdka' }}
        </button>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizeGenderIdentity, type GenderIdentity, type GrammaticalGender } from '~/functions/src/duoGrammar'
import { GENDER_OPTIONS, GRAMMAR_OPTIONS } from '~/composables/duo/useGrammar'
import { starterNestCards } from '~/utils/duoPersonalization'
import { translateAppError } from '~/utils/errorTranslator'

const { currentUser, isPaired, partnership, updateMyProfile } = useDuoState()
const { onboardingStage, enabledFeatures } = useDuoPersonalization()
const content = ref<{ $el: HTMLIonContentElement } | null>(null)
const profileStep = computed(() => onboardingStage.value === 'profile')
const gender = ref<GenderIdentity | null>(normalizeGenderIdentity(currentUser.value.gender))
const grammar = ref<GrammaticalGender | null>(
  GRAMMAR_OPTIONS.find(option => option.value === currentUser.value.grammatical_gender)?.value ?? null
)
const features = ref([...enabledFeatures.value])
const initialLocation = Boolean(currentUser.value.nest_cards?.includes('location'))
const locationSelected = ref(initialLocation)
const saving = ref(false)
const error = ref('')

async function save() {
  if (saving.value) return
  error.value = ''
  saving.value = true
  try {
    if (profileStep.value) {
      if (!await updateMyProfile({ gender: gender.value, grammatical_gender: grammar.value, onboarding_stage: 'features' })) return
      if (!isPaired.value) await navigateTo('/pairing', { replace: true })
      else void content.value?.$el.scrollToTop(0)
    } else {
      const partnershipId = partnership.value?.id
      if (!isPaired.value || !partnershipId) {
        await navigateTo('/pairing', { replace: true })
        return
      }
      let cards = currentUser.value.nest_cards ?? starterNestCards(features.value)
      const locationChanged = locationSelected.value !== initialLocation
      if (locationChanged) {
        cards = cards.filter(card => card !== 'location')
        if (locationSelected.value) cards.push('location')
      }
      if (!await updateMyProfile({
        enabled_features: features.value,
        nest_cards: cards,
        onboarding_stage: 'complete',
        onboarding_partnership_id: partnershipId
      })) return
      await navigateTo('/tabs/nest', { replace: true })
    }
  } catch (err) {
    error.value = translateAppError(err)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.setup-body { max-width: 520px; padding-bottom: max(24px, env(safe-area-inset-bottom)); }
.setup-heading { display: grid; gap: 10px; margin-bottom: 22px; }
.setup-heading p, .setup-footnote { color: var(--dn-muted); margin: 0; }
.setup-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 15px; background: var(--dn-cream); font-size: 23px; }
.setup-group { padding: 0; margin: 0 0 20px; border: 0; min-width: 0; }
.setup-group legend, label { font-weight: 600; margin-bottom: 8px; }
.setup-group legend span { color: var(--dn-muted); font-weight: 400; }
.setup-options { display: grid; gap: 8px; }
.setup-option, .setup-select {
  min-height: 48px; width: 100%; border: 1px solid var(--dn-line); border-radius: 12px; padding: 10px 12px;
  background: var(--dn-field); color: var(--dn-ink); font-size: 15px;
}
.setup-option { display: flex; align-items: center; gap: 10px; text-align: left; }
.setup-option[aria-pressed="true"] { border-color: var(--dn-cream-deep); background: var(--dn-cream); }
.setup-location { display: grid; grid-template-columns: 24px 1fr 20px; margin-top: 12px; }
.setup-location small { display: block; color: var(--dn-muted); margin-top: 2px; }
.setup-footnote { margin-top: 12px; font-size: 13px; }
.setup-continue { width: 100%; margin-top: 20px; }
</style>
