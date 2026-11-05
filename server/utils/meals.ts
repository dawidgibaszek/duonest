export interface MealIngredient {
  name: string
  measure: string
}

export interface MealRecipe {
  id: string
  title: string
  category: string
  categoryPl: string
  area: string
  areaPl: string
  instructions: string
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

export function normalizeMealDbItem(raw: any): MealRecipe {
  const ingredients: MealIngredient[] = []

  for (let i = 1; i <= 20; i++) {
    const ing = raw[`strIngredient${i}`]
    const measure = raw[`strMeasure${i}`]

    if (ing && typeof ing === 'string' && ing.trim()) {
      ingredients.push({
        name: ing.trim(),
        measure: measure && typeof measure === 'string' ? measure.trim() : ''
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

  return {
    id: String(raw.idMeal || ''),
    title: String(raw.strMeal || 'Bez nazwy'),
    category,
    categoryPl: translateCategoryToPl(category),
    area,
    areaPl: translateAreaToPl(area),
    instructions: String(raw.strInstructions || '').replace(/\r\n/g, '\n'),
    thumbnail: String(raw.strMealThumb || ''),
    tags,
    youtubeUrl: raw.strYoutube ? String(raw.strYoutube) : null,
    sourceUrl: raw.strSource ? String(raw.strSource) : null,
    ingredients
  }
}
