export const DUO_FEATURES = ['shopping', 'tasks', 'meals', 'savings', 'pet', 'calendar', 'movies', 'wishlist'] as const
export type DuoFeature = typeof DUO_FEATURES[number]

export const DAILY_FEATURES = ['shopping', 'tasks', 'meals', 'savings', 'calendar'] as const
export const LEISURE_FEATURES = ['movies', 'wishlist', 'drawing'] as const

export const NEST_CARDS = ['summary', 'points', 'rewards', 'mood', 'music', 'gestures', 'today', 'doodle', 'shortcuts', 'location'] as const
export type NestCard = typeof NEST_CARDS[number]
export type OnboardingStage = 'profile' | 'features' | 'complete'

export const DEFAULT_NEST_CARDS: readonly NestCard[] = NEST_CARDS.filter(card => card !== 'shortcuts' && card !== 'location')

export function normalizeSelection<T extends string>(value: unknown, allowed: readonly T[], fallback: readonly T[]): T[] {
  if (!Array.isArray(value)) return [...fallback]
  const ids = new Set<T>()
  for (const id of value) {
    if (allowed.includes(id)) ids.add(id)
  }
  return [...ids]
}

export function starterNestCards(features: readonly DuoFeature[]): NestCard[] {
  const selected = new Set(features)
  return [
    'summary',
    ...(features.length ? ['shortcuts'] as const : []),
    ...(selected.has('tasks') ? ['points', 'rewards'] as const : []),
    ...(selected.has('tasks') || selected.has('calendar') ? ['today'] as const : []),
    'mood', 'gestures', 'doodle'
  ]
}

export function featurePath(feature: DuoFeature | 'drawing') {
  return feature === 'pet' ? '/tabs/tasks?view=pet' : `/tabs/${feature}`
}
