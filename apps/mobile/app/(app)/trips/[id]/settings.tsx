import { useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  getTripById,
  isTripOwner,
  createInviteLink,
  deleteTrip,
  updateTrip,
  updateTripSchema,
  type Trip,
  type Database,
  type UpdateTripInput,
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../../../../components/ui/form'
import { Input } from '../../../../components/ui/input'
import { Textarea } from '../../../../components/ui/textarea'
import { DatePicker } from '../../../../components/ui/date-picker'

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
  const [isEditing, setIsEditing] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // Form for editing trip
  const form = useForm<UpdateTripInput>({
    resolver: zodResolver(updateTripSchema),
    defaultValues: {
      name: '',
      description: '',
      start_date: '',
      end_date: '',
    },
  })

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

      // Populate form with trip data
      form.reset({
        name: tripData.name,
        description: tripData.description || '',
        start_date: tripData.start_date,
        end_date: tripData.end_date,
      })

      // Check if user is owner
      const ownerStatus = await isTripOwner(supabase, params.id)
      setIsOwner(ownerStatus)

      // Load participants
      const { data: participantsData } = await supabase
        .from('trip_participants')
        .select(
          `
          *,
          user:profiles!trip_participants_user_id_fkey(id, full_name, email)
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

  const handleEditTrip = () => {
    if (!isOwner) {
      toast({
        title: 'Permission denied',
        description: 'Only the trip owner can edit this trip',
        variant: 'destructive',
      })
      return
    }
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    // Reset form to original trip data
    if (trip) {
      form.reset({
        name: trip.name,
        description: trip.description || '',
        start_date: trip.start_date,
        end_date: trip.end_date,
      })
    }
    setIsEditing(false)
  }

  const handleSaveTrip = async (data: UpdateTripInput) => {
    if (!params.id) return

    try {
      setSaveLoading(true)

      // Update trip
      const updatedTrip = await updateTrip(supabase, params.id, data)

      // Update local state
      setTrip(updatedTrip)
      setIsEditing(false)

      toast({
        title: 'Trip updated',
        description: 'Your changes have been saved',
        variant: 'success',
      })
    } catch (error) {
      console.error('Error updating trip:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update trip',
        variant: 'destructive',
      })
    } finally {
      setSaveLoading(false)
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
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
            <View className="flex-row items-center justify-between mb-3">
              <Text size="lg" weight="semibold">
                Trip Details
              </Text>
              {isOwner && !isEditing && (
                <Button variant="outline" size="sm" onPress={handleEditTrip}>
                  ✏️ Edit
                </Button>
              )}
            </View>

            {isEditing ? (
              <Form {...form}>
                <View className="bg-card p-4 rounded-xl border border-border space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Trip Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter trip name"
                            value={field.value || ''}
                            onChangeText={field.onChange}
                            autoCapitalize="words"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Start Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={date => field.onChange(date?.toISOString())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>End Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value ? new Date(field.value) : undefined}
                            onChange={date => field.onChange(date?.toISOString())}
                            minimumDate={
                              form.watch('start_date')
                                ? new Date(form.watch('start_date')!)
                                : undefined
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add a description..."
                            value={field.value || ''}
                            onChangeText={field.onChange}
                            maxLength={500}
                            showCharCount
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <View className="flex-row space-x-2 pt-2">
                    <Button
                      variant="default"
                      onPress={form.handleSubmit(handleSaveTrip)}
                      disabled={saveLoading}
                      className="flex-1"
                    >
                      {saveLoading ? 'Saving...' : '💾 Save Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      onPress={handleCancelEdit}
                      disabled={saveLoading}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </View>
                </View>
              </Form>
            ) : (
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
            )}
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

          {/* Feedback */}
          <View className="mb-6 space-y-2">
            <Text size="lg" weight="semibold">
              Share feedback
            </Text>
            <Text size="sm" variant="muted">
              Found a bug or have an idea? Send it to the team and we&apos;ll log it in Linear.
            </Text>
            <Button
              variant="outline"
              onPress={() =>
                router.push({ pathname: '/(app)/feedback', params: { tripId: trip.id } })
              }
            >
              📨 Send feedback
            </Button>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
