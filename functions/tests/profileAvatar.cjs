const { test } = require('node:test')
const assert = require('node:assert/strict')
const { avatarObjectPath } = require('../lib/profileAvatar')

const bucket = 'demo-duonest.firebasestorage.app'
const owner = 'owner-uid'
const path = `avatars/${owner}/avatar.jpg`

function storageUrl(version, name, object) {
  return `https://firebasestorage.googleapis.com/${version}/b/${encodeURIComponent(name)}/o/${encodeURIComponent(object)}?alt=media&token=old-download-token`
}

test('resolves managed avatars and Firebase download URLs saved by previous clients', () => {
  assert.equal(avatarObjectPath(path, owner, bucket), path)
  assert.equal(avatarObjectPath(`gs://${bucket}/${path}`, owner, bucket), path)
  assert.equal(avatarObjectPath(storageUrl('v0', bucket, path), owner, bucket), path)
  assert.equal(avatarObjectPath(storageUrl('v1', bucket, path), owner, bucket), path)
})

test('rejects legacy avatar URLs outside the owner path or configured bucket', () => {
  assert.equal(avatarObjectPath(storageUrl('v0', bucket, path), 'another-uid', bucket), null)
  assert.equal(avatarObjectPath(storageUrl('v0', 'another-bucket', path), owner, bucket), null)
  assert.equal(avatarObjectPath(storageUrl('v0', bucket, `avatars/${owner}/extra/avatar.jpg`), owner, bucket), null)
  const externalUrl = storageUrl('v0', bucket, path).replace('firebasestorage.googleapis.com', 'example.com')
  assert.equal(avatarObjectPath(externalUrl, owner, bucket), null)
})
