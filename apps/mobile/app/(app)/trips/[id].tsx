import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../../../components/ui/button'
import { supabase } from '../../../lib/supabase/client'
import {
  type Trip,
  getTripItineraryItems,
  groupItineraryItemsByDate,
  type GroupedItineraryItems,
  getUserExpensesForTrip,
  type ExpenseWithDetails,
  calculateUserBalances,
  optimizeSettlements,
  type OptimizedSettlement,
} from '@tripthreads/core'

export default function TripDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [itineraryItems, setItineraryItems] = useState<GroupedItineraryItems[]>([])
  const [itineraryLoading, setItineraryLoading] = useState(false)
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([])
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [settlements, setSettlements] = useState<OptimizedSettlement[]>([])

  useEffect(() => {
    if (!params.id) {
      setError('Invalid trip ID')
      setLoading(false)
      return
    }

    loadTrip()
  }, [params.id])

  const loadTrip = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', params.id)
        .single()

      if (fetchError) {
        console.error('Error loading trip:', fetchError)
        setError('Failed to load trip')
        setLoading(false)
        return
      }

      setTrip(data as Trip)

      // Load itinerary items and expenses after trip is loaded
      loadItineraryItems()
      loadExpenses()
    } catch (err) {
      console.error('Error loading trip:', err)
      setError('Failed to load trip')
    } finally {
      setLoading(false)
    }
  }

  const loadItineraryItems = async () => {
    if (!params.id) return

    try {
      setItineraryLoading(true)
      const items = await getTripItineraryItems(supabase, params.id)
      const grouped = groupItineraryItemsByDate(items)
      setItineraryItems(grouped)
    } catch (err) {
      console.error('Error loading itinerary:', err)
      // Don't show error for itinerary, just fail silently
    } finally {
      setItineraryLoading(false)
    }
  }

  const loadExpenses = async () => {
    if (!params.id) return

    try {
      setExpensesLoading(true)
      const expensesData = await getUserExpensesForTrip(supabase, params.id)
      setExpenses(expensesData)

      // Calculate settlements
      // Assume USD as base currency for now (should come from trip settings)
      const baseCurrency = 'USD'
      const balances = calculateUserBalances(expensesData, baseCurrency)
      const optimized = optimizeSettlements(balances)
      setSettlements(optimized)
    } catch (err) {
      console.error('Error loading expenses:', err)
      // Don't show error, just fail silently
    } finally {
      setExpensesLoading(false)
    }
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
    // Convert from minor units to major units
    const majorAmount = amount / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(majorAmount)
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-muted-foreground">Loading trip...</Text>
      </View>
    )
  }

  if (error || !trip) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <StatusBar style="auto" />
        <Text className="text-6xl mb-4">❌</Text>
        <Text className="text-2xl font-bold text-foreground mb-2 text-center">
          {error || 'Trip Not Found'}
        </Text>
        <Text className="text-base text-muted-foreground mb-8 text-center">
          This trip may not exist or you don't have access to it.
        </Text>
        <Button onPress={() => router.replace('/(app)/trips')} accessibilityLabel="Go to trips">
          Go to Trips
        </Button>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <StatusBar style="auto" />

      <View className="px-6 py-8">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Button variant="ghost" onPress={() => router.back()} accessibilityLabel="Go back">
              ← Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => router.push(`/(app)/trips/${params.id}/settings`)}
              accessibilityLabel="Trip settings"
            >
              ⚙️ Settings
            </Button>
          </View>

          <Text className="text-3xl font-bold text-foreground mb-2">{trip.name}</Text>

          {trip.description && (
            <Text className="text-base text-muted-foreground mb-4">{trip.description}</Text>
          )}

          <View className="flex-row items-center">
            <Text className="text-sm text-muted-foreground">
              📅 {new Date(trip.start_date).toLocaleDateString()} -{' '}
              {new Date(trip.end_date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Trip Sections */}
        <View className="space-y-4">
          {/* Itinerary Section */}
          <View className="bg-card p-6 rounded-xl border border-border">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-semibold text-foreground">📋 Itinerary</Text>
              <TouchableOpacity
                onPress={() => router.push(`/(app)/trips/${params.id}/itinerary/create`)}
                className="bg-primary px-3 py-1.5 rounded-lg"
              >
                <Text className="text-primary-foreground text-sm font-medium">+ Add</Text>
              </TouchableOpacity>
            </View>

            {itineraryLoading ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#F97316" />
              </View>
            ) : itineraryItems.length === 0 ? (
              <View className="py-4">
                <Text className="text-muted-foreground text-center">
                  No itinerary items yet. Add your first activity!
                </Text>
              </View>
            ) : (
              <View className="space-y-4">
                {itineraryItems.map(group => (
                  <View key={group.date}>
                    <Text className="text-sm font-semibold text-muted-foreground mb-2">
                      {new Date(group.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <View className="space-y-2">
                      {group.items.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() =>
                            router.push(`/(app)/trips/${params.id}/itinerary/${item.id}`)
                          }
                          className="bg-background p-3 rounded-lg border border-border"
                        >
                          <View className="flex-row items-start">
                            <Text className="text-2xl mr-2">{getTypeIcon(item.type)}</Text>
                            <View className="flex-1">
                              <Text className="text-base font-medium text-foreground">
                                {item.title}
                              </Text>
                              {!item.is_all_day && (
                                <Text className="text-sm text-muted-foreground">
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
                              {item.location && (
                                <Text className="text-sm text-muted-foreground">
                                  📍 {item.location}
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

          {/* Expenses Section */}
          <View className="bg-card p-6 rounded-xl border border-border">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-semibold text-foreground">💰 Expenses</Text>
              <TouchableOpacity
                onPress={() => router.push(`/(app)/trips/${params.id}/expenses/create`)}
                className="bg-primary px-3 py-1.5 rounded-lg"
              >
                <Text className="text-primary-foreground text-sm font-medium">+ Add</Text>
              </TouchableOpacity>
            </View>

            {expensesLoading ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#F97316" />
              </View>
            ) : expenses.length === 0 ? (
              <View className="py-4">
                <Text className="text-muted-foreground text-center">
                  No expenses yet. Add your first expense!
                </Text>
              </View>
            ) : (
              <View className="space-y-4">
                {/* Settlement Summary */}
                {settlements.length > 0 && (
                  <View className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-2">
                    <Text className="text-sm font-semibold text-foreground mb-2">
                      💸 Settlements
                    </Text>
                    {settlements.map((settlement, index) => (
                      <Text key={index} className="text-sm text-muted-foreground">
                        {settlement.from_user_name} owes {settlement.to_user_name}{' '}
                        {formatCurrency(settlement.amount, 'USD')}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Expense List */}
                <View className="space-y-2">
                  {expenses.slice(0, 5).map(expense => (
                    <TouchableOpacity
                      key={expense.id}
                      onPress={() =>
                        router.push(`/(app)/trips/${params.id}/expenses/${expense.id}`)
                      }
                      className="bg-background p-3 rounded-lg border border-border"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-row items-start flex-1">
                          <Text className="text-2xl mr-2">{getCategoryIcon(expense.category)}</Text>
                          <View className="flex-1">
                            <Text className="text-base font-medium text-foreground">
                              {expense.description}
                            </Text>
                            <Text className="text-sm text-muted-foreground">
                              Paid by {expense.payer.full_name || 'Unknown'}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-base font-semibold text-foreground">
                          {formatCurrency(expense.amount, expense.currency)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {expenses.length > 5 && (
                    <TouchableOpacity
                      onPress={() => router.push(`/(app)/trips/${params.id}/expenses`)}
                      className="py-2"
                    >
                      <Text className="text-center text-primary font-medium">
                        View all {expenses.length} expenses →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Media Section */}
          <View className="bg-card p-6 rounded-xl border border-border">
            <Text className="text-xl font-semibold text-foreground mb-2">📸 Photos</Text>
            <Text className="text-muted-foreground">Trip photos will be displayed here</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
