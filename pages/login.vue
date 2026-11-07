<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
      <div class="login-container">
        <!-- BRAND HEADER -->
        <div class="login-hero">
          <div class="logo-wrapper">
            <img src="/favicon.png" alt="DuoNest" class="login-logo" />
          </div>
          <h1 class="login-title">DuoNest</h1>
        </div>

        <!-- AUTH CARD -->
        <div class="dn-card auth-card">
          <!-- MODE SWITCHER (LOGIN / REGISTER) -->
          <div class="mode-switcher" v-if="mode === 'login' || mode === 'register'">
            <button
              type="button"
              class="mode-btn"
              :class="{ active: mode === 'login' }"
              @click="switchMode('login')"
            >
              Logowanie
            </button>
            <button
              type="button"
              class="mode-btn"
              :class="{ active: mode === 'register' }"
              @click="switchMode('register')"
            >
              Rejestracja
            </button>
          </div>

          <!-- FORGOT PASSWORD SUBHEADER -->
          <div class="auth-subview-header" v-else-if="mode === 'forgot'">
            <button type="button" class="back-link-btn" @click="switchMode('login')">
              <ion-icon :icon="ioniconsArrowBackOutline" />
              <span>Wróć do logowania</span>
            </button>
            <h2 class="subview-title">Reset hasła</h2>
            <p class="subview-desc">
              Podaj e-mail przypisany do Twojego konta. Wyślemy Ci wiadomość z bezpiecznym linkiem do utworzenia nowego hasła.
            </p>
          </div>

          <!-- LEGACY ACCOUNT RECOVERY SUBHEADER -->
          <div class="auth-subview-header" v-else-if="mode === 'legacy-recovery'">
            <button type="button" class="back-link-btn" @click="switchMode('login')">
              <ion-icon :icon="ioniconsArrowBackOutline" />
              <span>Wróć do logowania</span>
            </button>
            <h2 class="subview-title">Przywróć dostęp do starego konta</h2>
            <p class="subview-desc">
              Jeśli Twoje stare konto DuoNest istnieje w bazie pod tym samym adresem e-mail, odzyskamy je bez utraty danych. Zostanie ono ponownie przypisane do tego samego profilu, a Ty będziesz mógł ustawić nowe hasło i kontynuować bez tracenia partnera, list, zadań i ustawień.
            </p>
          </div>

          <!-- FORM -->
          <form @submit.prevent="handleSubmit" class="auth-form">
            <!-- NAME FIELD (ONLY REGISTER & LEGACY RECOVERY) -->
            <div class="form-field" v-if="mode === 'register' || mode === 'legacy-recovery'">
              <label class="field-label">Twoje imię</label>
              <div class="input-container">
                <ion-icon :icon="ioniconsPersonOutline" class="field-icon" />
                <input
                  v-model="nameInput"
                  type="text"
                  placeholder="np. Jan"
                  class="styled-native-input"
                  autocomplete="name"
                  maxlength="40"
                />
              </div>
            </div>

            <!-- EMAIL FIELD -->
            <div class="form-field">
              <div class="field-label-row">
                <label class="field-label">Adres e-mail</label>
              </div>
              <div class="input-container">
                <ion-icon :icon="ioniconsMailOutline" class="field-icon" />
                <input
                  v-model.trim="emailInput"
                  type="email"
                  placeholder="twoj@email.pl"
                  class="styled-native-input"
                  autocomplete="email"
                  inputmode="email"
                  required
                />
              </div>
            </div>

            <!-- PASSWORD FIELD (LOGIN, REGISTER & LEGACY RECOVERY) -->
            <div class="form-field" v-if="mode === 'login' || mode === 'register' || mode === 'legacy-recovery'">
              <div class="field-label-row">
                <label class="field-label">Hasło</label>
                <span class="password-hint" v-if="mode === 'register'">min. 6 znaków</span>
              </div>
              <div class="input-container">
                <ion-icon :icon="ioniconsLockClosedOutline" class="field-icon" />
                <input
                  v-model="passwordInput"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  class="styled-native-input password-input"
                  autocomplete="current-password"
                  minlength="6"
                  required
                />
                <button
                  type="button"
                  class="eye-toggle-btn"
                  @click="showPassword = !showPassword"
                  tabindex="-1"
                >
                  <ion-icon :icon="showPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                </button>
              </div>
            </div>

            <!-- FORGOT PASSWORD LINK (ONLY LOGIN) -->
            <div class="field-aux-row" v-if="mode === 'login'">
              <button
                type="button"
                class="forgot-link-btn"
                @click="switchMode('forgot')"
              >
                Nie pamiętasz hasła?
              </button>
            </div>

            <div class="legacy-recovery-note" v-if="mode === 'login' || mode === 'forgot'">
              <p>
                Masz stare konto z poprzedniej wersji DuoNest i nie możesz się zalogować?
                <button type="button" class="inline-legacy-link" @click="switchMode('legacy-recovery')">
                  Przywróć dostęp do starego konta
                </button>
              </p>
            </div>

            <!-- FRIENDLY ERROR BANNER -->
            <div class="friendly-error" v-if="errorMessage">
              <ion-icon :icon="ioniconsAlertCircleOutline" class="err-icon" />
              <span>{{ errorMessage }}</span>
            </div>

            <!-- RESEND VERIFICATION BUTTON (IF UNVERIFIED) -->
            <div class="resend-verification-container" v-if="errorMessage && errorMessage.includes('nie został jeszcze zweryfikowany')">
              <button
                type="button"
                class="resend-verification-btn"
                @click="handleResendVerification"
                :disabled="isLoading"
              >
                <ion-icon :icon="ioniconsSendOutline" />
                <span>Wyślij link aktywacyjny ponownie</span>
              </button>
            </div>

            <!-- SUCCESS BANNER -->
            <div class="friendly-success" v-if="successMessage">
              <ion-icon :icon="ioniconsCheckmarkCircleOutline" class="succ-icon" />
              <span>{{ successMessage }}</span>
            </div>

            <!-- SUBMIT BUTTON -->
            <button
              type="submit"
              class="dn-button-sea submit-btn"
              :disabled="isLoading || !isFormValid"
            >
              <ion-spinner v-if="isLoading" name="crescent" class="btn-spinner"></ion-spinner>
              <span v-else>
                {{
                  mode === 'login' ? 'Zaloguj się' :
                  mode === 'register' ? 'Utwórz konto' :
                  mode === 'legacy-recovery' ? 'Utwórz nowe hasło i aktywuj konto' :
                  'Wyślij link resetujący'
                }}
              </span>
            </button>
          </form>

          <!-- DIVIDER & SOCIAL BUTTONS (ONLY ON LOGIN/REGISTER) -->
          <template v-if="mode === 'login' || mode === 'register'">
            <div class="social-divider">
              <span class="divider-line"></span>
              <span class="divider-text">LUB ZALOGUJ SIĘ PRZEZ</span>
              <span class="divider-line"></span>
            </div>

            <div class="social-buttons-stack">
              <button
                type="button"
                class="social-btn social-google"
                :disabled="isGoogleLoading"
                @click="handleGoogleSignIn"
                title="Kontynuuj z Google"
              >
                <svg class="social-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span class="social-text">{{ isGoogleLoading ? 'Łączenie z Google…' : 'Kontynuuj z Google' }}</span>
              </button>

              <button
                type="button"
                class="social-btn social-apple disabled-btn"
                disabled
                title="Logowanie przez Apple będzie dostępne wkrótce"
              >
                <svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.77 1.04-1.85.93-2.92-.9.04-1.99.6-2.63 1.36-.57.65-1.07 1.74-.93 2.8.99.08 2.02-.48 2.63-1.24z"/>
                </svg>
                <span class="social-text">Kontynuuj z Apple</span>
                <span class="soon-badge">Wkrótce</span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDuoState, getSupabaseClient, sanitizeEmail } from '~/composables/useDuoState'

