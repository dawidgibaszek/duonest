<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dn-auth-content">
      <div class="dn-auth-page">

        <div class="dn-auth-body">
          <!-- STATE 1: CHECKING LINK -->
          <div v-if="pageStatus === 'checking'" class="dn-auth-status">
            <ion-spinner name="crescent" />
            <p class="status-text">Weryfikacja zabezpieczeń...</p>
          </div>

          <!-- STATE 2: LINK INVALID OR EXPIRED -->
          <template v-else-if="pageStatus === 'expired'">
            <header class="dn-auth-heading">
              <h1 class="dn-auth-title">Link wygasł</h1>
              <DuoAuthHero :tiles="heroTiles" bare />
              <p class="dn-auth-subtitle">
                Ten link do zmiany hasła jest nieprawidłowy, został już użyty albo wygasł. Podaj adres e-mail, a wyślemy nowy.
              </p>
            </header>

            <form @submit.prevent="handleResendResetEmail" class="dn-auth-form">
              <DuoAuthField
                v-model.trim="resendEmailInput"
                label="Adres e-mail"
                type="email"
                placeholder="twoj@email.pl"
                autocomplete="email"
                inputmode="email"
                autocapitalize="off"
                spellcheck="false"
                required
              />

              <div class="dn-auth-alert dn-auth-alert--error" v-if="resendErrorMessage" role="alert">
                <ion-icon :icon="ioniconsAlertCircleOutline" />
                <span>{{ resendErrorMessage }}</span>
              </div>

              <div class="dn-auth-alert dn-auth-alert--success" v-if="resendSuccessMessage" role="status">
                <ion-icon :icon="ioniconsCheckmarkCircle" />
                <span>{{ resendSuccessMessage }}</span>
              </div>

              <button
                type="submit"
                class="dn-auth-btn submit-btn"
                :disabled="isResendLoading || !resendEmailInput.includes('@')"
              >
                <ion-spinner name="crescent" v-if="isResendLoading" />
                <template v-else>
                  <ion-icon :icon="ioniconsSendOutline" />
                  <span>Wyślij nowy link</span>
                </template>
              </button>
            </form>

            <div class="dn-auth-stack">
              <button type="button" class="dn-auth-btn dn-auth-btn--outline" @click="goToLogin">
                <span>{{ browserOnly ? 'Wróć na stronę DuoNest' : 'Wróć do logowania' }}</span>
              </button>
            </div>
          </template>

          <!-- STATE 3: SUCCESS -->
          <template v-else-if="pageStatus === 'success'">
            <header class="dn-auth-heading">
              <h1 class="dn-auth-title">Hasło zmienione</h1>
              <DuoAuthHero :tiles="heroTiles" bare />
              <p class="dn-auth-subtitle">{{ browserOnly ? 'Twoje nowe hasło zostało zapisane. Zaloguj się w aplikacji DuoNest na telefonie.' : 'Twoje nowe hasło zostało zapisane. Trwa logowanie do DuoNest…' }}</p>
            </header>
            <button v-if="browserOnly" type="button" class="dn-auth-btn" @click="goToLogin">Wróć na stronę DuoNest</button>
            <div v-else class="dn-auth-status">
              <ion-spinner name="crescent" />
            </div>
          </template>

          <!-- STATE 4: VALID TOKEN - SET NEW PASSWORD -->
          <template v-else-if="pageStatus === 'valid'">
            <header class="dn-auth-heading">
              <h1 class="dn-auth-title">Ustaw nowe hasło</h1>
              <DuoAuthHero :tiles="heroTiles" bare />
              <p class="dn-auth-subtitle">Wprowadź nowe hasło (min. 6 znaków) dla swojego konta w DuoNest.</p>
            </header>

            <!-- IMMUTABLE VERIFIED EMAIL (LOCKED TO CRYPTOGRAPHIC TOKEN) -->
            <div class="dn-auth-account">
              <ion-icon :icon="ioniconsMailOutline" />
              <div class="dn-auth-account-texts">
                <span class="dn-auth-account-label">Konto powiązane z linkiem</span>
                <span class="dn-auth-account-value">{{ verifiedEmail }}</span>
              </div>
            </div>

            <form @submit.prevent="handleSubmit" class="dn-auth-form">
              <DuoAuthField
                v-model="newPassword"
                label="Nowe hasło"
                hint="min. 6 znaków"
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                minlength="6"
                required
              />

              <DuoAuthField
                v-model="confirmPassword"
                label="Powtórz nowe hasło"
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                minlength="6"
                required
              />

              <div class="dn-auth-alert dn-auth-alert--error" v-if="errorMessage" role="alert">
                <ion-icon :icon="ioniconsAlertCircleOutline" />
                <span>{{ errorMessage }}</span>
              </div>

              <button
                type="submit"
                class="dn-auth-btn submit-btn"
                :disabled="!isFormValid || isLoading"
              >
                <ion-spinner name="crescent" v-if="isLoading" />
                <span v-else>{{ browserOnly ? 'Zapisz hasło' : 'Zapisz i zaloguj' }}</span>
              </button>
            </form>
          </template>

          <footer class="dn-auth-footer">
            <p class="dn-auth-fineprint">DuoNest · Bezpieczna przestrzeń dla Ciebie i Twojej połówki</p>
          </footer>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/vue'
