// Modular firebase-admin API: with ESM `import * as admin` the namespace exports
// (admin.credential, admin.apps) are undefined, which broke the whole admin SDK.
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getFirestore, type Query } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getDatabaseWithUrl, type Database } from 'firebase-admin/database'
import { getMessaging } from 'firebase-admin/messaging'
import * as fs from 'fs'
import * as path from 'path'
import { createError } from 'h3'
import { databaseUrlForProject, DUONEST_PROJECT_ID } from '~/functions/src/firebaseProject'

let adminApp: App | null = null

export function getFirebaseAdmin(): App {
  if (adminApp) return adminApp
  const existing = getApps()
  if (existing.length > 0) {
    adminApp = existing[0]!
    return adminApp
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
  const resolved = path.resolve(process.cwd(), serviceAccountPath)
  const databaseURL = process.env.FIREBASE_DATABASE_URL || undefined

  if (fs.existsSync(resolved)) {
    const sa = JSON.parse(fs.readFileSync(resolved, 'utf-8'))
    adminApp = initializeApp({ credential: cert(sa), projectId: sa.project_id, databaseURL })
  } else {
    // Application Default Credentials (e.g. inside Google Cloud)
    adminApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || DUONEST_PROJECT_ID,
      databaseURL
    })
  }
  return adminApp
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdmin())
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdmin())
}

export function getFirebaseAdminRtdb(): Database | null {
  try {
    const app = getFirebaseAdmin()
    const url = app.options.databaseURL || databaseUrlForProject(app.options.projectId)
    return url ? getDatabaseWithUrl(url, app) : null
  } catch (err) {
    console.warn('Firebase admin RTDB unavailable:', (err as any)?.message || err)
    return null
  }
}

/** Verifies the Firebase ID token from the Authorization header. */
export async function requireFirebaseUser(event: any) {
  const header = String(event?.node?.req?.headers?.authorization || '')
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token)
    return { uid: decoded.uid, auth_time: decoded.auth_time, email: decoded.email, name: typeof decoded.name === 'string' ? decoded.name : undefined, email_verified: decoded.email_verified === true, sign_in_provider: decoded.firebase?.sign_in_provider || '' }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid authentication token' })
  }
}

/**
 * Server-side compatibility adapter that routes Supabase server calls directly to Firestore & Firebase Auth Admin
 */
export function getFirebaseServerAdapter() {
  const db = getFirebaseAdminDb()
  const auth = getFirebaseAdminAuth()

  return {
    auth: {
      async getUser(token: string) {
        try {
          const decoded = await auth.verifyIdToken(token)
          return { data: { user: { id: decoded.uid, email: decoded.email } }, error: null }
        } catch (err) {
          return { data: { user: null }, error: err }
        }
      }
    },
    from(tableName: string) {
      const filters: Array<{ field: string; op: any; val: any }> = []
      const orders: Array<{ field: string; direction: 'asc' | 'desc' }> = []
      let limitCount: number | null = null
      let isSingle = false
      let isMaybeSingle = false

      const builder = {
        select(cols = '*') {
          return this
        },
        eq(field: string, val: any) {
          filters.push({ field, op: '==', val })
          return this
        },
        neq(field: string, val: any) {
          filters.push({ field, op: '!=', val })
          return this
        },
        in(field: string, vals: any[]) {
          filters.push({ field, op: 'in', val: vals })
          return this
        },
        order(field: string, { ascending = true }: { ascending?: boolean } = {}) {
          orders.push({ field, direction: ascending ? 'asc' : 'desc' })
          return this
        },
        limit(n: number) {
          limitCount = n
          return this
        },
        single() {
          isSingle = true
          return this
        },
        maybeSingle() {
          isMaybeSingle = true
          return this
        },
        // insert/update return chainable thenables so `.select()` works like supabase-js
        insert(payload: any | any[]) {
          const run = async () => {
            try {
              const items = Array.isArray(payload) ? payload : [payload]
              const saved: any[] = []
              for (const item of items) {
                const id = String(item.id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
                const docData = { ...item, id }
                await db.collection(tableName).doc(id).set(docData, { merge: true })
                saved.push(docData)
              }
              return { data: saved, error: null }
            } catch (err) {
              return { data: null, error: err }
            }
          }
          const chain: any = {
            select() { return chain },
            then(resolve: any, reject?: any) { return run().then(resolve, reject) }
          }
          return chain
        },
        update(payload: any) {
          const run = async () => {
            try {
              const idFilter = filters.find(f => f.field === 'id' && f.op === '==')
              if (idFilter && filters.length === 1) {
                const ref = db.collection(tableName).doc(String(idFilter.val))
                await ref.set(payload, { merge: true })
                return { data: [{ ...payload, id: ref.id }], error: null }
              }
              const { data: docs } = await builder.execute()
              const updated: any[] = []
              for (const d of (docs || [])) {
                await db.collection(tableName).doc(d.id).set(payload, { merge: true })
                updated.push({ ...d, ...payload, id: d.id })
              }
              return { data: updated, error: null }
            } catch (err) {
              return { data: null, error: err }
            }
          }
          const chain: any = {
            eq(field: string, val: any) { builder.eq(field, val); return chain },
            in(field: string, vals: any[]) { builder.in(field, vals); return chain },
            select() { return chain },
            then(resolve: any, reject?: any) { return run().then(resolve, reject) }
          }
          return chain
        },
        delete() {
          return {
            eq(field: string, val: any) {
              builder.eq(field, val)
              return this
            },
            in(field: string, vals: any[]) {
              builder.in(field, vals)
              return this
            },
            async then(resolve: any, reject?: any) {
              try {
                const idFilter = filters.find(f => f.field === 'id' && f.op === '==')
                if (idFilter) {
                  await db.collection(tableName).doc(String(idFilter.val)).delete()
                  return resolve({ data: null, error: null })
                }
                const { data: docs } = await builder.execute()
                for (const d of (docs || [])) {
                  await db.collection(tableName).doc(d.id).delete()
                }
                return resolve({ data: null, error: null })
              } catch (err) {
                if (reject) reject(err)
                else resolve({ data: null, error: err })
              }
            }
          }
        },
        async execute() {
          try {
            const idFilter = filters.find(f => f.field === 'id' && f.op === '==')
            if (idFilter && filters.length === 1) {
              const docSnap = await db.collection(tableName).doc(String(idFilter.val)).get()
              if (!docSnap.exists) {
                return { data: isSingle ? null : [], error: null }
              }
              const item = { id: docSnap.id, ...docSnap.data() }
              return { data: (isSingle || isMaybeSingle) ? item : [item], error: null }
            }

            let q: Query = db.collection(tableName)
            for (const f of filters) {
              q = q.where(f.field, f.op, f.val)
            }
            for (const o of orders) {
              q = q.orderBy(o.field, o.direction)
            }
            if (limitCount) {
              q = q.limit(limitCount)
            }

            const snapshot = await q.get()
            const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))

            if (isSingle) {
              return { data: results[0] || null, error: results.length === 0 ? new Error('Not found') : null }
            }
            if (isMaybeSingle) {
              return { data: results[0] || null, error: null }
            }
            return { data: results, error: null }
          } catch (err) {
            return { data: (isSingle || isMaybeSingle) ? null : [], error: err }
          }
        },
        then(resolve: any, reject?: any) {
          return this.execute().then(resolve, reject)
        }
      }

      return builder
    }
  }
}

export function getFirebaseAdminMessaging() {
  return getMessaging(getFirebaseAdmin())
}
