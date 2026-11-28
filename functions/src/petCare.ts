const HOUR_MS = 3_600_000

export const PET_NEEDS = {
  hunger: { decay: 3, mood: 'Głodny' },
  hydration: { decay: 3, mood: 'Spragniony' },
  hygiene: { decay: 2, mood: 'Brudny' },
  happiness: { decay: 2.5, mood: 'Smutny' },
  energy: { decay: 2.5, mood: 'Zmęczony' }
} as const

export const PET_ACTIONS = {
  feed: { need: 'hunger', points: 75 },
  hydrate: { need: 'hydration', points: 75 },
  clean: { need: 'hygiene', points: 50 },
  play: { need: 'happiness', points: 65 },
  rest: { need: 'energy', points: 65 }
} as const

export const PET_LIMITS = {
  full: 100,
  healthMin: 1,
  critical: 10,
  sick: 50,
  neglected: 20,
  needsCare: 40,
  recovery: 60,
  happy: 80,
  healthLoss: 2,
  healthRecovery: 4
} as const

type PetNeed = keyof typeof PET_NEEDS
export type PetActionType = keyof typeof PET_ACTIONS
export type PetStats = Record<PetNeed | 'health', number>

export interface PetCareState {
  stats: PetStats
  revision: number
  lastCalculatedAt: number
  lastInteractionAt: number | null
  lastInteractionBy: string | null
  lastInteractionType: PetActionType | null
}

export interface PetCareView {
  state: PetCareState
  serverNow: number
}

export interface PetCareResult extends PetCareView {
  gained: number
}

const needs = Object.keys(PET_NEEDS) as PetNeed[]

export function createPetCareState(now: number): PetCareState {
  return {
    stats: Object.fromEntries([...needs, 'health'].map(key => [key, PET_LIMITS.full])) as PetStats,
    revision: 0,
    lastCalculatedAt: now,
    lastInteractionAt: null,
    lastInteractionBy: null,
    lastInteractionType: null
  }
}

export function calculatePetCare(state: PetCareState, now: number): PetCareState {
  const time = Math.max(state.lastCalculatedAt, now)
  const hours = (time - state.lastCalculatedAt) / HOUR_MS
  const stats = { ...state.stats }
  let recoveryHours = hours
  let neglectStartsAfter = hours

  // Needs only decrease between actions. Recovery can occur first, followed by
  // a neutral period and then neglect from the first need to cross its threshold.
  for (const need of needs) {
    const { decay } = PET_NEEDS[need]
    const value = Math.min(PET_LIMITS.full, Math.max(0, stats[need]))
    recoveryHours = Math.min(recoveryHours, Math.max(0, (value - PET_LIMITS.recovery) / decay))
    neglectStartsAfter = Math.min(neglectStartsAfter, Math.max(0, (value - PET_LIMITS.neglected) / decay))
    stats[need] = Math.max(0, value - hours * decay)
  }

  const startingHealth = Math.min(PET_LIMITS.full, Math.max(PET_LIMITS.healthMin, stats.health))
  const recoveredHealth = Math.min(PET_LIMITS.full, startingHealth + recoveryHours * PET_LIMITS.healthRecovery)
  stats.health = Math.max(PET_LIMITS.healthMin, recoveredHealth - (hours - neglectStartsAfter) * PET_LIMITS.healthLoss)
  return { ...state, stats, lastCalculatedAt: time }
}

export function applyPetCare(state: PetCareState, action: PetActionType, actor: string, now: number): PetCareResult {
  const current = calculatePetCare(state, now)
  const { need, points } = PET_ACTIONS[action]
  const value = Math.min(PET_LIMITS.full, current.stats[need] + points)
  const gained = value - current.stats[need]
  if (gained > 0) {
    current.stats[need] = value
    current.revision = (state.revision ?? 0) + 1
    current.lastInteractionAt = current.lastCalculatedAt
    current.lastInteractionBy = actor
    current.lastInteractionType = action
  }
  return { state: current, serverNow: now, gained }
}

export function getPetMood(stats: PetStats): string {
  if (stats.health <= PET_LIMITS.critical) return 'Stan krytyczny'
  if (stats.health <= PET_LIMITS.sick) return 'Chory'
  const lowest = needs.reduce((first, need) => stats[need] < stats[first] ? need : first)
  if (stats[lowest] <= PET_LIMITS.neglected) return PET_NEEDS[lowest].mood
  if (stats.health < PET_LIMITS.full) return stats[lowest] >= PET_LIMITS.recovery ? 'Regeneruje się' : 'Osłabiony'
  if (stats[lowest] >= PET_LIMITS.happy) return 'Szczęśliwy'
  if (stats[lowest] <= PET_LIMITS.needsCare) return 'Potrzebuje opieki'
  return 'Spokojny'
}
