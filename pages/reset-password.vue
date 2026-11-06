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
            <p class="checking-text">Weryfikacja zabezpieczeń...</p>
          </div>

          <!-- STATE 2: EXPIRED OR REQUIRES CODE VERIFICATION -->
          <div v-else-if="pageStatus === 'expired'" class="expired-box">
            <div class="status-circle warning">
              <ion-icon :icon="ioniconsKeyOutline" class="status-icon warning" />
            </div>
            <h2 class="subview-title">Weryfikacja kodem lub nowy link</h2>
            <p class="subview-desc">
              Jeśli link w wiadomości wygasł (np. został wstępnie sprawdzony przez zabezpieczenia poczty Apple Mail), możesz wpisać <strong>6-cyfrowy kod</strong> z otrzymanego e-maila lub wygenerować nowy.
            </p>

            <!-- OTP CODE FORM -->
            <form @submit.prevent="handleVerifyOtpCode" class="otp-verification-form">
              <!-- EMAIL INPUT -->
              <div class="form-field">
                <label class="field-label">Adres e-mail</label>
                <div class="input-container">
                  <ion-icon :icon="ioniconsMailOutline" class="field-icon" />
                  <input
                    v-model.trim="otpEmailInput"
                    type="email"
                    placeholder="twoj@email.pl"
                    class="styled-native-input"
                    autocomplete="email"
                    inputmode="email"
                    required
                  />
                </div>
              </div>

              <!-- 6-DIGIT CODE INPUT -->
              <div class="form-field">
                <div class="field-label-row">
                  <label class="field-label">6-cyfrowy kod z e-maila</label>
                  <span class="password-hint">z wiadomości</span>
                </div>
                <div class="input-container">
                  <ion-icon :icon="ioniconsKeyOutline" class="field-icon" />
                  <input
                    v-model.trim="otpCodeInput"
                    type="text"
                    placeholder="np. 482910"
                    class="styled-native-input otp-code-input"
                    autocomplete="one-time-code"
                    inputmode="numeric"
                    maxlength="8"
                    required
                  />
                </div>
              </div>

              <!-- OTP ERROR BANNER -->
              <div class="friendly-error" v-if="otpErrorMessage">
                <ion-icon :icon="ioniconsAlertCircleOutline" class="err-icon" />
                <span>{{ otpErrorMessage }}</span>
              </div>

              <!-- OTP SUCCESS BANNER -->
              <div class="friendly-success" v-if="otpSuccessMessage">
                <ion-icon :icon="ioniconsCheckmarkCircle" class="succ-icon" />
                <span>{{ otpSuccessMessage }}</span>
              </div>

              <!-- SUBMIT OTP BUTTON -->
              <button
                type="submit"
                class="dn-btn dn-btn-primary submit-btn verify-btn"
                :disabled="isOtpLoading || !isOtpFormValid"
              >
                <ion-spinner name="crescent" v-if="isOtpLoading" />
                <span v-else>Zweryfikuj kod i zmień hasło</span>
              </button>
            </form>

            <div class="action-divider">
              <span>LUB</span>
            </div>

            <!-- AUXILIARY ACTION BUTTONS -->
            <div class="action-buttons">
              <button
                type="button"
                class="secondary-btn resend-btn"
                @click="handleResendResetEmail"
                :disabled="isOtpLoading || !otpEmailInput"
              >
                <ion-icon :icon="ioniconsSendOutline" />
                <span>Wyślij nowy kod na ten e-mail</span>
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
                  <span class="recovery-email-label">Konto powiązane z linkiem / kodem</span>
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
                <span v-else>Zapisz nowe hasło i zaloguj</span>
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
  arrowForwardOutline as ioniconsArrowForwardOutline,
  keyOutline as ioniconsKeyOutline,
  sendOutline as ioniconsSendOutline
} from 'ionicons/icons'
import { useDuoState, getSupabaseClient, clearSupabaseSessionStorage, sanitizeEmail } from '~/composables/useDuoState'

const { completePasswordReset, requestPasswordReset, isPaired, currentUser, partnership } = useDuoState()

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

// OTP fallback state
const targetEmail = ref('')
const otpEmailInput = ref('')
const otpCodeInput = ref('')
const isOtpLoading = ref(false)
const otpErrorMessage = ref('')
const otpSuccessMessage = ref('')

const isOtpFormValid = computed(() => {
  return (
    otpEmailInput.value.includes('@') &&
    otpEmailInput.value.length > 4 &&
    otpCodeInput.value.trim().length >= 6
  )
})

const isFormValid = computed(() => {
  return (
    Boolean(verifiedEmail.value) &&
    newPassword.value.length >= 6 &&
    newPassword.value === confirmPassword.value
  )
})

const goToLogin = () => {
  window.location.href = '/login'
}

