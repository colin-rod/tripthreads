/**
 * Expenses Section Component
 *
 * Extracted from /app/(app)/trips/[id]/expenses/page.tsx
 * Displays expense tracking and settlement summary within the main trip page.
 */

'use client'

import { ExpenseListView } from '@/components/features/expenses'
import { SettlementSummary } from '@/components/features/expenses/settlements'
import { StaticEmptyExpenses } from '@/components/empty-state-static'
import { ExpenseInputWrapper } from '@/components/features/expenses/ExpenseInputWrapper'
import type {
  ExpenseWithDetails,
  SettlementSummary as SettlementSummaryType,
} from '@tripthreads/core/types/expense'

interface ExpensesSectionProps {
  tripId: string
  currentUserId: string
  canEdit: boolean
  tripParticipants: Array<{
    id: string
    name: string
  }>
  expenses: ExpenseWithDetails[]
  settlementSummary: SettlementSummaryType
}

export function ExpensesSection({
  tripId,
  currentUserId,
  canEdit,
  tripParticipants,
  expenses,
  settlementSummary,
}: ExpensesSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Expenses</h2>
        <p className="text-muted-foreground mt-1">Track and split expenses for your trip</p>
      </div>

      {/* AI Expense Input (Participants only) */}
      {canEdit && <ExpenseInputWrapper tripId={tripId} />}

      {expenses && expenses.length > 0 ? (
        <>
          {/* Settlement Summary */}
          {settlementSummary &&
            (settlementSummary.pending_settlements.length > 0 ||
              settlementSummary.settled_settlements.length > 0) && (
              <SettlementSummary
                summary={settlementSummary}
                currentUserId={currentUserId}
                tripId={tripId}
              />
            )}

          {/* Expense List */}
          <ExpenseListView
            expenses={expenses}
            tripId={tripId}
            tripParticipants={tripParticipants}
            currentUserId={currentUserId}
          />
        </>
      ) : (
        <StaticEmptyExpenses />
      )}
    </div>
  )
}
