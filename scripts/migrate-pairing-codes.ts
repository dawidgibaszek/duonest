import { readFile } from 'node:fs/promises'
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { migratePairingCode } from '../functions/src/duoAccount'
import { isCurrentPairingCode } from '../functions/src/pairingCode'

const PROJECT = 'duonest-38dc2'

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => arg !== '--apply')) throw new Error('Użycie: tsx scripts/migrate-pairing-codes.ts [--apply]')
  const apply = args.includes('--apply')
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const credential = path ? cert(JSON.parse(await readFile(path, 'utf8'))) : applicationDefault()
  const app = initializeApp({ projectId: PROJECT, credential })
  const db = getFirestore(app)
  const profiles = await db.collection('profiles').select('auth_user_id', 'pairing_code').get()
  const uids = new Set<string>()
  let ownerless = 0
  for (const profile of profiles.docs) {
    if (isCurrentPairingCode(profile.get('pairing_code'))) continue
    const uid = profile.get('auth_user_id')
    if (typeof uid === 'string' && uid) uids.add(uid)
    else ownerless++
  }

  const candidates = [...uids]
  const accounts: string[] = []
  for (let start = 0; start < candidates.length; start += 100) {
    const batch = candidates.slice(start, start + 100).map(uid => ({ uid }))
    const result = await getAuth(app).getUsers(batch)
    accounts.push(...result.users.map(user => user.uid))
  }
  console.log(`Konta z kodami do aktualizacji: ${accounts.length}. Profile bez UID: ${ownerless}. Nieistniejące konta: ${candidates.length - accounts.length}.`)
  if (!apply) return
  // Old API revisions only understand the prefixed format.
  const probe = await fetch('https://duonestapp.pl/api/widget/doodle', { signal: AbortSignal.timeout(10_000) })
  const status = await probe.json()
  if (probe.status !== 401 || status.error !== 'widget_credential_required') {
    throw new Error('Najpierw wdróż backend obsługujący nowy kod.')
  }

  let changed = 0
  for (const uid of accounts) {
    if (await migratePairingCode(db, uid)) changed++
  }
  console.log(`Zaktualizowano kody dla ${changed} kont.`)
}

main().catch(error => {
  console.error('Migracja kodów nie powiodła się.', error.code ?? error.message)
  process.exitCode = 1
})
