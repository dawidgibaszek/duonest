export interface Profile {
  id: string
  email: string | null
  name: string
  avatar_url?: string | null
  avatar_color?: string | null
  pairing_code: string
  partnership_id?: string | null
  current_mood?: string | null
  mood_note?: string | null
  mood_updated_at?: string | null
  love_note?: string | null
  favorite_drink?: string | null
  favorite_treat?: string | null
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
  pet_id?: string
  pet_name?: string
  pet_xp?: number
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
  description: string
  required_level: number
  is_unlocked: boolean
  is_claimed: boolean
  claimed_at?: string | null
  claimed_by?: string | null
  reward_text: string
  icon: string
  created_at?: string
}

export interface WishlistItem {
  id: string
  partnership_id: string
  title: string
  description?: string | null
  link_url?: string | null
  image_url?: string | null
  price_estimate?: string | null
  priority: 'low' | 'medium' | 'high'
  category?: string
  is_surprise: boolean
  is_completed: boolean
  is_visible_to_partner: boolean
  created_by: string
  created_at: string
  completed_at?: string | null
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
  amount?: string
  unit?: string
}

export interface MealItem {
  id: string
  partnership_id: string
  title: string
  description?: string | null
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'
  date: string
  recipe_url?: string | null
  image_url?: string | null
  ingredients: MealIngredient[]
  is_completed: boolean
  created_by: string
  created_at: string
  is_favorite?: boolean
  is_saved_recipe?: boolean
}

export interface SavingsGoal {
  id: string
  partnership_id: string
  title: string
  description?: string | null
  target_amount: number
  current_amount: number
  target_date?: string | null
  category: 'trip' | 'home' | 'wedding' | 'emergency' | 'entertainment' | 'other'
  icon?: string
  color?: string
  is_completed: boolean
  created_by: string
  created_at: string
  updated_at?: string
}

export interface SavingsContribution {
  id: string
  goal_id: string
  partnership_id: string
  amount: number
  note?: string | null
  contributed_by: string
  created_at: string
}

export interface DuoDoodleStroke {
  points: number[]
  color: string
  size: number
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
