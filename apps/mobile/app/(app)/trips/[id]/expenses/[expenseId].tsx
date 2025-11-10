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
  getExpenseById,
  updateExpense,
  deleteExpense,
  type ExpenseWithDetails,
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
const updateExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200).optional(),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Amount must be a positive number',
  }).optional(),
  currency: z.string().length(3, 'Currency must be 3 letters').optional(),
  category: z.enum(['food', 'transport', 'accommodation', 'activity', 'other']).optional(),
  date: z.string().datetime('Invalid date').optional(),
})

type UpdateExpenseForm = z.infer<typeof updateExpenseSchema>

export default function ExpenseDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string; expenseId: string }>()
  const { user } = useAuth()
  const { toast } = useToast()

  const [expense, setExpense] = useState<ExpenseWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const form = useForm<UpdateExpenseForm>({
    resolver: zodResolver(updateExpenseSchema),
  })

  useEffect(() => {
    if (params.expenseId) {
      loadExpense()
    }
  }, [params.expenseId])

  const loadExpense = async () => {
    try {
      setLoading(true)
      const data = await getExpenseById(supabase, params.expenseId)
      setExpense(data)

      // Populate form (convert cents to dollars for display)
      form.reset({
        description: data.description,
        amount: (data.amount / 100).toFixed(2),
        currency: data.currency,
        category: data.category,
        date: data.date,
      })
    } catch (error) {
      console.error('Error loading expense:', error)
      toast({
        title: 'Error',
        description: 'Failed to load expense',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: UpdateExpenseForm) => {
    try {
      setSaveLoading(true)

      // Convert amount from dollars to cents if provided
      const updates: any = {}
      if (data.description) updates.description = data.description
      if (data.amount) updates.amount = Math.round(parseFloat(data.amount) * 100)
      if (data.currency) updates.currency = data.currency
      if (data.category) updates.category = data.category
      if (data.date) updates.date = data.date

      const updated = await updateExpense(supabase, params.expenseId, updates)
      setExpense(updated as ExpenseWithDetails)
      setIsEditing(false)

      toast({
        title: 'Expense updated',
        description: 'Your changes have been saved',
        variant: 'success',
      })
    } catch (error) {
      console.error('Error updating expense:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update expense',
        variant: 'destructive',
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense?.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleteLoading(true)
              await deleteExpense(supabase, params.expenseId)

              toast({
                title: 'Expense deleted',
                description: 'The expense has been deleted',
                variant: 'success',
              })

              router.back()
            } catch (error) {
              console.error('Error deleting expense:', error)
              toast({
                title: 'Error',
                description: 'Failed to delete expense',
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food':
        return '🍽️'
      case 'transport':
        return '🚗'
      case 'accommodation':
        return '🏨'
      case 'activity':
        return '🎯'
      default:
        return '💰'
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    const majorAmount = amount / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(majorAmount)
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

  if (!expense) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center px-6 bg-background">
        <Text size="2xl" weight="bold" className="mb-2">
          Expense Not Found
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
                {getCategoryIcon(expense.category)}
              </Text>
              <Text size="2xl" weight="bold" className="flex-1">
                {isEditing ? 'Edit Expense' : expense.description}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Description</FormLabel>
                      <FormControl>
                        <Input value={field.value || ''} onChangeText={field.onChange} />
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
                              value={field.value || ''}
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
                              value={field.value || ''}
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
                          mode="date"
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
                        description: expense.description,
                        amount: (expense.amount / 100).toFixed(2),
                        currency: expense.currency,
                        category: expense.category,
                        date: expense.date,
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
                  Amount
                </Text>
                <Text size="2xl" weight="bold" className="text-primary">
                  {formatCurrency(expense.amount, expense.currency)}
                </Text>
              </View>

              <View className="bg-card p-4 rounded-xl border border-border">
                <Text size="sm" variant="muted" className="mb-1">
                  Paid by
                </Text>
                <Text size="base">{expense.payer.full_name || 'Unknown'}</Text>
              </View>

              <View className="bg-card p-4 rounded-xl border border-border">
                <Text size="sm" variant="muted" className="mb-1">
                  Date
                </Text>
                <Text size="base">{new Date(expense.date).toLocaleDateString()}</Text>
              </View>

              <View className="bg-card p-4 rounded-xl border border-border">
                <Text size="sm" variant="muted" className="mb-2">
                  Split between ({expense.participants.length})
                </Text>
                {expense.participants.map(participant => (
                  <View key={participant.id} className="flex-row justify-between py-1">
                    <Text size="sm" className="text-foreground">
                      {participant.user.full_name || 'Unknown'}
                    </Text>
                    <Text size="sm" className="text-muted-foreground">
                      {formatCurrency(participant.share_amount, expense.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
