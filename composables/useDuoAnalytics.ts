import { Capacitor } from '@capacitor/core'
import { ConsentStatus, ConsentType, FirebaseAnalytics } from '@capacitor-firebase/analytics'
import { readonly, ref } from 'vue'
import type { FeatureEvent, OnboardingEvent } from '../functions/src/analyticsEvents'

const consentKey = 'duonest_usage_analytics'
const verificationKey = 'duonest_analytics_pending_verification'
const pairingKey = 'duonest_analytics_pending_pairing'
const available = !import.meta.dev && Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('FirebaseAnalytics')
const enabled = ref(false)
const saving = ref(false)
let lastScreen: string | undefined
let screen: string | undefined

export async function initializeDuoAnalytics() {
  if (!available || saving.value) return
  saving.value = true
  try {
    // Closed beta default. Keep explicit choices so changing this default later
    // does not mistake automatic collection for a user decision.
    const allow = localStorage.getItem(consentKey) !== 'no'
    await applyConsent(allow)
    enabled.value = allow
    if (allow && screen) trackDuoScreen(screen)
  } catch {
    // Analytics setup must not delay startup or prevent use of the app.
  } finally {
    saving.value = false
  }
}

async function applyConsent(allow: boolean) {
  if (!allow) await FirebaseAnalytics.setEnabled({ enabled: false })
  await FirebaseAnalytics.setConsent({
    type: ConsentType.AnalyticsStorage,
    status: allow ? ConsentStatus.Granted : ConsentStatus.Denied
  })
  if (allow) await FirebaseAnalytics.setEnabled({ enabled: true })
}

async function setEnabled(allow: boolean) {
  if (!available || saving.value) return
  saving.value = true
  const previous = enabled.value
  try {
    await applyConsent(allow)
    localStorage.setItem(consentKey, allow ? 'yes' : 'no')
    if (!allow) {
      localStorage.removeItem(verificationKey)
      localStorage.removeItem(pairingKey)
    }
    enabled.value = allow
    if (!allow) lastScreen = undefined
    else if (screen) trackDuoScreen(screen)
  } catch (error) {
    await applyConsent(previous).catch(() => undefined)
    throw error
  } finally {
    saving.value = false
  }
}

export function trackDuoEvent(name: FeatureEvent | OnboardingEvent, method?: 'email' | 'google' | 'apple') {
  if (!available || !enabled.value || saving.value) return
  void FirebaseAnalytics.logEvent({ name, params: method ? { method } : undefined }).catch(() => undefined)
}

export function trackDuoScreen(name: string) {
  screen = name
  if (!available || !enabled.value || name === lastScreen) return
  lastScreen = name
  void FirebaseAnalytics.setCurrentScreen({ screenName: name, screenClassOverride: 'DuoNest' }).catch(() => undefined)
}

// The marker stays on the device. A verification link often opens outside the app.
export function trackDuoSignup(uid: string, method: 'email' | 'google' | 'apple') {
  if (!enabled.value) return
  trackDuoEvent('duo_signup', method)
  try { localStorage.setItem(pairingKey, uid) } catch {}
  if (method === 'email') {
    try { localStorage.setItem(verificationKey, uid) } catch {}
  } else {
    trackDuoEvent('duo_account_ready')
  }
}

export function trackDuoEmailVerified(uid: string) {
  if (!enabled.value) return
  try {
    if (localStorage.getItem(verificationKey) !== uid) return
    localStorage.removeItem(verificationKey)
    trackDuoEvent('duo_email_verified')
    trackDuoEvent('duo_account_ready')
  } catch {}
}

export function trackDuoPairing(uid: string | undefined) {
  if (!enabled.value || !uid) return
  try {
    if (localStorage.getItem(pairingKey) !== uid) return
    localStorage.removeItem(pairingKey)
    trackDuoEvent('duo_paired')
  } catch {}
}

export function useDuoAnalytics() {
  return { available, enabled: readonly(enabled), saving: readonly(saving), setEnabled }
}
