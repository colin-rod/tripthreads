'use client'

/**
 * ProtectedAction Component
 *
 * Wrapper component that shows a tooltip for viewers when they hover over
 * disabled edit actions. Displays the permission denied modal when clicked.
 *
 * Usage:
 * <ProtectedAction
 *   canEdit={userRole !== 'viewer'}
 *   action="add itinerary items"
 *   tripId={tripId}
 * >
 *   <Button>Add Item</Button>
 * </ProtectedAction>
 */

import { useState, cloneElement, ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PermissionDeniedModal } from './PermissionDeniedModal'
import { getViewerTooltip } from '@tripthreads/core'

interface ProtectedActionProps {
  children: ReactElement
  canEdit: boolean
  action: string
  tripId: string
  tooltipText?: string
}

export function ProtectedAction({
  children,
  canEdit,
  action,
  tripId,
  tooltipText,
}: ProtectedActionProps) {
  const [modalOpen, setModalOpen] = useState(false)

  // If user can edit, render children normally
  if (canEdit) {
    return children
  }

  // For viewers, wrap in tooltip and handle click to show modal
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setModalOpen(true)
  }

  // Clone the child element and disable it
  const childProps = children.props as { className?: string }
  const disabledChild = cloneElement(children, {
    disabled: true,
    onClick: handleClick,
    className: `${childProps.className || ''} cursor-not-allowed`,
  } as React.HTMLAttributes<HTMLElement>)

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{disabledChild}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText || getViewerTooltip(action)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PermissionDeniedModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tripId={tripId}
        actionAttempted={action}
      />
    </>
  )
}
