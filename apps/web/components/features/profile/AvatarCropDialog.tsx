/**
 * Avatar Crop Dialog
 *
 * Modal dialog for cropping uploaded avatar images using react-easy-crop.
 * Features:
 * - Image cropping with zoom
 * - Circular crop area
 * - Preview before save
 */

'use client'

import * as React from 'react'
import Cropper, { Area } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ZoomIn, ZoomOut } from 'lucide-react'

interface AvatarCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  onCropComplete: (croppedImageBlob: Blob) => void | Promise<void>
}

/**
 * Create a cropped image from canvas
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Set canvas size to match crop area
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to create blob from canvas'))
        return
      }
      resolve(blob)
    }, 'image/jpeg')
  })
}

/**
 * Create an image element from source
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.src = url
  })
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const onCropCompleteCallback = React.useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleSave = React.useCallback(async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      await onCropComplete(croppedImageBlob)
      onOpenChange(false)
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cropper */}
          <div className="relative h-[400px] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteCallback}
              onZoomChange={setZoom}
            />
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-4">
            <ZoomOut className="h-4 w-4 text-gray-500" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={values => setZoom(values[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-gray-500" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
