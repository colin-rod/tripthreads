'use client'

/**
 * PhotoGallery Component (supports photos and videos)
 *
 * Displays trip photos and videos in a masonry grid layout grouped by date.
 * Features:
 * - Masonry layout (Pinterest-style)
 * - Date grouping (by trip day)
 * - Click to open lightbox (photos only)
 * - Native video playback with controls
 * - Loading and empty states
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'
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
  file_size_bytes: number
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

/**
 * Formats file size in bytes to human-readable format
 */
const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function PhotoGallery({ tripId, onPhotoClick }: PhotoGalleryProps) {
  const [groupedMedia, setGroupedMedia] = useState<GroupedMedia>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchMedia()
  }, [tripId])

  const fetchMedia = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const grouped = await getMediaFilesGroupedByDate(supabase, tripId)
      setGroupedMedia(grouped)
    } catch (err) {
      console.error('Failed to fetch media:', err)
      setError(err instanceof Error ? err.message : 'Failed to load media')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhotoClick = (photo: MediaFileWithUser) => {
    // Only trigger lightbox for photos, not videos
    if (photo.type === 'photo') {
      onPhotoClick?.(photo.id, photo.url)
    }
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
  const mediaCount = Object.values(groupedMedia).reduce((sum, media) => sum + media.length, 0)

  if (mediaCount === 0) {
    return (
      <Card className="p-12 text-center">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No photos or videos yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload your first photo or video to start building your trip gallery
        </p>
      </Card>
    )
  }

  // Render gallery grouped by date
  const sortedDates = Object.keys(groupedMedia).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-12">
      {sortedDates.map(date => {
        const mediaFiles = groupedMedia[date]
        const dateObj = new Date(date)
        const photoCount = mediaFiles.filter(m => m.type === 'photo').length
        const videoCount = mediaFiles.filter(m => m.type === 'video').length

        return (
          <div key={date} className="space-y-3">
            {/* Date Header */}
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(dateObj, 'EEEE, MMMM d, yyyy')}</span>
              <span className="text-muted-foreground">
                ({photoCount > 0 && `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`}
                {photoCount > 0 && videoCount > 0 && ', '}
                {videoCount > 0 && `${videoCount} ${videoCount === 1 ? 'video' : 'videos'}`})
              </span>
            </div>

            {/* Masonry Grid */}
            <div className="columns-2 md:columns-3 lg:columns-4 gap-8 space-y-8">
              {mediaFiles.map(media => (
                <div
                  key={media.id}
                  className={`break-inside-avoid ${media.type === 'photo' ? 'cursor-pointer' : ''}`}
                  onClick={() => handlePhotoClick(media)}
                >
                  <Card className="overflow-hidden bg-white shadow-md hover:shadow-xl transition-shadow duration-300 border-0">
                    {/* Media Content with white padding (postcard frame) */}
                    <div className="p-4 pb-0">
                      {media.type === 'photo' ? (
                        <img
                          src={media.thumbnail_url || media.url}
                          alt={media.caption || 'Trip photo'}
                          className="w-full h-auto object-cover rounded-sm"
                          loading="lazy"
                        />
                      ) : (
                        <video
                          src={media.url}
                          controls
                          className="w-full h-auto object-cover rounded-sm"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                      )}
                    </div>

                    {/* Caption and metadata - Always visible below media */}
                    <div className="p-4 pt-2">
                      {media.caption ? (
                        <p className="text-sm text-foreground line-clamp-3">
                          {truncateCaption(media.caption, 100)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">by {media.user.full_name}</p>
                      )}
                      {media.type === 'video' && media.file_size_bytes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <VideoIcon className="inline h-3 w-3 mr-1" />
                          {formatFileSize(media.file_size_bytes)}
                        </p>
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
