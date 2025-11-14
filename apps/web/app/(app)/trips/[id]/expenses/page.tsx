/**
 * Trip Expenses Page
 *
 * View, filter, and manage expenses for the trip.
 * Features grouping, filtering, sorting, and full CRUD operations.
 */

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserExpensesForTrip, getTripById, getSettlementSummary } from '@tripthreads/core'
import { ExpenseListView } from '@/components/features/expenses'
import { SettlementSummary } from '@/components/features/expenses/settlements'
import { StaticEmptyExpenses } from '@/components/empty-state-static'

interface TripExpensesPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TripExpensesPage({ params }: TripExpensesPageProps) {
  const supabase = await createClient()
  const { id } = await params

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch trip data to check permissions
  let trip
  try {
    trip = await getTripById(supabase, id)
  } catch (error) {
    console.error('Error loading trip:', error)
    notFound()
  }

  // Get user's role
  const userParticipant = trip.trip_participants?.find(
    participant => participant.user?.id === user.id
  )

  // Viewers cannot see expenses (enforced by RLS, but show message)
  if (userParticipant?.role === 'viewer') {
    return (
      <div className="container mx-auto h-full max-w-7xl overflow-y-auto p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Expenses</h1>
            <p className="text-muted-foreground mt-2">Track and split expenses for your trip</p>
          </div>

          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              Viewers cannot see trip expenses for privacy reasons.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fetch trip expenses and settlement summary in parallel
  let expenses
  let settlementSummary
  try {
    ;[expenses, settlementSummary] = await Promise.all([
      getUserExpensesForTrip(supabase, id),
      getSettlementSummary(supabase, id),
    ])
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load expenses. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto h-full max-w-7xl overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-2">Track and split expenses for your trip</p>
        </div>

        {expenses && expenses.length > 0 ? (
          <>
            {/* Settlement Summary - displayed at top when there are settlements */}
            {settlementSummary &&
              (settlementSummary.pending_settlements.length > 0 ||
                settlementSummary.settled_settlements.length > 0) && (
                <SettlementSummary
                  summary={settlementSummary}
                  currentUserId={user.id}
                  tripId={id}
                />
              )}

            {/* Expense List */}
            <ExpenseListView
              expenses={expenses}
              tripId={id}
              tripParticipants={
                trip.trip_participants?.map(p => ({
                  id: p.user?.id || '',
                  name: p.user?.full_name || 'Unknown',
                })) || []
              }
              currentUserId={user.id}
            />
          </>
        ) : (
          <StaticEmptyExpenses />
        )}
      </div>
    </div>
  )
}
