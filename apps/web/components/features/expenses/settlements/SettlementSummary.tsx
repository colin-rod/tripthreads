'use client'

/**
 * SettlementSummary Component
 *
 * Main container for displaying settlement calculations.
 * Shows optimized settlement suggestions with expandable individual balances.
 * Collapsible section with localStorage state persistence.
 */

import { useState, useEffect } from 'react'
import type { SettlementSummary as SettlementSummaryType } from '@tripthreads/core'
import { ChevronDown, ChevronUp, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SettlementCard } from './SettlementCard'
import { UserBalanceCard } from './UserBalanceCard'
import { MissingFxWarning } from './MissingFxWarning'

interface SettlementSummaryProps {
  summary: SettlementSummaryType | null
  currentUserId?: string
  tripId: string
}

const COLLAPSE_STORAGE_KEY = 'settlement-summary-collapsed'
const EXPAND_BALANCES_STORAGE_KEY = 'settlement-balances-expanded'

export function SettlementSummary({ summary, currentUserId, tripId }: SettlementSummaryProps) {
  // Collapsible state for the entire summary
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Expandable state for individual balances
  const [balancesExpanded, setBalancesExpanded] = useState(false)

  // Load saved states from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem(`${COLLAPSE_STORAGE_KEY}-${tripId}`)
    const savedBalancesExpanded = localStorage.getItem(`${EXPAND_BALANCES_STORAGE_KEY}-${tripId}`)

    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === 'true')
    }

    if (savedBalancesExpanded) {
      setBalancesExpanded(savedBalancesExpanded === 'true')
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

  // No summary or no settlements
  if (!summary || summary.settlements.length === 0) {
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
              {summary.settlements.length === 1
                ? '1 optimal transfer'
                : `${summary.settlements.length} optimal transfers`}{' '}
              to settle all balances
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

          {/* Optimized Settlements */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Suggested Transfers</h3>
            <div className="space-y-2">
              {summary.settlements.map((settlement, index) => (
                <SettlementCard
                  key={`${settlement.from_user_id}-${settlement.to_user_id}-${index}`}
                  settlement={settlement}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </div>

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
    </Card>
  )
}
