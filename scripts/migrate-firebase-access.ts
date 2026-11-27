import { readFile } from 'node:fs/promises'
import { applicationDefault, cert, deleteApp, getApps, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { DUONEST_PROJECT_ID, databaseUrlForProject } from '../functions/src/firebaseProject'
import { mirrorMembership } from '../functions/src/duoAccount'
import { refreshPartnerProfile } from '../functions/src/partnerProfile'

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => !['--apply', '--only-rtdb'].includes(arg))) {
    throw new Error('Użycie: tsx scripts/migrate-firebase-access.ts [--apply] [--only-rtdb]')
  }
  const apply = args.includes('--apply')
  const onlyRtdb = args.includes('--only-rtdb')
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const credential = path ? cert(JSON.parse(await readFile(path, 'utf8'))) : applicationDefault()
  const app = initializeApp({
    projectId: DUONEST_PROJECT_ID,
    databaseURL: databaseUrlForProject(DUONEST_PROJECT_ID),
    storageBucket: `${DUONEST_PROJECT_ID}.firebasestorage.app`,
    credential
  })
  const db = getFirestore(app)
  const rtdb = getDatabase(app)
  const bucket = getStorage(app).bucket()

  let profileCount = 0
  if (!onlyRtdb) {
    for await (const doc of db.collection('profiles').select('partnership_id').stream()) {
      if (!doc.get('partnership_id')) continue
      if (apply) await refreshPartnerProfile(db, doc.id)
      profileCount++
    }
  }

  const members = (await rtdb.ref('members').get()).val() as Record<string, { partnership_id?: string }> | null
  const revoked = new Set<string>()
  let staleMembers = 0
  for (const [uid, mirror] of Object.entries(members ?? {})) {
    const membership = (await db.collection('members').doc(uid).get()).data()
    const oldPid = mirror?.partnership_id
    if (!oldPid || oldPid === membership?.partnership_id) continue
    staleMembers++
    if (!oldPid.includes('/') && !revoked.has(oldPid) && !(await db.collection('partnerships').doc(oldPid).get()).exists) {
      if (apply) await rtdb.ref(`revoked_partnerships/${oldPid}`).set(true)
      revoked.add(oldPid)
    }
    if (apply) await mirrorMembership(db, rtdb, uid)
  }

  let legacyAvatars = 0
  if (!onlyRtdb) {
    for await (const file of bucket.getFilesStream({ prefix: 'avatars/' })) {
      const metadata = file.metadata
      if (metadata.cacheControl === 'private, no-store' && !metadata.metadata?.firebaseStorageDownloadTokens) continue
      legacyAvatars++
      if (apply) {
        await file.setMetadata({
          cacheControl: 'private, no-store',
          metadata: { firebaseStorageDownloadTokens: null }
        }, { preconditionOpts: { ifMetagenerationMatch: Number(metadata.metageneration) } })
      }
    }
  }
  if (onlyRtdb) {
    console.log(`Tryb ${apply ? 'zapisu' : 'odczytu'}. Nieaktualne wpisy RTDB: ${staleMembers}.`)
    return
  }
  console.log(`Tryb ${apply ? 'zapisu' : 'odczytu'}. Profile par: ${profileCount}. Nieaktualne wpisy RTDB: ${staleMembers}. Dawne awatary: ${legacyAvatars}.`)
}

main().catch(error => {
  console.error('Migracja dostępu Firebase nie powiodła się.', error.code ?? error.message)
  process.exitCode = 1
}).finally(async () => {
  await Promise.all(getApps().map(app => deleteApp(app)))
})
