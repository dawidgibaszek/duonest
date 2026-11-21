import { useFirebase } from '~/composables/useFirebase'

export default defineNuxtPlugin(() => {
  const { app, auth, db, rtdb } = useFirebase()

  return {
    provide: {
      firebaseApp: app,
      firebaseAuth: auth,
      firestore: db,
      firebaseRtdb: rtdb
    }
  }
})
