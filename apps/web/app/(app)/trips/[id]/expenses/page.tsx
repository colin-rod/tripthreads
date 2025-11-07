/**
 * Trip Expenses Page
 *
 * View and edit expenses for the trip.
 * Repurposes the ExpenseInput component from the main trip page.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@tripthreads/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpenseInputWrapper } from '@/components/features/expenses/ExpenseInputWrapper'
import { DollarSign } from 'lucide-react'

interface TripExpensesPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TripExpensesPage({ params }: TripExpensesPageProps) {
  const supabase = await createClient()
  const { id } = await params

  // Fetch trip data
  let trip
  try {
    trip = await getTripById(supabase, id)
  } catch (error) {
    console.error('Error loading trip:', error)
    notFound()
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Get user's role
  const userParticipant = trip.trip_participants?.find(
    participant => participant.user?.id === user.id
  )
  const canEdit = userParticipant?.role !== 'viewer'

  return (
    <div className="container mx-auto h-full max-w-7xl overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-2">Track and split expenses for your trip</p>
        </div>

        {/* AI Expense Input (Participants only, hidden from viewers) */}
        {canEdit && <ExpenseInputWrapper tripId={trip.id} />}

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No expenses yet</p>
              <p className="text-sm mt-1">
                {canEdit
                  ? 'Add expenses using natural language above or via @TripThread in Chat'
                  : userParticipant?.role === 'viewer'
                    ? 'Viewers cannot see expenses'
                    : 'Start tracking expenses for this trip'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
