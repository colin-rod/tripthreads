/**
 * Supabase Edge Function: Send Expense Notification
 *
 * Triggered when a new expense is created in a trip.
 * Sends email notifications to all trip participants (except the creator)
 * who have expense notifications enabled.
 *
 * Trigger: Database trigger on expenses INSERT
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

interface ExpensePayload {
  type: 'INSERT'
  table: 'expenses'
  record: {
    id: string
    trip_id: string
    created_by: string
    payer_id: string
    description: string
    amount: number
    currency: string
    category: string
    date: string
  }
}

serve(async req => {
  try {
    // Parse webhook payload
    const payload: ExpensePayload = await req.json()

    // Only process INSERT events
    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Ignored: Not an INSERT event' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const expense = payload.record

    // Fetch expense details with creator and payer info
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select(
        `
        id,
        trip_id,
        description,
        amount,
        currency,
        category,
        date,
        created_by,
        payer_id,
        creator:profiles!expenses_created_by_fkey (
          id,
          full_name,
          email
        ),
        payer:profiles!expenses_payer_id_fkey (
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
      .eq('id', expense.id)
      .single()

    if (expenseError || !expenseData) {
      console.error('Error fetching expense details:', expenseError)
      return new Response(JSON.stringify({ error: 'Expense not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const trip = expenseData.trip
    const creator = expenseData.creator
    const payer = expenseData.payer

    // Fetch all trip participants except the creator
    const participants = await fetchNotificationRecipients(supabase, expense.trip_id, [
      expense.created_by,
    ])

    if (participants.length === 0) {
      console.log('No participants to notify')
      return new Response(JSON.stringify({ message: 'No recipients' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Filter recipients by preference and log decisions
    const metadata = {
      expense_id: expense.id,
      expense_description: expense.description,
      expense_amount: expense.amount,
      expense_currency: expense.currency,
      expense_category: expense.category,
      creator_name: creator.full_name,
      payer_name: payer.full_name,
    }

    const toNotify = await filterRecipientsAndLog(
      supabase,
      expense.trip_id,
      participants,
      'expenses',
      'email',
      metadata
    )

    if (toNotify.length === 0) {
      console.log('No participants have expense notifications enabled')
      return new Response(JSON.stringify({ message: 'All recipients opted out' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Send email to each recipient
    const emailResults = []
    for (const participant of toNotify) {
      const recipient = participant.user

      // Format amount with currency
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: expense.currency,
      }).format(expense.amount / 100) // Amount is stored in cents

      // Format date
      const formattedDate = new Date(expense.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Send email
      const emailResult = await sendEmailNotification(
        RESEND_API_KEY!,
        'TripThreads <notifications@tripthreads.com>',
        recipient.email,
        `New Expense Added to ${trip.name}`,
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
                .expense-box {
                  background-color: #FEF3C7;
                  border-left: 4px solid #F59E0B;
                  padding: 16px;
                  margin: 16px 0;
                  border-radius: 4px;
                }
                .expense-amount {
                  font-size: 24px;
                  font-weight: bold;
                  color: #F59E0B;
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

                <div class="title">New Expense Added</div>

                <div class="content">
                  <p>Hi ${recipient.full_name || 'there'},</p>

                  <p>
                    <strong>${creator.full_name || creator.email}</strong> added a new expense to <strong>${trip.name}</strong>:
                  </p>

                  <div class="expense-box">
                    <div class="expense-amount">${formattedAmount}</div>
                    <strong>Description:</strong> ${expense.description}<br>
                    <strong>Category:</strong> ${expense.category}<br>
                    <strong>Paid by:</strong> ${payer.full_name || payer.email}<br>
                    <strong>Date:</strong> ${formattedDate}
                  </div>

                  <p style="text-align: center;">
                    <a href="${FRONTEND_URL}/trips/${trip.id}?tab=expenses" class="button">View Expenses</a>
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
        // Log successful send
        await logNotification(supabase, {
          trip_id: expense.trip_id,
          user_id: recipient.id,
          event_type: 'expenses',
          notification_type: 'email',
          status: 'sent',
          metadata: {
            ...metadata,
            email_id: emailResult.emailId,
          },
        })
        emailResults.push({ recipient: recipient.email, status: 'sent' })
      } else {
        // Log failed send
        await logNotification(supabase, {
          trip_id: expense.trip_id,
          user_id: recipient.id,
          event_type: 'expenses',
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

    return new Response(
      JSON.stringify({
        success: true,
        results: emailResults,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-expense-notification function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
