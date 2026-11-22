export const featureEvents = {
  duo_doodle_saved: 'Zapisano wspólny rysunek',
  duo_task_added: 'Dodano zadanie',
  duo_task_completed: 'Ukończono zadanie',
  duo_pet_created: 'Zaopiekowano się pupilem',
  duo_shopping_added: 'Dodano produkt do zakupów',
  duo_meal_planned: 'Zaplanowano obiad',
  duo_recipe_saved: 'Zapisano przepis',
  duo_movie_added: 'Dodano film lub serial',
  duo_wish_added: 'Dodano życzenie',
  duo_gesture_sent: 'Wysłano gest',
  duo_mood_saved: 'Zapisano nastrój',
  duo_calendar_added: 'Dodano wydarzenie',
  duo_savings_created: 'Utworzono skarbonkę'
} as const

export type FeatureEvent = keyof typeof featureEvents
export type OnboardingEvent = 'duo_signup' | 'duo_account_ready' | 'duo_email_verified' | 'duo_paired'
