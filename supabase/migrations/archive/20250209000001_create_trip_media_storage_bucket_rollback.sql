-- Rollback Migration: Remove trip-media storage bucket and policies
-- Date: 2025-02-09

-- Drop all storage policies for trip-media bucket
DROP POLICY IF EXISTS "Trip participants can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Trip participants can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media or owners can delete any" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;

-- Delete the storage bucket (this will also delete all files in the bucket)
DELETE FROM storage.buckets WHERE id = 'trip-media';
