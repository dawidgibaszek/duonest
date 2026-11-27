import { Capacitor } from '@capacitor/core'
import { FirebaseAppCheck } from '@capacitor-firebase/app-check'
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { useFirebase } from '~/composables/useFirebase'
import { installDuoApiFetch } from '~/utils/duoApiClient'

let nativeAppCheckReady: Promise<void> | undefined

export default defineNuxtPlugin(() => {
  const { app, auth, db, rtdb, storage } = useFirebase()
  const duoProductionWeb = app.options.appId === '1:273218538953:web:f8daf30bf01ae40a66ec18' &&
    ['duonestapp.pl', 'www.duonestapp.pl'].includes(window.location.hostname)
  const siteKey = useRuntimeConfig().public.appCheckRecaptchaSiteKey ||
    (duoProductionWeb ? '6LfURTUuAAAAAGT3XuoOJNZ0oUj7qhxP2Y9UYRLk' : '')
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
      firebaseRtdb: rtdb,
      firebaseStorage: storage
    }
  }
})
