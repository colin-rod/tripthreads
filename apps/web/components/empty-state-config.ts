import { Plane, Users, DollarSign, Camera, MapPin, Inbox, LucideIcon } from 'lucide-react'

export type EmptyStateType =
  | 'trips'
  | 'participants'
  | 'expenses'
  | 'photos'
  | 'itinerary'
  | 'generic'

export interface EmptyConfig {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
}

export const emptyConfigs: Record<EmptyStateType, EmptyConfig> = {
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
