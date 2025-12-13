import { ScrollView, View, Text } from 'react-native'
import type { TripData } from '../../../lib/queries/trip-data'
import { useTripNavigation } from '../../../lib/contexts/TripNavigationContext'
import { ExpensePreviewCard } from './ExpensePreviewCard'
import { PlanPreviewCard } from './PlanPreviewCard'
import { ChatPreviewCard } from './ChatPreviewCard'

interface DashboardViewProps {
  tripData: TripData
}

export function DashboardView({ tripData }: DashboardViewProps) {
  const { navigateToSection } = useTripNavigation()
  const { trip, itinerary, expenses, settlements } = tripData

  if (!trip) {
    return null
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 py-4">
        {/* Trip Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">{trip.name}</Text>

          {trip.description && (
            <Text className="text-base text-muted-foreground mb-4">{trip.description}</Text>
          )}

          <View className="flex-row items-center">
            <Text className="text-sm text-muted-foreground">
              📅 {new Date(trip.start_date).toLocaleDateString()} -{' '}
              {new Date(trip.end_date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Preview Cards */}
        <View>
          {/* Plan Preview */}
          <PlanPreviewCard itinerary={itinerary} onViewAll={() => navigateToSection('plan')} />

          {/* Expenses Preview */}
          <ExpensePreviewCard
            expenses={expenses}
            settlements={settlements}
            onViewAll={() => navigateToSection('expenses')}
          />

          {/* Chat Preview */}
          <ChatPreviewCard
            messages={tripData.chatMessages}
            onViewAll={() => navigateToSection('chat')}
          />

          {/* Feed section will be added later in Phase 3+ */}
        </View>
      </View>
    </ScrollView>
  )
}
