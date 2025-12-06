'use client'

import Link from 'next/link'
import { DollarSign } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'
import type { SettlementSummary } from '@tripthreads/core/types/expense'

interface ExpensePreviewCardProps {
  tripId: string
  currentUserId: string
  settlementSummary?: SettlementSummary
  recentExpenses?: Array<{
    id: string
    description: string
    amount: number
    currency: string
    created_at: string
  }>
  baseCurrency: string
}

export function ExpensePreviewCard({
  tripId,
  currentUserId,
  settlementSummary,
  recentExpenses = [],
  baseCurrency,
}: ExpensePreviewCardProps) {
  // Calculate user's balances from settlements
  const balanceOwed =
    settlementSummary?.pending_settlements
      .filter(s => s.from_user_id === currentUserId)
      .reduce((sum, s) => sum + (s.amount || 0), 0) || 0

  const balanceReceivable =
    settlementSummary?.pending_settlements
      .filter(s => s.to_user_id === currentUserId)
      .reduce((sum, s) => sum + (s.amount || 0), 0) || 0

  const netBalance = balanceReceivable - balanceOwed

  return (
    <DashboardCard className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Expenses
        </CardTitle>
        <Link href={`/trips/${tripId}#expenses`}>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Settlement Summary */}
        {settlementSummary && (balanceOwed > 0 || balanceReceivable > 0) && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You owe</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {baseCurrency} {balanceOwed.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You're owed</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {baseCurrency} {balanceReceivable.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-sm font-medium">Net balance</span>
              <span
                className={`font-bold ${
                  netBalance > 0
                    ? 'text-green-600 dark:text-green-400'
                    : netBalance < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-muted-foreground'
                }`}
              >
                {netBalance > 0 ? '+' : ''}
                {baseCurrency} {netBalance.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Recent Expenses */}
        {recentExpenses.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recent</p>
            {recentExpenses.slice(0, 3).map(expense => (
              <div key={expense.id} className="flex justify-between items-center">
                <span className="text-sm truncate">{expense.description}</span>
                <Badge variant="outline">
                  {expense.currency} {expense.amount.toFixed(2)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          !settlementSummary && (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No expenses yet</p>
              <p className="text-xs mt-1">Start tracking expenses</p>
            </div>
          )
        )}
      </CardContent>
    </DashboardCard>
  )
}
