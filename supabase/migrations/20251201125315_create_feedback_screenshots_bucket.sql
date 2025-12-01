-- ============================================================================
-- Migration: Create feedback-screenshots storage bucket
-- Description: Dedicated public bucket for feedback screenshots with indefinite retention
-- Date: 2025-12-01
-- ============================================================================

-- Create feedback-screenshots bucket (public read access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR FEEDBACK SCREENSHOTS
-- ============================================================================

-- Allow authenticated users to upload screenshots
-- Note: Edge Functions use service role key, so this policy is permissive
CREATE POLICY "Anyone can upload feedback screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
  );

-- Allow anyone to read screenshots (public bucket)
CREATE POLICY "Anyone can read feedback screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feedback-screenshots');

-- Optional: Allow deletion (for cleanup scripts or manual cleanup if needed)
CREATE POLICY "Service role can delete feedback screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'feedback-screenshots'
    AND auth.role() = 'service_role'
  );
