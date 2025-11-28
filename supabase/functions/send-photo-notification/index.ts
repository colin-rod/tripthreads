/**
 * Supabase Edge Function: Send Photo Notification
 *
 * STUB: This is a placeholder for Phase 3 implementation.
 * Will be triggered when a photo is uploaded to a trip.
 * Sends email notifications to all trip participants (except the uploader)
 * who have photo notifications enabled.
 *
 * Trigger: Database trigger on media_files INSERT (Phase 3)
 *
 * Environment Variables:
 * - RESEND_API_KEY: API key for Resend email service
 * - FRONTEND_URL: Base URL of the frontend application
 *
 * CRO-767: Edge Functions to send push on trip events
 * Phase 3: Photo upload notifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async req => {
  try {
    const payload = await req.json()

    console.log('Photo notification stub called:', payload)

    return new Response(
      JSON.stringify({
        message: 'Photo notifications not yet implemented (Phase 3)',
        payload,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-photo-notification stub:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
