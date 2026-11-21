import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDuoAuth } from '~/utils/firebaseAuthInstance'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const fbConfig = {
    apiKey: config.public.firebaseApiKey || process.env.FIREBASE_API_KEY || 'AIzaSyBrxtidFifD4vlf9OPSu9jkMWJLVsJAKV8',
    authDomain: config.public.firebaseAuthDomain || process.env.FIREBASE_AUTH_DOMAIN || 'duonest-38dc2.firebaseapp.com',
    projectId: config.public.firebaseProjectId || process.env.FIREBASE_PROJECT_ID || 'duonest-38dc2',
    storageBucket: config.public.firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET || 'duonest-38dc2.firebasestorage.app',
    messagingSenderId: config.public.firebaseMessagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID || '273218538953',
    appId: config.public.firebaseAppId || process.env.FIREBASE_APP_ID || '1:273218538953:web:f8daf30bf01ae40a66ec18',
    databaseURL: config.public.firebaseDatabaseUrl || process.env.FIREBASE_DATABASE_URL || ''
  }

  const app = getApps().length === 0 ? initializeApp(fbConfig) : getApp()
  const auth = getDuoAuth(app)
  const db = getFirestore(app)
  const rtdb = fbConfig.databaseURL ? getDatabase(app) : null

  return {
    provide: {
      firebaseApp: app,
      firebaseAuth: auth,
      firestore: db,
      firebaseRtdb: rtdb
    }
  }
})
