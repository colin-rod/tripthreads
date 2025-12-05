/**
 * Plan Section Component
 *
 * Extracted from /app/(app)/trips/[id]/plan/page.tsx
 * Displays itinerary management within the main trip page.
 */

'use client'

import { ItineraryInputWrapper } from '@/components/features/itinerary/ItineraryInputWrapper'
import { ItineraryViewContainer } from '@/components/features/itinerary/ItineraryViewContainer'

interface PlanSectionProps {
  tripId: string
  tripStartDate: string
  tripEndDate: string
  currentUserId: string
  canEdit: boolean
  tripParticipants: Array<{
    id: string
    full_name: string | null
  }>
}

export function PlanSection({
  tripId,
  tripStartDate,
  tripEndDate,
  currentUserId,
  canEdit,
  tripParticipants,
}: PlanSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Itinerary</h2>
        <p className="text-muted-foreground mt-1">View and manage your trip timeline</p>
      </div>

      {/* AI Itinerary Input (Participants only) */}
      {canEdit && <ItineraryInputWrapper tripId={tripId} />}

      {/* Itinerary Views (Calendar/List) */}
      <ItineraryViewContainer
        tripId={tripId}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        currentUserId={currentUserId}
        tripParticipants={tripParticipants}
        canEdit={canEdit}
      />
    </div>
  )
}
