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

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const LINEAR_API_KEY = Deno.env.get('LINEAR_API_KEY')
const LINEAR_TEAM_ID = Deno.env.get('LINEAR_FEEDBACK_TEAM_ID')
const LINEAR_FEEDBACK_LABEL_ID = Deno.env.get('LINEAR_FEEDBACK_LABEL_ID')
const LINEAR_BUG_REPORT_LABEL_ID = Deno.env.get('LINEAR_BUG_REPORT_LABEL_ID')
const LINEAR_FEATURE_REQUEST_LABEL_ID = Deno.env.get('LINEAR_FEATURE_REQUEST_LABEL_ID')
const LINEAR_GENERAL_LABEL_ID = Deno.env.get('LINEAR_GENERAL_LABEL_ID')
const LINEAR_UX_ISSUE_LABEL_ID = Deno.env.get('LINEAR_UX_ISSUE_LABEL_ID')
const MAX_SCREENSHOT_CHAR_LENGTH = 7_000_000 // ~5MB base64 data URI

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

serve(async req => {
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

  if (payload.screenshotDataUrl) {
    descriptionParts.push('', '**Screenshot**', `![User screenshot](${payload.screenshotDataUrl})`)
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
      Authorization: `Bearer ${LINEAR_API_KEY}`,
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
