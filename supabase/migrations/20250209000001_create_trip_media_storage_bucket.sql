-- Migration: Create trip-media storage bucket with RLS policies
-- Description: Dedicated storage bucket for trip photos/videos with proper access control
-- Date: 2025-02-09
-- Note: Run this as postgres user or superuser via Supabase Dashboard

-- Create the storage bucket for trip media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-media',
  'trip-media',
  true, -- Public bucket for easy image serving
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
-- Note: This should already be enabled by Supabase, but we ensure it here
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Trip participants can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Trip participants can view media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media or owners can delete any" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;

-- Storage policies for trip-media bucket

-- Policy: Users can upload media if they are trip participants
CREATE POLICY "Trip participants can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-media'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT trip_id
    FROM public.trip_participants
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can read media if they are trip participants
CREATE POLICY "Trip participants can view media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'trip-media'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT trip_id
    FROM public.trip_participants
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete their own media OR trip owners can delete any media
CREATE POLICY "Users can delete their own media or owners can delete any"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-media'
  AND (
    -- User uploaded this file
    owner = auth.uid()
    OR
    -- User is trip owner
    (storage.foldername(name))[1]::uuid IN (
      SELECT trip_id
      FROM public.trip_participants
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  )
);

-- Policy: Users can update their own media metadata
CREATE POLICY "Users can update their own media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trip-media'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'trip-media'
  AND owner = auth.uid()
);
