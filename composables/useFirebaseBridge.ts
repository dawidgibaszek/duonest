import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  confirmPasswordReset,
  verifyPasswordResetCode,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
  reload,
  signInWithPopup,
  signInWithCredential,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  OAuthProvider
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { trackDuoSignup } from '~/composables/useDuoAnalytics'
import { getDuoFirebase } from '~/utils/firebaseInstance'
import { createFirebaseOAuthProvider } from '~/utils/firebaseOAuth'
import type { User as FirebaseUser } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  setDoc,
  updateDoc,
  writeBatch,
  FieldPath,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import {
  goOffline,
  goOnline,
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  remove as rtdbRemove,
  onValue,
  onChildAdded,
  push as rtdbPush,
  onDisconnect,
  query as rtdbQuery,
  orderByKey,
  orderByChild,
  startAfter,
  endAt,
  limitToLast,
  type DatabaseReference,
  serverTimestamp as rtdbServerTimestamp
} from 'firebase/database'

export interface BridgeUser {
  id: string
  uid: string
  email: string
  email_confirmed_at: string | null
  user_metadata: {
    name?: string
    [key: string]: any
  }
}

export interface BridgeSession {
  access_token: string
  token_type: string
  user: BridgeUser
  expires_in: number
  expires_at: number
}

function formatUser(user: FirebaseUser | null): BridgeUser | null {
  if (!user) return null
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email || '',
    email_confirmed_at: user.emailVerified ? new Date().toISOString() : null,
    email_verified: user.emailVerified,
    providers: user.providerData.map(p => p.providerId),
    user_metadata: {
      name: user.displayName || 'Użytkownik'
    }
  }
}

function firestoreValue(value: any): any {
  if (Array.isArray(value)) return value.map(item => item === undefined ? null : firestoreValue(item))
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, firestoreValue(item)]))
  }
  return value
}

export class FirebaseSupabaseBridge {
  public auth: any
  public db: any
  public rtdb: any
  private activeSubscriptions = new Map<string, Unsubscribe[]>()

  constructor() {
    const config = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
    const { auth, db, rtdb } = getDuoFirebase(config?.public)
    this.auth = auth
    this.db = db
    this.rtdb = rtdb

    this.setupAuthShim()
  }

  private setupAuthShim() {
    const self = this

    this.auth.getSession = async () => {
      if (typeof self.auth.authStateReady === 'function') {
        try {
          await self.auth.authStateReady()
        } catch (_) {}
      }
      const user = self.auth.currentUser
      if (!user) {
        return { data: { session: null }, error: null }
      }
      const token = await user.getIdToken()
      const bridgeUser = formatUser(user)
      const session: BridgeSession = {
        access_token: token,
        token_type: 'bearer',
        user: bridgeUser!,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      return { data: { session }, error: null }
    }

    this.auth.getUser = async () => {
      if (typeof self.auth.authStateReady === 'function') {
        try {
          await self.auth.authStateReady()
        } catch (_) {}
      }
      const user = self.auth.currentUser
      return { data: { user: formatUser(user) }, error: null }
    }

    this.auth.exchangeCodeForSession = async (code: string) => {
      return { data: { session: null }, error: null }
    }

    this.auth.setSession = async (session: any) => {
      return { data: { session: null }, error: null }
    }

    // onIdTokenChanged also fires on hourly token refresh, so the cached
    // access_token (used for /api/* calls) never goes stale.
    this.auth.onAuthStateChange = (callback: (event: string, session: any) => void) => {
      let lastUid: string | null = null
      let sequence = 0
      return onIdTokenChanged(self.auth, async (user) => {
        const request = ++sequence
        if (user) {
          let token: string
          try {
            token = await user.getIdToken()
          } catch {
            if (request === sequence && self.auth.currentUser === user) callback('SESSION_ERROR', null)
            return
          }
          if (request !== sequence || self.auth.currentUser !== user) return
          const bridgeUser = formatUser(user)
          const session: BridgeSession = {
            access_token: token,
            token_type: 'bearer',
            user: bridgeUser!,
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          }
          const event = lastUid === user.uid ? 'TOKEN_REFRESHED' : 'SIGNED_IN'
          lastUid = user.uid
          callback(event, session)
        } else {
          lastUid = null
          self.accountSyncCache = null
          callback('SIGNED_OUT', null)
        }
      })
    }

    this.auth.signInWithPassword = async ({ email, password }: any) => {
      try {
        const cred = await signInWithEmailAndPassword(self.auth, email, password)
        const token = await cred.user.getIdToken()
        const user = formatUser(cred.user)
        const session: BridgeSession = {
          access_token: token,
          token_type: 'bearer',
          user: user!,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        }
        return { data: { user, session }, error: null }
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err }
      }
    }

    this.auth.signUp = async ({ email, password, options }: any) => {
      try {
        const cred = await createUserWithEmailAndPassword(self.auth, email, password)
        if (options?.data?.name) {
          await updateProfile(cred.user, { displayName: options.data.name })
        }
        // Account stays blocked (middleware → /verify-email) until the link is clicked
        try {
          await sendEmailVerification(cred.user)
        } catch (err) {
          console.warn('Nie udało się wysłać maila weryfikacyjnego:', err)
        }
        const token = await cred.user.getIdToken(Boolean(options?.data?.name))
        const user = formatUser(cred.user)
        const session: BridgeSession = {
          access_token: token,
          token_type: 'bearer',
          user: user!,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        }
        return { data: { user, session }, error: null }
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err }
      }
    }

