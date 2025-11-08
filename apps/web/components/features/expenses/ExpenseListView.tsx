'use client'

/**
 * ExpenseListView Component
 *
 * Displays expenses with grouping, filtering, sorting, and search capabilities.
 * Features:
 * - Flexible grouping (by date, category, payer, participant)
 * - Filter by date range, category, payer, participant
 * - Sort by date, amount, category
 * - Search by description
 * - Click to view expense details
 */

import { useState, useMemo, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, isWithinInterval } from 'date-fns'
import type { ExpenseWithDetails } from '@tripthreads/core'
import { ExpenseCard } from './ExpenseCard'
import { ExpenseGrouping, type GroupingOption } from './ExpenseGrouping'
import { ExpenseFilters } from './ExpenseFilters'
import { ExpenseSort, type SortOption, type SortDirection } from './ExpenseSort'
import { ExpenseSearch } from './ExpenseSearch'
import { ExpenseDetailSheet } from './ExpenseDetailSheet'
import { ExpenseFormDialog } from './ExpenseFormDialog'
import { DeleteExpenseDialog } from './DeleteExpenseDialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

type OptimisticAction =
  | { type: 'delete'; id: string }
  | { type: 'add'; expense: ExpenseWithDetails }
  | { type: 'update'; expense: ExpenseWithDetails }

export interface ExpenseFiltersState {
  dateRange?: { from: Date; to: Date }
  categories: string[]
  payerIds: string[]
  participantIds: string[]
}

interface ExpenseListViewProps {
  expenses: ExpenseWithDetails[]
  tripId: string
  tripParticipants: { id: string; name: string }[]
  currentUserId?: string
}

