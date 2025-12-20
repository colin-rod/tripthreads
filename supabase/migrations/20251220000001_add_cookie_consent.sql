-- ============================================================================
-- Add Cookie Consent and Legal Acceptance Tracking
-- ============================================================================
-- Date: 2025-12-20
-- Issue: CRO-777 - Legal Documentation (Terms, Privacy, Cookies)
-- Epic: E13 - Production Readiness
--
-- Description:
-- Adds columns to profiles table to track:
-- - Cookie consent preferences (GDPR compliance)
-- - Terms of Service acceptance timestamp
-- - Privacy Policy acceptance timestamp
-- ============================================================================

-- Add cookie consent tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cookie_consent JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cookie_consent_updated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for querying users who need to re-consent (when version changes)
CREATE INDEX IF NOT EXISTS idx_profiles_cookie_consent_version
ON public.profiles ((cookie_consent->>'version'));

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.cookie_consent IS
'User cookie consent preferences with version tracking. Format: {"necessary": true, "performance": boolean, "functional": boolean, "analytics": boolean, "timestamp": "ISO8601", "version": number}';

COMMENT ON COLUMN public.profiles.cookie_consent_updated_at IS
'Timestamp when user last updated their cookie consent preferences';

COMMENT ON COLUMN public.profiles.tos_accepted_at IS
'Timestamp when user accepted Terms of Service (at signup or update)';

COMMENT ON COLUMN public.profiles.privacy_accepted_at IS
'Timestamp when user accepted Privacy Policy (at signup or update)';
