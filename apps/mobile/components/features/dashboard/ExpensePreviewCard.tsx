import { View, Text, TouchableOpacity } from 'react-native'
import type { ExpenseWithDetails, OptimizedSettlement } from '@tripthreads/core'

interface ExpensePreviewCardProps {
  expenses: ExpenseWithDetails[]
  settlements: OptimizedSettlement[]
  onViewAll: () => void
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

export function ExpensePreviewCard({ expenses, settlements, onViewAll }: ExpensePreviewCardProps) {
  const recentExpenses = expenses.slice(0, 3)

  return (
    <View className="bg-card p-6 rounded-xl border border-border mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-semibold text-foreground">💰 Expenses</Text>
        <TouchableOpacity onPress={onViewAll} className="bg-primary/10 px-3 py-1.5 rounded-lg">
          <Text className="text-primary text-sm font-medium">View All →</Text>
        </TouchableOpacity>
      </View>

      {expenses.length === 0 ? (
        <View className="py-4">
          <Text className="text-muted-foreground text-center text-sm">
            No expenses yet. Start tracking!
          </Text>
        </View>
      ) : (
        <View>
          {/* Settlement Summary */}
          {settlements.length > 0 && (
            <View className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-3">
              <Text className="text-sm font-semibold text-foreground mb-2">💸 Settlements</Text>
              {settlements.slice(0, 2).map((settlement, index) => (
                <Text key={index} className="text-sm text-muted-foreground mb-1">
                  {settlement.from_user_name} owes {settlement.to_user_name}{' '}
                  {formatCurrency(settlement.amount, 'USD')}
                </Text>
              ))}
              {settlements.length > 2 && (
                <Text className="text-xs text-muted-foreground mt-1">
                  +{settlements.length - 2} more
                </Text>
              )}
            </View>
          )}

          {/* Recent Expenses */}
          <View className="space-y-2">
            {recentExpenses.map(expense => (
              <View key={expense.id} className="bg-background p-3 rounded-lg border border-border">
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start flex-1">
                    <Text className="text-xl mr-2">{getCategoryIcon(expense.category)}</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">
                        {expense.description}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {expense.payer.full_name || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-semibold text-foreground">
                    {formatCurrency(expense.amount, expense.currency)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {expenses.length > 3 && (
            <Text className="text-xs text-muted-foreground text-center mt-3">
              {expenses.length - 3} more expenses
            </Text>
          )}
        </View>
      )}
    </View>
  )
}
