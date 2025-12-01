import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import type { SubmitFeedbackPayload, SubmitFeedbackResponse } from '../types/feedback'

/**
 * Submit user feedback to Linear via Supabase Edge Function
 */
export async function submitFeedbackToLinear(
  supabase: SupabaseClient<Database>,
  payload: SubmitFeedbackPayload
): Promise<SubmitFeedbackResponse> {
  const { data, error } = await supabase.functions.invoke('submit-feedback', {
    body: payload,
  })

  if (error) {
    throw new Error(error.message || 'Unable to send feedback right now')
  }

  return data as SubmitFeedbackResponse
}
