import type { DuoFeature, NestCard, OnboardingStage } from '~/utils/duoPersonalization'
import type { PetCareState } from '~/functions/src/petCare'

export interface Profile {
  id: string
  email: string | null
  name: string
  avatar_url?: string | null
  has_avatar?: boolean
  avatar_updated_at?: string | null
  avatar_color?: string | null
  pairing_code: string
  partnership_id?: string | null
  current_mood?: string | null
  mood_note?: string | null
  mood_updated_at?: string | null
  love_note?: string | null
  gender?: string | null
  grammatical_gender?: string | null
  enabled_features?: DuoFeature[]
  nest_cards?: NestCard[]
  onboarding_stage?: OnboardingStage
  onboarding_partnership_id?: string
  show_location_widget?: boolean
  points?: number
  last_seen_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  auth_user_id?: string | null
  is_email_verified?: boolean
}

export interface Partnership {
  id: string
  partner1_id: string
  partner2_id: string
  nest_name: string
  nest_level: number
  anniversary_date?: string | null
  pet_name?: string | null
  pet_fur?: 'cream' | 'white'
  pet_headwear?: 'beret' | 'plum_snapback' | null
  pet_eyewear?: 'smoke_shades' | null
  pet_neckwear?: 'gold_chain' | null
  pet_care?: PetCareState
  created_at: string
}

export interface ShoppingItem {
  id: string
  partnership_id: string
  title: string
  category: string
  quantity?: string | null
  is_completed: boolean
  added_by?: string | null
  completed_by?: string | null
  created_at: string
}

export interface TaskItem {
  id: string
  partnership_id: string
  title: string
  description?: string | null
  assigned_to?: string | null
  due_date?: string | null
  is_recurring: boolean
  recurrence_interval?: string | null
  is_completed: boolean
  completed_at?: string | null
  points: number
  points_awarded?: number
  created_by?: string | null
  completed_by?: string | null
  created_at: string
}

export interface EventItem {
  id: string
  partnership_id: string
  title: string
  description?: string | null
  location?: string | null
  start_time: string
  end_time?: string | null
  category: 'date' | 'trip' | 'home' | 'anniversary' | 'work' | 'other'
  is_completed?: boolean
  completed_at?: string | null
  completed_by?: string | null
  points_awarded?: number
  is_surprise?: boolean
  planner_name?: string | null
  created_by?: string | null
  created_at: string
}

export interface NudgeItem {
  id: string
  partnership_id: string
  sender_id: string
  receiver_id: string
  nudge_type: string
  message?: string | null
  created_at: string
}

export interface NestMilestone {
  id: string
  partnership_id?: string
  title: string
  description?: string
  target_points: number
  assigned_to?: string | null
  is_completed: boolean
  completed_at?: string | null
  created_by?: string | null
  created_at: string
}

export interface WishlistItem {
  id: string
  partnership_id: string
  created_by: string
  for_user_id: string | null // null = Wspólne marzenie, lub user.id
  title: string
  url?: string | null
  image_url?: string | null
  price?: string | null
  currency?: string | null
  site_name?: string | null
  note?: string | null
  is_visible_to_partner: boolean // jeśli false, partner nie widzi (pomysł na prezent niespodziankę)
  is_completed: boolean
  completed_at?: string | null
  created_at: string
  link_url?: string | null
  price_estimate?: string | null
  description?: string | null
}

export interface MovieReview {
  user_id?: string
  author_name?: string
  rating: number
  comment?: string | null
  reviewed_at?: string
  updated_at?: string
}

export interface MovieItem {
  id: string
  partnership_id: string
  tmdb_id?: number | null
  title: string
  original_title?: string | null
  media_type?: 'movie' | 'tv' | 'anime'
  poster_path?: string | null
  backdrop_path?: string | null
  release_year?: string | null
  genres?: string[] | null
  overview?: string | null
  vote_average?: number | null
  status: 'planned' | 'watching' | 'watched'
  target_date?: string | null
  added_by?: string | null
  watched_at?: string | null
  reviews?: Record<string, MovieReview>
  last_watched_season?: number | null
  last_watched_episode?: number | null
  created_at: string
  updated_at?: string
  // Legacy / aliases
  year?: number | null
  genre?: string | null
  poster_url?: string | null
  description?: string | null
  runtime_minutes?: number | null
  streaming_platform?: string | null
  watch_progress_minutes?: number
  last_watched_at?: string | null
}

export interface MealIngredient {
  name: string
  measure?: string
  amount?: string
  unit?: string
  is_in_shopping_list?: boolean
}

export interface MealItem {
  id: string
  partnership_id: string
  date: string // 'YYYY-MM-DD' or '' for cookbook-only
  day_name?: string
  title: string
  category?: string
  area?: string
  cook_id?: string // 'me' | 'partner' | 'both' | 'restaurant' | 'takeout' | user_id
  image_url?: string
  source?: 'custom' | 'api' | 'import'
  api_id?: string
  ingredients?: MealIngredient[]
  instructions?: string
  youtube_url?: string
  recipe_url?: string
  is_completed: boolean
  completed_at?: string | null
  created_by?: string
  created_at: string
  updated_at?: string
  titlePl?: string
  is_saved_recipe?: boolean
  description?: string | null
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'
}

export interface SavingsGoal {
  id: string
  partnership_id: string
  title: string
  category: 'travel' | 'home' | 'gadget' | 'date' | 'emergency' | 'other'
  target_amount: number
  current_amount: number
  currency: string
  target_date?: string | null
  icon?: string
  color?: string
  is_completed: boolean
  completed_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at?: string
}

export interface SavingsContribution {
  id: string
  goal_id: string
  partnership_id: string
  user_id: string | null
  amount: number
  note?: string | null
  created_at: string
}

export interface DuoDoodleStroke {
  id?: string
  points: number[]
  color: string
  width: number
  isEraser?: boolean
}

export interface DuoDoodle {
  id: string
  partnership_id: string
  strokes: DuoDoodleStroke[]
  preview_svg?: string
  author_id: string
  author_name: string
  created_at: string
  updated_at: string
}

export type ToastType =
  | 'success'
  | 'love'
  | 'points'
  | 'calendar'
  | 'shopping'
  | 'tasks'
  | 'meals'
  | 'movies'
  | 'mood'
  | 'wishlist'
  | 'savings'
  | 'info'
  | 'warning'

export interface DuoToastItem {
  id: string
  title: string
  message: string
  type: ToastType
  category?: string
  duration?: number
}
