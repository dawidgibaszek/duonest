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

// Memory cache for translated instructions and recipes (capped at 1000 items)
const MAX_TRANSLATION_CACHE_SIZE = 1000
const translationCache = new Map<string, string>()

export async function translateTextToPolish(text: string): Promise<string> {
  if (!text || !text.trim()) return ''
  const clean = text.trim().slice(0, 2000)

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
        if (translationCache.size >= MAX_TRANSLATION_CACHE_SIZE) {
          const firstKey = translationCache.keys().next().value
          if (firstKey) translationCache.delete(firstKey)
        }
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

  const rawSteps = splitInstructionsIntoSteps(rawInstructions).slice(0, 35)
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

export interface SearchMealsOptions {
  searchQuery?: string
  category?: string
  area?: string
  isRandom?: boolean
  pageNum?: number
  limitNum?: number
}

export async function searchMealsCatalog(options: SearchMealsOptions) {
  const searchQuery = String(options.searchQuery || '').trim()
  const category = String(options.category || '').trim()
  const area = String(options.area || '').trim()
  const isRandom = Boolean(options.isRandom)
  const pageNum = Math.max(1, parseInt(String(options.pageNum || 1), 10) || 1)
  const limitNum = Math.max(1, Math.min(100, parseInt(String(options.limitNum || 24), 10) || 24))

  // 1. RANDOM MEAL GENERATOR
  if (isRandom) {
    try {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      })
      if (response.ok) {
        const data = await response.json()
        const rawMeals = Array.isArray(data?.meals) ? data.meals : []
        if (rawMeals.length > 0) {
          const meals: MealRecipe[] = rawMeals.map(normalizeMealDbItem)
          if (meals[0]?.instructions) {
            try {
              const trans = await translateRecipeInstructionsAsync(meals[0].instructions)
              if (trans.instructionsPl) {
                meals[0].instructions = trans.instructionsPl
                meals[0].instructionsSteps = trans.stepsPl
              }
            } catch (_) {}
          }
          return {
            success: true,
            meals,
            pagination: { page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
          }
        }
      }
    } catch (_) {}

    // Fallback: pick a random meal from our static catalog of 793 recipes
    const catalog = await getAllMealsCatalog()
    if (catalog.length > 0) {
      const randomIndex = Math.floor(Math.random() * catalog.length)
      const randomMeal = catalog[randomIndex]
      return {
        success: true,
        meals: [randomMeal],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      }
    }
  }

  // 2. FULL CATALOG QUERY WITH CATEGORIES, CUISINES, SEARCH & PAGINATION
  const allCatalog = await getAllMealsCatalog()
  let filtered = allCatalog

  // A. Filter by Category
  if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'wszystkie') {
    const lowerCat = category.toLowerCase()
    const SEMANTIC_KEYWORDS: Record<string, string[]> = {
      pasta: ['makaron', 'spaghetti', 'linguine', 'penne', 'lasagne', 'lasagna', 'noodle', 'fettuccine', 'cannelloni', 'rotolo', 'udon', 'lo mein', 'chow fun', 'pad thai', 'ramen', 'macaroni', 'mac and cheese', 'fideuà'],
      breakfast: ['śniadani', 'pancake', 'naleśnik', 'omlet', 'omelette', 'szakszuka', 'shakshuka', 'jajka', 'egg', 'tost', 'toast', 'chałka', 'porridge', 'owsianka', 'gohan', 'frittata'],
      side: ['soup', 'zupa', 'chłodnik', 'krem', 'rosół', 'barszcz', 'bulion', 'broth', 'chowder', 'bisque', 'ramen', 'pho'],
      soup: ['soup', 'zupa', 'chłodnik', 'krem', 'rosół', 'barszcz', 'bulion', 'broth', 'chowder', 'bisque', 'ramen', 'pho', 'goulash', 'gulasz', 'stew', 'czorba', 'chorba'],
      chicken: ['kurczak', 'chicken', 'indyk', 'turkey', 'kaczka', 'duck'],
      beef: ['wołowina', 'beef', 'stek', 'steak', 'burger', 'polędwica'],
      pork: ['wieprzowina', 'pork', 'boczek', 'bacon', 'szynka', 'ham', 'schab', 'kiełbas', 'sausage', 'chorizo'],
      seafood: ['ryba', 'fish', 'łosoś', 'salmon', 'krewetk', 'prawn', 'shrimp', 'tuńczyk', 'tuna', 'kalmar', 'squid', 'małże', 'mussels', 'dorsz', 'cod', 'okoń', 'bass'],
      vegetarian: ['wegetariańsk', 'tofu', 'hummus', 'falafel', 'bakłażan', 'aubergine', 'eggplant', 'cukinia', 'zucchini', 'dynia', 'pumpkin', 'fasola', 'bean', 'ciecierzyca', 'chickpea', 'soczewica', 'lentil'],
      vegan: ['wegańsk', 'vegan', 'tofu', 'hummus', 'falafel', 'ratatouille', 'fasolka', 'açaí']
    }
    const extraKeywords = SEMANTIC_KEYWORDS[lowerCat] || []

    filtered = filtered.filter(m => {
      const matchesCategory =
        m.category.toLowerCase() === lowerCat ||
        m.categoryPl.toLowerCase() === lowerCat
      if (matchesCategory) return true

      if (extraKeywords.length > 0) {
        const combined = `${m.title} ${m.originalTitle || ''} ${m.category}`.toLowerCase()
        return extraKeywords.some(kw => combined.includes(kw))
      }
      return false
    })
  }

  // B. Filter by Area / Cuisine
  if (area && area.toLowerCase() !== 'all' && area.toLowerCase() !== 'wszystkie') {
    const lowerArea = area.toLowerCase()
    if (lowerArea === 'asian' || lowerArea === 'azjatycka') {
      const asianAreas = ['chinese', 'japanese', 'thai', 'vietnamese', 'malaysian', 'filipino']
      filtered = filtered.filter(m => asianAreas.includes(m.area.toLowerCase()))
    } else {
      filtered = filtered.filter(m =>
        m.area.toLowerCase() === lowerArea ||
        m.areaPl.toLowerCase() === lowerArea
      )
    }
  }

  // C. Multi-Word Search Query
  if (searchQuery) {
    const qLower = searchQuery.toLowerCase().trim()
    const searchWords = qLower.split(/\s+/).filter(Boolean)

    filtered = filtered.filter(m => {
      const title = m.title.toLowerCase()
      const titlePl = (m.titlePl || '').toLowerCase()
      const origTitle = (m.originalTitle || '').toLowerCase()
      const cat = m.category.toLowerCase()
      const catPl = m.categoryPl.toLowerCase()
      const ar = m.area.toLowerCase()
      const arPl = m.areaPl.toLowerCase()
      const combined = `${title} ${titlePl} ${origTitle} ${cat} ${catPl} ${ar} ${arPl}`

      return searchWords.every(word => {
        const enTerm = POLISH_TO_ENGLISH_SEARCH[word] || word
        return combined.includes(word) || combined.includes(enTerm)
      })
    })
  }

  // D. Pagination Calculation
  const total = filtered.length
  const totalPages = Math.ceil(total / limitNum) || 1
  const currentPage = Math.min(pageNum, totalPages)
  const startIndex = (currentPage - 1) * limitNum
  const paginatedMeals = filtered.slice(startIndex, startIndex + limitNum)

  return {
    success: true,
    meals: paginatedMeals,
    pagination: {
      page: currentPage,
      limit: limitNum,
      total,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    }
  }
}

