/**
 * Data Export Server Actions (GDPR Compliance)
 *
 * Handles user data export in JSON and CSV formats.
 * Implements GDPR "Right to Data Portability" (Article 20).
 *
 * Exports all user-related data:
 * - Profile information
 * - Trips (owned and participated in)
 * - Expenses and expense splits
 * - Itinerary items
 * - Chat messages
 * - Settlements
 * - Trip invites
 * - Access requests
 * - Message reactions
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@tripthreads/core/types/database'
import { dataExportSchema } from '@tripthreads/core/validation/profile'

type ExportFormat = 'json' | 'csv'

interface UserDataExport {
  exportDate: string
  userId: string
  profile: Database['public']['Tables']['profiles']['Row'] | null
  trips: Array<{
    trip: Database['public']['Tables']['trips']['Row']
    role: string
    joinedAt: string | null
  }>
  expenses: Database['public']['Tables']['expenses']['Row'][]
  expenseSplits: Database['public']['Tables']['expense_participants']['Row'][]
  itineraryItems: Database['public']['Tables']['itinerary_items']['Row'][]
  chatMessages: Database['public']['Tables']['chat_messages']['Row'][]
  settlements: Database['public']['Tables']['settlements']['Row'][]
  tripInvites: Database['public']['Tables']['trip_invites']['Row'][]
  accessRequests: Database['public']['Tables']['access_requests']['Row'][]
  messageReactions: Database['public']['Tables']['message_reactions']['Row'][]
}

/**
 * Export all user data
 *
 * Queries all tables for user-related data and returns in requested format.
 * RLS policies ensure only user's own data is accessible.
 *
 * @param format - Export format ('json' or 'csv')
 * @returns Export data as JSON object or CSV string
 */
export async function exportUserData(format: ExportFormat): Promise<{
  data: string
  filename: string
  mimeType: string
}> {
  // Validate input
  const validation = dataExportSchema.safeParse({ format })
  if (!validation.success) {
    throw new Error('Invalid export format')
  }

  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new Error('Not authenticated')
  }

  // Gather all user data
  const userData = await gatherUserData(supabase, authUser.id)

  // Format data based on requested format
  if (format === 'json') {
    return {
      data: JSON.stringify(userData, null, 2),
      filename: `tripthreads-data-export-${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json',
    }
  } else {
    // CSV format - create multiple CSV files as a single concatenated string
    // In production, this would be a ZIP file, but for simplicity we'll concatenate
    const csvData = generateCSV(userData)
    return {
      data: csvData,
      filename: `tripthreads-data-export-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
    }
  }
}

/**
 * Gather all user data from database
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Complete user data export
 */
async function gatherUserData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<UserDataExport> {
  // Profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()

  // Trips (owned and participated in)
  const { data: tripParticipations } = await supabase
    .from('trip_participants')
    .select(
      `
      role,
      joined_at,
      trip:trips (*)
    `
    )
    .eq('user_id', userId)

  const trips =
    tripParticipations?.map(tp => ({
      trip: tp.trip as Database['public']['Tables']['trips']['Row'],
      role: tp.role,
      joinedAt: tp.joined_at,
    })) || []

  // Expenses (created or paid by user)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .or(`payer_id.eq.${userId},created_by.eq.${userId}`)

  // Expense splits (user is participant)
  const { data: expenseSplits } = await supabase
    .from('expense_participants')
    .select('*')
    .eq('user_id', userId)

  // Itinerary items (created by user)
  const { data: itineraryItems } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('created_by', userId)

  // Chat messages (authored by user)
  const { data: chatMessages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)

  // Settlements (involving user)
  const { data: settlements } = await supabase
    .from('settlements')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)

  // Trip invites (sent by user)
  const { data: tripInvites } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('invited_by', userId)

  // Access requests (made by user)
  const { data: accessRequests } = await supabase
    .from('access_requests')
    .select('*')
    .eq('user_id', userId)

  // Message reactions (by user)
  const { data: messageReactions } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('user_id', userId)

  return {
    exportDate: new Date().toISOString(),
    userId,
    profile: profile || null,
    trips,
    expenses: expenses || [],
    expenseSplits: expenseSplits || [],
    itineraryItems: itineraryItems || [],
    chatMessages: chatMessages || [],
    settlements: settlements || [],
    tripInvites: tripInvites || [],
    accessRequests: accessRequests || [],
    messageReactions: messageReactions || [],
  }
}

/**
 * Generate CSV format from user data
 *
 * Creates a simplified CSV with main entities.
 * For production, this should generate a ZIP with multiple CSV files.
 *
 * @param userData - Complete user data
 * @returns CSV string
 */
function generateCSV(userData: UserDataExport): string {
  const sections: string[] = []

  // Profile section
  sections.push('=== PROFILE ===')
  sections.push('ID,Email,Full Name,Plan,Created At')
  if (userData.profile) {
    sections.push(
      `"${userData.profile.id}","${userData.profile.email}","${userData.profile.full_name}","${userData.profile.plan}","${userData.profile.created_at}"`
    )
  }
  sections.push('')

  // Trips section
  sections.push('=== TRIPS ===')
  sections.push('Trip ID,Name,Role,Start Date,End Date,Created At')
  userData.trips.forEach(({ trip, role }) => {
    sections.push(
      `"${trip.id}","${escapeCsv(trip.name)}","${role}","${trip.start_date}","${trip.end_date}","${trip.created_at}"`
    )
  })
  sections.push('')

  // Expenses section
  sections.push('=== EXPENSES ===')
  sections.push('Expense ID,Description,Amount,Currency,Date,Trip ID')
  userData.expenses.forEach(expense => {
    sections.push(
      `"${expense.id}","${escapeCsv(expense.description)}","${expense.amount}","${expense.currency}","${expense.date}","${expense.trip_id}"`
    )
  })
  sections.push('')

  // Chat messages section
  sections.push('=== CHAT MESSAGES ===')
  sections.push('Message ID,Content,Trip ID,Created At')
  userData.chatMessages.forEach(msg => {
    sections.push(`"${msg.id}","${escapeCsv(msg.content)}","${msg.trip_id}","${msg.created_at}"`)
  })
  sections.push('')

  // Settlements section
  sections.push('=== SETTLEMENTS ===')
  sections.push('Settlement ID,From User,To User,Amount,Currency,Status,Trip ID')
  userData.settlements.forEach(settlement => {
    sections.push(
      `"${settlement.id}","${settlement.from_user_id}","${settlement.to_user_id}","${settlement.amount}","${settlement.currency}","${settlement.status}","${settlement.trip_id}"`
    )
  })

  return sections.join('\n')
}

/**
 * Escape CSV special characters
 *
 * @param value - String to escape
 * @returns Escaped string safe for CSV
 */
function escapeCsv(value: string | null): string {
  if (!value) return ''
  // Escape double quotes by doubling them, and handle commas/newlines
  return value.replace(/"/g, '""')
}
