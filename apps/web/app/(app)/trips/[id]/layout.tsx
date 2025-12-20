/**
 * Trip Layout with Horizontal Navigation
 *
 * Provides navigation for trip pages:
 * - Home (dashboard overview)
 * - Chat (group chat + AI)
 * - Expenses (expense tracking & settlements)
 * - Plan (itinerary/timeline)
 * - Feed (photo/video sharing)
 * - Settings (trip settings)
 *
 * Features:
 * - Desktop: Horizontal tab navigation with participants dropdown
 * - Mobile: Bottom tab bar navigation with "More" menu
 * - Hash-based navigation (#section) for smooth transitions
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@tripthreads/core'
import { BottomNav } from '@/components/navigation/BottomNav'

interface TripLayoutProps {
  children: React.ReactNode
  params: Promise<{
    id: string
  }>
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const supabase = await createClient()
  const { id } = await params

  // Fetch trip data
  let trip
  try {
    trip = await getTripById(supabase, id)
  } catch (error) {
    console.error('Error loading trip:', error)
    notFound()
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Verify user is a participant
  const isParticipant = trip.trip_participants?.some(
    (participant: any) => participant.user?.id === user.id
  )

  if (!isParticipant) {
    notFound()
  }

  // TODO: Fetch unread message count for badge
  const unreadCount = 0

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNav tripId={id} unreadChatCount={unreadCount} />
      </div>
    </div>
  )
}
