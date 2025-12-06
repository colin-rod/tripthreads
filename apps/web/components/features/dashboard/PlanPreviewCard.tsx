'use client'

import Link from 'next/link'
import { Binoculars, Calendar, Hotel, MapPin, Plane, Sparkles, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'
import type { ItineraryItemType } from '@tripthreads/core/types/itinerary'

interface ItineraryItem {
  id: string
  type: ItineraryItemType
  title: string
  start_time: string
  location: string | null
}

interface PlanPreviewCardProps {
  tripId: string
  itineraryItems: ItineraryItem[]
}

const ICON_MAP: Record<ItineraryItemType, LucideIcon> = {
  transport: Plane,
  accommodation: Hotel,
  dining: Utensils,
  activity: Sparkles,
  sightseeing: Binoculars,
  general: MapPin,
}

const TYPE_LABELS: Record<ItineraryItemType, string> = {
  transport: 'Transport',
  accommodation: 'Stay',
  dining: 'Dining',
  activity: 'Activity',
  sightseeing: 'Sightseeing',
  general: 'General',
}

export function PlanPreviewCard({ tripId, itineraryItems }: PlanPreviewCardProps) {
  return (
    <DashboardCard className="h-full flex flex-col">
      <CardHeader className="shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Plan
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/trips/${tripId}#plan`}>View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {itineraryItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No itinerary items yet</p>
            <p className="text-xs mt-1">Add activities, flights, and stays</p>
          </div>
        ) : (
          <div className="space-y-2">
            {itineraryItems.map(item => {
              const Icon = ICON_MAP[item.type] || MapPin
              const typeLabel = TYPE_LABELS[item.type] || 'Plan item'
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{format(new Date(item.start_time), 'EEE, MMM d • h:mm a')}</span>
                      <span>• {typeLabel}</span>
                      {item.location && <span>• {item.location}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </DashboardCard>
  )
}
