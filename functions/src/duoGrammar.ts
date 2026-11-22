export type GrammaticalGender = 'female' | 'male' | 'neutral' | 'impersonal'

export function resolveGrammaticalGender(gender?: string | null, grammaticalGender?: string | null): GrammaticalGender {
  if (grammaticalGender && ['female', 'male', 'neutral', 'impersonal'].includes(grammaticalGender)) {
    return grammaticalGender as GrammaticalGender
  }
  switch (gender) {
    case 'female':
    case 'trans_female':
      return 'female'
    case 'male':
    case 'trans_male':
      return 'male'
    case 'nonbinary':
    case 'transgender':
    case 'genderfluid':
    case 'agender':
    case 'queer':
    case 'other':
      return 'neutral'
    default:
      return 'male'
  }
}

const VERBS: Record<string, { male: string; female: string; neutral: string; impersonal: string }> = {
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
  'słuchał': { male: 'słuchał', female: 'słuchała', neutral: 'słuchało', impersonal: 'słuchano' },
  'wypłacił': { male: 'wypłacił', female: 'wypłaciła', neutral: 'wypłaciło', impersonal: 'wypłacono' }
}

export function v(verb: string, grammar?: GrammaticalGender | string | null): string {
  const g: GrammaticalGender = (grammar && ['female', 'male', 'neutral', 'impersonal'].includes(grammar))
    ? (grammar as GrammaticalGender)
    : 'male'
  const match = VERBS[verb]
  if (match) return match[g]
  if (g === 'female') return verb.endsWith('ł') ? verb.slice(0, -1) + 'ła' : verb + 'a'
  if (g === 'neutral') return verb.endsWith('ł') ? verb.slice(0, -1) + 'ło' : verb + 'o'
  return verb
}