import {
  mailOutline as ioniconsMailOutline,
  checkmarkCircle as ioniconsCheckmarkCircle,
  alertCircleOutline as ioniconsAlertCircleOutline,
  sendOutline as ioniconsSendOutline,
  key as ioniconsKey,
  mail as ioniconsMail,
  lockClosed as ioniconsLockClosed,
  shieldCheckmark as ioniconsShieldCheckmark,
  heart as ioniconsHeart,
  sparkles as ioniconsSparkles
} from 'ionicons/icons'
import type { DuoAuthHeroTile } from '~/components/DuoAuthHero.vue'
import { useDuoState, getSupabaseClient, sanitizeEmail } from '~/composables/useDuoState'
import { translateAppError } from '~/utils/errorTranslator'

const { completePasswordReset, requestPasswordReset, isPaired, currentUser, partnership } = useDuoState()
const browserOnly = !import.meta.dev && !Capacitor.isNativePlatform()

const pageStatus = ref<'checking' | 'valid' | 'expired' | 'success'>('checking')
const verifiedEmail = ref('')
// Firebase reset links: /auth/action?mode=resetPassword&oobCode=... → /reset-password?oobCode=...
const resetOobCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const resendEmailInput = ref('')
const isResendLoading = ref(false)
const resendErrorMessage = ref('')
const resendSuccessMessage = ref('')

const heroTiles = computed<DuoAuthHeroTile[]>(() => {
  switch (pageStatus.value) {
    case 'checking':
      return [{ icon: ioniconsShieldCheckmark, color: '#1c1b19' }]
    case 'success':
      return [
        { icon: ioniconsCheckmarkCircle, color: '#2f9e44' },
        { icon: ioniconsHeart, color: '#e5484d' },
        { icon: ioniconsSparkles, color: '#e8a33d' }
      ]
    case 'valid':
      return [
        { icon: ioniconsLockClosed, color: '#1c1b19' },
        { icon: ioniconsKey, color: '#e8a33d' },
        { icon: ioniconsShieldCheckmark, color: '#2f9e44' }
      ]
    default:
      return [
        { icon: ioniconsKey, color: '#e8a33d' },
        { icon: ioniconsMail, color: '#3b82f6' },
        { icon: ioniconsLockClosed, color: '#1c1b19' }
      ]
  }
})

const isFormValid = computed(() => {
  return (
    Boolean(verifiedEmail.value) &&
    newPassword.value.length >= 6 &&
    newPassword.value === confirmPassword.value
  )
})

const goToLogin = () => {
  window.location.href = browserOnly ? '/' : '/login'
}

onMounted(async () => {
  if (typeof window === 'undefined') return

  const urlParams = new URLSearchParams(window.location.search || '')
  const oobCode = urlParams.get('oobCode')
  const mode = urlParams.get('mode')

  if (!oobCode || (mode && mode !== 'resetPassword')) {
    pageStatus.value = 'expired'
    return
  }

  try {
    const { data, error } = await (getSupabaseClient() as any).auth.verifyPasswordResetCode(oobCode)
    if (!error && data?.email) {
      verifiedEmail.value = sanitizeEmail(data.email)
      resetOobCode.value = oobCode
      pageStatus.value = 'valid'
      return
    }
  } catch (_) {}
  pageStatus.value = 'expired'
})

const handleResendResetEmail = async () => {
  if (isResendLoading.value) return
  const cleanEmail = sanitizeEmail(resendEmailInput.value)
  if (!cleanEmail || !cleanEmail.includes('@')) {
    resendErrorMessage.value = 'Wprowadź adres e-mail, na który mamy wysłać link.'
    return
  }

  isResendLoading.value = true
  resendErrorMessage.value = ''
  resendSuccessMessage.value = ''

  try {
    const { error } = await requestPasswordReset(cleanEmail)
    if (error) {
      resendErrorMessage.value = error.message || 'Nie udało się wysłać nowego linku. Odczekaj chwilę.'
      return
    }
    resendSuccessMessage.value = `Jeśli konto ${cleanEmail} istnieje, wysłaliśmy na nie nowy link. Sprawdź skrzynkę (i folder SPAM).`
  } catch (err: any) {
    resendErrorMessage.value = translateAppError(err)
  } finally {
    isResendLoading.value = false
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value || isLoading.value) return

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Podane hasła nie są identyczne.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const { error } = await completePasswordReset(
      newPassword.value,
      browserOnly ? undefined : verifiedEmail.value,
      undefined,
      resetOobCode.value
    )

    if (error) {
      errorMessage.value = translateAppError(error)
      isLoading.value = false
      return
    }

    pageStatus.value = 'success'
    if (browserOnly) return
    setTimeout(() => {
      const destination = (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id)
        ? '/tabs/nest'
        : '/pairing'
      window.location.replace(destination)
    }, 1500)
  } catch (err: any) {
    errorMessage.value = translateAppError(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.status-text {
  margin: 0;
}

.submit-btn {
  margin-top: 8px;
}

.dn-auth-fineprint {
  margin: 0;
}
</style>
