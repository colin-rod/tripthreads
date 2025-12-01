'use client'

/**
 * PhotoLightbox Component
 *
 * Full-screen image viewer with edit and delete capabilities.
 * Features:
 * - Full-screen display
 * - Navigation (prev/next)
 * - Caption editing
 * - Date editing
 * - Delete confirmation
 * - Keyboard navigation (arrow keys, ESC)
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X, ChevronLeft, ChevronRight, Pencil, Trash2, Calendar, User, Check } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { updateMediaFile, deleteMediaFile, deleteMediaFileFromStorage } from '@tripthreads/core'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Photo {
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

interface PhotoLightboxProps {
  photos: Photo[]
  initialPhotoId: string | null
  currentUserId: string
  onClose: () => void
  onDelete?: (photoId: string) => void
  onUpdate?: (photoId: string) => void
}

export default function PhotoLightbox({
  photos,
  initialPhotoId,
  currentUserId,
  onClose,
  onDelete,
  onUpdate,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCaption, setEditedCaption] = useState('')
  const [editedDate, setEditedDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  // Find initial photo index
  useEffect(() => {
    if (initialPhotoId) {
      const index = photos.findIndex(p => p.id === initialPhotoId)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [initialPhotoId, photos])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex])

  const currentPhoto = photos[currentIndex]
  if (!currentPhoto) return null

  const isOwner = currentPhoto.user.id === currentUserId

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1))
    setIsEditing(false)
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0))
    setIsEditing(false)
  }

  const handleEditClick = () => {
    setEditedCaption(currentPhoto.caption || '')
    setEditedDate(currentPhoto.date_taken.split('T')[0]) // YYYY-MM-DD format
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedCaption('')
    setEditedDate('')
  }

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true)

      await updateMediaFile(supabase, currentPhoto.id, {
        caption: editedCaption || null,
        date_taken: new Date(editedDate).toISOString(),
      })

      toast({
        title: 'Photo updated',
        description: 'Your changes have been saved.',
      })

      setIsEditing(false)
      onUpdate?.(currentPhoto.id)
    } catch (error) {
      console.error('Failed to update photo:', error)
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to save changes',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)

      // Extract storage path from URL
      const urlObj = new URL(currentPhoto.url)
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/trip-media\/(.+)$/)
      const storagePath = pathMatch ? pathMatch[1] : null

      // Delete from database
      await deleteMediaFile(supabase, currentPhoto.id)

      // Delete from storage (if path found)
      if (storagePath) {
        await deleteMediaFileFromStorage(supabase, storagePath)

        // Also delete thumbnail if exists
        if (currentPhoto.thumbnail_url) {
          const thumbUrlObj = new URL(currentPhoto.thumbnail_url)
          const thumbPathMatch = thumbUrlObj.pathname.match(
            /\/storage\/v1\/object\/public\/trip-media\/(.+)$/
          )
          if (thumbPathMatch) {
            await deleteMediaFileFromStorage(supabase, thumbPathMatch[1])
          }
        }
      }

      toast({
        title: 'Photo deleted',
        description: 'The photo has been removed from the gallery.',
      })

      setShowDeleteDialog(false)
      onDelete?.(currentPhoto.id)

      // Move to next photo or close if this was the last one
      if (photos.length > 1) {
        handleNext()
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Failed to delete photo:', error)
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete photo',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl h-[90vh] p-0">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-3 text-white">
              <User className="h-4 w-4" />
              <span className="font-medium">{currentPhoto.user.full_name}</span>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && !isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditClick}
                    className="text-white hover:bg-white/20"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-white hover:bg-white/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Image */}
          <div className="relative flex items-center justify-center h-full bg-black">
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || 'Trip photo'}
              className="max-h-full max-w-full object-contain"
            />

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-6">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-4 bg-black/50 rounded-lg p-4 backdrop-blur-sm">
                <div>
                  <Label htmlFor="caption" className="text-white">
                    Caption
                  </Label>
                  <Input
                    id="caption"
                    value={editedCaption}
                    onChange={e => setEditedCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="date" className="text-white">
                    Date Taken
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={editedDate}
                    onChange={e => setEditedDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="text-white hover:bg-white/20"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? (
                      'Saving...'
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="text-white space-y-2">
                {currentPhoto.caption && <p className="text-lg">{currentPhoto.caption}</p>}
                <div className="flex items-center gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(currentPhoto.date_taken), 'PPP')}</span>
                  </div>
                  <span>
                    {currentIndex + 1} / {photos.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The photo will be permanently removed from the gallery
              and storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Photo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
