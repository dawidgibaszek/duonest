import { GoogleAuth } from 'google-auth-library'
import { featureEvents } from './analyticsEvents'
import { compareAppVersions } from './appVersion'
import { readIosSettings } from './adminDashboard'

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/analytics.readonly'] })
const featureNames = Object.keys(featureEvents)
const onboarding = [
  ['signup', 'duo_signup'],
  ['ready', 'duo_account_ready'],
  ['paired', 'duo_paired'],
  ['first_action', ...featureNames]
]
const cache = new Map<string, { until: number; value: Promise<unknown> }>()

function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const found = cache.get(key)
  if (found && found.until > Date.now()) return found.value as Promise<T>
  if (cache.size >= 100) cache.delete(cache.keys().next().value!)
  const value = load().catch(error => {
    if (cache.get(key)?.value === value) cache.delete(key)
    throw error
  })
  cache.set(key, { until: Date.now() + ttl, value })
  return value
}

export function parseAnalyticsFilters(query: Record<string, unknown>) {
  const { days = '30', platform = 'all', version = '', mode = 'overview' } = query
  if (typeof days !== 'string' || !['7', '30', '90'].includes(days) ||
    typeof platform !== 'string' || !['all', 'iOS', 'Android'].includes(platform) ||
    typeof version !== 'string' || (version && compareAppVersions(version, '0') === null) ||
    (mode !== 'overview' && mode !== 'releases')) return null
  return { days: Number(days), platform, version, mode }
}
type Filters = NonNullable<ReturnType<typeof parseAnalyticsFilters>>
type DimensionValue = { value: string }
type Row = { dimensionValues?: DimensionValue[]; metricValues?: DimensionValue[] }
type Report = {
  rows?: Row[]
  metadata?: { subjectToThresholding?: boolean; dataLossFromOtherRow?: boolean }
}

const dimensions = (...names: string[]) => names.map(name => ({ name }))
const values = (row: Row | undefined) => row?.metricValues?.map(metric => Number(metric.value)) ?? []
const dimensionValues = (row: Row) => row.dimensionValues?.map(item => item.value) ?? []
const filter = (fieldName: string, options: string[]) => ({ fieldName, inListFilter: { values: options, caseSensitive: true } })
const intersect = (filters: ReturnType<typeof filter>[]) => ({
  andGroup: { expressions: filters.map(item => ({ filter: item })) }
})

function mobileFilters(platform: string) {
  const platforms = platform === 'all' ? ['iOS', 'Android'] : [platform]
  const ids = process.env.GA4_APP_STREAM_IDS?.split(',').map(id => id.trim()).filter(id => /^\d+$/.test(id)) ?? []
  return [filter('platform', platforms), ...(ids.length ? [filter('streamId', ids)] : [])]
}

export function analyticsConfigured() {
  return /^\d+$/.test(process.env.GA4_PROPERTY_ID ?? '')
}

async function request<T>(method: string, body: object, api = 'v1beta'): Promise<T> {
  const response = await auth.request<T>({
    url: `https://analyticsdata.googleapis.com/${api}/properties/${process.env.GA4_PROPERTY_ID}:${method}`,
    method: 'POST', data: body, timeout: 7_500, retry: false
  })
  return response.data
}

