/**
 * Supabase Edge Function: Send Invite Accepted Notification
 *
 * Triggered when someone accepts an invite and joins a trip.
 * Sends email notifications to the trip owner and existing participants
 * who have invite notifications enabled.
 *
 * Trigger: Database trigger on trip_participants INSERT (from invite acceptance)
 *
 * Environment Variables:
 * - RESEND_API_KEY: API key for Resend email service
 * - FRONTEND_URL: Base URL of the frontend application
 *
 * CRO-767: Edge Functions to send push on trip events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  fetchNotificationRecipients,
  filterRecipientsAndLog,
  sendEmailNotification,
  logNotification,
} from '../_shared/notifications.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'

interface ParticipantPayload {
  type: 'INSERT'
  table: 'trip_participants'
  record: {
    id: string
    trip_id: string
    user_id: string
    role: string
    joined_at: string
  }
}

serve(async req => {
  try {
    const payload: ParticipantPayload = await req.json()

    // Only process INSERT events
    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Ignored: Not an INSERT event' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const participant = payload.record

    // Fetch participant details
    const { data: participantData, error: participantError } = await supabase
      .from('trip_participants')
      .select(
        `
        id,
        trip_id,
        user_id,
        role,
        joined_at,
        user:profiles!trip_participants_user_id_fkey (
          id,
          email,
          full_name
        ),
        trip:trips (
          id,
          name,
          owner_id
        )
      `
      )
      .eq('id', participant.id)
      .single()

    if (participantError || !participantData) {
      console.error('Error fetching participant details:', participantError)
      return new Response(JSON.stringify({ error: 'Participant not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const trip = participantData.trip
    const newMember = participantData.user

    // Don't send notifications for the trip owner joining (trip creation)
    if (participant.user_id === trip.owner_id) {
      return new Response(JSON.stringify({ message: 'Ignored: Owner joining their own trip' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch all existing trip participants except the new member
    const participants = await fetchNotificationRecipients(supabase, participant.trip_id, [
      participant.user_id,
    ])

    if (participants.length === 0) {
      return new Response(JSON.stringify({ message: 'No existing participants to notify' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Filter recipients by preference
    const metadata = {
      new_member_id: newMember.id,
      new_member_name: newMember.full_name,
      new_member_email: newMember.email,
      role: participant.role,
    }

    const toNotify = await filterRecipientsAndLog(
      supabase,
      participant.trip_id,
      participants,
      'invites',
      'email',
      metadata
    )

    if (toNotify.length === 0) {
      return new Response(JSON.stringify({ message: 'All recipients opted out' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send email to each recipient
    const emailResults = []
    for (const existingParticipant of toNotify) {
      const recipient = existingParticipant.user

      const emailResult = await sendEmailNotification(
        RESEND_API_KEY!,
        'TripThreads <notifications@tripthreads.app>',
        recipient.email,
        `${newMember.full_name || newMember.email} joined ${trip.name}`,
        `
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
                .member-box {
                  background-color: #F0FDF4;
                  border-left: 4px solid #22C55E;
                  padding: 16px;
                  margin: 16px 0;
                  border-radius: 4px;
                }
                .button {
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #F97316;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: 600;
                  text-align: center;
                  margin-top: 16px;
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

                <div class="title">New Member Joined</div>

                <div class="content">
                  <p>Hi ${recipient.full_name || 'there'},</p>

                  <p>
                    Great news! <strong>${newMember.full_name || newMember.email}</strong> just joined <strong>${trip.name}</strong>.
                  </p>

                  <div class="member-box">
                    👋 <strong>${newMember.full_name || newMember.email}</strong><br>
                    <strong>Role:</strong> ${participant.role === 'owner' ? 'Organizer' : participant.role === 'participant' ? 'Participant' : 'Viewer'}
                  </div>

                  <p style="text-align: center;">
                    <a href="${FRONTEND_URL}/trips/${trip.id}" class="button">View Trip</a>
                  </p>
                </div>

                <div class="footer">
                  <p>You received this email because you're a participant in "${trip.name}" on TripThreads.</p>
                  <p>
                    <a href="${FRONTEND_URL}/trips/${trip.id}/settings" style="color: #F97316; text-decoration: none;">Manage trip notification preferences</a>
                    ·
                    <a href="${FRONTEND_URL}/settings/notifications" style="color: #F97316; text-decoration: none;">Manage global preferences</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `
      )

      if (emailResult.success) {
        await logNotification(supabase, {
          trip_id: participant.trip_id,
          user_id: recipient.id,
          event_type: 'invites',
          notification_type: 'email',
          status: 'sent',
          metadata: { ...metadata, email_id: emailResult.emailId },
        })
        emailResults.push({ recipient: recipient.email, status: 'sent' })
      } else {
        await logNotification(supabase, {
          trip_id: participant.trip_id,
          user_id: recipient.id,
          event_type: 'invites',
          notification_type: 'email',
          status: 'failed',
          error_message: emailResult.error,
          metadata,
        })
        emailResults.push({
          recipient: recipient.email,
          status: 'failed',
          error: emailResult.error,
        })
      }
    }

    console.log(
      `Sent ${emailResults.filter(r => r.status === 'sent').length} of ${emailResults.length} emails`
    )

    return new Response(JSON.stringify({ success: true, results: emailResults }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-invite-accepted-notification function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
