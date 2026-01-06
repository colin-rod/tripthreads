import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import type { ExpenseWithDetails, OptimizedSettlement } from '@tripthreads/core'
import { ExpenseDetailSheet } from './ExpenseDetailSheet'

interface ExpensesSectionProps {
  expenses: ExpenseWithDetails[]
  settlements: OptimizedSettlement[]
  currentUserId: string
  tripParticipants: Array<{ id: string; full_name: string | null; avatar_url?: string | null }>
  loading?: boolean
  error?: string
}

const formatCurrency = (amount: number, currency: string) => {
  const majorAmount = amount / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(majorAmount)
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

export function ExpensesSection({
  expenses,
  settlements,
  currentUserId,
  tripParticipants,
  loading,
  error,
}: ExpensesSectionProps) {
  const router = useRouter()
  const params = useLocalSearchParams<{ id: string }>()

  // Sheet state for view/edit
  const [sheetState, setSheetState] = useState<{
    expense: ExpenseWithDetails | null
    mode: 'view' | 'edit'
  }>({ expense: null, mode: 'view' })

  const [_showDeleteDialog, setShowDeleteDialog] = useState(false)

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-muted-foreground">Loading expenses...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-background">
        <Text className="text-4xl mb-4">💸</Text>
        <Text className="text-xl font-bold text-foreground mb-2 text-center">{error}</Text>
        <Text className="text-sm text-muted-foreground text-center">
          Unable to load expenses at this time.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-6 py-4">
        {/* Header with Add button */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-foreground">💰 All Expenses</Text>
          <TouchableOpacity
            onPress={() => router.push(`/(app)/trips/${params.id}/expenses/create`)}
            className="bg-primary px-4 py-2 rounded-lg"
          >
            <Text className="text-primary-foreground text-sm font-medium">+ Add</Text>
          </TouchableOpacity>
        </View>

        {expenses.length === 0 ? (
          <View className="py-12">
            <Text className="text-6xl text-center mb-4">💰</Text>
            <Text className="text-xl font-semibold text-foreground text-center mb-2">
              No expenses yet
            </Text>
            <Text className="text-sm text-muted-foreground text-center mb-6">
              Start tracking your trip expenses to split costs with your group.
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/(app)/trips/${params.id}/expenses/create`)}
              className="bg-primary px-6 py-3 rounded-lg mx-auto"
            >
              <Text className="text-primary-foreground font-medium">Add First Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Settlement Summary */}
            {settlements.length > 0 && (
              <View className="bg-primary/10 p-5 rounded-xl border border-primary/20 mb-6">
                <Text className="text-lg font-semibold text-foreground mb-3">💸 Settlements</Text>
                {settlements.map((settlement, index) => (
                  <View key={index} className="flex-row items-center justify-between py-2">
                    <View className="flex-1">
                      <Text className="text-sm text-foreground">
                        {settlement.from_user_name}{' '}
                        <Text className="text-muted-foreground">owes</Text>{' '}
                        {settlement.to_user_name}
                      </Text>
                    </View>
                    <Text className="text-base font-semibold text-primary">
                      {formatCurrency(settlement.amount, 'USD')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Expense List */}
            <View className="space-y-3">
              <Text className="text-lg font-semibold text-foreground mb-2">
                All Expenses ({expenses.length})
              </Text>
              {expenses.map(expense => (
                <TouchableOpacity
                  key={expense.id}
                  onPress={() => setSheetState({ expense, mode: 'view' })}
                  className="bg-card p-4 rounded-xl border border-border"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-start flex-1">
                      <Text className="text-2xl mr-3">{getCategoryIcon(expense.category)}</Text>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-foreground mb-1">
                          {expense.description}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          Paid by {expense.payer.full_name || 'Unknown'}
                        </Text>
                        <Text className="text-xs text-muted-foreground mt-1">
                          {new Date(expense.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-semibold text-foreground ml-3">
                      {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Expense Detail Sheet */}
      {sheetState.expense && (
        <ExpenseDetailSheet
          expense={sheetState.expense}
          open={!!sheetState.expense}
          onOpenChange={open => !open && setSheetState({ expense: null, mode: 'view' })}
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
