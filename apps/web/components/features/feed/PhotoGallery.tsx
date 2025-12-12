'use client'

/**
 * PhotoGallery Component
 *
 * Displays trip photos in a masonry grid layout grouped by date.
 * Features:
 * - Masonry layout (Pinterest-style)
 * - Date grouping (by trip day)
 * - Click to open lightbox
 * - Loading and empty states
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, Image as ImageIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getMediaFilesGroupedByDate } from '@tripthreads/core'
import { createClient } from '@/lib/supabase/client'

interface PhotoGalleryProps {
  tripId: string
  onPhotoClick?: (photoId: string, photoUrl: string) => void
}

interface MediaFileWithUser {
  id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  date_taken: string
  trip_id: string
  user_id: string
  type: string
  created_at: string
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

type GroupedMedia = Record<string, MediaFileWithUser[]>

/**
 * Truncates a caption to a maximum length and adds ellipsis if needed
 */
const truncateCaption = (caption: string | null, maxLength: number = 100): string => {
  if (!caption) return ''
  return caption.length > maxLength ? caption.substring(0, maxLength).trim() + '...' : caption
}

export default function PhotoGallery({ tripId, onPhotoClick }: PhotoGalleryProps) {
  const [groupedPhotos, setGroupedPhotos] = useState<GroupedMedia>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchPhotos()
  }, [tripId])

  const fetchPhotos = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const grouped = await getMediaFilesGroupedByDate(supabase, tripId)
      setGroupedPhotos(grouped)
    } catch (err) {
      console.error('Failed to fetch photos:', err)
      setError(err instanceof Error ? err.message : 'Failed to load photos')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhotoClick = (photo: MediaFileWithUser) => {
    onPhotoClick?.(photo.id, photo.url)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-12">
        {[1, 2].map(group => (
          <div key={group} className="space-y-6">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(item => (
                <Skeleton key={item} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">{error}</p>
      </Card>
    )
  }

  // Empty state
  const photoCount = Object.values(groupedPhotos).reduce((sum, photos) => sum + photos.length, 0)

  if (photoCount === 0) {
    return (
      <Card className="p-12 text-center">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No photos yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload your first photo to start building your trip gallery
        </p>
      </Card>
    )
  }

  // Render gallery grouped by date
  const sortedDates = Object.keys(groupedPhotos).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-12">
      {sortedDates.map(date => {
        const photos = groupedPhotos[date]
        const dateObj = new Date(date)

        return (
          <div key={date} className="space-y-3">
            {/* Date Header */}
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(dateObj, 'EEEE, MMMM d, yyyy')}</span>
              <span className="text-muted-foreground">
                ({photos.length} {photos.length === 1 ? 'photo' : 'photos'})
              </span>
            </div>

            {/* Masonry Grid */}
            <div className="columns-2 md:columns-3 lg:columns-4 gap-8 space-y-8">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="break-inside-avoid cursor-pointer"
                  onClick={() => handlePhotoClick(photo)}
                >
                  <Card className="overflow-hidden bg-white shadow-md hover:shadow-xl transition-shadow duration-300 border-0">
                    {/* Photo with white padding (postcard frame) */}
                    <div className="p-4 pb-0">
                      <img
                        src={photo.thumbnail_url || photo.url}
                        alt={photo.caption || 'Trip photo'}
                        className="w-full h-auto object-cover rounded-sm"
                        loading="lazy"
                      />
                    </div>

                    {/* Caption - Always visible below photo */}
                    <div className="p-4 pt-2">
                      {photo.caption ? (
                        <p className="text-sm text-foreground line-clamp-3">
                          {truncateCaption(photo.caption, 100)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">by {photo.user.full_name}</p>
                      )}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
