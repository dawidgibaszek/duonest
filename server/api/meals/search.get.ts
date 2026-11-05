import { defineEventHandler, getQuery } from 'h3'
import {
  normalizeMealDbItem,
  translateRecipeInstructionsAsync,
  getAllMealsCatalog,
  POLISH_TO_ENGLISH_SEARCH,
  type MealRecipe
} from '../../utils/meals'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = String(query.q || query.query || query.s || '').trim()
  const category = String(query.category || query.c || '').trim()
  const area = String(query.area || query.a || '').trim()
  const isRandom = query.random === 'true' || query.random === '1'
  const pageNum = Math.max(1, parseInt(String(query.page || 1), 10) || 1)
  const limitNum = Math.max(1, Math.min(100, parseInt(String(query.limit || 24), 10) || 24))

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
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      }
    }

    // 2. FULL CATALOG QUERY WITH CATEGORIES, CUISINES, SEARCH & PAGINATION
    const allCatalog = await getAllMealsCatalog()
    let filtered = allCatalog

    // A. Filter by Category
    if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'wszystkie') {
      const lowerCat = category.toLowerCase()
      filtered = filtered.filter(m =>
        m.category.toLowerCase() === lowerCat ||
        m.categoryPl.toLowerCase() === lowerCat
      )
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

    // C. Filter by Search Query
    if (searchQuery) {
      const qLower = searchQuery.toLowerCase()
      const enTerm = POLISH_TO_ENGLISH_SEARCH[qLower] || qLower

      filtered = filtered.filter(m => {
        const title = m.title.toLowerCase()
        const titlePl = (m.titlePl || '').toLowerCase()
        const cat = m.category.toLowerCase()
        const catPl = m.categoryPl.toLowerCase()
        const ar = m.area.toLowerCase()
        const arPl = m.areaPl.toLowerCase()

        return (
          title.includes(qLower) ||
          title.includes(enTerm) ||
          titlePl.includes(qLower) ||
          cat.includes(qLower) ||
          cat.includes(enTerm) ||
          catPl.includes(qLower) ||
          ar.includes(qLower) ||
          ar.includes(enTerm) ||
          arPl.includes(qLower)
        )
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
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'SERVER_ERROR',
      meals: [],
      pagination: {
        page: 1,
        limit: limitNum,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }
  }
})
