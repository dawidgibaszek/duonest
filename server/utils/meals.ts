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
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 480))}&langpair=en|pl`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4500) })
    if (res.ok) {
      const data = await res.json()
      const translated = data?.responseData?.translatedText
      if (translated && typeof translated === 'string' && !translated.includes('MYMEMORY WARNING')) {
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
  if (!rawInstructions) return []

  // Clean line endings
  const clean = rawInstructions.replace(/\r\n/g, '\n').trim()

  // First check if there are paragraphs separated by double newlines or single newlines
  const paragraphs = clean.split(/\n+/).map(p => p.trim()).filter(p => p.length > 5)

  if (paragraphs.length >= 2) {
    return paragraphs.map(p => p.replace(/^(step\s*\d+[:.]?|\d+[\.\)]\s*)/i, '').trim())
  }

  // If only 1 long block of text, split by sentence endings
  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9ĄĆĘŁŃÓŚŹŻ])/)
    .map(s => s.trim())
    .filter(s => s.length > 10)

  if (sentences.length > 1) {
    return sentences.map(s => s.replace(/^(step\s*\d+[:.]?|\d+[\.\)]\s*)/i, '').trim())
  }

  return [clean]
}

export async function translateRecipeInstructionsAsync(rawInstructions: string): Promise<{ instructionsPl: string; stepsPl: string[] }> {
  if (!rawInstructions) {
    return { instructionsPl: '', stepsPl: [] }
  }

  const rawSteps = splitInstructionsIntoSteps(rawInstructions)
  const translatedSteps: string[] = []

  // Translate up to 10 steps in parallel
  const stepPromises = rawSteps.slice(0, 12).map(async (step) => {
    return await translateTextToPolish(step)
  })

  try {
    const results = await Promise.all(stepPromises)
    for (let i = 0; i < results.length; i++) {
      translatedSteps.push(results[i] || rawSteps[i])
    }
  } catch (_) {
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
    title: rawTitle,
    titlePl,
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

// ------------------------------------------------------------------
// FULL MEALS CATALOG CACHE (793 RECIPES ACROSS ALL CATEGORIES)
// ------------------------------------------------------------------
let cachedAllMealsCatalog: MealRecipe[] | null = null
let catalogLastFetched = 0
const CATALOG_TTL = 1000 * 60 * 60 * 24 // 24 hours

export async function getAllMealsCatalog(): Promise<MealRecipe[]> {
  const now = Date.now()
  if (cachedAllMealsCatalog && cachedAllMealsCatalog.length > 0 && now - catalogLastFetched < CATALOG_TTL) {
    return cachedAllMealsCatalog
  }

  const categories = [
    'Beef', 'Breakfast', 'Chicken', 'Dessert', 'Goat', 'Lamb',
    'Miscellaneous', 'Pasta', 'Pork', 'Seafood', 'Side', 'Starter',
    'Vegan', 'Vegetarian'
  ]

  const areasToTag = [
    'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Spanish',
    'Greek', 'British', 'French', 'Vietnamese', 'Malaysian', 'Filipino'
  ]

  try {
    const areaPromises = areasToTag.map(async (a) => {
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(a)}`, {
          signal: AbortSignal.timeout(4500)
        })
        const data = await res.json()
        return {
          area: a,
          ids: new Set<string>((data.meals || []).map((m: any) => String(m.idMeal)))
        }
      } catch (_) {
        return { area: a, ids: new Set<string>() }
      }
    })

    const catPromises = categories.map(async (c) => {
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(c)}`, {
          signal: AbortSignal.timeout(6000)
        })
        const data = await res.json()
        return (data.meals || []).map((m: any) => ({ ...m, category: c }))
      } catch (_) {
        return []
      }
    })

    const [catResults, areaResults] = await Promise.all([
      Promise.all(catPromises),
      Promise.all(areaPromises)
    ])

    const areaLookup = new Map<string, string>()
    for (const ar of areaResults) {
      for (const id of ar.ids) {
        areaLookup.set(id, ar.area)
      }
    }

    const flatMeals = catResults.flat()
    const map = new Map<string, MealRecipe>()

    for (const m of flatMeals) {
      const id = String(m.idMeal || '')
      if (!id || map.has(id)) continue

      const area = areaLookup.get(id) || 'Międzynarodowa'
      const category = m.category || 'Inne'
      const rawTitle = String(m.strMeal || 'Bez nazwy')
      const titlePl = formatMealTitlePl(rawTitle)

      map.set(id, {
        id,
        title: rawTitle,
        titlePl,
        category,
        categoryPl: translateCategoryToPl(category),
        area,
        areaPl: translateAreaToPl(area),
        instructions: '',
        thumbnail: String(m.strMealThumb || ''),
        tags: [],
        youtubeUrl: null,
        sourceUrl: null,
        ingredients: []
      })
    }

    cachedAllMealsCatalog = Array.from(map.values())
    catalogLastFetched = now
    return cachedAllMealsCatalog
  } catch (err) {
    console.warn('Failed to build meals catalog:', err)
    return cachedAllMealsCatalog || []
  }
}

