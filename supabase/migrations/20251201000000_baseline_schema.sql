-- ============================================================================
-- TripThreads Baseline Schema Migration
-- ============================================================================
-- Date: 2025-12-01
-- Description: Consolidated production schema (Phase 1-2 complete)
-- Replaces: 31 migrations from Jan-Nov 2025
--
-- Contains complete working schema:
-- - Core: profiles, trips, trip_participants, invites, access_requests
-- - Itinerary: itinerary_items
-- - Expenses: expenses, expense_participants, settlements, fx_rates
-- - Chat: chat_messages, message_reactions
-- - Notifications: notification_logs + edge function triggers
-- - Storage: trip-media bucket
-- - All RLS policies, triggers, functions (with search_path fixes)
--
-- Source: supabase db dump --linked
-- Archived: supabase/migrations/archive/2025-phase1-phase2/
-- ============================================================================






 -- Extensions                                                                 
 ----------------------------------------------------------------------------- 
 CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions"; 
 CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";           
 CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";          

 -- Tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    plan text NOT NULL DEFAULT 'free'::text,
    plan_expires_at timestamp with time zone,
    stripe_customer_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    notification_preferences jsonb DEFAULT '{"push_trip_invites": true, "push_trip_updates": true, "email_trip_invites": true, "email_trip_updates": true, "push_expense_updates": true, "email_expense_updates": true}'::jsonb,
    profile_completed_at timestamp with time zone,
    deleted_at timestamp with time zone,
    is_deleted boolean NOT NULL DEFAULT false
);                                                                                      
 CREATE TABLE IF NOT EXISTS public.trips (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    owner_id uuid NOT NULL,
    cover_image_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    base_currency text NOT NULL DEFAULT 'EUR'::text
);                                                                                                                                                                                                                                                                                                                                                                         
 CREATE TABLE IF NOT EXISTS public.trip_participants (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    trip_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'participant'::text,
    joined_at timestamp with time zone NOT NULL DEFAULT now(),
    invited_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    join_start_date date,
    join_end_date date,
    notification_preferences jsonb
);                                                                                                                                                                                                                                                                                                                                                                                           
 CREATE TABLE IF NOT EXISTS public.trip_invites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL,
    token text NOT NULL,
    email text,
    invited_by uuid NOT NULL,
    role text NOT NULL,
    invite_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    use_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    accepted_at timestamp with time zone
);                                                                                                                                                                                                                                                                                                                                                                                               
 CREATE TABLE IF NOT EXISTS public.access_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    requested_at timestamp with time zone DEFAULT now(),
    responded_at timestamp with time zone,
    responded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                          
 CREATE TABLE IF NOT EXISTS public.itinerary_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    trip_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    location text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    notes text,
    links jsonb DEFAULT '[]'::jsonb,
    is_all_day boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb
);                                                                                                                                                                                                                                           
 CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    trip_id uuid NOT NULL,
    description text NOT NULL,
    amount integer NOT NULL,
    currency text NOT NULL DEFAULT 'EUR'::text,
    category text NOT NULL DEFAULT 'other'::text,
    payer_id uuid NOT NULL,
    date timestamp with time zone NOT NULL DEFAULT now(),
    receipt_url text,
    fx_rate numeric(10,6),
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                                                                                                   
 CREATE TABLE IF NOT EXISTS public.expense_participants (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    expense_id uuid NOT NULL,
    user_id uuid NOT NULL,
    share_amount integer NOT NULL,
    share_type text NOT NULL DEFAULT 'equal'::text,
    share_value numeric(10,2),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 CREATE TABLE IF NOT EXISTS public.settlements (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    trip_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    amount integer NOT NULL,
    currency text NOT NULL DEFAULT 'EUR'::text,
    status text NOT NULL DEFAULT 'pending'::text,
    settled_at timestamp with time zone,
    settled_by uuid,
    note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                                                                                                                                                         
 CREATE TABLE IF NOT EXISTS public.fx_rates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    base_currency text NOT NULL DEFAULT 'EUR'::text,
    target_currency text NOT NULL,
    rate numeric(12,6) NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
 CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    trip_id uuid NOT NULL,
    user_id uuid,
    message_type text NOT NULL,
    content text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                   
 CREATE TABLE IF NOT EXISTS public.message_reactions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
 CREATE TABLE IF NOT EXISTS public.notification_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    notification_type text NOT NULL,
    status text NOT NULL,
    skip_reason text,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
 CREATE TABLE IF NOT EXISTS public.analysis_runs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    started_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    status text NOT NULL DEFAULT 'running'::text,
    signals_processed integer DEFAULT 0,
    signals_start_time timestamp with time zone,
    signals_end_time timestamp with time zone,
    patterns_analyzed integer DEFAULT 0,
    patterns_created integer DEFAULT 0,
    patterns_updated integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                    
 CREATE TABLE IF NOT EXISTS public.daily_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    date date NOT NULL,
    total_signals integer NOT NULL DEFAULT 0,
    instant_confirms integer NOT NULL DEFAULT 0,
    minor_edits integer NOT NULL DEFAULT 0,
    major_edits integer NOT NULL DEFAULT 0,
    rejects integer NOT NULL DEFAULT 0,
    avg_reward numeric(5,2) NOT NULL DEFAULT 0.00,
    avg_confidence numeric(5,3) NOT NULL DEFAULT 0.000,
    patterns_discovered integer NOT NULL DEFAULT 0,
    patterns_updated integer NOT NULL DEFAULT 0,
    avg_time_to_confirm integer,
    speed_bonus_rate numeric(5,3),
    parser_version text NOT NULL DEFAULT 'v1.0'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    analysis_run_id uuid
); 
 CREATE TABLE IF NOT EXISTS public.feedback_signals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    trip_id uuid,
    message text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    parsed_output jsonb NOT NULL,
    parser_version text NOT NULL DEFAULT 'v1.0'::text,
    user_action text NOT NULL,
    edited_fields text[] DEFAULT '{}'::text[],
    time_to_confirm integer,
    reward numeric(5,2) NOT NULL,
    matched_patterns text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    corrected_values jsonb,
    correction_details jsonb,
    failure_classification text
);                                                                                                                                                                                        
 CREATE TABLE IF NOT EXISTS public.invite_rate_limits (
    trip_id uuid NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    invite_count integer NOT NULL DEFAULT 0
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
 CREATE TABLE IF NOT EXISTS public.itinerary_item_participants (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    itinerary_item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 CREATE TABLE IF NOT EXISTS public.media_files (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    trip_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    url text NOT NULL,
    thumbnail_url text,
    caption text,
    date_taken timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
 CREATE TABLE IF NOT EXISTS public.migration_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    migration_name text NOT NULL,
    applied_at timestamp with time zone NOT NULL DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 CREATE TABLE IF NOT EXISTS public.pattern_weights (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pattern_regex text NOT NULL,
    pattern_type text NOT NULL,
    weight numeric(5,3) NOT NULL DEFAULT 1.000,
    success_count integer NOT NULL DEFAULT 0,
    failure_count integer NOT NULL DEFAULT 0,
    avg_reward numeric(5,2) NOT NULL DEFAULT 0.00,
    total_uses integer NOT NULL DEFAULT 0,
    last_used_at timestamp with time zone,
    parser_version text NOT NULL DEFAULT 'v1.0'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    last_analyzed_at timestamp with time zone,
    analysis_run_id uuid
);                                                                                                                                     


 -- Primary Keys                                                                                                       
 --------------------------------------------------------------------------------------------------------------------- 
 ALTER TABLE ONLY public.access_requests ADD CONSTRAINT access_requests_pkey PRIMARY KEY (id);                         
 ALTER TABLE ONLY public.analysis_runs ADD CONSTRAINT analysis_runs_pkey PRIMARY KEY (id);                             
 ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);                             
 ALTER TABLE ONLY public.daily_metrics ADD CONSTRAINT daily_metrics_pkey PRIMARY KEY (id);                             
 ALTER TABLE ONLY public.expense_participants ADD CONSTRAINT expense_participants_pkey PRIMARY KEY (id);               
 ALTER TABLE ONLY public.expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);                                       
 ALTER TABLE ONLY public.feedback_signals ADD CONSTRAINT feedback_signals_pkey PRIMARY KEY (id);                       
 ALTER TABLE ONLY public.fx_rates ADD CONSTRAINT fx_rates_pkey PRIMARY KEY (id);                                       
 ALTER TABLE ONLY public.invite_rate_limits ADD CONSTRAINT invite_rate_limits_pkey PRIMARY KEY (trip_id, date);        
 ALTER TABLE ONLY public.itinerary_item_participants ADD CONSTRAINT itinerary_item_participants_pkey PRIMARY KEY (id); 
 ALTER TABLE ONLY public.itinerary_items ADD CONSTRAINT itinerary_items_pkey PRIMARY KEY (id);                         
 ALTER TABLE ONLY public.media_files ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);                                 
 ALTER TABLE ONLY public.message_reactions ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);                     
 ALTER TABLE ONLY public.migration_history ADD CONSTRAINT migration_history_pkey PRIMARY KEY (id);                     
 ALTER TABLE ONLY public.notification_logs ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);                     
 ALTER TABLE ONLY public.pattern_weights ADD CONSTRAINT pattern_weights_pkey PRIMARY KEY (id);                         
 ALTER TABLE ONLY public.profiles ADD CONSTRAINT users_pkey PRIMARY KEY (id);                                          
 ALTER TABLE ONLY public.settlements ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);                                 
 ALTER TABLE ONLY public.trip_invites ADD CONSTRAINT trip_invites_pkey PRIMARY KEY (id);                               
 ALTER TABLE ONLY public.trip_participants ADD CONSTRAINT trip_participants_pkey PRIMARY KEY (id);                     
 ALTER TABLE ONLY public.trips ADD CONSTRAINT trips_pkey PRIMARY KEY (id);                                             

 -- Foreign Keys                                                                                                                                                                                                
 -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 ALTER TABLE ONLY public.access_requests ADD CONSTRAINT access_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;                                         
 ALTER TABLE ONLY public.access_requests ADD CONSTRAINT access_requests_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                       
 ALTER TABLE ONLY public.access_requests ADD CONSTRAINT access_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                                                    
 ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT chat_messages_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                           
 ALTER TABLE ONLY public.chat_messages ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;                                                       
 ALTER TABLE ONLY public.daily_metrics ADD CONSTRAINT daily_metrics_analysis_run_id_fkey FOREIGN KEY (analysis_run_id) REFERENCES public.analysis_runs(id) ON DELETE SET NULL;                                  
 ALTER TABLE ONLY public.expense_participants ADD CONSTRAINT expense_participants_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;                                    
 ALTER TABLE ONLY public.expense_participants ADD CONSTRAINT expense_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                                          
 ALTER TABLE ONLY public.expenses ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);                                                                              
 ALTER TABLE ONLY public.expenses ADD CONSTRAINT expenses_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES public.profiles(id);                                                                                  
 ALTER TABLE ONLY public.expenses ADD CONSTRAINT expenses_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                                     
 ALTER TABLE ONLY public.feedback_signals ADD CONSTRAINT feedback_signals_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;                                                    
 ALTER TABLE ONLY public.invite_rate_limits ADD CONSTRAINT invite_rate_limits_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                 
 ALTER TABLE ONLY public.itinerary_item_participants ADD CONSTRAINT itinerary_item_participants_itinerary_item_id_fkey FOREIGN KEY (itinerary_item_id) REFERENCES public.itinerary_items(id) ON DELETE CASCADE; 
 ALTER TABLE ONLY public.itinerary_item_participants ADD CONSTRAINT itinerary_item_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                            
 ALTER TABLE ONLY public.itinerary_items ADD CONSTRAINT itinerary_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);                                                                
 ALTER TABLE ONLY public.itinerary_items ADD CONSTRAINT itinerary_items_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                       
 ALTER TABLE ONLY public.media_files ADD CONSTRAINT media_files_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                               
 ALTER TABLE ONLY public.media_files ADD CONSTRAINT media_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);                                                                              
 ALTER TABLE ONLY public.message_reactions ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;                                     
 ALTER TABLE ONLY public.message_reactions ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                                                
 ALTER TABLE ONLY public.notification_logs ADD CONSTRAINT notification_logs_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                   
 ALTER TABLE ONLY public.notification_logs ADD CONSTRAINT notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                                                
 ALTER TABLE ONLY public.pattern_weights ADD CONSTRAINT pattern_weights_analysis_run_id_fkey FOREIGN KEY (analysis_run_id) REFERENCES public.analysis_runs(id) ON DELETE SET NULL;                              
 ALTER TABLE ONLY public.settlements ADD CONSTRAINT settlements_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                                                  
 ALTER TABLE ONLY public.settlements ADD CONSTRAINT settlements_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES public.profiles(id);                                                                        
 ALTER TABLE ONLY public.settlements ADD CONSTRAINT settlements_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                                                      
 ALTER TABLE ONLY public.settlements ADD CONSTRAINT settlements_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                               
 ALTER TABLE ONLY public.trip_invites ADD CONSTRAINT trip_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;                                                    
 ALTER TABLE ONLY public.trip_invites ADD CONSTRAINT trip_invites_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                             
 ALTER TABLE ONLY public.trip_participants ADD CONSTRAINT trip_participants_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);                                                            
 ALTER TABLE ONLY public.trip_participants ADD CONSTRAINT trip_participants_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;                                                   
 ALTER TABLE ONLY public.trip_participants ADD CONSTRAINT trip_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                                                
 ALTER TABLE ONLY public.trips ADD CONSTRAINT trips_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;                                                                      



 -- Indexes                                                                                                                                                                 
 -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 CREATE INDEX idx_access_requests_status ON public.access_requests USING btree (status);                                                                                    
 CREATE INDEX idx_access_requests_trip_id ON public.access_requests USING btree (trip_id);                                                                                  
 CREATE UNIQUE INDEX idx_access_requests_unique_pending ON public.access_requests USING btree (trip_id, user_id) WHERE (status = 'pending'::text);                          
 CREATE INDEX idx_access_requests_user_id ON public.access_requests USING btree (user_id);                                                                                  
 CREATE INDEX idx_analysis_runs_status ON public.analysis_runs USING btree (status, completed_at DESC);                                                                     
 CREATE INDEX idx_analysis_runs_success ON public.analysis_runs USING btree (completed_at DESC) WHERE (status = 'success'::text);                                           
 CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);                                                                           
 CREATE INDEX idx_chat_messages_trip_id ON public.chat_messages USING btree (trip_id);                                                                                      
 CREATE INDEX idx_chat_messages_user_id ON public.chat_messages USING btree (user_id);                                                                                      
 CREATE UNIQUE INDEX daily_metrics_date_key ON public.daily_metrics USING btree (date);                                                                                     
 CREATE INDEX idx_daily_metrics_avg_reward ON public.daily_metrics USING btree (avg_reward DESC);                                                                           
 CREATE INDEX idx_daily_metrics_date ON public.daily_metrics USING btree (date DESC);                                                                                       
 CREATE INDEX idx_daily_metrics_parser_version ON public.daily_metrics USING btree (parser_version);                                                                        
 CREATE INDEX idx_expense_participants_expense_id ON public.expense_participants USING btree (expense_id);                                                                  
 CREATE INDEX idx_expense_participants_user_id ON public.expense_participants USING btree (user_id);                                                                        
 CREATE UNIQUE INDEX unique_expense_user ON public.expense_participants USING btree (expense_id, user_id);                                                                  
 CREATE INDEX idx_expenses_date ON public.expenses USING btree (date);                                                                                                      
 CREATE INDEX idx_expenses_payer_id ON public.expenses USING btree (payer_id);                                                                                              
 CREATE INDEX idx_expenses_trip_id ON public.expenses USING btree (trip_id);                                                                                                
 CREATE INDEX idx_feedback_signals_context ON public.feedback_signals USING gin (context);                                                                                  
 CREATE INDEX idx_feedback_signals_created_at ON public.feedback_signals USING btree (created_at DESC);                                                                     
 CREATE INDEX idx_feedback_signals_failure_classification ON public.feedback_signals USING btree (failure_classification) WHERE (failure_classification IS NOT NULL);       
 CREATE INDEX idx_feedback_signals_has_corrections ON public.feedback_signals USING btree (((corrected_values IS NOT NULL)));                                               
 CREATE INDEX idx_feedback_signals_parsed_output ON public.feedback_signals USING gin (parsed_output);                                                                      
 CREATE INDEX idx_feedback_signals_parser_version ON public.feedback_signals USING btree (parser_version);                                                                  
 CREATE INDEX idx_feedback_signals_reward ON public.feedback_signals USING btree (reward);                                                                                  
 CREATE INDEX idx_feedback_signals_trip_id ON public.feedback_signals USING btree (trip_id);                                                                                
 CREATE INDEX idx_feedback_signals_user_action ON public.feedback_signals USING btree (user_action);                                                                        
 CREATE INDEX idx_feedback_signals_user_id ON public.feedback_signals USING btree (user_id);                                                                                
 CREATE INDEX idx_fx_rates_currencies ON public.fx_rates USING btree (base_currency, target_currency);                                                                      
 CREATE INDEX idx_fx_rates_date ON public.fx_rates USING btree (date DESC);                                                                                                 
 CREATE INDEX idx_fx_rates_lookup ON public.fx_rates USING btree (base_currency, target_currency, date);                                                                    
 CREATE UNIQUE INDEX unique_rate_per_day ON public.fx_rates USING btree (base_currency, target_currency, date);                                                             
 CREATE INDEX idx_itinerary_item_participants_item_id ON public.itinerary_item_participants USING btree (itinerary_item_id);                                                
 CREATE INDEX idx_itinerary_item_participants_user_id ON public.itinerary_item_participants USING btree (user_id);                                                          
 CREATE UNIQUE INDEX unique_item_participant ON public.itinerary_item_participants USING btree (itinerary_item_id, user_id);                                                
 CREATE INDEX idx_itinerary_items_start_time ON public.itinerary_items USING btree (start_time);                                                                            
 CREATE INDEX idx_itinerary_items_trip_id ON public.itinerary_items USING btree (trip_id);                                                                                  
 CREATE INDEX idx_media_files_date_taken ON public.media_files USING btree (date_taken);                                                                                    
 CREATE INDEX idx_media_files_trip_id ON public.media_files USING btree (trip_id);                                                                                          
 CREATE INDEX idx_media_files_user_id ON public.media_files USING btree (user_id);                                                                                          
 CREATE INDEX idx_message_reactions_message_id ON public.message_reactions USING btree (message_id);                                                                        
 CREATE INDEX idx_message_reactions_user_id ON public.message_reactions USING btree (user_id);                                                                              
 CREATE UNIQUE INDEX message_reactions_message_id_user_id_emoji_key ON public.message_reactions USING btree (message_id, user_id, emoji);                                   
 CREATE UNIQUE INDEX migration_history_migration_name_key ON public.migration_history USING btree (migration_name);                                                         
 CREATE INDEX idx_notification_logs_created_at ON public.notification_logs USING btree (created_at DESC);                                                                   
 CREATE INDEX idx_notification_logs_event_type ON public.notification_logs USING btree (event_type);                                                                        
 CREATE INDEX idx_notification_logs_status ON public.notification_logs USING btree (status);                                                                                
 CREATE INDEX idx_notification_logs_trip_event_created ON public.notification_logs USING btree (trip_id, event_type, created_at DESC);                                      
 CREATE INDEX idx_notification_logs_trip_id ON public.notification_logs USING btree (trip_id);                                                                              
 CREATE INDEX idx_notification_logs_user_id ON public.notification_logs USING btree (user_id);                                                                              
 CREATE INDEX idx_pattern_weights_avg_reward ON public.pattern_weights USING btree (avg_reward DESC);                                                                       
 CREATE INDEX idx_pattern_weights_parser_version ON public.pattern_weights USING btree (parser_version);                                                                    
 CREATE INDEX idx_pattern_weights_pattern_type ON public.pattern_weights USING btree (pattern_type);                                                                        
 CREATE INDEX idx_pattern_weights_updated_at ON public.pattern_weights USING btree (updated_at DESC);                                                                       
 CREATE INDEX idx_pattern_weights_weight ON public.pattern_weights USING btree (weight DESC);                                                                               
 CREATE UNIQUE INDEX pattern_weights_pattern_regex_key ON public.pattern_weights USING btree (pattern_regex);                                                               
 CREATE INDEX idx_profiles_deleted_at ON public.profiles USING btree (deleted_at);                                                                                          
 CREATE INDEX idx_profiles_is_deleted ON public.profiles USING btree (is_deleted);                                                                                          
 CREATE INDEX idx_users_email ON public.profiles USING btree (email);                                                                                                       
 CREATE INDEX idx_users_plan ON public.profiles USING btree (plan);                                                                                                         
 CREATE INDEX idx_users_profile_completed ON public.profiles USING btree (profile_completed_at) WHERE (profile_completed_at IS NULL);                                       
 CREATE UNIQUE INDEX users_email_key ON public.profiles USING btree (email);                                                                                                
 CREATE INDEX idx_settlements_from_user ON public.settlements USING btree (from_user_id);                                                                                   
 CREATE INDEX idx_settlements_status ON public.settlements USING btree (status);                                                                                            
 CREATE INDEX idx_settlements_to_user ON public.settlements USING btree (to_user_id);                                                                                       
 CREATE INDEX idx_settlements_trip_id ON public.settlements USING btree (trip_id);                                                                                          
 CREATE INDEX idx_settlements_trip_status ON public.settlements USING btree (trip_id, status);                                                                              
 CREATE INDEX idx_trip_invites_email ON public.trip_invites USING btree (email) WHERE (email IS NOT NULL);                                                                  
 CREATE INDEX idx_trip_invites_status ON public.trip_invites USING btree (status) WHERE (status = 'pending'::text);                                                         
 CREATE INDEX idx_trip_invites_token ON public.trip_invites USING btree (token);                                                                                            
 CREATE INDEX idx_trip_invites_trip_id ON public.trip_invites USING btree (trip_id);                                                                                        
 CREATE UNIQUE INDEX trip_invites_token_key ON public.trip_invites USING btree (token);                                                                                     
 CREATE INDEX idx_trip_participants_join_dates ON public.trip_participants USING btree (trip_id, join_start_date, join_end_date) WHERE (join_start_date IS NOT NULL);       
 CREATE INDEX idx_trip_participants_notification_preferences ON public.trip_participants USING gin (notification_preferences) WHERE (notification_preferences IS NOT NULL); 
 CREATE INDEX idx_trip_participants_role ON public.trip_participants USING btree (role);                                                                                    
 CREATE INDEX idx_trip_participants_trip_id ON public.trip_participants USING btree (trip_id);                                                                              
 CREATE INDEX idx_trip_participants_user_id ON public.trip_participants USING btree (user_id);                                                                              
 CREATE UNIQUE INDEX unique_trip_user ON public.trip_participants USING btree (trip_id, user_id);                                                                           
 CREATE INDEX idx_trips_base_currency ON public.trips USING btree (base_currency);                                                                                          
 CREATE INDEX idx_trips_created_at ON public.trips USING btree (created_at);                                                                                                
 CREATE INDEX idx_trips_owner_id ON public.trips USING btree (owner_id);                                                                                                    
 CREATE INDEX idx_trips_start_date ON public.trips USING btree (start_date);                                                                                                



 -- Functions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
 ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 CREATE OR REPLACE FUNCTION public.anonymize_user_account(p_user_id uuid, p_trip_deletion_strategy text DEFAULT 'transfer'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trip_record RECORD;
  v_new_owner_id UUID;
  v_deleted_email TEXT;
  v_trips_deleted INT := 0;
  v_trips_transferred INT := 0;
BEGIN
  -- Check if user exists and is not already deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND is_deleted = FALSE
  ) THEN
    RAISE EXCEPTION 'User does not exist or is already deleted';
  END IF;

  -- Generate unique deleted email
  v_deleted_email := 'deleted_' || p_user_id || '@tripthreads.deleted';

  -- Handle owned trips
  FOR v_trip_record IN
    SELECT t.id, t.name
    FROM public.trips t
    WHERE t.owner_id = p_user_id
  LOOP
    IF p_trip_deletion_strategy = 'delete' THEN
      -- Delete trip entirely (CASCADE will handle related records)
      DELETE FROM public.trips WHERE id = v_trip_record.id;
      v_trips_deleted := v_trips_deleted + 1;
    ELSE
      -- Transfer ownership to oldest active participant (excluding the user being deleted)
      SELECT tp.user_id INTO v_new_owner_id
      FROM public.trip_participants tp
      INNER JOIN public.profiles p ON tp.user_id = p.id
      WHERE tp.trip_id = v_trip_record.id
        AND tp.user_id != p_user_id
        AND p.is_deleted = FALSE
      ORDER BY tp.joined_at ASC
      LIMIT 1;

      IF v_new_owner_id IS NOT NULL THEN
        -- Transfer ownership
        UPDATE public.trips
        SET owner_id = v_new_owner_id
        WHERE id = v_trip_record.id;

        -- Update participant role to owner
        UPDATE public.trip_participants
        SET role = 'owner'
        WHERE trip_id = v_trip_record.id
          AND user_id = v_new_owner_id;

        v_trips_transferred := v_trips_transferred + 1;
      ELSE
        -- No other participants, delete trip
        DELETE FROM public.trips WHERE id = v_trip_record.id;
        v_trips_deleted := v_trips_deleted + 1;
      END IF;
    END IF;
  END LOOP;

  -- Anonymize profile data
  UPDATE public.profiles
  SET
    full_name = 'Deleted User',
    email = v_deleted_email,
    avatar_url = NULL,
    stripe_customer_id = NULL,
    notification_preferences = NULL,
    deleted_at = NOW(),
    is_deleted = TRUE,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Delete avatar from storage (handled by application layer)
  -- Delete user-specific records that should be hard deleted

  -- Delete trip invites sent by user
  DELETE FROM public.trip_invites WHERE invited_by = p_user_id;

  -- Delete access requests made by user
  DELETE FROM public.access_requests WHERE user_id = p_user_id;

  -- Delete message reactions by user
  DELETE FROM public.message_reactions WHERE user_id = p_user_id;

  -- Return success with stats
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Account anonymized successfully',
    'tripsDeleted', v_trips_deleted,
    'tripsTransferred', v_trips_transferred,
    'userId', p_user_id,
    'deletedAt', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback on error
    RAISE EXCEPTION 'Failed to anonymize account: %', SQLERRM;
