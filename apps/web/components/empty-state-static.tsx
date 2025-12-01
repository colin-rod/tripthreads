import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { EmptyStateType, emptyConfigs } from './empty-state-config'

export interface StaticEmptyStateProps {
  type?: EmptyStateType
  title?: string
  description?: string
  icon?: LucideIcon
}

export function StaticEmptyState({
  type = 'generic',
  title,
  description,
  icon,
}: StaticEmptyStateProps) {
  const config = emptyConfigs[type]
  const Icon = icon || config.icon

  const finalTitle = title || config.title
  const finalDescription = description || config.description

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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function StaticEmptyTrips(props: Omit<StaticEmptyStateProps, 'type'>) {
  return <StaticEmptyState type="trips" {...props} />
}

export function StaticEmptyParticipants(props: Omit<StaticEmptyStateProps, 'type'>) {
  return <StaticEmptyState type="participants" {...props} />
}

export function StaticEmptyExpenses(props: Omit<StaticEmptyStateProps, 'type'>) {
  return <StaticEmptyState type="expenses" {...props} />
}

export function StaticEmptyPhotos(props: Omit<StaticEmptyStateProps, 'type'>) {
  return <StaticEmptyState type="photos" {...props} />
}

export function StaticEmptyItinerary(props: Omit<StaticEmptyStateProps, 'type'>) {
  return <StaticEmptyState type="itinerary" {...props} />
}
