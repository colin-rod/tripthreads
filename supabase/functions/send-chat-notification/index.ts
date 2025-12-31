/**
 * Supabase Edge Function: Send Chat Notification
 *
 * Triggered when a new chat message is posted in a trip.
 * Sends email notifications to all trip participants (except the sender)
 * who have chat notifications enabled.
 *
 * Note: Chat notifications can be noisy. Consider rate limiting or
 * batching in future iterations.
 *
 * Trigger: Database trigger on chat_messages INSERT
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

interface ChatMessagePayload {
  type: 'INSERT'
  table: 'chat_messages'
  record: {
    id: string
    trip_id: string
    user_id: string
    content: string
    message_type: string
    created_at: string
  }
}

serve(async req => {
  try {
    const payload: ChatMessagePayload = await req.json()

    // Only process INSERT events and user messages (not system/AI messages)
    if (payload.type !== 'INSERT' || payload.record.message_type !== 'user') {
      return new Response(JSON.stringify({ message: 'Ignored: Not a user message INSERT' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const message = payload.record

    // Fetch message details
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .select(
        `
        id,
        trip_id,
        user_id,
        content,
        created_at,
        sender:profiles!chat_messages_user_id_fkey (
          id,
          email,
          full_name
        ),
        trip:trips (
          id,
          name
        )
      `
      )
      .eq('id', message.id)
      .single()

    if (messageError || !messageData) {
      console.error('Error fetching message details:', messageError)
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const trip = messageData.trip
    const sender = messageData.sender

    // Fetch all trip participants except the sender
    const participants = await fetchNotificationRecipients(supabase, message.trip_id, [
      message.user_id,
    ])

    if (participants.length === 0) {
      return new Response(JSON.stringify({ message: 'No recipients' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Filter recipients by preference
    // Truncate long messages for preview
    const preview =
      message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content

    const metadata = {
      message_id: message.id,
      sender_name: sender.full_name,
      message_preview: preview,
    }

    const toNotify = await filterRecipientsAndLog(
      supabase,
      message.trip_id,
      participants,
      'chat',
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

      const emailResult = await sendEmailNotification(
        RESEND_API_KEY!,
        'TripThreads <notifications@tripthreads.app>',
        recipient.email,
        `New Message in ${trip.name}`,
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
                .message-box {
                  background-color: #F9FAFB;
                  border-left: 4px solid #6B7280;
                  padding: 16px;
                  margin: 16px 0;
                  border-radius: 4px;
                  font-style: italic;
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

                <div class="title">New Message</div>

                <div class="content">
                  <p>Hi ${recipient.full_name || 'there'},</p>

                  <p>
                    <strong>${sender.full_name || sender.email}</strong> sent a message in <strong>${trip.name}</strong>:
                  </p>

                  <div class="message-box">
                    "${preview}"
                  </div>

                  <p style="text-align: center;">
                    <a href="${FRONTEND_URL}/trips/${trip.id}?tab=chat" class="button">Reply in Chat</a>
                  </p>
                </div>

                <div class="footer">
                  <p>You received this email because you're a participant in "${trip.name}" on TripThreads.</p>
                  <p style="font-size: 13px; color: #9CA3AF; margin-top: 8px;">
                    💡 Tip: Chat notifications can be frequent. Consider disabling them if you prefer to check messages manually.
                  </p>
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
          trip_id: message.trip_id,
          user_id: recipient.id,
          event_type: 'chat',
          notification_type: 'email',
          status: 'sent',
          metadata: { ...metadata, email_id: emailResult.emailId },
        })
        emailResults.push({ recipient: recipient.email, status: 'sent' })
      } else {
        await logNotification(supabase, {
          trip_id: message.trip_id,
          user_id: recipient.id,
          event_type: 'chat',
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
      `Sent ${emailResults.filter(r => r.status === 'sent').length} of ${emailResults.length} chat notifications`
    )

    return new Response(JSON.stringify({ success: true, results: emailResults }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-chat-notification function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