export function ExpenseListView({
  expenses,
  tripId,
  tripParticipants,
  currentUserId,
}: ExpenseListViewProps) {
  const router = useRouter()

  // Optimistic updates
  const [optimisticExpenses, updateOptimisticExpenses] = useOptimistic(
    expenses,
    (state, action: OptimisticAction) => {
      switch (action.type) {
        case 'delete':
          return state.filter(expense => expense.id !== action.id)
        case 'add':
          return [...state, action.expense]
        case 'update':
          return state.map(expense => (expense.id === action.expense.id ? action.expense : expense))
        default:
          return state
      }
    }
  )

  // State management
  const [grouping, setGrouping] = useState<GroupingOption>('date')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<ExpenseFiltersState>({
    categories: [],
    payerIds: [],
    participantIds: [],
  })
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithDetails | null>(null)
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseWithDetails | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithDetails | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleSuccess = () => {
    router.refresh()
  }

  const handleAddExpense = () => {
    setExpenseToEdit(null)
    setIsFormOpen(true)
  }

  const handleEditExpense = (expense: ExpenseWithDetails) => {
    setExpenseToEdit(expense)
    setIsFormOpen(true)
  }

  const handleDeleteExpense = (expense: ExpenseWithDetails) => {
    setExpenseToDelete(expense)
  }

  // Expose optimistic update functions to child components
  const optimisticDelete = (expenseId: string) => {
    updateOptimisticExpenses({ type: 'delete', id: expenseId })
  }

  // Reserved for future use (create/edit optimistic updates)
  const _optimisticAdd = (expense: ExpenseWithDetails) => {
    updateOptimisticExpenses({ type: 'add', expense })
  }

  const _optimisticUpdate = (expense: ExpenseWithDetails) => {
    updateOptimisticExpenses({ type: 'update', expense })
  }

  // Get unique payers and participants for filter options
  const { payers, allParticipants } = useMemo(() => {
    const payerMap = new Map<string, { id: string; name: string }>()
    const participantMap = new Map<string, { id: string; name: string }>()

    optimisticExpenses.forEach(expense => {
      payerMap.set(expense.payer_id, {
        id: expense.payer_id,
        name: expense.payer.full_name,
      })

      expense.participants.forEach(participant => {
        participantMap.set(participant.user_id, {
          id: participant.user_id,
          name: participant.user.full_name,
        })
      })
    })

    return {
      payers: Array.from(payerMap.values()),
      allParticipants: Array.from(participantMap.values()),
    }
  }, [optimisticExpenses])

  // Filter, search, and sort expenses
  const processedExpenses = useMemo(() => {
    let filtered = [...optimisticExpenses]

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(expense => expense.description.toLowerCase().includes(query))
    }

    // Apply filters
    if (filters.dateRange) {
      filtered = filtered.filter(expense => {
        const expenseDate = parseISO(expense.date)
        return isWithinInterval(expenseDate, {
          start: filters.dateRange!.from,
          end: filters.dateRange!.to,
        })
      })
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter(expense => filters.categories.includes(expense.category))
    }

    if (filters.payerIds.length > 0) {
      filtered = filtered.filter(expense => filters.payerIds.includes(expense.payer_id))
    }

    if (filters.participantIds.length > 0) {
      filtered = filtered.filter(expense =>
        expense.participants.some(p => filters.participantIds.includes(p.user_id))
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'category':
          comparison = a.category.localeCompare(b.category)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [expenses, searchQuery, filters, sortBy, sortDirection])

  // Group expenses
  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, ExpenseWithDetails[]>()

    processedExpenses.forEach(expense => {
      let groupKey: string
      let groupLabel: string

      switch (grouping) {
        case 'date':
          groupKey = expense.date.split('T')[0]
          groupLabel = format(parseISO(expense.date), 'EEEE, MMM d, yyyy')
          break
        case 'category':
          groupKey = expense.category
          groupLabel = expense.category.charAt(0).toUpperCase() + expense.category.slice(1)
          break
        case 'payer':
          groupKey = expense.payer_id
          // Note: groupLabel not currently used but reserved for future UI enhancements
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          groupLabel = expense.payer.full_name
          break
        case 'participant':
          // For participant grouping, we'll create a group for each participant
          // An expense can appear in multiple groups
          expense.participants.forEach(participant => {
            const key = participant.user_id
            // Note: label not currently used but reserved for future UI enhancements
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const label = participant.user.full_name
            if (!groups.has(key)) {
              groups.set(key, [])
            }
            groups.get(key)!.push(expense)
          })
          return // Skip the default grouping below
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(expense)
    })

    return Array.from(groups.entries()).map(([key, items]) => {
      let label: string

      switch (grouping) {
        case 'date':
          label = format(parseISO(items[0].date), 'EEEE, MMM d, yyyy')
          break
        case 'category':
          label = items[0].category.charAt(0).toUpperCase() + items[0].category.slice(1)
          break
        case 'payer':
          label = items[0].payer.full_name
          break
        case 'participant':
          label = items[0].participants.find(p => p.user_id === key)?.user.full_name || key
          break
      }

      return { key, label, items }
    })
  }, [processedExpenses, grouping])

  if (expenses.length === 0) {
    return null // Parent component handles empty state
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <ExpenseGrouping value={grouping} onChange={setGrouping} />
          <ExpenseSort
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortByChange={setSortBy}
            onSortDirectionChange={setSortDirection}
          />
        </div>

        <div className="flex gap-2">
          <ExpenseSearch value={searchQuery} onChange={setSearchQuery} />
          <Button onClick={handleAddExpense} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ExpenseFilters
        filters={filters}
        onFiltersChange={setFilters}
        payers={payers}
        participants={allParticipants}
      />

      {/* Grouped expenses */}
      {groupedExpenses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No expenses match your filters</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedExpenses.map(group => (
            <div key={group.key}>
              {/* Group header */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">{group.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {group.items.length} expense{group.items.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Expenses in group */}
              <div className="space-y-2">
                {group.items.map(expense => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    currentUserId={currentUserId}
                    onClick={() => setSelectedExpense(expense)}
                    onEdit={() => handleEditExpense(expense)}
                    onDelete={() => handleDeleteExpense(expense)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail sheet */}
      {selectedExpense && (
        <ExpenseDetailSheet
          expense={selectedExpense}
          open={!!selectedExpense}
          onOpenChange={open => {
            if (!open) setSelectedExpense(null)
          }}
          currentUserId={currentUserId}
          onEdit={() => handleEditExpense(selectedExpense)}
          onDelete={() => handleDeleteExpense(selectedExpense)}
        />
      )}

      {/* Create/Edit Form Dialog */}
      <ExpenseFormDialog
        open={isFormOpen}
        onOpenChange={open => {
          setIsFormOpen(open)
          if (!open) setExpenseToEdit(null)
        }}
        tripId={tripId}
        tripParticipants={tripParticipants}
        expense={expenseToEdit || undefined}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Dialog */}
      {expenseToDelete && (
        <DeleteExpenseDialog
          onOptimisticDelete={optimisticDelete}
          open={!!expenseToDelete}
          onOpenChange={open => {
            if (!open) setExpenseToDelete(null)
          }}
          expense={expenseToDelete}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
