import { Plane, Users, DollarSign, Camera, MapPin, Inbox, LucideIcon } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export type EmptyStateType =
  | 'trips'
  | 'participants'
  | 'expenses'
  | 'photos'
  | 'itinerary'
  | 'generic'

interface EmptyConfig {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
}

const emptyConfigs: Record<EmptyStateType, EmptyConfig> = {
  trips: {
    icon: Plane,
    title: 'No trips yet',
    description:
      'Start planning your first adventure! Create a trip to begin organizing your travel.',
    actionLabel: 'Create trip',
  },
  participants: {
    icon: Users,
    title: 'No participants',
    description: 'Invite friends and family to join this trip and collaborate on planning.',
    actionLabel: 'Invite participants',
  },
  expenses: {
    icon: DollarSign,
    title: 'No expenses tracked',
    description: 'Keep track of trip costs by adding your first expense.',
    actionLabel: 'Add expense',
  },
  photos: {
    icon: Camera,
    title: 'No photos yet',
    description: 'Capture and share memories from your trip by uploading photos.',
    actionLabel: 'Upload photo',
  },
  itinerary: {
    icon: MapPin,
    title: 'No itinerary items',
    description: 'Build your trip itinerary by adding flights, stays, and activities.',
    actionLabel: 'Add item',
  },
  generic: {
    icon: Inbox,
    title: 'Nothing here',
    description: 'There are no items to display.',
  },
}

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
