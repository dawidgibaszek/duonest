import { defineEventHandler, getQuery } from 'h3'
import {
  normalizeMealDbItem,
  POLISH_TO_ENGLISH_SEARCH,
  translateCategoryToPl,
  translateAreaToPl,
  type MealRecipe
} from '../../utils/meals'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = String(query.q || query.query || query.s || '').trim()
  const category = String(query.category || query.c || '').trim()
  const area = String(query.area || query.a || '').trim()
  const isRandom = query.random === 'true' || query.random === '1'

  try {
    // 1. RANDOM MEAL GENERATOR
    if (isRandom) {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php', {
        headers: { 'Accept': 'application/json' }
      })
      if (!response.ok) {
        return { success: false, error: 'API_ERROR', meals: [] }
      }
      const data = await response.json()
      const rawMeals = Array.isArray(data?.meals) ? data.meals : []
      const meals: MealRecipe[] = rawMeals.map(normalizeMealDbItem)
      return { success: true, meals }
    }

    // 2. FILTER BY CATEGORY
    if (category && category !== 'all' && category !== 'Wszystkie') {
      const url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!response.ok) return { success: false, error: 'API_ERROR', meals: [] }
      const data = await response.json()
      const rawMeals = Array.isArray(data?.meals) ? data.meals : []
      const meals = rawMeals.slice(0, 30).map((raw: any) => ({
        id: String(raw.idMeal || ''),
        title: String(raw.strMeal || ''),
        category,
        categoryPl: translateCategoryToPl(category),
        area: '',
        areaPl: 'Międzynarodowa',
        instructions: '',
        thumbnail: String(raw.strMealThumb || ''),
        tags: [],
        youtubeUrl: null,
        sourceUrl: null,
        ingredients: []
      }))
      return { success: true, meals }
    }

    // 3. FILTER BY AREA / CUISINE
    if (area && area !== 'all' && area !== 'Wszystkie') {
      const url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!response.ok) return { success: false, error: 'API_ERROR', meals: [] }
      const data = await response.json()
      const rawMeals = Array.isArray(data?.meals) ? data.meals : []
      const meals = rawMeals.slice(0, 30).map((raw: any) => ({
        id: String(raw.idMeal || ''),
        title: String(raw.strMeal || ''),
        category: '',
        categoryPl: 'Inne',
        area,
        areaPl: translateAreaToPl(area),
        instructions: '',
        thumbnail: String(raw.strMealThumb || ''),
        tags: [],
        youtubeUrl: null,
        sourceUrl: null,
        ingredients: []
      }))
      return { success: true, meals }
    }

    // 4. TEXT SEARCH (with Polish word translation fallback)
    let searchTerm = searchQuery
    if (!searchTerm) {
      // Default initial catalog
      searchTerm = 'chicken'
    } else {
      const lower = searchTerm.toLowerCase()
      if (POLISH_TO_ENGLISH_SEARCH[lower]) {
        searchTerm = POLISH_TO_ENGLISH_SEARCH[lower]
      }
    }

    let url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`
    let response = await fetch(url, { headers: { 'Accept': 'application/json' } })
    let data = response.ok ? await response.json() : null

    // If translated or original produced no result, try original query if it differed
    if ((!data || !data.meals) && searchTerm !== searchQuery && searchQuery) {
      url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchQuery)}`
      response = await fetch(url, { headers: { 'Accept': 'application/json' } })
      data = response.ok ? await response.json() : null
    }

    const rawMeals = Array.isArray(data?.meals) ? data.meals : []
    const meals: MealRecipe[] = rawMeals.slice(0, 30).map(normalizeMealDbItem)

    return { success: true, meals }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'SERVER_ERROR',
      meals: []
    }
  }
})

