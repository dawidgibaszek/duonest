import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDuoAuth } from '~/utils/firebaseAuthInstance'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'

export function useFirebase() {
  const nuxtApp = useNuxtApp()
  const config = useRuntimeConfig()

  const fbConfig = {
    apiKey: config.public.firebaseApiKey || 'AIzaSyBrxtidFifD4vlf9OPSu9jkMWJLVsJAKV8',
    authDomain: config.public.firebaseAuthDomain || 'duonest-38dc2.firebaseapp.com',
    projectId: config.public.firebaseProjectId || 'duonest-38dc2',
    storageBucket: config.public.firebaseStorageBucket || 'duonest-38dc2.firebasestorage.app',
    messagingSenderId: config.public.firebaseMessagingSenderId || '273218538953',
    appId: config.public.firebaseAppId || '1:273218538953:web:f8daf30bf01ae40a66ec18',
    databaseURL: config.public.firebaseDatabaseUrl || ''
  }

  const app = getApps().length === 0 ? initializeApp(fbConfig) : getApp()
  const auth = getDuoAuth(app)
  const db = getFirestore(app)
  const rtdb = fbConfig.databaseURL ? getDatabase(app) : null

  return {
    app,
    auth,
    db,
    rtdb
  }
}