END;
$function$
; 
 CREATE OR REPLACE FUNCTION public.calculate_days_joined(p_participant_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_trip_start DATE;
  v_trip_end DATE;
BEGIN
  SELECT
    tp.join_start_date,
    tp.join_end_date,
    t.start_date,
    t.end_date
  INTO
    v_start_date,
    v_end_date,
    v_trip_start,
    v_trip_end
  FROM public.trip_participants tp
  JOIN public.trips t ON t.id = tp.trip_id
  WHERE tp.id = p_participant_id;

  -- If no date range, participant is joining for entire trip
  IF v_start_date IS NULL THEN
    RETURN (v_trip_end - v_trip_start) + 1;
  END IF;

  -- Calculate days in date range (inclusive)
  RETURN (v_end_date - v_start_date) + 1;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
 CREATE OR REPLACE FUNCTION public.can_user_read_trip_participant(p_trip_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_participants tp
    JOIN public.profiles p ON tp.user_id = p.id
    WHERE tp.trip_id = p_trip_id
      AND tp.user_id = p_user_id
      AND p.is_deleted = false
  );
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 CREATE OR REPLACE FUNCTION public.can_user_see_expense(p_expense_date timestamp with time zone, p_trip_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
      AND role IN ('owner', 'participant')
      AND p_expense_date >= joined_at
  );
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
 CREATE OR REPLACE FUNCTION public.can_user_see_item(p_item_date timestamp with time zone, p_trip_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_is_owner BOOLEAN;
  v_user_role TEXT;
  v_joined_at TIMESTAMPTZ;
BEGIN
  -- Check if user is the trip owner (bypass RLS)
  SELECT EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN true;
  END IF;

  -- Get user's role and join date from trip_participants (bypass RLS with SECURITY DEFINER)
  SELECT role, joined_at
  INTO v_user_role, v_joined_at
  FROM public.trip_participants
  WHERE trip_id = p_trip_id AND user_id = p_user_id
  LIMIT 1;

  -- If user not found in trip_participants, return false
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Viewers see everything
  IF v_user_role = 'viewer' THEN
    RETURN true;
  END IF;

  -- Participants see items from their join date forward
  IF v_user_role = 'participant' THEN
    RETURN p_item_date >= v_joined_at;
  END IF;

  -- Default: no access
  RETURN false;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
 CREATE OR REPLACE FUNCTION public.check_invite_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count INTEGER;
  v_max_per_day INTEGER := 100; -- Max 100 invites per trip per day
BEGIN
  -- Get current count for today
  SELECT invite_count INTO v_count
  FROM public.invite_rate_limits
  WHERE trip_id = NEW.trip_id
  AND date = CURRENT_DATE;

  -- If no record exists, create one
  IF v_count IS NULL THEN
    INSERT INTO public.invite_rate_limits (trip_id, date, invite_count)
    VALUES (NEW.trip_id, CURRENT_DATE, 1);
    RETURN NEW;
  END IF;

  -- Check if limit exceeded
  IF v_count >= v_max_per_day THEN
    RAISE EXCEPTION 'Daily invite limit exceeded for this trip (max: %)', v_max_per_day;
  END IF;

  -- Increment count
  UPDATE public.invite_rate_limits
  SET invite_count = invite_count + 1
  WHERE trip_id = NEW.trip_id
  AND date = CURRENT_DATE;

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE OR REPLACE FUNCTION public.create_trip_owner_participant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  previous_context text;
  insert_count integer := 0;
BEGIN
  previous_context := current_setting('app.trigger_context', true);
  RAISE LOG 'create_trip_owner_participant: starting. previous_context=%', COALESCE(previous_context, '<null>');

  PERFORM set_config('app.trigger_context', 'create_trip_owner_participant', true);
  RAISE LOG 'create_trip_owner_participant: set trigger context for trip_id=%, owner_id=%', NEW.id, NEW.owner_id;

  INSERT INTO public.trip_participants (trip_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id)
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  GET DIAGNOSTICS insert_count = ROW_COUNT;
  RAISE LOG 'create_trip_owner_participant: insert finished with row_count=% for trip_id=%, owner_id=%', insert_count, NEW.id, NEW.owner_id;

  IF previous_context IS NULL THEN
    PERFORM set_config('app.trigger_context', '', true);
  ELSE
    PERFORM set_config('app.trigger_context', previous_context, true);
  END IF;
  RAISE LOG 'create_trip_owner_participant: restored trigger context to %', COALESCE(previous_context, '<null>');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'create_trip_owner_participant: ERROR - %, DETAIL - %, CONTEXT - trip_id=%, owner_id=%, previous_context=%',
      SQLERRM,
      SQLSTATE,
      NEW.id,
      NEW.owner_id,
      COALESCE(previous_context, '<null>');
    IF previous_context IS NULL THEN
      PERFORM set_config('app.trigger_context', '', true);
    ELSE
      PERFORM set_config('app.trigger_context', previous_context, true);
    END IF;
    RAISE;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 CREATE OR REPLACE FUNCTION public.generate_invite_token()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_token TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Generate token until we get a unique one
  LOOP
    -- Generate 32-character hex token
    v_token := encode(gen_random_bytes(16), 'hex');

    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM public.trip_invites WHERE token = v_token
    ) INTO v_exists;

    -- Exit loop if token is unique
    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_token;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
 CREATE OR REPLACE FUNCTION public.get_invite_with_trip_details(p_token text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'invite', json_build_object(
      'id', ti.id,
      'token', ti.token,
      'role', ti.role,
      'invite_type', ti.invite_type,
      'status', ti.status,
      'created_at', ti.created_at
    ),
    'trip', json_build_object(
      'id', t.id,
      'name', t.name,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'cover_image_url', t.cover_image_url,
      'description', t.description
    ),
    'inviter', json_build_object(
      'id', u.id,
      'full_name', u.full_name,
      'avatar_url', u.avatar_url
    )
  ) INTO v_result
  FROM public.trip_invites ti
  JOIN public.trips t ON t.id = ti.trip_id
  -- FIX: Changed from public.users to public.profiles
  JOIN public.profiles u ON u.id = ti.invited_by
  WHERE ti.token = p_token
  AND ti.status = 'pending';

  RETURN v_result;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 CREATE OR REPLACE FUNCTION public.get_owned_trips_for_deletion(p_user_id uuid)
 RETURNS TABLE(trip_id uuid, trip_name text, participant_count bigint, can_transfer boolean, oldest_participant_id uuid, oldest_participant_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS trip_id,
    t.name AS trip_name,
    COUNT(tp.user_id) AS participant_count,
    COUNT(tp.user_id) FILTER (WHERE tp.user_id != p_user_id) > 0 AS can_transfer,
    (
      SELECT tp2.user_id
      FROM public.trip_participants tp2
      INNER JOIN public.profiles p ON tp2.user_id = p.id
      WHERE tp2.trip_id = t.id
        AND tp2.user_id != p_user_id
        AND p.is_deleted = FALSE
      ORDER BY tp2.joined_at ASC
      LIMIT 1
    ) AS oldest_participant_id,
    (
      SELECT p.full_name
      FROM public.trip_participants tp2
      INNER JOIN public.profiles p ON tp2.user_id = p.id
      WHERE tp2.trip_id = t.id
        AND tp2.user_id != p_user_id
        AND p.is_deleted = FALSE
      ORDER BY tp2.joined_at ASC
      LIMIT 1
    ) AS oldest_participant_name
  FROM public.trips t
  LEFT JOIN public.trip_participants tp ON t.id = tp.trip_id
  WHERE t.owner_id = p_user_id
  GROUP BY t.id, t.name;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 CREATE OR REPLACE FUNCTION public.get_user_trip_join_date(p_trip_id uuid, p_user_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT joined_at
  FROM public.trip_participants
  WHERE trip_id = p_trip_id
    AND user_id = p_user_id
  LIMIT 1;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
 CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Set session variable to indicate this is a system-initiated insert
  -- This allows the RLS policy to permit the insert during signup
  PERFORM set_config('app.trigger_context', 'handle_new_user', true);

  RAISE LOG 'handle_new_user: Creating profile for user_id=%, email=%', NEW.id, NEW.email;

  -- FIX: Changed from public.users to public.profiles
  INSERT INTO public.profiles (id, email, full_name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE LOG 'handle_new_user: Profile created successfully for user_id=%', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: ERROR - %, DETAIL - %, user_id=%', SQLERRM, SQLSTATE, NEW.id;
    RAISE;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 CREATE OR REPLACE FUNCTION public.is_partial_joiner(p_participant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_trip_start DATE;
  v_trip_end DATE;
BEGIN
  SELECT
    tp.join_start_date,
    tp.join_end_date,
    t.start_date,
    t.end_date
  INTO
    v_start_date,
    v_end_date,
    v_trip_start,
    v_trip_end
  FROM public.trip_participants tp
  JOIN public.trips t ON t.id = tp.trip_id
  WHERE tp.id = p_participant_id;

  -- If no date range, not a partial joiner
  IF v_start_date IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Partial joiner if dates don't match trip dates exactly
  RETURN v_start_date > v_trip_start OR v_end_date < v_trip_end;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
 CREATE OR REPLACE FUNCTION public.is_participant_present_on_date(p_participant_id uuid, p_date date)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  SELECT join_start_date, join_end_date
  INTO v_start_date, v_end_date
  FROM public.trip_participants
  WHERE id = p_participant_id;

  -- If no date range set, participant is present for entire trip
  IF v_start_date IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if date is within range
  RETURN p_date >= v_start_date AND p_date <= v_end_date;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
 CREATE OR REPLACE FUNCTION public.is_profile_complete(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_full_name TEXT;
BEGIN
  SELECT full_name INTO v_full_name
  FROM public.users
  WHERE id = p_user_id;

  -- Profile is complete if full_name is set
  RETURN v_full_name IS NOT NULL AND LENGTH(TRIM(v_full_name)) > 0;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
 CREATE OR REPLACE FUNCTION public.is_trip_owner(p_trip_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips
    WHERE id = p_trip_id AND owner_id = p_user_id
  );
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
 CREATE OR REPLACE FUNCTION public.is_trip_participant(p_trip_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
  );
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
 CREATE OR REPLACE FUNCTION public.is_trip_participant_with_role(p_trip_id uuid, p_user_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = p_user_id
      AND role = ANY(p_roles)
  );
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
 CREATE OR REPLACE FUNCTION public.notify_chat_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  -- Only notify for user messages (not bot/system)
  IF NEW.message_type = 'user' THEN
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-chat-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'chat_messages',
          'record', jsonb_build_object(
            'id', NEW.id,
            'trip_id', NEW.trip_id,
            'user_id', NEW.user_id,
            'content', NEW.content,
            'message_type', NEW.message_type,
            'created_at', NEW.created_at
          )
        )
      );
  END IF;

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 CREATE OR REPLACE FUNCTION public.notify_expense_added()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-expense-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'expenses',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'description', NEW.description,
          'amount', NEW.amount,
          'currency', NEW.currency,
          'payer_id', NEW.payer_id,
          'created_by', NEW.created_by,
          'date', NEW.date
        )
      )
    );

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
 CREATE OR REPLACE FUNCTION public.notify_invite_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  -- Invoke edge function via pg_net (requires pg_net extension)
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-invite-accepted-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'trip_participants',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'user_id', NEW.user_id,
          'role', NEW.role,
          'joined_at', NEW.joined_at
        )
      )
    );

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
 CREATE OR REPLACE FUNCTION public.notify_itinerary_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-itinerary-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', 'itinerary_items',
        'record', jsonb_build_object(
          'id', NEW.id,
          'trip_id', NEW.trip_id,
          'item_type', NEW.type,
          'title', NEW.title,
          'start_time', NEW.start_time,
          'end_time', NEW.end_time,
          'created_by', NEW.created_by
        )
      )
    );

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
 CREATE OR REPLACE FUNCTION public.notify_settlement_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'pg_temp'
