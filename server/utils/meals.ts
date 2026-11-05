import {
  INGREDIENTS_PL_DICT,
  translateIngredientName,
  translateMeasurePl,
  formatMeasurePl
} from '../../utils/mealTranslations'
import {
  formatMealTitlePl,
  translateRecipeTitle
} from '../../utils/mealTitlesDict'

export {
  INGREDIENTS_PL_DICT,
  translateIngredientName,
  translateMeasurePl,
  formatMeasurePl,
  formatMealTitlePl,
  translateRecipeTitle
}

export interface MealIngredient {
  name: string
  measure: string
}

export interface MealRecipe {
  id: string
  title: string
  titlePl?: string
  originalTitle?: string
  category: string
  categoryPl: string
  area: string
  areaPl: string
  instructions: string
  instructionsSteps?: string[]
  thumbnail: string
  tags: string[]
  youtubeUrl: string | null
  sourceUrl: string | null
  ingredients: MealIngredient[]
}

export const MEAL_CATEGORY_TRANSLATIONS: Record<string, string> = {
  Beef: 'Wołowina',
  Chicken: 'Drób & Kurczak',
  Dessert: 'Desery',
  Lamb: 'Jagnięcina',
  Miscellaneous: 'Różne',
  Pasta: 'Makarony',
  Pork: 'Wieprzowina',
  Seafood: 'Owoce morza & Ryby',
  Side: 'Dodatki',
  Starter: 'Przekąski',
  Vegan: 'Wegańskie',
  Vegetarian: 'Wegetariańskie',
  Breakfast: 'Śniadania',
  Goat: 'Koźlina'
}

export const MEAL_AREA_TRANSLATIONS: Record<string, string> = {
  Italian: 'Włoska',
  Mexican: 'Meksykańska',
  American: 'Amerykańska',
  Chinese: 'Chińska',
  Japanese: 'Japońska',
  Indian: 'Indyjska',
  French: 'Francuska',
  Greek: 'Grecka',
  Spanish: 'Hiszpańska',
  Thai: 'Tajska',
  Polish: 'Polska',
  British: 'Brytyjska',
  Turkish: 'Turecka',
  Vietnamese: 'Wietnamska',
  Moroccan: 'Marokańska',
  Portuguese: 'Portugalska',
  Dutch: 'Holenderska',
  Croatian: 'Chorwacka',
  Egyptian: 'Egipska',
  Filipino: 'Filipińska',
  Irish: 'Irlandzka',
  Jamaican: 'Jamajska',
  Malaysian: 'Malezyjska',
  Russian: 'Rosyjska',
  Canadian: 'Kanadyjska',
  Tunisian: 'Tunezja',
  Unknown: 'Międzynarodowa'
}

export const POLISH_TO_ENGLISH_SEARCH: Record<string, string> = {
  makaron: 'pasta',
  makarony: 'pasta',
  spaghetti: 'spaghetti',
  kurczak: 'chicken',
  drob: 'chicken',
  drób: 'chicken',
  kurczaka: 'chicken',
  wolowina: 'beef',
  wołowina: 'beef',
  wieprzowina: 'pork',
  ryba: 'fish',
  ryby: 'fish',
  losos: 'salmon',
  łosoś: 'salmon',
  tunczyk: 'tuna',
  tuńczyk: 'tuna',
  krewetki: 'prawn',
  owoce_morza: 'seafood',
  pizza: 'pizza',
  zupa: 'soup',
  salatka: 'salad',
  sałatka: 'salad',
  nalesniki: 'pancake',
  naleśniki: 'pancake',
  burger: 'burger',
  burgery: 'burger',
  ser: 'cheese',
  ziemniaki: 'potato',
  ryz: 'rice',
  ryż: 'rice',
  ciasto: 'cake',
  czekolada: 'chocolate',
  jajka: 'egg',
  jajko: 'egg',
  pomidory: 'tomato'
}

export function translateCategoryToPl(cat: string): string {
  if (!cat) return 'Inne'
  return MEAL_CATEGORY_TRANSLATIONS[cat] || cat
}

export function translateAreaToPl(area: string): string {
  if (!area) return 'Międzynarodowa'
  return MEAL_AREA_TRANSLATIONS[area] || area
}

// Memory cache for translated instructions and recipes
const translationCache = new Map<string, string>()