const route = useRoute()
const {
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  completePasswordReset,
  resendVerificationEmail,
  syncUserProfileWithAuth,
  isPaired,
  currentUser,
  partnership,
  initializeClientState
} = useDuoState()

initializeClientState()

const mode = ref<'login' | 'register' | 'forgot' | 'legacy-recovery'>(
  route?.query?.forgot === '1'
    ? 'forgot'
    : route?.query?.mode === 'legacy-recovery'
      ? 'legacy-recovery'
      : 'login'
)
const emailInput = ref('')
const passwordInput = ref('')
const nameInput = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const isFormValid = computed(() => {
  const hasEmail = emailInput.value.includes('@') && emailInput.value.length > 4
  if (mode.value === 'forgot') {
    return hasEmail
  }
  const hasPass = passwordInput.value.length >= 6
  if (mode.value === 'register' || mode.value === 'legacy-recovery') {
    return hasEmail && hasPass && nameInput.value.trim().length > 0
  }
  return hasEmail && hasPass
})

const switchMode = (newMode: 'login' | 'register' | 'forgot' | 'legacy-recovery') => {
  mode.value = newMode
  errorMessage.value = ''
  successMessage.value = ''
  if (typeof window !== 'undefined' && window.history?.replaceState) {
    const url = new URL(window.location.href)
    url.searchParams.delete('legacy')
    url.searchParams.delete('recovery')
    url.searchParams.delete('mode')
    url.searchParams.delete('forgot')
    if (newMode === 'forgot') {
      url.searchParams.set('forgot', '1')
    } else if (newMode === 'legacy-recovery') {
      url.searchParams.set('mode', 'legacy-recovery')
    }
    const cleanUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '')
    window.history.replaceState({}, '', cleanUrl)
  }
}

