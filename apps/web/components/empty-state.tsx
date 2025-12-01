'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { EmptyStateType, emptyConfigs } from './empty-state-config'

export interface EmptyStateProps {
  type?: EmptyStateType
  title?: string
  description?: string
  action?: () => void
  actionLabel?: string
  showAction?: boolean
  icon?: LucideIcon
}

export function EmptyState({
  type = 'generic',
  title,
  description,
  action,
  actionLabel,
  showAction = true,
  icon,
}: EmptyStateProps) {
  const config = emptyConfigs[type]
  const Icon = icon || config.icon

  const finalTitle = title || config.title
  const finalDescription = description || config.description
  const finalActionLabel = actionLabel || config.actionLabel

  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 rounded-full bg-muted">
              <Icon className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{finalTitle}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">{finalDescription}</p>
            </div>
            {showAction && finalActionLabel && (
              <Button onClick={action} className="mt-2">
                {finalActionLabel}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Specific empty state components for convenience
export function EmptyTrips(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="trips" {...props} />
}

export function EmptyParticipants(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="participants" {...props} />
}

export function EmptyExpenses(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="expenses" {...props} />
}

export function EmptyPhotos(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="photos" {...props} />
}

export function EmptyItinerary(props: Omit<EmptyStateProps, 'type'>) {
  return <EmptyState type="itinerary" {...props} />
}
