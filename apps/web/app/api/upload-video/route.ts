/**
 * Video Upload API Route
 *
 * Handles video uploads to the trip-media storage bucket.
 * Features:
 * - Free tier blocking (Pro feature only)
 * - Pro tier 10GB storage limit enforcement
 * - 100MB max file size validation
 * - Supported formats: MP4, WebM, MOV, QuickTime
 * - No server-side compression (stored as-is)
 * - Storage upload with proper permissions
 * - Database record creation in media_files table
 *
 * Phase: 3 (Media & Monetization)
 * Issue: CRO-739b (Video Upload Gating)
 */

import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMediaFile } from '@tripthreads/core'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { checkVideoLimit } from '@/lib/subscription/limits'

// Supported video MIME types
const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // MOV
  'video/x-m4v',
]

// Max file size: 100MB
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const tripId = formData.get('tripId') as string
    const caption = formData.get('caption') as string | null
    const dateTaken = formData.get('dateTaken') as string // ISO 8601 string

    // Validate required fields
    if (!videoFile || !tripId || !dateTaken) {
      return NextResponse.json(
        {
          error: 'Missing required fields: video, tripId, dateTaken',
        },
        { status: 400 }
      )
    }

    // Validate video file type
    if (!SUPPORTED_VIDEO_TYPES.includes(videoFile.type)) {
      return NextResponse.json(
        {
          error: 'Invalid video format',
          message: `Supported formats: MP4, WebM, MOV, QuickTime. Got: ${videoFile.type}`,
        },
        { status: 400 }
      )
    }

    // Validate file size (100MB limit)
    if (videoFile.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (videoFile.size / (1024 * 1024)).toFixed(2)
      return NextResponse.json(
        {
          error: 'File size too large',
          message: `Video file size exceeds 100MB limit. Your file is ${fileSizeMB}MB. Please compress or trim your video.`,
        },
        { status: 413 }
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

    // Rate limiting check (10 uploads per hour per user)
    const rateLimitResult = await checkRateLimit(user.id, 'photo_upload', user.id)
    if (!rateLimitResult.allowed) {
      console.log('[Video Upload] Rate limit exceeded for user:', user.id)
      return createRateLimitResponse(rateLimitResult)
    }

    // Verify user is a participant of the trip
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('id, role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      Sentry.captureMessage('User attempted to upload video to trip they are not part of', {
        level: 'warning',
        tags: {
          feature: 'videos',
          operation: 'upload_video',
        },
        user: { id: user.id },
        extra: { tripId },
      })

      return NextResponse.json(
        { error: 'You must be a trip participant to upload videos' },
        { status: 403 }
      )
    }

    // Check video upload limit (Free: 0 videos, Pro: 10GB storage)
    const limitCheck = await checkVideoLimit(user.id, videoFile.size)

    if (!limitCheck.allowed) {
      const response: Record<string, unknown> = {
        error: 'Video upload limit reached',
        message: limitCheck.reason,
        limitInfo: {
          isProUser: limitCheck.isProUser,
          currentStorageGB: limitCheck.currentStorageGB,
          limitGB: limitCheck.limitGB,
          remainingGB: limitCheck.remainingGB,
        },
      }

      return NextResponse.json(response, { status: 403 })
    }

    // Generate unique file name with timestamp
    const timestamp = Date.now()
    const fileExt = videoFile.name.split('.').pop() || 'mp4'
    const baseName = videoFile.name.replace(/\.[^/.]+$/, '') || 'video'
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')

    const videoPath = `${tripId}/${user.id}/videos/${timestamp}-${sanitizedBaseName}.${fileExt}`

    // Convert File to ArrayBuffer for upload
    const videoBuffer = new Uint8Array(await videoFile.arrayBuffer())

    // Upload video to storage
    const { data: videoData, error: videoError } = await supabase.storage
      .from('trip-media')
      .upload(videoPath, videoBuffer, {
        contentType: videoFile.type,
        cacheControl: '31536000', // 1 year (videos don't change)
        upsert: false,
      })

    if (videoError) {
      console.error('Error uploading video:', videoError)

      Sentry.captureException(videoError, {
        tags: {
          feature: 'videos',
          operation: 'upload_video',
          uploadType: 'video',
        },
        contexts: {
          file: {
            tripId,
            name: videoFile.name,
            size: videoFile.size,
            type: videoFile.type,
          },
          storage: {
            bucket: 'trip-media',
            path: videoPath,
          },
        },
      })

      return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl: videoUrl },
    } = supabase.storage.from('trip-media').getPublicUrl(videoData.path)

    // Create media_files database record
    try {
      const mediaFile = await createMediaFile(supabase, {
        trip_id: tripId,
        user_id: user.id,
        type: 'video',
        url: videoUrl,
        thumbnail_url: null, // No thumbnail for videos (for now)
        caption: caption || null,
        date_taken: dateTaken,
        file_size_bytes: videoFile.size, // Track video file size for storage limits
      })

      return NextResponse.json({
        success: true,
        media: mediaFile,
        storageInfo: {
          currentStorageGB: limitCheck.currentStorageGB,
          limitGB: limitCheck.limitGB,
          remainingGB: limitCheck.remainingGB,
        },
      })
    } catch (dbError) {
      console.error('Error creating media file record:', dbError)

      // Rollback: Delete uploaded video
      await supabase.storage.from('trip-media').remove([videoData.path])

      Sentry.captureException(dbError, {
        tags: {
          feature: 'videos',
          operation: 'upload_video',
          errorType: 'database',
        },
        contexts: {
          database: {
            tripId,
            userId: user.id,
            videoUrl,
          },
        },
      })

      return NextResponse.json({ error: 'Failed to save video metadata' }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error uploading video:', error)

    Sentry.captureException(error, {
      tags: {
        feature: 'videos',
        operation: 'upload_video',
        errorType: 'unexpected',
      },
    })

    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

/**
 * GET endpoint to check video upload permissions and limits
 *
 * Returns:
 * - allowed: boolean - Whether user can upload videos
 * - isProUser: boolean - Whether user is on Pro plan
 * - currentStorageGB: number - Current video storage used (GB)
 * - limitGB: number - Max video storage for Pro plan (10GB)
 * - remainingGB: number - Remaining video storage (GB)
 * - reason: string - Explanation if not allowed
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check video upload permission (0 bytes as placeholder, we just want to know if Pro)
    const limitCheck = await checkVideoLimit(user.id, 0)

    return NextResponse.json({
      allowed: limitCheck.isProUser, // Only Pro users can upload videos
      isProUser: limitCheck.isProUser,
      currentStorageGB: limitCheck.currentStorageGB ?? 0,
      limitGB: limitCheck.limitGB ?? 0,
      remainingGB: limitCheck.remainingGB ?? 0,
      reason: limitCheck.isProUser ? undefined : limitCheck.reason,
    })
  } catch (error) {
    console.error('Error checking video upload permissions:', error)

    Sentry.captureException(error, {
      tags: {
        feature: 'videos',
        operation: 'check_upload_permissions',
      },
    })

    return NextResponse.json({ error: 'Failed to check permissions' }, { status: 500 })
  }
}
