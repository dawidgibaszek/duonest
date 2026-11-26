import { readFile } from 'node:fs/promises'

const { projectId, accounts } = JSON.parse(await readFile('.data/security-audits/test-accounts.json', 'utf8'))
if (projectId !== 'demo-duonest-security' || accounts.length !== 2) throw new Error('Unexpected test setup')

const login = async ({ email, password }) => {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-emulator-key', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  })
  if (!response.ok) throw new Error(`Test account login failed: ${response.status}`)
  const { idToken, localId } = await response.json()
  if (!idToken || !localId) throw new Error('Missing emulator token or uid')
  return { idToken, localId }
}
const [a, b] = await Promise.all(accounts.map(login))
const get = async (url, token) => {
  const response = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(10000) })
  return response.status
}
const post = async (url, token, body = {}) => {
  const response = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000)
  })
  return response.status
}
const fsDoc = uid => `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/members/${uid}`
const rtdb = (uid, token) => `http://127.0.0.1:9000/members/${uid}.json?ns=${projectId}-default-rtdb${token ? `&auth=${encodeURIComponent(token)}` : ''}`
const api = path => `http://127.0.0.1:5000/api/${path}`
const results = {
  firestore: {
    own: await get(fsDoc(a.localId), a.idToken),
    other: await get(fsDoc(b.localId), a.idToken),
    anonymous: await get(fsDoc(a.localId))
  },
  database: {
    own: await get(rtdb(a.localId, a.idToken)),
    other: await get(rtdb(b.localId, a.idToken)),
    anonymous: await get(rtdb(a.localId))
  },
  api: {
    syncAnonymous: await post(api('account/sync')),
    syncInvalidToken: await post(api('account/sync'), 'invalid-test-token'),
    adminAnonymous: await get(api('admin/settings')),
    locationSessionAnonymous: await post(api('location/session')),
    pairingAnonymous: await post(api('pairing/pair'))
  }
}
console.log(JSON.stringify(results, null, 2))