export async function translateTextToPolish(text: string): Promise<string> {
  if (!text || !text.trim()) return ''
  const clean = text.trim()

  if (translationCache.has(clean)) {
    return translationCache.get(clean)!
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pl&dt=t&q=${encodeURIComponent(clean)}`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const data = await res.json()
      const translated = Array.isArray(data?.[0]) ? data[0].map((s: any) => s[0]).join('') : ''
      if (translated && typeof translated === 'string') {
        translationCache.set(clean, translated)
        return translated
      }
    }
  } catch (_) {
    // Network or timeout fallback
  }

  return clean
}

export function splitInstructionsIntoSteps(rawInstructions: string): string[] {
  if (!rawInstructions || !rawInstructions.trim()) return []

  // Clean and normalize line endings
  const clean = rawInstructions.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean)
  const mergedLines: string[] = []
  let current = ''

  for (const line of lines) {
    // If line is just a solitary step header like 'STEP 1' or 'Step 2:' without instructions
    if (/^(step\s*\d+[:.-]?|\d+[:.-])$/i.test(line)) {
      if (current) {
        mergedLines.push(current)
        current = ''
      }
      continue
    }
    // If line starts with 'STEP 1:' or '1. '
    if (/^(step\s*\d+[:.-]?|\d+[\.\)]\s+)/i.test(line)) {
      if (current) {
        mergedLines.push(current)
      }
      current = line
    } else {
      if (current) {
        current += ' ' + line
      } else {
        current = line
      }
    }
  }
  if (current) {
    mergedLines.push(current)
  }

  const cleanedSteps: string[] = []
  for (const s of mergedLines) {
    const sClean = s.replace(/^(step\s*\d+[:.-]?\s*|\d+[\.\)]\s*)/i, '').trim()
    if (sClean.length > 3) {
      cleanedSteps.push(sClean)
    }
  }

  if (cleanedSteps.length >= 2) {
    return cleanedSteps
  }

  // Fallback 1: inline numbered steps "1. ... 2. ..."
  const inlineNumbered = clean
    .split(/(?:^|\s+)(?:\d+[\.\)]|step\s+\d+[:.-]?)\s+/i)
    .map(s => s.trim())
    .filter(s => s.length > 10)

  if (inlineNumbered.length >= 2) {
    return inlineNumbered
  }

  // Fallback 2: split by sentences
  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9ĄĆĘŁŃÓŚŹŻ])/)
    .map(s => s.trim())
    .filter(s => s.length > 8)

  if (sentences.length >= 2) {
    return sentences
  }

  return [clean]
}

export async function translateRecipeInstructionsAsync(rawInstructions: string): Promise<{ instructionsPl: string; stepsPl: string[] }> {
  if (!rawInstructions) {
    return { instructionsPl: '', stepsPl: [] }
  }

  const rawSteps = splitInstructionsIntoSteps(rawInstructions)
  if (rawSteps.length === 0) {
    return { instructionsPl: '', stepsPl: [] }
  }

  const translatedSteps: string[] = []

  // Translate all steps without truncation
  try {
    const stepPromises = rawSteps.map(async (step) => {
      return await translateTextToPolish(step)
    })
    const results = await Promise.all(stepPromises)
    for (let i = 0; i < rawSteps.length; i++) {
      translatedSteps.push(results[i] || rawSteps[i])
    }
  } catch (_) {
    translatedSteps.length = 0
    translatedSteps.push(...rawSteps)
  }

  const instructionsPl = translatedSteps.join('\n\n')
  return {
    instructionsPl,
    stepsPl: translatedSteps
  }
}

export function normalizeMealDbItem(raw: any): MealRecipe {
  const ingredients: MealIngredient[] = []

  for (let i = 1; i <= 20; i++) {
    const ing = raw[`strIngredient${i}`]
    const measure = raw[`strMeasure${i}`]

    if (ing && typeof ing === 'string' && ing.trim()) {
      ingredients.push({
        name: translateIngredientName(ing.trim()),
        measure: measure && typeof measure === 'string' ? translateMeasurePl(measure.trim()) : ''
      })
    }
  }

  const rawTags = raw.strTags
  let tags: string[] = []
  if (rawTags && typeof rawTags === 'string') {
    tags = rawTags.split(',').map((t: string) => t.trim()).filter(Boolean)
  }

  const category = raw.strCategory || 'Inne'
  const area = raw.strArea || 'Międzynarodowa'
  const instructions = String(raw.strInstructions || '').replace(/\r\n/g, '\n')
  const rawTitle = String(raw.strMeal || 'Bez nazwy')
  const titlePl = formatMealTitlePl(rawTitle)

  return {
    id: String(raw.idMeal || ''),
    title: titlePl || rawTitle,
    titlePl: titlePl || rawTitle,
    originalTitle: rawTitle,
    category,
    categoryPl: translateCategoryToPl(category),
    area,
    areaPl: translateAreaToPl(area),
    instructions,
    instructionsSteps: splitInstructionsIntoSteps(instructions),
    thumbnail: String(raw.strMealThumb || ''),
    tags,
    youtubeUrl: raw.strYoutube ? String(raw.strYoutube) : null,
    sourceUrl: raw.strSource ? String(raw.strSource) : null,
    ingredients
  }
}

import STATIC_MEALS_CATALOG from './mealsCatalogData.json'

// ------------------------------------------------------------------
// FULL MEALS CATALOG (COMPLETE THEMEALDB 793-RECIPE CATALOG)
// ------------------------------------------------------------------
let cachedAllMealsCatalog: MealRecipe[] | null = null

export async function getAllMealsCatalog(): Promise<MealRecipe[]> {
  if (cachedAllMealsCatalog && cachedAllMealsCatalog.length > 0) {
    return cachedAllMealsCatalog
  }

  // Pre-compiled complete dataset with all 793 recipes from TheMealDB
  const catalog = (STATIC_MEALS_CATALOG as MealRecipe[]).map(m => {
    const titlePl = formatMealTitlePl(m.titlePl || m.title)
    return {
      ...m,
      title: titlePl || m.title,
      titlePl: titlePl || m.title,
      originalTitle: m.originalTitle || m.title
    }
  })

  cachedAllMealsCatalog = catalog
  return cachedAllMealsCatalog
}

