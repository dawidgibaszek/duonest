import type { RequestHandler } from 'express'
import { getAppCheck } from 'firebase-admin/app-check'
import { getRemoteConfig } from 'firebase-admin/remote-config'
import { compareAppVersions, needsAppUpdate } from './appVersion'

const IOS_APP_ID = '1:273218538953:ios:1efc6d10056bb9b466ec18'
const POLICY_TTL = 60_000

let policy: { expiresAt: number; version: string; build: string } | undefined
let policyFetch: Promise<NonNullable<typeof policy>> | undefined

function getIosAccessPolicy() {
  if (policy && policy.expiresAt > Date.now()) return Promise.resolve(policy)
  policyFetch ??= getRemoteConfig().getTemplate().then(template => {
    const parameters = Object.assign({}, ...Object.values(template.parameterGroups ?? {}).map(group => group.parameters), template.parameters)
    const getDefault = (key: string) => parameters[key]?.defaultValue?.value?.trim() ?? ''
    const version = getDefault('ios_minimum_version')
    const build = getDefault('ios_minimum_build')
    if ((version && compareAppVersions(version, version) === null) ||
      (build && compareAppVersions(build, build) === null)) throw new Error('Invalid iOS version policy')

    return policy = { expiresAt: Date.now() + POLICY_TTL, version, build }
  }).finally(() => { policyFetch = undefined })
  return policyFetch
}

export const requireDuoClient: RequestHandler = async (req, res, next) => {
  // The browser-only admin router validates its own password session and role.
  if (/^\/api\/admin(?:\/|$)/i.test(req.path)) return next()
  // Calendar apps authenticate with the feed's own opaque subscription token.
  if (req.method === 'GET' && req.path === '/api/calendar/feed') return next()
  if (process.env.DUO_APP_CHECK_ENFORCE !== 'true') return next()

  let appId: string
  try {
    const token = req.get('X-Firebase-AppCheck')
    if (!token) return res.status(403).json({ error: 'app_attestation_required' })
    const verified = await getAppCheck().verifyToken(token)
    appId = verified.appId
  } catch {
    return res.status(403).json({ error: 'invalid_app_attestation' })
  }

  if (appId !== IOS_APP_ID) return res.status(403).json({ error: 'unauthorized_app' })

  try {
    const { version: minimumVersion, build: minimumBuild } = await getIosAccessPolicy()
    const version = req.get('X-DuoNest-Version') ?? ''
    const build = req.get('X-DuoNest-Build') ?? ''
    // Version headers are used for compatibility only, after verifying the app identity.
    if (minimumVersion && (
      compareAppVersions(version, version) === null ||
      (minimumBuild && compareAppVersions(version, minimumVersion) === 0 && compareAppVersions(build, build) === null) ||
      needsAppUpdate({ version, build }, minimumVersion, minimumBuild)
    )) return res.status(426).json({ error: 'update_required', message: 'Zaktualizuj DuoNest, aby dalej korzystać z aplikacji.' })
  } catch (error) {
    console.error('[client-access] Unable to refresh iOS version policy', (error as { code?: string })?.code)
    return res.status(503).json({ error: 'version_policy_unavailable' })
  }
  return next()
}
