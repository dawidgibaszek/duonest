import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectDatabaseEmulator, getDatabase } from 'firebase/database'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectAuthEmulator } from 'firebase/auth'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { databaseUrlForProject, DUONEST_PROJECT_ID } from '../functions/src/firebaseProject'
import { getDuoAuth } from './firebaseAuthInstance'

type PublicFirebaseConfig = Partial<Record<
  'firebaseApiKey' | 'firebaseAuthDomain' | 'firebaseProjectId' | 'firebaseStorageBucket' |
  'firebaseMessagingSenderId' | 'firebaseAppId' | 'firebaseDatabaseUrl' | 'firebaseEmulatorHost',
  string
>> & { firebaseUseEmulators?: boolean }

const emulatorApps = ((globalThis as typeof globalThis & { __duonestEmulatorApps?: WeakSet<object> })
  .__duonestEmulatorApps ??= new WeakSet<object>())

export function getDuoFirebase(config: PublicFirebaseConfig = {}) {
  const projectId = config.firebaseProjectId || DUONEST_PROJECT_ID
  if (config.firebaseUseEmulators && !projectId.startsWith('demo-')) {
    throw new Error('Firebase emulators require a demo project')
  }
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

  const auth = getDuoAuth(app)
  const db = getFirestore(app)
  // Always use the default SDK instance keyed by the Firebase app.
  const rtdb = app.options.databaseURL ? getDatabase(app) : null
  const storage = getStorage(app)

  if (config.firebaseUseEmulators && !emulatorApps.has(app)) {
    if (app.options.projectId !== projectId || !rtdb) throw new Error('Firebase emulator configuration is incomplete')
    const host = config.firebaseEmulatorHost || '127.0.0.1'
    if (!['127.0.0.1', 'localhost', 'host.docker.internal'].includes(host)) {
      throw new Error('Invalid Firebase emulator host')
    }
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, host, 8080)
    if (rtdb) connectDatabaseEmulator(rtdb, host, 9000)
    connectStorageEmulator(storage, host, 9199)
    emulatorApps.add(app)
  }

  return { app, auth, db, rtdb, storage }
}
