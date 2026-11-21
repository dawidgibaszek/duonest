import { readFile } from 'node:fs/promises'
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const PROJECT = 'duonest-38dc2'
const [action, uid] = process.argv.slice(2)
if (!['grant', 'revoke'].includes(action) || !uid || uid.length > 128 || process.argv.length !== 4) {
  console.error('Użycie: node scripts/manage-admin.mjs grant|revoke FIREBASE_UID')
  process.exit(1)
}

try {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const credential = path ? cert(JSON.parse(await readFile(path, 'utf8'))) : applicationDefault()
  const auth = getAuth(initializeApp({ projectId: PROJECT, credential }))
  const user = await auth.getUser(uid)
  const claims = { ...user.customClaims }
  if (action === 'grant') {
    const supported = ['password', 'google.com', 'apple.com']
    if (user.disabled || !user.emailVerified || !user.providerData.some(provider => supported.includes(provider.providerId))) {
      throw new Error('Konto musi być aktywne, mieć zweryfikowany e-mail i logowanie hasłem, Google lub Apple.')
    }
    claims.duoAdmin = true
  } else {
    delete claims.duoAdmin
  }
  await auth.setCustomUserClaims(uid, claims)
  console.log(action === 'grant' ? 'Nadano rolę duoAdmin wybranemu kontu.' : 'Odebrano rolę duoAdmin wybranemu kontu.')
} catch (error) {
  console.error('Nie udało się zmienić roli.', error.code ?? error.message)
  process.exitCode = 1
}
