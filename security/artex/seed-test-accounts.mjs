import { randomBytes } from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const projectId = 'demo-duonest-security'
const out = resolve('.data/security-audits/test-accounts.json')
try {
  await access(out)
  throw new Error(`Test account credentials already exist: ${out}`)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
const auth = getAuth(initializeApp({ projectId }))
const suffix = randomBytes(4).toString('hex')
const accounts = []

for (const label of ['a', 'b']) {
  const email = `artex-${label}-${suffix}@example.test`
  const password = randomBytes(24).toString('base64url')
  const user = await auth.createUser({ email, password, emailVerified: true })
  accounts.push({ label, email, password, uid: user.uid })
}

await mkdir(resolve('.data/security-audits'), { recursive: true })
await writeFile(out, JSON.stringify({ projectId, accounts }, null, 2), { mode: 0o600, flag: 'wx' })
console.log(`Created ${accounts.length} verified test accounts in the Auth emulator. Credentials: ${out}`)
