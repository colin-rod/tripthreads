/**
 * Supabase Edge Function: Send Access Request Email
 *
 * Triggered when a viewer requests edit access to a trip.
 * Sends an email notification to the trip organizer with approve/reject links.
 *
 * Trigger: Database trigger on access_requests INSERT
 *
 * Environment Variables:
 * - RESEND_API_KEY: API key for Resend email service
 * - FRONTEND_URL: Base URL of the frontend application
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'

interface AccessRequestPayload {
  type: 'INSERT'
  table: 'access_requests'
  record: {
    id: string
    trip_id: string
    user_id: string
    status: string
    requested_at: string
  }
}

serve(async req => {
  try {
    // Parse the webhook payload
    const payload: AccessRequestPayload = await req.json()

    // Only process INSERT events with pending status
    if (payload.type !== 'INSERT' || payload.record.status !== 'pending') {
      return new Response(JSON.stringify({ message: 'Ignored: Not a pending access request' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get access request details with user and trip info
    const { data: request, error: requestError } = await supabase
      .from('access_requests')
      .select(
        `
        id,
        trip_id,
        user_id,
        requested_at,
        user:users!access_requests_user_id_fkey (
          id,
          email,
          full_name
        ),
        trip:trips (
          id,
          name,
          owner_id,
          owner:users!trips_owner_id_fkey (
            id,
            email,
            full_name
          )
        )
      `
      )
      .eq('id', payload.record.id)
      .single()

    if (requestError || !request) {
      console.error('Error fetching request details:', requestError)
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Extract data
    const requester = request.user
    const trip = request.trip
    const organizer = trip.owner

    // Build approval/rejection links
    const approveUrl = `${FRONTEND_URL}/api/access-requests/${request.id}/approve`
    const rejectUrl = `${FRONTEND_URL}/api/access-requests/${request.id}/reject`
    const tripUrl = `${FRONTEND_URL}/trips/${trip.id}`

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'TripThreads <notifications@tripthreads.com>',
        to: organizer.email,
        subject: `Access Request for ${trip.name}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .container {
                  background-color: #ffffff;
                  border-radius: 8px;
                  padding: 32px;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                .header {
                  text-align: center;
                  margin-bottom: 32px;
                }
                .logo {
                  font-size: 24px;
                  font-weight: bold;
                  color: #F97316;
                  margin-bottom: 8px;
                }
                .title {
                  font-size: 20px;
                  font-weight: 600;
                  color: #111827;
                  margin-bottom: 16px;
                }
                .content {
                  margin-bottom: 32px;
                }
                .info-box {
                  background-color: #F3F4F6;
                  border-left: 4px solid #F97316;
                  padding: 16px;
                  margin: 16px 0;
                  border-radius: 4px;
                }
                .button-group {
                  display: flex;
                  gap: 12px;
                  justify-content: center;
                  margin: 24px 0;
                }
                .button {
                  display: inline-block;
                  padding: 12px 24px;
                  border-radius: 6px;
                  text-decoration: none;
                  font-weight: 600;
                  text-align: center;
                }
                .button-primary {
                  background-color: #F97316;
                  color: #ffffff;
                }
                .button-secondary {
                  background-color: #E5E7EB;
                  color: #374151;
                }
                .footer {
                  text-align: center;
                  font-size: 14px;
                  color: #6B7280;
                  margin-top: 32px;
                  padding-top: 16px;
                  border-top: 1px solid #E5E7EB;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">🧵 TripThreads</div>
                </div>

                <div class="title">Access Request for Your Trip</div>

                <div class="content">
                  <p>Hi ${organizer.full_name || 'there'},</p>

                  <p>
                    <strong>${requester.full_name || requester.email}</strong> has requested edit access to your trip:
                  </p>

                  <div class="info-box">
                    <strong>Trip:</strong> ${trip.name}<br>
                    <strong>Requested by:</strong> ${requester.full_name || 'Unknown'} (${requester.email})
                  </div>

                  <p>
                    They currently have <strong>viewer</strong> access and would like to be upgraded to <strong>participant</strong> to add items to the itinerary, track expenses, and upload photos.
                  </p>

                  <div class="button-group">
                    <a href="${approveUrl}" class="button button-primary">✓ Approve Request</a>
                    <a href="${rejectUrl}" class="button button-secondary">✗ Decline</a>
                  </div>

                  <p style="text-align: center; font-size: 14px; color: #6B7280;">
                    Or manage this request in your <a href="${tripUrl}" style="color: #F97316;">trip settings</a>
                  </p>
                </div>

                <div class="footer">
                  <p>You received this email because you're the organizer of "${trip.name}" on TripThreads.</p>
                  <p>
                    <a href="${FRONTEND_URL}/settings/notifications" style="color: #F97316; text-decoration: none;">Manage notification preferences</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const error = await emailResponse.text()
      console.error('Error sending email:', error)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const emailResult = await emailResponse.json()
    console.log('Email sent successfully:', emailResult)

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-access-request-email function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
