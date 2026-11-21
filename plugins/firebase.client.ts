import { Capacitor } from '@capacitor/core'
import { FirebaseAppCheck } from '@capacitor-firebase/app-check'
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { useFirebase } from '~/composables/useFirebase'
import { installDuoApiFetch } from '~/utils/duoApiClient'

let nativeAppCheckReady: Promise<void> | undefined

export default defineNuxtPlugin(() => {
  const { app, auth, db, rtdb } = useFirebase()
  const siteKey = useRuntimeConfig().public.appCheckRecaptchaSiteKey
  const provider = Capacitor.isNativePlatform()
    ? new CustomProvider({
        async getToken() {
          nativeAppCheckReady ??= FirebaseAppCheck.initialize().catch(error => {
            nativeAppCheckReady = undefined
            throw error
          })
          await nativeAppCheckReady
          const { token, expireTimeMillis } = await FirebaseAppCheck.getToken()
          if (!expireTimeMillis) throw new Error('Brak daty ważności tokenu Firebase App Check')
          return { token, expireTimeMillis }
        }
      })
    : siteKey ? new ReCaptchaEnterpriseProvider(siteKey) : undefined

  const appCheck = provider ? initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true }) : undefined
  installDuoApiFetch(appCheck)

  return {
    provide: {
      firebaseApp: app,
      firebaseAuth: auth,
      firestore: db,
      firebaseRtdb: rtdb
    }
  }
})
