/**
 * Feed Section Component
 *
 * Displays trip photos and media feed within the main trip page.
 * Features a floating action button (FAB) for uploading photos.
 */

'use client'

import { useState } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import PhotoUpload from '@/components/features/feed/PhotoUpload'
import PhotoFeed from '@/components/features/feed/PhotoFeed'

interface FeedSectionProps {
  tripId: string
  userId: string
  canEdit: boolean
}

export function FeedSection({ tripId, userId, canEdit }: FeedSectionProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Feed</h2>
        <p className="text-muted-foreground mt-1">Share and view trip photos</p>
      </div>

      {/* Gallery - Full width, no Card wrapper */}
      <PhotoFeed tripId={tripId} userId={userId} />

      {/* Floating Action Button - Only show for editors */}
      {canEdit && (
        <>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
            onClick={() => setUploadDialogOpen(true)}
            aria-label="Upload photos"
          >
            <Camera className="h-6 w-6" />
          </Button>

          {/* Upload Dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Photos</DialogTitle>
                <DialogDescription>Add photos to your trip gallery</DialogDescription>
              </DialogHeader>
              <PhotoUpload tripId={tripId} onUploadComplete={() => setUploadDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}
