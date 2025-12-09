-- Debug trip INSERT RLS issue
-- Run this as the authenticated user to see what's happening

-- First, check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'trips';

-- Check all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'trips'
ORDER BY cmd, policyname;

-- Test auth.uid() function
SELECT auth.uid() as current_user_id;

-- Try to understand why the policy isn't matching
-- The policy is: WITH CHECK (auth.uid() = owner_id)
-- So auth.uid() must return the correct user ID
