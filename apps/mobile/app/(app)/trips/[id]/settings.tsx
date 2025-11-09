import { useEffect, useState } from 'react'
import { View, ScrollView, ActivityIndicator, Alert, Share } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  getTripById,
  isTripOwner,
  createInviteLink,
  deleteTrip,
  type Trip,
  type Database,
} from '@tripthreads/core'

type TripParticipant = Database['public']['Tables']['trip_participants']['Row']

type ParticipantWithUser = TripParticipant & {
  user: {
    id: string
    full_name: string
    email: string
  } | null
}

import { supabase } from '../../../../lib/supabase/client'
import { useAuth } from '../../../../lib/auth/auth-context'
import { useToast } from '../../../../hooks/use-toast'
import { Button } from '../../../../components/ui/button'
import { Text } from '../../../../components/ui/text'

export default function TripSettingsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (!params.id || !user?.id) return
    loadTripSettings()
  }, [params.id, user?.id])

  const loadTripSettings = async () => {
    if (!user?.id || !params.id) return

    try {
      setLoading(true)

      // Load trip details
      const tripData = await getTripById(supabase, params.id)
      setTrip(tripData)

      // Check if user is owner
      const ownerStatus = await isTripOwner(supabase, params.id)
      setIsOwner(ownerStatus)

      // Load participants
      const { data: participantsData } = await supabase
        .from('trip_participants')
        .select(
          `
          *,
          user:users!trip_participants_user_id_fkey(id, full_name, email)
        `
        )
        .eq('trip_id', params.id)

      if (participantsData) {
        setParticipants(participantsData as ParticipantWithUser[])
      }
    } catch (error) {
      console.error('Error loading trip settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load trip settings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleShareInvite = async (role: 'participant' | 'viewer') => {
    if (!params.id) return

    try {
      setShareLoading(true)

      // Generate invite link
      const result = await createInviteLink(supabase, params.id, role)

      const inviteUrl = result.url

      // Share using native share sheet
      await Share.share({
        message: `Join my trip on TripThreads: ${trip?.name}\n\n${inviteUrl}`,
        url: inviteUrl,
        title: `Join ${trip?.name}`,
      })

      toast({
        title: 'Invite link created',
        description: 'Share the link with your friends!',
        variant: 'success',
      })
    } catch (error) {
      console.error('Error creating invite:', error)
      toast({
        title: 'Error',
        description: 'Failed to create invite link',
        variant: 'destructive',
      })
    } finally {
      setShareLoading(false)
    }
  }

  const handleDeleteTrip = () => {
    if (!isOwner || !params.id) {
      toast({
        title: 'Permission denied',
        description: 'Only the trip owner can delete this trip',
        variant: 'destructive',
      })
      return
    }

    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleteLoading(true)
              await deleteTrip(supabase, params.id)

              toast({
                title: 'Trip deleted',
                description: 'The trip has been deleted successfully',
                variant: 'success',
              })

              router.replace('/(app)/trips')
            } catch (error) {
              console.error('Error deleting trip:', error)
              toast({
                title: 'Error',
                description: 'Failed to delete trip',
                variant: 'destructive',
              })
            } finally {
              setDeleteLoading(false)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#F97316" />
        <Text variant="muted" className="mt-4">
          Loading settings...
        </Text>
      </SafeAreaView>
    )
  }

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center px-6 bg-background">
        <Text size="2xl" weight="bold" className="mb-2">
          Trip Not Found
        </Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-6 py-4">
        {/* Header */}
        <View className="mb-6">
          <Button variant="ghost" onPress={() => router.back()} className="mb-4 self-start">
            ← Back
          </Button>

          <Text size="3xl" weight="bold" className="mb-2">
            Trip Settings
          </Text>
          <Text variant="muted">Manage {trip.name}</Text>
        </View>

        {/* Trip Info */}
        <View className="mb-6">
          <Text size="lg" weight="semibold" className="mb-3">
            Trip Details
          </Text>
          <View className="bg-card p-4 rounded-xl border border-border space-y-2">
            <View>
              <Text size="sm" variant="muted">
                Name
              </Text>
              <Text size="base" weight="medium">
                {trip.name}
              </Text>
            </View>
            <View>
              <Text size="sm" variant="muted">
                Dates
              </Text>
              <Text size="base">
                {new Date(trip.start_date).toLocaleDateString()} -{' '}
                {new Date(trip.end_date).toLocaleDateString()}
              </Text>
            </View>
            {trip.description && (
              <View>
                <Text size="sm" variant="muted">
                  Description
                </Text>
                <Text size="base">{trip.description}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Participants */}
        <View className="mb-6">
          <Text size="lg" weight="semibold" className="mb-3">
            Participants ({participants.length})
          </Text>
          <View className="bg-card rounded-xl border border-border overflow-hidden">
            {participants.map((participant, index) => (
              <View
                key={participant.id}
                className={`p-4 flex-row items-center justify-between ${
                  index < participants.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <View className="flex-1">
                  <Text size="base" weight="medium">
                    {participant.user?.full_name || 'Unknown User'}
                  </Text>
                  <Text size="sm" variant="muted">
                    {participant.role.charAt(0).toUpperCase() + participant.role.slice(1)}
                  </Text>
                </View>
                {participant.role === 'owner' && (
                  <View className="bg-primary/10 px-3 py-1 rounded-full">
                    <Text size="xs" className="text-primary">
                      Owner
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Invite Options */}
        <View className="mb-6">
          <Text size="lg" weight="semibold" className="mb-3">
            Invite People
          </Text>
          <View className="space-y-2">
            <Button
              variant="outline"
              onPress={() => handleShareInvite('participant')}
              disabled={shareLoading}
              className="w-full"
            >
              {shareLoading ? 'Creating link...' : '📤 Share Participant Invite'}
            </Button>
            <Button
              variant="outline"
              onPress={() => handleShareInvite('viewer')}
              disabled={shareLoading}
              className="w-full"
            >
              {shareLoading ? 'Creating link...' : '👀 Share Viewer Invite'}
            </Button>
          </View>
          <Text size="sm" variant="muted" className="mt-2">
            Participants can edit the trip. Viewers can only view.
          </Text>
        </View>

        {/* Danger Zone - Only for owners */}
        {isOwner && (
          <View className="mb-6">
            <Text size="lg" weight="semibold" variant="destructive" className="mb-3">
              Danger Zone
            </Text>
            <Button
              variant="destructive"
              onPress={handleDeleteTrip}
              disabled={deleteLoading}
              className="w-full"
            >
              {deleteLoading ? 'Deleting...' : '🗑️ Delete Trip'}
            </Button>
            <Text size="sm" variant="muted" className="mt-2">
              This action cannot be undone. All trip data will be permanently deleted.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
