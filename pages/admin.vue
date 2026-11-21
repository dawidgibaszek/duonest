<template>
  <ion-page>
    <ion-content fullscreen>
      <main class="admin" :class="{ 'admin--login': !dashboard }">
        <header class="admin-header">
          <img src="/logo.svg" alt="DuoNest" width="48" height="48">
          <button v-if="dashboard" type="button" class="dn-button-secondary" @click="logout">Wyloguj</button>
        </header>

        <div v-if="loading" class="admin-card admin-loading" role="status">Ładowanie panelu…</div>
        <form v-else-if="!dashboard" class="admin-card admin-login" @submit.prevent="login">
          <h1>Panel administratora</h1>
          <label for="admin-email">Adres e-mail</label>
          <input id="admin-email" v-model.trim="email" type="email" autocomplete="username" required maxlength="254">
          <label for="admin-password">Hasło</label>
          <input id="admin-password" v-model="password" type="password" autocomplete="current-password" required maxlength="4096">
          <p v-if="loginError" class="admin-error" role="alert">{{ loginError }}</p>
          <button class="dn-button-primary" type="submit" :disabled="busy">{{ signInMethod === 'password' ? 'Logowanie…' : 'Zaloguj się' }}</button>
          <div class="dn-auth-divider">lub</div>
          <button class="dn-button-secondary admin-social" type="button" :disabled="busy" @click="signIn('google')">
            <ion-icon :icon="logoGoogle" aria-hidden="true" />
            {{ signInMethod === 'google' ? 'Łączenie z Google…' : 'Kontynuuj z Google' }}
          </button>
          <button class="dn-button-secondary admin-social" type="button" :disabled="busy" @click="signIn('apple')">
            <ion-icon :icon="logoApple" aria-hidden="true" />
            {{ signInMethod === 'apple' ? 'Łączenie z Apple…' : 'Kontynuuj z Apple' }}
          </button>
        </form>

        <template v-else>
          <div class="admin-title">
            <h1>Panel administratora</h1>
            <button class="dn-button-secondary" type="button" :disabled="busy" @click="refresh">Odśwież</button>
          </div>
          <p v-if="dashboardError" class="admin-error" role="alert">{{ dashboardError }}</p>
          <section class="admin-totals" aria-label="Statystyki aplikacji">
            <div v-for="[key, label] in totalLabels" :key="key" class="admin-card admin-total">
              <span>{{ label }}</span>
              <strong>{{ formatNumber(dashboard.totals[key]) }}</strong>
            </div>
          </section>

          <div class="admin-grid">
            <section class="admin-card">
              <h2>Diagnostyka iOS</h2>
              <p class="admin-note">Do 100 ostatnich raportów MetricKit.</p>
              <div v-if="dashboard.reports.length" class="admin-filter">
                <label for="admin-build-filter">Pokaż build</label>
                <select id="admin-build-filter" v-model="buildFilter">
                  <option value="">Wszystkie</option>
                  <option v-for="build in builds" :key="build">{{ build }}</option>
                </select>
              </div>
              <p v-else class="admin-empty">Brak raportów. Pojawią się po zebraniu danych przez iOS i ich przesłaniu z aplikacji.</p>
              <div v-if="visibleReports.length" class="admin-report-list">
                <details v-for="(report, index) in visibleReports" :key="`${report.day}-${report.build}-${index}`">
                  <summary>
                    <strong>{{ reportBuild(report) }}</strong>
                    <span>{{ report.day }} · {{ report.kind === 'metrics' ? 'Wydajność' : 'Diagnostyka' }}</span>
                  </summary>
                  <dl>
                    <template v-for="(value, key) in report.values" :key="key">
                      <dt>{{ metricLabels[key] || key }}</dt>
                      <dd>{{ formatNumber(value) }}</dd>
                    </template>
                  </dl>
                </details>
              </div>
            </section>

            <form class="admin-card admin-settings" @submit.prevent="saveSettings">
              <h2>Aktualizacje iOS</h2>
              <p class="admin-note">Pusta minimalna wersja wyłącza blokadę. Podnoś próg, gdy nowy build jest już dostępny dla użytkowników.</p>
              <p v-if="settingsError" class="admin-error" role="alert">{{ settingsError }}</p>
              <template v-if="settings">
                <label for="admin-version">Minimalna wersja</label>
                <input id="admin-version" v-model.trim="settings.version" placeholder="np. 1.0" maxlength="32">
                <label for="admin-build">Minimalny build w tej wersji</label>
                <input id="admin-build" v-model.trim="settings.build" placeholder="np. 5" maxlength="32">
                <label for="admin-update-url">Link do aktualizacji</label>
                <input id="admin-update-url" v-model.trim="settings.url" type="url" placeholder="https://…" maxlength="500" aria-describedby="admin-update-url-help">
                <p id="admin-update-url-help" class="admin-note">App Store, TestFlight lub https://duonestapp.pl. Puste pole otwiera stronę TestFlight w App Store.</p>
                <button class="dn-button-primary" type="submit" :disabled="saving">{{ saving ? 'Publikowanie…' : 'Opublikuj zmiany' }}</button>
                <p v-if="settingsSaved" class="admin-note" role="status">Ustawienia opublikowane w Firebase.</p>
              </template>
              <button v-else class="dn-button-secondary" type="button" @click="loadSettings">Spróbuj ponownie</button>
            </form>
          </div>
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { getApps, initializeApp } from 'firebase/app'
import { browserPopupRedirectResolver, getAuth, initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { logoApple, logoGoogle } from 'ionicons/icons'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useFirebase } from '~/composables/useFirebase'
import { createFirebaseOAuthProvider } from '~/utils/firebaseOAuth'
import { compareAppVersions, normalizeIosUpdateUrl } from '~/functions/src/appVersion'

