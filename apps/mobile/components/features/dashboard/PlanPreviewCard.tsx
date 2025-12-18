import { View, Text, TouchableOpacity } from 'react-native'
import type { GroupedItineraryItems } from '@tripthreads/core'

interface PlanPreviewCardProps {
  itinerary: GroupedItineraryItems[]
  onViewAll: () => void
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

export function PlanPreviewCard({ itinerary, onViewAll }: PlanPreviewCardProps) {
  // Get upcoming itinerary items (next 2 dates)
  const upcomingGroups = itinerary.slice(0, 2)

  return (
    <View className="bg-card p-6 rounded-xl border border-border mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-semibold text-foreground">📋 Itinerary</Text>
        <TouchableOpacity onPress={onViewAll} className="bg-primary/10 px-3 py-1.5 rounded-lg">
          <Text className="text-primary text-sm font-medium">View All →</Text>
        </TouchableOpacity>
      </View>

      {itinerary.length === 0 ? (
        <View className="py-4">
          <Text className="text-muted-foreground text-center text-sm">
            No plans yet. Start adding activities!
          </Text>
        </View>
      ) : (
        <View className="space-y-3">
          {upcomingGroups.map(group => (
            <View key={group.date}>
              <Text className="text-xs font-semibold text-muted-foreground mb-2">
                {new Date(group.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <View className="space-y-2">
                {group.items.slice(0, 2).map(item => (
                  <View key={item.id} className="bg-background p-3 rounded-lg border border-border">
                    <View className="flex-row items-start">
                      <Text className="text-xl mr-2">{getTypeIcon(item.type)}</Text>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-foreground">{item.title}</Text>
                        {!item.is_all_day && (
                          <Text className="text-xs text-muted-foreground">
                            {new Date(item.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </Text>
                        )}
                        {item.location && (
                          <Text className="text-xs text-muted-foreground">📍 {item.location}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
                {group.items.length > 2 && (
                  <Text className="text-xs text-muted-foreground">
                    +{group.items.length - 2} more
                  </Text>
                )}
              </View>
            </View>
          ))}

          {itinerary.length > 2 && (
            <Text className="text-xs text-muted-foreground text-center mt-2">
              +{itinerary.length - 2} more dates
            </Text>
          )}
        </View>
      )}
    </View>
  )
}
