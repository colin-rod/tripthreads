'use client'

import Link from 'next/link'
import { Camera } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'

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
  return (
    <DashboardCard className="h-full flex flex-col">
      <CardHeader className="shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Feed
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/trips/${tripId}#feed`}>View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {mediaFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs mt-1">Upload photos from your trip</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {mediaFiles.map(file => (
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
          </div>
        )}
      </CardContent>
    </DashboardCard>
  )
}
