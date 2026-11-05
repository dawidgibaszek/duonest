<template>
  <ion-page>
    <ion-content :fullscreen="true" class="reset-content">
      <div class="reset-container">
        <!-- BRAND HERO -->
        <div class="reset-hero">
          <div class="logo-wrapper">
            <img src="/favicon.png" alt="DuoNest" class="reset-logo" />
          </div>
          <h1 class="brand-title">DuoNest</h1>
        </div>

        <!-- MAIN CARD -->
        <div class="dn-card reset-card">
          <!-- STATE 1: CHECKING LINK -->
          <div v-if="pageStatus === 'checking'" class="checking-box">
            <ion-spinner name="crescent" class="loading-spinner" />
            <p class="checking-text">Weryfikacja linku bezpieczeństwa...</p>
          </div>

          <!-- STATE 2: EXPIRED OR INVALID LINK -->
          <div v-else-if="pageStatus === 'expired'" class="expired-box">
            <div class="status-circle warning">
              <ion-icon :icon="ioniconsAlertCircleOutline" class="status-icon warning" />
            </div>
            <h2 class="subview-title">Link wygasł lub jest nieprawidłowy</h2>
            <p class="subview-desc">
              Ten link do zmiany hasła wygasł, został już wykorzystany lub jest niepoprawny. Ze względów bezpieczeństwa linki są jednorazowe i aktywne przez określony czas.
            </p>

            <div class="action-buttons">
              <button
                type="button"
                class="primary-btn"
                @click="goToForgotPassword"
              >
                <span>Wyślij nowy link</span>
                <ion-icon :icon="ioniconsArrowForwardOutline" />
              </button>

              <button
                type="button"
                class="secondary-btn"
                @click="goToLogin"
              >
                <span>Wróć do logowania</span>
              </button>
            </div>
          </div>

          <!-- STATE 3: SUCCESS STATE -->
          <div v-else-if="pageStatus === 'success'" class="success-box">
            <div class="status-circle success">
              <ion-icon :icon="ioniconsCheckmarkCircle" class="status-icon success" />
            </div>
            <h2 class="subview-title">Hasło zostało zmienione!</h2>
            <p class="subview-desc">
              Twoje nowe hasło zostało pomyślnie zapisane. Trwa logowanie do DuoNest...
            </p>
            <ion-spinner name="crescent" class="success-spinner" />
          </div>

          <!-- STATE 4: VALID TOKEN - FORM TO SET NEW PASSWORD -->
          <div v-else-if="pageStatus === 'valid'" class="form-subview">
            <div class="auth-subview-header">
              <h2 class="subview-title">Ustaw nowe hasło</h2>
              <p class="subview-desc">
                Wprowadź nowe hasło (min. 6 znaków) dla swojego konta w DuoNest.
              </p>
            </div>

            <!-- IMMUTABLE VERIFIED EMAIL BADGE (LOCKED TO CRYPTOGRAPHIC TOKEN) -->
            <div class="recovery-email-box">
              <div class="recovery-email-left">
                <ion-icon :icon="ioniconsMailOutline" class="recovery-email-icon" />
                <div class="recovery-email-texts">
                  <span class="recovery-email-label">Konto powiązane z linkiem</span>
                  <span class="recovery-email-val">{{ verifiedEmail }}</span>
                </div>
              </div>
            </div>

            <form @submit.prevent="handleSubmit" class="auth-form">
              <!-- NEW PASSWORD -->
              <div class="form-field">
                <div class="field-label-row">
                  <label class="field-label">Nowe hasło</label>
                  <span class="password-hint">min. 6 znaków</span>
                </div>
                <div class="input-container">
                  <ion-icon :icon="ioniconsLockClosedOutline" class="field-icon" />
                  <input
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    class="styled-native-input password-input"
                    autocomplete="new-password"
                    minlength="6"
                    required
                  />
                  <button
                    type="button"
                    class="eye-toggle-btn"
                    @click="showNewPassword = !showNewPassword"
                    tabindex="-1"
                  >
                    <ion-icon :icon="showNewPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                  </button>
                </div>
              </div>

              <!-- CONFIRM PASSWORD -->
              <div class="form-field">
                <label class="field-label">Powtórz nowe hasło</label>
                <div class="input-container">
                  <ion-icon :icon="ioniconsLockClosedOutline" class="field-icon" />
                  <input
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    class="styled-native-input password-input"
                    autocomplete="new-password"
                    minlength="6"
                    required
                  />
                  <button
                    type="button"
                    class="eye-toggle-btn"
                    @click="showConfirmPassword = !showConfirmPassword"
                    tabindex="-1"
                  >
                    <ion-icon :icon="showConfirmPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                  </button>
                </div>
              </div>

              <!-- ERROR MESSAGE -->
              <div class="friendly-error" v-if="errorMessage">
                <ion-icon :icon="ioniconsAlertCircleOutline" class="err-icon" />
                <span>{{ errorMessage }}</span>
              </div>

              <!-- SUBMIT BUTTON -->
              <button
                type="submit"
                class="dn-btn dn-btn-primary submit-btn"
                :disabled="!isFormValid || isLoading"
              >
                <ion-spinner name="crescent" v-if="isLoading" />
                <span v-else>Zmień hasło i zaloguj</span>
              </button>
            </form>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="reset-footer">
          DuoNest - Bezpieczna przestrzeń dla Ciebie i Twojej połówki
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/vue'
import {
  lockClosedOutline as ioniconsLockClosedOutline,
  mailOutline as ioniconsMailOutline,
  eyeOutline as ioniconsEyeOutline,
  eyeOffOutline as ioniconsEyeOffOutline,
  checkmarkCircle as ioniconsCheckmarkCircle,
  alertCircleOutline as ioniconsAlertCircleOutline,
  arrowForwardOutline as ioniconsArrowForwardOutline
} from 'ionicons/icons'
import { useDuoState, getSupabaseClient, clearSupabaseSessionStorage, sanitizeEmail } from '~/composables/useDuoState'