AS $function$
BEGIN
  -- Only notify when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-settlement-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'type', 'UPDATE',
          'table', 'settlements',
          'record', jsonb_build_object(
            'id', NEW.id,
            'trip_id', NEW.trip_id,
            'from_user_id', NEW.from_user_id,
            'to_user_id', NEW.to_user_id,
            'amount', NEW.amount,
            'currency', NEW.currency,
            'status', NEW.status,
            'old_status', OLD.status
          )
        )
      );
  END IF;

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
 CREATE OR REPLACE FUNCTION public.notify_settlement_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger if status changed from pending to settled
  IF OLD.status = 'pending' AND NEW.status = 'settled' THEN
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-settlement-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'type', 'UPDATE',
          'table', 'settlements',
          'record', jsonb_build_object(
            'id', NEW.id,
            'trip_id', NEW.trip_id,
            'from_user_id', NEW.from_user_id,
            'to_user_id', NEW.to_user_id,
            'amount', NEW.amount,
            'currency', NEW.currency,
            'status', NEW.status,
            'settled_at', NEW.settled_at
          ),
          'old_record', jsonb_build_object(
            'status', OLD.status
          )
        )
      );
  END IF;

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE OR REPLACE FUNCTION public.set_public_users_id_from_auth_context()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  IF NEW.id IS NULL THEN
    IF current_uid IS NULL THEN
      RAISE EXCEPTION 'auth.uid() is null; cannot infer id for public.users insert';
    END IF;
    NEW.id := current_uid;
  END IF;

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
 CREATE OR REPLACE FUNCTION public.update_access_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
 CREATE OR REPLACE FUNCTION public.update_analysis_runs_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
 CREATE OR REPLACE FUNCTION public.update_chat_messages_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 CREATE OR REPLACE FUNCTION public.update_pattern_weights_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
 CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
 CREATE OR REPLACE FUNCTION public.validate_join_dates_within_trip()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_trip_start DATE;
  v_trip_end DATE;
