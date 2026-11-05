import { defineEventHandler } from 'h3'
import { getMealCategoriesAndAreas } from '../../utils/meals'

export default defineEventHandler(async () => {
  return getMealCategoriesAndAreas()
})
