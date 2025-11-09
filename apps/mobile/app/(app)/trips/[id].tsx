import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../../../components/ui/button'
import { supabase } from '../../../lib/supabase/client'
import type { Trip } from '@tripthreads/core'

export default function TripDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) {
      setError('Invalid trip ID')
      setLoading(false)
      return
    }

    loadTrip()
  }, [params.id])

  const loadTrip = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', params.id)
        .single()

      if (fetchError) {
        console.error('Error loading trip:', fetchError)
        setError('Failed to load trip')
        setLoading(false)
        return
      }

      setTrip(data as Trip)
    } catch (err) {
      console.error('Error loading trip:', err)
      setError('Failed to load trip')
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

  if (error || !trip) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <StatusBar style="auto" />
        <Text className="text-6xl mb-4">❌</Text>
        <Text className="text-2xl font-bold text-foreground mb-2 text-center">
          {error || 'Trip Not Found'}
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
    <ScrollView className="flex-1 bg-background">
      <StatusBar style="auto" />

      <View className="px-6 py-8">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Button variant="ghost" onPress={() => router.back()} accessibilityLabel="Go back">
              ← Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => router.push(`/(app)/trips/${params.id}/settings`)}
              accessibilityLabel="Trip settings"
            >
              ⚙️ Settings
            </Button>
          </View>

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

        {/* Trip Sections */}
        <View className="space-y-4">
          {/* Itinerary Section */}
          <View className="bg-card p-6 rounded-xl border border-border">
            <Text className="text-xl font-semibold text-foreground mb-2">📋 Itinerary</Text>
            <Text className="text-muted-foreground">Trip itinerary will be displayed here</Text>
          </View>

          {/* Expenses Section */}
          <View className="bg-card p-6 rounded-xl border border-border">
            <Text className="text-xl font-semibold text-foreground mb-2">💰 Expenses</Text>
            <Text className="text-muted-foreground">Trip expenses will be displayed here</Text>
          </View>

          {/* Media Section */}
          <View className="bg-card p-6 rounded-xl border border-border">
            <Text className="text-xl font-semibold text-foreground mb-2">📸 Photos</Text>
            <Text className="text-muted-foreground">Trip photos will be displayed here</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
