export interface DuoGesturePreset {
  id: 'hug' | 'kiss' | 'tea' | 'love' | 'massage'
  title: string
  defaultMsg: string
  receivedSub: string
  sentSub: string
}

export const DUO_GESTURE_PRESETS: DuoGesturePreset[] = [
  {
    id: 'hug',
    title: 'Uścisk',
    defaultMsg: 'Ciepły uścisk w trakcie dnia!',
    receivedSub: 'Przesyła Ci ciepły uścisk',
    sentSub: 'Wysłano ciepły uścisk'
  },
  {
    id: 'kiss',
    title: 'Buziak',
    defaultMsg: 'Słodki buziak dla Ciebie!',
    receivedSub: 'Przesyła Ci słodkiego buziaka',
    sentSub: 'Wysłano słodkiego buziaka'
  },
  {
    id: 'tea',
    title: 'Herbatka',
    defaultMsg: 'Zrobiłem dla Ciebie herbatkę!',
    receivedSub: 'Zaprasza Cię na ciepłą herbatkę',
    sentSub: 'Wysłano zaproszenie na herbatkę'
  },
  {
    id: 'love',
    title: 'Kocham Cię',
    defaultMsg: 'Pamiętaj, że bardzo Cię kocham!',
    receivedSub: 'Przesyła czułe wyznanie',
    sentSub: 'Wysłano wyznanie miłości'
  },
  {
    id: 'massage',
    title: 'Masaż',
    defaultMsg: 'Wieczorny relaksujący masaż czeka na Ciebie!',
    receivedSub: 'Proponuje relaksujący masaż',
    sentSub: 'Wysłano zaproszenie na masaż'
  }
]

const GESTURE_BY_ID = new Map<string, DuoGesturePreset>(
  DUO_GESTURE_PRESETS.map(preset => [preset.id, preset])
)

export function getDuoGestureMeta(type?: string | null): {
  id: string
  title: string
  defaultMsg: string
  receivedSub: string
  sentSub: string
} {
  const normalized = String(type || '').toLowerCase().trim()
  const found = GESTURE_BY_ID.get(normalized)
  if (found) return found
  return {
    id: normalized || 'love',
    title: 'Drobny gest',
    defaultMsg: 'Ciepła myśl dla Ciebie!',
    receivedSub: 'Przesyła Ci drobny gest',
    sentSub: 'Wysłano drobny gest'
  }
}

export function formatNudgeDateTime(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