const { completePasswordReset, isPaired, currentUser, partnership } = useDuoState()

const pageStatus = ref<'checking' | 'valid' | 'expired' | 'success'>('checking')
const verifiedEmail = ref('')
const recoveryAccessToken = ref('')
const recoveryRefreshToken = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const isFormValid = computed(() => {
  return (
    Boolean(verifiedEmail.value) &&
    newPassword.value.length >= 6 &&
    newPassword.value === confirmPassword.value
  )
})

const goToForgotPassword = () => {
  window.location.href = '/login?forgot=1'
}

const goToLogin = () => {
  window.location.href = '/login'
}

onMounted(async () => {
  if (typeof window === 'undefined') return

  // 1. Clear any conflicting tokens from storage so recovery is isolated
  clearSupabaseSessionStorage()

  const hash = window.location.hash || ''
  const search = window.location.search || ''
  const urlParams = new URLSearchParams(search)
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))

  // 2. Detect any error explicitly returned by Supabase Auth verify endpoint
  const authError = hashParams.get('error') || urlParams.get('error')
  const authErrorCode = hashParams.get('error_code') || urlParams.get('error_code')
  const authErrorDesc = hashParams.get('error_description') || urlParams.get('error_description')

  if (authError || authErrorCode || authErrorDesc) {
    pageStatus.value = 'expired'
    if (window.history?.replaceState) {
      window.history.replaceState(null, '', window.location.pathname)
    }
    return
  }

  // 3. Extract tokens from hash or query
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const code = urlParams.get('code')
  const type = hashParams.get('type') || urlParams.get('type')

  const supabase = getSupabaseClient()
  let foundEmail = ''

  // 4. Validate access_token in hash (Implicit Flow from Supabase recovery email)
  if (accessToken) {
    try {
      const payloadBase64 = accessToken.split('.')[1]
      if (payloadBase64) {
        const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')))
        if (decoded?.email) {
          foundEmail = sanitizeEmail(decoded.email)
          recoveryAccessToken.value = accessToken
          recoveryRefreshToken.value = refreshToken || ''
        }
      }
    } catch (_) {}

    if (supabase && refreshToken) {
      try {
        const { data: sData } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if (sData?.session?.user?.email) {
          foundEmail = sanitizeEmail(sData.session.user.email)
        }
      } catch (_) {}
    }
  }

  // 5. Handle PKCE code in query if present
  if (code && supabase && !foundEmail) {
    try {
      const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(code)
      if (!codeErr && codeData?.session?.user?.email) {
        foundEmail = sanitizeEmail(codeData.session.user.email)
        recoveryAccessToken.value = codeData.session.access_token || ''
        recoveryRefreshToken.value = codeData.session.refresh_token || ''
      }
    } catch (_) {}
  }

  // 6. Check active Supabase session if token was not in hash
  if (!foundEmail && supabase) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.email) {
        foundEmail = sanitizeEmail(userData.user.email)
      }
    } catch (_) {}
  }

  // 7. Decide status based on cryptographic verification
  if (foundEmail && foundEmail.includes('@')) {
    verifiedEmail.value = foundEmail
    pageStatus.value = 'valid'
  } else {
    pageStatus.value = 'expired'
  }
})

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
      verifiedEmail.value,
      recoveryAccessToken.value
    )

    if (error) {
      errorMessage.value = error.message || 'Wystąpił błąd podczas zapisywania nowego hasła.'
      isLoading.value = false
      return
    }

    pageStatus.value = 'success'
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      const destination = (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id)
        ? '/tabs/nest'
        : '/pairing'
      window.location.href = destination
    }, 1500)
  } catch (err: any) {
    errorMessage.value = err?.message || 'Nie udało się zmienić hasła. Spróbuj ponownie.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.reset-content {
  --background: #f0f9ff;
}

