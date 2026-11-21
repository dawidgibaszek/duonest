import type { FirebaseApp } from 'firebase/app'
import { getAuth, initializeAuth, indexedDBLocalPersistence, type Auth } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'

/**
 * The single way to obtain the Firebase Auth instance – use it instead of getAuth().
 *
 * In the iOS app (Capacitor) getAuth() wires up the browser popup/redirect
 * resolver, which loads an iframe from authDomain and hangs forever inside
 * WKWebView (capacitor://localhost). There Auth must be created with
 * initializeAuth() *before* anything calls getAuth(), otherwise the browser
 * instance wins and every sign-in spins endlessly.
 */
export function getDuoAuth(app: FirebaseApp): Auth {
  if (!Capacitor.isNativePlatform()) return getAuth(app)
  try {
    return initializeAuth(app, { persistence: indexedDBLocalPersistence })
  } catch (_) {
    return getAuth(app) // already created by an earlier initializeAuth (HMR / second caller)
  }
}
