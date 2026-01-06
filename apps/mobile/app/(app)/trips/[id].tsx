import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../../../components/ui/button'
import { supabase } from '../../../lib/supabase/client'
import { loadTripData, type TripData } from '../../../lib/queries/trip-data'
import {
  TripNavigationProvider,
  useTripNavigation,
} from '../../../lib/contexts/TripNavigationContext'
import { DashboardView } from '../../../components/features/dashboard/DashboardView'
import { ExpensesSection } from '../../../components/features/expenses/ExpensesSection'
import { PlanSection } from '../../../components/features/itinerary/PlanSection'
import { ChatSection } from '../../../components/features/chat/ChatSection'
import { FloatingActionButton } from '../../../components/ui/FloatingActionButton'

function TripDetailContent({ tripData }: { tripData: TripData }) {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const { currentSection, navigateBack } = useTripNavigation()

  const showBackButton = currentSection !== 'dashboard'
  const sectionTitle =
    currentSection === 'expenses'
      ? 'Expenses'
      : currentSection === 'plan'
        ? 'Itinerary'
        : currentSection === 'chat'
          ? 'Chat'
          : null

  // FAB actions based on current section
  const getFABConfig = () => {
    switch (currentSection) {
      case 'dashboard':
        return {
          actions: [
            {
              label: 'Add Expense',
              icon: '💰',
              onPress: () => router.push(`/(app)/trips/${params.id}/expenses/create`),
            },
            {
              label: 'Add Activity',
              icon: '📋',
              onPress: () => router.push(`/(app)/trips/${params.id}/itinerary/create`),
            },
          ],
        }
      case 'expenses':
        return {
          onPress: () => router.push(`/(app)/trips/${params.id}/expenses/create`),
          icon: '+',
        }
      case 'plan':
        return {
          onPress: () => router.push(`/(app)/trips/${params.id}/itinerary/create`),
          icon: '+',
        }
      case 'chat':
        return {
          visible: false, // Chat has its own input
        }
      default:
        return { visible: false }
    }
  }

  const fabConfig = getFABConfig()

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="px-6 pt-4 pb-2 border-b border-border bg-background">
        <View className="flex-row items-center justify-between">
          {showBackButton ? (
            <TouchableOpacity onPress={navigateBack} className="flex-row items-center">
              <Text className="text-primary text-lg font-medium">← {sectionTitle}</Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-lg font-semibold text-foreground">{tripData.trip?.name}</Text>
          )}

          <TouchableOpacity
            onPress={() => router.push(`/(app)/trips/${params.id}/settings`)}
            className="p-2"
          >
            <Text className="text-xl">⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content based on current section */}
      {currentSection === 'dashboard' && <DashboardView tripData={tripData} />}
      {currentSection === 'expenses' && tripData.trip && (
        <ExpensesSection
          expenses={tripData.expenses}
          settlements={tripData.settlements}
          currentUserId={tripData.trip.owner_id}
          tripParticipants={[]}
          error={tripData.errors.expenses}
        />
      )}
      {currentSection === 'plan' && tripData.trip && (
        <PlanSection
          itinerary={tripData.itinerary}
          currentUserId={tripData.trip.owner_id}
          tripParticipants={[]}
          error={tripData.errors.itinerary}
        />
      )}
      {currentSection === 'chat' && (
        <ChatSection initialMessages={tripData.chatMessages} error={tripData.errors.chat} />
      )}

      {/* Floating Action Button */}
      <FloatingActionButton {...fabConfig} />
    </View>
  )
}

export default function TripDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()

  const [tripData, setTripData] = useState<TripData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) {
      setTripData({
        trip: null,
        itinerary: [],
        expenses: [],
        settlements: [],
        chatMessages: [],
        isOwner: false,
        errors: { trip: 'Invalid trip ID' },
      })
      setLoading(false)
      return
    }

    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load all data in parallel
      const data = await loadTripData(supabase, params.id!)
      setTripData(data)
    } catch (err) {
      console.error('Error loading trip data:', err)
      setTripData({
        trip: null,
        itinerary: [],
        expenses: [],
        settlements: [],
        chatMessages: [],
        isOwner: false,
        errors: { trip: 'An unexpected error occurred' },
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-muted-foreground">Loading trip...</Text>
      </View>
    )
  }

  if (!tripData || tripData.errors.trip || !tripData.trip) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <StatusBar style="auto" />
        <Text className="text-6xl mb-4">❌</Text>
        <Text className="text-2xl font-bold text-foreground mb-2 text-center">
          {tripData?.errors.trip || 'Trip Not Found'}
        </Text>
        <Text className="text-base text-muted-foreground mb-8 text-center">
          This trip may not exist or you don't have access to it.
        </Text>
        <Button onPress={() => router.replace('/(app)/trips')} accessibilityLabel="Go to trips">
          Go to Trips
        </Button>
      </View>
    )
  }

  return (
    <TripNavigationProvider>
      <TripDetailContent tripData={tripData} />
    </TripNavigationProvider>
  )
}
