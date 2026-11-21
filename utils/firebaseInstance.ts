import { getApp, getApps, initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'
import { databaseUrlForProject, DUONEST_PROJECT_ID } from '../functions/src/firebaseProject'
import { getDuoAuth } from './firebaseAuthInstance'

type PublicFirebaseConfig = Partial<Record<
  'firebaseApiKey' | 'firebaseAuthDomain' | 'firebaseProjectId' | 'firebaseStorageBucket' |
  'firebaseMessagingSenderId' | 'firebaseAppId' | 'firebaseDatabaseUrl',
  string
>>

export function getDuoFirebase(config: PublicFirebaseConfig = {}) {
  const projectId = config.firebaseProjectId || DUONEST_PROJECT_ID
  const app = getApps().some(candidate => candidate.name === '[DEFAULT]')
    ? getApp()
    : initializeApp({
        apiKey: config.firebaseApiKey || 'AIzaSyBrxtidFifD4vlf9OPSu9jkMWJLVsJAKV8',
        authDomain: config.firebaseAuthDomain || 'duonest-38dc2.firebaseapp.com',
        projectId,
        storageBucket: config.firebaseStorageBucket || 'duonest-38dc2.firebasestorage.app',
        messagingSenderId: config.firebaseMessagingSenderId || '273218538953',
        appId: config.firebaseAppId || '1:273218538953:web:f8daf30bf01ae40a66ec18',
        databaseURL: config.firebaseDatabaseUrl || databaseUrlForProject(projectId)
      })

  return {
    app,
    auth: getDuoAuth(app),
    db: getFirestore(app),
    // Always use the default SDK instance keyed by the Firebase app.
    rtdb: app.options.databaseURL ? getDatabase(app) : null
  }
}
