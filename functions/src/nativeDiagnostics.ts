import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import { compareAppVersions } from './appVersion'

const DAY_MS = 86_400_000
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
export const diagnosticsCollections = { ios: 'ios_diagnostics', android: 'android_diagnostics' } as const
export type DiagnosticsPlatform = keyof typeof diagnosticsCollections

const IOS_LIMITS = {
  metrics: {
    cpuSeconds: 2_000_000,
    gpuSeconds: 2_000_000,
    foregroundSeconds: 172_800,
    backgroundSeconds: 172_800,
    peakMemoryMB: 65_536,
    launchSamples: 100_000,
    launchMeanMs: 600_000,
    hangSamples: 100_000,
    hangMeanMs: 600_000
  },
  diagnostics: {
    crashes: 10_000,
    hangs: 10_000,
    cpuExceptions: 10_000,
    diskWriteExceptions: 10_000,
    launchDiagnostics: 10_000
  }
}

const ANDROID_LIMITS = {
  metrics: {
    foregroundSeconds: 172_800,
    frames: 1_000_000,
    slowFrames: 1_000_000,
    frozenFrames: 1_000_000,
    missedFrameSamples: 1_000_000,
    startupMs: 600_000
  },
  diagnostics: { crashes: 10_000, anrs: 10_000, lowMemoryExits: 10_000 }
}

export function parseNativeDiagnosticReport(input: unknown, platform: DiagnosticsPlatform, now = Date.now()) {
  if (typeof input !== 'object' || input === null) return null
  const { id, day, version, build, kind, values } = input as Record<string, unknown>
  if (typeof id !== 'string' || !UUID.test(id) ||
    typeof version !== 'string' || compareAppVersions(version, '0') === null ||
    typeof build !== 'string' || compareAppVersions(build, '0') === null ||
    typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    (kind !== 'metrics' && kind !== 'diagnostics') ||
    typeof values !== 'object' || values === null || Array.isArray(values)) return null

  const date = Date.parse(day)
  if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== day ||
    date < now - 8 * DAY_MS || date > now + DAY_MS) return null

  const sanitized: Record<string, number> = {}
  const allowed: Record<string, number> = (platform === 'ios' ? IOS_LIMITS : ANDROID_LIMITS)[kind]
  for (const [key, value] of Object.entries(values)) {
    if (!Object.hasOwn(allowed, key) || typeof value !== 'number' ||
      !Number.isFinite(value) || value < 0 || value > allowed[key]) continue
    sanitized[key] = value
  }
  if (!Object.keys(sanitized).length) return null
  return { id: id.toLowerCase(), day, version, build, kind, values: sanitized }
}

export async function storeNativeDiagnosticReports(db: Firestore, platform: DiagnosticsPlatform, reports: unknown[]) {
  const unique = new Map<string, NonNullable<ReturnType<typeof parseNativeDiagnosticReport>>>()
  const now = Date.now()
  for (const input of reports) {
    const report = parseNativeDiagnosticReport(input, platform, now)
    if (report) unique.set(report.id, report)
  }
  if (!unique.size) return

  const entries = [...unique.values()].map(({ id, ...data }) => ({
    ref: db.collection(diagnosticsCollections[platform]).doc(id),
    data
  }))
  await db.runTransaction(async transaction => {
    const snapshots = await transaction.getAll(...entries.map(entry => entry.ref))
    snapshots.forEach((snapshot, index) => {
      if (snapshot.exists) return
      const { ref, data } = entries[index]
      transaction.create(ref, {
        ...data,
        receivedAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(now + 30 * DAY_MS)
      })
    })
  })
}
