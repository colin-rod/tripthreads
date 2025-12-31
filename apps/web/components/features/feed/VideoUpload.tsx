'use client'

/**
 * VideoUpload Component
 *
 * Handles video uploads to the trip gallery with:
 * - Drag-and-drop support
 * - Video preview
 * - Free tier blocking (Pro feature only)
 * - Pro tier 10GB storage limit enforcement
 * - 100MB max file size validation
 * - Progress indicators
 * - Storage usage display for Pro users
 *
 * Supported formats: MP4, WebM, MOV, QuickTime
 * No server-side compression (stored as-is)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Video, X, Upload, AlertCircle, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { UpgradePromptDialog } from '@/components/features/subscription/UpgradePromptDialog'

const MAX_VIDEO_SIZE_MB = 100
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024

const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']

interface VideoUploadProps {
  tripId: string
  onUploadComplete?: () => void
}

interface VideoPreview {
  file: File
  preview: string
  caption: string
}

interface UploadPermission {
  allowed: boolean
  isProUser: boolean
  currentStorageGB: number
  limitGB: number
  remainingGB: number
  reason?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function isValidVideoType(file: File): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(file.type)
}

function isWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_VIDEO_SIZE_BYTES
}

export default function VideoUpload({ tripId, onUploadComplete }: VideoUploadProps) {
  const [videos, setVideos] = useState<VideoPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadPermission, setUploadPermission] = useState<UploadPermission | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch upload permission on mount
  useEffect(() => {
    fetchUploadPermission()
  }, [tripId])

  const fetchUploadPermission = async () => {
    try {
      const response = await fetch('/api/upload-video')
      if (response.ok) {
        const data = await response.json()
        setUploadPermission(data)
      }
    } catch (err) {
      console.error('Failed to fetch video upload permission:', err)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    // Check if user is Pro
    if (uploadPermission && !uploadPermission.isProUser) {
      setShowUpgradeDialog(true)
      return
    }

    setError(null)
    const newVideos: VideoPreview[] = []

    Array.from(files).forEach(file => {
      // Validate file type
      if (!isValidVideoType(file)) {
        setError(`Invalid file type: ${file.name}. Supported formats: MP4, WebM, MOV, QuickTime.`)
        return
      }

      // Validate file size (100MB limit)
      if (!isWithinSizeLimit(file)) {
        setError(
          `File size exceeds ${MAX_VIDEO_SIZE_MB}MB limit: ${file.name} (${formatFileSize(file.size)}). Please compress or trim your video.`
        )
        return
      }

      // Create preview
      const preview = URL.createObjectURL(file)
      newVideos.push({ file, preview, caption: '' })
    })

    setVideos(prev => [...prev, ...newVideos])
  }

  const handleRemoveVideo = (index: number) => {
    setVideos(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview) // Clean up object URL
      updated.splice(index, 1)
      return updated
    })
  }

  const handleCaptionChange = (index: number, caption: string) => {
    setVideos(prev => {
      const updated = [...prev]
      updated[index].caption = caption
      return updated
    })
  }

  const handleUpload = async () => {
    if (videos.length === 0) return

    // Check if user is Pro
    if (uploadPermission && !uploadPermission.isProUser) {
      setShowUpgradeDialog(true)
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const totalVideos = videos.length
      let uploadedCount = 0

      for (const video of videos) {
        // Prepare form data
        const formData = new FormData()
        formData.append('video', video.file)
        formData.append('tripId', tripId)
        formData.append('caption', video.caption)
        formData.append('dateTaken', new Date().toISOString()) // Use current date

        // Upload to API
        const response = await fetch('/api/upload-video', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || errorData.error || 'Upload failed')
        }

        uploadedCount++
        setUploadProgress(Math.round((uploadedCount / totalVideos) * 100))
      }

      // Success! Clean up and notify
      videos.forEach(video => URL.revokeObjectURL(video.preview))
      setVideos([])
      setUploadProgress(0)

      // Refresh upload permission (to update storage usage)
      await fetchUploadPermission()

      // Notify parent
      onUploadComplete?.()
    } catch (err) {
      console.error('Video upload error:', err)
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [uploadPermission]
  )

  const isStorageLimitReached: boolean = !!(
    uploadPermission &&
    uploadPermission.isProUser &&
    uploadPermission.remainingGB <= 0
  )
  const showStorageWarning: boolean = !!(
    uploadPermission &&
    uploadPermission.isProUser &&
    uploadPermission.remainingGB < 1
  )

  return (
    <>
      <div className="space-y-4">
        {/* Free Tier Blocking - Show Upgrade Prompt */}
        {uploadPermission && !uploadPermission.isProUser && (
          <Alert className="border-amber-200 bg-amber-50">
            <Crown className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).
              <Button
                variant="link"
                className="h-auto p-0 ml-2 text-amber-700 hover:text-amber-900"
                onClick={() => setShowUpgradeDialog(true)}
              >
                Upgrade Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Pro User Storage Info */}
        {uploadPermission && uploadPermission.isProUser && (
          <div className="text-sm text-muted-foreground">
            Video storage: {uploadPermission.currentStorageGB.toFixed(2)} GB /{' '}
            {uploadPermission.limitGB} GB used ({uploadPermission.remainingGB.toFixed(2)} GB
            remaining)
          </div>
        )}

        {/* Storage Warning */}
        {showStorageWarning && !isStorageLimitReached && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Running low on video storage. {uploadPermission?.remainingGB.toFixed(2)} GB remaining.
              Delete some videos to free up space.
            </AlertDescription>
          </Alert>
        )}

        {/* Storage Limit Reached */}
        {isStorageLimitReached && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Video storage limit reached. You've used all {uploadPermission?.limitGB} GB of your
              Pro tier storage. Delete some videos to upload more.
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
          ${uploadPermission && !uploadPermission.isProUser ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
            multiple
            onChange={e => handleFileSelect(e.target.files)}
            className="hidden"
            aria-label="Select video files"
            disabled={!uploadPermission?.isProUser || isStorageLimitReached}
          />

          <div className="flex flex-col items-center gap-2">
            <Video className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {uploadPermission?.isProUser
                  ? 'Drop videos here or click to upload'
                  : 'Video uploads require Pro'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {uploadPermission?.isProUser
                  ? 'MP4, WebM, MOV, QuickTime - Max 100MB per video'
                  : 'Upgrade to Pro for 10GB video storage'}
              </p>
            </div>
            <Button
              variant={uploadPermission?.isProUser ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (uploadPermission?.isProUser) {
                  fileInputRef.current?.click()
                } else {
                  setShowUpgradeDialog(true)
                }
              }}
              disabled={isStorageLimitReached}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadPermission?.isProUser ? 'Select Videos' : 'Upgrade to Pro'}
            </Button>
          </div>
        </div>

        {/* Video Previews */}
        {videos.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{videos.length} video(s) ready to upload</p>
            {videos.map((video, index) => (
              <Card key={index} className="p-3">
                <div className="flex gap-3">
                  <div className="relative w-32 h-32 bg-black rounded overflow-hidden flex-shrink-0">
                    <video src={video.preview} className="w-full h-full object-cover" controls />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{video.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(video.file.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveVideo(index)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Add caption (optional)"
                      value={video.caption}
                      onChange={e => handleCaptionChange(index, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </Card>
            ))}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Upload Button */}
            {!isUploading && (
              <Button onClick={handleUpload} className="w-full" disabled={isStorageLimitReached}>
                <Upload className="mr-2 h-4 w-4" />
                Upload {videos.length} Video{videos.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upgrade Dialog */}
      <UpgradePromptDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        limitType="videos"
        currentUsage={0}
        limit={0}
      />
    </>
  )
}
