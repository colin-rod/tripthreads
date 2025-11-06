import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../../../components/ui/button'
import { supabase } from '../../../lib/supabase/client'
import { useAuth } from '../../../lib/auth/auth-context'
import type { Trip } from '@tripthreads/core'

export default function TripsListScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setTrips([])
      setLoading(false)
      return
    }

    loadTrips(user.id)
  }, [user?.id])

  const loadTrips = async (userId: string) => {
    try {
      setLoading(true)

      // Ensure user is authenticated
      if (!user?.id) {
        setLoading(false)
        return
      }

      // Get trips where user is a participant
      const { data, error } = await supabase
        .from('trip_participants')
        .select('trip_id, trips(*)')
        .eq('user_id', userId)

      if (error) {
        console.error('Error loading trips:', error)
        setLoading(false)
        return
      }

      // Extract trips from the joined data
      const userTrips = data
        .map((item: { trips: Trip | null }) => item.trips)
        .filter((trip): trip is Trip => trip !== null)

      setTrips(userTrips)
    } catch (err) {
      console.error('Error loading trips:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-muted-foreground">Loading trips...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="px-6 py-8 border-b border-border">
        <Text className="text-3xl font-bold text-foreground mb-2">My Trips</Text>
        <Text className="text-base text-muted-foreground">
          {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {trips.length === 0 ? (
          <View className="flex-1 justify-center items-center py-12">
            <Text className="text-6xl mb-4">✈️</Text>
            <Text className="text-xl font-semibold text-foreground mb-2 text-center">
              No trips yet
            </Text>
            <Text className="text-base text-muted-foreground mb-8 text-center">
              Create your first trip or accept an invitation
            </Text>
            <Button
              onPress={() => router.push('/(app)/trips/create')}
              accessibilityLabel="Create trip"
            >
              Create Trip
            </Button>
          </View>
        ) : (
          <View className="space-y-4">
            {trips.map(trip => (
              <TouchableOpacity
                key={trip.id}
                onPress={() => router.push(`/(app)/trips/${trip.id}`)}
                className="bg-card p-6 rounded-xl border border-border active:bg-muted"
              >
                <Text className="text-xl font-semibold text-foreground mb-2">{trip.name}</Text>
                {trip.description && (
                  <Text className="text-sm text-muted-foreground mb-3" numberOfLines={2}>
                    {trip.description}
                  </Text>
                )}
                <View className="flex-row items-center">
                  <Text className="text-sm text-muted-foreground">
                    📅 {new Date(trip.start_date).toLocaleDateString()} -{' '}
                    {new Date(trip.end_date).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
