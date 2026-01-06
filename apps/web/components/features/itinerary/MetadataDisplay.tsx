/**
 * MetadataDisplay Component
 *
 * Type-aware metadata renderer that displays the appropriate metadata fields
 * based on the itinerary item type. Routes to type-specific display components.
 */

import type {
  ItineraryItemMetadata,
  ItineraryItemType,
  TransportMetadata,
  AccommodationMetadata,
  DiningMetadata,
  ActivityMetadata,
  SightseeingMetadata,
} from '@tripthreads/core'
import { TransportMetadataDisplay } from './metadata/TransportMetadataDisplay'
import { AccommodationMetadataDisplay } from './metadata/AccommodationMetadataDisplay'
import { DiningMetadataDisplay } from './metadata/DiningMetadataDisplay'
import { ActivityMetadataDisplay } from './metadata/ActivityMetadataDisplay'
import { SightseeingMetadataDisplay } from './metadata/SightseeingMetadataDisplay'

interface MetadataDisplayProps {
  metadata: ItineraryItemMetadata | undefined
  type: ItineraryItemType
}

export function MetadataDisplay({ metadata, type }: MetadataDisplayProps) {
  if (!metadata) return null

  switch (type) {
    case 'transport':
      return <TransportMetadataDisplay metadata={metadata as TransportMetadata} />
    case 'accommodation':
      return <AccommodationMetadataDisplay metadata={metadata as AccommodationMetadata} />
    case 'dining':
      return <DiningMetadataDisplay metadata={metadata as DiningMetadata} />
    case 'activity':
      return <ActivityMetadataDisplay metadata={metadata as ActivityMetadata} />
    case 'sightseeing':
      return <SightseeingMetadataDisplay metadata={metadata as SightseeingMetadata} />
    case 'general':
      return null // No type-specific metadata for general items
    default:
      return null
  }
}
