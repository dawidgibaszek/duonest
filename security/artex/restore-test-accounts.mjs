import { readFile } from 'node:fs/promises'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const { projectId, accounts } = JSON.parse(await readFile('.data/security-audits/test-accounts.json', 'utf8'))
if (projectId !== 'demo-duonest-security' || accounts.length !== 2) throw new Error('Unexpected test setup')
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
const auth = getAuth(initializeApp({ projectId }))
for (const account of accounts) {
  await auth.createUser({ uid: account.uid, email: account.email, password: account.password, emailVerified: true })
  console.log(`Restored local test account ${account.label}`)
}
