const { test } = require('node:test')
const assert = require('node:assert/strict')
const { handlePushAction } = require('../lib/pushCore')

test('ending a live drawing sends a silent push to both native platforms', async () => {
  const sent = []
  const db = { collection: name => {
    if (name === 'partnerships') {
      return { doc: () => ({ get: async () => ({ data: () => ({ partner1_id: 'mine', partner2_id: 'partner' }) }) }) }
    }
    return { where: (key, op, value) => {
      assert.deepEqual([key, op, value], ['user_id', '==', 'partner'])
      return { get: async () => ({ docs: ['android', 'ios'].map(platform => ({
        data: () => ({ platform, fcm_token: platform, enabled: false })
      })) }) }
    } }
  } }
  await handlePushAction(db, { send: async message => { sent.push(message) } },
    { profileId: 'mine', partnershipId: 'nest', name: 'Alex' }, 'send', { action: 'DOODLE_DRAWING_STOP' })

  assert.equal(sent.length, 2)
  const ios = sent.find(message => message.token === 'ios')
  const android = sent.find(message => message.token === 'android')
  for (const message of [ios, android]) {
    assert.deepEqual(message.data, {
      widget: 'doodle', action: 'DOODLE_DRAWING_STOP', senderName: 'Alex', recipientProfileId: 'partner'
    })
    assert.equal(message.notification, undefined)
  }
  assert.equal(ios.apns.headers['apns-push-type'], 'background')
  assert.equal(ios.apns.payload.aps.contentAvailable, true)
  assert.equal(android.android.priority, 'high')
})
