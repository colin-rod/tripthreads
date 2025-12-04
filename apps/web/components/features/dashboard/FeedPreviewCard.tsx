'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Camera, ChevronDown, ChevronUp } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExpandableCard } from './ExpandableCard'

interface MediaFile {
  id: string
  file_url: string
  thumbnail_url?: string | null
  caption?: string | null
}

interface FeedPreviewCardProps {
  tripId: string
  mediaFiles: MediaFile[]
}

export function FeedPreviewCard({ tripId, mediaFiles }: FeedPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const displayFiles = isExpanded ? mediaFiles.slice(0, 12) : mediaFiles.slice(0, 4)

  return (
    <ExpandableCard isExpanded={isExpanded} className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Feed
        </CardTitle>
        <div className="flex items-center gap-2">
          {mediaFiles.length > 4 && (
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
          <Link href={`/trips/${tripId}#feed`} className="text-sm text-primary hover:underline">
            View Full Section →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {mediaFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs mt-1">Upload photos from your trip</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {displayFiles.map(file => (
              <div
                key={file.id}
                className="aspect-square rounded-lg overflow-hidden bg-muted relative group cursor-pointer"
              >
                <img
                  src={file.thumbnail_url || file.file_url}
                  alt={file.caption || 'Trip photo'}
                  className="object-cover w-full h-full transition-transform group-hover:scale-105"
                />
              </div>
            ))}
            {!isExpanded && mediaFiles.length > 4 && (
              <div className="col-span-4 text-center mt-2">
                <p className="text-sm text-muted-foreground">
                  +{mediaFiles.length - 4} more photos
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </ExpandableCard>
  )
}