type Report = { day: string; version: string; build: string; kind: string; values: Record<string, number> }
type Dashboard = { totals: Record<string, number>; reports: Report[]; expiresAt: number }
type IosSettings = { version: string; build: string; url: string; revision: string }
type SignInMethod = 'password' | 'google' | 'apple'

useHead({ title: 'Administracja DuoNest', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const { app } = useFirebase()
const email = ref('')
const password = ref('')
const loading = ref(true)
const busy = ref(false)
const signInMethod = ref<SignInMethod | null>(null)
const saving = ref(false)
const loginError = ref('')
const dashboardError = ref('')
const settingsError = ref('')
const settingsSaved = ref(false)
const dashboard = ref<Dashboard | null>(null)
const settings = ref<IosSettings | null>(null)
const buildFilter = ref('')
let expiryTimer: number | undefined

const totalLabels = [['profiles', 'Profile'], ['partnerships', 'Pary'], ['tasks', 'Zadania'], ['meals', 'Obiady']] as const
const metricLabels: Record<string, string> = {
  cpuSeconds: 'Czas CPU (s)', gpuSeconds: 'Czas GPU (s)', foregroundSeconds: 'Czas na ekranie (s)',
  backgroundSeconds: 'Czas w tle (s)', peakMemoryMB: 'Szczytowe użycie pamięci (MB)',
  launchSamples: 'Próbki uruchomienia', launchMeanMs: 'Średni czas uruchomienia (ms)',
  hangSamples: 'Próbki zawieszenia', hangMeanMs: 'Średni czas zawieszenia (ms)',
  crashes: 'Awarie', hangs: 'Zawieszenia', cpuExceptions: 'Przeciążenia CPU',
  diskWriteExceptions: 'Nadmierne zapisy na dysk', launchDiagnostics: 'Problemy z uruchomieniem'
}
const reportBuild = (report: Report) => `${report.version} (${report.build})`
const builds = computed(() => [...new Set(dashboard.value?.reports.map(reportBuild))])
const visibleReports = computed(() => dashboard.value?.reports.filter(report => !buildFilter.value ||
  reportBuild(report) === buildFilter.value) ?? [])
const numberFormat = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const formatNumber = (value: number) => numberFormat.format(value)

function resetDashboard() {
  window.clearTimeout(expiryTimer)
  dashboard.value = null
  settings.value = null
  settingsSaved.value = false
}

async function adminRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch('/api/admin' + path, { ...options, cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) throw Object.assign(new Error('Admin request failed'), { status: response.status })
  return response.status === 204 ? undefined as T : await response.json() as T
}

function errorStatus(error: unknown) {
  return (error as { status?: number })?.status
}

function handleExpired(error: unknown) {
  if (![401, 403].includes(errorStatus(error) ?? 0)) return false
  resetDashboard()
  loginError.value = 'Sesja wygasła lub dostęp został cofnięty. Zaloguj się ponownie.'
  return true
}

async function loadSettings() {
  settingsError.value = ''
  try {
    settings.value = await adminRequest<IosSettings>('/ios-settings')
  } catch (error) {
    if (!handleExpired(error)) settingsError.value = 'Nie udało się pobrać ustawień Firebase.'
  }
}

async function loadDashboard() {
  const data = await adminRequest<Dashboard>('/dashboard')
  window.clearTimeout(expiryTimer)
  dashboard.value = data
  if (!builds.value.includes(buildFilter.value)) buildFilter.value = ''
  expiryTimer = window.setTimeout(() => {
    resetDashboard()
    loginError.value = 'Sesja wygasła. Zaloguj się ponownie.'
  }, Math.max(0, data.expiresAt - Date.now()))
}

async function refresh() {
  busy.value = true
  dashboardError.value = ''
  try {
    await loadDashboard()
  } catch (error) {
    if (!handleExpired(error)) dashboardError.value = 'Nie udało się odświeżyć danych.'
  } finally {
    busy.value = false
  }
}

function login() {
  return signIn('password')
}

async function signIn(method: SignInMethod) {
  if (busy.value) return
  busy.value = true
  signInMethod.value = method
  loginError.value = ''
  try {
    // This transient login is separate from the normal DuoNest app session.
    const name = 'duonest-admin'
    const existing = getApps().find(candidate => candidate.name === name)
    const adminAuth = existing ? getAuth(existing) : initializeAuth(initializeApp(app.options, name), { persistence: inMemoryPersistence })
    try {
      const credential = method === 'password'
        ? await signInWithEmailAndPassword(adminAuth, email.value, password.value)
        : await signInWithPopup(adminAuth, createFirebaseOAuthProvider(method), browserPopupRedirectResolver)
      const token = await credential.user.getIdToken()
      await adminRequest('/session', { method: 'POST', headers: { Authorization: 'Bearer ' + token } })
    } finally {
      password.value = ''
      await signOut(adminAuth)
    }
    await loadDashboard()
    await loadSettings()
  } catch (error) {
    resetDashboard()
    const code = (error as { code?: string })?.code
    if (code === 'auth/popup-blocked') {
      loginError.value = 'Przeglądarka zablokowała okno logowania. Zezwól na jego otwarcie i spróbuj ponownie.'
    } else if (code === 'auth/account-exists-with-different-credential') {
      loginError.value = 'To konto korzysta z innej metody logowania. Wybierz ją, aby kontynuować.'
    } else if (errorStatus(error) === 403) {
      loginError.value = 'To konto nie ma dostępu do panelu. Wybierz konto administratora ze zweryfikowanym adresem e-mail.'
    } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      loginError.value = errorStatus(error) === 503 ? 'Panel jest chwilowo niedostępny.' : 'Logowanie nie powiodło się.'
    }
  } finally {
    password.value = ''
    signInMethod.value = null
    busy.value = false
  }
}

async function saveSettings() {
  if (!settings.value || saving.value) return
  settingsError.value = ''
  settingsSaved.value = false
  const { version, build, url } = settings.value
  if (version && compareAppVersions(version, '0') === null) {
    settingsError.value = 'Wpisz poprawną wersję, np. 1.0.'
    return
  }
  if (version && build && compareAppVersions(build, '0') === null) {
    settingsError.value = 'Wpisz poprawny numer buildu, np. 6.'
    return
  }
  if (url && !normalizeIosUpdateUrl(url)) {
    settingsError.value = 'Podaj link HTTPS do App Store, TestFlight lub https://duonestapp.pl.'
    return
  }
  saving.value = true
  try {
    settings.value = await adminRequest<IosSettings>('/ios-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings.value, build: version ? build : '' })
    })
    settingsSaved.value = true
  } catch (error) {
    if (handleExpired(error)) return
    switch (errorStatus(error)) {
      case 400: settingsError.value = 'Formularz zawiera nieprawidłowe dane. Odśwież panel i spróbuj ponownie.'; break
      case 409: settingsError.value = 'Ktoś w międzyczasie zmienił ustawienia. Wczytaj najnowsze dane.'; settings.value = null; break
      default: settingsError.value = 'Nie udało się opublikować ustawień.'
    }
  } finally {
    saving.value = false
  }
}

