import { defineEventHandler } from 'h3'
import {
  MEAL_CATEGORY_TRANSLATIONS,
  MEAL_AREA_TRANSLATIONS
} from '../../utils/meals'

export default defineEventHandler(async () => {
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
})

