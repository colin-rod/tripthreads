'use client'

/**
 * TourSpotlight Component
 *
 * Creates a visual spotlight effect that highlights a specific element
 * while dimming the rest of the page. Uses a clever SVG mask technique
 * to create a cutout effect.
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface TourSpotlightProps {
  target: string // CSS selector
  padding?: number // Padding around the highlighted element
  borderRadius?: number // Border radius of the spotlight
  className?: string
}

export function TourSpotlight({
  target,
  padding = 8,
  borderRadius = 8,
  className,
}: TourSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const updateRect = () => {
      const element = document.querySelector(target)
      if (element) {
        const elementRect = element.getBoundingClientRect()
        setRect(elementRect)
      }
    }

    // Initial measurement
    updateRect()

    // Update on resize and scroll
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    // Re-measure when DOM changes (for dynamic content)
    const observer = new MutationObserver(updateRect)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
      observer.disconnect()
    }
  }, [target])

  if (!rect) return null

  // Calculate spotlight dimensions with padding
  const spotlightX = rect.left - padding
  const spotlightY = rect.top - padding
  const spotlightWidth = rect.width + padding * 2
  const spotlightHeight = rect.height + padding * 2

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9998] pointer-events-none transition-opacity duration-300',
        className
      )}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White rectangle covering entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />

            {/* Black cutout for the highlighted element */}
            <rect
              x={spotlightX}
              y={spotlightY}
              width={spotlightWidth}
              height={spotlightHeight}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>

        {/* Dark overlay with cutout */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#tour-spotlight-mask)"
        />

        {/* Highlight ring around the element */}
        <rect
          x={spotlightX}
          y={spotlightY}
          width={spotlightWidth}
          height={spotlightHeight}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="animate-pulse"
        />
      </svg>
    </div>
  )
}
