/**
 * Feed Section Component
 *
 * Displays trip photos and media feed within the main trip page.
 * This matches the Feed tab from the original page.tsx
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PhotoUpload from '@/components/features/feed/PhotoUpload'
import PhotoFeed from '@/components/features/feed/PhotoFeed'

interface FeedSectionProps {
  tripId: string
  userId: string
  canEdit: boolean
}

export function FeedSection({ tripId, userId, canEdit }: FeedSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Feed</h2>
        <p className="text-muted-foreground mt-1">Share and view trip photos</p>
      </div>

      {/* Photo Upload (Participants only) */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoUpload tripId={tripId} />
          </CardContent>
        </Card>
      )}

      {/* Photo Feed (Gallery + Lightbox) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trip Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoFeed tripId={tripId} userId={userId} />
        </CardContent>
      </Card>
    </div>
  )
}
