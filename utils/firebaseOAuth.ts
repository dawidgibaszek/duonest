import { GoogleAuthProvider, OAuthProvider } from 'firebase/auth'

export function createFirebaseOAuthProvider(provider: 'google' | 'apple') {
  if (provider === 'google') {
    const google = new GoogleAuthProvider()
    google.setCustomParameters({ prompt: 'select_account' })
    return google
  }

  const apple = new OAuthProvider('apple.com')
  apple.addScope('email')
  apple.addScope('name')
  apple.setCustomParameters({ locale: 'pl_PL' })
  return apple
}
