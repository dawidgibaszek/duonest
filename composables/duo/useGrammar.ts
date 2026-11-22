import { computed } from 'vue'
import { currentUser, partnerUser } from './state'
import type { Profile } from '~/types/duo'

export type GenderIdentity =
  | 'female'
  | 'male'
  | 'nonbinary'
  | 'trans_female'
  | 'trans_male'
  | 'transgender'
  | 'genderfluid'
  | 'agender'
  | 'queer'
  | 'other'
  | 'unspecified'

export type GrammaticalGender = 'female' | 'male' | 'neutral' | 'impersonal'

export interface GenderOption {
  value: GenderIdentity
  label: string
  icon: string
  defaultGrammar: GrammaticalGender
  description: string
}

export interface GrammarOption {
  value: GrammaticalGender
  label: string
  example: string
  description: string
}

export const GENDER_OPTIONS: readonly GenderOption[] = [
  { value: 'female', label: 'Kobieta', icon: '👩', defaultGrammar: 'female', description: 'Kobieta cispłciowa' },
  { value: 'male', label: 'Mężczyzna', icon: '👨', defaultGrammar: 'male', description: 'Mężczyzna cispłciowy' },
  { value: 'nonbinary', label: 'Osoba niebinarna', icon: '⚧️', defaultGrammar: 'neutral', description: 'Tożsamość poza binarnym podziałem' },
  { value: 'trans_female', label: 'Transpłciowa kobieta', icon: '🏳️‍⚧️', defaultGrammar: 'female', description: 'Kobieta transpłciowa' },
  { value: 'trans_male', label: 'Transpłciowy mężczyzna', icon: '🏳️‍⚧️', defaultGrammar: 'male', description: 'Mężczyzna transpłciowy' },
  { value: 'transgender', label: 'Osoba transpłciowa', icon: '🏳️‍⚧️', defaultGrammar: 'neutral', description: 'Tożsamość transpłciowa' },
  { value: 'genderfluid', label: 'Genderfluid', icon: '🌊', defaultGrammar: 'neutral', description: 'Płynna ekspresja i tożsamość płciowa' },
  { value: 'agender', label: 'Agender', icon: '⚪', defaultGrammar: 'neutral', description: 'Tożsamość neutralna / bezpłciowa' },
  { value: 'queer', label: 'Queer', icon: '💜', defaultGrammar: 'neutral', description: 'Tożsamość queer / nieheteronormatywna' },
  { value: 'other', label: 'Inna tożsamość', icon: '✨', defaultGrammar: 'neutral', description: 'Indywidualna tożsamość płciowa' },
  { value: 'unspecified', label: 'Wolę nie podawać', icon: '👤', defaultGrammar: 'male', description: 'Standardowe formy językowe' }
] as const

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
  if (!profile) return 'male'
  const explicit = profile.grammatical_gender
  if (explicit && ['female', 'male', 'neutral', 'impersonal'].includes(explicit)) {
    return explicit as GrammaticalGender
  }
  const gender = profile.gender
  if (gender) {
    const matched = GENDER_OPTIONS.find(opt => opt.value === gender)
    if (matched) return matched.defaultGrammar
  }
  return 'male'
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

const VERBS_3RD_PAST: Record<string, { male: string; female: string; neutral: string; impersonal: string }> = {
  'dodał': { male: 'dodał', female: 'dodała', neutral: 'dodało', impersonal: 'dodano' },
  'zaktualizował': { male: 'zaktualizował', female: 'zaktualizowała', neutral: 'zaktualizowało', impersonal: 'zaktualizowano' },
  'zmienił': { male: 'zmienił', female: 'zmieniła', neutral: 'zmieniło', impersonal: 'zmieniono' },
  'przesłał': { male: 'przesłał', female: 'przesłała', neutral: 'przesłało', impersonal: 'przesłano' },
  'dostał': { male: 'dostał', female: 'dostała', neutral: 'dostało', impersonal: 'otrzymało' },
  'ukończył': { male: 'ukończył', female: 'ukończyła', neutral: 'ukończyło', impersonal: 'ukończono' },
  'zrealizował': { male: 'zrealizował', female: 'zrealizowała', neutral: 'zrealizowało', impersonal: 'zrealizowano' },
  'kupił': { male: 'kupił', female: 'kupiła', neutral: 'kupiło', impersonal: 'kupiono' },
  'odhaczył': { male: 'odhaczył', female: 'odhaczyła', neutral: 'odhaczyło', impersonal: 'odhaczono' },
  'oznaczył': { male: 'oznaczył', female: 'oznaczyła', neutral: 'oznaczyło', impersonal: 'oznaczono' },
  'narysował': { male: 'narysował', female: 'narysowała', neutral: 'narysowało', impersonal: 'narysowano' },
  'wyczyścił': { male: 'wyczyścił', female: 'wyczyściła', neutral: 'wyczyściło', impersonal: 'wyczyszczono' },
  'zapisał': { male: 'zapisał', female: 'zapisała', neutral: 'zapisało', impersonal: 'zapisano' },
  'zaplanował': { male: 'zaplanował', female: 'zaplanowała', neutral: 'zaplanowało', impersonal: 'zaplanowano' },
  'spełnił': { male: 'spełnił', female: 'spełniła', neutral: 'spełniło', impersonal: 'spełniono' },
  'odebrał': { male: 'odebrał', female: 'odebrała', neutral: 'odebrało', impersonal: 'odebrano' },
  'utworzył': { male: 'utworzył', female: 'utworzyła', neutral: 'utworzyło', impersonal: 'utworzono' },
  'dorzucił': { male: 'dorzucił', female: 'dorzuciła', neutral: 'dorzuciło', impersonal: 'dorzucono' },
  'wypłacił': { male: 'wypłacił', female: 'wypłaciła', neutral: 'wypłaciło', impersonal: 'wypłacono' },
  'widział': { male: 'widział', female: 'widziała', neutral: 'widziało', impersonal: 'widziano' },
  'słuchał': { male: 'słuchał', female: 'słuchała', neutral: 'słuchało', impersonal: 'słuchano' },
  'był': { male: 'był', female: 'była', neutral: 'było', impersonal: 'było' }
}

export function conjugateVerbPast3rd(verb: string, grammar: GrammaticalGender): string {
  const match = VERBS_3RD_PAST[verb]
  if (match) return match[grammar]
  if (grammar === 'female') return verb.endsWith('ł') ? verb.slice(0, -1) + 'ła' : verb + 'a'
  if (grammar === 'neutral') return verb.endsWith('ł') ? verb.slice(0, -1) + 'ło' : verb + 'o'
  return verb
}

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
  const partnerDopelniaczName = computed(() => partnerUser.value?.name || partnerDopelniacz.value)
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
