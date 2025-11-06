import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../../../components/ui/button'
import { supabase } from '../../../lib/supabase/client'
import { useAuth } from '../../../lib/auth/auth-context'
import { getInviteWithDetails, acceptInvite } from '@tripthreads/core'
import type { InviteWithDetails } from '@tripthreads/core'

export default function InviteScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ token: string }>()
  const { user } = useAuth()

  const [invite, setInvite] = useState<InviteWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.token) {
      setError('Invalid invite link')
      setLoading(false)
      return
    }

    loadInvite()
  }, [params.token])

  const loadInvite = async () => {
    try {
      setLoading(true)
      setError(null)

      const inviteData = await getInviteWithDetails(supabase, params.token)

      if (!inviteData) {
        setError('This invite link is no longer valid')
        setLoading(false)
        return
      }

      setInvite(inviteData)
    } catch (err) {
      console.error('Error loading invite:', err)
      setError('Failed to load invite details')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvite = async () => {
    if (!invite || !user) return

    const { invite: inviteInfo, trip } = invite

    setAccepting(true)

    try {
      await acceptInvite(supabase, params.token)

      Alert.alert('Success!', `You've joined ${trip.name} as a ${inviteInfo.role}`, [
        {
          text: 'View Trip',
          onPress: () => router.replace(`/(app)/trips/${trip.id}`),
        },
      ])
    } catch (err) {
      console.error('Error accepting invite:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invite'
      Alert.alert('Error', errorMessage)
      setAccepting(false)
    }
  }

  const handleDeclineInvite = () => {
    Alert.alert('Decline Invite', 'Are you sure you want to decline this invitation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => router.replace('/(app)/trips'),
      },
    ])
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-muted-foreground">Loading invite...</Text>
      </View>
    )
  }

  if (error || !invite) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <StatusBar style="auto" />
        <Text className="text-6xl mb-4">❌</Text>
        <Text className="text-2xl font-bold text-foreground mb-2 text-center">
          {error || 'Invite Not Found'}
        </Text>
        <Text className="text-base text-muted-foreground mb-8 text-center">
          This invite may have expired or been revoked.
        </Text>
        <Button onPress={() => router.replace('/(app)/trips')} accessibilityLabel="Go to trips">
          Go to Trips
        </Button>
      </View>
    )
  }

  const { invite: inviteInfo, trip, inviter } = invite

  return (
    <View className="flex-1 justify-center px-6 bg-background">
      <StatusBar style="auto" />

      <View className="items-center mb-8">
        <Text className="text-6xl mb-4">✈️</Text>
        <Text className="text-3xl font-bold text-foreground mb-2 text-center">Trip Invitation</Text>
        <Text className="text-base text-muted-foreground text-center">
          You've been invited to join a trip!
        </Text>
      </View>

      <View className="bg-card p-6 rounded-xl border border-border mb-6">
        <Text className="text-sm text-muted-foreground mb-1">Trip Name</Text>
        <Text className="text-2xl font-bold text-foreground mb-4">{trip.name}</Text>

        {trip.description && (
          <>
            <Text className="text-sm text-muted-foreground mb-1">Description</Text>
            <Text className="text-base text-foreground mb-4">{trip.description}</Text>
          </>
        )}

        <View className="flex-row justify-between mb-4">
          <View>
            <Text className="text-sm text-muted-foreground mb-1">Dates</Text>
            <Text className="text-base text-foreground">
              {new Date(trip.start_date).toLocaleDateString()} -{' '}
              {new Date(trip.end_date).toLocaleDateString()}
            </Text>
          </View>
          <View>
            <Text className="text-sm text-muted-foreground mb-1">Role</Text>
            <Text className="text-base text-foreground capitalize">{inviteInfo.role}</Text>
          </View>
        </View>

        <View>
          <Text className="text-sm text-muted-foreground mb-1">Invited by</Text>
          <Text className="text-base text-foreground">{inviter.full_name}</Text>
        </View>
      </View>

      <View className="space-y-3">
        <Button
          onPress={handleAcceptInvite}
          disabled={accepting}
          accessibilityLabel="Accept invitation"
        >
          {accepting ? 'Accepting...' : 'Accept Invitation'}
        </Button>

        <Button
          variant="outline"
          onPress={handleDeclineInvite}
          disabled={accepting}
          accessibilityLabel="Decline invitation"
        >
          Decline
        </Button>
      </View>

      {inviteInfo.role === 'viewer' && (
        <View className="mt-6 p-4 bg-warning/10 rounded-lg">
          <Text className="text-sm text-warning-foreground">
            ℹ️ As a viewer, you'll be able to see the trip itinerary and photos, but you won't be
            able to add expenses or edit the trip.
          </Text>
        </View>
      )}
    </View>
  )
}
