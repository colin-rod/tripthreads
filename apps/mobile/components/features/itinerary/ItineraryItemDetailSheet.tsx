/**
 * ItineraryItemDetailSheet Component (Mobile)
 *
 * React Native Sheet for viewing itinerary item details.
 * Supports view mode with basic metadata display.
 */

import { View, Text } from 'react-native'
import { format } from 'date-fns'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../../ui/sheet'
import { Button } from '../../ui/button'

interface ItineraryItemDetailSheetProps {
  item: ItineraryItemWithParticipants | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'view' | 'edit'
  onModeChange?: (mode: 'view' | 'edit') => void
  currentUserId: string
  tripParticipants?: Array<{ id: string; full_name: string | null; avatar_url?: string | null }>
  onDelete?: () => void
  onSuccess?: () => void
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

const getTypeLabel = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function ItineraryItemDetailSheet({
  item,
  open,
  onOpenChange,
  mode = 'view',
  onModeChange,
  currentUserId,
  onDelete,
}: ItineraryItemDetailSheetProps) {
  if (!item) return null

  const canEdit = currentUserId === item.created_by

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">{getTypeIcon(item.type)}</Text>
            <SheetTitle>{mode === 'view' ? item.title : 'Edit Activity'}</SheetTitle>
          </View>
          <SheetDescription>
            {getTypeLabel(item.type)} • {format(new Date(item.start_time), 'MMM d, yyyy')}
          </SheetDescription>
        </SheetHeader>

        <View className="py-6 space-y-6">
          {mode === 'view' ? (
            <View className="space-y-4">
              {/* Time */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">Time</Text>
                {item.is_all_day ? (
                  <Text className="text-base text-foreground">All day</Text>
                ) : (
                  <Text className="text-base text-foreground">
                    {format(new Date(item.start_time), 'h:mm a')}
                    {item.end_time && ` - ${format(new Date(item.end_time), 'h:mm a')}`}
                  </Text>
                )}
              </View>

              {/* Location */}
              {item.location && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-1">Location</Text>
                  <Text className="text-base text-foreground">{item.location}</Text>
                </View>
              )}

              {/* Description */}
              {item.description && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-1">Description</Text>
                  <Text className="text-base text-foreground">{item.description}</Text>
                </View>
              )}

              {/* Notes */}
              {item.notes && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-1">Notes</Text>
                  <Text className="text-base text-foreground">{item.notes}</Text>
                </View>
              )}

              {/* Links */}
              {item.links && item.links.length > 0 && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-2">Links</Text>
                  <View className="space-y-2">
                    {item.links.map((link, index) => (
                      <View key={index}>
                        <Text className="text-sm font-medium text-foreground">
                          {link.title || 'Link'}
                        </Text>
                        <Text className="text-xs text-primary" numberOfLines={1}>
                          {link.url}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Participants */}
              {item.participants && item.participants.length > 0 && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-2">Participants</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {item.participants.map(participant => (
                      <View key={participant.id} className="bg-secondary px-3 py-1 rounded-full">
                        <Text className="text-sm text-secondary-foreground">
                          {participant.user?.full_name || 'Unknown'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View className="space-y-4">
              {/* Edit mode form would go here */}
              {/* For MVP, we can defer edit mode implementation */}
              <Text className="text-center text-muted-foreground">Edit mode coming soon</Text>
            </View>
          )}
        </View>

        <SheetFooter>
          {mode === 'view' && canEdit && (
            <View className="flex-row gap-2 w-full">
              {onDelete && (
                <Button onPress={onDelete} variant="destructive" className="flex-1">
                  <Text className="text-destructive-foreground font-medium">Delete</Text>
                </Button>
              )}
              <Button onPress={() => onModeChange?.('edit')} className="flex-1">
                <Text className="text-primary-foreground font-medium">Edit</Text>
              </Button>
            </View>
          )}
          {mode === 'edit' && (
            <View className="flex-row gap-2 w-full">
              <Button onPress={() => onModeChange?.('view')} variant="outline" className="flex-1">
                <Text className="text-foreground font-medium">Cancel</Text>
              </Button>
              <Button
                onPress={() => {
                  // Save logic would go here
                  onModeChange?.('view')
                }}
                className="flex-1"
              >
                <Text className="text-primary-foreground font-medium">Save</Text>
              </Button>
            </View>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