export async function lookupMealById(id: string) {
  if (!id) {
    return { success: false, error: 'MISSING_ID', meal: null }
  }

  // 1. First check our pre-compiled rich catalog
  const catalog = await getAllMealsCatalog()
  const foundInCatalog = catalog.find(m => String(m.id) === id)
  if (foundInCatalog) {
    const isEn = /\b(the|and|with|heat|oven|into|minutes)\b/i.test(foundInCatalog.instructions || '')
    if (isEn && !foundInCatalog.instructionsPl) {
      try {
        const transResult = await translateRecipeInstructionsAsync(foundInCatalog.instructions)
        if (transResult.instructionsPl) {
          foundInCatalog.instructions = transResult.instructionsPl
          foundInCatalog.instructionsPl = transResult.instructionsPl
          foundInCatalog.instructionsSteps = transResult.stepsPl
          foundInCatalog.instructionsStepsPl = transResult.stepsPl
        }
      } catch (_) {}
    }
    return { success: true, meal: foundInCatalog }
  }

  // 2. Fallback to live TheMealDB API
  try {
    const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) })
    if (!response.ok) {
      return { success: false, error: `HTTP_${response.status}`, meal: null }
    }

    const data = await response.json()
    const rawMeals = Array.isArray(data?.meals) ? data.meals : []
    if (rawMeals.length === 0) {
      return { success: false, error: 'NOT_FOUND', meal: null }
    }

    const meal = normalizeMealDbItem(rawMeals[0])

    try {
      const transResult = await translateRecipeInstructionsAsync(meal.instructions)
      if (transResult.instructionsPl) {
        meal.instructions = transResult.instructionsPl
        meal.instructionsSteps = transResult.stepsPl
      }
    } catch (_) {}

    return { success: true, meal }
  } catch (err: any) {
    return { success: false, error: err?.message || 'SERVER_ERROR', meal: null }
  }
}

export function getMealCategoriesAndAreas() {
  const categories = [
    { key: 'all', label: 'Wszystkie' },
    { key: 'Pasta', label: 'Makarony' },
    { key: 'Chicken', label: 'Drób & Kurczak' },
    { key: 'Beef', label: 'Wołowina' },
    { key: 'Pork', label: 'Wieprzowina' },
    { key: 'Seafood', label: 'Ryby & Owoce morza' },
    { key: 'Vegetarian', label: 'Wegetariańskie' },
    { key: 'Vegan', label: 'Wegańskie' },
    { key: 'Side', label: 'Dodatki & Zupy' },
    { key: 'Dessert', label: 'Desery' }
  ]

  const areas = [
    { key: 'all', label: 'Wszystkie kuchnie' },
    { key: 'Italian', label: 'Włoska' },
    { key: 'Mexican', label: 'Meksykańska' },
    { key: 'Asian', label: 'Azjatycka (Japonia / Chiny)' },
    { key: 'American', label: 'Amerykańska' },
    { key: 'French', label: 'Francuska' },
    { key: 'Greek', label: 'Grecka / Śródziemnomorska' },
    { key: 'Spanish', label: 'Hiszpańska' },
    { key: 'Polish', label: 'Polska' },
    { key: 'Indian', label: 'Indyjska' }
  ]

  return {
    success: true,
    categories,
    areas
  }
}

