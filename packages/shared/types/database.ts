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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

// Extended types with relationships
export type TripWithParticipants = Trip & {
  participants: (TripParticipant & {
    user: User
  })[]
}

export type TripWithOwner = Trip & {
  owner: User
}

export type UserRole = TripParticipant['role']
