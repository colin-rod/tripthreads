'use client'

import { ChatItemLink } from './ChatItemLink'
import type { MentionableUser } from './MentionAutocomplete'

interface BotMessageContentProps {
  content: string
  metadata?: {
    items?: Array<{
      id: string
      type: 'expense' | 'itinerary'
      itineraryType?: string
      title: string
    }>
  }
  tripId: string
  tripParticipants?: MentionableUser[]
}

/**
 * Helper to escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function BotMessageContent({
  content,
  metadata,
  tripId,
  tripParticipants,
}: BotMessageContentProps) {
  // Backward compatibility: if no items in metadata, render plain text
  if (!metadata?.items || metadata.items.length === 0) {
    return <>{content}</>
  }

  // Parse message to find item references and replace with links
  const parts: Array<React.ReactNode> = []
  let lastIndex = 0

  // Pattern to match: "Added {type}: {title}"
  // We'll iterate through items and find their positions in the text
  metadata.items.forEach((item, idx) => {
    // Construct the pattern to search for based on item type
    let searchText: string
    if (item.type === 'itinerary') {
      // Extract just the type name (e.g., "flight" from "transport")
      // The bot message uses natural language types like "flight", "stay", "activity"
      // Try to match the actual text in the message
      const typeMatch = content.match(new RegExp(`Added (\\w+): ${escapeRegex(item.title)}`))
      searchText = typeMatch ? typeMatch[0] : `Added ${item.itineraryType}: ${item.title}`
    } else {
      searchText = `Added expense: ${item.title}`
    }

    const index = content.indexOf(searchText, lastIndex)

    if (index !== -1) {
      // Add text before the match
      if (index > lastIndex) {
        parts.push(content.substring(lastIndex, index))
      }

      // Add the clickable link
      parts.push(
        <ChatItemLink
          key={`item-${item.id}-${idx}`}
          itemId={item.id}
          itemType={item.type}
          itineraryType={item.itineraryType}
          text={searchText}
          tripId={tripId}
          tripParticipants={tripParticipants}
        />
      )

      lastIndex = index + searchText.length
    }
  })

  // Add remaining text after last match
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex))
  }

  return <>{parts}</>
}