async function logout() {
  try {
    await adminRequest('/session', { method: 'DELETE' })
    resetDashboard()
    loginError.value = ''
  } catch {
    dashboardError.value = 'Nie udało się wylogować. Sprawdź połączenie i spróbuj ponownie.'
  }
}

onMounted(async () => {
  try {
    await loadDashboard()
    await loadSettings()
  } catch (error) {
    if (errorStatus(error) !== 401 && errorStatus(error) !== 403) loginError.value = 'Panel jest chwilowo niedostępny.'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => window.clearTimeout(expiryTimer))
</script>

<style scoped>
ion-content { --background: var(--dn-field); }
.admin { max-width: 1080px; margin: 0 auto; padding: max(18px, env(safe-area-inset-top)) 20px max(30px, env(safe-area-inset-bottom)); color: var(--dn-ink); }
.admin--login { max-width: 480px; }
.admin-header, .admin-title, .admin-report-list summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.admin-header { margin-bottom: 24px; }
.admin h1, .admin h2 { font-family: var(--dn-serif); color: var(--dn-ink); margin: 0; line-height: 1.1; }
.admin h1 { font-size: clamp(30px, 6vw, 44px); }
.admin h2 { font-size: 25px; }
.admin-title { margin-bottom: 20px; }
.admin-card { background: white; border: 1px solid var(--dn-line); border-radius: 22px; padding: 22px; }
.admin-login, .admin-settings { display: grid; gap: 10px; align-self: start; }
.admin-login h1 { margin-bottom: 12px; }
.admin label { font-size: .83rem; font-weight: 700; }
.admin input, .admin select { width: 100%; min-height: 46px; padding: 10px 14px; border: 1px solid var(--dn-line); border-radius: 13px; background: var(--dn-field); color: var(--dn-ink); font: inherit; }
.admin input:focus-visible, .admin select:focus-visible, .admin summary:focus-visible { outline: 2px solid var(--dn-ink); outline-offset: 2px; }
.admin-login button, .admin-settings button { margin-top: 8px; }
.admin-login .admin-social { margin-top: 0; }
.admin-social ion-icon { font-size: 19px; }
.admin-totals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.admin-total { display: grid; gap: 8px; background: var(--dn-cream); border-color: var(--dn-cream-deep); }
.admin-total span, .admin-note { color: var(--dn-muted); font-size: .9rem; }
.admin-total strong { font-family: var(--dn-serif); font-size: 30px; }
.admin-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; }
.admin-note, .admin-empty { margin: 8px 0; line-height: 1.5; }
.admin-empty { margin-top: 16px; padding: 16px; background: var(--dn-field); border-radius: 14px; }
.admin-filter { margin: 16px 0; display: grid; gap: 6px; }
.admin-report-list { max-height: 480px; overflow-y: auto; }
.admin-report-list details { border-top: 1px solid var(--dn-line); padding: 12px 4px; }
.admin-report-list summary { cursor: pointer; }
.admin-report-list summary span { color: var(--dn-muted); font-size: .8rem; text-align: right; }
.admin-report-list dl { margin: 12px 0 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; font-size: .85rem; }
.admin-report-list dd { margin: 0; font-weight: 700; }
.admin-error { margin: 4px 0; color: var(--dn-danger); font-size: .85rem; }
@media (max-width: 720px) {
  .admin-grid { grid-template-columns: 1fr; }
  .admin-totals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