.reset-container {
  max-width: 440px;
  margin: 0 auto;
  padding: 40px 20px 32px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

.reset-hero {
  text-align: center;
  margin-bottom: 24px;
}

.logo-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(2, 132, 199, 0.12);
  margin-bottom: 12px;
}

.reset-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.brand-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #0f172a;
  margin: 0;
}

.reset-card {
  padding: 28px 24px 28px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  border: 1px solid #e2e8f0;
}

.checking-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 10px;
  gap: 16px;
}

.loading-spinner {
  color: #0284c7;
  font-size: 32px;
}

.checking-text {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.expired-box, .success-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 12px 6px;
}

.status-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.status-circle.warning {
  background: #fffbeb;
  border: 2px solid #fef3c7;
}

.status-circle.success {
  background: #f0fdf4;
  border: 2px solid #bbf7d0;
}

.status-icon.warning {
  font-size: 38px;
  color: #d97706;
}

.status-icon.success {
  font-size: 38px;
  color: #16a34a;
}

.success-spinner {
  margin-top: 20px;
  color: #16a34a;
}

.subview-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px 0;
  letter-spacing: -0.3px;
}

.subview-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  background: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
  transition: background 0.15s ease;
}

.primary-btn:hover {
  background: #0369a1;
}

.secondary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 20px;
  background: transparent;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.secondary-btn:hover {
  background: #f8fafc;
  color: #0f172a;
}

.recovery-email-box {
  display: flex;
  align-items: center;
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.recovery-email-left {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  width: 100%;
}

.recovery-email-icon {
  font-size: 22px;
  color: #16a34a;
  flex-shrink: 0;
}

.recovery-email-texts {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recovery-email-label {
  font-size: 11px;
  font-weight: 600;
  color: #15803d;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.recovery-email-val {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.password-hint {
  font-size: 12px;
  color: #94a3b8;
}

.input-container {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 0 14px;
  transition: all 0.2s ease;
}

.input-container:focus-within {
  background: #ffffff;
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
}

.field-icon {
  color: #64748b;
  font-size: 20px;
  margin-right: 10px;
  flex-shrink: 0;
}

.styled-native-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  font-size: 15px;
  color: #0f172a;
  outline: none;
  font-family: inherit;
}

.styled-native-input::placeholder {
  color: #94a3b8;
}

.eye-toggle-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.friendly-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #dc2626;
  font-size: 13px;
  line-height: 1.4;
}

.err-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 14px;
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 12px;
  color: #94a3b8;
}
</style>
