import { computed } from 'vue'
import { femaleOutline, maleOutline, personOutline } from 'ionicons/icons'
import { currentUser, partnerUser } from './state'
import { resolveGrammaticalGender as resolveGender, v as conjugateSharedVerb, type GenderIdentity, type GrammaticalGender } from '~/functions/src/duoGrammar'
import type { Profile } from '~/types/duo'

export type { GenderIdentity, GrammaticalGender } from '~/functions/src/duoGrammar'

export interface GenderOption {
  value: GenderIdentity
  label: string
  icon: string
}

export interface GrammarOption {
  value: GrammaticalGender
  label: string
  example: string
  description: string
}

export const GENDER_OPTIONS: readonly GenderOption[] = [
  { value: 'male', label: 'Mężczyzna', icon: maleOutline },
  { value: 'female', label: 'Kobieta', icon: femaleOutline },
  { value: 'nonbinary', label: 'Osoba poza binarnym podziałem płci', icon: personOutline }
]

export const GRAMMAR_OPTIONS: readonly GrammarOption[] = [
  {
    value: 'female',
    label: 'Żeńska (ona / jej)',
    example: 'zrobiłaś · partnerka · aktywna',
    description: 'Końcówki żeńskie (-aś, -a, partnerka)'
  },
  {
    value: 'male',
    label: 'Męska (on / jego)',
    example: 'zrobiłeś · partner · aktywny',
    description: 'Końcówki męskie (-eś, partner)'
  },
  {
    value: 'neutral',
    label: 'Neutralna / Niebinarna (ono / ich)',
    example: 'zrobiłoś · osoba partnerska · aktywne',
    description: 'Końcówki neutralne / dukaizmy (-oś, -o)'
  },
  {
    value: 'impersonal',
    label: 'Bezosobowa / Inkluzywna',
    example: 'zrobiono · osoba partnerska · aktywność',
    description: 'Formy bezosobowe (-no / -to)'
  }
] as const

export function resolveGrammaticalGender(profile?: Partial<Profile> | null): GrammaticalGender {
  return resolveGender(profile?.gender, profile?.grammatical_gender)
}

export type CaseName = 'mianownik' | 'dopelniacz' | 'celownik' | 'biernik' | 'narzednik' | 'miejscownik'

export function getPartnerNoun(caseName: CaseName, grammar: GrammaticalGender): string {
  switch (grammar) {
    case 'female':
      switch (caseName) {
        case 'mianownik': return 'Partnerka'
        case 'dopelniacz': return 'Partnerki'
        case 'celownik': return 'Partnerce'
        case 'biernik': return 'Partnerkę'
        case 'narzednik': return 'partnerką'
        case 'miejscownik': return 'partnerce'
      }
      break

    case 'neutral':
    case 'impersonal':
      switch (caseName) {
        case 'mianownik': return 'Osoba partnerska'
        case 'dopelniacz': return 'Osoby partnerskiej'
        case 'celownik': return 'Osobie partnerskiej'
        case 'biernik': return 'Osobę partnerską'
        case 'narzednik': return 'osobą partnerską'
        case 'miejscownik': return 'osobie partnerskiej'
      }
      break

    case 'male':
    default:
      switch (caseName) {
        case 'mianownik': return 'Partner'
        case 'dopelniacz': return 'Partnera'
        case 'celownik': return 'Partnerowi'
        case 'biernik': return 'Partnera'
        case 'narzednik': return 'partnerem'
        case 'miejscownik': return 'partnerze'
      }
  }
}

export function getPartnerPossessive(grammar: GrammaticalGender): string {
  switch (grammar) {
    case 'female': return 'jej'
    case 'neutral':
    case 'impersonal': return 'ich'
    case 'male':
    default: return 'jego'
  }
}

export function getPartnerPronoun(grammar: GrammaticalGender): string {
  switch (grammar) {
    case 'female': return 'ona'
    case 'neutral':
    case 'impersonal': return 'ono'
    case 'male':
    default: return 'on'
  }
}

export const conjugateVerbPast3rd = conjugateSharedVerb

const VERBS_2ND_PAST: Record<string, { male: string; female: string; neutral: string; impersonal: string }> = {
  'zrobiłeś': { male: 'zrobiłeś', female: 'zrobiłaś', neutral: 'zrobiłoś', impersonal: 'zrobiono' },
  'dodałeś': { male: 'dodałeś', female: 'dodałaś', neutral: 'dodałoś', impersonal: 'dodano' },
  'ukończyłeś': { male: 'ukończyłeś', female: 'ukończyłaś', neutral: 'ukończyłoś', impersonal: 'ukończono' },
  'kupiłeś': { male: 'kupiłeś', female: 'kupiłaś', neutral: 'kupiłoś', impersonal: 'kupiono' },
  'byłeś': { male: 'byłeś', female: 'byłaś', neutral: 'byłoś', impersonal: 'było' },
  'wybrałeś': { male: 'wybrałeś', female: 'wybrałaś', neutral: 'wybrałoś', impersonal: 'wybrano' },
  'oznaczyłeś': { male: 'oznaczyłeś', female: 'oznaczyłaś', neutral: 'oznaczyłoś', impersonal: 'oznaczono' },
  'słuchałeś': { male: 'słuchałeś', female: 'słuchałaś', neutral: 'słuchałoś', impersonal: 'słuchano' }
}