BEGIN
  -- Skip validation if no date range set
  IF NEW.join_start_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get trip dates
  SELECT start_date, end_date
  INTO v_trip_start, v_trip_end
  FROM public.trips
  WHERE id = NEW.trip_id;

  -- Validate dates are within trip dates
  IF NEW.join_start_date < v_trip_start THEN
    RAISE EXCEPTION 'join_start_date (%) cannot be before trip start_date (%)', NEW.join_start_date, v_trip_start;
  END IF;

  IF NEW.join_end_date > v_trip_end THEN
    RAISE EXCEPTION 'join_end_date (%) cannot be after trip end_date (%)', NEW.join_end_date, v_trip_end;
  END IF;

  RETURN NEW;
END;
$function$
;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       





 -- Triggers                                                                                                                                                                                                
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 CREATE TRIGGER update_access_requests_updated_at BEFORE UPDATE ON public.access_requests FOR EACH ROW EXECUTE FUNCTION update_access_requests_updated_at();                                                
 CREATE TRIGGER analysis_runs_updated_at BEFORE UPDATE ON public.analysis_runs FOR EACH ROW EXECUTE FUNCTION update_analysis_runs_timestamp();                                                              
 CREATE TRIGGER on_chat_message_insert AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION notify_chat_message();                                                                            
 CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION update_chat_messages_updated_at();                                                      
 CREATE TRIGGER update_daily_metrics_updated_at BEFORE UPDATE ON public.daily_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();                                                             
 CREATE TRIGGER on_expense_insert AFTER INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION notify_expense_added();                                                                                     
 CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();                                                                       
 CREATE TRIGGER on_itinerary_item_insert AFTER INSERT ON public.itinerary_items FOR EACH ROW EXECUTE FUNCTION notify_itinerary_change();                                                                    
 CREATE TRIGGER on_itinerary_item_update AFTER UPDATE ON public.itinerary_items FOR EACH ROW EXECUTE FUNCTION notify_itinerary_change();                                                                    
 CREATE TRIGGER update_itinerary_items_updated_at BEFORE UPDATE ON public.itinerary_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();                                                         
 CREATE TRIGGER pattern_weights_updated_at BEFORE UPDATE ON public.pattern_weights FOR EACH ROW EXECUTE FUNCTION update_pattern_weights_timestamp();                                                        
 CREATE TRIGGER update_pattern_weights_updated_at BEFORE UPDATE ON public.pattern_weights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();                                                         
 CREATE TRIGGER before_insert_set_public_user_id BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_public_users_id_from_auth_context();                                                    
 CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();                                                                          
 CREATE TRIGGER on_settlement_status_change AFTER UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION notify_settlement_status_change();                                                             
 CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();                                                                 
 CREATE TRIGGER enforce_invite_rate_limit BEFORE INSERT ON public.trip_invites FOR EACH ROW EXECUTE FUNCTION check_invite_rate_limit();                                                                     
 CREATE TRIGGER on_trip_participant_insert AFTER INSERT ON public.trip_participants FOR EACH ROW EXECUTE FUNCTION notify_invite_accepted();                                                                 
 CREATE TRIGGER validate_join_dates_trigger BEFORE INSERT OR UPDATE OF join_start_date, join_end_date, trip_id ON public.trip_participants FOR EACH ROW EXECUTE FUNCTION validate_join_dates_within_trip(); 
 CREATE TRIGGER on_trip_created AFTER INSERT ON public.trips FOR EACH ROW EXECUTE FUNCTION create_trip_owner_participant();                                                                                 
 CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();                                                                             




 -- RLS Enable                                                             
 ------------------------------------------------------------------------- 
 ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;             
 ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;               
 ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;               
 ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;               
 ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;        
 ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;                    
 ALTER TABLE public.feedback_signals ENABLE ROW LEVEL SECURITY;            
 ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;                    
 ALTER TABLE public.invite_rate_limits ENABLE ROW LEVEL SECURITY;          
 ALTER TABLE public.itinerary_item_participants ENABLE ROW LEVEL SECURITY; 
 ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;             
 ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;                 
 ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;           
 ALTER TABLE public.migration_history ENABLE ROW LEVEL SECURITY;           
 ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;           
 ALTER TABLE public.pattern_weights ENABLE ROW LEVEL SECURITY;             
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;                    
 ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;                 
 ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;                
 ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;           
 ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;                       



 -- RLS Policies                                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ 
 CREATE POLICY Owners can update access requests ON public.access_requests FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM trip_participants
  WHERE ((trip_participants.trip_id = access_requests.trip_id) AND (trip_participants.user_id = auth.uid()) AND (trip_participants.role = 'owner'::text)))));                                                                                                                                                                           
 CREATE POLICY Owners can view trip access requests ON public.access_requests FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM trip_participants
  WHERE ((trip_participants.trip_id = access_requests.trip_id) AND (trip_participants.user_id = auth.uid()) AND (trip_participants.role = 'owner'::text)))));                                                                                                                                                                        
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Users can view own access requests ON public.access_requests FOR SELECT TO public USING ((auth.uid() = user_id));                                                                                                                                                                                                                                                                                                                                                            
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Users can read messages from their trips ON public.chat_messages FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM trip_participants
  WHERE ((trip_participants.trip_id = chat_messages.trip_id) AND (trip_participants.user_id = auth.uid())))));                                                                                                                                                                                                                     
 CREATE POLICY All authenticated users can read daily metrics ON public.daily_metrics FOR SELECT TO authenticated USING (true);                                                                                                                                                                                                                                                                                                                                                             
 CREATE POLICY Service role can update daily metrics ON public.daily_metrics FOR ALL TO service_role USING (true);                                                                                                                                                                                                                                                                                                                                                                          
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Expense creator can delete participants ON public.expense_participants FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM expenses
  WHERE ((expenses.id = expense_participants.expense_id) AND (expenses.created_by = auth.uid())))));                                                                                                                                                                                                                                  
 CREATE POLICY Expense creator can update participants ON public.expense_participants FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM expenses
  WHERE ((expenses.id = expense_participants.expense_id) AND (expenses.created_by = auth.uid())))));                                                                                                                                                                                                                                  
 CREATE POLICY Users can read expense participants ON public.expense_participants FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM expenses
  WHERE ((expenses.id = expense_participants.expense_id) AND can_user_see_expense(expenses.date, expenses.trip_id, auth.uid())))));                                                                                                                                                                                                       
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Users can delete own expenses ON public.expenses FOR DELETE TO public USING (((auth.uid() = created_by) OR is_trip_owner(trip_id, auth.uid())));                                                                                                                                                                                                                                                                                                                             
 CREATE POLICY Users can read expenses based on join date ON public.expenses FOR SELECT TO public USING (can_user_see_expense(date, trip_id, auth.uid()));                                                                                                                                                                                                                                                                                                                                  
 CREATE POLICY Users can update own expenses ON public.expenses FOR UPDATE TO public USING ((auth.uid() = created_by));                                                                                                                                                                                                                                                                                                                                                                     
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Users can view their own feedback signals ON public.feedback_signals FOR SELECT TO authenticated USING ((auth.uid() = user_id));                                                                                                                                                                                                                                                                                                                                             
 CREATE POLICY Authenticated users can read FX rates ON public.fx_rates FOR SELECT TO authenticated USING (true);                                                                                                                                                                                                                                                                                                                                                                           
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Item creator and trip owner can remove participants ON public.itinerary_item_participants FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM itinerary_items ii
  WHERE ((ii.id = itinerary_item_participants.itinerary_item_id) AND ((ii.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM trips t
          WHERE ((t.id = ii.trip_id) AND (t.owner_id = auth.uid())))))))));                                                                             
 CREATE POLICY Trip participants can see item participants ON public.itinerary_item_participants FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (itinerary_items ii
     JOIN trip_participants tp ON ((tp.trip_id = ii.trip_id)))
  WHERE ((ii.id = itinerary_item_participants.itinerary_item_id) AND (tp.user_id = auth.uid())))));                                                                                                                                              
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Users can delete own itinerary items ON public.itinerary_items FOR DELETE TO public USING (((auth.uid() = created_by) OR is_trip_owner(trip_id, auth.uid())));                                                                                                                                                                                                                                                                                                               
 CREATE POLICY Users can read itinerary items based on join date ON public.itinerary_items FOR SELECT TO public USING (can_user_see_item(start_time, trip_id, auth.uid()));                                                                                                                                                                                                                                                                                                                 
 CREATE POLICY Users can update itinerary items they created or are involved i ON public.itinerary_items FOR UPDATE TO public USING (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM itinerary_item_participants
  WHERE ((itinerary_item_participants.itinerary_item_id = itinerary_items.id) AND (itinerary_item_participants.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = itinerary_items.trip_id) AND (trips.owner_id = auth.uid())))))); 
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Trip participants can read all media ON public.media_files FOR SELECT TO public USING (is_trip_participant(trip_id, auth.uid()));                                                                                                                                                                                                                                                                                                                                            
 CREATE POLICY Users can delete own media ON public.media_files FOR DELETE TO public USING (((auth.uid() = user_id) OR is_trip_owner(trip_id, auth.uid())));                                                                                                                                                                                                                                                                                                                                
 CREATE POLICY Users can update own media ON public.media_files FOR UPDATE TO public USING ((auth.uid() = user_id));                                                                                                                                                                                                                                                                                                                                                                        
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Trip participants can view reactions ON public.message_reactions FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (chat_messages cm
     JOIN trip_participants tp ON ((tp.trip_id = cm.trip_id)))
  WHERE ((cm.id = message_reactions.message_id) AND (tp.user_id = auth.uid())))));                                                                                                                                                                                  
 CREATE POLICY Users can delete their own reactions ON public.message_reactions FOR DELETE TO public USING ((user_id = auth.uid()));                                                                                                                                                                                                                                                                                                                                                        
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY notification_logs_select_own ON public.notification_logs FOR SELECT TO public USING ((auth.uid() = user_id));                                                                                                                                                                                                                                                                                                                                                                
 CREATE POLICY notification_logs_select_trip_participant ON public.notification_logs FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM trip_participants
  WHERE ((trip_participants.trip_id = notification_logs.trip_id) AND (trip_participants.user_id = auth.uid())))));                                                                                                                                                                                                            
 CREATE POLICY All authenticated users can read pattern weights ON public.pattern_weights FOR SELECT TO authenticated USING (true);                                                                                                                                                                                                                                                                                                                                                         
 CREATE POLICY Service role can update pattern weights ON public.pattern_weights FOR ALL TO service_role USING (true);                                                                                                                                                                                                                                                                                                                                                                      
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Users can read own profile ON public.profiles FOR SELECT TO public USING (((auth.uid() = id) AND (is_deleted = false)));                                                                                                                                                                                                                                                                                                                                                     
 CREATE POLICY Users can update own profile ON public.profiles FOR UPDATE TO public USING (((auth.uid() = id) AND (is_deleted = false)));                                                                                                                                                                                                                                                                                                                                                   
 CREATE POLICY Settlement parties can update status ON public.settlements FOR UPDATE TO public USING (((auth.uid() = from_user_id) OR (auth.uid() = to_user_id)));                                                                                                                                                                                                                                                                                                                          
 CREATE POLICY Trip owners can delete settlements ON public.settlements FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = settlements.trip_id) AND (t.owner_id = auth.uid())))));                                                                                                                                                                                                                                                                             
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Users can view settlements for their trips ON public.settlements FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM trip_participants tp
  WHERE ((tp.trip_id = settlements.trip_id) AND (tp.user_id = auth.uid())))));                                                                                                                                                                                                                                                  
 CREATE POLICY Anyone can view invite by token ON public.trip_invites FOR SELECT TO public USING ((status = 'pending'::text));                                                                                                                                                                                                                                                                                                                                                              
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Trip owners can delete invites ON public.trip_invites FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_invites.trip_id) AND (trips.owner_id = auth.uid())))));                                                                                                                                                                                                                                                                         
 CREATE POLICY Trip owners can update invites ON public.trip_invites FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_invites.trip_id) AND (trips.owner_id = auth.uid())))));                                                                                                                                                                                                                                                                         
 CREATE POLICY Trip owners can view trip invites ON public.trip_invites FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_invites.trip_id) AND (trips.owner_id = auth.uid())))));                                                                                                                                                                                                                                                                      
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Trip owners can remove participants ON public.trip_participants FOR DELETE TO public USING ((is_trip_owner(trip_id, auth.uid()) AND (user_id <> auth.uid())));                                                                                                                                                                                                                                                                                                               
 CREATE POLICY Trip owners can update participant roles ON public.trip_participants FOR UPDATE TO public USING (is_trip_owner(trip_id, auth.uid()));                                                                                                                                                                                                                                                                                                                                        
 CREATE POLICY Users can read participants of their trips ON public.trip_participants FOR SELECT TO public USING (can_user_read_trip_participant(trip_id, auth.uid()));                                                                                                                                                                                                                                                                                                                     
 null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 CREATE POLICY Users can delete own trips ON public.trips FOR DELETE TO public USING ((auth.uid() = owner_id));                                                                                                                                                                                                                                                                                                                                                                             
 CREATE POLICY Users can read trips they participate in ON public.trips FOR SELECT TO public USING (is_trip_participant(id, auth.uid()));                                                                                                                                                                                                                                                                                                                                                   
 CREATE POLICY Users can update own trips ON public.trips FOR UPDATE TO public USING ((auth.uid() = owner_id));                                                                                                                                                                                                                                                                                                                                                                             




 -- Table Comments                                                                                                                                                                                                                                                             
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 COMMENT ON TABLE public.access_requests IS 'Tracks viewer requests to upgrade to participant role';                                                                                                                                                                           
 COMMENT ON TABLE public.analysis_runs IS 'Tracks each pattern analysis execution for audit trail and determining which feedback signals to process';                                                                                                                          
 COMMENT ON TABLE public.chat_messages IS 'Stores chat messages for trip group conversations with AI bot integration';                                                                                                                                                         
 COMMENT ON TABLE public.daily_metrics IS 'Daily aggregated metrics for RL system performance tracking';                                                                                                                                                                       
 COMMENT ON TABLE public.expense_participants IS 'Expense split tracking between trip participants';                                                                                                                                                                           
 COMMENT ON TABLE public.expenses IS 'Trip expenses with multi-currency support and date-scoped visibility';                                                                                                                                                                   
 COMMENT ON TABLE public.feedback_signals IS 'Stores user feedback on parser results for reinforcement learning';                                                                                                                                                              
 COMMENT ON TABLE public.fx_rates IS 'Cached exchange rates fetched on-demand from exchangerate.host API.
   Rates are immutable once stored to ensure stable conversions over time.';                                                                                         
 COMMENT ON TABLE public.itinerary_item_participants IS 'Tracks which trip participants are involved in specific itinerary items. If no rows exist for an item, all trip participants are assumed to be involved.';                                                            
 COMMENT ON TABLE public.itinerary_items IS 'Trip itinerary items (flights, stays, activities) with date-scoped visibility';                                                                                                                                                   
 COMMENT ON TABLE public.media_files IS 'Trip photos and videos with date tagging';                                                                                                                                                                                            
 COMMENT ON TABLE public.message_reactions IS 'Stores emoji reactions on chat messages';                                                                                                                                                                                       
 COMMENT ON TABLE public.notification_logs IS 'Stores all notification delivery attempts for auditing and testing. Status: sent (successfully delivered), skipped (user preferences disabled), failed (delivery error). Used by edge functions to log notification activity.'; 
 COMMENT ON TABLE public.pattern_weights IS 'Stores learned pattern performance metrics for RL parser';                                                                                                                                                                        
 COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';                                                                                                                                                                                                     
 COMMENT ON TABLE public.settlements IS 'Stores optimized settlement suggestions between trip participants, tracking payment status and history';                                                                                                                              
 COMMENT ON TABLE public.trip_participants IS 'Many-to-many relationship between users and trips with roles';                                                                                                                                                                  
 COMMENT ON TABLE public.trips IS 'Trip entities with basic metadata';                                                                                                                                                                                                         



 -- Column Comments                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 COMMENT ON COLUMN public.access_requests.status IS 'Request status: pending, approved, rejected';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 COMMENT ON COLUMN public.access_requests.requested_at IS 'When the request was made';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
 COMMENT ON COLUMN public.access_requests.responded_at IS 'When organizer responded to the request';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
 COMMENT ON COLUMN public.access_requests.responded_by IS 'Which organizer approved/rejected the request';                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
 COMMENT ON COLUMN public.analysis_runs.started_at IS 'When the analysis started';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 COMMENT ON COLUMN public.analysis_runs.completed_at IS 'When the analysis completed (NULL if still running or failed)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                 
 COMMENT ON COLUMN public.analysis_runs.status IS 'Status: running (in progress), success (completed), failed (error), partial (some patterns updated)';                                                                                                                                                                                                                                                                                                                                                                                                                                 
 COMMENT ON COLUMN public.analysis_runs.signals_processed IS 'Number of feedback signals analyzed in this run';                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
 COMMENT ON COLUMN public.analysis_runs.signals_start_time IS 'Timestamp of earliest signal analyzed (for audit)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 COMMENT ON COLUMN public.analysis_runs.signals_end_time IS 'Timestamp of latest signal analyzed (for audit)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
 COMMENT ON COLUMN public.analysis_runs.error_message IS 'Error details if status=failed';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
 COMMENT ON COLUMN public.chat_messages.message_type IS 'Type of message: user (from participant), bot (from TripThread AI), system (notifications)';                                                                                                                                                                                                                                                                                                                                                                                                                                    
 COMMENT ON COLUMN public.chat_messages.attachments IS 'Array of attachment objects with {url, type, name, size}';                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 COMMENT ON COLUMN public.chat_messages.metadata IS 'Additional data like parsed expense/itinerary IDs, AI parsing details';                                                                                                                                                                                                                                                                                                                                                                                                                                                             
 COMMENT ON COLUMN public.daily_metrics.analysis_run_id IS 'Foreign key to analysis_runs table for audit trail';                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
 COMMENT ON COLUMN public.expense_participants.share_amount IS 'User share in cents/minor units';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 COMMENT ON COLUMN public.expenses.amount IS 'Amount in cents/minor units to avoid floating point issues';                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
 COMMENT ON COLUMN public.expenses.date IS 'Date of the expense (used for date scoping)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
 COMMENT ON COLUMN public.feedback_signals.corrected_values IS 'User-corrected values for parsed fields (amount, currency, description, split, payer, participants)';                                                                                                                                                                                                                                                                                                                                                                                                                    
 COMMENT ON COLUMN public.feedback_signals.correction_details IS 'Array of field-level corrections with before/after values and failure types';                                                                                                                                                                                                                                                                                                                                                                                                                                          
 COMMENT ON COLUMN public.feedback_signals.failure_classification IS 'High-level classification of why parsing failed: extraction_error (pattern matched but got wrong value), recognition_error (pattern did not find field), ambiguity (multiple valid interpretations)';                                                                                                                                                                                                                                                                                                              
 COMMENT ON COLUMN public.fx_rates.base_currency IS 'Base currency code (ISO 4217, 3 letters) - typically EUR';                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
 COMMENT ON COLUMN public.fx_rates.target_currency IS 'Target currency code (ISO 4217, 3 letters)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 COMMENT ON COLUMN public.fx_rates.rate IS 'Exchange rate with 6 decimal precision. Example: 1 EUR = 1.123456 USD';                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 COMMENT ON COLUMN public.fx_rates.date IS 'Date for which this rate is valid (YYYY-MM-DD)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
 COMMENT ON COLUMN public.itinerary_items.start_time IS 'Start time of the itinerary item (used for date scoping)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 COMMENT ON COLUMN public.itinerary_items.links IS 'Array of link objects with structure: [{title: string, url: string}]';                                                                                                                                                                                                                                                                                                                                                                                                                                                               
 COMMENT ON COLUMN public.itinerary_items.metadata IS 'Type-specific fields. For transport: transport_type, flight_number, departure_location, arrival_location, booking_reference. For accommodation: accommodation_type, check_in_time, check_out_time, confirmation_number. For dining: restaurant_name, cuisine_type, price_range. For activity: activity_type, duration, booking_required, meeting_point. For sightseeing: attraction_name, admission_required, opening_hours.';                                                                                                    
 COMMENT ON COLUMN public.media_files.date_taken IS 'Date photo/video was taken (auto-tagged to trip day)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 COMMENT ON COLUMN public.message_reactions.emoji IS 'Emoji character or unicode string (max 10 chars)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 
 COMMENT ON COLUMN public.notification_logs.event_type IS 'Type of event that triggered notification: invites, itinerary, expenses, photos, chat, settlements';                                                                                                                                                                                                                                                                                                                                                                                                                          
 COMMENT ON COLUMN public.notification_logs.notification_type IS 'Delivery channel: email (Resend), push (Expo/Web Push - Phase 4)';                                                                                                                                                                                                                                                                                                                                                                                                                                                     
 COMMENT ON COLUMN public.notification_logs.status IS 'Delivery status: sent (successfully sent), skipped (preferences disabled or RLS blocked), failed (delivery error)';                                                                                                                                                                                                                                                                                                                                                                                                               
 COMMENT ON COLUMN public.notification_logs.skip_reason IS 'Reason for skipped status: preferences_disabled, not_participant, rls_blocked, viewer_role, etc.';                                                                                                                                                                                                                                                                                                                                                                                                                           
 COMMENT ON COLUMN public.notification_logs.metadata IS 'Event-specific data as JSONB: { "expense_amount": 50.00, "expense_description": "Dinner", "itinerary_title": "Flight to Paris", etc. }';                                                                                                                                                                                                                                                                                                                                                                                        
 COMMENT ON COLUMN public.pattern_weights.last_analyzed_at IS 'Timestamp of last pattern analysis that updated this pattern';                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 COMMENT ON COLUMN public.pattern_weights.analysis_run_id IS 'Foreign key to analysis_runs table for audit trail';                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 COMMENT ON COLUMN public.profiles.plan IS 'Subscription plan: free or pro';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
 COMMENT ON COLUMN public.profiles.plan_expires_at IS 'When the pro plan expires (null for free plan)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
 COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID for billing';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
 COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp when account was deleted (soft delete)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
 COMMENT ON COLUMN public.profiles.is_deleted IS 'Boolean flag indicating if account is deleted (for efficient filtering)';                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 COMMENT ON COLUMN public.settlements.amount IS 'Settlement amount in minor currency units (cents). Always positive.';                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
 COMMENT ON COLUMN public.settlements.status IS 'Payment status: pending (suggested but not paid) or settled (marked as paid by either party)';                                                                                                                                                                                                                                                                                                                                                                                                                                          
 COMMENT ON COLUMN public.settlements.settled_at IS 'Timestamp when settlement was marked as paid';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
 COMMENT ON COLUMN public.settlements.settled_by IS 'User who marked the settlement as paid (either from_user or to_user)';                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 COMMENT ON COLUMN public.settlements.note IS 'Optional note added when marking as paid (e.g., "Paid via Venmo")';                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
 COMMENT ON COLUMN public.trip_participants.role IS 'User role: owner, participant, or viewer';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
 COMMENT ON COLUMN public.trip_participants.joined_at IS 'When user joined trip (for partial joiners)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
 COMMENT ON COLUMN public.trip_participants.invited_by IS 'User who invited this participant';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
 COMMENT ON COLUMN public.trip_participants.join_start_date IS 'Start date for partial joiners. NULL means joining from trip start.';                                                                                                                                                                                                                                                                                                                                                                                                                                                    
 COMMENT ON COLUMN public.trip_participants.join_end_date IS 'End date for partial joiners. NULL means joining until trip end.';                                                                                                                                                                                                                                                                                                                                                                                                                                                         
 COMMENT ON COLUMN public.trip_participants.notification_preferences IS 'Per-trip notification preferences. NULL inherits from profiles.notification_preferences. Structure: {"invites": bool|null, "itinerary": bool|null, "expenses": bool|null, "photos": bool|null, "chat": bool|null, "settlements": bool|null}. Event types: invites=trip invitations, itinerary=itinerary changes, expenses=expense updates, photos=photo uploads, chat=chat messages, settlements=settlement status changes. null=inherit from global, true=enable for this trip, false=disable for this trip.'; 
 COMMENT ON COLUMN public.trips.start_date IS 'Trip start date (ISO 8601)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 COMMENT ON COLUMN public.trips.end_date IS 'Trip end date (ISO 8601)';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
 COMMENT ON COLUMN public.trips.cover_image_url IS 'URL to cover image in Supabase Storage';                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
 COMMENT ON COLUMN public.trips.base_currency IS 'Base currency for trip expenses and settlements. All expense conversions
   use this as the reference currency. Defaults to EUR.';                                                                                                                                                                                                                                                                                                                                                                                                     