onMounted(async () => {
  if (typeof window === 'undefined') return

  const hash = window.location.hash || ''
  const search = window.location.search || ''
  const urlParams = new URLSearchParams(search)
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))

  // 1. Capture user email from URL parameters if available
  const rawEmail = urlParams.get('email') || hashParams.get('email') || ''
  if (rawEmail) {
    targetEmail.value = sanitizeEmail(rawEmail)
    otpEmailInput.value = targetEmail.value
  }

  const supabase = getSupabaseClient()

  // 2. Direct token_hash verification (modern safe link immune to mail client prefetch)
  const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash')
  if (tokenHash && supabase) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      })
      if (!error && data?.session?.user?.email) {
        verifiedEmail.value = sanitizeEmail(data.session.user.email)
        recoveryAccessToken.value = data.session.access_token || ''
        recoveryRefreshToken.value = data.session.refresh_token || ''
        pageStatus.value = 'valid'
        return
      }
    } catch (_) {}
  }

  // 3. Direct OTP numeric code verification via query (?token=123456)
  const directToken = urlParams.get('token') || hashParams.get('token')
  if (directToken && targetEmail.value && supabase) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: targetEmail.value,
        token: directToken,
        type: 'recovery'
      })
      if (!error && data?.session?.user?.email) {
        verifiedEmail.value = sanitizeEmail(data.session.user.email)
        recoveryAccessToken.value = data.session.access_token || ''
        recoveryRefreshToken.value = data.session.refresh_token || ''
        pageStatus.value = 'valid'
        return
      }
    } catch (_) {}
  }

  // 4. Check for error parameters returned by Supabase verify redirect (e.g. otp_expired)
  const authError = hashParams.get('error') || urlParams.get('error')
  const authErrorCode = hashParams.get('error_code') || urlParams.get('error_code')
  const authErrorDesc = hashParams.get('error_description') || urlParams.get('error_description')

  if (authError || authErrorCode || authErrorDesc) {
    pageStatus.value = 'expired'
    return
  }

  // 5. Implicit flow: access_token in URL hash
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  let foundEmail = ''

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

  // 6. PKCE code exchange in query
  const code = urlParams.get('code')
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

  // 7. Active session check
  if (!foundEmail && supabase) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.email) {
        foundEmail = sanitizeEmail(userData.user.email)
      }
    } catch (_) {}
  }

  // 8. Decide status based on verification result
  if (foundEmail && foundEmail.includes('@')) {
    verifiedEmail.value = foundEmail
    pageStatus.value = 'valid'
  } else {
    pageStatus.value = 'expired'
  }
})

const handleVerifyOtpCode = async () => {
  if (isOtpLoading.value) return
  const cleanEmail = sanitizeEmail(otpEmailInput.value)
  const cleanCode = otpCodeInput.value.replace(/\s+/g, '').trim()

  if (!cleanEmail || !cleanEmail.includes('@')) {
    otpErrorMessage.value = 'Wprowadź prawidłowy adres e-mail.'
    return
  }
  if (!cleanCode || cleanCode.length < 6) {
    otpErrorMessage.value = 'Wprowadź 6-cyfrowy kod weryfikacyjny z e-maila.'
    return
  }

  isOtpLoading.value = true
  otpErrorMessage.value = ''
  otpSuccessMessage.value = ''

  try {
    const supabase = getSupabaseClient()
    if (!supabase) throw new Error('Brak połączenia z systemem')

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: 'recovery'
    })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('Token has expired')) {
        otpErrorMessage.value = 'Kod jest nieprawidłowy lub wygasł. Kliknij "Wyślij nowy kod", aby otrzymać świeży.'
      } else {
        otpErrorMessage.value = msg || 'Błąd weryfikacji kodu.'
      }
      return
    }

    const emailVerified = sanitizeEmail(data?.session?.user?.email || cleanEmail)
    verifiedEmail.value = emailVerified
    recoveryAccessToken.value = data?.session?.access_token || ''
    recoveryRefreshToken.value = data?.session?.refresh_token || ''
    pageStatus.value = 'valid'
  } catch (err: any) {
    otpErrorMessage.value = err?.message || 'Nie udało się zweryfikować kodu. Spróbuj ponownie.'
  } finally {
    isOtpLoading.value = false
  }
}

const handleResendResetEmail = async () => {
  if (isOtpLoading.value) return
  const cleanEmail = sanitizeEmail(otpEmailInput.value)
  if (!cleanEmail || !cleanEmail.includes('@')) {
    otpErrorMessage.value = 'Wprowadź adres e-mail, na który mamy wysłać kod.'
    return
  }

  isOtpLoading.value = true
  otpErrorMessage.value = ''
  otpSuccessMessage.value = ''

  try {
    const { error } = await requestPasswordReset(cleanEmail)
    if (error) {
      otpErrorMessage.value = error.message || 'Nie udało się wysłać nowego kodu. Odczekaj chwilę.'
      return
    }
    otpSuccessMessage.value = `Wysłano nowy 6-cyfrowy kod na adres ${cleanEmail}! Sprawdź skrzynkę (i folder SPAM) i wpisz go powyżej.`
  } catch (err: any) {
    otpErrorMessage.value = err?.message || 'Nie udało się wysłać kodu.'
  } finally {
    isOtpLoading.value = false
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
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  margin-bottom: 12px;
}

.reset-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  object-fit: cover;
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
  color: #0f172a;
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
  padding: 8px 4px;
}

.status-circle {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
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
  font-size: 34px;
  color: #d97706;
}

.status-icon.success {
  font-size: 34px;
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
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.otp-verification-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
}

.otp-code-input {
  letter-spacing: 3px;
  font-weight: 700;
}

.verify-btn {
  margin-top: 4px;
}

.action-divider {
  display: flex;
  align-items: center;
  width: 100%;
  margin: 18px 0 14px 0;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
}

.action-divider::before,
.action-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e2e8f0;
}

.action-divider span {
  padding: 0 12px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.resend-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #0f172a;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.resend-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.resend-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
  transition: background 0.15s ease;
}

.primary-btn:hover {
  background: #020617;
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
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
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

.friendly-success {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  color: #16a34a;
  font-size: 13px;
  line-height: 1.4;
}

.err-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.succ-icon {
  font-size: 18px;
  color: #16a34a;
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
