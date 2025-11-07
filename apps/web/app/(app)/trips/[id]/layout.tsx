/**
 * Trip Layout with Sidebar Navigation
 *
 * Provides navigation sidebar for trip pages:
 * - Home (overview)
 * - Chat (group chat + AI)
 * - Plan (itinerary/timeline)
 * - Expenses (expense tracking)
 * - Settings (trip settings)
 *
 * Features:
 * - Desktop: Fixed sidebar navigation
 * - Mobile: Hamburger menu with slide-out drawer
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@tripthreads/core'
import { TripNavigation } from '@/components/features/trips/TripNavigation'

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
    participant => participant.user?.id === user.id
  )

  if (!isParticipant) {
    notFound()
  }

  return (
    <div className="flex h-screen">
      <TripNavigation tripId={id} tripName={trip.name} />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
