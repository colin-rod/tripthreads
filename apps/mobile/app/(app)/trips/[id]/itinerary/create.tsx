import { useState } from 'react'
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createItineraryItem, type Database } from '@tripthreads/core'

import { supabase } from '../../../../../lib/supabase/client'
import { useAuth } from '../../../../../lib/auth/auth-context'
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

// Validation schema for creating itinerary item
const createItineraryItemSchema = z.object({
  type: z.enum(['transport', 'accommodation', 'dining', 'activity', 'sightseeing', 'general']),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  start_time: z.string().datetime('Invalid start time'),
  end_time: z.string().datetime('Invalid end time').optional().nullable(),
  is_all_day: z.boolean().optional(),
  location: z.string().max(500, 'Location must be less than 500 characters').optional(),
})

type CreateItineraryItemForm = z.infer<typeof createItineraryItemSchema>

export default function CreateItineraryItemScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const form = useForm<CreateItineraryItemForm>({
    resolver: zodResolver(createItineraryItemSchema),
    defaultValues: {
      type: 'activity',
      title: '',
      description: '',
      notes: '',
      start_time: new Date().toISOString(),
      end_time: null,
      is_all_day: false,
      location: '',
    },
  })

  const handleSubmit = async (data: CreateItineraryItemForm) => {
    if (!params.id || !user?.id) return

    try {
      setLoading(true)

      const itemData: Database['public']['Tables']['itinerary_items']['Insert'] = {
        trip_id: params.id,
        type: data.type,
        title: data.title,
        description: data.description || null,
        notes: data.notes || null,
        start_time: data.start_time,
        end_time: data.end_time || null,
        is_all_day: data.is_all_day || false,
        location: data.location || null,
        created_by: user.id,
        links: [],
        metadata: {},
      }

      await createItineraryItem(supabase, itemData)

      toast({
        title: 'Itinerary item added',
        description: 'Your activity has been added to the trip',
        variant: 'success',
      })

      router.back()
    } catch (error) {
      console.error('Error creating itinerary item:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create itinerary item',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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
              Add Itinerary Item
            </Text>
            <Text variant="muted">Add a new activity to your trip</Text>
          </View>

          {/* Form */}
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
                      <Input
                        placeholder="e.g., Visit Eiffel Tower"
                        value={field.value}
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
                        minimumDate={
                          form.watch('start_time') ? new Date(form.watch('start_time')!) : undefined
                        }
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
                      <Input
                        placeholder="e.g., Champ de Mars, Paris"
                        value={field.value || ''}
                        onChangeText={field.onChange}
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
                        placeholder="Add any notes..."
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

              <View className="pt-4">
                <Button
                  onPress={form.handleSubmit(handleSubmit)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Creating...' : '✅ Add to Itinerary'}
                </Button>
              </View>
            </View>
          </Form>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
