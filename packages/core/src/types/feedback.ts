export type FeedbackEnvironment = 'production' | 'staging' | 'development'

export interface SubmitFeedbackPayload {
  email: string
  message: string
  environment: FeedbackEnvironment
  tripId?: string
  screenshotDataUrl?: string
  platform: 'web' | 'mobile'
  appVersion?: string
}

export interface SubmitFeedbackResponse {
  issueUrl?: string | null
}
