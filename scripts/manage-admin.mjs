import { readFile } from 'node:fs/promises'
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const PROJECT = 'duonest-38dc2'
const [action, uid] = process.argv.slice(2)
if (!['grant', 'grant-viewer', 'revoke'].includes(action) || !uid || uid.length > 128 || process.argv.length !== 4) {
  console.error('Użycie: node scripts/manage-admin.mjs grant|grant-viewer|revoke FIREBASE_UID')
  process.exit(1)
}

try {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const credential = path ? cert(JSON.parse(await readFile(path, 'utf8'))) : applicationDefault()
  const auth = getAuth(initializeApp({ projectId: PROJECT, credential }))
  const user = await auth.getUser(uid)
  const claims = { ...user.customClaims }
  if (action !== 'revoke') {
    const supported = ['password', 'google.com', 'apple.com']
    if (user.disabled || !user.emailVerified || !user.providerData.some(provider => supported.includes(provider.providerId))) {
      throw new Error('Konto musi być aktywne, mieć zweryfikowany e-mail i logowanie hasłem, Google lub Apple.')
    }
    if (action === 'grant') {
      claims.duoAdmin = true
      delete claims.duoAdminViewer
    } else {
      claims.duoAdminViewer = true
      delete claims.duoAdmin
    }
  } else {
    delete claims.duoAdmin
    delete claims.duoAdminViewer
  }
  await auth.setCustomUserClaims(uid, claims)
  console.log(action === 'revoke' ? 'Odebrano dostęp do panelu.' : 'Ustawiono rolę: ' + (action === 'grant' ? 'duoAdmin' : 'duoAdminViewer'))
} catch (error) {
  console.error('Nie udało się zmienić roli.', error.code ?? error.message)
  process.exitCode = 1
}
