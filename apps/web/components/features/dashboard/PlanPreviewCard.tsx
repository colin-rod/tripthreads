'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronDown, ChevronUp, Plane, Hotel, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExpandableCard } from './ExpandableCard'

interface ItineraryItem {
  id: string
  type: 'flight' | 'stay' | 'activity'
  title: string
  start_time: string
  location: string | null
}

interface PlanPreviewCardProps {
  tripId: string
  itineraryItems: ItineraryItem[]
}

const ICON_MAP = {
  flight: Plane,
  stay: Hotel,
  activity: MapPin,
}

export function PlanPreviewCard({ tripId, itineraryItems }: PlanPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const displayItems = isExpanded ? itineraryItems.slice(0, 15) : itineraryItems.slice(0, 3)

  return (
    <ExpandableCard isExpanded={isExpanded} className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Plan
        </CardTitle>
        <div className="flex items-center gap-2">
          {itineraryItems.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm"
            >
              {isExpanded ? (
                <>
                  Collapse <ChevronUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Expand <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}
          <Link href={`/trips/${tripId}#plan`} className="text-sm text-primary hover:underline">
            View Full Section →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {itineraryItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No itinerary items yet</p>
            <p className="text-xs mt-1">Add activities, flights, and stays</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map(item => {
              const Icon = ICON_MAP[item.type]
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{format(new Date(item.start_time), 'EEE, MMM d • h:mm a')}</span>
                      {item.location && <span>• {item.location}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            {!isExpanded && itineraryItems.length > 3 && (
              <p className="text-sm text-muted-foreground text-center mt-3">
                +{itineraryItems.length - 3} more items
              </p>
            )}
          </div>
        )}
      </CardContent>
    </ExpandableCard>
  )
}
