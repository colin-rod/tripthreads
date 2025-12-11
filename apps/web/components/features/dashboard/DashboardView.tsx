'use client'

import {
  ChatPreviewCard,
  ExpensePreviewCard,
  PlanPreviewCard,
  FeedPreviewCard,
} from '@/components/features/dashboard'
import type { TripSection } from '@/hooks/useHashNavigation'
import type { ItineraryItemType } from '@tripthreads/core/types/itinerary'
import type { SettlementSummary } from '@tripthreads/core/types/expense'

interface DashboardViewProps {
  trip: {
    id: string
    name: string
    start_date: string
    end_date: string
    base_currency: string
    trip_participants: unknown[]
  }
  currentUserId: string
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
  settlementSummary?: SettlementSummary
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
  onNavigate: (section: TripSection) => void
}

export function DashboardView({
  trip,
  currentUserId,
  itineraryItems,
  recentExpenses,
  settlementSummary,
  recentMessages,
  unreadMessageCount,
  mediaFiles,
  onNavigate,
}: DashboardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-20rem)] max-h-[700px]">
      <div className="h-full">
        <ChatPreviewCard
          recentMessages={recentMessages}
          unreadCount={unreadMessageCount}
          onViewAll={() => onNavigate('chat')}
        />
      </div>
      <div className="h-full">
        <PlanPreviewCard itineraryItems={itineraryItems} onViewAll={() => onNavigate('plan')} />
      </div>
      <div className="h-full">
        <FeedPreviewCard mediaFiles={mediaFiles} onViewAll={() => onNavigate('feed')} />
      </div>
      <div className="h-full">
        <ExpensePreviewCard
          currentUserId={currentUserId}
          settlementSummary={settlementSummary}
          recentExpenses={recentExpenses}
          baseCurrency={trip.base_currency}
          onViewAll={() => onNavigate('expenses')}
        />
      </div>
    </div>
  )
}
