'use client'

/**
 * PhotoUpload Component
 *
 * Handles photo uploads to the trip gallery with:
 * - Drag-and-drop support
 * - Image preview
 * - Client-side compression
 * - Free tier limit enforcement
 * - Progress indicators
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, Upload, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import {
  compressImage,
  generateThumbnail,
  extractDateTaken,
  isValidImageType,
  isWithinSizeLimit,
  formatFileSize,
} from '@/lib/image-compression'

interface PhotoUploadProps {
  tripId: string
  onUploadComplete?: () => void
}

interface PhotoPreview {
  file: File
  preview: string
  caption: string
}

interface UploadPermission {
  canUpload: boolean
  remaining: number
  total: number
  limit: number
}

export default function PhotoUpload({ tripId, onUploadComplete }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadPermission, setUploadPermission] = useState<UploadPermission | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch upload permission on mount
  useEffect(() => {
    fetchUploadPermission()
  }, [tripId])

  const fetchUploadPermission = async () => {
    try {
      const response = await fetch(`/api/upload-photo?tripId=${tripId}`)
      if (response.ok) {
        const data = await response.json()
        setUploadPermission(data)
      }
    } catch (err) {
      console.error('Failed to fetch upload permission:', err)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    setError(null)
    const newPhotos: PhotoPreview[] = []

    Array.from(files).forEach(file => {
      // Validate file type
      if (!isValidImageType(file)) {
        setError(`Invalid file type: ${file.name}. Only images are allowed.`)
        return
      }

      // Validate file size
      if (!isWithinSizeLimit(file)) {
        setError(`File size exceeds 10MB limit: ${file.name} (${formatFileSize(file.size)})`)
        return
      }

      // Create preview
      const preview = URL.createObjectURL(file)
      newPhotos.push({ file, preview, caption: '' })
    })

    setPhotos(prev => [...prev, ...newPhotos])
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview) // Clean up object URL
      updated.splice(index, 1)
      return updated
    })
  }

  const handleCaptionChange = (index: number, caption: string) => {
    setPhotos(prev => {
      const updated = [...prev]
      updated[index].caption = caption
      return updated
    })
  }

  const handleUpload = async () => {
    if (photos.length === 0) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const totalPhotos = photos.length
      let uploadedCount = 0

      for (const photo of photos) {
        // Compress images
        const [compressedFull, thumbnail, dateTaken] = await Promise.all([
          compressImage(photo.file),
          generateThumbnail(photo.file),
          extractDateTaken(photo.file),
        ])

        // Prepare form data
        const formData = new FormData()
        formData.append('fullImage', compressedFull)
        formData.append('thumbnail', thumbnail)
        formData.append('tripId', tripId)
        formData.append('caption', photo.caption)
        formData.append('dateTaken', dateTaken.toISOString())

        // Upload to API
        const response = await fetch('/api/upload-photo', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        uploadedCount++
        setUploadProgress(Math.round((uploadedCount / totalPhotos) * 100))
      }

      // Success! Clean up and notify
      photos.forEach(photo => URL.revokeObjectURL(photo.preview))
      setPhotos([])
      setUploadProgress(0)

      // Refresh upload permission
      await fetchUploadPermission()

      // Notify parent
      onUploadComplete?.()
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [])

  const isLimitReached = uploadPermission ? !uploadPermission.canUpload : false
  const showWarning = uploadPermission ? uploadPermission.remaining <= 5 : false

  return (
    <div className="space-y-4">
      {/* Free Tier Warning/Limit */}
      {showWarning && uploadPermission && !isLimitReached && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {uploadPermission.remaining} photos remaining on free tier. Upgrade to Pro for unlimited
            photos.
          </AlertDescription>
        </Alert>
      )}

      {isLimitReached && uploadPermission && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Photo limit reached. You've used all {uploadPermission.limit} photos on the free tier.
            Upgrade to Pro for unlimited photos.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Button / Drag Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-border'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => handleFileSelect(e.target.files)}
          className="hidden"
          aria-label="Select photo files"
          disabled={isLimitReached}
        />

        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLimitReached || isUploading}
          className="mx-auto"
        >
          <Camera className="mr-2 h-4 w-4" />
          Upload Photo
        </Button>

        <p className="mt-2 text-xs text-muted-foreground">or drag and drop photos here</p>
        <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, HEIC • Max 10MB</p>
      </div>

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Selected Photos ({photos.length})</h3>
          <div className="grid gap-3">
            {photos.map((photo, index) => (
              <Card key={index} className="p-3">
                <div className="flex gap-3">
                  {/* Preview Image */}
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <img
                      src={photo.preview}
                      alt={`${photo.file.name} preview`}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{photo.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(photo.file.size)}
                    </p>

                    {/* Caption Input */}
                    <Input
                      type="text"
                      placeholder="Add caption (optional)"
                      value={photo.caption}
                      onChange={e => handleCaptionChange(index, e.target.value)}
                      className="mt-2 h-8 text-sm"
                      disabled={isUploading}
                    />
                  </div>

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePhoto(index)}
                    disabled={isUploading}
                    aria-label={`Remove ${photo.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Upload Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading || photos.length === 0}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading... {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {photos.length} {photos.length === 1 ? 'Photo' : 'Photos'}
                </>
              )}
            </Button>

            {!isUploading && (
              <Button
                variant="outline"
                onClick={() => {
                  photos.forEach(photo => URL.revokeObjectURL(photo.preview))
                  setPhotos([])
                }}
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && <Progress value={uploadProgress} className="h-2" />}
        </div>
      )}
    </div>
  )
}
