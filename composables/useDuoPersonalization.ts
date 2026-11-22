import { computed } from 'vue'
import { currentUser, isPaired } from '~/composables/duo/state'
import { DEFAULT_NEST_CARDS, DUO_FEATURES, NEST_CARDS, normalizeSelection, type DuoFeature } from '~/utils/duoPersonalization'

const enabledFeatures = computed(() => normalizeSelection(currentUser.value.enabled_features, DUO_FEATURES, DUO_FEATURES))
const nestCards = computed(() => normalizeSelection(currentUser.value.nest_cards, NEST_CARDS, DEFAULT_NEST_CARDS))
const onboardingStage = computed(() => currentUser.value.onboarding_stage ?? 'profile')
const needsPairingOnboarding = computed(() => isPaired.value && (
  onboardingStage.value !== 'complete' ||
  currentUser.value.onboarding_partnership_id !== currentUser.value.partnership_id
))

export function useDuoPersonalization() {
  return {
    enabledFeatures,
    nestCards,
    onboardingStage,
    needsPairingOnboarding,
    isFeatureEnabled: (feature: DuoFeature) => enabledFeatures.value.includes(feature)
  }
}
