import { readFile } from 'node:fs/promises'

const data = JSON.parse(await readFile('.data/security-audits/test-accounts.json', 'utf8'))
if (data.projectId !== 'demo-duonest-security') throw new Error('Unexpected Firebase project')
const origin = 'http://127.0.0.1:5000'

for (const account of data.accounts) {
  const login = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-emulator-key', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password, returnSecureToken: true })
  })
  if (!login.ok) throw new Error(`Test account ${account.label} could not sign in: HTTP ${login.status}`)
  const { idToken } = await login.json()
  if (!idToken) throw new Error('Auth emulator did not issue a token')
  const sync = await fetch(`${origin}/api/account/sync`, {
    method: 'POST', headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
    body: '{}', signal: AbortSignal.timeout(30000)
  })
  console.log(`Test account ${account.label}: Auth login ${login.status}, account sync ${sync.status}`)
  if (!sync.ok) throw new Error(`Account sync failed for ${account.label}`)
}
