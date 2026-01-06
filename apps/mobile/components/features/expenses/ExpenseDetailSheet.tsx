/**
 * ExpenseDetailSheet Component (Mobile)
 *
 * React Native Sheet for viewing and editing expense details.
 * Supports inline mode transitions (view ↔ edit).
 */

import { View, Text } from 'react-native'
import { format } from 'date-fns'
import type { ExpenseWithDetails } from '@tripthreads/core'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../../ui/sheet'
import { Button } from '../../ui/button'

interface ExpenseDetailSheetProps {
  expense: ExpenseWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'view' | 'edit'
  onModeChange?: (mode: 'view' | 'edit') => void
  currentUserId: string
  tripParticipants?: Array<{ id: string; full_name: string | null; avatar_url?: string | null }>
  onDelete?: () => void
  onSuccess?: () => void
}

export function ExpenseDetailSheet({
  expense,
  open,
  onOpenChange,
  mode = 'view',
  onModeChange,
  currentUserId,
  onDelete,
}: ExpenseDetailSheetProps) {
  if (!expense) return null

  const canEdit = currentUserId === expense.created_by

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">{getCategoryIcon(expense.category)}</Text>
            <SheetTitle>{mode === 'view' ? expense.description : 'Edit Expense'}</SheetTitle>
          </View>
          <SheetDescription>
            Created {format(new Date(expense.created_at), 'MMM d, yyyy')}
          </SheetDescription>
        </SheetHeader>

        <View className="py-6 space-y-6">
          {mode === 'view' ? (
            <View className="space-y-4">
              {/* Amount */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">Amount</Text>
                <Text className="text-3xl font-bold text-foreground">
                  {formatCurrency(expense.amount, expense.currency)}
                </Text>
              </View>
              {/* Category */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">Category</Text>
                <Text className="text-base text-foreground capitalize">{expense.category}</Text>
              </View>
              {/* Date */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">Date</Text>
                <Text className="text-base text-foreground">
                  {format(new Date(expense.date), 'MMMM d, yyyy')}
                </Text>
              </View>
              {/* Payer */}
              <View>
                <Text className="text-sm text-muted-foreground mb-1">Paid by</Text>
                <Text className="text-base text-foreground">
                  {expense.payer.full_name || 'Unknown'}
                </Text>
              </View>
              {/* Split Information */}
              <View>
                <Text className="text-sm text-muted-foreground mb-2">Split with</Text>
                <View className="space-y-2">
                  {expense.participants.map(participant => (
                    <View key={participant.id} className="flex-row items-center justify-between">
                      <Text className="text-base text-foreground">
                        {participant.user.full_name || 'Unknown'}
                      </Text>
                      <Text className="text-base font-medium text-foreground">
                        {formatCurrency(participant.share_amount, expense.currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>{' '}
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
