'use client'

/**
 * TourTooltip Component
 *
 * Displays tour step content in a positioned tooltip next to the highlighted element.
 * Features:
 * - Auto-positioning based on available space
 * - Progress indicator
 * - Navigation buttons
 * - Skip/dismiss functionality
 */

import { useEffect, useState, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@tripthreads/core'
import type { TourStep } from '@/lib/tour/types'

interface TourTooltipProps {
  step: TourStep
  stepIndex: number
  totalSteps: number
  target: string
  onNext?: () => void
  onPrevious?: () => void
  onSkip?: () => void
  onDismiss?: () => void
  canSkip?: boolean
  className?: string
}

type Placement = 'top' | 'bottom' | 'left' | 'right'

export function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  target,
  onNext,
  onPrevious,
  onSkip,
  onDismiss,
  canSkip = true,
  className,
}: TourTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [placement, setPlacement] = useState<Placement>(step.placement || 'bottom')
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(target)
      const tooltip = tooltipRef.current

      if (!element || !tooltip) return

      const targetRect = element.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      const spacing = 16 // Gap between tooltip and target

      // Calculate best placement based on available space
      let bestPlacement = step.placement || 'bottom'
      let top = 0
      let left = 0

      // Try preferred placement first, fall back if not enough space
      const placements: Placement[] = [step.placement || 'bottom', 'bottom', 'top', 'right', 'left']

      for (const p of placements) {
        const coords = calculatePosition(
          p,
          targetRect,
          tooltipRect,
          viewportWidth,
          viewportHeight,
          spacing
        )

        // Check if tooltip fits in viewport
        const fitsHorizontally =
          coords.left >= 0 && coords.left + tooltipRect.width <= viewportWidth
        const fitsVertically = coords.top >= 0 && coords.top + tooltipRect.height <= viewportHeight

        if (fitsHorizontally && fitsVertically) {
          bestPlacement = p
          top = coords.top
          left = coords.left
          break
        }
      }

      setPlacement(bestPlacement)
      setPosition({ top, left })
    }

    updatePosition()

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [target, step.placement])

  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === totalSteps - 1

  return (
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-[9999] bg-background border-2 border-primary rounded-lg shadow-lg p-6 max-w-sm',
        'transition-all duration-300 ease-out',
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="dialog"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-content"
    >
      {/* Close button */}
      {canSkip && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Close tour"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Progress indicator */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i === stepIndex ? 'bg-primary' : i < stepIndex ? 'bg-primary/40' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-2 mb-4">
        <h3 id="tour-step-title" className="font-semibold text-lg text-foreground">
          {step.title}
        </h3>
        <p id="tour-step-content" className="text-sm text-muted-foreground leading-relaxed">
          {step.content}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isFirstStep && onPrevious && (
            <Button variant="outline" size="sm" onClick={onPrevious}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canSkip && onSkip && !isLastStep && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip tour
            </Button>
          )}

          {!isLastStep && onNext && (
            <Button size="sm" onClick={onNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {isLastStep && onNext && (
            <Button size="sm" onClick={onNext}>
              Finish
            </Button>
          )}
        </div>
      </div>

      {/* Arrow pointer */}
      <div
        className={cn('absolute w-3 h-3 bg-background border-primary rotate-45', {
          'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-t-2 border-l-2':
            placement === 'bottom',
          'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-b-2 border-r-2':
            placement === 'top',
          'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-l-2 border-b-2':
            placement === 'right',
          'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-r-2 border-t-2':
            placement === 'left',
        })}
      />
    </div>
  )
}

/**
 * Calculate tooltip position based on placement
 */
function calculatePosition(
  placement: Placement,
  targetRect: DOMRect,
  tooltipRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
  spacing: number
): { top: number; left: number } {
  let top = 0
  let left = 0

  switch (placement) {
    case 'top':
      top = targetRect.top - tooltipRect.height - spacing
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
      break

    case 'bottom':
      top = targetRect.bottom + spacing
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
      break

    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
      left = targetRect.left - tooltipRect.width - spacing
      break

    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
      left = targetRect.right + spacing
      break
  }

  // Keep tooltip within viewport bounds
  top = Math.max(spacing, Math.min(top, viewportHeight - tooltipRect.height - spacing))
  left = Math.max(spacing, Math.min(left, viewportWidth - tooltipRect.width - spacing))

  return { top, left }
}
