export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string
          avatar_url: string | null
          pairing_code: string
          partnership_id: string | null
          current_mood: string | null
          mood_note: string | null
          mood_updated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string
          avatar_url?: string | null
          pairing_code: string
          partnership_id?: string | null
          current_mood?: string | null
          mood_note?: string | null
          mood_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string
          avatar_url?: string | null
          pairing_code?: string
          partnership_id?: string | null
          current_mood?: string | null
          mood_note?: string | null
          mood_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      partnerships: {
        Row: {
          id: string
          partner1_id: string
          partner2_id: string
          nest_name: string
          nest_level: number
          nest_points: number
          anniversary_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partner1_id: string
          partner2_id: string
          nest_name?: string
          nest_level?: number
          nest_points?: number
          anniversary_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partner1_id?: string
          partner2_id?: string
          nest_name?: string
          nest_level?: number
          nest_points?: number
          anniversary_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shopping_items: {
        Row: {
          id: string
          partnership_id: string
          title: string
          category: string
          quantity: string | null
          is_completed: boolean
          added_by: string | null
          completed_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          partnership_id: string
          title: string
          category?: string
          quantity?: string | null
          is_completed?: boolean
          added_by?: string | null
          completed_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          partnership_id?: string
          title?: string
          category?: string
          quantity?: string | null
          is_completed?: boolean
          added_by?: string | null
          completed_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          partnership_id: string
          title: string
          description: string | null
          assigned_to: string | null
          due_date: string | null
          is_recurring: boolean
          recurrence_interval: string | null
          is_completed: boolean
          points: number
          created_by: string | null
          completed_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          partnership_id: string
          title: string
          description?: string | null
          assigned_to?: string | null
          due_date?: string | null
          is_recurring?: boolean
          recurrence_interval?: string | null
          is_completed?: boolean
          points?: number
          created_by?: string | null
          completed_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          partnership_id?: string
          title?: string
          description?: string | null
          assigned_to?: string | null
          due_date?: string | null
          is_recurring?: boolean
          recurrence_interval?: string | null
          is_completed?: boolean
          points?: number
          created_by?: string | null
          completed_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          partnership_id: string
          title: string
          description: string | null
          location: string | null
          start_time: string
          end_time: string | null
          category: string
          is_completed: boolean
          is_surprise: boolean
          planner_name: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partnership_id: string
          title: string
          description?: string | null
          location?: string | null
          start_time: string
          end_time?: string | null
          category?: string
          is_completed?: boolean
          is_surprise?: boolean
          planner_name?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partnership_id?: string
          title?: string
          description?: string | null
          location?: string | null
          start_time?: string
          end_time?: string | null
          category?: string
          is_completed?: boolean
          is_surprise?: boolean
          planner_name?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      mood_logs: {
        Row: {
          id: string
          partnership_id: string
          user_id: string
          mood: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partnership_id: string
          user_id: string
          mood: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partnership_id?: string
          user_id?: string
          mood?: string
          note?: string | null
          created_at?: string
        }
      }
      nudges: {
        Row: {
          id: string
          partnership_id: string
          sender_id: string
          receiver_id: string
          nudge_type: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partnership_id: string
          sender_id: string
          receiver_id: string
          nudge_type: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partnership_id?: string
          sender_id?: string
          receiver_id?: string
          nudge_type?: string
          message?: string | null
          created_at?: string
        }
      }
    }
  }
}
