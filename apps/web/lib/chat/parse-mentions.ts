/**
 * Utilities for detecting and parsing @TripThread mentions in chat messages
 */

export interface ParsedMention {
  fullMatch: string
  command: string
  startIndex: number
  endIndex: number
}

/**
 * Detect @TripThread mentions in a message
 * Returns all @TripThread commands found in the message
 *
 * @example
 * "@TripThread add dinner €60" => [{command: "add dinner €60", ...}]
 * "@TripThread add dinner €60 @TripThread add taxi £20" => [{...}, {...}]
 */
export function detectTripThreadMentions(message: string): ParsedMention[] {
  const mentions: ParsedMention[] = []
  const mentionRegex = /@TripThread\s+([^\n@]*)/gi

  let match
  while ((match = mentionRegex.exec(message)) !== null) {
    mentions.push({
      fullMatch: match[0],
      command: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return mentions
}

/**
 * Check if a message contains any @TripThread mentions
 */
export function hasTripThreadMention(message: string): boolean {
  return /@TripThread\s+/i.test(message)
}

/**
 * Extract all commands from @TripThread mentions
 * Returns array of command strings (without @TripThread prefix)
 *
 * @example
 * "@TripThread add dinner €60" => ["add dinner €60"]
 * "@TripThread add dinner €60 @TripThread add taxi £20" => ["add dinner €60", "add taxi £20"]
 */
export function extractCommands(message: string): string[] {
  const mentions = detectTripThreadMentions(message)
  return mentions.map(m => m.command)
}

/**
 * Remove @TripThread mentions from a message
 * Useful for displaying cleaned message text
 */
export function removeTripThreadMentions(message: string): string {
  return message.replace(/@TripThread\s+/gi, '').trim()
}

/**
 * Parse a chat message and call the AI parser API for each @TripThread command
 */
export async function parseChatMessage(
  message: string,
  tripId: string,
  options?: {
    defaultCurrency?: string
    referenceDate?: string
  }
) {
  const commands = extractCommands(message)

  if (commands.length === 0) {
    return {
      success: false,
      error: 'No @TripThread commands found',
      results: [],
    }
  }

  // Parse each command
  const results = await Promise.all(
    commands.map(async command => {
      try {
        const response = await fetch('/api/parse-chat-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: command,
            tripId,
            defaultCurrency: options?.defaultCurrency || 'USD',
            referenceDate: options?.referenceDate || new Date().toISOString(),
          }),
        })

        const data = await response.json()
        return {
          command,
          ...data,
        }
      } catch (error) {
        console.error('Error parsing command:', command, error)
        return {
          command,
          success: false,
          hasExpense: false,
          hasItinerary: false,
          error: 'Failed to parse command',
        }
      }
    })
  )

  return {
    success: results.some(r => r.success),
    results,
  }
}
