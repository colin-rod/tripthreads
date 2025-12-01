/**
 * Supabase Edge Function: Forward feedback to Linear
 *
 * Accepts feedback submissions from web and mobile clients and creates
 * a Linear issue tagged with the provided label.
 *
 * Environment variables (set in Supabase):
 * - LINEAR_API_KEY: Personal API key for Linear
 * - LINEAR_FEEDBACK_TEAM_ID: Linear team ID to create issues under
 * - LINEAR_FEEDBACK_LABEL_ID: Linear label ID to attach to feedback issues
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface FeedbackPayload {
  email: string
  message: string
  environment?: 'production' | 'staging' | 'development'
  category: 'bug-report' | 'feature-request' | 'general' | 'ux-issue'
  tripId?: string
  screenshotDataUrl?: string
  platform?: 'web' | 'mobile'
  appVersion?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  ...CORS_HEADERS,
}

const LINEAR_API_KEY = Deno.env.get('LINEAR_API_KEY')
const LINEAR_TEAM_ID = Deno.env.get('LINEAR_FEEDBACK_TEAM_ID')
const LINEAR_FEEDBACK_LABEL_ID = Deno.env.get('LINEAR_FEEDBACK_LABEL_ID')
const LINEAR_BUG_REPORT_LABEL_ID = Deno.env.get('LINEAR_BUG_REPORT_LABEL_ID')
const LINEAR_FEATURE_REQUEST_LABEL_ID = Deno.env.get('LINEAR_FEATURE_REQUEST_LABEL_ID')
const LINEAR_GENERAL_LABEL_ID = Deno.env.get('LINEAR_GENERAL_LABEL_ID')
const LINEAR_UX_ISSUE_LABEL_ID = Deno.env.get('LINEAR_UX_ISSUE_LABEL_ID')
const MAX_SCREENSHOT_CHAR_LENGTH = 7_000_000 // ~5MB base64 data URI

// Supabase client for storage uploads (env vars auto-available in Edge Functions)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Map category to label ID
const getCategoryLabelId = (category: FeedbackPayload['category']): string | undefined => {
  switch (category) {
    case 'bug-report':
      return LINEAR_BUG_REPORT_LABEL_ID
    case 'feature-request':
      return LINEAR_FEATURE_REQUEST_LABEL_ID
    case 'general':
      return LINEAR_GENERAL_LABEL_ID
    case 'ux-issue':
      return LINEAR_UX_ISSUE_LABEL_ID
    default:
      return undefined
  }
}

/**
 * Upload base64 screenshot to Supabase Storage
 * @param screenshotDataUrl - base64 data URL (e.g., "data:image/png;base64,iVBOR...")
 * @returns Public URL of uploaded screenshot, or null if upload fails
 */
async function uploadScreenshotToStorage(screenshotDataUrl: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials for storage upload')
    return null
  }

  try {
    // Lazy import Supabase client (only load if screenshot exists)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse base64 data URL format: "data:image/png;base64,iVBORw0KGgo..."
    const matches = screenshotDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      console.error('Invalid data URL format')
      return null
    }

    const mimeType = matches[1] // e.g., "image/png"
    const base64Data = matches[2]

    // Convert base64 to Uint8Array (Deno-compatible)
    // Note: Deno has built-in atob() for base64 decoding
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Generate unique filename: timestamp-random.ext
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = mimeType.split('/')[1] || 'jpg'
    const filename = `${timestamp}-${randomStr}.${extension}`

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('feedback-screenshots')
      .upload(filename, bytes, {
        contentType: mimeType,
        upsert: false, // Never overwrite (each screenshot is unique)
      })

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('feedback-screenshots').getPublicUrl(data.path)

    console.log(`Screenshot uploaded: ${publicUrl}`)
    return publicUrl
  } catch (error) {
    console.error('Unexpected error during screenshot upload:', error)
    return null
  }
}

