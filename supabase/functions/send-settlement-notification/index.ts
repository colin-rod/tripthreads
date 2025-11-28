/**
 * Supabase Edge Function: Send Settlement Notification
 *
 * Triggered when a settlement is marked as paid.
 * Sends email notifications to both parties in the settlement
 * (payer and recipient) who have settlement notifications enabled.
 *
 * Trigger: Database trigger on settlements UPDATE (status → settled)
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
  getEffectivePreference,
  logNotification,
  sendEmailNotification,
} from '../_shared/notifications.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'

interface SettlementPayload {
  type: 'UPDATE'
  table: 'settlements'
  record: {
    id: string
    trip_id: string
    from_user_id: string
    to_user_id: string
    amount: number
    currency: string
    status: string
    settled_at?: string
  }
  old_record: {
    status: string
  }
}

serve(async req => {
  try {
    const payload: SettlementPayload = await req.json()

    // Only process when status changes from pending to settled
    if (
      payload.type !== 'UPDATE' ||
      payload.old_record.status === 'settled' ||
      payload.record.status !== 'settled'
    ) {
      return new Response(JSON.stringify({ message: 'Ignored: Not a settlement status change' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const settlement = payload.record

    // Fetch settlement details with user info
    const { data: settlementData, error: settlementError } = await supabase
      .from('settlements')
      .select(
        `
        id,
        trip_id,
        from_user_id,
        to_user_id,
        amount,
        currency,
        status,
        settled_at,
        from_user:profiles!settlements_from_user_id_fkey (
          id,
          email,
          full_name,
          notification_preferences
        ),
        to_user:profiles!settlements_to_user_id_fkey (
          id,
          email,
          full_name,
          notification_preferences
        ),
        trip:trips (
          id,
          name
        )
      `
      )
      .eq('id', settlement.id)
      .single()

    if (settlementError || !settlementData) {
      console.error('Error fetching settlement details:', settlementError)
      return new Response(JSON.stringify({ error: 'Settlement not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const trip = settlementData.trip
    const fromUser = settlementData.from_user
    const toUser = settlementData.to_user

    // Format amount with currency
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settlement.currency,
    }).format(settlement.amount / 100)

    const metadata = {
      settlement_id: settlement.id,
      from_user_name: fromUser.full_name,
      to_user_name: toUser.full_name,
      amount: settlement.amount,
      currency: settlement.currency,
    }

    const emailResults = []

    // Notify both parties
    for (const user of [fromUser, toUser]) {
      // Fetch trip participant preferences
      const { data: tripParticipant } = await supabase
        .from('trip_participants')
        .select('notification_preferences')
        .eq('trip_id', settlement.trip_id)
        .eq('user_id', user.id)
        .single()

      // Check if user wants settlement notifications
      const shouldNotify = getEffectivePreference(
        'settlements',
        tripParticipant?.notification_preferences || null,
        user.notification_preferences || null,
        'email'
      )

      if (!shouldNotify) {
        await logNotification(supabase, {
          trip_id: settlement.trip_id,
          user_id: user.id,
          event_type: 'settlements',
          notification_type: 'email',
          status: 'skipped',
          skip_reason: 'preferences_disabled',
          metadata,
        })
        continue
      }

      // Determine email content based on user role
      const isFromUser = user.id === fromUser.id
      const otherUser = isFromUser ? toUser : fromUser

      const emailResult = await sendEmailNotification(
        RESEND_API_KEY!,
        'TripThreads <notifications@tripthreads.com>',
        user.email,
        `Settlement Marked as Paid: ${trip.name}`,
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
                .settlement-box {
                  background-color: #ECFDF5;
                  border-left: 4px solid #22C55E;
                  padding: 16px;
                  margin: 16px 0;
                  border-radius: 4px;
                }
                .amount {
                  font-size: 24px;
                  font-weight: bold;
                  color: #22C55E;
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

                <div class="title">Settlement Marked as Paid</div>

                <div class="content">
                  <p>Hi ${user.full_name || 'there'},</p>

                  <p>
                    A settlement in <strong>${trip.name}</strong> has been marked as paid:
                  </p>

                  <div class="settlement-box">
                    <div class="amount">✓ ${formattedAmount}</div>
                    <strong>${fromUser.full_name || fromUser.email}</strong> ${
                      isFromUser ? '(you)' : ''
                    } → <strong>${toUser.full_name || toUser.email}</strong> ${isFromUser ? '' : '(you)'}<br>
                    <strong>Status:</strong> Settled ✓
                  </div>

                  ${
                    isFromUser
                      ? `<p>Thank you for settling up with ${otherUser.full_name || otherUser.email}!</p>`
                      : `<p>${otherUser.full_name || otherUser.email} has confirmed they paid you ${formattedAmount}.</p>`
                  }

                  <p style="text-align: center;">
                    <a href="${FRONTEND_URL}/trips/${trip.id}?tab=settlements" class="button">View Settlements</a>
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
          trip_id: settlement.trip_id,
          user_id: user.id,
          event_type: 'settlements',
          notification_type: 'email',
          status: 'sent',
          metadata: { ...metadata, email_id: emailResult.emailId },
        })
        emailResults.push({ recipient: user.email, status: 'sent' })
      } else {
        await logNotification(supabase, {
          trip_id: settlement.trip_id,
          user_id: user.id,
          event_type: 'settlements',
          notification_type: 'email',
          status: 'failed',
          error_message: emailResult.error,
          metadata,
        })
        emailResults.push({
          recipient: user.email,
          status: 'failed',
          error: emailResult.error,
        })
      }
    }

    console.log(
      `Sent ${emailResults.filter(r => r.status === 'sent').length} of ${emailResults.length} settlement notifications`
    )

    return new Response(JSON.stringify({ success: true, results: emailResults }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in send-settlement-notification function:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
