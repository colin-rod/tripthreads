/**
 * Photo Upload API Route
 *
 * Handles photo uploads to the trip-media storage bucket.
 * Features:
 * - Client-side compression (full + thumbnail)
 * - EXIF date extraction (GPS stripped for privacy)
 * - Free tier limit enforcement (25 photos)
 * - Storage upload with proper permissions
 * - Database record creation in media_files table
 */

import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMediaFile, canUploadPhoto } from '@repo/core/queries/media'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const fullImageFile = formData.get('fullImage') as File
    const thumbnailFile = formData.get('thumbnail') as File
    const tripId = formData.get('tripId') as string
    const caption = formData.get('caption') as string | null
    const dateTaken = formData.get('dateTaken') as string // ISO 8601 string

    // Validate required fields
    if (!fullImageFile || !thumbnailFile || !tripId || !dateTaken) {
      return NextResponse.json(
        {
          error: 'Missing required fields: fullImage, thumbnail, tripId, dateTaken',
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify user is a participant of the trip
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('id, role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      Sentry.captureMessage('User attempted to upload photo to trip they are not part of', {
        level: 'warning',
        tags: {
          feature: 'photos',
          operation: 'upload_photo',
        },
        user: { id: user.id },
        extra: { tripId },
      })

      return NextResponse.json(
        { error: 'You must be a trip participant to upload photos' },
        { status: 403 }
      )
    }

    // Check free tier photo limit
    const uploadPermission = await canUploadPhoto(supabase, tripId, user.id)

    if (!uploadPermission.canUpload) {
      return NextResponse.json(
        {
          error: 'Photo limit reached',
          message: `You've reached the free tier limit of ${uploadPermission.limit} photos. Upgrade to Pro for unlimited photos.`,
          limit: uploadPermission.limit,
          total: uploadPermission.total,
        },
        { status: 403 }
      )
    }

    // Generate unique file names with timestamp
    const timestamp = Date.now()
    const fileExt = fullImageFile.name.split('.').pop() || 'jpg'
    const baseName = fullImageFile.name.replace(/\.[^/.]+$/, '') || 'photo'
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')

    const fullImagePath = `${tripId}/${user.id}/${timestamp}-${sanitizedBaseName}.${fileExt}`
    const thumbnailPath = `${tripId}/${user.id}/thumbnails/${timestamp}-${sanitizedBaseName}.${fileExt}`

    // Convert Files to ArrayBuffer for upload
    const fullImageBuffer = new Uint8Array(await fullImageFile.arrayBuffer())
    const thumbnailBuffer = new Uint8Array(await thumbnailFile.arrayBuffer())

    // Upload full image
    const { data: fullImageData, error: fullImageError } = await supabase.storage
      .from('trip-media')
      .upload(fullImagePath, fullImageBuffer, {
        contentType: 'image/jpeg', // Always JPEG after compression
        cacheControl: '31536000', // 1 year (images don't change)
        upsert: false,
      })

    if (fullImageError) {
      console.error('Error uploading full image:', fullImageError)

      Sentry.captureException(fullImageError, {
        tags: {
          feature: 'photos',
          operation: 'upload_photo',
          uploadType: 'full_image',
        },
        contexts: {
          file: {
            tripId,
            name: fullImageFile.name,
            size: fullImageFile.size,
            type: fullImageFile.type,
          },
          storage: {
            bucket: 'trip-media',
            path: fullImagePath,
          },
        },
      })

      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    // Upload thumbnail
    const { data: thumbnailData, error: thumbnailError } = await supabase.storage
      .from('trip-media')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      })

    if (thumbnailError) {
      console.error('Error uploading thumbnail:', thumbnailError)

      // Rollback: Delete full image
      await supabase.storage.from('trip-media').remove([fullImageData.path])

      Sentry.captureException(thumbnailError, {
        tags: {
          feature: 'photos',
          operation: 'upload_photo',
          uploadType: 'thumbnail',
        },
        contexts: {
          file: {
            tripId,
            name: thumbnailFile.name,
            size: thumbnailFile.size,
          },
          storage: {
            bucket: 'trip-media',
            path: thumbnailPath,
          },
        },
      })

      return NextResponse.json({ error: 'Failed to upload thumbnail' }, { status: 500 })
    }

    // Get public URLs
    const {
      data: { publicUrl: fullImageUrl },
    } = supabase.storage.from('trip-media').getPublicUrl(fullImageData.path)

    const {
      data: { publicUrl: thumbnailUrl },
    } = supabase.storage.from('trip-media').getPublicUrl(thumbnailData.path)

    // Create media_files database record
    try {
      const mediaFile = await createMediaFile(supabase, {
        trip_id: tripId,
        user_id: user.id,
        type: 'photo',
        url: fullImageUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption || null,
        date_taken: dateTaken, // Use extracted EXIF date or fallback
      })

      return NextResponse.json({
        success: true,
        media: mediaFile,
        remaining: uploadPermission.remaining - 1, // Updated count
      })
    } catch (dbError) {
      console.error('Error creating media file record:', dbError)

      // Rollback: Delete both uploaded files
      await supabase.storage.from('trip-media').remove([fullImageData.path, thumbnailData.path])

      Sentry.captureException(dbError, {
        tags: {
          feature: 'photos',
          operation: 'upload_photo',
          errorType: 'database',
        },
        contexts: {
          database: {
            tripId,
            userId: user.id,
            fullImageUrl,
            thumbnailUrl,
          },
        },
      })

      return NextResponse.json({ error: 'Failed to save photo metadata' }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error uploading photo:', error)

    Sentry.captureException(error, {
      tags: {
        feature: 'photos',
        operation: 'upload_photo',
        errorType: 'unexpected',
      },
    })

    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

/**
 * GET endpoint to check upload permissions and limits
 *
 * Returns:
 * - canUpload: boolean
 * - remaining: number of photos remaining
 * - total: current photo count
 * - limit: max photos for current plan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')

    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId parameter' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check upload permission
    const permission = await canUploadPhoto(supabase, tripId, user.id)

    return NextResponse.json(permission)
  } catch (error) {
    console.error('Error checking upload permission:', error)

    Sentry.captureException(error, {
      tags: {
        feature: 'photos',
        operation: 'check_upload_permission',
      },
    })

    return NextResponse.json({ error: 'Failed to check upload permission' }, { status: 500 })
  }
}
