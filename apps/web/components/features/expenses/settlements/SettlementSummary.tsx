'use client'

/**
 * SettlementSummary Component
 *
 * Main container for displaying settlement calculations.
 * Shows optimized settlement suggestions with expandable individual balances.
 * Collapsible section with localStorage state persistence.
 */

import { useState, useEffect, useTransition } from 'react'
import type {
  SettlementSummary as SettlementSummaryType,
  SettlementWithUsers,
} from '@tripthreads/core'
import { ChevronDown, ChevronUp, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SettlementCard } from './SettlementCard'
import { UserBalanceCard } from './UserBalanceCard'
import { MissingFxWarning } from './MissingFxWarning'
import { MarkSettlementPaidDialog } from './MarkSettlementPaidDialog'
import { markSettlementAsPaidAction } from '@/app/actions/settlements'
import { useToast } from '@/hooks/use-toast'

interface SettlementSummaryProps {
  summary: SettlementSummaryType | null
  currentUserId?: string
  tripId: string
}

const COLLAPSE_STORAGE_KEY = 'settlement-summary-collapsed'
const EXPAND_BALANCES_STORAGE_KEY = 'settlement-balances-expanded'
const EXPAND_HISTORY_STORAGE_KEY = 'settlement-history-expanded'

export function SettlementSummary({ summary, currentUserId, tripId }: SettlementSummaryProps) {
  const { toast } = useToast()
  const [_isPending, startTransition] = useTransition()

  // Collapsible state for the entire summary
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Expandable state for individual balances
  const [balancesExpanded, setBalancesExpanded] = useState(false)

  // Expandable state for settled history
  const [historyExpanded, setHistoryExpanded] = useState(false)

  // Dialog state for marking settlement as paid
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementWithUsers | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Load saved states from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem(`${COLLAPSE_STORAGE_KEY}-${tripId}`)
    const savedBalancesExpanded = localStorage.getItem(`${EXPAND_BALANCES_STORAGE_KEY}-${tripId}`)
    const savedHistoryExpanded = localStorage.getItem(`${EXPAND_HISTORY_STORAGE_KEY}-${tripId}`)

    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === 'true')
    }

    if (savedBalancesExpanded) {
      setBalancesExpanded(savedBalancesExpanded === 'true')
    }

    if (savedHistoryExpanded) {
      setHistoryExpanded(savedHistoryExpanded === 'true')
    }
  }, [tripId])

  // Save collapse state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem(`${COLLAPSE_STORAGE_KEY}-${tripId}`, String(newState))
  }

  // Save balances expanded state to localStorage
  const toggleBalances = () => {
    const newState = !balancesExpanded
    setBalancesExpanded(newState)
    localStorage.setItem(`${EXPAND_BALANCES_STORAGE_KEY}-${tripId}`, String(newState))
  }

  // Save history expanded state to localStorage
  const toggleHistory = () => {
    const newState = !historyExpanded
    setHistoryExpanded(newState)
    localStorage.setItem(`${EXPAND_HISTORY_STORAGE_KEY}-${tripId}`, String(newState))
  }

  // Handle marking settlement as paid
  const handleMarkAsPaid = (settlementId: string) => {
    const settlement = summary?.pending_settlements.find(s => s.id === settlementId)
    if (settlement) {
      setSelectedSettlement(settlement)
      setDialogOpen(true)
    }
  }

  // Handle dialog confirmation
  const handleDialogConfirm = async (settlementId: string, note?: string) => {
    startTransition(async () => {
      const result = await markSettlementAsPaidAction({
        settlementId,
        note,
      })

      if (result.success) {
        toast({
          title: 'Settlement marked as paid',
          description: 'The settlement has been marked as paid and excluded from your balance.',
        })
      } else {
        toast({
          title: 'Failed to mark settlement as paid',
          description: result.error || 'An error occurred. Please try again.',
          variant: 'destructive',
        })
      }
    })
  }

  // No summary or no pending/settled settlements
  const hasPending = summary?.pending_settlements && summary.pending_settlements.length > 0
  const hasSettled = summary?.settled_settlements && summary.settled_settlements.length > 0

  if (!summary || (!hasPending && !hasSettled)) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Settlements
            </CardTitle>
            <CardDescription>
              {hasPending &&
                (summary.pending_settlements.length === 1
                  ? '1 pending transfer'
                  : `${summary.pending_settlements.length} pending transfers`)}
              {hasPending && hasSettled && ' • '}
              {hasSettled &&
                (summary.settled_settlements.length === 1
                  ? '1 settled'
                  : `${summary.settled_settlements.length} settled`)}
            </CardDescription>
          </div>

          {/* Collapse/Expand button */}
          <Button variant="ghost" size="sm" onClick={toggleCollapse}>
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Missing FX Rate Warning */}
          {summary.excluded_expenses.length > 0 && (
            <MissingFxWarning excludedExpenseIds={summary.excluded_expenses} />
          )}

          {/* Pending Settlements */}
          {hasPending && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Pending Transfers</h3>
              <div className="space-y-2">
                {summary.pending_settlements.map(settlement => (
                  <SettlementCard
                    key={settlement.id}
                    settlement={settlement}
                    currentUserId={currentUserId}
                    onMarkAsPaid={handleMarkAsPaid}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Settled Settlements (Collapsible) */}
          {hasSettled && (
            <div className="space-y-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleHistory}
                className="w-full justify-between text-sm text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Settlement History ({summary.settled_settlements.length})
                </span>
                {historyExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {historyExpanded && (
                <div className="space-y-2 mt-2">
                  {summary.settled_settlements.map(settlement => (
                    <SettlementCard
                      key={settlement.id}
                      settlement={settlement}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Individual Balances (Expandable) */}
          {summary.balances.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBalances}
                className="w-full justify-between text-sm text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Individual Balances
                </span>
                {balancesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {balancesExpanded && (
                <div className="space-y-2 mt-2">
                  {summary.balances.map(balance => (
                    <UserBalanceCard
                      key={balance.user_id}
                      balance={balance}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}

      {/* Mark Settlement as Paid Dialog */}
      <MarkSettlementPaidDialog
        settlement={selectedSettlement}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleDialogConfirm}
        currentUserId={currentUserId}
      />
    </Card>
  )
}
