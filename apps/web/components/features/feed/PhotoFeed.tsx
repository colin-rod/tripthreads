'use client'

/**
 * PhotoFeed Component
 *
 * Wrapper component that integrates PhotoGallery with PhotoLightbox
 */

import { useState } from 'react'
import PhotoGallery from './PhotoGallery'
import PhotoLightbox from './PhotoLightbox'
import { getMediaFiles } from '@repo/core/queries/media'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

interface PhotoFeedProps {
  tripId: string
  userId: string
}

interface MediaFile {
  id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  date_taken: string
  user: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

export default function PhotoFeed({ tripId, userId }: PhotoFeedProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<MediaFile[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    fetchPhotos()
  }, [tripId, refreshKey])

  const fetchPhotos = async () => {
    try {
      const mediaFiles = await getMediaFiles(supabase, tripId)
      setPhotos(mediaFiles as MediaFile[])
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    }
  }

  const handlePhotoClick = (photoId: string) => {
    setSelectedPhotoId(photoId)
  }

  const handleCloseLightbox = () => {
    setSelectedPhotoId(null)
  }

  const handlePhotoDeleted = () => {
    // Refresh photo list
    setRefreshKey(prev => prev + 1)
  }

  const handlePhotoUpdated = () => {
    // Refresh photo list
    setRefreshKey(prev => prev + 1)
  }

  return (
    <>
      <PhotoGallery tripId={tripId} onPhotoClick={handlePhotoClick} />

      {selectedPhotoId && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          initialPhotoId={selectedPhotoId}
          currentUserId={userId}
          onClose={handleCloseLightbox}
          onDelete={handlePhotoDeleted}
          onUpdate={handlePhotoUpdated}
        />
      )}
    </>
  )
}
