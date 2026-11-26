const assert = require('node:assert/strict')
const { test } = require('node:test')
const { actionUrl, requestPasswordReset, sendVerificationEmail } = require('../lib/authEmails.js')

function response() {
  return {
    statusCode: 200,
    body: null,
    set() { return this },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this }
  }
}

function database() {
  const documents = new Map()
  return {
    collection() { return { doc(id) { return { id } } } },
    runTransaction(callback) {
      return callback({
        async get(ref) { return { get(field) { return documents.get(ref.id)?.[field] } } },
        set(ref, value) { documents.set(ref.id, value) }
      })
    }
  }
}

test('Firebase action codes lead to the app handler', () => {
  const firebaseLink = 'https://duonest-38dc2.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=abc123&apiKey=public'
  assert.equal(actionUrl(firebaseLink, 'verifyEmail'), 'https://duonestapp.pl/auth/action?mode=verifyEmail&oobCode=abc123')
  assert.throws(() => actionUrl(firebaseLink, 'resetPassword'))
})

test('verification email uses the local template and applies a cooldown', async () => {
  const originalFetch = global.fetch
  const originalKey = process.env.RESEND_API_KEY
  const sent = []
  process.env.RESEND_API_KEY = 'test-key'
  global.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body))
    return { ok: true }
  }
  try {
    const auth = {
      async getUser() { return { email: 'person@example.com', emailVerified: false, disabled: false } },
      async generateEmailVerificationLink() {
        return 'https://duonest-38dc2.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=verify123'
      }
    }
    const db = database()
    const first = response()
    await sendVerificationEmail(auth, db, 'user-1', first)
    assert.equal(first.statusCode, 200)
    assert.equal(sent.length, 1)
    assert.equal(sent[0].from, 'DuoNest <noreply@duonestapp.pl>')
    assert.match(sent[0].html, /https:\/\/duonestapp\.pl\/auth\/action\?mode=verifyEmail&amp;oobCode=verify123/)
    assert.doesNotMatch(sent[0].html, /%LINK%|%EMAIL%/)
    const second = response()
    await sendVerificationEmail(auth, db, 'user-1', second)
    assert.equal(second.statusCode, 429)
    assert.equal(sent.length, 1)
  } finally {
    global.fetch = originalFetch
    if (originalKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = originalKey
  }
})

test('password reset hides whether the account exists', async () => {
  const originalFetch = global.fetch
  const originalKey = process.env.RESEND_API_KEY
  const sent = []
  process.env.RESEND_API_KEY = 'test-key'
  global.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body))
    return { ok: true }
  }
  try {
    const auth = {
      async getUserByEmail(email) {
        if (email === 'missing@example.com') throw Object.assign(new Error('Not found'), { code: 'auth/user-not-found' })
        return { email, disabled: false }
      },
      async generatePasswordResetLink() {
        return 'https://duonest-38dc2.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=reset123'
      }
    }
    const db = database()
    const missing = response()
    await requestPasswordReset(auth, db, { body: { email: 'missing@example.com' } }, missing)
    const existing = response()
    await requestPasswordReset(auth, db, { body: { email: 'person@example.com' } }, existing)
    assert.deepEqual(missing.body, existing.body)
    assert.equal(sent.length, 1)
    assert.match(sent[0].html, /duonestapp\.pl\/auth\/action\?mode=resetPassword/)
  } finally {
    global.fetch = originalFetch
    if (originalKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = originalKey
  }
})
