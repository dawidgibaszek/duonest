import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { ref, shallowRef } from 'vue'
import { getIosUpdateUrl, needsAppUpdate } from '~/functions/src/appVersion'
import { useFirebase } from '~/composables/useFirebase'

const REMOTE_DEFAULTS = {
  ios_minimum_version: '',
  ios_minimum_build: '',
  ios_update_url: ''
}

export function useAppUpdate() {
  const isIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  const checking = ref(isIos)
  const requiredUpdate = shallowRef<{ url: string } | null>(null)
  const firebase = isIos ? useFirebase().app : undefined
  let inFlight: Promise<void> | undefined

  async function refresh() {
    const [sdk, current] = await Promise.all([import('firebase/remote-config'), App.getInfo()])
    if (!await sdk.isSupported()) return

    const config = sdk.getRemoteConfig(firebase)
    config.defaultConfig = REMOTE_DEFAULTS
    config.settings = { fetchTimeoutMillis: 4000, minimumFetchIntervalMillis: 60000 }

    const apply = () => {
      const minimumVersion = sdk.getString(config, 'ios_minimum_version').trim()
      const minimumBuild = sdk.getString(config, 'ios_minimum_build').trim()
      requiredUpdate.value = needsAppUpdate(current, minimumVersion, minimumBuild)
        ? { url: getIosUpdateUrl(sdk.getString(config, 'ios_update_url').trim()) }
        : null
    }

    // Apply the last known requirement even when the phone starts offline.
    await sdk.ensureInitialized(config)
    apply()
    await sdk.fetchAndActivate(config)
    apply()
  }

  function checkForUpdate() {
    if (!isIos || inFlight) return

    // A slow connection can delay the answer without trapping the user at startup.
    const timer = checking.value ? window.setTimeout(() => { checking.value = false }, 2000) : undefined
    inFlight = refresh().catch(error => {
      if (import.meta.dev) console.warn('Nie udało się sprawdzić wersji DuoNest', error)
    }).finally(() => {
      window.clearTimeout(timer)
      checking.value = false
      inFlight = undefined
    })
  }

  return { checking, requiredUpdate, checkForUpdate }
}
