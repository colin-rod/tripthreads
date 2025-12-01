export type FeedbackEnvironment = 'production' | 'staging' | 'development'

export type FeedbackCategory = 'bug-report' | 'feature-request' | 'general' | 'ux-issue'

export interface SubmitFeedbackPayload {
  email: string
  message: string
  environment: FeedbackEnvironment
  category: FeedbackCategory
  tripId?: string
  screenshotDataUrl?: string
  platform: 'web' | 'mobile'
  appVersion?: string
}

export interface SubmitFeedbackResponse {
  issueUrl?: string | null
}
