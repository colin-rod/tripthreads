import { format, differenceInDays } from 'date-fns'
import { Calendar, Users, DollarSign } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCard } from './DashboardCard'

interface AtAGlanceCardProps {
  trip: {
    name: string
    start_date: string
    end_date: string
    base_currency: string
    trip_participants: unknown[]
  }
}

export function AtAGlanceCard({ trip }: AtAGlanceCardProps) {
  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)
  const today = new Date()

  const daysUntilTrip = differenceInDays(startDate, today)
  const tripDuration = differenceInDays(endDate, startDate) + 1
  const isUpcoming = daysUntilTrip > 0
  const isOngoing = today >= startDate && today <= endDate
  const isPast = today > endDate

  return (
    <DashboardCard>
      <CardHeader>
        <CardTitle className="text-lg">At a Glance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">
              {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>

        {isUpcoming && (
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950 px-3 py-2">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              {daysUntilTrip === 0
                ? 'Trip starts tomorrow!'
                : daysUntilTrip === 1
                  ? 'Trip starts in 1 day'
                  : `Trip starts in ${daysUntilTrip} days`}
            </p>
          </div>
        )}

        {isOngoing && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 px-3 py-2">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Trip in progress
            </p>
          </div>
        )}

        {isPast && (
          <div className="rounded-lg bg-muted px-3 py-2">
            <p className="text-sm font-medium text-muted-foreground">Trip completed</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {trip.trip_participants.length}{' '}
              {trip.trip_participants.length === 1 ? 'person' : 'people'}
            </p>
            <p className="text-xs text-muted-foreground">Participants</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{trip.base_currency}</p>
            <p className="text-xs text-muted-foreground">Base currency</p>
          </div>
        </div>
      </CardContent>
    </DashboardCard>
  )
}
