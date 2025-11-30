-- Rename users table to profiles
-- This prevents confusion with auth.users and follows common Supabase patterns

-- Step 1: Drop all dependent foreign keys
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_owner_id_fkey;
ALTER TABLE public.trip_participants DROP CONSTRAINT IF EXISTS trip_participants_user_id_fkey;
ALTER TABLE public.trip_participants DROP CONSTRAINT IF EXISTS trip_participants_invited_by_fkey;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payer_id_fkey;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
ALTER TABLE public.expense_participants DROP CONSTRAINT IF EXISTS expense_participants_user_id_fkey;
ALTER TABLE public.itinerary_items DROP CONSTRAINT IF EXISTS itinerary_items_created_by_fkey;
ALTER TABLE public.itinerary_item_participants DROP CONSTRAINT IF EXISTS itinerary_item_participants_user_id_fkey;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_user_id_fkey;
ALTER TABLE public.trip_invites DROP CONSTRAINT IF EXISTS trip_invites_invited_by_fkey;
ALTER TABLE public.access_requests DROP CONSTRAINT IF EXISTS access_requests_user_id_fkey;
ALTER TABLE public.access_requests DROP CONSTRAINT IF EXISTS access_requests_responded_by_fkey;
ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_from_user_id_fkey;
ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_to_user_id_fkey;
ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_settled_by_fkey;
ALTER TABLE public.media_files DROP CONSTRAINT IF EXISTS media_files_user_id_fkey;

-- Step 2: Rename the table
ALTER TABLE public.users RENAME TO profiles;

-- Step 3: Rename the primary key constraint
ALTER TABLE public.profiles RENAME CONSTRAINT users_pkey TO profiles_pkey;

-- Step 4: Rename the unique constraint
ALTER TABLE public.profiles RENAME CONSTRAINT users_email_key TO profiles_email_key;

-- Step 5: Rename the check constraint
ALTER TABLE public.profiles RENAME CONSTRAINT users_plan_check TO profiles_plan_check;

-- Step 6: Rename indexes
ALTER INDEX IF EXISTS idx_users_email RENAME TO idx_profiles_email;
ALTER INDEX IF EXISTS idx_users_plan RENAME TO idx_profiles_plan;
ALTER INDEX IF EXISTS idx_users_profile_completed RENAME TO idx_profiles_profile_completed;

-- Step 7: Update the foreign key reference to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 8: Recreate all foreign keys that reference profiles
ALTER TABLE public.trips ADD CONSTRAINT trips_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id);

ALTER TABLE public.trip_participants ADD CONSTRAINT trip_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.trip_participants ADD CONSTRAINT trip_participants_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id);

ALTER TABLE public.expenses ADD CONSTRAINT expenses_payer_id_fkey
  FOREIGN KEY (payer_id) REFERENCES public.profiles(id);

ALTER TABLE public.expenses ADD CONSTRAINT expenses_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.expense_participants ADD CONSTRAINT expense_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.itinerary_items ADD CONSTRAINT itinerary_items_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.itinerary_item_participants ADD CONSTRAINT itinerary_item_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.message_reactions ADD CONSTRAINT message_reactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.trip_invites ADD CONSTRAINT trip_invites_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id);

ALTER TABLE public.access_requests ADD CONSTRAINT access_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.access_requests ADD CONSTRAINT access_requests_responded_by_fkey
  FOREIGN KEY (responded_by) REFERENCES public.profiles(id);

ALTER TABLE public.settlements ADD CONSTRAINT settlements_from_user_id_fkey
  FOREIGN KEY (from_user_id) REFERENCES public.profiles(id);

ALTER TABLE public.settlements ADD CONSTRAINT settlements_to_user_id_fkey
  FOREIGN KEY (to_user_id) REFERENCES public.profiles(id);

ALTER TABLE public.settlements ADD CONSTRAINT settlements_settled_by_fkey
  FOREIGN KEY (settled_by) REFERENCES public.profiles(id);

ALTER TABLE public.media_files ADD CONSTRAINT media_files_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Step 9: Update triggers
DROP TRIGGER IF EXISTS before_insert_set_public_user_id ON public.profiles;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.profiles;

CREATE TRIGGER before_insert_set_public_profile_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_public_users_id_from_auth_context();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Update RLS policies (they reference the table by name)
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of trip participants" ON public.profiles;

-- Recreate policies with same logic
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles of trip participants"
  ON public.profiles
  FOR SELECT
  USING (
    id IN (
      SELECT tp.user_id
      FROM trip_participants tp
      WHERE tp.trip_id IN (
        SELECT trip_id
        FROM trip_participants
        WHERE user_id = auth.uid()
      )
    )
  );

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add comment to table
COMMENT ON TABLE public.profiles IS 'User profile data - extends auth.users with application-specific fields';
