import { useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  type ItineraryItemWithParticipants,
} from '@tripthreads/core'

import { supabase } from '../../../../../lib/supabase/client'
import { useToast } from '../../../../../hooks/use-toast'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../../../../../components/ui/form'
import { Input } from '../../../../../components/ui/input'
import { Textarea } from '../../../../../components/ui/textarea'
import { DatePicker } from '../../../../../components/ui/date-picker'
import { Button } from '../../../../../components/ui/button'
import { Text } from '../../../../../components/ui/text'

// Validation schema
const updateItineraryItemSchema = z.object({
  type: z
    .enum(['transport', 'accommodation', 'dining', 'activity', 'sightseeing', 'general'])
    .optional(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  start_time: z.string().datetime('Invalid start time').optional(),
  end_time: z.string().datetime('Invalid end time').optional().nullable(),
  location: z.string().max(500, 'Location must be less than 500 characters').optional(),
})

type UpdateItineraryItemForm = z.infer<typeof updateItineraryItemSchema>

export default function ItineraryItemDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string; itemId: string }>()
  const { toast } = useToast()

  const [item, setItem] = useState<ItineraryItemWithParticipants | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const form = useForm<UpdateItineraryItemForm>({
    resolver: zodResolver(updateItineraryItemSchema),
  })

  useEffect(() => {
    if (params.itemId) {
      loadItem()
    }
  }, [params.itemId])

  const loadItem = async () => {
    try {
      setLoading(true)
      const data = await getItineraryItem(supabase, params.itemId)
      setItem(data)

      // Populate form
      form.reset({
        type: data.type,
        title: data.title,
        description: data.description || '',
        notes: data.notes || '',
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location || '',
      })
    } catch (error) {
      console.error('Error loading itinerary item:', error)
      toast({
        title: 'Error',
        description: 'Failed to load itinerary item',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: UpdateItineraryItemForm) => {
    try {
      setSaveLoading(true)

      await updateItineraryItem(supabase, params.itemId, data)
      // Re-fetch the item with participants to ensure proper typing
      const refreshedItem = await getItineraryItem(supabase, params.itemId)
      setItem(refreshedItem)
      setIsEditing(false)

      toast({
        title: 'Item updated',
        description: 'Your changes have been saved',
        variant: 'success',
      })
    } catch (error) {
      console.error('Error updating itinerary item:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update item',
        variant: 'destructive',
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDelete = () => {
    Alert.alert('Delete Item', `Are you sure you want to delete "${item?.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleteLoading(true)
            await deleteItineraryItem(supabase, params.itemId)

            toast({
              title: 'Item deleted',
              description: 'The itinerary item has been deleted',
              variant: 'success',
            })

            router.back()
          } catch (error) {
            console.error('Error deleting itinerary item:', error)
            toast({
              title: 'Error',
              description: 'Failed to delete item',
              variant: 'destructive',
            })
          } finally {
            setDeleteLoading(false)
          }
        },
      },
    ])
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#F97316" />
        <Text variant="muted" className="mt-4">
          Loading...
        </Text>
      </SafeAreaView>
    )
  }

  if (!item) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center px-6 bg-background">
        <Text size="2xl" weight="bold" className="mb-2">
          Item Not Found
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

            <View className="flex-row items-center mb-2">
              <Text size="3xl" className="mr-2">
                {getTypeIcon(item.type)}
              </Text>
              <Text size="2xl" weight="bold" className="flex-1">
                {isEditing ? 'Edit Item' : item.title}
              </Text>
            </View>

            {!isEditing && (
              <View className="flex-row items-center gap-2">
                <Button variant="outline" size="sm" onPress={() => setIsEditing(true)}>
                  ✏️ Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onPress={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : '🗑️ Delete'}
                </Button>
              </View>
            )}
          </View>

          {isEditing ? (
            // Edit Form
            <Form {...form}>
              <View className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Type</FormLabel>
                      <FormControl>
                        <View className="flex-row flex-wrap gap-2">
                          {[
                            { label: '✈️ Transport', value: 'transport' },
                            { label: '🏨 Accommodation', value: 'accommodation' },
                            { label: '🍽️ Dining', value: 'dining' },
                            { label: '🎯 Activity', value: 'activity' },
                            { label: '🏛️ Sightseeing', value: 'sightseeing' },
                            { label: '📌 General', value: 'general' },
                          ].map(option => (
                            <TouchableOpacity
                              key={option.value}
                              onPress={() => field.onChange(option.value)}
                              className={`px-4 py-2 rounded-lg border ${
                                field.value === option.value
                                  ? 'bg-primary border-primary'
                                  : 'bg-background border-border'
                              }`}
                            >
                              <Text
                                className={`text-sm ${
                                  field.value === option.value
                                    ? 'text-primary-foreground'
                                    : 'text-foreground'
                                }`}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Title</FormLabel>
                      <FormControl>
                        <Input value={field.value || ''} onChangeText={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Start Time</FormLabel>
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
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time (Optional)</FormLabel>
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
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input value={field.value || ''} onChangeText={field.onChange} />
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
                          value={field.value || ''}
                          onChangeText={field.onChange}
                          maxLength={1000}
                          showCharCount
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value || ''}
                          onChangeText={field.onChange}
                          maxLength={1000}
                          showCharCount
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <View className="flex-row gap-2 pt-4">
                  <Button
                    variant="default"
                    onPress={form.handleSubmit(handleSave)}
                    disabled={saveLoading}
                    className="flex-1"
                  >
                    {saveLoading ? 'Saving...' : '💾 Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => {
                      setIsEditing(false)
                      form.reset({
                        type: item.type,
                        title: item.title,
                        description: item.description || '',
                        notes: item.notes || '',
                        start_time: item.start_time,
                        end_time: item.end_time,
                        location: item.location || '',
                      })
                    }}
                    disabled={saveLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            </Form>
          ) : (
            // View Mode
            <View className="space-y-4">
              <View className="bg-card p-4 rounded-xl border border-border">
                <Text size="sm" variant="muted" className="mb-1">
                  Time
                </Text>
                <Text size="base">
                  {new Date(item.start_time).toLocaleString()}
                  {item.end_time && ` - ${new Date(item.end_time).toLocaleString()}`}
                </Text>
              </View>

              {item.location && (
                <View className="bg-card p-4 rounded-xl border border-border">
                  <Text size="sm" variant="muted" className="mb-1">
                    Location
                  </Text>
                  <Text size="base">📍 {item.location}</Text>
                </View>
              )}

              {item.description && (
                <View className="bg-card p-4 rounded-xl border border-border">
                  <Text size="sm" variant="muted" className="mb-1">
                    Description
                  </Text>
                  <Text size="base">{item.description}</Text>
                </View>
              )}

              {item.notes && (
                <View className="bg-card p-4 rounded-xl border border-border">
                  <Text size="sm" variant="muted" className="mb-1">
                    Notes
                  </Text>
                  <Text size="base">{item.notes}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
