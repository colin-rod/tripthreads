import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tripId = formData.get('tripId') as string

    if (!file || !tripId) {
      return NextResponse.json({ error: 'Missing required fields: file, tripId' }, { status: 400 })
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
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single()

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'You must be a trip participant to upload files' },
        { status: 403 }
      )
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${tripId}/${user.id}/${Date.now()}.${fileExt}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading attachment:', uploadError)

      // Log to Sentry
      Sentry.captureException(uploadError, {
        tags: {
          feature: 'storage',
          operation: 'upload_attachment',
        },
        contexts: {
          file: {
            tripId,
            name: file.name,
            size: file.size,
            type: file.type,
          },
          storage: {
            bucket: 'chat-attachments',
            path: fileName,
          },
        },
      })

      return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('chat-attachments').getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path,
    })
  } catch (error) {
    console.error('Unexpected error uploading attachment:', error)

    // Log to Sentry
    Sentry.captureException(error, {
      tags: {
        feature: 'storage',
        operation: 'upload_attachment',
        errorType: 'unexpected',
      },
    })

    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
