import { getRemoteConfig, type RemoteConfigTemplate } from 'firebase-admin/remote-config'
import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import { compareAppVersions, normalizeIosUpdateUrl } from './appVersion'
import { diagnosticsCollections } from './nativeDiagnostics'

const VERSION_FIELDS = {
  version: 'ios_minimum_version',
  build: 'ios_minimum_build',
  url: 'ios_update_url'
} as const

function locateParameter(template: RemoteConfigTemplate, key: string) {
  for (const group of Object.values(template.parameterGroups ?? {})) {
    if (Object.hasOwn(group.parameters, key)) return group.parameters
  }
  return template.parameters
}

function versionSettings(template: RemoteConfigTemplate) {
  function get(key: string) {
    const value = locateParameter(template, key)[key]?.defaultValue
    return value && 'value' in value ? value.value : ''
  }
  return {
    version: get(VERSION_FIELDS.version),
    build: get(VERSION_FIELDS.build),
    url: get(VERSION_FIELDS.url),
    revision: template.etag
  }
}

export async function readIosSettings() {
  return versionSettings(await getRemoteConfig().getTemplate())
}

export function validateIosSettings(input: unknown) {
  if (!input || typeof input !== 'object') return null
  const { version, build, url, revision } = input as Record<string, unknown>
  if (typeof version !== 'string' || typeof build !== 'string' ||
    typeof url !== 'string' || url.length > 500 || typeof revision !== 'string' ||
    !revision || revision.length > 200) return null
  const trimmedVersion = version.trim()
  const trimmedBuild = build.trim()
  const trimmedUrl = url.trim()
  const normalizedUrl = trimmedUrl ? normalizeIosUpdateUrl(trimmedUrl) : ''
  if ((trimmedVersion && compareAppVersions(trimmedVersion, '0') === null) ||
    (trimmedBuild && (!trimmedVersion || compareAppVersions(trimmedBuild, '0') === null)) ||
    normalizedUrl === null) return null
  return { version: trimmedVersion, build: trimmedBuild, url: normalizedUrl, revision }
}

export async function publishIosSettings(
  settings: NonNullable<ReturnType<typeof validateIosSettings>>,
  audit: { db: Firestore; actor: string }
) {
  const remote = getRemoteConfig()
  const template = await remote.getTemplate()
  if (template.etag !== settings.revision) return null
  const previous = versionSettings(template)
  for (const field of ['version', 'build', 'url'] as const) {
    const key = VERSION_FIELDS[field]
    const container = locateParameter(template, key)
    container[key] = { ...container[key], defaultValue: { value: settings[field] }, valueType: 'STRING' }
  }
  await remote.validateTemplate(template)
  const entry = audit.db.collection('admin_audit').doc()
  const { version, build, url } = settings
  await entry.create({
    actor: audit.actor, action: 'publish_ios_settings', date: Timestamp.now(),
    version, build, url, previous: { version: previous.version, build: previous.build, url: previous.url },
    status: 'pending'
  })
  // The revision from Firebase links this publication with its pre-existing audit record.
  template.version = { description: 'DuoNest admin audit ' + entry.id }
  let published: RemoteConfigTemplate
  try {
    published = await remote.publishTemplate(template)
  } catch (error) {
    // For an ambiguous failure (e.g. transport timeout), leave the record pending.
    const status = (error as { httpErrorCode?: { status?: number } })?.httpErrorCode?.status
    if (status && status >= 400 && status < 500) await entry.update({ status: 'failed' }).catch(() => undefined)
    throw error
  }
  await entry.update({ status: 'published', revision: published.etag }).catch(() => {
    console.warn('[admin] Failed to finalize iOS settings audit entry', entry.id)
  })
  return versionSettings(published)
}

export async function readAdminHistory(db: Firestore) {
  const remote = getRemoteConfig()
  const [snapshot, versions] = await Promise.all([
    db.collection('admin_audit').orderBy('date', 'desc').limit(50).get(),
    remote.listVersions({ pageSize: 100 }).catch(() => null)
  ])
  const published = new Set(versions?.versions?.map(version => version.description) ?? [])
  return snapshot.docs.map(document => {
    const { actor, date, version, build, url, previous, status } = document.data()
    return {
      id: document.id, actor, date: date.toMillis(), version, build, url, previous,
      status: status === 'pending' && published.has('DuoNest admin audit ' + document.id) ? 'published' : (status ?? 'published')
    }
  })
}

export async function readAdminDashboard(db: Firestore) {
  const collections = ['profiles', 'partnerships', 'tasks', 'meals'] as const
  const since = Timestamp.fromMillis(Date.now() - 30 * 86_400_000)
  const platforms = ['ios', 'android'] as const
  const [counts, snapshots] = await Promise.all([
    Promise.all(collections.map(name => db.collection(name).count().get())),
    Promise.all(platforms.map(platform => db.collection(diagnosticsCollections[platform])
      .where('receivedAt', '>=', since).orderBy('receivedAt', 'desc').limit(501).get()))
  ])
  const reports = snapshots.flatMap((snapshot, index) => snapshot.docs.slice(0, 500).map(document => {
    const { day, version, build, kind, values } = document.data()
    return { id: document.id, platform: platforms[index], day, version, build, kind, values }
  }))
  return {
    totals: Object.fromEntries(collections.map((key, index) => [key, counts[index].data().count])),
    reports, reportsTruncated: Object.fromEntries(platforms.map((platform, index) => [platform, snapshots[index].size > 500]))
  }
}
