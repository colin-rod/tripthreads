'use client'

/**
 * ItineraryItemTooltip Component
 *
 * Wraps itinerary cards with a tooltip that displays type-specific metadata
 * on hover (desktop only). Shows 4-6 lines of key information like flight
 * numbers, confirmation codes, terminal/gate info, addresses, etc.
 *
 * Features:
 * - Auto-detects mobile (< 768px) and disables tooltip
 * - Uses shadcn Tooltip components
 * - Positioned above the trigger (side="top")
 * - Max width constrained for readability
 * - Returns children only if no metadata or disabled
 */

import { useState, useEffect } from 'react'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import { getKeyMetadata } from '@tripthreads/core'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ItineraryItemTooltipProps {
  item: ItineraryItemWithParticipants
  children: React.ReactNode
  enabled?: boolean
}

export function ItineraryItemTooltip({
  item,
  children,
  enabled = true,
}: ItineraryItemTooltipProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Disable tooltips on mobile or if explicitly disabled
  if (!enabled || isMobile) {
    return <>{children}</>
  }

  const metadata = getKeyMetadata(item)

  // Don't show tooltip if no metadata
  if (metadata.length === 0) {
    return <>{children}</>
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            {metadata.map((line, idx) => (
              <p key={idx} className="text-xs">
                {line}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
