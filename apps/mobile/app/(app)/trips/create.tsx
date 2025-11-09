import { useState } from 'react'
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTripSchema, createTrip, type CreateTripInput } from '@tripthreads/core'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../../lib/auth/auth-context'
import { supabase } from '../../../lib/supabase/client'
import { useToast } from '../../../hooks/use-toast'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../components/ui/form'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { DatePicker } from '../../../components/ui/date-picker'
import { Button } from '../../../components/ui/button'
import { Text } from '../../../components/ui/text'

export default function CreateTripScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      name: '',
      description: '',
      start_date: undefined,
      end_date: undefined,
      owner_id: user?.id || '',
    },
  })

  const onSubmit = async (data: CreateTripInput) => {
    try {
      setIsSubmitting(true)

      // Ensure owner_id is set
      const tripData = {
        ...data,
        owner_id: user?.id || '',
      }

      const trip = await createTrip(supabase, tripData)

      toast({
        title: 'Trip created!',
        description: `${trip.name} has been created successfully.`,
        variant: 'success',
      })

      // Navigate to the new trip
      router.replace(`/(app)/trips/${trip.id}`)
    } catch (error) {
      console.error('Error creating trip:', error)
      toast({
        title: 'Error creating trip',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 py-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-6">
            <Text size="3xl" weight="bold" className="mb-2">
              Create a New Trip
            </Text>
            <Text variant="muted">Start planning your next adventure by creating a trip</Text>
          </View>

          {/* Form */}
          <Form {...form}>
            <View className="space-y-4">
              {/* Trip Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Trip Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Paris Summer 2025"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        maxLength={100}
                        autoCapitalize="words"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date */}
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
                        minimumDate={new Date()}
                        placeholder="Select start date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => {
                  const startDate = form.watch('start_date')
                  return (
                    <FormItem>
                      <FormLabel required>End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={date => field.onChange(date?.toISOString())}
                          minimumDate={startDate ? new Date(startDate) : new Date()}
                          placeholder="Select end date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              {/* Description (Optional) */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What's this trip about? (Optional)"
                        value={field.value || ''}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        maxLength={500}
                        showCharCount
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </View>
          </Form>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-8 mb-4">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onPress={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Trip'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
