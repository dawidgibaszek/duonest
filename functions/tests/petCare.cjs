const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createPetCareState, calculatePetCare, applyPetCare, getPetMood } = require('../lib/petCare')

const hour = 3_600_000
const rounded = stats => Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, Math.round(value)]))
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`)

test('new pets start full and decay by real elapsed time, including across days', () => {
  const fresh = createPetCareState(0)
  assert.deepEqual(fresh.stats, { hunger: 100, hydration: 100, hygiene: 100, happiness: 100, energy: 100, health: 100 })
  const expected = [
    [12, { hunger: 64, hydration: 64, hygiene: 76, happiness: 70, energy: 70, health: 100 }],
    [24, { hunger: 28, hydration: 28, hygiene: 52, happiness: 40, energy: 40, health: 100 }],
    [48, { hunger: 0, hydration: 0, hygiene: 4, happiness: 0, energy: 0, health: 57 }],
    [72, { hunger: 0, hydration: 0, hygiene: 0, happiness: 0, energy: 0, health: 9 }]
  ]
  for (const [hours, stats] of expected) assert.deepEqual(rounded(calculatePetCare(fresh, hours * hour).stats), stats)
  assert.equal(fresh.stats.hunger, 100)
  const quarterHour = calculatePetCare(fresh, hour / 4)
  assert.equal(quarterHour.stats.happiness, 99.375)
  const direct = calculatePetCare(fresh, 53 * hour)
  const split = calculatePetCare(quarterHour, 53 * hour)
  for (const key of Object.keys(direct.stats)) closeTo(split.stats[key], direct.stats[key])
  assert.deepEqual(calculatePetCare(quarterHour, 0), quarterHour)
})

test('health integrates only the portions actually in recovery or neglect', () => {
  const state = createPetCareState(0)
  Object.assign(state.stats, { hunger: 65, health: 90 })
  closeTo(calculatePetCare(state, 3 * hour).stats.health, 90 + 20 / 3)
  closeTo(calculatePetCare(state, 15 * hour).stats.health, 90 + 20 / 3)
  closeTo(calculatePetCare(state, 18 * hour).stats.health, 90 + 20 / 3 - 6)

  Object.assign(state.stats, { hunger: 20, hydration: 20, hygiene: 20, health: 89 })
  assert.equal(calculatePetCare(state, hour).stats.health, 87)
  state.stats = { ...createPetCareState(0).stats, health: 99 }
  closeTo(calculatePetCare(state, 48 * hour).stats.health, 100 - (48 - 80 / 3) * 2)
})

test('critical health has a floor and restoring needs allows gradual recovery', () => {
  const neglected = calculatePetCare(createPetCareState(0), 90 * hour)
  assert.equal(neglected.stats.health, 1)
  let caredFor = neglected
  for (const action of ['feed', 'hydrate', 'clean', 'clean', 'play', 'rest']) {
    caredFor = applyPetCare(caredFor, action, 'member', 90 * hour).state
  }
  assert.equal(caredFor.stats.health, 1)
  assert.equal(calculatePetCare(caredFor, 91 * hour).stats.health, 5)
  assert.equal(calculatePetCare(caredFor, 93 * hour).stats.health, 9)
  caredFor = applyPetCare(caredFor, 'play', 'member', 92 * hour).state
  caredFor = applyPetCare(caredFor, 'rest', 'member', 92 * hour).state
  assert.equal(calculatePetCare(caredFor, 93 * hour).stats.health, 13)
  assert.equal(getPetMood(calculatePetCare(caredFor, 93 * hour).stats), 'Chory')
})

test('each action restores its own need, caps at 100 and records only successful care', () => {
  const actions = [
    ['feed', 'hunger', 75], ['hydrate', 'hydration', 75], ['clean', 'hygiene', 50],
    ['play', 'happiness', 65], ['rest', 'energy', 65]
  ]
  for (const [action, need, points] of actions) {
    const state = createPetCareState(0)
    state.stats[need] = 0
    const first = applyPetCare(state, action, 'member-a', 0)
    assert.deepEqual(first.state.stats, { ...state.stats, [need]: points })
    assert.equal(first.gained, points)
    assert.equal(first.state.lastInteractionType, action)
    assert.equal(first.state.lastInteractionAt, 0)
    const second = applyPetCare(first.state, action, 'member-b', 0)
    assert.equal(second.gained, 100 - points)
    assert.equal(second.state.stats[need], 100)
    assert.equal(second.state.revision, 2)
    assert.equal(second.state.lastInteractionBy, 'member-b')
    const third = applyPetCare(second.state, action, 'member-a', 0)
    assert.equal(third.gained, 0)
    assert.deepEqual(third.state, second.state)
  }
})

test('moods obey health priority and resolve equal critical needs deterministically', () => {
  const full = createPetCareState(0).stats
  const cases = [
    [{ health: 10, energy: 0 }, 'Stan krytyczny'],
    [{ health: 50, hydration: 5 }, 'Chory'],
    [{ hunger: 15, hydration: 15 }, 'Głodny'],
    [{ hunger: 19, hydration: 15, hygiene: 15 }, 'Spragniony'],
    [{ hygiene: 20 }, 'Brudny'], [{ happiness: 20 }, 'Smutny'], [{ energy: 20 }, 'Zmęczony'],
    [{ health: 75, energy: 60 }, 'Regeneruje się'],
    [{ health: 75, energy: 59 }, 'Osłabiony'],
    [{ energy: 80 }, 'Szczęśliwy'], [{ energy: 40 }, 'Potrzebuje opieki'], [{ energy: 79 }, 'Spokojny']
  ]
  for (const [changes, expected] of cases) assert.equal(getPetMood({ ...full, ...changes }), expected)
})