serve(async req => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: JSON_HEADERS,
    })
  }

  if (!LINEAR_API_KEY || !LINEAR_TEAM_ID || !LINEAR_FEEDBACK_LABEL_ID) {
    return new Response(
      JSON.stringify({
        error:
          'Missing Linear configuration. Set LINEAR_API_KEY, LINEAR_FEEDBACK_TEAM_ID, and LINEAR_FEEDBACK_LABEL_ID.',
      }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  if (
    !LINEAR_BUG_REPORT_LABEL_ID ||
    !LINEAR_FEATURE_REQUEST_LABEL_ID ||
    !LINEAR_GENERAL_LABEL_ID ||
    !LINEAR_UX_ISSUE_LABEL_ID
  ) {
    return new Response(
      JSON.stringify({
        error:
          'Missing category label configuration. Set LINEAR_BUG_REPORT_LABEL_ID, LINEAR_FEATURE_REQUEST_LABEL_ID, LINEAR_GENERAL_LABEL_ID, and LINEAR_UX_ISSUE_LABEL_ID.',
      }),
      { status: 500, headers: JSON_HEADERS }
    )
  }

  let payload: FeedbackPayload
  try {
    payload = (await req.json()) as FeedbackPayload
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  // Auto-detect environment if not provided
  const environment = payload.environment || 'production'

  const validationErrors: string[] = []
  if (!payload.email || !payload.email.includes('@')) {
    validationErrors.push('A valid email is required')
  }
  if (!payload.message || payload.message.trim().length < 5) {
    validationErrors.push('Feedback message is too short')
  }
  if (!['production', 'staging', 'development'].includes(environment)) {
    validationErrors.push('Invalid environment')
  }
  if (
    !payload.category ||
    !['bug-report', 'feature-request', 'general', 'ux-issue'].includes(payload.category)
  ) {
    validationErrors.push('Category is required')
  }
  if (payload.screenshotDataUrl && payload.screenshotDataUrl.length > MAX_SCREENSHOT_CHAR_LENGTH) {
    validationErrors.push('Screenshot is too large (max ~5MB)')
  }

  if (validationErrors.length > 0) {
    return new Response(JSON.stringify({ error: validationErrors.join('; ') }), {
      status: 400,
      headers: JSON_HEADERS,
    })
  }

  const descriptionParts = [
    `**Email:** ${payload.email}`,
    `**Category:** ${payload.category}`,
    `**Environment:** ${environment}`,
    payload.platform ? `**Platform:** ${payload.platform}` : null,
    payload.appVersion ? `**App Version:** ${payload.appVersion}` : null,
    payload.tripId ? `**Trip ID:** ${payload.tripId}` : null,
    `**Submitted At:** ${new Date().toISOString()}`,
    '',
    '---',
    payload.message.trim(),
  ].filter(Boolean) as string[]

  // Handle screenshot - upload to Supabase Storage and embed URL
  if (payload.screenshotDataUrl) {
    const screenshotSize = (payload.screenshotDataUrl.length * 0.75) / 1024 // Approximate KB
    console.log(`Uploading screenshot (${screenshotSize.toFixed(0)}KB)...`)

    const screenshotUrl = await uploadScreenshotToStorage(payload.screenshotDataUrl)

    if (screenshotUrl) {
      // Success - embed in Linear issue
      descriptionParts.push('', '**Screenshot**', `![Feedback Screenshot](${screenshotUrl})`)
      console.log('Screenshot uploaded and embedded')
    } else {
      // Failed - degrade gracefully
      descriptionParts.push(
        '',
        '**Screenshot**',
        `Screenshot upload failed (${screenshotSize.toFixed(0)}KB). Follow up with user.`
      )
      console.warn('Screenshot upload failed - issue created without screenshot')
    }
  }

  const categoryLabelId = getCategoryLabelId(payload.category)
  const labelIds = [LINEAR_FEEDBACK_LABEL_ID]
  if (categoryLabelId) {
    labelIds.push(categoryLabelId)
  }

  const title = `User feedback (${payload.platform || 'app'})`

  const mutation = `
    mutation CreateFeedbackIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          url
        }
        userError {
          message
        }
      }
    }
  `

  const linearResponse = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          title,
          description: descriptionParts.join('\n'),
          teamId: LINEAR_TEAM_ID,
          labelIds,
        },
      },
    }),
  })

  if (!linearResponse.ok) {
    const errorText = await linearResponse.text()
    console.error('Linear API error:', errorText)
    return new Response(JSON.stringify({ error: 'Failed to create Linear issue' }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }

  const linearData = await linearResponse.json()
  if (linearData?.errors?.length) {
    console.error('Linear GraphQL errors:', linearData.errors)
    return new Response(JSON.stringify({ error: 'Linear API returned an error' }), {
      status: 502,
      headers: JSON_HEADERS,
    })
  }
  const issueCreateResult = linearData?.data?.issueCreate

  if (!issueCreateResult?.success || issueCreateResult?.userError) {
    console.error('Linear issue creation failed:', issueCreateResult?.userError)
    return new Response(
      JSON.stringify({ error: issueCreateResult?.userError?.message || 'Linear request failed' }),
      {
        status: 500,
        headers: JSON_HEADERS,
      }
    )
  }

  return new Response(
    JSON.stringify({
      issueUrl: issueCreateResult.issue?.url || null,
      message: 'Thank you for your feedback!',
    }),
    { status: 200, headers: JSON_HEADERS }
  )
})
