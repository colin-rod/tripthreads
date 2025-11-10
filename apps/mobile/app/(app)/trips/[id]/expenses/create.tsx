import { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  createExpense,
  getTripById,
  type CreateExpenseInput,
  type CreateExpenseParticipantInput,
} from '@tripthreads/core'

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
import { DatePicker } from '../../../../../components/ui/date-picker'
import { Button } from '../../../../../components/ui/button'
import { Text } from '../../../../../components/ui/text'

// Validation schema
const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  currency: z.string().length(3, 'Currency must be 3 letters'),
  category: z.enum(['food', 'transport', 'accommodation', 'activity', 'other']),
  date: z.string().datetime('Invalid date'),
})

type CreateExpenseForm = z.infer<typeof createExpenseSchema>

interface TripParticipant {
  id: string
  user_id: string
  user: {
    id: string
    full_name: string | null
    email: string
  } | null
}

export default function CreateExpenseScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [participantsLoading, setParticipantsLoading] = useState(true)
  const [tripParticipants, setTripParticipants] = useState<TripParticipant[]>([])
  const [payerId, setPayerId] = useState<string>('')
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())

  const form = useForm<CreateExpenseForm>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      description: '',
      amount: '',
      currency: 'USD',
      category: 'other',
      date: new Date().toISOString(),
    },
  })

  useEffect(() => {
    loadTripParticipants()
  }, [params.id, user?.id])

  const loadTripParticipants = async () => {
    if (!params.id || !user?.id) return

    try {
      setParticipantsLoading(true)
      const trip = await getTripById(supabase, params.id)

      if (trip.trip_participants) {
        // Transform the data to match TripParticipant interface
        const participants: TripParticipant[] = trip.trip_participants.map(p => ({
          id: p.id,
          user_id: p.user.id,
          user: p.user,
        }))
        setTripParticipants(participants)

        // Set current user as default payer
        setPayerId(user.id)

        // Select all participants by default
        const allParticipantIds = new Set(participants.map(p => p.user_id))
        setSelectedParticipants(allParticipantIds)
      }
    } catch (error) {
      console.error('Error loading participants:', error)
      toast({
        title: 'Error',
        description: 'Failed to load trip participants',
        variant: 'destructive',
      })
    } finally {
      setParticipantsLoading(false)
    }
  }

  const toggleParticipant = (userId: string) => {
    const newSet = new Set(selectedParticipants)
    if (newSet.has(userId)) {
      if (newSet.size > 1) {
        // Don't allow removing if it's the last participant
        newSet.delete(userId)
      }
    } else {
      newSet.add(userId)
    }
    setSelectedParticipants(newSet)
  }

  const handleSubmit = async (data: CreateExpenseForm) => {
    if (!params.id || !user?.id || !payerId) return

    if (selectedParticipants.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one participant',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      // Convert amount from dollars to cents
      const amountInCents = Math.round(parseFloat(data.amount) * 100)

      // Create participants list with equal split
      const participants: CreateExpenseParticipantInput[] = Array.from(selectedParticipants).map(
        userId => ({
          userId,
          shareType: 'equal' as const,
        })
      )

      const expenseInput: CreateExpenseInput = {
        tripId: params.id,
        description: data.description,
        amount: amountInCents,
        currency: data.currency,
        category: data.category,
        payerId: payerId,
        date: data.date,
        participants,
      }

      await createExpense(supabase, expenseInput)

      toast({
        title: 'Expense added',
        description: 'Your expense has been added to the trip',
        variant: 'success',
      })

      router.back()
    } catch (error) {
      console.error('Error creating expense:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create expense',
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
              Add Expense
            </Text>
            <Text variant="muted">Track a new expense for your trip</Text>
          </View>

          {participantsLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#F97316" />
              <Text variant="muted" className="mt-4">
                Loading participants...
              </Text>
            </View>
          ) : (
            <Form {...form}>
              <View className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Dinner at restaurant"
                          value={field.value}
                          onChangeText={field.onChange}
                          autoCapitalize="sentences"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Amount</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0.00"
                              value={field.value}
                              onChangeText={field.onChange}
                              keyboardType="decimal-pad"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </View>

                  <View className="w-24">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Currency</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="USD"
                              value={field.value}
                              onChangeText={val => field.onChange(val.toUpperCase())}
                              maxLength={3}
                              autoCapitalize="characters"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </View>
                </View>

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Category</FormLabel>
                      <FormControl>
                        <View className="flex-row flex-wrap gap-2">
                          {[
                            { label: '🍽️ Food', value: 'food' },
                            { label: '🚗 Transport', value: 'transport' },
                            { label: '🏨 Accommodation', value: 'accommodation' },
                            { label: '🎯 Activity', value: 'activity' },
                            { label: '💰 Other', value: 'other' },
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
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Date</FormLabel>
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

                {/* Payer Selection */}
                <View>
                  <Text size="sm" weight="semibold" className="mb-2">
                    Who paid?
                  </Text>
                  <View className="space-y-2">
                    {tripParticipants.map(participant => (
                      <TouchableOpacity
                        key={participant.user_id}
                        onPress={() => setPayerId(participant.user_id)}
                        className={`p-3 rounded-lg border ${
                          payerId === participant.user_id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background border-border'
                        }`}
                      >
                        <Text
                          className={`text-base ${
                            payerId === participant.user_id
                              ? 'text-primary font-medium'
                              : 'text-foreground'
                          }`}
                        >
                          {participant.user?.full_name || participant.user?.email || 'Unknown'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Participant Selection (Equal Split) */}
                <View>
                  <Text size="sm" weight="semibold" className="mb-2">
                    Split equally between:
                  </Text>
                  <View className="space-y-2">
                    {tripParticipants.map(participant => {
                      const isSelected = selectedParticipants.has(participant.user_id)
                      return (
                        <TouchableOpacity
                          key={participant.user_id}
                          onPress={() => toggleParticipant(participant.user_id)}
                          className={`p-3 rounded-lg border ${
                            isSelected
                              ? 'bg-primary/10 border-primary'
                              : 'bg-background border-border'
                          }`}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text
                              className={`text-base ${
                                isSelected ? 'text-primary font-medium' : 'text-foreground'
                              }`}
                            >
                              {participant.user?.full_name || participant.user?.email || 'Unknown'}
                            </Text>
                            {isSelected && <Text className="text-primary">✓</Text>}
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                  <Text size="xs" variant="muted" className="mt-2">
                    {selectedParticipants.size} participant(s) selected
                  </Text>
                </View>

                <View className="pt-4">
                  <Button
                    onPress={form.handleSubmit(handleSubmit)}
                    disabled={loading || !payerId || selectedParticipants.size === 0}
                    className="w-full"
                  >
                    {loading ? 'Adding...' : '✅ Add Expense'}
                  </Button>
                </View>
              </View>
            </Form>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
