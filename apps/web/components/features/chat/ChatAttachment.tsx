'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FileIcon, DownloadIcon, ImagePlus, ImageMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChatAttachment } from '@/app/actions/chat'
import { addAttachmentToGallery, removeAttachmentFromGallery } from '@/app/actions/chat'
import { getMediaFileByUrl } from '@tripthreads/core'
import { createClient } from '@/lib/supabase/client'

interface ChatAttachmentDisplayProps {
  attachment: ChatAttachment
  tripId: string
  className?: string
}

export function ChatAttachmentDisplay({
  attachment,
  tripId,
  className,
}: ChatAttachmentDisplayProps) {
  const { url, type, name, size } = attachment
  const [mediaFileId, setMediaFileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Check if attachment is in gallery on mount
  useEffect(() => {
    const checkGalleryStatus = async () => {
      if (type === 'image') {
        const fileId = await getMediaFileByUrl(supabase, url, tripId)
        setMediaFileId(fileId)
      }
    }
    checkGalleryStatus()
  }, [url, tripId, type])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
  }

  // Add to gallery
  const handleAddToGallery = async () => {
    setIsLoading(true)
    try {
      const result = await addAttachmentToGallery(url, tripId)
      if (result.success && result.mediaFileId) {
        setMediaFileId(result.mediaFileId)
      }
    } catch (error) {
      console.error('Error adding to gallery:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Remove from gallery
  const handleRemoveFromGallery = async () => {
    if (!mediaFileId) return
    setIsLoading(true)
    try {
      const result = await removeAttachmentFromGallery(mediaFileId, tripId)
      if (result.success) {
        setMediaFileId(null)
      }
    } catch (error) {
      console.error('Error removing from gallery:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Image attachment
  if (type === 'image') {
    const inGallery = !!mediaFileId

    return (
      <div className={cn('relative overflow-hidden rounded-lg', className)}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <Image
            src={url}
            alt={name}
            width={400}
            height={300}
            className={cn(
              'max-h-64 w-auto rounded-lg object-cover transition-opacity hover:opacity-90',
              inGallery && 'ring-2 ring-primary ring-offset-2'
            )}
          />
        </a>

        {/* Gallery Toggle Button */}
        <div className="absolute bottom-2 right-2">
          {inGallery ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRemoveFromGallery}
              disabled={isLoading}
              className="gap-1.5"
            >
              <ImageMinus className="h-4 w-4" />
              Remove from gallery
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={handleAddToGallery}
              disabled={isLoading}
              className="gap-1.5"
            >
              <ImagePlus className="h-4 w-4" />
              Add to gallery
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Document attachment
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border bg-card p-3 text-sm', className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
        <FileIcon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 overflow-hidden">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(size)}</p>
      </div>

      <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
        <a href={url} download={name} target="_blank" rel="noopener noreferrer">
          <DownloadIcon className="h-4 w-4" />
          <span className="sr-only">Download {name}</span>
        </a>
      </Button>
    </div>
  )
}
