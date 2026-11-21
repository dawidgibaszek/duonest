const VERSION_PATTERN = /^\d{1,10}(?:\.\d{1,10}){0,2}$/

export function compareAppVersions(current: string, minimum: string) {
  if (!VERSION_PATTERN.test(current) || !VERSION_PATTERN.test(minimum)) return null

  const currentParts = current.split('.').map(Number)
  const minimumParts = minimum.split('.').map(Number)
  for (let index = 0; index < 3; index++) {
    const difference = (currentParts[index] ?? 0) - (minimumParts[index] ?? 0)
    if (difference !== 0) return Math.sign(difference)
  }
  return 0
}

export function needsAppUpdate(
  current: { version: string; build: string },
  minimumVersion: string,
  minimumBuild: string
) {
  const versionOrder = compareAppVersions(current.version, minimumVersion)
  return versionOrder === -1 || (
    versionOrder === 0 && compareAppVersions(current.build, minimumBuild) === -1
  )
}

export function normalizeIosUpdateUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['apps.apple.com', 'testflight.apple.com'].includes(url.hostname)) return url.href
  } catch {
    // An empty Remote Config parameter uses the TestFlight fallback.
  }
  return null
}

export function getIosUpdateUrl(value: string) {
  return normalizeIosUpdateUrl(value) ?? 'https://apps.apple.com/app/testflight/id899247664'
}