    // `this.auth` IS the Firebase Auth instance, and the modular `signOut(auth)`
    // just calls `auth.signOut()` – overriding it and calling fbSignOut would
    // recurse forever and never clear the session. Keep the native method.
    const nativeSignOut = self.auth.signOut.bind(self.auth)
    this.auth.signOut = async () => {
      try {
        await nativeSignOut()
        self.accountSyncCache = null
        return { error: null }
      } catch (err) {
        console.error('Firebase signOut failed:', err)
        return { error: err }
      }
    }

    this.auth.resetPasswordForEmail = async (email: string) => {
      try {
        await sendPasswordResetEmail(self.auth, email)
        return { data: {}, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    }

    this.auth.updateUser = async ({ password }: any) => {
      try {
        if (!self.auth.currentUser) {
          return { data: null, error: new Error('Sesja wygasła. Zaloguj się ponownie, aby zmienić hasło.') }
        }
        if (password) {
          await updatePassword(self.auth.currentUser, password)
        }
        return { data: { user: formatUser(self.auth.currentUser) }, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    }

    // --- Email verification -------------------------------------------------
    this.auth.sendEmailVerification = async () => {
      try {
        if (!self.auth.currentUser) {
          return { data: null, error: new Error('Sesja wygasła. Zaloguj się ponownie.') }
        }
        await sendEmailVerification(self.auth.currentUser)
        return { data: { success: true }, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    }

    // Applies a verifyEmail link (mode=verifyEmail&oobCode=...). Works without a session.
    this.auth.applyEmailVerificationCode = async (oobCode: string) => {
      try {
        const info = await checkActionCode(self.auth, oobCode)
        if (info.operation !== 'VERIFY_EMAIL') {
          return { data: null, error: new Error('auth/invalid-action-code') }
        }
        await applyActionCode(self.auth, oobCode)
        return { data: { email: info.data?.email || '' }, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    }

    /**
     * Re-reads the signed-in user from Firebase (e.g. after the link was clicked on
     * another device) and forces a fresh ID token so `email_verified` reaches the
     * server and onAuthStateChange emits the updated user.
     */
    this.auth.reloadUser = async () => {
      try {
        const current = self.auth.currentUser
        if (!current) return { data: { user: null }, error: null }
        await reload(current)
        // Fresh token only when something changed – cheap enough to poll reload()
        if (current.emailVerified) await current.getIdToken(true)
        return { data: { user: formatUser(self.auth.currentUser) }, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    }

    // Firebase password-reset links carry an `oobCode` (mode=resetPassword)
    this.auth.verifyPasswordResetCode = async (oobCode: string) => {
      try {
        const email = await verifyPasswordResetCode(self.auth, oobCode)
        return { data: { email }, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    }

    this.auth.confirmPasswordReset = async (oobCode: string, password: string) => {
      try {
        await confirmPasswordReset(self.auth, oobCode, password)
        return { data: { success: true }, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    }

    this.auth.signInWithOAuth = async ({ provider }: any) => {
      try {
        if (provider !== 'google' && provider !== 'apple') {
          return { data: null, error: new Error(`Dostawca ${provider} nie jest obsługiwany w Firebase.`) }
        }

        let cred: any
        let appleName = ''
        if (Capacitor.isNativePlatform()) {
          // iOS app: native Google / Apple sheet returns a credential, the web SDK signs in
          const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
          if (provider === 'google') {
            const result = await FirebaseAuthentication.signInWithGoogle()
            const idToken = result.credential?.idToken
            if (!idToken) throw new Error('auth/popup-closed-by-user')
            cred = await signInWithCredential(self.auth, GoogleAuthProvider.credential(idToken, result.credential?.accessToken))
          } else {
            const result = await FirebaseAuthentication.signInWithApple({ scopes: ['email', 'name'] })
            const idToken = result.credential?.idToken
            if (!idToken) throw new Error('auth/popup-closed-by-user')
            const appleCredential = new OAuthProvider('apple.com').credential({ idToken, rawNonce: result.credential?.nonce })
            cred = await signInWithCredential(self.auth, appleCredential)
            appleName = String(result.user?.displayName || '').trim()
          }
        } else {
          cred = await signInWithPopup(self.auth, createFirebaseOAuthProvider(provider))
          const raw: any = cred._tokenResponse || {}
          appleName = String(raw.displayName || [raw.firstName, raw.lastName].filter(Boolean).join(' ')).trim()
        }

        // Apple sends the user's name only on the very first sign-in and Firebase
        // does not store it as displayName – persist it ourselves.
        if (provider === 'apple' && !cred.user.displayName && appleName) {
          try { await updateProfile(cred.user, { displayName: appleName }) } catch (_) {}
        }

        const token = await cred.user.getIdToken()
        const user = formatUser(cred.user)
        if (getAdditionalUserInfo(cred)?.isNewUser) trackDuoSignup(cred.user.uid, provider)
        const session: BridgeSession = {
          access_token: token,
          token_type: 'bearer',
          user: user!,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        }
        return { data: { user, session }, error: null }
      } catch (err) {
        return { data: null, error: err }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Server API (admin operations: membership, pairing, disconnect)
  // ---------------------------------------------------------------------------
  private accountSyncCache: { uid: string; at: number; result: any } | null = null
  private accountSyncInFlight: { uid: string; promise: Promise<any> } | null = null

  public async callApi<T = any>(path: string, body: object = {}): Promise<T> {
    const user = this.auth.currentUser
    if (!user) throw new Error('Brak autoryzacji')
    const token = await user.getIdToken()
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000)
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const message = json?.data?.message || json?.message || json?.error || json?.statusMessage || `HTTP ${res.status}`
      throw Object.assign(new Error(message), {
        status: res.status,
        retryAfterSeconds: res.status === 429 ? Number(res.headers.get('Retry-After')) : undefined
      })
    }
    return json
  }

  /**
   * Links the auth user to their profile and refreshes the server-managed
   * membership record used by the security rules. Cached for 30 s.
   */
  public async syncAccount(force = false): Promise<{ profile_id: string | null; partnership_id: string | null } | null> {
    const uid = this.auth.currentUser?.uid
    if (!uid) return null
    const cached = this.accountSyncCache
    if (!force && cached && cached.uid === uid && Date.now() - cached.at < 30000) return cached.result
    if (this.accountSyncInFlight?.uid === uid) return this.accountSyncInFlight.promise

    const promise = (async () => {
      try {
        const result = await this.callApi('/api/account/sync')
        if (this.auth.currentUser?.uid !== uid) return null
        this.accountSyncCache = { uid, at: Date.now(), result }
        return result
      } catch (err) {
        if (process.dev) console.warn('[Bridge] account sync failed:', (err as any)?.message || err)
        return null
      } finally {
        if (this.accountSyncInFlight?.promise === promise) this.accountSyncInFlight = null
      }
    })()
    this.accountSyncInFlight = { uid, promise }
    return promise
  }

  public from(tableName: string, serverOnly = false) {
    const self = this
    const readDoc = serverOnly ? getDocFromServer : getDoc
    const readDocs = serverOnly ? getDocsFromServer : getDocs

    return {
      _tableName: tableName,
      _filters: [] as Array<{ field: string; op: any; val: any }>,
      _orders: [] as Array<{ field: string; ascending: boolean }>,
      _limit: null as number | null,
      _isSingle: false,
      _isMaybeSingle: false,

      select(columns = '*') {
        return this
      },

      eq(field: string, val: any) {
        this._filters.push({ field, op: '==', val })
        return this
      },

      neq(field: string, val: any) {
        this._filters.push({ field, op: '!=', val })
        return this
      },

      ilike(field: string, val: any) {
        this._filters.push({ field, op: '==', val })
        return this
      },

      like(field: string, val: any) {
        this._filters.push({ field, op: '==', val })
        return this
      },

      gt(field: string, val: any) {
        this._filters.push({ field, op: '>', val })
        return this
      },

      gte(field: string, val: any) {
        this._filters.push({ field, op: '>=', val })
        return this
      },

      lt(field: string, val: any) {
        this._filters.push({ field, op: '<', val })
        return this
      },

      lte(field: string, val: any) {
        this._filters.push({ field, op: '<=', val })
        return this
      },

      is(field: string, val: any) {
        this._filters.push({ field, op: '==', val })
        return this
      },

      in(field: string, vals: any[]) {
        if (!vals || vals.length === 0) {
          this._filters.push({ field, op: '==', val: '__empty__' })
        } else {
          this._filters.push({ field, op: 'in', val: vals })
        }
        return this
      },

      order(field: string, { ascending = true }: { ascending?: boolean } = {}) {
        this._orders.push({ field, ascending })
        return this
      },

      limit(n: number) {
        this._limit = n
        return this
      },

      single() {
        this._isSingle = true
        return this
      },

      maybeSingle() {
        this._isMaybeSingle = true
        return this
      },

      async insert(payload: any | any[]) {
        try {
          const items = Array.isArray(payload) ? payload : [payload]
          for (const item of items) {
            const id = String(item.id || item.profile_id || `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
            const docData = firestoreValue({ ...item, id })
            const docRef = doc(self.db, tableName, id)
            await setDoc(docRef, docData, { merge: true })


          }
          return { data: payload, error: null }
        } catch (err) {
          return { data: null, error: err }
        }
      },

      async upsert(payload: any | any[]) {
        return this.insert(payload)
      },

      update(payload: any) {
        const updateSelf = this
        return {
          eq(field: string, val: any) {
            updateSelf.eq(field, val)
            return this
          },
          in(field: string, vals: any[]) {
            updateSelf.in(field, vals)
            return this
          },
          async then(resolve: any, reject?: any) {
            try {
              // Jeśli aktualizujemy po pojedynczym 'id'
              const idFilter = updateSelf._filters.find(f => f.field === 'id' && f.op === '==')
              if (idFilter) {
                const docId = String(idFilter.val)
                const docRef = doc(self.db, tableName, docId)
                await updateDoc(docRef, firestoreValue(payload))
                return resolve({ data: payload, error: null })
              }

              // W przeciwnym razie pobierz dokumenty i zaktualizuj każdy
              const { data: docs } = await updateSelf.executeFetch()
              if (docs && docs.length > 0) {
                for (const d of docs) {
                  const docRef = doc(self.db, tableName, d.id)
                  await updateDoc(docRef, firestoreValue(payload))
                }
              }
              return resolve({ data: payload, error: null })
            } catch (err) {
              if (reject) reject(err)
              else resolve({ data: null, error: err })
            }
          }
        }
      },

      delete() {
        const deleteSelf = this
        return {
          eq(field: string, val: any) {
            deleteSelf.eq(field, val)
            return this
          },
          in(field: string, vals: any[]) {
            deleteSelf.in(field, vals)
            return this
          },
          async then(resolve: any, reject?: any) {
            try {
              const idFilter = deleteSelf._filters.find(f => f.field === 'id' && f.op === '==')
              if (idFilter) {
                const docId = String(idFilter.val)
                await deleteDoc(doc(self.db, tableName, docId))
                return resolve({ data: null, error: null })
              }

              const { data: docs } = await deleteSelf.executeFetch()
              if (docs && docs.length > 0) {
                for (const d of docs) {
                  await deleteDoc(doc(self.db, tableName, d.id))
                }
              }
              return resolve({ data: null, error: null })
            } catch (err) {
              if (reject) reject(err)
              else resolve({ data: null, error: err })
            }
          }
        }
      },

      async executeFetch() {
        try {
          // Optymalizacja dla bezpośredniego pobierania po 'id'
          const idFilter = this._filters.find(f => f.field === 'id' && f.op === '==')
          if (idFilter && this._filters.length === 1) {
            const docSnap = await readDoc(doc(self.db, tableName, String(idFilter.val)))
            if (!docSnap.exists()) {
              return { data: (this._isSingle || this._isMaybeSingle) ? null : [], error: null }
            }
            const item = { ...docSnap.data(), id: docSnap.id }
            return { data: (this._isSingle || this._isMaybeSingle) ? item : [item], error: null }
          }

          let q: any = collection(self.db, tableName)
          const constraints: any[] = []

          for (const f of this._filters) {
            constraints.push(where(f.field, f.op, f.val))
          }

          let snapshot: any
          try {
            const queryConstraints = [...constraints]
            for (const o of this._orders) {
              queryConstraints.push(orderBy(o.field, o.ascending ? 'asc' : 'desc'))
            }
            if (this._limit) {
              queryConstraints.push(firestoreLimit(this._limit))
            }
            snapshot = await readDocs(query(q, ...queryConstraints))
          } catch (queryErr: any) {
            if (process.dev) {
              console.warn(`Query with order fallback on [${tableName}]:`, queryErr?.message)
            }
            snapshot = await readDocs(query(q, ...constraints))
          }

          let results = snapshot.docs.map((d: any) => ({ ...d.data(), id: d.id }))

          // Sortowanie w pamięci jeśli było zdefiniowane
          if (this._orders.length > 0) {
            for (const o of this._orders) {
              results.sort((a: any, b: any) => {
                const valA = a[o.field] || ''
                const valB = b[o.field] || ''
                return o.ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1)
              })
            }
          }

          if (this._limit && results.length > this._limit) {
            results = results.slice(0, this._limit)
          }

          if (this._isSingle) {
            return { data: results[0] || null, error: results.length === 0 ? new Error('Not found') : null }
          }
          if (this._isMaybeSingle) {
            return { data: results[0] || null, error: null }
          }

          return { data: results, error: null }
        } catch (err: any) {
          if (process.dev) {
            console.warn(`Firestore query failed on table [${tableName}]:`, err?.message || err)
          }
          return { data: (this._isSingle || this._isMaybeSingle) ? null : [], error: err }
        }
      },

      then(resolve: any, reject?: any) {
        return this.executeFetch().then(resolve, reject)
      }
    }
  }

  public async commitSharedBatch(table: string, changes: Array<{ id: string; updates?: object; insert?: object }>) {
    if (!changes.length) return
    const batch = writeBatch(this.db)
    for (const change of changes) {
      const target = doc(this.db, table, change.id)
      if (change.insert) batch.set(target, firestoreValue(change.insert))
      else if (change.updates) batch.update(target, firestoreValue(change.updates))
      else batch.delete(target)
    }
    await batch.commit()
  }

  public async saveMovieReview(id: string, profileId: string, review: object, updatedAt: string) {
    await updateDoc(doc(this.db, 'movies', id), new FieldPath('reviews', profileId), firestoreValue(review), 'updated_at', updatedAt)
  }

  public setRealtimeConnectionActive(active: boolean) {
    if (!this.rtdb) return
    if (active) goOnline(this.rtdb)
    else goOffline(this.rtdb)
  }

  public observeDocument(table: string, id: string, onData: (data: any | null) => void) {
    return onSnapshot(doc(this.db, table, id), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
      onData(snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null)
    }, error => { if (process.dev) console.warn(`[Firestore] ${table} listener:`, error.code) })
  }

  public observeCollection(table: string, filters: Record<string, string | boolean>, onData: (data: any[]) => void, order?: { field: string; limit: number }) {
    const constraints = Object.entries(filters).map(([key, value]) => where(key, '==', value))
    const source = collection(this.db, table)
    const reference = order
      ? query(source, ...constraints, orderBy(order.field, 'desc'), firestoreLimit(order.limit))
      : query(source, ...constraints)
    return onSnapshot(reference, { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
      onData(snapshot.docs.map(row => ({ ...row.data(), id: row.id })))
    }, error => { if (process.dev) console.warn(`[Firestore] ${table} listener:`, error.code) })
  }

  public channel(channelName: string, channelOptions: any = {}) {
    const self = this
    const listeners: Array<() => void> = []
    const presenceKeyOption: string | null = channelOptions?.config?.presence?.key || null
    const presenceCallbacks: Record<string, Array<(p: any) => void>> = { sync: [], join: [], leave: [] }
    let presenceListening = false
    let trackedPresence: { ref: DatabaseReference; stop: () => void } | null = null
    let closed = false
    let lastCleanupAt = 0

    const sanitize = (value: any) => {
      try {
        return JSON.parse(JSON.stringify(value ?? null))
      } catch {
        return null
      }
    }

    const broadcastRef = () => rtdbRef(self.rtdb, `live/transient/${channelName}`)

    const ch: any = {
      _name: channelName,
      _broadcastCallbacks: new Map<string, Array<(envelope: any) => void>>(),
      _presenceState: {} as Record<string, any>,

      on(type: string, filterOrEvent: any, callback: any) {
        if (type === 'broadcast') {
          const eventName = filterOrEvent.event || filterOrEvent
          const list = ch._broadcastCallbacks.get(eventName) || []
          list.push(callback)
          ch._broadcastCallbacks.set(eventName, list)
        } else if (type === 'presence') {
          const ev = filterOrEvent?.event
          if (presenceCallbacks[ev]) {
            presenceCallbacks[ev].push(callback)
            startPresence()
          }
        } else if (type === 'postgres_changes') {
          const table = filterOrEvent.table
          const filter = filterOrEvent.filter || ''

          if (filter.includes('partnership_id=eq.')) {
            const pid = filter.split('partnership_id=eq.')[1]
            const q = query(collection(self.db, table), where('partnership_id', '==', pid))
            let initial = true
            const unsub = onSnapshot(q, (snapshot) => {
              if (initial) { initial = false; return }
              snapshot.docChanges().forEach((change) => {
                const eventType = change.type === 'added' ? 'INSERT' : change.type === 'modified' ? 'UPDATE' : 'DELETE'
                const row = { id: change.doc.id, ...change.doc.data() }
                callback({ eventType, new: change.type !== 'removed' ? row : null, old: change.type === 'removed' ? row : null })
              })
            }, (err) => {
              if (process.dev) console.warn(`Firestore onSnapshot on [${table}]:`, err?.message)
            })
            listeners.push(unsub)
          } else if (filter.includes('id=eq.')) {
            const idVal = filter.split('id=eq.')[1]
            const unsub = self.observeDocument(table, idVal, row => {
              callback({ eventType: row ? 'UPDATE' : 'DELETE', new: row, old: row ? null : { id: idVal } })
            })
            listeners.push(unsub)
          }
        }
        return ch
      },

      presenceState() {
        return ch._presenceState
      },

      track() {
        if (!self.rtdb || !presenceKeyOption || trackedPresence || closed) return
        const session = rtdbPush(rtdbRef(self.rtdb, `live/presence_v2/${channelName}/${presenceKeyOption}`))
        const tracking = { ref: session, stop: () => {} }
        trackedPresence = tracking
        tracking.stop = onValue(rtdbRef(self.rtdb, '.info/connected'), async snapshot => {
          if (snapshot.val() !== true || trackedPresence !== tracking) return
          try {
            await onDisconnect(session).remove()
            if (trackedPresence !== tracking || closed) return
            await rtdbSet(session, { updated_at: rtdbServerTimestamp() })
          } catch (error) {
            if (process.dev) console.warn('[RTDB] Presence registration failed', (error as any)?.code)
          }
        })
      },

      async untrack() {
        const tracked = trackedPresence
        if (!tracked) return
        trackedPresence = null
        tracked.stop()
        try {
          await rtdbRemove(tracked.ref)
          await onDisconnect(tracked.ref).cancel()
        } catch {}
      },

      async httpSend(event: string, payload: any) {
        return ch.send({ type: 'broadcast', event, payload })
      },

      subscribe(statusCallback?: (status: string) => void) {
        // Only channels with broadcast handlers listen to the message list.
        if (!self.rtdb || ch._broadcastCallbacks.size === 0) {
          if (statusCallback) statusCallback('SUBSCRIBED')
          return ch
        }

        ;(async () => {
          const listRef = broadcastRef()
          // Start AFTER the newest existing message, so old messages are never replayed.
          let lastKey: string | null = null
          try {
            const last = await rtdbGet(rtdbQuery(listRef, orderByKey(), limitToLast(1)))
            last.forEach((child) => { lastKey = child.key })
          } catch (err) {
            if (statusCallback) statusCallback('CHANNEL_ERROR')
            return
          }
          if (closed) return

          const q = lastKey ? rtdbQuery(listRef, orderByKey(), startAfter(lastKey)) : rtdbQuery(listRef, orderByKey())
          const unsub = onChildAdded(q, (snap) => {
            const data = snap.val()
            if (data && data.event) {
              const cbs = ch._broadcastCallbacks.get(data.event) || []
              cbs.forEach((cb: any) => cb(data))
            }
          }, () => {
            if (statusCallback) statusCallback('CHANNEL_ERROR')
          })
          listeners.push(unsub)
          if (statusCallback) statusCallback('SUBSCRIBED')
        })()

        return ch
      },

      async send({ event, payload }: any) {
        if (!self.rtdb) return 'ok'
        const listRef = broadcastRef()
        await rtdbPush(listRef, { event, payload: sanitize(payload), ts: rtdbServerTimestamp() })

        // Housekeeping: drop messages older than 10 minutes (at most once a minute)
        const now = Date.now()
        if (now - lastCleanupAt > 60000) {
          lastCleanupAt = now
          rtdbGet(rtdbQuery(listRef, orderByChild('ts'), endAt(now - 10 * 60 * 1000)))
            .then((old) => {
              old.forEach((child) => { rtdbRemove(child.ref).catch(() => {}) })
            })
            .catch(() => {})
        }
        return 'ok'
      },

      unsubscribe() {
        closed = true
        void ch.untrack()
        listeners.forEach(u => {
          try { u() } catch (_) {}
        })
        listeners.length = 0
      }
    }

    // One RTDB listener per channel; emits join/leave with the right key, and sync.
    function startPresence() {
      if (presenceListening || !self.rtdb) return
      presenceListening = true
      const presenceRef = rtdbRef(self.rtdb, `live/presence_v2/${channelName}`)
      const unsub = onValue(presenceRef, (snapshot) => {
        const next = (snapshot.val() || {}) as Record<string, any>
        const prev = ch._presenceState as Record<string, any>
        ch._presenceState = next

        for (const key of Object.keys(next)) {
          if (!(key in prev)) {
            presenceCallbacks.join.forEach(cb => cb({ event: 'join', key, newPresences: [next[key]] }))
          }
        }
        for (const key of Object.keys(prev)) {
          if (!(key in next)) {
            presenceCallbacks.leave.forEach(cb => cb({ event: 'leave', key, leftPresences: [prev[key]] }))
          }
        }
        presenceCallbacks.sync.forEach(cb => cb({ event: 'sync' }))
      }, (err) => {
        if (process.dev) console.warn(`RTDB presence on [${channelName}]:`, err?.message)
      })
      listeners.push(unsub)
    }

    return ch
  }

  public removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe()
    }
  }

  /** Reads the caller's canonical profile (falls back to client-side lookups). */
  private async readMyProfile(): Promise<any | null> {
    const uid = this.auth.currentUser?.uid
    if (!uid) return null

    const synced = await this.syncAccount()
    if (synced?.profile_id) {
      try {
        const snap = await getDoc(doc(this.db, 'profiles', synced.profile_id))
        if (snap.exists() && snap.data().auth_user_id === uid) return { ...snap.data(), id: snap.id }
      } catch (_) {}
    }

    // Fallback (server unreachable): own doc or docs linked via auth_user_id.
    const candidates: any[] = []
    try {
      const own = await getDoc(doc(this.db, 'profiles', uid))
      if (own.exists() && own.data().auth_user_id === uid) candidates.push({ ...own.data(), id: own.id })
    } catch (_) {}
    try {
      const qSnap = await getDocs(query(collection(this.db, 'profiles'), where('auth_user_id', '==', uid)))
      qSnap.docs.forEach(d => candidates.push({ ...d.data(), id: d.id }))
    } catch (_) {}
    // Prefer the real profile (nest, code, name) over partial copies from older versions
    const score = (p: any) =>
      (p.partnership_id ? 16 : 0) + (p.pairing_code ? 8 : 0) + (p.name ? 4 : 0)
    candidates.sort((a, b) => score(b) - score(a))
    // A stub without code and name is not a usable profile
    return candidates.find(p => p.pairing_code || p.name) || null
  }

  public async rpc(functionName: string, args: any = {}) {
    if (functionName === 'my_profile_id') {
      const profile = await this.readMyProfile()
      return { data: profile?.id || null, error: null }
    }

    if (functionName === 'get_my_profile') {
      const profile = await this.readMyProfile()
      return { data: profile, error: null }
    }

    if (functionName === 'get_my_pairing_code') {
      const profile = await this.readMyProfile()
      return { data: profile?.pairing_code || null, error: null }
    }

    if (functionName === 'link_profile_to_auth') {
      const result = await this.syncAccount(true)
      return { data: { success: Boolean(result) }, error: null }
    }

    if (functionName === 'pair_with_code') {
      if (!this.auth.currentUser) {
        return { data: { error: 'verified_authentication_required' }, error: null }
      }
      try {
        const data = await this.callApi('/api/pairing/pair', {
          pairing_input: String(args.pairing_input || ''),
          display_name: args.display_name || null
        })
        this.accountSyncCache = null
        return { data, error: null }
      } catch (err: any) {
        return { data: { error: err?.message || 'Błąd parowania' }, error: err }
      }
    }

    if (functionName === 'disconnect_my_partnership') {
      if (!this.auth.currentUser) return { data: null, error: new Error('Brak autoryzacji') }
      try {
        const data = await this.callApi('/api/pairing/disconnect')
        this.accountSyncCache = null
        return { data, error: null }
      } catch (err: any) {
        return { data: null, error: err }
      }
    }

    return { data: null, error: null }
  }
}

let globalBridgeInstance: FirebaseSupabaseBridge | null = null

export function getFirebaseBridge(): FirebaseSupabaseBridge {
  if (!globalBridgeInstance) {
    globalBridgeInstance = new FirebaseSupabaseBridge()
  }
  return globalBridgeInstance
}
