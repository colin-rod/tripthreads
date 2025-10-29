/**
 * Database Types for TripThreads
 *
 * These types are manually defined based on the database schema.
 * In production, generate these automatically using:
 *
 * supabase gen types typescript --local > packages/shared/types/database.ts
 *
 * or
 *
 * npm run generate-types
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          plan: 'free' | 'pro'
          plan_expires_at: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          plan?: 'free' | 'pro'
          plan_expires_at?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          plan?: 'free' | 'pro'
          plan_expires_at?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          owner_id: string
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          owner_id: string
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          owner_id?: string
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trip_participants: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          role: 'owner' | 'participant' | 'viewer'
          joined_at: string
          invited_by: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          role?: 'owner' | 'participant' | 'viewer'
          joined_at?: string
          invited_by: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string
          role?: 'owner' | 'participant' | 'viewer'
          joined_at?: string
          invited_by?: string
          created_at?: string
        }
      }
      itinerary_items: {
        Row: {
          id: string
          trip_id: string
          type: 'flight' | 'stay' | 'activity'
          title: string
          description: string | null
          start_time: string
          end_time: string | null
          location: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          type: 'flight' | 'stay' | 'activity'
          title: string
          description?: string | null
          start_time: string
          end_time?: string | null
          location?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          type?: 'flight' | 'stay' | 'activity'
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string | null
          location?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          trip_id: string
          description: string
          amount: number
          currency: string
          category: 'food' | 'transport' | 'accommodation' | 'activity' | 'other'
          payer_id: string
          date: string
          receipt_url: string | null
          fx_rate: number | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          description: string
          amount: number
          currency?: string
          category?: 'food' | 'transport' | 'accommodation' | 'activity' | 'other'
          payer_id: string
          date?: string
          receipt_url?: string | null
          fx_rate?: number | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          description?: string
          amount?: number
          currency?: string
          category?: 'food' | 'transport' | 'accommodation' | 'activity' | 'other'
          payer_id?: string
          date?: string
          receipt_url?: string | null
          fx_rate?: number | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      expense_participants: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          share_amount: number
          share_type: 'equal' | 'percentage' | 'amount'
          share_value: number | null
          created_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          share_amount: number
          share_type?: 'equal' | 'percentage' | 'amount'
          share_value?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          share_amount?: number
          share_type?: 'equal' | 'percentage' | 'amount'
          share_value?: number | null
          created_at?: string
        }
      }
      media_files: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          type: 'photo' | 'video'
          url: string
          thumbnail_url: string | null
          caption: string | null
          date_taken: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          type: 'photo' | 'video'
          url: string
          thumbnail_url?: string | null
          caption?: string | null
          date_taken: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string
          type?: 'photo' | 'video'
          url?: string
          thumbnail_url?: string | null
          caption?: string | null
          date_taken?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_trip_join_date: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: string
      }
      can_user_see_item: {
        Args: { p_item_date: string; p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Trip = Database['public']['Tables']['trips']['Row']
export type TripInsert = Database['public']['Tables']['trips']['Insert']
export type TripUpdate = Database['public']['Tables']['trips']['Update']

export type TripParticipant = Database['public']['Tables']['trip_participants']['Row']
export type TripParticipantInsert = Database['public']['Tables']['trip_participants']['Insert']
export type TripParticipantUpdate = Database['public']['Tables']['trip_participants']['Update']

export type ItineraryItem = Database['public']['Tables']['itinerary_items']['Row']
export type ItineraryItemInsert = Database['public']['Tables']['itinerary_items']['Insert']
export type ItineraryItemUpdate = Database['public']['Tables']['itinerary_items']['Update']

export type Expense = Database['public']['Tables']['expenses']['Row']
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

export type ExpenseParticipant = Database['public']['Tables']['expense_participants']['Row']
export type ExpenseParticipantInsert =
  Database['public']['Tables']['expense_participants']['Insert']
export type ExpenseParticipantUpdate =
  Database['public']['Tables']['expense_participants']['Update']

export type MediaFile = Database['public']['Tables']['media_files']['Row']
export type MediaFileInsert = Database['public']['Tables']['media_files']['Insert']
export type MediaFileUpdate = Database['public']['Tables']['media_files']['Update']

// Extended types with relationships
export type TripWithParticipants = Trip & {
  participants: (TripParticipant & {
    user: User
  })[]
}

export type TripWithOwner = Trip & {
  owner: User
}

export type ExpenseWithParticipants = Expense & {
  payer: User
  participants: (ExpenseParticipant & {
    user: User
  })[]
}

export type ItineraryItemWithCreator = ItineraryItem & {
  creator: User
}

export type MediaFileWithUser = MediaFile & {
  user: User
}

// Enums
export type UserRole = TripParticipant['role']
export type ItineraryItemType = ItineraryItem['type']
export type ExpenseCategory = Expense['category']
export type MediaType = MediaFile['type']
export type ShareType = ExpenseParticipant['share_type']