export function conjugateVerbPast2nd(verb: string, grammar: GrammaticalGender): string {
  const match = VERBS_2ND_PAST[verb]
  if (match) return match[grammar]
  if (grammar === 'female') return verb.replace(/eś$/, 'aś')
  if (grammar === 'neutral') return verb.replace(/eś$/, 'oś')
  return verb
}

const ADJECTIVES: Record<string, { male: string; female: string; neutral: string; impersonal: string }> = {
  'aktywny': { male: 'aktywny', female: 'aktywna', neutral: 'aktywne', impersonal: 'aktywność' },
  'widziany': { male: 'widziany', female: 'widziana', neutral: 'widziane', impersonal: 'widoczne' },
  'zalogowany': { male: 'zalogowany', female: 'zalogowana', neutral: 'zalogowane', impersonal: 'zalogowano' },
  'połączony': { male: 'połączony', female: 'połączona', neutral: 'połączone', impersonal: 'połączono' },
  'gotowy': { male: 'gotowy', female: 'gotowa', neutral: 'gotowe', impersonal: 'gotowość' },
  'sam': { male: 'sam', female: 'sama', neutral: 'samo', impersonal: 'samodzielnie' },
  'pewny': { male: 'pewny', female: 'pewna', neutral: 'pewne', impersonal: 'pewność' }
}

export function inflectAdj(adj: string, grammar: GrammaticalGender): string {
  const match = ADJECTIVES[adj]
  if (match) return match[grammar]
  if (grammar === 'female') return adj.endsWith('y') ? adj.slice(0, -1) + 'a' : adj
  if (grammar === 'neutral' || grammar === 'impersonal') return adj.endsWith('y') ? adj.slice(0, -1) + 'e' : adj
  return adj
}

export function useDuoGrammar() {
  const userGrammar = computed(() => resolveGrammaticalGender(currentUser.value))
  const partnerGrammar = computed(() => resolveGrammaticalGender(partnerUser.value))

  const partnerTitle = computed(() => getPartnerNoun('mianownik', partnerGrammar.value))
  const partnerDopelniacz = computed(() => getPartnerNoun('dopelniacz', partnerGrammar.value))
  const partnerCelownik = computed(() => getPartnerNoun('celownik', partnerGrammar.value))
  const partnerBiernik = computed(() => getPartnerNoun('biernik', partnerGrammar.value))
  const partnerNarzednik = computed(() => getPartnerNoun('narzednik', partnerGrammar.value))
  const partnerMiejscownik = computed(() => getPartnerNoun('miejscownik', partnerGrammar.value))

  const partnerPossessive = computed(() => getPartnerPossessive(partnerGrammar.value))
  const partnerPronoun = computed(() => getPartnerPronoun(partnerGrammar.value))

  const partnerDisplayName = computed(() => partnerUser.value?.name || partnerTitle.value)
  const partnerDopelniaczName = computed(() => partnerUser.value?.name || partnerDopelniacz.value.toLowerCase())
  const partnerNarzednikName = computed(() => {
    if (partnerUser.value?.name) return `z ${partnerUser.value.name}`
    return `z ${partnerNarzednik.value}`
  })

  const formatPartnerVerb = (verb: string) => conjugateVerbPast3rd(verb, partnerGrammar.value)
  const formatUserVerb = (verb: string) => conjugateVerbPast2nd(verb, userGrammar.value)
  const formatPartnerAdj = (adj: string) => inflectAdj(adj, partnerGrammar.value)
  const formatUserAdj = (adj: string) => inflectAdj(adj, userGrammar.value)

  return {
    userGrammar,
    partnerGrammar,
    partnerTitle,
    partnerDopelniacz,
    partnerCelownik,
    partnerBiernik,
    partnerNarzednik,
    partnerMiejscownik,
    partnerPossessive,
    partnerPronoun,
    partnerDisplayName,
    partnerDopelniaczName,
    partnerNarzednikName,
    formatPartnerVerb,
    formatUserVerb,
    formatPartnerAdj,
    formatUserAdj,
    getPartnerNoun: (caseName: CaseName) => getPartnerNoun(caseName, partnerGrammar.value),
    GENDER_OPTIONS,
    GRAMMAR_OPTIONS
  }
}