const handleGoogleSignIn = async () => {
  if (isGoogleLoading.value) return

  const supabase = getSupabaseClient()
  if (!supabase) {
    errorMessage.value = 'Brak połączenia z systemem logowania. Spróbuj ponownie.'
    return
  }

  isGoogleLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    sessionStorage.setItem('duonest_google_oauth_started_at', String(Date.now()))
    const redirectTo = new URL('/verified?source=google', window.location.origin).toString()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' }
      }
    })

    if (error) {
      sessionStorage.removeItem('duonest_google_oauth_started_at')
      errorMessage.value = translateAuthError(error)
      isGoogleLoading.value = false
    }
  } catch (error: any) {
    sessionStorage.removeItem('duonest_google_oauth_started_at')
    errorMessage.value = translateAuthError(error)
    isGoogleLoading.value = false
  }
}

const translateAuthError = (err: any): string => {
  const msg = err?.message || err?.error_description || String(err)
  if (msg.includes('Masz stare konto DuoNest') || msg.includes('Bezpieczne odzyskanie danych jest wymagane')) {
    return 'Wykryliśmy konto powiązane z tym adresem e-mail. Trwa synchronizacja danych...'
  }
  if (msg.includes('Invalid login credentials') || msg.includes('Nieprawidłowe hasło')) {
    return 'Nieprawidłowy adres e-mail lub hasło. Upewnij się, że wpisujesz poprawne hasło lub wybierz „Nie pamiętasz hasła?”, aby ustawić nowe.'
  }
  if (msg.includes('User already registered') || msg.includes('już istnieje')) {
    return 'Konto z tym adresem e-mail już istnieje. Zaloguj się powyżej lub skorzystaj z „Nie pamiętasz hasła?”.'
  }
  if (msg.includes('Password should be at least 6 characters') || msg.includes('co najmniej 6')) {
    return 'Hasło musi mieć co najmniej 6 znaków.'
  }
  if (msg.includes('Nie znaleziono konta') || msg.includes('Nie znaleziono profilu')) {
    return 'Nie znaleziono konta z tym adresem e-mail. Sprawdź e-mail lub przełącz na rejestrację.'
  }
  if (msg.includes('For security purposes') || msg.includes('over_email_send_rate_limit')) {
    const secondsMatch = msg.match(/after (\d+) seconds/i)
    if (secondsMatch && secondsMatch[1]) {
      return `Zbyt częste próby. Ze względów bezpieczeństwa odczekaj jeszcze ${secondsMatch[1]} sekund przed ponownym wysłaniem.`
    }
    return 'Zbyt wiele prób w krótkim czasie. Odczekaj około minuty przed kolejną prośbą o reset hasła.'
  }
  if (msg.includes('Error sending') || msg.includes('email provider')) {
    return 'Problem z wysyłką wiadomości e-mail. Sprawdź konfigurację SMTP w Supabase lub spróbuj ponownie za chwilę.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Brak połączenia z siecią. Sprawdź swoje połączenie internetowe.'
  }
  return msg || 'Wystąpił problem. Sprawdź wprowadzone dane.'
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  const hash = window.location.hash || ''
  const search = window.location.search || ''
  const urlParams = new URLSearchParams(search)

  // 1. If recovery intent or tokens detected, immediately delegate to dedicated /reset-password
  const isRecoveryIntent =
    urlParams.has('token_hash') ||
    hash.includes('token_hash') ||
    urlParams.has('token') ||
    hash.includes('token=') ||
    urlParams.get('type') === 'recovery' ||
    hash.includes('type=recovery') ||
    hash.includes('access_token') ||
    urlParams.has('code') ||
    hash.includes('error=') ||
    urlParams.has('error')

  if (isRecoveryIntent) {
    window.location.href = '/reset-password' + search + hash
    return
  }

  // 2. Check if an active authenticated session already exists
  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const hasProfile = await syncUserProfileWithAuth(session.user)
        if (hasProfile) {
          const destination = (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id) ? '/tabs/nest' : '/pairing'
          window.location.replace(destination)
          return
        }
      }
    } catch (_) {}
  }

  // 3. Set email from URL if provided
  if (urlParams.get('email')) {
    emailInput.value = sanitizeEmail(urlParams.get('email'))
  }

  // 4. Check if user came from query params
  if (route?.query?.forgot === '1') {
    mode.value = 'forgot'
  } else if (route?.query?.mode === 'legacy-recovery') {
    mode.value = 'legacy-recovery'
  }
})

