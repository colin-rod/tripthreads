'use client'

/**
 * MissingFxWarning Component
 *
 * Displays a warning banner when expenses are excluded from settlement calculation
 * due to missing FX rates. Provides link to edit expenses and add rates manually.
 */

import { AlertCircle, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface MissingFxWarningProps {
  excludedExpenseIds: string[]
  onDismiss?: () => void
}

export function MissingFxWarning({ excludedExpenseIds, onDismiss }: MissingFxWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (excludedExpenseIds.length === 0 || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const count = excludedExpenseIds.length
  const expenseText = count === 1 ? 'expense is' : 'expenses are'

  return (
    <Alert className="relative border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/50 dark:bg-orange-900/10 dark:text-orange-100">
      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle>Missing Currency Exchange Rates</AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        {count} {expenseText} excluded from settlement calculations because exchange rates are
        missing. Please edit the affected expenses to add exchange rates manually.
      </AlertDescription>

      {/* Dismiss button */}
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={handleDismiss}
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  )
}
