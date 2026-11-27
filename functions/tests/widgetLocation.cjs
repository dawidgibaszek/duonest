const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readWidgetLocation } = require('../lib/widgetAccess')

const credential = 'a'.repeat(64)
const future = { toMillis: () => Date.now() + 60_000 }
function fixture() {
  const session = { uid: 'me', profileId: 'mine', partnershipId: 'nest', authenticatedAt: Date.now(), expiresAt: Date.now() + 60_000 }
  const records = {
    members: { profile_id: 'mine', partnership_id: 'nest' },
    profiles: { mine: { auth_user_id: 'me', partnership_id: 'nest' }, partner: { auth_user_id: 'them', partnership_id: 'nest', name: 'Alex' } },
    partnerships: { partner1_id: 'mine', partner2_id: 'partner' },
    location_grants: { pid: 'nest', profileId: 'partner', expires_at: future },
    location_fixes: { latitude: 52, longitude: 21, accuracy: 15, captured_at: Date.now(), address: { city: 'Warszawa' }, expires_at: future }
  }
  const snap = (data) => ({ exists: !!data, data: () => data, get: key => data?.[key] })
  const collection = (name) => ({ doc: (id) => {
    const data = name === 'widget_read_sessions' ? session : name === 'profiles' ? records.profiles[id] : records[name]
    return { get: async () => snap(data), collection }
  } })
  const db = { collection, runTransaction: async fn => fn({ get: ref => ref.get(), getAll: (...refs) => Promise.all(refs.map(ref => ref.get())) }) }
  const auth = { getUser: async () => ({ disabled: false }) }
  async function request(token = credential) {
    let status = 200, body
    const res = { set: () => {}, status: code => { status = code; return res }, json: data => { body = data; return res } }
    await readWidgetLocation(db, auth)({ get: () => token ? `Bearer ${token}` : '' }, res)
    return { status, body }
  }
  return { session, records, auth, request }
}

test('returns only the paired partner location and public fields', async () => {
  const f = fixture()
  const result = await f.request()
  assert.equal(result.status, 200)
  assert.equal(result.body.partnerName, 'Alex')
  assert.equal(result.body.location.latitude, 52)
  assert.ok(result.body.location.expires_at > Date.now())
  assert.deepEqual(Object.keys(result.body.location).sort(), ['accuracy', 'address', 'captured_at', 'expires_at', 'latitude', 'longitude'])
})
test('requires widget credential', async () => {
  assert.equal((await fixture().request(null)).status, 401)
  assert.equal((await fixture().request('bad')).status, 401)
})
test('rejects expired session and changed membership', async () => {
  const f = fixture()
  f.session.expiresAt = 0
  assert.equal((await f.request()).status, 401)
  f.session.expiresAt = Date.now() + 60_000
  f.records.members.partnership_id = 'other'
  assert.equal((await f.request()).status, 403)
})
test('hides expired position, expired sharing and revoked sharing', async () => {
  for (const key of ['expires_at', 'grantExpired', 'grantRemoved']) {
    const f = fixture()
    if (key === 'expires_at') f.records.location_fixes.expires_at = { toMillis: () => 0 }
    if (key === 'grantExpired') f.records.location_grants.expires_at = { toMillis: () => 0 }
    if (key === 'grantRemoved') f.records.location_grants = undefined
    assert.equal((await f.request()).body.location, null)
  }
})
test('rejects disabled user and foreign partner profile', async () => {
  const f = fixture()
  f.auth.getUser = async () => ({ disabled: true })
  assert.equal((await f.request()).status, 401)
  f.auth.getUser = async () => ({ disabled: false })
  f.records.profiles.partner.partnership_id = 'other'
  assert.equal((await f.request()).body.location, null)
})

test('location wakeups reach both native platforms of the other partner with alerts disabled', async () => {
  const { notifyLocationWidgets } = require('../lib/pushCore')
  const sent = []
  const db = { collection: name => {
    if (name === 'partnerships') return { doc: () => ({ get: async () => ({ data: () => ({ partner1_id: 'mine', partner2_id: 'partner' }) }) }) }
    return { where: (key, op, value) => {
      assert.equal(value, 'partner')
      return { get: async () => ({ docs: name === 'widget_push_tokens' ? [] : [
        { data: () => ({ platform: 'android', fcm_token: 'android-device', enabled: false }) },
        { data: () => ({ platform: 'ios', fcm_token: 'ios-device', enabled: false }) },
        { data: () => ({ type: 'web' }) }
      ] }) }
    } }
  } }
  await notifyLocationWidgets(db, { send: async message => { sent.push(message) } }, 'nest', 'mine')
  assert.equal(sent.length, 2)
  const ios = sent.find(message => message.token === 'ios-device')
  const android = sent.find(message => message.token === 'android-device')
  for (const message of [ios, android]) {
    assert.deepEqual(message.data, { widget: 'location', recipientProfileId: 'partner' })
    assert.equal(message.notification, undefined)
  }
  assert.equal(ios.apns.payload.aps.contentAvailable, true)
  assert.equal(ios.apns.headers['apns-collapse-id'], 'partner-location')
  assert.equal(android.android.collapseKey, 'partner-location')
  await notifyLocationWidgets(db, { send: async () => { throw Error('Unexpected push') } }, 'nest', 'outsider')
})