const handleSubmit = async () => {
  if (!isFormValid.value || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (mode.value === 'login') {
      const { error } = await signInWithEmail(emailInput.value, passwordInput.value)
      if (error) {
        errorMessage.value = translateAuthError(error)
        isLoading.value = false
        return
      }

      const destination = (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id) ? '/tabs/nest' : '/pairing'
      window.location.href = destination
    } else if (mode.value === 'register') {
      const { data, error } = await signUpWithEmail(
        emailInput.value,
        passwordInput.value,
        nameInput.value
      )
      if (error) {
        errorMessage.value = translateAuthError(error)
        isLoading.value = false
        return
      }

      if (data?.needsEmailVerification) {
        successMessage.value = `Konto zostało pomyślnie utworzone! Wysłaliśmy e-mail z linkiem aktywacyjnym na adres ${emailInput.value}. Otwórz wiadomość i kliknij w link, aby aktywować konto (sprawdź też folder SPAM).`
        isLoading.value = false
        return
      }

      const destination = (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id) ? '/tabs/nest' : '/pairing'
      window.location.href = destination
    } else if (mode.value === 'forgot') {
      const { error } = await requestPasswordReset(emailInput.value)
      if (error) {
        errorMessage.value = translateAuthError(error)
        isLoading.value = false
        return
      }

      successMessage.value = 'Jeśli podany adres e-mail istnieje w bazie, przesłana została wiadomość z bezpiecznym linkiem oraz 6-cyfrowym kodem weryfikacyjnym. Sprawdź swoją skrzynkę (w tym folder SPAM).'
    } else if (mode.value === 'legacy-recovery') {
      const cleanEmail = sanitizeEmail(emailInput.value)

      // Step 1: If user already migrated their credentials, attempt direct login first
      const { data: signInData, error: signInError } = await signInWithEmail(cleanEmail, passwordInput.value)
      if (!signInError && signInData?.user) {
        const destination = (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id) ? '/tabs/nest' : '/pairing'
        window.location.href = destination
        return
      }

      // Step 2: Attempt signUp to create auth credentials and link legacy profile
      const { data, error } = await signUpWithEmail(
        cleanEmail,
        passwordInput.value,
        nameInput.value
      )

      if (error) {
        const errMsg = String(error.message || '')
        if (errMsg.includes('User already registered') || errMsg.includes('already exists') || errMsg.includes('już istnieje')) {
          switchMode('login')
          emailInput.value = cleanEmail
          errorMessage.value = `Konto dla ${cleanEmail} jest już aktywne. Zaloguj się powyżej swoim hasłem lub skorzystaj z „Nie pamiętasz hasła?”.`
          isLoading.value = false
          return
        }
        errorMessage.value = translateAuthError(error)
        isLoading.value = false
        return
      }

      if (data?.isExistingUser) {
        switchMode('login')
        emailInput.value = cleanEmail
        errorMessage.value = `Konto dla ${cleanEmail} zostało już wcześniej pomyślnie zmigrowane i jest aktywne. Zaloguj się powyżej swoim hasłem lub skorzystaj z „Nie pamiętasz hasła?”.`
        isLoading.value = false
        return
      }

      if (data?.session || (!data?.needsEmailVerification && !data?.needsLegacyRecovery)) {
        const destination = (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id) ? '/tabs/nest' : '/pairing'
        window.location.href = destination
        return
      }

      if (data?.needsEmailVerification) {
        successMessage.value = `Wysłaliśmy link aktywacyjny na adres ${cleanEmail}. Kliknij w link w odebranej wiadomości, aby potwierdzić konto i dokończyć odzyskiwanie danych.`
        isLoading.value = false
        return
      }

      successMessage.value = 'Konto zostało pomyślnie zaktualizowane. Możesz się teraz zalogować.'
      switchMode('login')
    }
  } catch (err: any) {
    errorMessage.value = translateAuthError(err)
  } finally {
    isLoading.value = false
  }
}

