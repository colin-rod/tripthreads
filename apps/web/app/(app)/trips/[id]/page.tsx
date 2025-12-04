/**
 * Trip Detail Page with Dashboard Hub Navigation
 *
 * Refactored to use hash-based navigation with a dashboard hub.
 * Features:
 * - Dashboard view with preview cards for all sections
 * - Hash-based section routing (#chat, #expenses, #plan, #feed, #settings)
 * - Horizontal navigation (desktop) and bottom navigation (mobile)
 * - Single-page architecture for smoother UX
 */

import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  getTripById,
  isTripOwner,
  getTripItineraryItems,
  getUserExpensesForTrip,
  getSettlementSummary,
} from '@tripthreads/core'
import { TripPageClient } from '@/components/features/trips/TripPageClient'
import type { TripNotificationPreferences } from '@tripthreads/core/validation/trip'
import type { GlobalNotificationPreferences } from '@/lib/utils/notifications'

interface TripDetailPageProps {
  params: Promise<{
    id: string
  }>
}

type TripRole = 'owner' | 'participant' | 'viewer'

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const supabase = await createClient()
  const { id } = await params

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch all trip data in parallel
  let trip
  let isOwner = false
  let itineraryItems: Awaited<ReturnType<typeof getTripItineraryItems>> = []
  let expenses: Awaited<ReturnType<typeof getUserExpensesForTrip>> = []
  let settlementSummary: Awaited<ReturnType<typeof getSettlementSummary>> | null = null

  try {
    ;[trip, isOwner, itineraryItems, expenses, settlementSummary] = await Promise.all([
      getTripById(supabase, id),
      isTripOwner(supabase, id),
      getTripItineraryItems(supabase, id),
      getUserExpensesForTrip(supabase, id),
      getSettlementSummary(supabase, id),
    ])
  } catch (error) {
    console.error('Error loading trip:', error)
    notFound()
  }

  // Get user's role
  const tripParticipants = (trip.trip_participants ?? []).map(p => ({
    ...p,
    role: p.role as TripRole,
  }))

  const userParticipant = tripParticipants.find(participant => participant.user?.id === user?.id)
  const canEdit = userParticipant?.role !== 'viewer'

  // Prepare trip participants for sections
  const participants = tripParticipants.map(p => ({
    id: p.user?.id || '',
    name: p.user?.full_name || 'Unknown',
    full_name: p.user?.full_name || null,
  }))

  // Format itinerary items for dashboard
  const formattedItineraryItems = itineraryItems.map(item => ({
    id: item.id,
    type: item.type as 'flight' | 'stay' | 'activity',
    title: item.title,
    start_time: item.start_time,
    location: item.location,
  }))

  // Format expenses for dashboard
  const recentExpenses = expenses.slice(0, 3).map(expense => ({
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    created_at: expense.created_at,
  }))

  // TODO: Fetch recent chat messages for dashboard
  const recentMessages: Array<{
    id: string
    content: string
    sender_name: string
    created_at: string
  }> = []

  // TODO: Fetch unread message count
  const unreadMessageCount = 0

  // TODO: Fetch media files for dashboard
  const mediaFiles: Array<{
    id: string
    file_url: string
    thumbnail_url?: string | null
    caption?: string | null
  }> = []

  // Fetch notification preferences for settings section
  const { data: currentParticipant } = await supabase
    .from('trip_participants')
    .select('notification_preferences')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single()

  const tripNotificationPreferences =
    (currentParticipant?.notification_preferences as TripNotificationPreferences) || null

  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .single()

  const globalNotificationPreferences =
    (profile?.notification_preferences as GlobalNotificationPreferences) || {}

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TripPageClient
        trip={trip}
        isOwner={isOwner}
        canEdit={canEdit}
        currentUserId={user.id}
        participants={tripParticipants}
        itineraryItems={formattedItineraryItems}
        recentExpenses={recentExpenses}
        allExpenses={expenses}
        settlementSummary={settlementSummary}
        recentMessages={recentMessages}
        unreadMessageCount={unreadMessageCount}
        mediaFiles={mediaFiles}
        tripParticipantsForSections={participants}
        tripNotificationPreferences={tripNotificationPreferences}
        globalNotificationPreferences={globalNotificationPreferences}
      />
    </Suspense>
  )
}
