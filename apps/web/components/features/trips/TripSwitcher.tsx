'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTripStatus } from '@/lib/utils/trip-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { TripWithParticipants } from '@tripthreads/core'

interface TripSwitcherProps {
  currentTripId: string
  currentTripName: string
  trips: TripWithParticipants[]
  onMobileSheetClose?: () => void
}

export function TripSwitcher({
  currentTripId,
  currentTripName,
  trips,
  onMobileSheetClose,
}: TripSwitcherProps) {
  const router = useRouter()

  // Filter to active/upcoming trips only
  const activeTrips = trips.filter(trip => {
    const status = getTripStatus(trip)
    return status === 'ongoing' || status === 'upcoming'
  })

  // Sort trips chronologically by start date
  const sortedTrips = activeTrips.sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  )

  // Hide dropdown if fewer than 2 active trips
  if (sortedTrips.length <= 1) {
    return (
      <h2 className="text-lg font-semibold truncate" title={currentTripName}>
        {currentTripName}
      </h2>
    )
  }

  const handleTripSwitch = (tripId: string) => {
    router.push(`/trips/${tripId}`)
    onMobileSheetClose?.()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full flex items-center justify-between p-0 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label="Switch trip"
        >
          <h2 className="text-lg font-semibold truncate" title={currentTripName}>
            {currentTripName}
          </h2>
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {sortedTrips.map(trip => {
          const status = getTripStatus(trip)
          const isCurrent = trip.id === currentTripId

          return (
            <DropdownMenuItem
              key={trip.id}
              onClick={() => handleTripSwitch(trip.id)}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'cursor-pointer flex items-center justify-between gap-2 min-h-11',
                isCurrent && 'bg-accent text-accent-foreground'
              )}
            >
              <span className="truncate flex-1" title={trip.name}>
                {trip.name}
              </span>
              <Badge
                variant={status === 'ongoing' ? 'default' : 'secondary'}
                className="flex-shrink-0"
              >
                {status === 'ongoing' ? 'Ongoing' : 'Upcoming'}
              </Badge>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
