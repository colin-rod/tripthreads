import type { LLMParseRequest, LLMParserResult } from '@tripthreads/core'

/**
 * Parse natural language input using OpenAI GPT-4o-mini
 */
export async function parseWithOpenAI(request: LLMParseRequest): Promise<LLMParserResult> {
  const response = await fetch('/api/parse-with-openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json()
    return errorData
  }

  return response.json()
}