export function readAnalytics({ days, platform, version, mode }: Filters) {
  return cached(JSON.stringify([days, platform, version, mode]), 5 * 60_000, async () => {
    const base = mobileFilters(platform)
    const selected = version ? [...base, filter('appVersion', [version])] : base
    const dateRanges = [{ startDate: `${days - 1}daysAgo`, endDate: 'today' }]
    const trafficMetrics = dimensions('activeUsers', 'newUsers', 'sessions')
    const [main, steps, minimum] = await Promise.all([
      request<{ reports: Report[] }>('batchRunReports', { requests: [
        { dateRanges, metrics: trafficMetrics, dimensionFilter: intersect(selected) },
        { dateRanges, dimensions: dimensions('date'), metrics: trafficMetrics, dimensionFilter: intersect(selected),
          orderBys: [{ dimension: { dimensionName: 'date' } }] },
        { dateRanges, dimensions: dimensions('eventName'), metrics: dimensions('totalUsers', 'eventCount'),
          dimensionFilter: intersect([...selected, filter('eventName', [...featureNames, 'duo_email_verified'])]) },
        { dateRanges, dimensions: dimensions('appVersion', 'platform'), metrics: dimensions('sessions', 'activeUsers'),
          dimensionFilter: intersect(base), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }
      ] }),
      mode === 'overview' ? request<{ funnelVisualization?: Report }>('runFunnelReport', {
        dateRanges,
        funnel: { isOpenFunnel: false, steps: onboarding.map(([name, ...events]) => {
          const matches = events.map(eventName => ({ funnelEventFilter: { eventName } }))
          return {
            name,
            filterExpression: { andGroup: { expressions: [
              ...(matches.length === 1 ? matches : [{ orGroup: { expressions: matches } }]),
              ...selected.map(item => ({ funnelFieldFilter: item }))
            ] } }
          }
        }) }
      }, 'v1alpha').catch(error => {
        console.warn('[admin] GA4 onboarding report unavailable', error?.response?.status ?? error?.code)
        return null
      }) : null,
      mode === 'releases' && platform !== 'Android' ? readIosSettings().catch(() => null) : null
    ])
    const [totals, daily, events, versions] = main.reports
    const [active = 0, newUsers = 0, sessions = 0] = values(totals.rows?.[0])
    const eventCounts = Object.fromEntries((events.rows ?? []).map(row => [dimensionValues(row)[0], values(row)]))
    const funnelRows = Object.fromEntries((steps?.funnelVisualization?.rows ?? []).map(row => [
      dimensionValues(row)[0]?.replace(/^\d+\.\s+/, ''), values(row)[0]
    ]))
    const versionRows = (versions.rows ?? []).map(row => {
      const [version, platform] = dimensionValues(row)
      const [sessions = 0, active = 0] = values(row)
      return { version, platform, sessions, active }
    })
    const coverage = minimum?.version
      ? await iosReleaseCoverage(dateRanges, minimum.version, versionRows).catch(() => null)
      : null
    return {
      generatedAt: Date.now(),
      limitedData: main.reports.some(report => report.metadata?.subjectToThresholding || report.metadata?.dataLossFromOtherRow),
      totals: { active, newUsers, sessions },
      daily: (daily.rows ?? []).map(row => {
        const [day] = dimensionValues(row)
        const [active, newUsers, sessions] = values(row)
        return { day, active, newUsers, sessions }
      }),
      features: featureNames.map(name => {
        const [users = 0, count = 0] = eventCounts[name] ?? []
        return { name, users, count }
      }),
      versions: versionRows,
      coverage,
      onboarding: steps ? onboarding.map(([name]) => ({ name, users: funnelRows[name] ?? 0 })) : null,
      verifiedUsers: eventCounts.duo_email_verified?.[0] ?? 0
    }
  })
}

async function iosReleaseCoverage(
  dateRanges: Array<{ startDate: string; endDate: string }>,
  minimum: string,
  versions: Array<{ version: string; platform: string }>
) {
  const ios = mobileFilters('iOS')
  const older = versions.filter(row => row.platform === 'iOS' && compareAppVersions(row.version, minimum) === -1)
    .map(row => row.version)
  const metrics = dimensions('activeUsers')
  const requests = [{ dateRanges, metrics, dimensionFilter: intersect(ios) }]
  if (older.length) requests.push({ dateRanges, metrics, dimensionFilter: intersect([...ios, filter('appVersion', older)]) })
  // GA4 deduplicates active users across versions within the selected date range.
  const { reports } = await request<{ reports: Report[] }>('batchRunReports', { requests })
  if (reports.some(report => report.metadata?.subjectToThresholding || report.metadata?.dataLossFromOtherRow)) return null
  return { minimum, active: values(reports[0].rows?.[0])[0] ?? 0, older: values(reports[1]?.rows?.[0])[0] ?? 0 }
}

export function readRealtimeAnalytics(platform: string) {
  return cached('realtime:' + platform, 45_000, async () => {
    const report = await request<Report>('runRealtimeReport', {
      metrics: dimensions('activeUsers'), dimensionFilter: intersect(mobileFilters(platform))
    })
    return { users: values(report.rows?.[0])[0] ?? 0, generatedAt: Date.now() }
  })
}
