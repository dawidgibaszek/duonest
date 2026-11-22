<template>
  <section class="insights" aria-labelledby="insights-title">
    <header class="insights-heading">
      <div>
        <h2 id="insights-title">{{ releasesOnly ? 'Używane wersje' : 'Analityka aplikacji' }}</h2>
        <p>{{ releasesOnly ? 'Rozkład wersji według sesji i aktywnych użytkowników.' : 'Ruch i użycie funkcji na urządzeniach, na których włączono analitykę.' }}</p>
      </div>
      <div v-if="!releasesOnly && live" class="live-count">
        <span>Ostatnie 30 minut · {{ platformLabel }}</span>
        <strong>{{ number(live.users) }}</strong>
        <small>aktywnych użytkowników</small>
      </div>
    </header>

    <div class="insights-filters">
      <label>Okres
        <select v-model="days">
          <option v-for="range in [7, 30, 90]" :key="range" :value="range">Ostatnie {{ range }} dni</option>
        </select>
      </label>
      <label>Platforma
        <select v-model="platform">
          <option value="all">iOS i Android</option>
          <option value="iOS">iOS</option>
          <option value="Android">Android</option>
        </select>
      </label>
      <label v-if="!releasesOnly">Wersja
        <select v-model="version">
          <option value="">Wszystkie wersje</option>
          <option v-for="item in versionOptions" :key="item">{{ item }}</option>
        </select>
      </label>
    </div>

    <p v-if="loading" class="insights-status" role="status">Pobieranie raportu…</p>
    <p v-else-if="error" class="insights-status" role="alert">{{ error }}</p>
    <p v-else-if="!report" class="insights-status">Raporty pojawią się po połączeniu panelu z usługą Google Analytics.</p>
    <template v-else>
      <p v-if="!releasesOnly && liveUnavailable" class="insights-note">Licznik na żywo jest chwilowo niedostępny.</p>
      <div v-if="!releasesOnly" class="insights-totals">
        <div v-for="[key, label] in metrics" :key="key">
          <span>{{ label }}</span>
          <strong>{{ number(report.totals[key]) }}</strong>
        </div>
      </div>
      <p v-if="report.limitedData" class="insights-note">Google może ograniczyć widoczność części danych przy małej liczbie zdarzeń.</p>
      <div v-if="!releasesOnly" class="insights-panel">
        <label>Aktywność dzienna
          <select v-model="selectedMetric">
            <option v-for="[key, label] in metrics" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <template v-if="report.daily.length">
          <svg viewBox="0 0 600 136" preserveAspectRatio="none" class="traffic-chart" role="img" :aria-label="chartLabel">
            <line v-for="y in [12, 68, 124]" :key="y" x1="10" x2="590" :y1="y" :y2="y" />
            <polyline v-if="chart.length > 1" :points="chart.map(point => point.join(',')).join(' ')" />
            <circle v-if="chart.length === 1" :cx="chart[0][0]" :cy="chart[0][1]" r="4" />
          </svg>
          <details>
            <summary>Pokaż wartości dzienne</summary>
            <div class="insights-table">
              <table>
                <thead><tr><th scope="col">Dzień</th><th v-for="[key, label] in metrics" :key="key" scope="col">{{ label }}</th></tr></thead>
                <tbody>
                  <tr v-for="day in report.daily" :key="day.day">
                    <th scope="row">{{ displayDay(day.day) }}</th><td v-for="[key] in metrics" :key="key">{{ number(day[key]) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </template>
        <p v-else class="insights-note">Brak danych za wybrany okres.</p>
      </div>

      <div v-if="!releasesOnly" class="insights-columns">
        <div class="insights-panel">
          <h3>Użycie funkcji</h3>
          <p class="insights-note">Wyniki obejmują zakończone akcje.</p>
          <div class="insights-table">
            <table>
              <thead><tr>
                <th scope="col">Akcja</th>
                <th scope="col" :aria-sort="rankBy === 'users' ? 'descending' : 'none'"><button type="button" @click="rankBy = 'users'">Użytkownicy</button></th>
                <th scope="col" :aria-sort="rankBy === 'count' ? 'descending' : 'none'"><button type="button" @click="rankBy = 'count'">Wykonania</button></th>
              </tr></thead>
              <tbody>
                <tr v-for="item in rankedFeatures" :key="item.name">
                  <th scope="row">{{ eventLabels[item.name] ?? item.name }}</th><td>{{ number(item.users) }}</td><td>{{ number(item.count) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="insights-panel">
          <h3>Pierwsze kroki</h3>
          <p class="insights-note">Kolejne kroki użytkowników, którzy założyli konto w wybranym okresie. Etap gotowości obejmuje weryfikację adresu, gdy jest wymagana.</p>
          <ol v-if="report.onboarding" class="funnel">
            <li v-for="step in report.onboarding" :key="step.name">
              <div><span>{{ funnelLabels[step.name] }}</span><strong>{{ number(step.users) }}<small v-if="funnelStart"> · {{ percent(step.users, funnelStart) }}</small></strong></div>
              <div class="funnel-track" aria-hidden="true"><span :style="{ width: (funnelStart ? step.users / funnelStart * 100 : 0) + '%' }" /></div>
            </li>
          </ol>
          <p v-else class="insights-status">Raport kolejnych kroków jest chwilowo niedostępny.</p>
          <p class="insights-note">Potwierdzenia e-mail odnotowane w tym okresie: {{ number(report.verifiedUsers) }}.</p>
        </div>
      </div>

      <div v-if="releasesOnly" class="insights-panel">
        <p v-if="minimum?.version" class="insights-note">Aktualny próg iOS: {{ minimum.version }}<template v-if="minimum.build">, build {{ minimum.build }}</template>.</p>
        <p v-else-if="minimum" class="insights-note">Blokada starszych wersji iOS jest wyłączona.</p>
        <p v-if="minimum?.version && iosSessions" class="release-warning">
          <template v-if="releaseCoverage">
            {{ percent(releaseCoverage.older, releaseCoverage.active) }} aktywnych użytkowników iOS korzystało z wersji poniżej bieżącego progu.
          </template>
          <template v-else>
            {{ percent(olderIosSessions, iosSessions) }} sesji iOS pochodzi z wersji poniżej bieżącego progu.
          </template>
          <small>Podział według wersji aplikacji. Numer buildu w obrębie tej samej wersji nie wchodzi do tego porównania.</small>
        </p>
        <div v-if="report.versions.length" class="insights-table">
          <table>
            <thead><tr><th scope="col">Wersja</th><th scope="col">Platforma</th><th scope="col">Aktywni</th><th scope="col">Sesje</th><th scope="col">Udział sesji</th></tr></thead>
            <tbody>
              <tr v-for="item in report.versions" :key="item.platform + ':' + item.version">
                <th scope="row">{{ item.version }}</th><td>{{ item.platform }}</td><td>{{ number(item.active) }}</td><td>{{ number(item.sessions) }}</td><td>{{ percent(item.sessions, versionSessions) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="insights-note">Brak danych o wersjach aplikacji.</p>
      </div>
      <footer class="insights-note">Źródło: Firebase Analytics. Raport historyczny może pojawiać się z opóźnieniem.</footer>
    </template>
  </section>
</template>

<script setup lang="ts">
import { featureEvents } from '~/functions/src/analyticsEvents'
import { compareAppVersions } from '~/functions/src/appVersion'

type Traffic = { active: number; newUsers: number; sessions: number }
type Report = {
  configured: true
  limitedData: boolean
  totals: Traffic
  daily: Array<Traffic & { day: string }>
  features: Array<{ name: string; users: number; count: number }>
  onboarding: Array<{ name: string; users: number }> | null
  verifiedUsers: number
  versions: Array<{ version: string; platform: string; sessions: number; active: number }>
  coverage?: { minimum: string; active: number; older: number } | null
}
const props = defineProps<{
  request: <T>(path: string, options?: RequestInit) => Promise<T>
  minimum: { version: string; build: string } | null
  refreshId: number
  pane: 'overview' | 'releases' | 'diagnostics' | 'history'
}>()
const emit = defineEmits<{ expired: [error: unknown] }>()
const days = ref(30)
const platform = ref('all')
const version = ref('')
const report = ref<Report | null>(null)
const versionOptions = ref<string[]>([])
const live = ref<{ users: number } | null>(null)
const liveUnavailable = ref(false)
const loading = ref(true)
const error = ref('')
const rankBy = ref<'users' | 'count'>('users')
const releasesOnly = computed(() => props.pane === 'releases')
const releaseCoverage = computed(() => {
  const coverage = report.value?.coverage
  return coverage?.active && coverage.minimum === props.minimum?.version ? coverage : null
})
const selectedMetric = ref<keyof Traffic>('active')
const metrics = [['active', 'Aktywni użytkownicy'], ['newUsers', 'Nowi użytkownicy'], ['sessions', 'Sesje']] as const
const eventLabels: Record<string, string> = featureEvents
const funnelLabels: Record<string, string> = {
  signup: 'Utworzono konto', ready: 'Konto gotowe do użycia', paired: 'Sparowano konto', first_action: 'Pierwsza akcja w gniazdku'
}
const funnelStart = computed(() => report.value?.onboarding?.[0]?.users ?? 0)
const platformLabel = computed(() => platform.value === 'all' ? 'iOS i Android' : platform.value)
const rankedFeatures = computed(() => [...(report.value?.features ?? [])]
  .sort((a, b) => b[rankBy.value] - a[rankBy.value] || a.name.localeCompare(b.name)))
const number = (value: number) => new Intl.NumberFormat('pl-PL').format(value)
const percent = (value: number, total: number) => new Intl.NumberFormat('pl-PL', {
  style: 'percent', maximumFractionDigits: 1
}).format(total ? value / total : 0)
const displayDay = (value: string) => value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$3.$2.$1')
const versionSessions = computed(() => report.value?.versions.reduce((sum, item) => sum + item.sessions, 0) ?? 0)
const iosVersions = computed(() => report.value?.versions.filter(item => item.platform === 'iOS') ?? [])
const iosSessions = computed(() => iosVersions.value.reduce((sum, item) => sum + item.sessions, 0))
const olderIosSessions = computed(() => iosVersions.value.reduce((sum, item) =>
  compareAppVersions(item.version, props.minimum?.version ?? '') === -1 ? sum + item.sessions : sum, 0))
const chartLabel = computed(() => metrics.find(([key]) => key === selectedMetric.value)?.[1] ?? '')
const chart = computed(() => {
  const daily = report.value?.daily ?? []
  const points = daily.map(item => item[selectedMetric.value])
  const max = Math.max(1, ...points)
  return points.map((value, index) => [
    points.length === 1 ? 300 : 10 + index * 580 / (points.length - 1), 124 - value * 112 / max
  ])
})

watch([days, platform, version, () => props.refreshId, releasesOnly], async (_, __, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = ''
  const query = new URLSearchParams({
    days: String(days.value), platform: platform.value,
    mode: releasesOnly.value ? 'releases' : 'overview', version: releasesOnly.value ? '' : version.value
  })
  try {
    const result = await props.request<Report | { configured: false }>('/analytics?' + query, { signal: controller.signal })
    if (controller.signal.aborted) return
    report.value = result.configured ? result : null
    versionOptions.value = [...new Set(report.value?.versions.map(item => item.version))]
      .filter(item => compareAppVersions(item, '0') !== null).sort((a, b) => compareAppVersions(b, a) ?? 0)
    if (version.value && !versionOptions.value.includes(version.value)) version.value = ''
  } catch (cause) {
    if (controller.signal.aborted) return
    report.value = null
    error.value = 'Nie udało się wczytać raportu Google Analytics.'
    emit('expired', cause)
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })

watch([platform, () => props.refreshId, () => props.pane], (_, __, onCleanup) => {
  const controller = new AbortController()
  live.value = null
  liveUnavailable.value = false
  if (props.pane !== 'overview') return
  const query = new URLSearchParams({ platform: platform.value })
  async function refreshLive() {
    if (document.hidden) return
    try {
      const result = await props.request<{ configured: boolean; users: number }>('/analytics-live?' + query, { signal: controller.signal })
      if (controller.signal.aborted) return
      live.value = result.configured ? result : null
      liveUnavailable.value = false
    } catch (cause) {
      if (controller.signal.aborted) return
      live.value = null
      liveUnavailable.value = true
      emit('expired', cause)
    }
  }
  const timer = window.setInterval(refreshLive, 60_000)
  document.addEventListener('visibilitychange', refreshLive)
  onCleanup(() => {
    controller.abort()
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', refreshLive)
  })
  void refreshLive()
}, { immediate: true })
</script>

<style scoped>
.insights { display: grid; gap: 16px; margin: 16px 0; }
.insights-heading { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
h2, h3 { font-family: var(--dn-serif); margin: 0; color: var(--dn-ink); }
h2 { font-size: 28px; }
h3 { font-size: 22px; }
.insights-heading p, .insights-note, .live-count small { font-size: .85rem; color: var(--dn-muted); line-height: 1.5; margin: 6px 0; }
.live-count { background: var(--dn-cream); border-radius: 16px; padding: 12px 16px; display: grid; font-size: .78rem; }
.live-count strong, .insights-totals strong { font-family: var(--dn-serif); font-size: 28px; }
.live-count small { margin: 0; }
.insights-filters, .insights-totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
label { display: grid; gap: 5px; font-size: .8rem; font-weight: 700; }
select { width: 100%; padding: 10px; border: 1px solid var(--dn-line); border-radius: 12px; background: var(--dn-field); color: var(--dn-ink); font: inherit; }
.insights-totals > div { display: grid; gap: 5px; align-content: space-between; padding: 12px; border-radius: 14px; background: var(--dn-cream); font-size: .8rem; }
.insights-columns { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 16px; }
.insights-panel { border: 1px solid var(--dn-line); border-radius: 16px; padding: 14px; }
.insights-panel > label { max-width: 230px; }
.insights-status { background: var(--dn-field); border-radius: 14px; padding: 12px; margin: 0; }
.traffic-chart { margin: 12px 0; width: 100%; height: 136px; display: block; }
.traffic-chart line { stroke: var(--dn-line); }
.traffic-chart polyline { fill: none; stroke: var(--dn-ink); stroke-width: 2; vector-effect: non-scaling-stroke; }
.traffic-chart circle { fill: var(--dn-ink); }
.insights-table { overflow: auto; max-height: 340px; }
table { width: 100%; border-collapse: collapse; font-size: .8rem; }
th, td { padding: 9px 6px; border-bottom: 1px solid var(--dn-line); text-align: right; }
th:first-child { text-align: left; }
thead th { position: sticky; top: 0; background: white; }
tbody th { font-weight: 500; }
th button { font: inherit; font-weight: 700; background: none; text-decoration: underline; text-underline-offset: 3px; }
.funnel { padding: 0; margin: 16px 0; list-style: none; display: grid; gap: 12px; font-size: .8rem; }
.funnel li > div:first-child { display: flex; justify-content: space-between; gap: 8px; }
.funnel-track { border-radius: 8px; background: var(--dn-field); height: 6px; margin-top: 5px; overflow: hidden; }
.funnel-track span { display: block; max-width: 100%; height: 100%; background: var(--dn-ink); }
.release-warning { background: var(--dn-cream); border-radius: 12px; margin: 12px 0; padding: 10px; font-size: .85rem; }
.release-warning small { display: block; margin-top: 4px; color: var(--dn-muted); }
@media (max-width: 720px) { .insights-columns { grid-template-columns: 1fr; } }
@media (max-width: 440px) { .insights-filters { grid-template-columns: 1fr; } }
</style>