const handleResendVerification = async () => {
  if (!emailInput.value) {
    errorMessage.value = 'Wprowadź adres e-mail powyżej, aby wysłać link aktywacyjny.'
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await resendVerificationEmail(emailInput.value)
    if (error) {
      errorMessage.value = translateAuthError(error)
    } else {
      successMessage.value = `Nowy link aktywacyjny został wysłany na adres ${emailInput.value}! Sprawdź swoją skrzynkę (w tym folder SPAM).`
    }
  } catch (err: any) {
    errorMessage.value = translateAuthError(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-content {
  --background: #f0f9ff;
}

.login-container {
  max-width: 440px;
  margin: 0 auto;
  padding: 36px 20px 48px;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  justify-content: center;
}

.login-hero {
  text-align: center;
  margin-bottom: 24px;
}

.logo-wrapper {
  display: inline-flex;
  padding: 12px;
  background: rgba(15, 23, 42, 0.06);
  border-radius: 28px;
  box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.12);
  margin-top: 2rem;
}

.login-logo {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: block;
  object-fit: cover;
}

.login-title {
  font-family: 'Outfit', sans-serif;
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.5px;
  padding: 0;
  margin: 0;
}

.auth-card {
  padding: 24px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 12px 36px -8px rgba(15, 23, 42, 0.08);
}

.mode-switcher {
  display: flex;
  background: #f1f5f9;
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 22px;
}

.mode-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  border-radius: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
}

.auth-subview-header {
  margin-bottom: 22px;
}

.back-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 13.5px;
  font-weight: 600;
  padding: 0 0 12px 0;
  cursor: pointer;
  transition: color 0.15s ease;
}

.back-link-btn:hover {
  color: #0f172a;
}

.subview-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px 0;
  letter-spacing: -0.3px;
}

.subview-desc {
  font-size: 13.5px;
  line-height: 1.5;
  color: #64748b;
  margin: 0;
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
  justify-content: space-between;
  align-items: center;
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.password-hint {
  font-size: 11px;
  color: #94a3b8;
}

.input-container {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  padding: 0 14px;
  transition: all 0.2s ease;
}

.input-container:focus-within {
  border-color: #0f172a;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.field-icon {
  font-size: 18px;
  color: #94a3b8;
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
  transition: color 0.15s ease;
}

.eye-toggle-btn:hover {
  color: #0f172a;
}

.field-aux-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
  margin-bottom: 2px;
}

.legacy-recovery-note {
  margin: 2px 0 12px;
}

.legacy-recovery-note p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: #475569;
}

.inline-legacy-link {
  display: inline;
  background: transparent;
  border: none;
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  font: inherit;
  text-decoration: underline;
}

.forgot-link-btn {
  background: transparent;
  border: none;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s ease, opacity 0.15s ease;
}

.forgot-link-btn:hover {
  color: #020617;
  text-decoration: underline;
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

.succ-icon {
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
  gap: 8px;
  background: #0f172a;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
}

.submit-btn:active {
  background: #1e293b;
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 20px;
  height: 20px;
}

.social-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 16px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider-text {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.8px;
}

.social-buttons-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.social-btn {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 11px 16px;
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  cursor: not-allowed;
  position: relative;
  transition: background 0.15s ease;
}

.social-google {
  cursor: pointer;
}

.social-google:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.social-icon {
  flex-shrink: 0;
  margin-right: 12px;
}

.social-text {
  font-size: 13.5px;
  font-weight: 600;
  color: #64748b;
  flex: 1;
  text-align: left;
}

.soon-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #64748b;
  letter-spacing: 0.3px;
}

.disabled-btn {
  opacity: 0.7;
}

.login-footer {
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 24px;
  line-height: 1.5;
}

.recovery-email-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 14px;
  padding: 10px 14px;
}

.recovery-email-left {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.recovery-email-icon {
  font-size: 20px;
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
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recovery-email-change-btn {
  background: transparent;
  border: none;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  text-decoration: underline;
}

.resend-verification-container {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.resend-verification-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  color: #0f172a;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.resend-verification-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.resend-verification-btn:active {
  transform: scale(0.98);
}
</style>
