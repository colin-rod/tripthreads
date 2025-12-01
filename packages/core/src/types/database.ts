export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string | null
          id: string
          requested_at: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          trip_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          requested_at?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          trip_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          requested_at?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          trip_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'access_requests_responded_by_fkey'
            columns: ['responded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'access_requests_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'access_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      analysis_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          patterns_analyzed: number | null
          patterns_created: number | null
          patterns_updated: number | null
          signals_end_time: string | null
          signals_processed: number | null
          signals_start_time: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          patterns_analyzed?: number | null
          patterns_created?: number | null
          patterns_updated?: number | null
          signals_end_time?: string | null
          signals_processed?: number | null
          signals_start_time?: string | null
          started_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          patterns_analyzed?: number | null
          patterns_created?: number | null
          patterns_updated?: number | null
          signals_end_time?: string | null
          signals_processed?: number | null
          signals_start_time?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          trip_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          trip_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          trip_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_metrics: {
        Row: {
          analysis_run_id: string | null
          avg_confidence: number
          avg_reward: number
          avg_time_to_confirm: number | null
          created_at: string
          date: string
          id: string
          instant_confirms: number
          major_edits: number
          minor_edits: number
          parser_version: string
          patterns_discovered: number
          patterns_updated: number
          rejects: number
          speed_bonus_rate: number | null
          total_signals: number
          updated_at: string
        }
        Insert: {
          analysis_run_id?: string | null
          avg_confidence?: number
          avg_reward?: number
          avg_time_to_confirm?: number | null
          created_at?: string
          date: string
          id?: string
          instant_confirms?: number
          major_edits?: number
          minor_edits?: number
          parser_version?: string
          patterns_discovered?: number
          patterns_updated?: number
          rejects?: number
          speed_bonus_rate?: number | null
          total_signals?: number
          updated_at?: string
        }
        Update: {
          analysis_run_id?: string | null
          avg_confidence?: number
          avg_reward?: number
          avg_time_to_confirm?: number | null
          created_at?: string
          date?: string
          id?: string
          instant_confirms?: number
          major_edits?: number
          minor_edits?: number
          parser_version?: string
          patterns_discovered?: number
          patterns_updated?: number
          rejects?: number
          speed_bonus_rate?: number | null
          total_signals?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_metrics_analysis_run_id_fkey'
            columns: ['analysis_run_id']
            isOneToOne: false
            referencedRelation: 'analysis_runs'
            referencedColumns: ['id']
          },
        ]
      }
      expense_participants: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          share_amount: number
          share_type: string
          share_value: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          share_amount: number
          share_type?: string
          share_value?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          share_amount?: number
          share_type?: string
          share_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expense_participants_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expense_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          currency: string
          date: string
          description: string
          fx_rate: number | null
          id: string
          payer_id: string
          receipt_url: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by: string
          currency?: string
          date?: string
          description: string
          fx_rate?: number | null
          id?: string
          payer_id: string
          receipt_url?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          currency?: string
          date?: string
          description?: string
          fx_rate?: number | null
          id?: string
          payer_id?: string
          receipt_url?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expenses_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_payer_id_fkey'
            columns: ['payer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
        ]
      }
      feedback_signals: {
        Row: {
          context: Json | null
          corrected_values: Json | null
          correction_details: Json | null
          created_at: string
          edited_fields: string[] | null
          failure_classification: string | null
          id: string
          matched_patterns: string[] | null
          message: string
          parsed_output: Json
          parser_version: string
          reward: number
          time_to_confirm: number | null
          trip_id: string | null
          user_action: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          corrected_values?: Json | null
          correction_details?: Json | null
          created_at?: string
          edited_fields?: string[] | null
          failure_classification?: string | null
          id?: string
          matched_patterns?: string[] | null
          message: string
          parsed_output: Json
          parser_version?: string
          reward: number
          time_to_confirm?: number | null
          trip_id?: string | null
          user_action: string
          user_id: string
        }
        Update: {
          context?: Json | null
          corrected_values?: Json | null
          correction_details?: Json | null
          created_at?: string
          edited_fields?: string[] | null
          failure_classification?: string | null
          id?: string
          matched_patterns?: string[] | null
          message?: string
          parsed_output?: Json
          parser_version?: string
          reward?: number
          time_to_confirm?: number | null
          trip_id?: string | null
          user_action?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'feedback_signals_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
        ]
      }
      fx_rates: {
        Row: {
          base_currency: string
          created_at: string
          date: string
          id: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          date: string
          id?: string
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          date?: string
          id?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      invite_rate_limits: {
        Row: {
          date: string
          invite_count: number
          trip_id: string
        }
        Insert: {
          date?: string
          invite_count?: number
          trip_id: string
        }
        Update: {
          date?: string
          invite_count?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invite_rate_limits_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
        ]
      }
      itinerary_item_participants: {
        Row: {
          created_at: string
          id: string
          itinerary_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'itinerary_item_participants_itinerary_item_id_fkey'
            columns: ['itinerary_item_id']
            isOneToOne: false
            referencedRelation: 'itinerary_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itinerary_item_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      itinerary_items: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          id: string
          is_all_day: boolean | null
          links: Json | null
          location: string | null
          metadata: Json | null
          notes: string | null
          start_time: string
          title: string
          trip_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean | null
          links?: Json | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          start_time: string
          title: string
          trip_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean | null
          links?: Json | null
          location?: string | null
          metadata?: Json | null
          notes?: string | null
          start_time?: string
          title?: string
          trip_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'itinerary_items_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'itinerary_items_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
        ]
      }
      media_files: {
        Row: {
          caption: string | null
          created_at: string
          date_taken: string
          id: string
          thumbnail_url: string | null
          trip_id: string
          type: string
          url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          date_taken: string
          id?: string
          thumbnail_url?: string | null
          trip_id: string
          type: string
          url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          date_taken?: string
          id?: string
          thumbnail_url?: string | null
          trip_id?: string
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'media_files_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_files_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_reactions_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'chat_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      migration_history: {
        Row: {
          applied_at: string
          id: string
          migration_name: string
        }
        Insert: {
          applied_at?: string
          id?: string
          migration_name: string
        }
        Update: {
          applied_at?: string
          id?: string
          migration_name?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          notification_type: string
          skip_reason: string | null
          status: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          notification_type: string
          skip_reason?: string | null
          status: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          skip_reason?: string | null
          status?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_logs_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notification_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      pattern_weights: {
        Row: {
          analysis_run_id: string | null
          avg_reward: number
          created_at: string
          failure_count: number
          id: string
          last_analyzed_at: string | null
          last_used_at: string | null
          parser_version: string
          pattern_regex: string
          pattern_type: string
          success_count: number
          total_uses: number
          updated_at: string
          weight: number
        }
        Insert: {
          analysis_run_id?: string | null
          avg_reward?: number
          created_at?: string
          failure_count?: number
          id?: string
          last_analyzed_at?: string | null
          last_used_at?: string | null
          parser_version?: string
          pattern_regex: string
          pattern_type: string
          success_count?: number
          total_uses?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          analysis_run_id?: string | null
          avg_reward?: number
          created_at?: string
          failure_count?: number
          id?: string
          last_analyzed_at?: string | null
          last_used_at?: string | null
          parser_version?: string
          pattern_regex?: string
          pattern_type?: string
          success_count?: number
          total_uses?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: 'pattern_weights_analysis_run_id_fkey'
            columns: ['analysis_run_id']
            isOneToOne: false
            referencedRelation: 'analysis_runs'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          is_deleted: boolean
          notification_preferences: Json | null
          plan: string
          plan_expires_at: string | null
          profile_completed_at: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_deleted?: boolean
          notification_preferences?: Json | null
          plan?: string
          plan_expires_at?: string | null
          profile_completed_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_deleted?: boolean
          notification_preferences?: Json | null
          plan?: string
          plan_expires_at?: string | null
          profile_completed_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount: number
          created_at: string
          currency: string
          from_user_id: string
          id: string
          note: string | null
          settled_at: string | null
          settled_by: string | null
          status: string
          to_user_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          from_user_id: string
          id?: string
          note?: string | null
          settled_at?: string | null
          settled_by?: string | null
          status?: string
          to_user_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          from_user_id?: string
          id?: string
          note?: string | null
          settled_at?: string | null
          settled_by?: string | null
          status?: string
          to_user_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'settlements_from_user_id_fkey'
            columns: ['from_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'settlements_settled_by_fkey'
            columns: ['settled_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'settlements_to_user_id_fkey'
            columns: ['to_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'settlements_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
        ]
      }
      trip_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          id: string
          invite_type: string
          invited_by: string
          role: string
          status: string
          token: string
          trip_id: string
          use_count: number
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invite_type: string
          invited_by: string
          role: string
          status?: string
          token: string
          trip_id: string
          use_count?: number
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invite_type?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
          trip_id?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'trip_invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trip_invites_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
        ]
      }
      trip_participants: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          join_end_date: string | null
          join_start_date: string | null
          joined_at: string
          notification_preferences: Json | null
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          join_end_date?: string | null
          join_start_date?: string | null
          joined_at?: string
          notification_preferences?: Json | null
          role?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          join_end_date?: string | null
          join_start_date?: string | null
          joined_at?: string
          notification_preferences?: Json | null
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trip_participants_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trip_participants_trip_id_fkey'
            columns: ['trip_id']
            isOneToOne: false
            referencedRelation: 'trips'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trip_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      trips: {
        Row: {
          base_currency: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          owner_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          owner_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          owner_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trips_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anonymize_user_account: {
        Args: { p_trip_deletion_strategy?: string; p_user_id: string }
        Returns: Json
      }
      calculate_days_joined: {
        Args: { p_participant_id: string }
        Returns: number
      }
      can_user_read_trip_participant: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
      can_user_see_expense: {
        Args: { p_expense_date: string; p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
      can_user_see_item: {
        Args: { p_item_date: string; p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
      generate_invite_token: { Args: never; Returns: string }
      get_invite_with_trip_details: { Args: { p_token: string }; Returns: Json }
      get_owned_trips_for_deletion: {
        Args: { p_user_id: string }
        Returns: {
          can_transfer: boolean
          oldest_participant_id: string
          oldest_participant_name: string
          participant_count: number
          trip_id: string
          trip_name: string
        }[]
      }
      get_user_trip_join_date: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: string
      }
      is_partial_joiner: {
        Args: { p_participant_id: string }
        Returns: boolean
      }
      is_participant_present_on_date: {
        Args: { p_date: string; p_participant_id: string }
        Returns: boolean
      }
      is_profile_complete: { Args: { p_user_id: string }; Returns: boolean }
      is_trip_owner: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
      is_trip_participant: {
        Args: { p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
      is_trip_participant_with_role: {
        Args: { p_roles: string[]; p_trip_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
