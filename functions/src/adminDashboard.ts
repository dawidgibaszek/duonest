import { getRemoteConfig, type RemoteConfigTemplate } from 'firebase-admin/remote-config'
import { type Firestore } from 'firebase-admin/firestore'
import { compareAppVersions, normalizeIosUpdateUrl } from './appVersion'

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

export async function publishIosSettings(settings: NonNullable<ReturnType<typeof validateIosSettings>>) {
  const remote = getRemoteConfig()
  const template = await remote.getTemplate()
  if (template.etag !== settings.revision) return null
  for (const field of ['version', 'build', 'url'] as const) {
    const key = VERSION_FIELDS[field]
    const container = locateParameter(template, key)
    container[key] = { ...container[key], defaultValue: { value: settings[field] }, valueType: 'STRING' }
  }
  await remote.validateTemplate(template)
  return versionSettings(await remote.publishTemplate(template))
}

export async function readAdminDashboard(db: Firestore) {
  const collections = ['profiles', 'partnerships', 'tasks', 'meals'] as const
  const [counts, recent] = await Promise.all([
    Promise.all(collections.map(name => db.collection(name).count().get())),
    db.collection('ios_diagnostics').orderBy('receivedAt', 'desc').limit(100).get()
  ])
  const reports = recent.docs.map(document => {
    const { day, version, build, kind, values } = document.data()
    return { day, version, build, kind, values }
  })
  return { totals: Object.fromEntries(collections.map((key, index) => [key, counts[index].data().count])), reports }
}
