/**
 * Supabase Edge Function: Send Itinerary Notification
 *
 * Triggered when an itinerary item is created or updated in a trip.
 * Sends email notifications to all trip participants (except the creator)
 * who have itinerary notifications enabled.
 *
 * Trigger: Database trigger on itinerary_items INSERT/UPDATE
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

interface ItineraryPayload {
  type: 'INSERT' | 'UPDATE'
  table: 'itinerary_items'
  record: {
    id: string
    trip_id: string
    created_by: string
    type: string
    title: string
    description?: string
    start_time: string
    end_time?: string
    location?: string
  }
  old_record?: {
    title: string
    start_time: string
  }
}

serve(async req => {
  try {
    const payload: ItineraryPayload = await req.json()

    // Only process INSERT and UPDATE events
    if (payload.type !== 'INSERT' && payload.type !== 'UPDATE') {
      return new Response(JSON.stringify({ message: 'Ignored: Not an INSERT or UPDATE event' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const item = payload.record

    // Fetch itinerary item details
    const { data: itemData, error: itemError } = await supabase
      .from('itinerary_items')
      .select(
        `
        id,
        trip_id,
        type,
        title,
        description,
        start_time,
        end_time,
        location,
        created_by,
        creator:profiles!itinerary_items_created_by_fkey (
          id,
          full_name,
          email
        ),
        trip:trips (
          id,
          name
        )
      `
      )
      .eq('id', item.id)
      .single()

    if (itemError || !itemData) {
      console.error('Error fetching itinerary item:', itemError)
      return new Response(JSON.stringify({ error: 'Itinerary item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const trip = itemData.trip
    const creator = itemData.creator

    // Fetch all trip participants except the creator
    const participants = await fetchNotificationRecipients(supabase, item.trip_id, [
      item.created_by,
    ])

    if (participants.length === 0) {
      return new Response(JSON.stringify({ message: 'No recipients' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine action text
    const action = payload.type === 'INSERT' ? 'added' : 'updated'
    const itemTypeEmoji =
      {
        flight: '✈️',
        stay: '🏨',
        activity: '🎯',
      }[item.type] || '📍'

    // Filter recipients by preference
    const metadata = {
      itinerary_item_id: item.id,
      itinerary_type: item.type,
      itinerary_title: item.title,
      action: action,
      creator_name: creator.full_name,
    }

    const toNotify = await filterRecipientsAndLog(
      supabase,
      item.trip_id,
      participants,
      'itinerary',
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
    for (const participant of toNotify) {
      const recipient = participant.user

      // Format dates
      const startDate = new Date(item.start_time).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })

      const endDate = item.end_time
        ? new Date(item.end_time).toLocaleDateString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : null

      const emailResult = await sendEmailNotification(
        RESEND_API_KEY!,
        'TripThreads <notifications@tripthreads.app>',
        recipient.email,
        `Itinerary ${action === 'added' ? 'Updated' : 'Changed'}: ${trip.name}`,
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
                .itinerary-box {
                  background-color: #EFF6FF;
                  border-left: 4px solid #3B82F6;
                  padding: 16px;
                  margin: 16px 0;
                  border-radius: 4px;
                }
                .item-title {
                  font-size: 18px;
                  font-weight: 600;
                  color: #1E40AF;
                  margin-bottom: 8px;
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

                <div class="title">Itinerary ${action === 'added' ? 'Updated' : 'Changed'}</div>

                <div class="content">
                  <p>Hi ${recipient.full_name || 'there'},</p>

                  <p>
                    <strong>${creator.full_name || creator.email}</strong> ${action} ${
                      item.type === 'flight'
                        ? 'a flight'
                        : item.type === 'stay'
                          ? 'accommodation'
                          : 'an activity'
                    } to <strong>${trip.name}</strong>:
                  </p>

                  <div class="itinerary-box">
                    <div class="item-title">${itemTypeEmoji} ${item.title}</div>
                    ${item.description ? `<p>${item.description}</p>` : ''}
                    <strong>When:</strong> ${startDate}${endDate ? ` - ${endDate}` : ''}<br>
                    ${item.location ? `<strong>Where:</strong> ${item.location}<br>` : ''}
                  </div>

                  <p style="text-align: center;">
                    <a href="${FRONTEND_URL}/trips/${trip.id}?tab=itinerary" class="button">View Itinerary</a>
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
          trip_id: item.trip_id,
          user_id: recipient.id,
          event_type: 'itinerary',
          notification_type: 'email',
          status: 'sent',
          metadata: { ...metadata, email_id: emailResult.emailId },
        })
        emailResults.push({ recipient: recipient.email, status: 'sent' })
      } else {
        await logNotification(supabase, {
          trip_id: item.trip_id,
          user_id: recipient.id,
          event_type: 'itinerary',
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
    console.error('Error in send-itinerary-notification function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
