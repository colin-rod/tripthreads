/**
 * Utilities for detecting and parsing user @mentions in chat messages
 * Separate from @TripThread mentions which are handled by parse-mentions.ts
 */

export interface UserMention {
  fullMatch: string
  username: string
  startIndex: number
  endIndex: number
}

/**
 * Detect user @mentions in a message (excluding @TripThread)
 * Returns all @username mentions found in the message
 *
 * Pattern matches:
 * - @username (alphanumeric + underscores + dots, 1-30 chars)
 * - Excludes @TripThread (case insensitive)
 * - Excludes email addresses (no @ followed by domain)
 *
 * @example
 * "@alice check this out" => [{username: "alice", ...}]
 * "@alice and @bob let's meet" => [{username: "alice", ...}, {username: "bob", ...}]
 * "@TripThread add dinner" => [] (filtered out)
 * "email alice@example.com" => [] (not a mention)
 */
export function detectUserMentions(message: string): UserMention[] {
  const mentions: UserMention[] = []

  // Pattern: @ followed by username starting with alphanumeric, then alphanumeric/underscore/dot (1-30 chars total)
  // Must start with letter or number, can contain dots and underscores
  // Negative lookbehind to exclude email addresses (no alphanumeric before @)
  // Negative lookahead to ensure not followed by more word chars or dots (stops at other punctuation/space)
  const mentionRegex = /(?<![a-zA-Z0-9])@([a-zA-Z0-9][a-zA-Z0-9_.]{0,29})(?![a-zA-Z0-9_.])/g

  let match
  while ((match = mentionRegex.exec(message)) !== null) {
    const username = match[1]

    // Skip @TripThread mentions (case insensitive)
    if (username.toLowerCase() === 'tripthread') {
      continue
    }

    mentions.push({
      fullMatch: match[0],
      username,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return mentions
}

/**
 * Check if a message contains any user @mentions (excluding @TripThread)
 */
export function hasUserMentions(message: string): boolean {
  const mentions = detectUserMentions(message)
  return mentions.length > 0
}

/**
 * Extract unique usernames from @mentions
 * Returns array of lowercase usernames (without @ prefix)
 *
 * @example
 * "@alice check this @bob and @alice" => ["alice", "bob"]
 */
export function extractUsernames(message: string): string[] {
  const mentions = detectUserMentions(message)
  const uniqueUsernames = new Set(mentions.map(m => m.username.toLowerCase()))
  return Array.from(uniqueUsernames)
}

/**
 * Map usernames to user IDs from a list of trip participants
 * Case-insensitive matching on username or full_name
 *
 * @example
 * mapUsernamesToIds("@alice and @bob", participants) => ["uuid-1", "uuid-2"]
 */
export function mapUsernamesToIds(
  message: string,
  participants: Array<{ id: string; full_name: string; email: string }>
): string[] {
  const usernames = extractUsernames(message)
  const userIds: string[] = []

  for (const username of usernames) {
    const participant = participants.find(p => {
      // Match against username portion of email (before @)
      const emailUsername = p.email.split('@')[0].toLowerCase()

      // Match against full_name (case insensitive, spaces removed)
      const fullNameNormalized = p.full_name.toLowerCase().replace(/\s+/g, '')

      return (
        emailUsername === username ||
        fullNameNormalized === username ||
        p.full_name.toLowerCase() === username
      )
    })

    if (participant) {
      userIds.push(participant.id)
    }
  }

  return userIds
}

/**
 * Highlight @mentions in message text with HTML spans
 * Used for rendering messages with styled mentions
 *
 * @example
 * highlightMentions("Hey @alice check this", currentUserId, participants)
 * => "Hey <span class='mention'>@alice</span> check this"
 */
export function highlightMentions(
  message: string,
  currentUserId: string,
  participants: Array<{ id: string; full_name: string; email: string }>
): string {
  const mentions = detectUserMentions(message)

  if (mentions.length === 0) {
    return message
  }

  // Replace mentions from end to start to preserve indices
  let highlightedMessage = message
  const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex)

  for (const mention of sortedMentions) {
    const participant = participants.find(p => {
      const emailUsername = p.email.split('@')[0].toLowerCase()
      const fullNameNormalized = p.full_name.toLowerCase().replace(/\s+/g, '')

      return (
        emailUsername === mention.username.toLowerCase() ||
        fullNameNormalized === mention.username.toLowerCase() ||
        p.full_name.toLowerCase() === mention.username.toLowerCase()
      )
    })

    if (participant) {
      const isSelfMention = participant.id === currentUserId
      const className = isSelfMention ? 'mention-self' : 'mention-user'

      const before = highlightedMessage.slice(0, mention.startIndex)
      const after = highlightedMessage.slice(mention.endIndex)
      const replacement = `<span class="${className}" data-user-id="${participant.id}">${mention.fullMatch}</span>`

      highlightedMessage = before + replacement + after
    }
  }

  return highlightedMessage
}
