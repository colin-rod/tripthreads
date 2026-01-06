import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import type { GroupedItineraryItems, ItineraryItemWithParticipants } from '@tripthreads/core'
import { ItineraryItemDetailSheet } from './ItineraryItemDetailSheet'

interface PlanSectionProps {
  itinerary: GroupedItineraryItems[]
  currentUserId: string
  tripParticipants?: Array<{ id: string; full_name: string | null; avatar_url?: string | null }>
  loading?: boolean
  error?: string
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'transport':
      return '✈️'
    case 'accommodation':
      return '🏨'
    case 'dining':
      return '🍽️'
    case 'activity':
      return '🎯'
    case 'sightseeing':
      return '🏛️'
    default:
      return '📌'
  }
}

export function PlanSection({
  itinerary,
  currentUserId,
  tripParticipants,
  loading,
  error,
}: PlanSectionProps) {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()

  // Sheet state for view/edit
  const [sheetState, setSheetState] = useState<{
    item: ItineraryItemWithParticipants | null
    mode: 'view' | 'edit'
  }>({ item: null, mode: 'view' })

  const [_showDeleteDialog, setShowDeleteDialog] = useState(false)

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-muted-foreground">Loading itinerary...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <Text className="text-4xl mb-4">📋</Text>
        <Text className="text-xl font-bold text-foreground mb-2 text-center">{error}</Text>
        <Text className="text-sm text-muted-foreground text-center">
          Unable to load itinerary at this time.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 py-4">
        {/* Header with Add button */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-foreground">📋 Itinerary</Text>
          <TouchableOpacity
            onPress={() => router.push(`/(app)/trips/${params.id}/itinerary/create`)}
            className="bg-primary px-4 py-2 rounded-lg"
          >
            <Text className="text-primary-foreground text-sm font-medium">+ Add</Text>
          </TouchableOpacity>
        </View>

        {itinerary.length === 0 ? (
          <View className="py-12">
            <Text className="text-6xl text-center mb-4">📋</Text>
            <Text className="text-xl font-semibold text-foreground text-center mb-2">
              No plans yet
            </Text>
            <Text className="text-sm text-muted-foreground text-center mb-6">
              Start building your trip itinerary by adding activities, accommodations, and more.
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/(app)/trips/${params.id}/itinerary/create`)}
              className="bg-primary px-6 py-3 rounded-lg mx-auto"
            >
              <Text className="text-primary-foreground font-medium">Add First Activity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-5">
            {itinerary.map(group => (
              <View key={group.date}>
                <View className="bg-primary/10 px-3 py-2 rounded-lg mb-3">
                  <Text className="text-sm font-semibold text-foreground">
                    {new Date(group.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View className="space-y-3">
                  {group.items.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSheetState({ item, mode: 'view' })}
                      className="bg-card p-4 rounded-xl border border-border"
                    >
                      <View className="flex-row items-start">
                        <Text className="text-3xl mr-3">{getTypeIcon(item.type)}</Text>
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-foreground mb-1">
                            {item.title}
                          </Text>

                          {!item.is_all_day && (
                            <Text className="text-sm text-muted-foreground mb-1">
                              🕐{' '}
                              {new Date(item.start_time).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                              {item.end_time &&
                                ` - ${new Date(item.end_time).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}`}
                            </Text>
                          )}

                          {item.is_all_day && (
                            <Text className="text-sm text-muted-foreground mb-1">🕐 All day</Text>
                          )}

                          {item.location && (
                            <Text className="text-sm text-muted-foreground mb-1">
                              📍 {item.location}
                            </Text>
                          )}

                          {item.notes && (
                            <Text className="text-sm text-muted-foreground mt-2" numberOfLines={2}>
                              {item.notes}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Itinerary Item Detail Sheet */}
      {sheetState.item && (
        <ItineraryItemDetailSheet
          item={sheetState.item}
          open={!!sheetState.item}
          onOpenChange={open => !open && setSheetState({ item: null, mode: 'view' })}
          mode={sheetState.mode}
          onModeChange={mode => setSheetState(prev => ({ ...prev, mode }))}
          currentUserId={currentUserId}
          tripParticipants={tripParticipants}
          onDelete={() => setShowDeleteDialog(true)}
        />
      )}

      {/* TODO: Add delete confirmation dialog */}
    </ScrollView>
  )
}
