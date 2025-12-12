'use client'

/**
 * TripPageClient Component
 *
 * Client component that handles hash-based navigation and renders the appropriate section.
 * This separates client-side interactivity from server-side data fetching.
 *
 * Key responsibilities:
 * - Manages hash-based navigation for trip sections
 * - Sets trip context for AppNavBar on mount
 * - Clears trip context on unmount
 * - Renders section content based on active hash
 */

import { useEffect } from 'react'
import { useHashNavigation } from '@/hooks/useHashNavigation'
import { useTripContext } from '@/lib/contexts/trip-context'
import { DashboardView } from '@/components/features/dashboard/DashboardView'
import {
  ChatSection,
  ExpensesSection,
  PlanSection,
  FeedSection,
  SettingsSection,
} from '@/components/features/trips/sections'
import type { SettlementSummary, ExpenseWithDetails } from '@tripthreads/core/types/expense'
import type { ItineraryItemType } from '@tripthreads/core/types/itinerary'
import type { TripNotificationPreferences } from '@tripthreads/core/validation/trip'
import type { GlobalNotificationPreferences } from '@/lib/utils/notifications'

type TripRole = 'owner' | 'participant' | 'viewer'

interface TripPageClientProps {
  trip: {
    id: string
    name: string
    description: string | null
    start_date: string
    end_date: string
    base_currency: string
    cover_image_url?: string | null
    trip_participants: Array<{
      id: string
      role: string
      join_start_date?: string | null
      join_end_date?: string | null
      user: {
        id: string
        full_name: string | null
        avatar_url: string | null
      }
    }>
  }
  isOwner: boolean
  canEdit: boolean
  currentUserId: string
  participants: Array<{
    id: string
    role: TripRole
    join_start_date?: string | null
    join_end_date?: string | null
    user: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
  }>
  itineraryItems: Array<{
    id: string
    type: ItineraryItemType
    title: string
    start_time: string
    location: string | null
  }>
  recentExpenses: Array<{
    id: string
    description: string
    amount: number
    currency: string
    created_at: string
  }>
  allExpenses: ExpenseWithDetails[] // Full expense list for ExpensesSection
  settlementSummary: SettlementSummary | undefined
  recentMessages: Array<{
    id: string
    content: string
    sender_name: string
    created_at: string
  }>
  unreadMessageCount: number
  mediaFiles: Array<{
    id: string
    file_url: string
    thumbnail_url?: string | null
    caption?: string | null
  }>
  tripParticipantsForSections: Array<{
    id: string
    name: string
    full_name: string | null
  }>
  tripNotificationPreferences: TripNotificationPreferences | null
  globalNotificationPreferences: GlobalNotificationPreferences
}

export function TripPageClient({
  trip,
  isOwner,
  canEdit,
  currentUserId,
  participants,
  itineraryItems,
  recentExpenses,
  allExpenses,
  settlementSummary,
  recentMessages,
  unreadMessageCount,
  mediaFiles,
  tripParticipantsForSections,
  tripNotificationPreferences,
  globalNotificationPreferences,
}: TripPageClientProps) {
  const { section, navigateTo } = useHashNavigation()
  const { setTripContext, clearTripContext, updateActiveSection } = useTripContext()

  // Set trip context on mount, clear on unmount
  useEffect(() => {
    const userParticipant = participants.find(p => p.user.id === currentUserId)

    setTripContext({
      trip: {
        id: trip.id,
        name: trip.name,
        description: trip.description,
        start_date: trip.start_date,
        end_date: trip.end_date,
        cover_image_url: trip.cover_image_url,
        trip_participants: trip.trip_participants.map(p => ({
          ...p,
          role: p.role as 'owner' | 'participant' | 'viewer',
        })),
      },
      isOwner,
      userRole: userParticipant?.role || 'viewer',
      activeSection: section,
    })

    // Cleanup: clear context on unmount
    return () => {
      clearTripContext()
    }
  }, [
    trip.id,
    trip.name,
    trip.description,
    trip.start_date,
    trip.end_date,
    trip.cover_image_url,
    trip.trip_participants,
    isOwner,
    currentUserId,
    participants,
    section,
    setTripContext,
    clearTripContext,
  ])

  // Update active section when hash changes
  useEffect(() => {
    updateActiveSection(section)
  }, [section, updateActiveSection])

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Trip Header REMOVED - now in AppNavBar Row 2 */}

      {/* Main Content - removed mt-6 margin */}
      <div>
        {section === 'home' && (
          <DashboardView
            trip={trip}
            currentUserId={currentUserId}
            itineraryItems={itineraryItems}
            recentExpenses={recentExpenses}
            settlementSummary={settlementSummary}
            recentMessages={recentMessages}
            unreadMessageCount={unreadMessageCount}
            mediaFiles={mediaFiles}
            onNavigate={navigateTo}
          />
        )}

        {section === 'chat' && <ChatSection tripId={trip.id} currentUserId={currentUserId} />}

        {section === 'expenses' && settlementSummary && (
          <ExpensesSection
            tripId={trip.id}
            currentUserId={currentUserId}
            canEdit={canEdit}
            tripParticipants={tripParticipantsForSections}
            expenses={allExpenses}
            settlementSummary={settlementSummary}
          />
        )}

        {section === 'plan' && (
          <PlanSection
            tripId={trip.id}
            tripStartDate={trip.start_date}
            tripEndDate={trip.end_date}
            currentUserId={currentUserId}
            canEdit={canEdit}
            tripParticipants={tripParticipantsForSections}
          />
        )}

        {section === 'feed' && (
          <FeedSection tripId={trip.id} userId={currentUserId} canEdit={canEdit} />
        )}

        {section === 'settings' && (
          <SettingsSection
            trip={trip}
            isOwner={isOwner}
            currentUserId={currentUserId}
            tripNotificationPreferences={tripNotificationPreferences}
            globalNotificationPreferences={globalNotificationPreferences}
          />
        )}
      </div>
    </div>
  )
}
