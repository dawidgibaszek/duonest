const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { initializeApp, deleteApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { createPetCareState } = require('../lib/petCare')
const { mutateDuoData } = require('../lib/duoMutations')

const host = process.env.FIRESTORE_EMULATOR_HOST
const projectId = process.env.DUONEST_PET_TEST_PROJECT || 'demo-duonest-pet-care'
const safeEmulator = /^(127\.0\.0\.1|localhost):\d+$/.test(host || '') && projectId.startsWith('demo-')

test('Firestore pet care authorizes both partners and serializes and deduplicates mutations', {
  skip: !safeEmulator && 'Requires a local Firestore emulator and demo project'
}, async () => {
  const unique = randomUUID()
  const app = initializeApp({ projectId }, unique)
  const db = getFirestore(app)
  const pair = `pair-${unique}`
  const first = `first-${unique}`
  const second = `second-${unique}`
  const pairRef = db.collection('partnerships').doc(pair)
  const newRequest = () => `pet_${randomUUID().replaceAll('-', '')}`
  const read = uid => mutateDuoData(db, uid, { action: 'pet/read', id: pair })
  const act = (uid, kind, requestId, id = pair) => mutateDuoData(db, uid, { action: 'pet/care', id, kind, requestId })
  const members = [first, second].flatMap(uid => [
    [db.collection('members').doc(uid), { profile_id: uid, partnership_id: pair }],
    [db.collection('profiles').doc(uid), { auth_user_id: uid, partnership_id: pair }]
  ])

  try {
    await Promise.all([...members, [pairRef, { partner1_id: first, partner2_id: second, pet_name: 'Puszek' }]]
      .map(([ref, data]) => ref.set(data)))
    const [initial, peer] = await Promise.all([read(first), read(second)])
    assert.equal(initial.state.stats.health, 100)
    assert.equal(peer.state.revision, 0)
    const initialized = (await pairRef.get()).data().pet_care
    assert.equal(initialized.stats.hunger, 100)
    assert.equal(initialized.lastInteractionAt, null)
    await read(first)
    assert.deepEqual((await pairRef.get()).data().pet_care, initialized)

    // Seed an existing pet and verify the read and write paths keep its progress.
    const stored = createPetCareState(Date.now() - 3_600_000)
    stored.stats = { hunger: 25, hydration: 25, hygiene: 70, happiness: 70, energy: 70, health: 45 }
    await pairRef.update({ pet_care: stored })
    assert.equal((await read(first)).state.stats.health, 45)
    const feedId = newRequest()
    const [fed, watered, replay] = await Promise.all([
      act(first, 'feed', feedId), act(second, 'hydrate', newRequest()), act(first, 'feed', feedId)
    ])
    assert.equal(fed.gained, 75)
    assert.equal(watered.gained, 75)
    assert.equal(replay.gained, 75)
    const updated = (await pairRef.get()).data()
    assert.equal(updated.pet_name, 'Puszek')
    assert.equal(updated.pet_care.revision, 2)
    assert.ok(updated.pet_care.stats.hunger > 96 && updated.pet_care.stats.hydration > 96)
    assert.equal(updated.pet_care.stats.health, 45)
    assert.ok([first, second].includes(updated.pet_care.lastInteractionBy))
    assert.ok(['feed', 'hydrate'].includes(updated.pet_care.lastInteractionType))
    assert.ok(updated.pet_care.lastInteractionAt >= stored.lastCalculatedAt)

    const secondRead = await read(second)
    assert.equal(secondRead.state.revision, 2)
    assert.equal(secondRead.state.lastInteractionBy, updated.pet_care.lastInteractionBy)
    const anotherFeed = await act(first, 'feed', newRequest())
    assert.ok(anotherFeed.gained > 2 && anotherFeed.gained < 4)
    assert.equal(anotherFeed.state.stats.hunger, 100)
    assert.equal(anotherFeed.state.revision, 3)
    await assert.rejects(act(first, 'clean', feedId), error => error.status === 409)
    await assert.rejects(act(first, 'heal', newRequest()), error => error.status === 400)
    await assert.rejects(act(second, 'feed', newRequest(), 'another-pair'), error => error.status === 403)
    await assert.rejects(read(`outsider-${unique}`), error => error.status === 403)
    await assert.rejects(act(`outsider-${unique}`, 'feed', newRequest()), error => error.status === 403)
    assert.equal((await pairRef.get()).data().pet_care.revision, 3)
  } finally {
    await Promise.all([db.recursiveDelete(pairRef), ...members.map(([ref]) => ref.delete())])
    await deleteApp(app)
  }
})
